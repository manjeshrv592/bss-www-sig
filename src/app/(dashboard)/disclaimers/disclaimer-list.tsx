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
import { Plus, Pencil, Trash2, FileText, Loader2 } from "lucide-react";
import {
  createDisclaimer,
  updateDisclaimer,
  deleteDisclaimer,
  moveDisclaimer,
  deleteDisclaimers,
} from "@/lib/actions/resources";
import { RichTextEditor } from "@/components/rich-text-editor";
import { useDragOrder } from "@/lib/use-drag-order";
import { useUndoableDelete } from "@/lib/use-undoable-delete";
import {
  ResourceInUseDialog,
  type InUseTarget,
} from "@/components/resource-in-use-dialog";
import { useRowSelection } from "@/lib/use-row-selection";
import { BulkActionBar } from "@/components/bulk-action-bar";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AnimatedTableBody,
  AnimatedTableRow,
  UndoDeleteRow,
} from "@/components/animated-table-row";
import { OrderCell } from "@/components/order-cell";

interface Disclaimer {
  id: string;
  name: string;
  content: string;
  isActive: boolean;
  createdAt: Date;
}

export function DisclaimerList({
  inUse,
  disclaimers,
  offset,
  total,
}: {
  /** Resource id -> how many rules and overrides reference it. */
  inUse: Record<string, { rules: number; overrides: number; total: number }>;
  disclaimers: Disclaimer[];
  offset: number;
  total: number;
}) {
  const [open, setOpen] = useState(false);
  const [editItem, setEditItem] = useState<Disclaimer | null>(null);
  const [content, setContent] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const { items, getRowProps, rowStateClass, getHandleProps, moveTo } = useDragOrder({
    items: disclaimers,
    offset,
    total,
    move: moveDisclaimer,
  });

  const {
    isPendingDelete,
    isPendingBatch,
    batchCount,
    durationMs,
    requestDelete,
    requestDeleteMany,
    undo,
    undoBatch,
  } = useUndoableDelete({
    onDeleteMany: deleteDisclaimers,
    onDelete: deleteDisclaimer,
  });

  // Set when a delete is blocked, which opens the explaining dialog.
  const [blocked, setBlocked] = useState<InUseTarget | null>(null);

  const selection = useRowSelection(
    items.filter((r) => !inUse[r.id]?.total).map((r) => r.id)
  );

  const openCreate = () => {
    setEditItem(null);
    setContent("");
    setOpen(true);
  };

  const openEdit = (item: Disclaimer) => {
    setEditItem(item);
    setContent(item.content);
    setOpen(true);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const name = form.get("name") as string;

    startTransition(async () => {
      if (editItem) {
        await updateDisclaimer(editItem.id, { name, content });
      } else {
        await createDisclaimer({ name, content });
      }
      setOpen(false);
      setEditItem(null);
      setContent("");
      router.refresh();
    });
  };

  const handleToggle = (item: Disclaimer) => {
    startTransition(async () => {
      await updateDisclaimer(item.id, { isActive: !item.isActive });
      router.refresh();
    });
  };

  return (
    <>
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={(v: boolean) => { setOpen(v); if (!v) { setEditItem(null); setContent(""); } }}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2" onClick={openCreate}>
              <Plus className="h-4 w-4" />
              Add Disclaimer
            </Button>
          </DialogTrigger>
          {/* sm: prefix required — the base DialogContent sets sm:max-w-sm, and
              tailwind-merge keeps both when the modifiers differ, so an
              unprefixed max-w-2xl loses to it on anything above mobile. */}
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editItem ? "Edit Disclaimer" : "New Disclaimer"}</DialogTitle>
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
                <label className="text-sm font-medium">Content</label>
                <div className="mt-1">
                  <RichTextEditor
                    content={content}
                    onChange={setContent}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => { setOpen(false); setEditItem(null); setContent(""); }}
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

      <BulkActionBar
        count={selection.count}
        batchCount={batchCount}
        durationMs={durationMs}
        noun="disclaimer"
        onDelete={() => {
          requestDeleteMany(selection.ids);
          selection.clear();
        }}
        onClear={selection.clear}
        onUndo={undoBatch}
      />

      {items.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <FileText className="h-10 w-10 text-muted-foreground/40 mb-3" />
            <p className="text-sm font-medium">No disclaimers yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Add your first disclaimer.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="w-10 px-4 py-3">
                    <Checkbox
                      checked={selection.headerState}
                      onCheckedChange={selection.toggleAll}
                      aria-label="Select all rows on this page"
                    />
                  </th>
                  <th className="w-16 px-4 py-3 font-medium">Order</th>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Preview</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <AnimatedTableBody>
                {items.map((item, index) =>
                  isPendingDelete(item.id) ? (
                    isPendingBatch(item.id) ? null : (
                    <UndoDeleteRow
                      key={item.id}
                      colSpan={6}
                      durationMs={durationMs}
                      onUndo={() => undo(item.id)}
                    />
                    )
                  ) : (
                  <AnimatedTableRow
                    key={item.id}
                    {...getRowProps(index)}
                    className={`border-b border-border/40 last:border-0 hover:bg-accent/50 transition-colors ${
                      !item.isActive ? "opacity-50" : ""
                    } ${rowStateClass(index)}`}
                  >
                    <td className="px-4 py-3">
                      <Checkbox
                        checked={selection.isSelected(item.id)}
                        onCheckedChange={() => selection.toggle(item.id)}
                        disabled={Boolean(inUse[item.id]?.total)}
                        aria-label="Select row"
                      />
                    </td>
                    <OrderCell
                      index={offset + index}
                      total={total}
                      handleProps={getHandleProps(index, item.name)}
                      onMoveTo={(to) => moveTo(item.id, to)}
                    />
                    <td className="px-4 py-3 font-medium">{item.name}</td>
                    <td className="px-4 py-3 max-w-[400px]">
                      <div
                        className="prose prose-sm dark:prose-invert max-w-none text-xs text-muted-foreground line-clamp-2"
                        dangerouslySetInnerHTML={{ __html: item.content }}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                          item.isActive ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
                        }`}
                      >
                        {item.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => handleToggle(item)} disabled={isPending}>
                          {item.isActive ? "Disable" : "Enable"}
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(item)}>
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => {
                            const usage = inUse[item.id];
                            if (usage?.total) {
                              setBlocked({ id: item.id, name: item.name, ...usage });
                            } else {
                              requestDelete(item.id);
                            }
                          }} disabled={isPending}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </td>
                  </AnimatedTableRow>
                  )
                )}
              </AnimatedTableBody>
            </table>
          </CardContent>
        </Card>
      )}
      <ResourceInUseDialog
        target={blocked}
        resourceType="disclaimer"
        onClose={() => setBlocked(null)}
      />
    </>
  );
}
