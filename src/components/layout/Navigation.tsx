"use client";

import { BookOpen, Plus, Users, Building2 } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
}

const SALES_ITEMS: NavItem[] = [
  { href: "/reports", label: "日報一覧", icon: <BookOpen className="h-4 w-4" /> },
  { href: "/reports/new", label: "日報作成", icon: <Plus className="h-4 w-4" /> },
];

const MANAGER_ITEMS: NavItem[] = [
  { href: "/reports", label: "日報一覧", icon: <BookOpen className="h-4 w-4" /> },
];

const ADMIN_ITEMS: NavItem[] = [
  { href: "/master/customers", label: "顧客マスター", icon: <Building2 className="h-4 w-4" /> },
  { href: "/master/users", label: "ユーザーマスター", icon: <Users className="h-4 w-4" /> },
];

function getNavItems(role: string): NavItem[] {
  if (role === "SALES") return SALES_ITEMS;
  if (role === "MANAGER") return MANAGER_ITEMS;
  if (role === "ADMIN") return ADMIN_ITEMS;
  return [];
}

export function Navigation() {
  const { user } = useAuth();
  const pathname = usePathname();

  if (!user) return null;

  const items = getNavItems(user.role);

  return (
    <nav className="flex w-52 flex-col gap-1 border-r bg-background p-3">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
            pathname === item.href || pathname.startsWith(item.href + "/")
              ? "bg-accent text-accent-foreground"
              : "text-muted-foreground"
          )}
        >
          {item.icon}
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
