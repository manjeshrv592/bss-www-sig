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
import { Plus, Pencil, Trash2, Image as ImageIcon, Loader2 } from "lucide-react";
import {
  createBanner,
  updateBanner,
  deleteBanner,
  reorderBanners,
} from "@/lib/actions/resources";
import { useDragOrder } from "@/lib/use-drag-order";
import { OrderCell } from "@/components/order-cell";

interface Banner {
  id: string;
  name: string;
  image: string | null;
  alt: string | null;
  link: string | null;
  startDate: Date | null;
  endDate: Date | null;
  isActive: boolean;
  createdAt: Date;
}

function formatDate(d: Date | null) {
  if (!d) return "";
  return new Date(d).toISOString().split("T")[0];
}

export function BannerList({ banners }: { banners: Banner[] }) {
  const [open, setOpen] = useState(false);
  const [editItem, setEditItem] = useState<Banner | null>(null);
  const [clearDates, setClearDates] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const { items, getRowProps, rowStateClass, getHandleProps } = useDragOrder(
    banners,
    reorderBanners
  );

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const name = form.get("name") as string;
    const alt = (form.get("alt") as string) || undefined;
    const link = (form.get("link") as string) || undefined;
    const startDate = clearDates ? null : ((form.get("startDate") as string) || undefined);
    const endDate = clearDates ? null : ((form.get("endDate") as string) || undefined);
    const imageInput = document.getElementById("banner-image") as HTMLInputElement;

    startTransition(async () => {
      let image: string | undefined;
      if (imageInput?.files?.[0]) {
        image = await fileToBase64(imageInput.files[0]);
      }

      if (editItem) {
        await updateBanner(editItem.id, { name, alt, link, startDate, endDate, image });
      } else {
        await createBanner({ name, alt, link, startDate, endDate, image });
      }
      setOpen(false);
      setEditItem(null);
      setClearDates(false);
      router.refresh();
    });
  };

  const handleDelete = (id: string) => {
    if (!confirm("Delete this banner?")) return;
    startTransition(async () => {
      await deleteBanner(id);
      router.refresh();
    });
  };

  const handleToggle = (banner: Banner) => {
    startTransition(async () => {
      await updateBanner(banner.id, { isActive: !banner.isActive });
      router.refresh();
    });
  };

  const isExpired = (b: Banner) => b.endDate && new Date(b.endDate) < new Date();

  return (
    <>
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={(v: boolean) => { setOpen(v); if (!v) { setEditItem(null); setClearDates(false); } }}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Add Banner
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editItem ? "Edit Banner" : "New Banner"}</DialogTitle>
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
                <label className="text-sm font-medium">Link URL</label>
                <input
                  name="link"
                  type="url"
                  defaultValue={editItem?.link ?? ""}
                  placeholder="https://..."
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Date Range (optional)</label>
                  {editItem && (editItem.startDate || editItem.endDate) && (
                    <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                      <input
                        type="checkbox"
                        checked={clearDates}
                        onChange={(e) => setClearDates(e.target.checked)}
                        className="rounded border-input"
                      />
                      Show permanently (clear dates)
                    </label>
                  )}
                </div>
                {!clearDates && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-muted-foreground">Start Date</label>
                      <input
                        name="startDate"
                        type="date"
                        defaultValue={formatDate(editItem?.startDate ?? null)}
                        className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">End Date</label>
                      <input
                        name="endDate"
                        type="date"
                        defaultValue={formatDate(editItem?.endDate ?? null)}
                        className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      />
                    </div>
                  </div>
                )}
                {clearDates && (
                  <p className="text-xs text-muted-foreground bg-accent/50 rounded-md px-3 py-2">
                    Date constraints will be removed. Banner will show permanently.
                  </p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium">Image</label>
                <input
                  id="banner-image"
                  type="file"
                  accept="image/*"
                  className="mt-1 w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-primary-foreground hover:file:bg-primary/90"
                />
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
            <ImageIcon className="h-10 w-10 text-muted-foreground/40 mb-3" />
            <p className="text-sm font-medium">No banners yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Add your first promotional banner.
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
                  <th className="px-4 py-3 font-medium">Dates</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((banner, index) => (
                  <tr
                    key={banner.id}
                    {...getRowProps(index)}
                    className={`border-b border-border/40 last:border-0 hover:bg-accent/50 transition-colors ${
                      !banner.isActive ? "opacity-50" : ""
                    } ${rowStateClass(index)}`}
                  >
                    <OrderCell index={index} handleProps={getHandleProps(index, banner.name)} />
                    <td className="px-4 py-3">
                      {banner.image ? (
                        <img src={banner.image} alt={banner.alt ?? banner.name} className="h-8 w-16 rounded object-cover" />
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium">{banner.name}</p>
                      {banner.link && (
                        <p className="text-[10px] text-muted-foreground truncate max-w-[200px]">{banner.link}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{banner.alt ?? "—"}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {banner.startDate || banner.endDate ? (
                        <>
                          {banner.startDate && <>{formatDate(banner.startDate)}</>}
                          {banner.startDate && banner.endDate && " → "}
                          {banner.endDate && <>{formatDate(banner.endDate)}</>}
                        </>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {isExpired(banner) && (
                          <span className="rounded-full bg-yellow-500/10 text-yellow-500 px-2 py-0.5 text-[10px] font-medium">
                            Expired
                          </span>
                        )}
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                            banner.isActive ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
                          }`}
                        >
                          {banner.isActive ? "Active" : "Inactive"}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => handleToggle(banner)} disabled={isPending}>
                          {banner.isActive ? "Disable" : "Enable"}
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditItem(banner); setOpen(true); }}>
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(banner.id)} disabled={isPending}>
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
