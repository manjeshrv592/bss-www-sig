"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  LayoutDashboard,
  Activity,
  Link2,
  ChevronDown,
  Contact,
  Package,
} from "lucide-react";

type Item = { href: string; label: string };
type Section = { label: string; icon: typeof LayoutDashboard; items: Item[] };

const topLevel = [{ href: "/", label: "Dashboard", icon: LayoutDashboard }];

const sections: Section[] = [
  {
    label: "Directory",
    icon: Contact,
    items: [
      { href: "/users", label: "Users" },
      { href: "/groups", label: "Groups" },
      { href: "/shared-mailboxes", label: "Shared Mailboxes" },
    ],
  },
  {
    label: "Resources",
    icon: Package,
    items: [
      { href: "/certifications", label: "Certifications" },
      { href: "/banners", label: "Banners" },
      { href: "/disclaimers", label: "Disclaimers" },
      { href: "/registration-lines", label: "Registration Lines" },
      { href: "/footer-lines", label: "Footer Lines" },
    ],
  },
];

const bottomLevel = [
  { href: "/assignments", label: "Assignments", icon: Link2 },
  { href: "/activity", label: "Activity Log", icon: Activity },
];

export function SidebarNav() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  // A section starts open when the current page lives inside it, so navigating
  // to a resource never leaves you looking at a collapsed group.
  const [open, setOpen] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(
      sections.map((s) => [s.label, s.items.some((i) => isActive(i.href))])
    )
  );

  const topClass = (href: string) =>
    cn(
      "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
      isActive(href)
        ? "bg-accent text-accent-foreground font-medium"
        : "text-secondary-foreground hover:bg-accent hover:text-accent-foreground"
    );

  // Children carry no icon — the group heading already says what they are, and
  // a column of icons at this depth reads as clutter. The indent, the active
  // background and a lighter resting colour carry the hierarchy instead.
  const childClass = (href: string) =>
    cn(
      "block rounded-md py-2 pr-3 pl-10 text-sm transition-colors",
      isActive(href)
        ? "bg-accent text-accent-foreground font-medium"
        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
    );

  return (
    <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-3">
      {topLevel.map((item) => (
        <Link key={item.href} href={item.href} className={topClass(item.href)}>
          <item.icon className="h-4 w-4" />
          {item.label}
        </Link>
      ))}

      {sections.map((section) => {
        const expanded = open[section.label] ?? false;
        const hasActive = section.items.some((i) => isActive(i.href));
        return (
          <Collapsible
            key={section.label}
            open={expanded}
            onOpenChange={(v) => setOpen((o) => ({ ...o, [section.label]: v }))}
          >
            <CollapsibleTrigger
              className={cn(
                "flex w-full cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                hasActive && !expanded
                  ? "bg-accent/50 text-accent-foreground font-medium"
                  : "text-secondary-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <section.icon className="h-4 w-4 shrink-0" />
              {section.label}
              <ChevronDown
                className={cn(
                  "ml-auto h-3.5 w-3.5 shrink-0 transition-transform duration-200",
                  expanded && "rotate-180"
                )}
              />
            </CollapsibleTrigger>
            <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
              <div className="mt-1 space-y-1">
                {section.items.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={childClass(item.href)}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        );
      })}

      {bottomLevel.map((item) => (
        <Link key={item.href} href={item.href} className={topClass(item.href)}>
          <item.icon className="h-4 w-4" />
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
