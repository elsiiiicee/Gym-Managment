"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Dumbbell,
  UserCog,
  CreditCard,
  Wallet,
  CalendarCheck2,
  Smartphone,
  Settings,
  ChevronLeft,
  ChevronRight,
  X,
  Receipt,
  type LucideIcon,
} from "lucide-react";
import { LegionMark } from "@/components/brand/legion-mark";
import { cn } from "@/lib/utils";

interface Item {
  href: string;
  label: string;
  icon: LucideIcon;
  section: string;
}

const ITEMS: Item[] = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, section: "Workspace" },
  { href: "/admin/users", label: "Members", icon: Users, section: "Workspace" },
  { href: "/admin/classes", label: "Classes", icon: Dumbbell, section: "Workspace" },
  { href: "/admin/trainers", label: "Trainers", icon: UserCog, section: "Workspace" },
  { href: "/admin/bookings", label: "Bookings", icon: CalendarCheck2, section: "Workspace" },
  { href: "/admin/memberships", label: "Plans", icon: CreditCard, section: "Money" },
  { href: "/admin/billing", label: "Billing", icon: Wallet, section: "Money" },
  { href: "/admin/payroll", label: "Payroll", icon: Receipt, section: "Money" },
  { href: "/admin/member-app", label: "Member app", icon: Smartphone, section: "Experience" },
  { href: "/admin/settings", label: "Settings", icon: Settings, section: "System" },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export function Sidebar({
  collapsed,
  onToggle,
  mobileOpen,
  onMobileClose,
}: SidebarProps) {
  const pathname = usePathname();

  // group by section preserving order
  const sections = React.useMemo(() => {
    const groups: Record<string, Item[]> = {};
    const order: string[] = [];
    for (const it of ITEMS) {
      if (!groups[it.section]) {
        groups[it.section] = [];
        order.push(it.section);
      }
      groups[it.section].push(it);
    }
    return order.map((s) => [s, groups[s]] as const);
  }, []);

  const isActive = (href: string) =>
    href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);

  const renderItem = (it: Item) => {
    const active = isActive(it.href);
    const Icon = it.icon;
    return (
      <Link
        key={it.href}
        href={it.href}
        onClick={onMobileClose}
        className={cn(
          "group relative flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium transition-all duration-200",
          active
            ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20"
            : "text-muted-foreground hover:bg-accent hover:text-foreground hover:translate-x-0.5",
          collapsed && "justify-center px-0"
        )}
        title={collapsed ? it.label : undefined}
      >
        <Icon
          className={cn(
            "h-[18px] w-[18px] shrink-0 transition-transform",
            !active && "group-hover:scale-110"
          )}
        />
        {!collapsed && <span className="truncate">{it.label}</span>}
        {active && !collapsed && (
          <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary-foreground/80 animate-pulse-ring" />
        )}
      </Link>
    );
  };

  const nav = (
    <nav className="flex flex-col gap-3 px-3 py-4">
      {sections.map(([secName, items]) => (
        <div key={secName} className="flex flex-col gap-0.5">
          {!collapsed && (
            <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/70">
              {secName}
            </div>
          )}
          {items.map(renderItem)}
        </div>
      ))}
    </nav>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "hidden lg:flex sticky top-0 h-screen flex-col border-r border-border bg-card transition-all duration-300 ease-out z-30",
          collapsed ? "w-16" : "w-64"
        )}
      >
        <div
          className={cn(
            "flex h-16 items-center border-b border-border",
            collapsed ? "justify-center px-2" : "px-5"
          )}
        >
          <Link
            href="/admin"
            className="group flex items-center gap-2.5 transition-transform hover:scale-[1.02] active:scale-100"
          >
            <LegionMark size={collapsed ? 32 : 34} />
            {!collapsed && (
              <span
                className="text-base font-extrabold tracking-tight"
                style={{ letterSpacing: "-0.02em" }}
              >
                Legion
              </span>
            )}
          </Link>
        </div>
        <div className="flex-1 overflow-y-auto">{nav}</div>
        <div
          className={cn(
            "border-t border-border p-3",
            collapsed ? "flex justify-center" : ""
          )}
        >
          <button
            onClick={onToggle}
            className={cn(
              "flex h-9 items-center gap-2 rounded-md px-3 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors",
              collapsed ? "w-9 justify-center px-0" : "w-full"
            )}
            title={collapsed ? "Expand" : "Collapse"}
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <>
                <ChevronLeft className="h-4 w-4" />
                <span>Collapse</span>
              </>
            )}
          </button>
        </div>
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
            onClick={onMobileClose}
          />
          <aside className="relative h-full w-64 border-r border-border bg-card animate-slide-in-left flex flex-col">
            <div className="flex h-16 items-center justify-between px-5 border-b border-border">
              <div className="flex items-center gap-2.5">
                <LegionMark size={34} />
                <span
                  className="text-base font-extrabold tracking-tight"
                  style={{ letterSpacing: "-0.02em" }}
                >
                  Legion
                </span>
              </div>
              <button
                onClick={onMobileClose}
                className="rounded-md p-2 hover:bg-accent"
              >
                <X className="h-[18px] w-[18px]" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">{nav}</div>
          </aside>
        </div>
      )}
    </>
  );
}
