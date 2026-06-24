"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  CalendarCheck2,
  CreditCard,
  Receipt,
  Wallet,
} from "lucide-react";
import {
  api,
  type MemberBooking,
  type MyProfile,
  type MySubscription,
  type MyWallet,
  type MyWalletTxn,
} from "@/lib/api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function txnLabel(t: MyWalletTxn): string {
  if (t.notes && t.notes.trim().length > 0) return t.notes;
  switch (t.transactionType) {
    case "CREDIT_ADD":
      return "Credit added by your gym";
    case "REFUND":
      return "Refund";
    case "ADMIN_ADJUSTMENT":
      return "Adjustment";
    case "PURCHASE":
      return "Purchase";
    case "MEMBERSHIP_PAYMENT":
      return "Membership payment";
  }
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

function formatClassTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function MeHomePage() {
  const meQ = useQuery({
    queryKey: ["me", "profile"],
    queryFn: () => api.get<MyProfile>("/api/users/me"),
  });
  const walletQ = useQuery({
    queryKey: ["me", "wallet"],
    queryFn: () => api.get<MyWallet>("/api/wallet"),
  });
  const txnsQ = useQuery({
    queryKey: ["me", "wallet", "txns"],
    queryFn: () => api.get<MyWalletTxn[]>("/api/wallet/transactions"),
  });
  const subsQ = useQuery({
    queryKey: ["me", "subscriptions"],
    queryFn: () => api.get<MySubscription[]>("/api/subscriptions"),
  });
  const bookingsQ = useQuery({
    queryKey: ["me", "bookings"],
    queryFn: () => api.get<MemberBooking[]>("/api/bookings"),
  });

  const activeSub = (subsQ.data ?? []).find((s) => s.status === "ACTIVE");
  const upcomingBookings = (bookingsQ.data ?? [])
    .filter(
      (b) => b.status === "BOOKED" && new Date(b.startsAt).getTime() > Date.now()
    )
    .sort((a, b) => +new Date(a.startsAt) - +new Date(b.startsAt))
    .slice(0, 3);

  const balanceCents = walletQ.data?.balanceCents ?? 0;
  const balance = (balanceCents / 100).toFixed(2);

  return (
    <div className="flex flex-col gap-6">
      {/* Hero */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          {meQ.isLoading ? (
            <Skeleton className="h-12 w-12 rounded-full" />
          ) : (
            <Avatar
              name={meQ.data?.fullName || meQ.data?.email || "Member"}
              size="lg"
              src={meQ.data?.avatarUrl ?? undefined}
            />
          )}
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              Welcome back
            </p>
            <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
              {meQ.isLoading ? (
                <Skeleton className="h-8 w-40" />
              ) : (
                meQ.data?.fullName || "Member"
              )}
            </h1>
          </div>
        </div>
      </div>

      {/* Top row: wallet + plan */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card className="relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/15 via-primary/5 to-transparent" />
          <CardContent className="relative p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wider text-muted-foreground">
                  <Wallet className="h-3.5 w-3.5" />
                  Your credit
                </p>
                {walletQ.isLoading ? (
                  <Skeleton className="mt-2 h-10 w-32" />
                ) : (
                  <p className="mt-2 text-4xl font-semibold tracking-tight tabular-nums">
                    ${balance}
                  </p>
                )}
                <p className="mt-1 text-xs text-muted-foreground">
                  Topped up by your gym. Spend on plans &amp; classes.
                </p>
              </div>
              <span className="grid h-11 w-11 place-items-center rounded-lg bg-primary/15 text-primary">
                <Wallet className="h-5 w-5" />
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-emerald-500/15 via-emerald-500/5 to-transparent" />
          <CardContent className="relative p-6">
            <div className="flex items-start justify-between">
              <div className="min-w-0">
                <p className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wider text-muted-foreground">
                  <CreditCard className="h-3.5 w-3.5" />
                  Current plan
                </p>
                {subsQ.isLoading ? (
                  <Skeleton className="mt-2 h-10 w-40" />
                ) : activeSub ? (
                  <>
                    <p className="mt-2 text-2xl font-semibold tracking-tight">
                      {activeSub.planName}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Renews{" "}
                      {new Date(activeSub.endsAt).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="mt-2 text-lg font-medium text-muted-foreground">
                      No active plan
                    </p>
                    <Link
                      href="/me/plans"
                      className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                    >
                      Browse plans <ArrowRight className="h-3 w-3" />
                    </Link>
                  </>
                )}
              </div>
              <span className="grid h-11 w-11 place-items-center rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                <CreditCard className="h-5 w-5" />
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Link
          href="/me/plans"
          className="group flex items-center justify-between rounded-lg border bg-card p-4 transition hover:border-primary/40 hover:shadow-sm"
        >
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-md bg-primary/10 text-primary">
              <CreditCard className="h-4 w-4" />
            </span>
            <div>
              <div className="font-medium">Membership plans</div>
              <div className="text-xs text-muted-foreground">
                Subscribe or upgrade
              </div>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-foreground" />
        </Link>
        <Link
          href="/me/classes"
          className="group flex items-center justify-between rounded-lg border bg-card p-4 transition hover:border-primary/40 hover:shadow-sm"
        >
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-md bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
              <CalendarCheck2 className="h-4 w-4" />
            </span>
            <div>
              <div className="font-medium">Book a class</div>
              <div className="text-xs text-muted-foreground">
                See what&apos;s on this week
              </div>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-foreground" />
        </Link>
      </div>

      {/* Upcoming bookings */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle>Upcoming bookings</CardTitle>
            <CardDescription>Classes you&apos;re signed up for</CardDescription>
          </div>
          <Link
            href="/me/classes"
            className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            All classes <ArrowRight className="h-3 w-3" />
          </Link>
        </CardHeader>
        <CardContent>
          {bookingsQ.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 2 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : upcomingBookings.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No upcoming bookings.{" "}
              <Link href="/me/classes" className="text-primary hover:underline">
                Browse classes
              </Link>
              .
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {upcomingBookings.map((b) => (
                <li
                  key={b.id}
                  className="flex items-center gap-3 py-3"
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
                    <CalendarCheck2 className="h-4 w-4" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">{b.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {formatClassTime(b.startsAt)}
                    </div>
                  </div>
                  <Badge variant="success">Confirmed</Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Recent wallet activity */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Wallet activity</CardTitle>
          <CardDescription>Last 5 transactions on your wallet</CardDescription>
        </CardHeader>
        <CardContent>
          {txnsQ.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (txnsQ.data ?? []).length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No wallet activity yet. Your gym admin can add credit for you.
            </p>
          ) : (
            <ul className="flex flex-col gap-1">
              {(txnsQ.data ?? []).slice(0, 5).map((t) => {
                const positive = t.amountCents > 0;
                return (
                  <li
                    key={t.id}
                    className="flex items-center gap-3 rounded-md px-2 py-2.5 transition-colors hover:bg-accent/40"
                  >
                    <span
                      className={cn(
                        "grid h-9 w-9 shrink-0 place-items-center rounded-lg",
                        positive
                          ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {positive ? (
                        <ArrowDownLeft className="h-3.5 w-3.5" />
                      ) : t.transactionType === "MEMBERSHIP_PAYMENT" ? (
                        <CreditCard className="h-3.5 w-3.5" />
                      ) : (
                        <Receipt className="h-3.5 w-3.5" />
                      )}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="truncate text-sm">{txnLabel(t)}</div>
                      <div className="text-xs text-muted-foreground">
                        {timeAgo(t.createdAt)}
                      </div>
                    </div>
                    <div
                      className={cn(
                        "text-sm font-semibold tabular-nums",
                        positive
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-foreground"
                      )}
                    >
                      {positive ? "+" : "−"}$
                      {(Math.abs(t.amountCents) / 100).toFixed(2)}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <div className="rounded-md border border-dashed border-border bg-card/50 p-3 text-xs text-muted-foreground inline-flex items-center gap-2">
        <ArrowUpRight className="h-3.5 w-3.5" />
        Credits are added in person at your gym by an admin. Spend them here on
        plans and class drop-ins.
      </div>
    </div>
  );
}
