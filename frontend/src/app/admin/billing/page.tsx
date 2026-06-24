"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowDownLeft,
  ArrowDownRight,
  ArrowUpRight,
  Plus,
  Receipt,
  Search,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import {
  api,
  type RecentTxn,
  type WalletSummary,
} from "@/lib/api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar } from "@/components/ui/avatar";
import { TiltCard } from "@/components/ui/tilt-card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/admin/page-header";
import {
  AddCreditDialog,
  type AddCreditMember,
} from "@/components/admin/add-credit-dialog";
import { cn } from "@/lib/utils";

function txnLabel(t: RecentTxn): string {
  if (t.notes && t.notes.trim().length > 0) return t.notes;
  switch (t.transactionType) {
    case "CREDIT_ADD":
      return "Credit added";
    case "REFUND":
      return "Refund";
    case "ADMIN_ADJUSTMENT":
      return "Admin adjustment";
    case "PURCHASE":
      return "Purchase";
    case "MEMBERSHIP_PAYMENT":
      return "Membership payment";
  }
}

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const sec = Math.floor(ms / 1000);
  if (sec < 60) return "Just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  return new Date(iso).toLocaleDateString();
}

export default function BillingPage() {
  const walletsQ = useQuery({
    queryKey: ["admin", "wallets"],
    queryFn: () => api.get<WalletSummary[]>("/api/admin/wallets"),
  });
  const txnsQ = useQuery({
    queryKey: ["admin", "wallets", "recent"],
    queryFn: () =>
      api.get<RecentTxn[]>("/api/admin/wallets/transactions/recent?limit=20"),
  });

  const [topUpTarget, setTopUpTarget] = React.useState<AddCreditMember | null>(
    null
  );
  const [query, setQuery] = React.useState("");

  const wallets = walletsQ.data ?? [];
  const totalCreditCents = wallets.reduce((a, b) => a + b.balanceCents, 0);
  const membersWithCredit = wallets.filter((w) => w.balanceCents > 0).length;

  const topUpsThisMonthCents = React.useMemo(() => {
    const now = new Date();
    return (txnsQ.data ?? [])
      .filter((t) => {
        if (t.amountCents <= 0) return false;
        const d = new Date(t.createdAt);
        return (
          d.getFullYear() === now.getFullYear() &&
          d.getMonth() === now.getMonth()
        );
      })
      .reduce((a, t) => a + t.amountCents, 0);
  }, [txnsQ.data]);

  const filteredBalances = wallets.filter(
    (m) => !query || m.memberName.toLowerCase().includes(query.toLowerCase())
  );

  const summary: Array<{
    label: string;
    value: string;
    delta: string;
    positive: boolean;
    icon: LucideIcon;
    hue: number;
  }> = [
    {
      label: "Credits on file",
      value: `$${(totalCreditCents / 100).toLocaleString(undefined, {
        maximumFractionDigits: 0,
      })}`,
      delta: `${membersWithCredit} member${membersWithCredit === 1 ? "" : "s"}`,
      positive: true,
      icon: Wallet,
      hue: 173,
    },
    {
      label: "Top-ups this month",
      value: `$${(topUpsThisMonthCents / 100).toLocaleString(undefined, {
        maximumFractionDigits: 0,
      })}`,
      delta: "Across all members",
      positive: true,
      icon: ArrowUpRight,
      hue: 32,
    },
    {
      label: "Recent transactions",
      value: String(txnsQ.data?.length ?? 0),
      delta: "Last 20 entries",
      positive: true,
      icon: Receipt,
      hue: 244,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Billing"
        description="Member wallet balances and recent credit activity."
        actions={
          wallets.length > 0 ? (
            <Button
              onClick={() =>
                setTopUpTarget({
                  id: wallets[0].userId,
                  name: wallets[0].memberName,
                  balance: wallets[0].balanceCents / 100,
                })
              }
            >
              <Plus className="h-4 w-4" />
              Add credit
            </Button>
          ) : null
        }
      />

      {(walletsQ.isError || txnsQ.isError) && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Couldn't load billing data:{" "}
          {(walletsQ.error as Error)?.message ??
            (txnsQ.error as Error)?.message}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 stagger">
        {summary.map((s, i) => {
          const Icon = s.icon;
          return (
            <TiltCard key={i} max={4} className="rounded-xl">
              <Card className="relative overflow-hidden lift hover:border-primary/30">
                <div
                  className="pointer-events-none absolute inset-0 living-tint"
                  style={{ ["--tint-hue" as string]: s.hue }}
                />
                <div className="relative p-5 flex items-start justify-between">
                  <div>
                    <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                      {s.label}
                    </div>
                    <div className="mt-1 text-3xl font-semibold tracking-tight tabular-nums">
                      {walletsQ.isLoading || txnsQ.isLoading ? (
                        <Skeleton className="h-9 w-24" />
                      ) : (
                        s.value
                      )}
                    </div>
                    <div
                      className={cn(
                        "mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium tabular-nums",
                        s.positive
                          ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                          : "bg-rose-500/15 text-rose-700 dark:text-rose-400"
                      )}
                    >
                      {s.positive ? (
                        <ArrowUpRight className="h-3 w-3" />
                      ) : (
                        <ArrowDownRight className="h-3 w-3" />
                      )}
                      {s.delta}
                    </div>
                  </div>
                  <span
                    className="flex h-10 w-10 items-center justify-center rounded-lg text-white ring-1 ring-white/15"
                    style={{
                      background: `linear-gradient(135deg, hsl(${s.hue} 75% 58%), hsl(${
                        s.hue + 30
                      } 70% 55%))`,
                    }}
                  >
                    <Icon className="h-[18px] w-[18px]" />
                  </span>
                </div>
              </Card>
            </TiltCard>
          );
        })}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Card className="xl:col-span-2 overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle>Member wallet balances</CardTitle>
              <CardDescription>Top up any member's credit</CardDescription>
            </div>
            <div className="relative w-56">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search member"
                className="pl-9 h-9"
              />
            </div>
          </CardHeader>
          {walletsQ.isLoading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filteredBalances.length === 0 ? (
            <div className="p-6">
              <EmptyState
                icon={Wallet}
                title={
                  wallets.length === 0
                    ? "No wallets yet"
                    : "No wallets match your search"
                }
                description={
                  wallets.length === 0
                    ? "Wallets are created on first credit top-up or purchase."
                    : "Try a different name."
                }
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 border-y border-border">
                  <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="font-medium py-2.5 px-5">Member</th>
                    <th className="font-medium py-2.5 px-5 text-right">
                      Balance
                    </th>
                    <th className="font-medium py-2.5 px-5">Last activity</th>
                    <th className="font-medium py-2.5 px-5 w-32"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBalances.map((m) => {
                    const dollars = m.balanceCents / 100;
                    const empty = m.balanceCents === 0;
                    return (
                      <tr
                        key={m.userId}
                        className="border-b border-border last:border-0 hover:bg-muted/40 transition-colors"
                      >
                        <td className="py-3 px-5">
                          <div className="flex items-center gap-3">
                            <Avatar name={m.memberName} size="sm" />
                            <div className="min-w-0">
                              <div className="font-medium">{m.memberName}</div>
                              <div className="text-xs text-muted-foreground truncate">
                                {m.memberEmail}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-5 text-right">
                          <span
                            className={cn(
                              "font-semibold tabular-nums",
                              empty && "text-muted-foreground"
                            )}
                          >
                            ${dollars.toFixed(2)}
                          </span>
                        </td>
                        <td className="py-3 px-5 text-muted-foreground tabular-nums">
                          {timeAgo(m.updatedAt)}
                        </td>
                        <td className="py-3 px-5 text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              setTopUpTarget({
                                id: m.userId,
                                name: m.memberName,
                                balance: dollars,
                              })
                            }
                          >
                            <Plus className="h-3 w-3" />
                            Top up
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle>Recent transactions</CardTitle>
              <CardDescription>Wallet activity, last 20</CardDescription>
            </div>
            <span className="live-dot" />
          </CardHeader>
          <CardContent className="pt-1">
            {txnsQ.isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : (txnsQ.data ?? []).length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No transactions yet.
              </p>
            ) : (
              <div className="flex flex-col gap-1">
                {(txnsQ.data ?? []).map((t) => {
                  const positive = t.amountCents > 0;
                  return (
                    <div
                      key={t.transactionId}
                      className="flex items-center gap-3 rounded-md px-2 py-2.5 -mx-2 transition-colors hover:bg-accent/40"
                    >
                      <span
                        className={cn(
                          "flex h-9 w-9 items-center justify-center rounded-lg shrink-0",
                          positive
                            ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                            : "bg-muted text-muted-foreground"
                        )}
                      >
                        {positive ? (
                          <ArrowDownLeft className="h-3.5 w-3.5" />
                        ) : (
                          <ArrowUpRight className="h-3.5 w-3.5" />
                        )}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm leading-tight truncate">
                          <strong className="font-semibold">
                            {t.memberName}
                          </strong>
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {txnLabel(t)}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div
                          className={cn(
                            "text-sm font-semibold tabular-nums",
                            positive
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-foreground"
                          )}
                        >
                          {positive ? "+" : "−"}$
                          {Math.abs(t.amountCents / 100).toFixed(2)}
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          {timeAgo(t.createdAt)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <AddCreditDialog
        open={!!topUpTarget}
        onClose={() => setTopUpTarget(null)}
        member={topUpTarget}
      />
    </div>
  );
}
