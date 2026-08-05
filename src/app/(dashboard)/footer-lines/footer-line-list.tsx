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
import { Plus, Pencil, Trash2, PanelBottom, Loader2 } from "lucide-react";
import {
  createFooterLine,
  updateFooterLine,
  deleteFooterLine,
} from "@/lib/actions/resources";

interface FooterLine {
  id: string;
  name: string;
  leftText: string;
  rightText: string;
  isActive: boolean;
  createdAt: Date;
}

export function FooterLineList({ lines }: { lines: FooterLine[] }) {
  const [open, setOpen] = useState(false);
  const [editItem, setEditItem] = useState<FooterLine | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const name = (form.get("name") as string).trim();
    const leftText = (form.get("leftText") as string).trim();
    const rightText = (form.get("rightText") as string).trim();
    if (!name) return;

    startTransition(async () => {
      if (editItem) {
        await updateFooterLine(editItem.id, { name, leftText, rightText });
      } else {
        await createFooterLine({ name, leftText, rightText });
      }
      setOpen(false);
      setEditItem(null);
      router.refresh();
    });
  };

  const handleDelete = (id: string) => {
    if (!confirm("Delete this footer line? Any rules using it are removed too.")) return;
    startTransition(async () => {
      await deleteFooterLine(id);
      router.refresh();
    });
  };

  const handleToggle = (line: FooterLine) => {
    startTransition(async () => {
      await updateFooterLine(line.id, { isActive: !line.isActive });
      router.refresh();
    });
  };

  return (
    <>
      <div className="flex justify-end">
        <Dialog
          open={open}
          onOpenChange={(v: boolean) => {
            setOpen(v);
            if (!v) setEditItem(null);
          }}
        >
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Add Footer Line
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editItem ? "Edit Footer Line" : "New Footer Line"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium">Title</label>
                <input
                  name="name"
                  required
                  defaultValue={editItem?.name ?? ""}
                  placeholder="e.g. India Footer"
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Only used to identify this line when assigning it.
                </p>
              </div>
              <div>
                <label className="text-sm font-medium">Left</label>
                <input
                  name="leftText"
                  required
                  defaultValue={editItem?.leftText ?? ""}
                  placeholder="14 Countries - 25 Offices"
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Right</label>
                <input
                  name="rightText"
                  required
                  defaultValue={editItem?.rightText ?? ""}
                  placeholder="blackstoneshipping.com"
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Web addresses become clickable links automatically. Anything
                  else renders as plain text.
                </p>
              </div>
              <div className="rounded-md border border-border bg-accent/30 px-3 py-2">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">
                  Preview
                </p>
                <div className="flex items-center justify-between gap-4 text-xs font-semibold text-blue-500">
                  <span>{editItem?.leftText || "14 Countries - 25 Offices"}</span>
                  <span>{editItem?.rightText || "blackstoneshipping.com"}</span>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setOpen(false);
                    setEditItem(null);
                  }}
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

      {lines.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <PanelBottom className="h-10 w-10 text-muted-foreground/40 mb-3" />
            <p className="text-sm font-medium">No footer lines yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Until one is assigned, signatures use the built-in default.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Title</th>
                  <th className="px-4 py-3 font-medium">Left</th>
                  <th className="px-4 py-3 font-medium">Right</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((line) => (
                  <tr
                    key={line.id}
                    className={`border-b border-border/40 last:border-0 hover:bg-accent/50 transition-colors ${
                      !line.isActive ? "opacity-50" : ""
                    }`}
                  >
                    <td className="px-4 py-3 font-medium whitespace-nowrap">{line.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{line.leftText}</td>
                    <td className="px-4 py-3 text-muted-foreground">{line.rightText}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                          line.isActive
                            ? "bg-green-500/10 text-green-500"
                            : "bg-red-500/10 text-red-500"
                        }`}
                      >
                        {line.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => handleToggle(line)}
                          disabled={isPending}
                        >
                          {line.isActive ? "Disable" : "Enable"}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => {
                            setEditItem(line);
                            setOpen(true);
                          }}
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive"
                          onClick={() => handleDelete(line.id)}
                          disabled={isPending}
                        >
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
