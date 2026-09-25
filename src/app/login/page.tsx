import { auth, signIn } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

function MicrosoftLogo() {
  return (
    <svg width="20" height="20" viewBox="0 0 21 21" xmlns="http://www.w3.org/2000/svg">
      <rect x="1" y="1" width="9" height="9" fill="#f25022" />
      <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
      <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
      <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
    </svg>
  );
}

export default async function LoginPage() {
  const session = await auth();

  if (session) {
    redirect("/");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-[380px] shadow-lg border-border/60">
        <CardHeader className="items-center text-center pb-2">
          <div className="space-y-1">
            <CardTitle className="text-xl font-semibold tracking-tight">
              BSS Signature Manager
            </CardTitle>
            <CardDescription className="text-xs">
              Email signature management for Blackstone Shipping
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border/40" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-card px-3 text-muted-foreground">
                sign in to continue
              </span>
            </div>
          </div>
          <form
            action={async () => {
              "use server";
              await signIn("microsoft-entra-id", { redirectTo: "/" });
            }}
          >
            <Button
              type="submit"
              size="lg"
              className="w-full gap-3 bg-[#2f2f2f] bg-none text-white shadow-none hover:bg-[#404040] hover:brightness-100"
            >
              <MicrosoftLogo />
              Sign in with Microsoft
            </Button>
          </form>
          <p className="text-center text-[11px] text-muted-foreground/70 pt-1">
            Only authorized administrators can access this app.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
