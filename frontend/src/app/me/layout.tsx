"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  CalendarCheck2,
  CreditCard,
  Home,
  LogOut,
  ScanLine,
  User2,
  type LucideIcon,
} from "lucide-react";
import { clearAuth, getToken } from "@/lib/api";
import { LegionMark } from "@/components/brand/legion-mark";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

const NAV: NavItem[] = [
  { href: "/me", label: "Home", icon: Home },
  { href: "/me/pass", label: "Pass", icon: ScanLine },
  { href: "/me/plans", label: "Plans", icon: CreditCard },
  { href: "/me/classes", label: "Classes", icon: CalendarCheck2 },
  { href: "/me/profile", label: "Profile", icon: User2 },
];

export default function MeLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    const token = getToken();
    if (!token) {
      router.replace("/login");
      return;
    }
    setReady(true);
  }, [router]);

  function signOut() {
    clearAuth();
    router.replace("/login");
  }

  if (!ready) {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/40">
      <header className="sticky top-0 z-20 border-b bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 md:px-6">
          <Link href="/me" className="flex items-center gap-2">
            <LegionMark size={28} />
            <span className="text-sm font-extrabold tracking-tight">
              Legion
            </span>
          </Link>
          <nav className="flex items-center gap-1">
            {NAV.map((item) => {
              const Icon = item.icon;
              const active =
                item.href === "/me"
                  ? pathname === "/me"
                  : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                    active
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{item.label}</span>
                </Link>
              );
            })}
            <button
              type="button"
              onClick={signOut}
              className="ml-2 inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              aria-label="Sign out"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </nav>
        </div>
      </header>
      <main
        key={pathname}
        className="page-enter mx-auto max-w-5xl px-4 py-6 md:px-6 md:py-8"
      >
        {children}
      </main>
    </div>
  );
}
