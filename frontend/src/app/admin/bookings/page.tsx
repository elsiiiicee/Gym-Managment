"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  CalendarDays,
  CalendarX2,
  CheckCircle2,
  ChevronDown,
  Filter,
  Search,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { api, type AdminBooking } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PageHeader } from "@/components/admin/page-header";
import { cn } from "@/lib/utils";

type StatusFilter = "ALL" | "BOOKED" | "CANCELED";
type DateFilter = "ALL" | "TODAY" | "WEEK";

function formatBookingDate(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const sameDay = d.toDateString() === today.toDateString();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const isTomorrow = d.toDateString() === tomorrow.toDateString();
  const prefix = sameDay
    ? "Today"
    : isTomorrow
      ? "Tomorrow"
      : d.toLocaleDateString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
        });
  const time = d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
  return `${prefix} · ${time}`;
}

function BookingStatusBadge({ status }: { status: AdminBooking["status"] }) {
  if (status === "BOOKED") {
    return (
      <Badge variant="success">
        <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
        Booked
      </Badge>
    );
  }
  return (
    <Badge variant="destructive">
      <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-rose-500" />
      Cancelled
    </Badge>
  );
}

export default function BookingsPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "bookings"],
    queryFn: () => api.get<AdminBooking[]>("/api/admin/bookings"),
  });

  const [query, setQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>("ALL");
  const [dateFilter, setDateFilter] = React.useState<DateFilter>("ALL");

  const filtered = React.useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekEnd = new Date(today);
    weekEnd.setDate(weekEnd.getDate() + 7);
    return (data ?? []).filter((b) => {
      if (statusFilter !== "ALL" && b.status !== statusFilter) return false;
      if (dateFilter !== "ALL") {
        const d = new Date(b.startsAt);
        if (dateFilter === "TODAY" && d.toDateString() !== today.toDateString())
          return false;
        if (dateFilter === "WEEK" && (d < today || d > weekEnd)) return false;
      }
      if (query) {
        const q = query.toLowerCase();
        if (
          !b.memberName.toLowerCase().includes(q) &&
          !b.memberEmail.toLowerCase().includes(q) &&
          !b.className.toLowerCase().includes(q) &&
          !b.trainerName.toLowerCase().includes(q)
        )
          return false;
      }
      return true;
    });
  }, [data, query, statusFilter, dateFilter]);

  const totals = {
    booked: (data ?? []).filter((b) => b.status === "BOOKED").length,
    cancelled: (data ?? []).filter((b) => b.status === "CANCELED").length,
    total: (data ?? []).length,
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Bookings"
        description="Every reserved seat across the schedule. Filter by status or window."
      />

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Couldn't load bookings: {(error as Error).message}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 stagger">
        <SummaryStat
          label="Booked"
          value={totals.booked}
          icon={CheckCircle2}
          tint="bg-gradient-to-br from-emerald-500/10 via-transparent to-transparent"
          ring="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
        />
        <SummaryStat
          label="Cancelled"
          value={totals.cancelled}
          icon={XCircle}
          tint="bg-gradient-to-br from-rose-500/10 via-transparent to-transparent"
          ring="bg-rose-500/15 text-rose-600 dark:text-rose-400"
        />
        <SummaryStat
          label="Total"
          value={totals.total}
          icon={CalendarDays}
          tint="bg-gradient-to-br from-orange-500/10 via-transparent to-transparent"
          ring="bg-orange-500/15 text-orange-600 dark:text-orange-400"
        />
      </div>

      <div className="flex flex-col md:flex-row md:items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search member, class, trainer"
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4" />
                Status:&nbsp;
                <span className="font-semibold">
                  {statusFilter === "ALL"
                    ? "Any"
                    : statusFilter === "BOOKED"
                      ? "Booked"
                      : "Cancelled"}
                </span>
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onSelect={() => setStatusFilter("ALL")}>
                Any status
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => setStatusFilter("BOOKED")}>
                Booked
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setStatusFilter("CANCELED")}>
                Cancelled
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <CalendarDays className="h-4 w-4" />
                Date:&nbsp;
                <span className="font-semibold">
                  {dateFilter === "ALL"
                    ? "All"
                    : dateFilter === "TODAY"
                      ? "Today"
                      : "This week"}
                </span>
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onSelect={() => setDateFilter("ALL")}>
                All dates
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => setDateFilter("TODAY")}>
                Today
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setDateFilter("WEEK")}>
                This week
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={CalendarX2}
              title="No bookings match your filters"
              description="Try a different status, date, or search."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 border-b border-border">
                <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="font-medium py-3 px-5">Member</th>
                  <th className="font-medium py-3 px-5">Class</th>
                  <th className="font-medium py-3 px-5">Trainer</th>
                  <th className="font-medium py-3 px-5">Date</th>
                  <th className="font-medium py-3 px-5">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((b) => (
                  <tr
                    key={b.id}
                    className="border-b border-border last:border-0 hover:bg-muted/40 transition-colors"
                  >
                    <td className="py-3 px-5">
                      <div className="flex items-center gap-3">
                        <Avatar name={b.memberName} size="sm" />
                        <div className="min-w-0">
                          <div className="font-medium">{b.memberName}</div>
                          <div className="text-xs text-muted-foreground truncate">
                            {b.memberEmail}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-5">{b.className}</td>
                    <td className="py-3 px-5 text-muted-foreground">
                      {b.trainerName}
                    </td>
                    <td className="py-3 px-5 text-muted-foreground tabular-nums">
                      {formatBookingDate(b.startsAt)}
                    </td>
                    <td className="py-3 px-5">
                      <BookingStatusBadge status={b.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

function SummaryStat({
  label,
  value,
  icon: Icon,
  tint,
  ring,
}: {
  label: string;
  value: number;
  icon: LucideIcon;
  tint: string;
  ring: string;
}) {
  return (
    <Card className="relative overflow-hidden">
      <div className={cn("pointer-events-none absolute inset-0", tint)} />
      <div className="relative p-5 flex items-center gap-4">
        <span
          className={cn(
            "flex h-11 w-11 items-center justify-center rounded-md",
            ring
          )}
        >
          <Icon className="h-[18px] w-[18px]" />
        </span>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </p>
          <p className="text-2xl font-semibold tracking-tight tabular-nums">
            {value}
          </p>
        </div>
      </div>
    </Card>
  );
}
