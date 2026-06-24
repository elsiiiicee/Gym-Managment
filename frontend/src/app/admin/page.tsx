"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import {
  Users,
  CreditCard,
  CalendarCheck2,
  ArrowRight,
  UserPlus,
  Receipt,
  XCircle,
  Dumbbell,
  Download,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import { api, type AdminGymClass, type Analytics } from "@/lib/api";
import {
  ATTENDANCE_HEATMAP,
  BOOKINGS_SERIES,
  MOCK_ACTIVITY,
  PLAN_DISTRIBUTION,
  REVENUE_SERIES,
} from "@/lib/mocks";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { AreaChart, BarChart, RadialChart, Heatmap } from "@/components/charts";
import { KpiCard } from "@/components/admin/kpi-card";
import { PageHeader } from "@/components/admin/page-header";
import { cn } from "@/lib/utils";

function formatClassSchedule(startsAt: string, endsAt: string): string {
  const start = new Date(startsAt);
  const end = new Date(endsAt);
  const day = start.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  const startTime = start.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
  const endTime = end.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
  return `${day} · ${startTime}–${endTime}`;
}

export default function AdminDashboardPage() {
  const analyticsQ = useQuery({
    queryKey: ["admin", "analytics"],
    queryFn: () => api.get<Analytics>("/api/admin/analytics"),
  });
  const classesQ = useQuery({
    queryKey: ["admin", "classes"],
    queryFn: () => api.get<AdminGymClass[]>("/api/admin/classes"),
  });

  const analytics = analyticsQ.data;

  // Upcoming classes: active + start time in the future, soonest first, top 6.
  const upcoming = (classesQ.data ?? [])
    .filter((c) => c.active && new Date(c.startsAt) > new Date())
    .sort((a, b) => +new Date(a.startsAt) - +new Date(b.startsAt))
    .slice(0, 6);

  // Bookings today from the classes list: sum enrolled where class is today.
  const bookingsToday = (classesQ.data ?? [])
    .filter((c) => {
      const d = new Date(c.startsAt);
      const today = new Date();
      return d.toDateString() === today.toDateString();
    })
    .reduce((a, c) => a + c.enrolled, 0);

  const revenueKDollars =
    analytics != null ? +(analytics.revenueCents / 100_000).toFixed(1) : 0;

  const kpis: Array<{
    label: string;
    numericTarget: number;
    value: string;
    numericPrefix?: string;
    numericSuffix?: string;
    delta: string;
    deltaPositive: boolean;
    icon: LucideIcon;
    tintHue: number;
    sparkline: number[];
    sparklineColor: string;
  }> = [
    {
      label: "Total Members",
      numericTarget: analytics?.users ?? 0,
      value: (analytics?.users ?? 0).toLocaleString(),
      delta: "All users",
      deltaPositive: true,
      icon: Users,
      tintHue: 244,
      sparkline: [10, 12, 11, 14, 16, 15, 19, 22, 24],
      sparklineColor: "hsl(244 75% 57%)",
    },
    {
      label: "Active Subscriptions",
      numericTarget: analytics?.subscriptions ?? 0,
      value: (analytics?.subscriptions ?? 0).toLocaleString(),
      delta: "Current memberships",
      deltaPositive: true,
      icon: CreditCard,
      tintHue: 173,
      sparkline: [8, 9, 11, 10, 12, 13, 15, 16, 19],
      sparklineColor: "hsl(173 60% 45%)",
    },
    {
      label: "Total Revenue",
      numericTarget: revenueKDollars,
      numericPrefix: "$",
      numericSuffix: "k",
      value: `$${revenueKDollars.toFixed(1)}k`,
      delta: "Lifetime · all orders",
      deltaPositive: true,
      icon: Receipt,
      tintHue: 32,
      sparkline: [40, 42, 46, 49, 54, 58, 62, 74, 86],
      sparklineColor: "hsl(32 95% 60%)",
    },
    {
      label: "Bookings Today",
      numericTarget: bookingsToday,
      value: String(bookingsToday),
      delta: `${analytics?.bookings ?? 0} total`,
      deltaPositive: true,
      icon: CalendarCheck2,
      tintHue: 0,
      sparkline: [12, 18, 14, 22, 19, 24, 21, 18, 16],
      sparklineColor: "hsl(0 84% 60%)",
    },
  ];

  const totalActive = PLAN_DISTRIBUTION.reduce((a, s) => a + s.value, 0);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Dashboard"
        description="A pulse on members, revenue, and what's happening on the floor today."

      />

      {(analyticsQ.isError || classesQ.isError) && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Couldn't load dashboard data:{" "}
          {(analyticsQ.error as Error)?.message ??
            (classesQ.error as Error)?.message}
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 stagger">
        {kpis.map((k, i) => (
          <KpiCard key={i} {...k} />
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-start justify-between gap-4 pb-2">
            <div>
              <CardTitle>Revenue overview</CardTitle>
              <CardDescription>
                Last 12 months · sample data
              </CardDescription>
            </div>
            <Badge variant="success">
              <TrendingUp className="mr-1 h-3 w-3" />
              +12.6%
            </Badge>
          </CardHeader>
          <CardContent className="pt-2">
            <AreaChart data={REVENUE_SERIES} height={240} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Bookings this week</CardTitle>
            <CardDescription>Sample data by day</CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            <BarChart data={BOOKINGS_SERIES} height={240} />
          </CardContent>
        </Card>
      </div>

      {/* Plan distribution + Heatmap */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle>Plan distribution</CardTitle>
            <CardDescription>
              Sample data · hover a ring
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-2 flex flex-col items-center gap-4 md:flex-row md:items-center md:justify-around">
            <RadialChart
              series={PLAN_DISTRIBUTION}
              size={200}
              thickness={20}
              centerLabel="Active"
              centerValue={totalActive.toLocaleString()}
            />
            <div className="flex flex-col gap-3 min-w-[140px]">
              {PLAN_DISTRIBUTION.map((s) => {
                const pct = Math.round((s.value / totalActive) * 100);
                return (
                  <div key={s.label} className="flex items-center gap-2.5">
                    <span
                      className="h-2.5 w-2.5 rounded-sm"
                      style={{ background: s.color }}
                    />
                    <div className="flex-1 text-sm">
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-medium">{s.label}</span>
                        <span className="text-muted-foreground tabular-nums">
                          {pct}%
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground tabular-nums">
                        {s.value.toLocaleString()} members
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader className="flex flex-row items-start justify-between pb-2">
            <div>
              <CardTitle>Attendance heatmap</CardTitle>
              <CardDescription>
                Sample data by day & time block
              </CardDescription>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
              Low
              <span className="flex items-center gap-0.5">
                {[0.15, 0.32, 0.5, 0.7, 0.9].map((a, i) => (
                  <span
                    key={i}
                    className="h-3 w-3 rounded-sm"
                    style={{ background: `hsl(var(--chart-1) / ${a})` }}
                  />
                ))}
              </span>
              High
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            <Heatmap
              data={ATTENDANCE_HEATMAP.data}
              rowLabels={ATTENDANCE_HEATMAP.rows}
              colLabels={ATTENDANCE_HEATMAP.cols}
              valueLabel="sessions"
            />
          </CardContent>
        </Card>
      </div>

      {/* Activity + Quick actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="flex items-center gap-3">
              <span className="live-dot" />
              <div>
                <CardTitle>Live activity</CardTitle>
                <CardDescription>
                  Sample feed · live wiring lands with notifications
                </CardDescription>
              </div>
            </div>
            <Button variant="ghost" size="sm">
              View all <ArrowRight className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="pt-1">
            <div className="flex flex-col divide-y divide-border">
              {MOCK_ACTIVITY.map((a) => (
                <ActivityRow key={a.id} item={a} />
              ))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Quick actions</CardTitle>
            <CardDescription>The four things you do most</CardDescription>
          </CardHeader>
          <CardContent className="pt-1 flex flex-col gap-1">
            <QuickAction
              icon={UserPlus}
              label="Add member"
              href="/admin/users"
              tint="bg-orange-500/15 text-orange-600 dark:text-orange-400"
            />
            <QuickAction
              icon={Dumbbell}
              label="Schedule class"
              href="/admin/classes"
              tint="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
            />
            <QuickAction
              icon={CreditCard}
              label="Create plan"
              href="/admin/memberships"
              tint="bg-amber-500/15 text-amber-600 dark:text-amber-400"
            />
            <QuickAction
              icon={CalendarCheck2}
              label="Review bookings"
              href="/admin/bookings"
              tint="bg-rose-500/15 text-rose-600 dark:text-rose-400"
            />
          </CardContent>
        </Card>
      </div>

      {/* Upcoming classes */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle>Upcoming classes</CardTitle>
            <CardDescription>The next sessions on the schedule</CardDescription>
          </div>
          <Link
            href="/admin/classes"
            className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            All classes <ArrowRight className="h-3 w-3" />
          </Link>
        </CardHeader>
        <CardContent>
          {upcoming.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No upcoming classes on the schedule.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 stagger">
              {upcoming.map((c) => (
                <UpcomingClassCard key={c.id} cls={c} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ActivityRow({
  item,
}: {
  item: {
    id: string;
    who: string;
    what: string;
    when: string;
    type: "booking" | "signup" | "payment" | "cancel";
  };
}) {
  const cfg = {
    booking: {
      icon: CalendarCheck2,
      tint: "bg-orange-500/15 text-orange-600 dark:text-orange-400",
    },
    signup: {
      icon: UserPlus,
      tint: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
    },
    payment: {
      icon: Receipt,
      tint: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
    },
    cancel: {
      icon: XCircle,
      tint: "bg-rose-500/15 text-rose-600 dark:text-rose-400",
    },
  }[item.type];
  const Icon = cfg.icon;
  return (
    <div className="flex items-center gap-3 rounded-md px-2 py-2.5 -mx-2 transition-colors hover:bg-accent/50">
      <span
        className={cn(
          "flex h-9 w-9 items-center justify-center rounded-md shrink-0",
          cfg.tint
        )}
      >
        <Icon className="h-3.5 w-3.5" />
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm leading-tight">
          <strong className="font-semibold">{item.who}</strong>{" "}
          <span className="text-muted-foreground">{item.what}</span>
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">{item.when}</p>
      </div>
      <Avatar name={item.who} size="sm" />
    </div>
  );
}

function QuickAction({
  icon: Icon,
  label,
  href,
  tint,
}: {
  icon: LucideIcon;
  label: string;
  href: string;
  tint: string;
}) {
  return (
    <Link
      href={href}
      className="group flex w-full items-center gap-3 rounded-md border border-transparent px-3 py-2.5 text-left transition-all hover:border-border hover:bg-accent/40"
    >
      <span
        className={cn(
          "flex h-9 w-9 items-center justify-center rounded-md shrink-0",
          tint
        )}
      >
        <Icon className="h-3.5 w-3.5" />
      </span>
      <span className="flex-1 text-sm font-medium">{label}</span>
      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
    </Link>
  );
}

function UpcomingClassCard({ cls }: { cls: AdminGymClass }) {
  const pct = Math.round((cls.enrolled / cls.capacity) * 100);
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-background p-4 transition-all hover:-translate-y-0.5 hover:shadow-sm">
      <div className="flex items-center justify-between">
        {cls.category ? (
          <Badge variant="secondary">{cls.category}</Badge>
        ) : (
          <span />
        )}
        <span className="text-xs text-muted-foreground tabular-nums">
          {cls.durationMin} min
        </span>
      </div>
      <h4 className="text-base font-semibold tracking-tight">{cls.title}</h4>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Avatar name={cls.trainerName} size="sm" />
        <div>
          <p className="font-medium text-foreground">{cls.trainerName}</p>
          <p>{formatClassSchedule(cls.startsAt, cls.endsAt)}</p>
        </div>
      </div>
      <div>
        <div className="mb-1.5 flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Enrolled</span>
          <span className="font-medium tabular-nums">
            {cls.enrolled}
            <span className="text-muted-foreground">/{cls.capacity}</span>
          </span>
        </div>
        <Progress
          value={pct}
          colorClass={pct >= 90 ? "bg-amber-500" : "bg-primary"}
        />
      </div>
    </div>
  );
}
