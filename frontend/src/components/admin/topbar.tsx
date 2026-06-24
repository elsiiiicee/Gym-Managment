"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  Bell,
  Check,
  ChevronDown,
  LogOut,
  Menu,
  Moon,
  Settings as SettingsIcon,
  Sun,
  User,
} from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTheme } from "@/components/theme-provider";
import {
  api,
  clearAuth,
  getEmail,
  getRole,
  type MyProfile,
} from "@/lib/api";

interface TopbarProps {
  onMobileMenu: () => void;
}

interface NotificationItem {
  id: string;
  type: string;
  message: string;
  readAt: string | null;
  createdAt: string;
}

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const sec = Math.floor(ms / 1000);
  if (sec < 60) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  return new Date(iso).toLocaleDateString();
}

export function Topbar({ onMobileMenu }: TopbarProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { theme, toggle } = useTheme();
  const [email, setEmail] = React.useState<string>("");
  const [role, setRole] = React.useState<string>("");

  React.useEffect(() => {
    setEmail(getEmail() ?? "");
    setRole(getRole() ?? "");
  }, []);

  const notificationsQ = useQuery({
    queryKey: ["notifications"],
    queryFn: () => api.get<NotificationItem[]>("/api/notifications"),
    refetchInterval: 60_000,
  });

  // Shares cache with the Settings page so a fresh avatar upload reflects
  // immediately in the topbar without an extra round-trip.
  const meQ = useQuery({
    queryKey: ["users", "me"],
    queryFn: () => api.get<MyProfile>("/api/users/me"),
    staleTime: 60_000,
  });

  const markRead = useMutation({
    mutationFn: (id: string) =>
      api.patch<void>(`/api/notifications/${id}/read`),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const unreadCount = (notificationsQ.data ?? []).filter(
    (n) => n.readAt == null
  ).length;

  function signOut() {
    clearAuth();
    router.replace("/login");
  }

  return (
    <header className="sticky top-0 z-20 h-16 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="flex h-full items-center gap-3 px-4 md:px-6 lg:px-8">
        <button
          onClick={onMobileMenu}
          className="lg:hidden inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-accent"
          aria-label="Open menu"
        >
          <Menu className="h-[18px] w-[18px]" />
        </button>

        {/* Spacer fills the room search used to occupy; keeps the page header layout. */}
        <div className="flex-1" />

        <div className="ml-auto flex items-center gap-1">
          <button
            onClick={toggle}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Toggle theme"
            title="Toggle theme"
          >
            {theme === "dark" ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="relative inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Notifications"
              >
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
                    <span className="absolute inset-0 rounded-full bg-rose-500 opacity-75 animate-ping" />
                    <span className="relative h-2 w-2 rounded-full bg-rose-500 ring-2 ring-background" />
                  </span>
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 p-0">
              <DropdownMenuLabel className="px-3 pt-2.5">
                Notifications
                {unreadCount > 0 && (
                  <span className="ml-2 inline-flex items-center justify-center rounded-full bg-rose-500/15 text-rose-600 dark:text-rose-400 px-1.5 text-[10px] font-semibold tabular-nums">
                    {unreadCount}
                  </span>
                )}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <div className="max-h-80 overflow-y-auto p-1">
                {notificationsQ.isLoading ? (
                  <p className="px-3 py-6 text-center text-xs text-muted-foreground">
                    Loading…
                  </p>
                ) : (notificationsQ.data ?? []).length === 0 ? (
                  <p className="px-3 py-6 text-center text-xs text-muted-foreground">
                    No notifications.
                  </p>
                ) : (
                  (notificationsQ.data ?? []).map((n) => {
                    const unread = n.readAt == null;
                    return (
                      <button
                        key={n.id}
                        type="button"
                        onClick={() => unread && markRead.mutate(n.id)}
                        className="flex w-full items-start gap-3 rounded-sm p-2.5 text-left hover:bg-accent transition-colors"
                      >
                        <span
                          className={
                            unread
                              ? "mt-1 inline-block h-1.5 w-1.5 rounded-full bg-primary shrink-0"
                              : "mt-1 inline-block h-1.5 w-1.5 rounded-full bg-transparent shrink-0"
                          }
                        />
                        <span className="flex-1 min-w-0">
                          <span className="block text-sm">{n.message}</span>
                          <span className="text-xs text-muted-foreground">
                            {timeAgo(n.createdAt)}
                          </span>
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
              {unreadCount > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="m-1"
                    onSelect={() => {
                      // Naive client-side mark-all: hit each unread sequentially.
                      // The backend has no /mark-all endpoint yet.
                      (notificationsQ.data ?? [])
                        .filter((n) => n.readAt == null)
                        .forEach((n) => markRead.mutate(n.id));
                    }}
                  >
                    <Check className="h-4 w-4" /> Mark all as read
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="mx-1 h-6 w-px bg-border" />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="inline-flex h-9 items-center gap-2 rounded-md pl-1 pr-2 hover:bg-accent transition-colors">
                <Avatar
                  name={meQ.data?.fullName || email || "user"}
                  size="sm"
                  src={meQ.data?.avatarUrl ?? undefined}
                />
                <span className="hidden md:inline text-sm font-medium">
                  {email}
                </span>
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                Signed in{role ? ` · ${role}` : ""}
              </DropdownMenuLabel>
              <div className="px-2 pb-2 text-sm font-medium truncate">
                {email}
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => router.push("/admin/settings")}>
                <User className="h-4 w-4" /> Profile
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => router.push("/admin/settings")}>
                <SettingsIcon className="h-4 w-4" /> Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={signOut}
                className="text-destructive focus:text-destructive"
              >
                <LogOut className="h-4 w-4" /> Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
