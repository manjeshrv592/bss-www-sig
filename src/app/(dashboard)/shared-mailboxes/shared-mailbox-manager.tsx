"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, Loader2, Mailbox, UserPlus, X } from "lucide-react";
import {
  setSharedMailbox,
  addSharedMailboxMember,
  removeSharedMailboxMember,
} from "@/lib/actions/shared-mailboxes";

interface Person {
  id: string;
  email: string;
  name: string;
}

interface MailboxRow extends Person {
  members: Person[];
}

interface UserOption extends Person {
  accountEnabled: boolean;
  isSharedMailbox: boolean;
}

export function SharedMailboxManager({
  mailboxes,
  allUsers,
}: {
  mailboxes: MailboxRow[];
  allUsers: UserOption[];
}) {
  const [addOpen, setAddOpen] = useState(false);
  const [newMailboxId, setNewMailboxId] = useState("");
  const [memberDraft, setMemberDraft] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const run = (fn: () => Promise<unknown>) =>
    startTransition(async () => {
      await fn();
      router.refresh();
    });

  const candidates = allUsers.filter((u) => !u.isSharedMailbox);
  // Microsoft creates a sign-in-blocked directory object behind every shared
  // mailbox, so disabled accounts are the likeliest candidates — but a
  // departed employee looks identical, hence the admin confirms.
  const likely = candidates.filter((u) => !u.accountEnabled);
  const rest = candidates.filter((u) => u.accountEnabled);

  return (
    <>
      <div className="flex justify-end">
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Mark a Shared Mailbox
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Mark as Shared Mailbox</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-xs text-muted-foreground">
                Microsoft Graph doesn&apos;t report mailbox type, so this has to
                be set by hand. Sign-in-disabled accounts are listed first —
                that&apos;s how shared mailboxes appear in the directory.
              </p>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Address</label>
                <Select value={newMailboxId} onValueChange={setNewMailboxId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select an address..." />
                  </SelectTrigger>
                  <SelectContent position="popper">
                    {likely.length > 0 && (
                      <>
                        {likely.map((u) => (
                          <SelectItem key={u.id} value={u.id}>
                            {u.email} — sign-in disabled
                          </SelectItem>
                        ))}
                      </>
                    )}
                    {rest.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setAddOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  disabled={isPending || !newMailboxId}
                  onClick={() =>
                    run(async () => {
                      await setSharedMailbox(newMailboxId, true);
                      setNewMailboxId("");
                      setAddOpen(false);
                    })
                  }
                >
                  {isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Mark as Shared
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {mailboxes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Mailbox className="h-10 w-10 text-muted-foreground/40 mb-3" />
            <p className="text-sm font-medium">No shared mailboxes yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Mark an address like marketing@ to enable per-sender signatures.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {mailboxes.map((mb) => {
            const memberIds = new Set(mb.members.map((m) => m.id));
            const addable = candidates.filter((u) => !memberIds.has(u.id));

            return (
              <Card key={mb.id}>
                <CardHeader className="flex flex-row items-start justify-between gap-4 pb-3">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-sm font-medium">
                      <Mailbox className="h-4 w-4 text-muted-foreground" />
                      {mb.email}
                    </CardTitle>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Auto-insert is skipped for this address unless the signed-in
                      user can be identified.
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-destructive shrink-0"
                    disabled={isPending}
                    onClick={() => {
                      if (!confirm(`Stop treating ${mb.email} as a shared mailbox?`)) return;
                      run(() => setSharedMailbox(mb.id, false));
                    }}
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    Unmark
                  </Button>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-xs font-medium mb-2">
                      Fallback picker members ({mb.members.length})
                    </p>
                    {mb.members.length === 0 ? (
                      <p className="text-xs text-muted-foreground">
                        None yet. Without members, anyone who can&apos;t be
                        identified automatically gets no signature to choose from.
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {mb.members.map((m) => (
                          <span
                            key={m.id}
                            className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 text-primary px-2.5 py-1 text-xs"
                          >
                            {m.name}
                            <button
                              type="button"
                              aria-label={`Remove ${m.name}`}
                              disabled={isPending}
                              onClick={() =>
                                run(() => removeSharedMailboxMember(mb.id, m.id))
                              }
                              className="hover:text-destructive"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <Select
                      value={memberDraft[mb.id] ?? ""}
                      onValueChange={(v) =>
                        setMemberDraft((d) => ({ ...d, [mb.id]: v }))
                      }
                    >
                      <SelectTrigger className="w-full max-w-xs">
                        <SelectValue placeholder="Add a member..." />
                      </SelectTrigger>
                      <SelectContent position="popper">
                        {addable.map((u) => (
                          <SelectItem key={u.id} value={u.id}>
                            {u.name} ({u.email})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5"
                      disabled={isPending || !memberDraft[mb.id]}
                      onClick={() =>
                        run(async () => {
                          await addSharedMailboxMember(mb.id, memberDraft[mb.id]);
                          setMemberDraft((d) => ({ ...d, [mb.id]: "" }));
                        })
                      }
                    >
                      <UserPlus className="h-3.5 w-3.5" />
                      Add
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
