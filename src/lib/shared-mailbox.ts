import { prisma } from "@/lib/prisma";

export interface SenderCandidate {
  id: string;
  name: string;
  email: string;
}

export type SenderResolution =
  /** Normal mailbox, or a shared mailbox where we know who is sending. */
  | { status: "resolved"; msUserId: string; email: string; viaSharedMailbox: boolean }
  /** Shared mailbox and we could not tell who is sending — client must ask. */
  | { status: "needs_selection"; sharedMailboxEmail: string; candidates: SenderCandidate[] }
  | { status: "not_found"; email: string };

function displayNameFor(u: {
  displayName: string | null;
  givenName: string | null;
  surname: string | null;
  email: string;
}) {
  return (
    [u.givenName, u.surname].filter(Boolean).join(" ") ||
    u.displayName ||
    u.email
  );
}

/**
 * Work out whose signature to build.
 *
 * `fromEmail` is the address the message is being sent from — for a shared
 * mailbox that is the same for everyone, so it cannot identify a person.
 * `signedInEmail` comes from the verified Office SSO token and always names the
 * actual human at the keyboard: a shared mailbox has sign-in blocked, so it can
 * never hold a token of its own. When both are present and the sender is a
 * shared mailbox, the signed-in identity wins.
 *
 * `selectedMsUserId` is the manual-picker fallback and is only honoured for
 * someone actually listed on that shared mailbox.
 */
export async function resolveSender(opts: {
  fromEmail: string;
  signedInEmail?: string | null;
  selectedMsUserId?: string | null;
}): Promise<SenderResolution> {
  const fromEmail = opts.fromEmail.toLowerCase();

  const from = await prisma.msUser.findFirst({
    where: { email: { equals: fromEmail, mode: "insensitive" } },
    select: { id: true, email: true, isSharedMailbox: true },
  });

  if (!from) return { status: "not_found", email: fromEmail };

  if (!from.isSharedMailbox) {
    return {
      status: "resolved",
      msUserId: from.id,
      email: from.email,
      viaSharedMailbox: false,
    };
  }

  // ── Shared mailbox ───────────────────────────────────────
  // 1. Trust the signed-in identity when we have one. It does not depend on an
  //    admin having listed the person as a member.
  if (opts.signedInEmail) {
    const signedIn = await prisma.msUser.findFirst({
      where: { email: { equals: opts.signedInEmail.toLowerCase(), mode: "insensitive" } },
      select: { id: true, email: true, isSharedMailbox: true },
    });

    if (signedIn && signedIn.id !== from.id && !signedIn.isSharedMailbox) {
      return {
        status: "resolved",
        msUserId: signedIn.id,
        email: signedIn.email,
        viaSharedMailbox: true,
      };
    }
  }

  // 2. Manual pick — must be a listed member of this mailbox.
  if (opts.selectedMsUserId) {
    const membership = await prisma.sharedMailboxMember.findUnique({
      where: {
        sharedMailboxId_msUserId: {
          sharedMailboxId: from.id,
          msUserId: opts.selectedMsUserId,
        },
      },
      select: { msUser: { select: { id: true, email: true } } },
    });

    if (membership) {
      return {
        status: "resolved",
        msUserId: membership.msUser.id,
        email: membership.msUser.email,
        viaSharedMailbox: true,
      };
    }
  }

  // 3. Ask the user who they are.
  const members = await prisma.sharedMailboxMember.findMany({
    where: { sharedMailboxId: from.id },
    select: {
      msUser: {
        select: { id: true, displayName: true, givenName: true, surname: true, email: true },
      },
    },
  });

  const candidates = members
    .map((m) => ({
      id: m.msUser.id,
      name: displayNameFor(m.msUser),
      email: m.msUser.email,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return { status: "needs_selection", sharedMailboxEmail: from.email, candidates };
}
