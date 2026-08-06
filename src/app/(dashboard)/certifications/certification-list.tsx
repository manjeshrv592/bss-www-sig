"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Award, Loader2 } from "lucide-react";
import {
  createCertification,
  updateCertification,
  deleteCertification,
  moveCertification,
} from "@/lib/actions/resources";
import { useDragOrder } from "@/lib/use-drag-order";
import { OrderCell } from "@/components/order-cell";

interface Certification {
  id: string;
  name: string;
  image: string | null;
  alt: string | null;
  isActive: boolean;
  createdAt: Date;
}

export function CertificationList({
  certifications,
  offset,
  total,
}: {
  certifications: Certification[];
  offset: number;
  total: number;
}) {
  const [open, setOpen] = useState(false);
  const [editItem, setEditItem] = useState<Certification | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const { items, getRowProps, rowStateClass, getHandleProps, moveTo } = useDragOrder({
    items: certifications,
    offset,
    total,
    move: moveCertification,
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const name = form.get("name") as string;
    const alt = (form.get("alt") as string) || undefined;
    const imageInput = document.getElementById("cert-image") as HTMLInputElement;

    startTransition(async () => {
      let image: string | undefined;
      if (imageInput?.files?.[0]) {
        image = await fileToBase64(imageInput.files[0]);
      }

      if (editItem) {
        await updateCertification(editItem.id, { name, alt, image });
      } else {
        await createCertification({ name, alt, image });
      }
      setOpen(false);
      setEditItem(null);
      router.refresh();
    });
  };

  const handleDelete = (id: string) => {
    if (!confirm("Delete this certification?")) return;
    startTransition(async () => {
      await deleteCertification(id);
      router.refresh();
    });
  };

  const handleToggle = (cert: Certification) => {
    startTransition(async () => {
      await updateCertification(cert.id, { isActive: !cert.isActive });
      router.refresh();
    });
  };

  return (
    <>
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={(v: boolean) => { setOpen(v); if (!v) setEditItem(null); }}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Add Certification
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editItem ? "Edit Certification" : "New Certification"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium">Name</label>
                <input
                  name="name"
                  required
                  defaultValue={editItem?.name ?? ""}
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Image Alt Text</label>
                <input
                  name="alt"
                  defaultValue={editItem?.alt ?? ""}
                  placeholder="Describe the image for accessibility"
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Image</label>
                <input
                  id="cert-image"
                  type="file"
                  accept="image/*"
                  className="mt-1 w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-primary-foreground hover:file:bg-primary/90"
                />
                {editItem?.image && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Current image will be kept if no new one is selected.
                  </p>
                )}
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => { setOpen(false); setEditItem(null); }}
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={isPending}>
                  {isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  {editItem ? "Update" : "Create"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {items.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Award className="h-10 w-10 text-muted-foreground/40 mb-3" />
            <p className="text-sm font-medium">No certifications yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Add your first certification badge.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="w-16 px-4 py-3 font-medium">Order</th>
                  <th className="px-4 py-3 font-medium">Image</th>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Alt Text</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((cert, index) => (
                  <tr
                    key={cert.id}
                    {...getRowProps(index)}
                    className={`border-b border-border/40 last:border-0 hover:bg-accent/50 transition-colors ${
                      !cert.isActive ? "opacity-50" : ""
                    } ${rowStateClass(index)}`}
                  >
                    <OrderCell
                      index={offset + index}
                      total={total}
                      handleProps={getHandleProps(index, cert.name)}
                      onMoveTo={(to) => moveTo(cert.id, to)}
                    />
                    <td className="px-4 py-3">
                      {cert.image ? (
                        <img src={cert.image} alt={cert.alt ?? cert.name} className="h-8 object-contain" />
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-medium">{cert.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{cert.alt ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                          cert.isActive ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
                        }`}
                      >
                        {cert.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => handleToggle(cert)} disabled={isPending}>
                          {cert.isActive ? "Disable" : "Enable"}
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditItem(cert); setOpen(true); }}>
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(cert.id)} disabled={isPending}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </>
  );
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
