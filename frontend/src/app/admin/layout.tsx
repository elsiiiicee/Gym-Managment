"use client";

import * as React from "react";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { getRole, getToken } from "@/lib/api";
import { Sidebar } from "@/components/admin/sidebar";
import { Topbar } from "@/components/admin/topbar";
import { cn } from "@/lib/utils";

const COLLAPSE_KEY = "legion.sidebarCollapsed";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const token = getToken();
    const role = getRole();
    if (!token) {
      router.replace("/login");
      return;
    }
    // Non-admins live at /me, not /admin.
    if (role !== "ADMIN") {
      router.replace("/me");
      return;
    }
    const stored = window.localStorage.getItem(COLLAPSE_KEY);
    if (stored === "1") setCollapsed(true);
    setReady(true);
  }, [router]);

  function toggleSidebar() {
    setCollapsed((c) => {
      const next = !c;
      window.localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0");
      return next;
    });
  }

  if (!ready) {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="h-screen overflow-hidden bg-muted/40">
      <Sidebar
        collapsed={collapsed}
        onToggle={toggleSidebar}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />
      <div
        className={cn(
          "flex h-screen flex-col transition-[padding] duration-300",
          collapsed ? "md:pl-[72px]" : "md:pl-64"
        )}
      >
        <Topbar onMobileMenu={() => setMobileOpen(true)} />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          <div key={pathname} className="page-enter">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
