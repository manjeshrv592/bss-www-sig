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
import { Plus, Pencil, Trash2, FileSignature, Loader2 } from "lucide-react";
import {
  createRegistrationLine,
  updateRegistrationLine,
  deleteRegistrationLine,
} from "@/lib/actions/resources";
import { useUndoableDelete } from "@/lib/use-undoable-delete";
import {
  AnimatedTableBody,
  AnimatedTableRow,
  UndoDeleteRow,
} from "@/components/animated-table-row";

interface RegistrationLine {
  id: string;
  name: string;
  text: string;
  isActive: boolean;
  createdAt: Date;
}

export function RegistrationLineList({ lines }: { lines: RegistrationLine[] }) {
  const [open, setOpen] = useState(false);
  const [editItem, setEditItem] = useState<RegistrationLine | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const { isPendingDelete, secondsLeft, progress, requestDelete, undo } =
    useUndoableDelete({ onDelete: deleteRegistrationLine });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const name = (form.get("name") as string).trim();
    const text = (form.get("text") as string).trim();
    if (!name || !text) return;

    startTransition(async () => {
      if (editItem) {
        await updateRegistrationLine(editItem.id, { name, text });
      } else {
        await createRegistrationLine({ name, text });
      }
      setOpen(false);
      setEditItem(null);
      router.refresh();
    });
  };

  const handleToggle = (line: RegistrationLine) => {
    startTransition(async () => {
      await updateRegistrationLine(line.id, { isActive: !line.isActive });
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
              Add Registration Line
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editItem ? "Edit Registration Line" : "New Registration Line"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium">Title</label>
                <input
                  name="name"
                  required
                  defaultValue={editItem?.name ?? ""}
                  placeholder="e.g. India Registration"
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Only used to identify this line when assigning it.
                </p>
              </div>
              <div>
                <label className="text-sm font-medium">Text</label>
                <textarea
                  name="text"
                  required
                  rows={3}
                  defaultValue={editItem?.text ?? ""}
                  placeholder="e.g. Registered in India — CIN U61200MH2005PTC000000"
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Plain text. Rendered under the disclaimer using the same styling.
                </p>
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
            <FileSignature className="h-10 w-10 text-muted-foreground/40 mb-3" />
            <p className="text-sm font-medium">No registration lines yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Add one, then assign it by country in Assignments.
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
                  <th className="px-4 py-3 font-medium">Text</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <AnimatedTableBody>
                {lines.map((line) =>
                  isPendingDelete(line.id) ? (
                    <UndoDeleteRow
                      key={line.id}
                      colSpan={4}
                      label={line.name}
                      secondsLeft={secondsLeft(line.id)}
                      progress={progress(line.id)}
                      onUndo={() => undo(line.id)}
                    />
                  ) : (
                  <AnimatedTableRow
                    key={line.id}
                    className={`border-b border-border/40 last:border-0 hover:bg-accent/50 transition-colors ${
                      !line.isActive ? "opacity-50" : ""
                    }`}
                  >
                    <td className="px-4 py-3 font-medium whitespace-nowrap">{line.name}</td>
                    <td className="px-4 py-3 max-w-[420px]">
                      <p className="text-xs text-muted-foreground">{line.text}</p>
                    </td>
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
                          onClick={() => requestDelete(line.id)}
                          disabled={isPending}
                        >
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
    </>
  );
}
