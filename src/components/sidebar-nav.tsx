"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  UsersRound,
  Award,
  Image,
  FileText,
  Settings,
  Activity,
  Link2,
  Globe,
} from "lucide-react";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/users", label: "Users", icon: Users },
  { href: "/groups", label: "Groups", icon: UsersRound },
  { href: "/certifications", label: "Certifications", icon: Award },
  { href: "/banners", label: "Banners", icon: Image },
  { href: "/legal-texts", label: "Legal Texts", icon: FileText },
  { href: "/assignments", label: "Assignments", icon: Link2 },
  { href: "/country-config", label: "Country Config", icon: Globe },
  { href: "/activity", label: "Activity Log", icon: Activity },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function SidebarNav() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-3">
      {navItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
            isActive(item.href)
              ? "bg-accent text-accent-foreground font-medium"
              : "text-secondary-foreground hover:bg-accent hover:text-accent-foreground"
          )}
        >
          <item.icon className="h-4 w-4" />
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
