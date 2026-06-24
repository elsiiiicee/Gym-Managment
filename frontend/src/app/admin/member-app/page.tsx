"use client";

import * as React from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Bell,
  CalendarCheck2,
  Dumbbell,
  Mail,
  MoreHorizontal,
  Receipt,
  ScanLine,
  Shield,
  User,
  UserCog,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { IOSDevice } from "@/components/ios-frame";
import { QrCode } from "@/components/brand/qr-code";
import { LegionMark } from "@/components/brand/legion-mark";
import {
  MEMBER_APP_CLASSES,
  MEMBER_BOOKINGS,
  MEMBER_CATEGORIES,
  MEMBER_ME,
  MEMBER_TXNS,
} from "@/lib/mocks";
import { PageHeader } from "@/components/admin/page-header";
import { cn } from "@/lib/utils";

type Tab = "pass" | "wallet" | "classes" | "profile";

const TABS: Array<{ key: Tab; label: string; icon: LucideIcon }> = [
  { key: "pass", label: "Pass", icon: ScanLine },
  { key: "wallet", label: "Wallet", icon: Wallet },
  { key: "classes", label: "Classes", icon: Dumbbell },
  { key: "profile", label: "Profile", icon: User },
];

export default function MemberAppPage() {
  const [tab, setTab] = React.useState<Tab>("pass");

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Member app"
        description="Preview · the iOS member experience is a static mockup. The real client app ships later."
        actions={
          <div className="inline-flex items-center gap-1 rounded-md bg-muted p-1">
            {TABS.map((t) => {
              const Icon = t.icon;
              const active = tab === t.key;
              return (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium transition-all",
                    active
                      ? "bg-background shadow-sm text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Icon className="h-3 w-3" />
                  {t.label}
                </button>
              );
            })}
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
        <div className="lg:col-span-3 flex justify-center py-4">
          <div
            style={{
              filter:
                "drop-shadow(0 30px 60px rgba(0,0,0,.25)) drop-shadow(0 0 80px hsl(244 75% 60% / .25))",
            }}
          >
            <IOSDevice width={360} height={780} dark>
              <MobileScreen>
                <div className="flex-1 overflow-hidden flex flex-col">
                  {tab === "pass" && <PassScreen />}
                  {tab === "wallet" && <WalletScreen />}
                  {tab === "classes" && <ClassesScreen />}
                  {tab === "profile" && <ProfileScreen />}
                </div>
                <TabBar tab={tab} onTab={setTab} />
              </MobileScreen>
            </IOSDevice>
          </div>
        </div>

        <div className="lg:col-span-2 flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ScanLine className="h-4 w-4 text-primary" /> Door pass
              </CardTitle>
              <CardDescription>How members get in</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-3">
              <p style={{ textWrap: "pretty" } as React.CSSProperties}>
                Each member's pass is a unique, rotating code tied to their
                account. Hold the phone up to the door reader — the QR is signed
                and expires every 60 seconds, so screenshots don't work.
              </p>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-md border border-border p-2.5">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Rotates
                  </div>
                  <div className="text-sm font-semibold text-foreground">
                    Every 60s
                  </div>
                </div>
                <div className="rounded-md border border-border p-2.5">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Offline
                  </div>
                  <div className="text-sm font-semibold text-foreground">
                    Yes — cached
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-4 w-4 text-primary" /> Credit wallet
              </CardTitle>
              <CardDescription>How payment works</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              <p style={{ textWrap: "pretty" } as React.CSSProperties}>
                Members don't pay at the counter. Admin tops up their wallet
                from <strong className="text-foreground">Billing</strong>, and
                credit covers drop-ins, retail, recovery, or anything else the
                gym sells.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCog className="h-4 w-4 text-primary" /> Admin-managed
                accounts
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              <p style={{ textWrap: "pretty" } as React.CSSProperties}>
                There is no self-signup. Members are created by the gym admin
                from the{" "}
                <strong className="text-foreground">Members</strong> page —
                Legion sends a welcome email with a one-time link to set a
                password.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------- mobile chrome

function MobileScreen({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="absolute inset-0 flex flex-col"
      style={{
        background:
          "linear-gradient(180deg, #0a0a13 0%, #1a1230 40%, #0a0a13 100%)",
        color: "#fff",
      }}
    >
      <div className="pointer-events-none absolute -top-24 -left-20 h-72 w-72 rounded-full bg-orange-500/30 blur-3xl" />
      <div className="pointer-events-none absolute top-1/3 -right-24 h-80 w-80 rounded-full bg-pink-500/25 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 left-1/4 h-72 w-72 rounded-full bg-amber-500/30 blur-3xl" />
      <div className="relative z-10 flex-1 flex flex-col overflow-hidden">
        {children}
      </div>
    </div>
  );
}

function MobileHeader({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex items-end justify-between px-6 pt-3 pb-4">
      <div>
        <div className="text-[11px] uppercase tracking-[0.18em] text-white/50">
          {subtitle}
        </div>
        <div className="text-2xl font-semibold tracking-tight">{title}</div>
      </div>
      {right}
    </div>
  );
}

function TabBar({ tab, onTab }: { tab: Tab; onTab: (t: Tab) => void }) {
  return (
    <div className="px-3 pb-6 pt-2">
      <div className="rounded-3xl bg-white/10 backdrop-blur-xl border border-white/15 px-2 py-2 flex items-center justify-around shadow-2xl">
        {TABS.map((it) => {
          const Icon = it.icon;
          const active = tab === it.key;
          return (
            <button
              key={it.key}
              onClick={() => onTab(it.key)}
              className={cn(
                "relative flex flex-col items-center justify-center gap-0.5 px-3 py-1.5 rounded-2xl transition-all",
                active ? "text-white" : "text-white/55 hover:text-white/80"
              )}
            >
              {active && (
                <span className="absolute inset-0 rounded-2xl bg-white/15 ring-1 ring-white/15 -z-0 animate-fade-in" />
              )}
              <span className="relative z-10">
                <Icon className="h-[18px] w-[18px]" />
              </span>
              <span className="relative z-10 text-[10px] font-medium tracking-wide">
                {it.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ----------------------------------------------------- screens

function PassScreen() {
  const [unlocked, setUnlocked] = React.useState(false);
  React.useEffect(() => {
    const t = setTimeout(() => setUnlocked(true), 600);
    return () => clearTimeout(t);
  }, []);
  return (
    <>
      <MobileHeader
        title="Door pass"
        subtitle="Legion · Downtown"
        right={
          <button className="h-9 w-9 rounded-full bg-white/10 border border-white/15 flex items-center justify-center backdrop-blur-md">
            <Bell className="h-[15px] w-[15px]" />
          </button>
        }
      />
      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-2">
        <div
          className="relative w-full max-w-[280px] rounded-[28px] p-5 shadow-2xl ring-1 ring-white/10 overflow-hidden animate-fade-up"
          style={{
            background: "linear-gradient(180deg, #ffffff 0%, #f3f3f8 100%)",
            color: "#0a0a13",
          }}
        >
          <div className="absolute inset-x-0 top-0 h-2 bg-gradient-to-r from-orange-500 via-amber-500 to-pink-500" />
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <LegionMark size={22} />
              <span className="text-[11px] font-extrabold tracking-tight">
                Legion
              </span>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 text-emerald-700 px-2 py-0.5 text-[10px] font-medium">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Active
            </span>
          </div>
          <div className="mt-3">
            <div className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">
              Member
            </div>
            <div className="text-base font-semibold tracking-tight">
              {MEMBER_ME.fullName}
            </div>
            <div className="text-[11px] text-zinc-500">
              {MEMBER_ME.plan} · since{" "}
              {new Date(MEMBER_ME.joined).toLocaleDateString("en-US", {
                month: "short",
                year: "numeric",
              })}
            </div>
          </div>
          <div className="mt-3 flex items-center justify-center rounded-2xl bg-white p-3 ring-1 ring-zinc-200">
            <QrCode value={MEMBER_ME.passCode} size={180} fg="#0a0a13" bg="#ffffff" />
          </div>
          <div className="mt-3 flex items-center justify-between text-[10px] tabular-nums">
            <span className="text-zinc-500">PASS ID</span>
            <span className="font-mono">{MEMBER_ME.passCode}</span>
          </div>
          <div className="my-3 flex items-center gap-1 -mx-5 px-5">
            <div
              className="h-3 w-3 rounded-full bg-[#0a0a13]"
              style={{ marginLeft: -26 }}
            />
            <div className="flex-1 border-t border-dashed border-zinc-300" />
            <div
              className="h-3 w-3 rounded-full bg-[#0a0a13]"
              style={{ marginRight: -26 }}
            />
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            {[
              { l: "Credit", v: `$${MEMBER_ME.creditBalance.toFixed(2)}` },
              { l: "Visits", v: MEMBER_ME.visitsThisMonth },
              { l: "Renews", v: "Jun 4" },
            ].map((s, i) => (
              <div key={i}>
                <div className="text-[9px] uppercase tracking-wider text-zinc-500">
                  {s.l}
                </div>
                <div className="text-sm font-semibold tabular-nums">{s.v}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-5 flex items-center gap-2 text-white/70 text-[12px]">
          <ScanLine className="h-3.5 w-3.5" />
          {unlocked ? "Hold near the door scanner" : "Verifying…"}
        </div>
      </div>
    </>
  );
}

function WalletScreen() {
  return (
    <>
      <MobileHeader
        title="Wallet"
        subtitle="Credit & history"
        right={
          <button className="h-9 w-9 rounded-full bg-white/10 border border-white/15 flex items-center justify-center backdrop-blur-md">
            <MoreHorizontal className="h-[15px] w-[15px]" />
          </button>
        }
      />
      <div className="px-6 pb-4">
        <div className="rounded-2xl p-5 ring-1 ring-white/15 backdrop-blur-md bg-white/5 relative overflow-hidden">
          <div className="absolute inset-0 conic-mesh opacity-40" />
          <div className="relative">
            <div className="text-[11px] uppercase tracking-[0.2em] text-white/55">
              Available credit
            </div>
            <div className="mt-1 text-4xl font-semibold tracking-tight tabular-nums">
              ${MEMBER_ME.creditBalance.toFixed(2)}
            </div>
            <div className="mt-1 text-[11px] text-white/55">
              Topped up by your gym · use for classes, retail, recovery
            </div>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button className="rounded-xl bg-white/10 border border-white/15 backdrop-blur-md py-2.5 text-sm font-medium flex items-center justify-center gap-2">
            <Receipt className="h-3.5 w-3.5" />
            History
          </button>
          <button className="rounded-xl bg-white text-zinc-900 py-2.5 text-sm font-medium flex items-center justify-center gap-2 hover:opacity-90">
            <Mail className="h-3.5 w-3.5" />
            Request top-up
          </button>
        </div>
      </div>
      <div className="px-6 pb-2 flex items-center justify-between">
        <div className="text-[11px] uppercase tracking-[0.18em] text-white/45">
          Recent activity
        </div>
        <button className="text-[11px] text-white/60">See all</button>
      </div>
      <div className="flex-1 overflow-y-auto px-6 pb-2">
        <div className="flex flex-col gap-1.5">
          {MEMBER_TXNS.map((t) => {
            const positive = t.amount > 0;
            return (
              <div
                key={t.id}
                className="flex items-center gap-3 rounded-xl bg-white/5 ring-1 ring-white/10 px-3 py-2.5"
              >
                <span
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-lg",
                    positive
                      ? "bg-emerald-500/20 text-emerald-300"
                      : "bg-white/10 text-white/70"
                  )}
                >
                  {positive ? (
                    <ArrowDownLeft className="h-3.5 w-3.5" />
                  ) : (
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  )}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm leading-tight truncate">{t.label}</div>
                  <div className="text-[11px] text-white/45">{t.when}</div>
                </div>
                <div
                  className={cn(
                    "text-sm font-semibold tabular-nums",
                    positive ? "text-emerald-300" : "text-white/90"
                  )}
                >
                  {positive ? "+" : "−"}${Math.abs(t.amount).toFixed(2)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

function ClassesScreen() {
  return (
    <>
      <MobileHeader title="Classes" subtitle="This week" />
      <div className="px-6 pb-2 flex items-center gap-2">
        {["All", "HIIT", "Yoga", "Strength"].map((c, i) => (
          <button
            key={c}
            className={cn(
              "rounded-full px-3 py-1.5 text-[12px] font-medium border border-white/15",
              i === 0 ? "bg-white text-zinc-900" : "bg-white/5 text-white/80"
            )}
          >
            {c}
          </button>
        ))}
      </div>
      <div className="px-6 pb-2 flex-1 overflow-y-auto">
        <div className="flex flex-col gap-3 pb-2">
          {MEMBER_APP_CLASSES.slice(0, 5).map((c) => {
            const cat =
              MEMBER_CATEGORIES.find((x) => x.key === c.category) ||
              MEMBER_CATEGORIES[0];
            return (
              <div
                key={c.id}
                className="relative rounded-2xl overflow-hidden ring-1 ring-white/10 backdrop-blur-md"
              >
                <div
                  className="absolute inset-0"
                  style={{
                    background: `linear-gradient(135deg, hsl(${cat.hueA} 80% 55%), hsl(${cat.hueB} 75% 50%))`,
                    opacity: 0.4,
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-r from-zinc-900/60 to-transparent" />
                <div className="relative p-4 flex items-center gap-3">
                  <div
                    className="h-14 w-14 rounded-xl ring-1 ring-white/20 flex flex-col items-center justify-center shrink-0"
                    style={{
                      background: `linear-gradient(135deg, hsl(${cat.hueA} 80% 55%), hsl(${cat.hueB} 75% 50%))`,
                    }}
                  >
                    <span className="text-[9px] uppercase tracking-wider text-white/70">
                      {c.schedule.split("·")[1]?.trim().split(" ")[0] || ""}
                    </span>
                    <span className="text-base font-semibold tabular-nums leading-tight">
                      {c.durationMin}
                      <span className="text-[9px]">m</span>
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] uppercase tracking-wider text-white/55">
                      {c.category}
                    </div>
                    <div className="text-sm font-semibold leading-tight truncate">
                      {c.name}
                    </div>
                    <div className="mt-0.5 text-[11px] text-white/60 truncate">
                      {c.trainerName} · {c.enrolled}/{c.capacity}
                    </div>
                  </div>
                  <button className="rounded-full bg-white text-zinc-900 px-3 py-1.5 text-[12px] font-medium">
                    Book
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

function ProfileScreen() {
  return (
    <>
      <MobileHeader title="Profile" subtitle="Member · Legion" />
      <div className="px-6 pb-3 flex flex-col items-center gap-3 text-center">
        <Avatar
          name={MEMBER_ME.fullName}
          size="xl"
          className="ring-4 ring-white/15"
        />
        <div>
          <div className="text-lg font-semibold tracking-tight">
            {MEMBER_ME.fullName}
          </div>
          <div className="text-[12px] text-white/60">{MEMBER_ME.email}</div>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-white/10 border border-white/15 px-2.5 py-0.5 text-[10px] font-medium">
          <Shield className="h-3 w-3" />
          {MEMBER_ME.plan} · Active
        </span>
      </div>
      <div className="px-6 pb-2">
        <div className="grid grid-cols-3 gap-2">
          {[
            { l: "Visits / mo", v: MEMBER_ME.visitsThisMonth },
            { l: "Credit", v: `$${MEMBER_ME.creditBalance.toFixed(0)}` },
            { l: "Renews", v: "Jun 4" },
          ].map((s, i) => (
            <div
              key={i}
              className="rounded-xl bg-white/5 ring-1 ring-white/10 p-3 text-center"
            >
              <div className="text-[9px] uppercase tracking-wider text-white/50">
                {s.l}
              </div>
              <div className="text-sm font-semibold tabular-nums mt-0.5">
                {s.v}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="px-6 pb-2 flex-1 overflow-y-auto">
        <div className="text-[11px] uppercase tracking-[0.18em] text-white/45 mt-3 mb-2">
          Upcoming
        </div>
        <div className="flex flex-col gap-1.5">
          {MEMBER_BOOKINGS.map((b) => (
            <div
              key={b.id}
              className="flex items-center gap-3 rounded-xl bg-white/5 ring-1 ring-white/10 px-3 py-2.5"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10">
                <CalendarCheck2 className="h-3.5 w-3.5" />
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-sm leading-tight truncate">{b.name}</div>
                <div className="text-[11px] text-white/55">
                  {b.trainer} · {b.when}
                </div>
              </div>
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[10px] font-medium",
                  b.status === "CONFIRMED"
                    ? "bg-emerald-500/20 text-emerald-300"
                    : "bg-amber-500/20 text-amber-300"
                )}
              >
                {b.status === "CONFIRMED" ? "Confirmed" : "Pending"}
              </span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
