import { prisma } from "@/lib/prisma";
import { SharedMailboxManager } from "./shared-mailbox-manager";

export default async function SharedMailboxesPage() {
  const [mailboxes, allUsers] = await Promise.all([
    prisma.msUser.findMany({
      where: { isSharedMailbox: true },
      select: {
        id: true,
        email: true,
        displayName: true,
        accountEnabled: true,
        sharedMailboxMembers: {
          select: {
            msUser: {
              select: {
                id: true,
                email: true,
                displayName: true,
                givenName: true,
                surname: true,
              },
            },
          },
        },
      },
      orderBy: { email: "asc" },
    }),
    prisma.msUser.findMany({
      select: {
        id: true,
        email: true,
        displayName: true,
        givenName: true,
        surname: true,
        accountEnabled: true,
        isLicensed: true,
        hasMailbox: true,
        isSharedMailbox: true,
      },
      orderBy: { email: "asc" },
    }),
  ]);

  const name = (u: {
    givenName?: string | null;
    surname?: string | null;
    displayName: string | null;
    email: string;
  }) =>
    [u.givenName, u.surname].filter(Boolean).join(" ") ||
    u.displayName ||
    u.email;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Shared Mailboxes</h1>
        <p className="text-sm text-muted-foreground">
          Addresses used by several people. When someone sends from one, the
          add-in applies the signature of whoever is signed in to Outlook — the
          member list below is only the fallback shown when that can&apos;t be
          determined.
        </p>
      </div>

      <SharedMailboxManager
        mailboxes={mailboxes.map((m) => ({
          id: m.id,
          email: m.email,
          name: m.displayName ?? m.email,
          // Microsoft blocks sign-in on a real shared mailbox, so it can never
          // hold a token of its own and the sender is always identifiable.
          // An enabled account means someone can sign in AS it — the
          // password-shared case, where the sender has to be chosen by hand.
          signInBlocked: !m.accountEnabled,
          members: m.sharedMailboxMembers
            .map((sm) => ({
              id: sm.msUser.id,
              email: sm.msUser.email,
              name: name(sm.msUser),
            }))
            .sort((a, b) => a.name.localeCompare(b.name)),
        }))}
        allUsers={allUsers.map((u) => ({
          id: u.id,
          email: u.email,
          name: name(u),
          accountEnabled: u.accountEnabled,
          isSharedMailbox: u.isSharedMailbox,
          // Graph has no mailbox-type field. This is the shared-mailbox
          // fingerprint: sign-in blocked, unlicensed, but has a real mailbox.
          looksShared: !u.accountEnabled && !u.isLicensed && u.hasMailbox,
        }))}
      />
    </div>
  );
}
