import { auth, signIn } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import type { Metadata } from "next";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";

// Keep this page out of search engines and crawlers.
export const metadata: Metadata = {
  title: "Root access",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: { index: false, follow: false },
  },
};

export default async function RootLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await auth();

  if (session) {
    redirect("/");
  }

  const { error } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-[380px] shadow-lg border-border/60">
        <CardHeader className="items-center text-center pb-2">
          <div className="space-y-1">
            <CardTitle className="text-xl font-semibold tracking-tight">
              Root Access
            </CardTitle>
            <CardDescription className="text-xs">
              Restricted sign in for system administrators
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          {error && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-center text-xs text-destructive">
              Invalid email or password.
            </p>
          )}
          <form
            action={async (formData: FormData) => {
              "use server";
              try {
                await signIn("root-credentials", {
                  email: formData.get("email"),
                  password: formData.get("password"),
                  redirectTo: "/",
                });
              } catch (err) {
                if (err instanceof AuthError) {
                  redirect("/root?error=1");
                }
                throw err;
              }
            }}
            className="space-y-3"
          >
            <div className="space-y-1.5">
              <label
                htmlFor="email"
                className="text-xs font-medium text-muted-foreground"
              >
                Email
              </label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="username"
                required
              />
            </div>
            <div className="space-y-1.5">
              <label
                htmlFor="password"
                className="text-xs font-medium text-muted-foreground"
              >
                Password
              </label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-3 rounded-md bg-[#2f2f2f] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#404040] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              Sign in
            </button>
          </form>
          <p className="text-center text-[11px] text-muted-foreground/70 pt-1">
            This page is not indexed. Authorized personnel only.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
