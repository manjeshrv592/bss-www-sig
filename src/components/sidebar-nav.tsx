"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  UsersRound,
  Mailbox,
  Award,
  Image,
  FileText,
  FileSignature,
  PanelBottom,
  Activity,
  Link2,
  ChevronDown,
  Contact,
  Package,
} from "lucide-react";

type Item = { href: string; label: string; icon: typeof LayoutDashboard };
type Section = { label: string; icon: typeof LayoutDashboard; items: Item[] };

const topLevel: Item[] = [{ href: "/", label: "Dashboard", icon: LayoutDashboard }];

const sections: Section[] = [
  {
    label: "Directory",
    icon: Contact,
    items: [
      { href: "/users", label: "Users", icon: Users },
      { href: "/groups", label: "Groups", icon: UsersRound },
      { href: "/shared-mailboxes", label: "Shared Mailboxes", icon: Mailbox },
    ],
  },
  {
    label: "Resources",
    icon: Package,
    items: [
      { href: "/certifications", label: "Certifications", icon: Award },
      { href: "/banners", label: "Banners", icon: Image },
      { href: "/disclaimers", label: "Disclaimers", icon: FileText },
      { href: "/registration-lines", label: "Registration Lines", icon: FileSignature },
      { href: "/footer-lines", label: "Footer Lines", icon: PanelBottom },
    ],
  },
];

const bottomLevel: Item[] = [
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

  const linkClass = (href: string, nested = false) =>
    cn(
      "flex items-center gap-3 rounded-md py-2 text-sm transition-colors",
      nested ? "pl-9 pr-3" : "px-3",
      isActive(href)
        ? "bg-accent text-accent-foreground font-medium"
        : "text-secondary-foreground hover:bg-accent hover:text-accent-foreground"
    );

  return (
    <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-3">
      {topLevel.map((item) => (
        <Link key={item.href} href={item.href} className={linkClass(item.href)}>
          <item.icon className="h-4 w-4" />
          {item.label}
        </Link>
      ))}

      {sections.map((section) => {
        const expanded = open[section.label];
        const hasActive = section.items.some((i) => isActive(i.href));
        return (
          <div key={section.label}>
            <button
              type="button"
              aria-expanded={expanded}
              onClick={() =>
                setOpen((o) => ({ ...o, [section.label]: !o[section.label] }))
              }
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
                  "ml-auto h-3.5 w-3.5 shrink-0 transition-transform",
                  expanded && "rotate-180"
                )}
              />
            </button>
            {expanded && (
              <div className="mt-1 space-y-1">
                {section.items.map((item) => (
                  <Link key={item.href} href={item.href} className={linkClass(item.href, true)}>
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {bottomLevel.map((item) => (
        <Link key={item.href} href={item.href} className={linkClass(item.href)}>
          <item.icon className="h-4 w-4" />
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
