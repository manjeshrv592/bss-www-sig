import NextAuth from "next-auth";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";
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
  ],
  basePath: "/api/auth",
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async signIn({ user, profile }) {
      console.log("[AUTH] signIn callback - user.email:", user.email);
      console.log("[AUTH] signIn callback - profile:", JSON.stringify(profile, null, 2));
      console.log("[AUTH] adminEmails:", adminEmails);
      
      if (!user.email) return false;
      const email = user.email.toLowerCase();
      console.log("[AUTH] Checking email:", email, "against adminEmails:", adminEmails);
      console.log("[AUTH] Is included:", adminEmails.includes(email));
      
      if (adminEmails.length > 0 && !adminEmails.includes(email)) {
        console.log("[AUTH] Access denied - email not in admin list");
        return false;
      }

      await prisma.user.upsert({
        where: { email },
        update: { name: user.name, image: user.image },
        create: { email, name: user.name, image: user.image, role: "admin" },
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
