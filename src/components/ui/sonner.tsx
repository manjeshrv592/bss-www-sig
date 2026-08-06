"use client";

import { useTheme } from "next-themes";
import { Toaster as Sonner, type ToasterProps } from "sonner";

/**
 * Toast host. Mounted once in the dashboard layout; everything else calls
 * `toast()` from sonner directly.
 */
export function Toaster(props: ToasterProps) {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      position="bottom-right"
      // Styled from the app's own tokens so toasts match the soft surfaces
      // rather than shipping sonner's default look.
      toastOptions={{
        classNames: {
          toast:
            "group rounded-xl border-border bg-card bg-gradient-surface text-card-foreground shadow-soft-lg ring-1 ring-foreground/5",
          description: "text-muted-foreground",
          actionButton:
            "bg-gradient-primary text-primary-foreground rounded-lg shadow-soft-sm",
          cancelButton: "bg-muted text-muted-foreground rounded-lg",
        },
      }}
      {...props}
    />
  );
}
