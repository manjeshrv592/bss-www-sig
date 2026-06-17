import NextAuth from "next-auth";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";
import Credentials from "next-auth/providers/credentials";
import type { NextAuthConfig } from "next-auth";
import { prisma } from "@/lib/prisma";

const adminEmails = (process.env.ADMIN_EMAILS ?? "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export const authConfig: NextAuthConfig = {
  providers: [
    MicrosoftEntraID({
      clientId: process.env.AZURE_AD_CLIENT_ID!,
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
      issuer: `https://login.microsoftonline.com/${process.env.AZURE_AD_TENANT_ID}/v2.0`,
      authorization: {
        params: {
          scope: "openid profile",
        },
      },
    }),
    // Root/break-glass login: username + password from env, used via the
    // unlisted /root page when Microsoft login is unavailable.
    Credentials({
      id: "root-credentials",
      name: "Root",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      authorize: (credentials) => {
        const rootEmail = process.env.ROOT_USER_EMAIL?.trim();
        const rootPass = process.env.ROOT_USER_PASS;

        if (!rootEmail || !rootPass) return null;

        const email = String(credentials?.email ?? "").trim();
        const password = String(credentials?.password ?? "");

        if (
          email.toLowerCase() === rootEmail.toLowerCase() &&
          password === rootPass
        ) {
          return { email: rootEmail, name: "Root User" };
        }

        return null;
      },
    }),
  ],
  basePath: "/api/auth",
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async signIn({ user, account }) {
      if (!user.email) return false;
      const email = user.email.toLowerCase();

      const isRoot = account?.provider === "root-credentials";

      // The ADMIN_EMAILS allowlist only gates Microsoft logins. Root login is
      // already validated against ROOT_USER_EMAIL/ROOT_USER_PASS in authorize().
      if (!isRoot && adminEmails.length > 0 && !adminEmails.includes(email)) {
        return false;
      }

      await prisma.user.upsert({
        where: { email },
        update: { name: user.name, image: user.image },
        create: {
          email,
          name: user.name,
          image: user.image,
          role: isRoot ? "root" : "admin",
        },
      });

      return true;
    },
    async session({ session, token }) {
      if (token.dbUserId) {
        session.user.id = token.dbUserId as string;
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user?.email) {
        const dbUser = await prisma.user.findUnique({
          where: { email: user.email.toLowerCase() },
          select: { id: true },
        });
        if (dbUser) token.dbUserId = dbUser.id;
      }
      return token;
    },
  },
  session: {
    strategy: "jwt",
  },
  trustHost: true,
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
