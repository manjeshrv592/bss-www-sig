import { signIn } from "@/lib/auth";
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

export default async function DashboardPage() {
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
              await signIn("microsoft-entra-id", { redirectTo: "/bss-sig" });
            }}
          >
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-3 rounded-md bg-[#2f2f2f] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#404040] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <MicrosoftLogo />
              Sign in with Microsoft
            </button>
          </form>
          <p className="text-center text-[11px] text-muted-foreground/70 pt-1">
            Only authorized administrators can access this app.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
