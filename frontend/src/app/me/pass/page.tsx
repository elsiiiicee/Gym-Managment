"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { ScanLine } from "lucide-react";
import {
  api,
  type MyProfile,
  type MySubscription,
  type MyWallet,
} from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { LegionMark } from "@/components/brand/legion-mark";
import { QrCode } from "@/components/brand/qr-code";

// Deterministically derive a 16-char pass code from the user id so the
// QR encodes something specific to them. This is NOT a signed credential;
// it's a demo visual. The real "rotating signed pass" is a future feature.
function passCodeFor(userId: string): string {
  const clean = userId.replace(/-/g, "").toUpperCase();
  return `LEG-${clean.slice(0, 4)}-${clean.slice(4, 8)}-${clean.slice(8, 12)}`;
}

export default function PassPage() {
  const meQ = useQuery({
    queryKey: ["me", "profile"],
    queryFn: () => api.get<MyProfile>("/api/users/me"),
  });
  const subsQ = useQuery({
    queryKey: ["me", "subscriptions"],
    queryFn: () => api.get<MySubscription[]>("/api/subscriptions"),
  });
  const walletQ = useQuery({
    queryKey: ["me", "wallet"],
    queryFn: () => api.get<MyWallet>("/api/wallet"),
  });

  const me = meQ.data;
  const activeSub = (subsQ.data ?? []).find((s) => s.status === "ACTIVE");
  const balance = (walletQ.data?.balanceCents ?? 0) / 100;
  const passCode = me ? passCodeFor(me.id) : "";

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
          Door pass
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Show this at the door scanner when you arrive.
        </p>
      </div>

      <div className="flex flex-col items-center gap-6">
        {meQ.isLoading ? (
          <Skeleton className="h-[440px] w-[300px] rounded-[28px]" />
        ) : !me ? (
          <Card className="p-6 text-sm text-muted-foreground">
            Couldn&apos;t load your pass. Try refreshing.
          </Card>
        ) : (
          <div
            className="relative w-full max-w-[300px] overflow-hidden rounded-[28px] p-5 shadow-2xl ring-1 ring-zinc-200"
            style={{
              background: "linear-gradient(180deg, #ffffff 0%, #f3f3f8 100%)",
              color: "#0a0a13",
            }}
          >
            <div className="absolute inset-x-0 top-0 h-2 bg-gradient-to-r from-orange-500 via-amber-500 to-pink-500" />

            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <LegionMark size={24} />
                <span className="text-xs font-extrabold tracking-tight">
                  Legion
                </span>
              </div>
              <span
                className={
                  activeSub
                    ? "inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium text-emerald-700"
                    : "inline-flex items-center gap-1 rounded-full bg-zinc-300/40 px-2 py-0.5 text-[10px] font-medium text-zinc-700"
                }
              >
                <span
                  className={
                    activeSub
                      ? "h-1.5 w-1.5 rounded-full bg-emerald-500"
                      : "h-1.5 w-1.5 rounded-full bg-zinc-500"
                  }
                />
                {activeSub ? "Active" : "No plan"}
              </span>
            </div>

            <div className="mt-3">
              <div className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">
                Member
              </div>
              <div className="text-base font-semibold tracking-tight">
                {me.fullName}
              </div>
              <div className="text-[11px] text-zinc-500">
                {activeSub ? activeSub.planName : "No active plan"}
              </div>
            </div>

            <div className="mt-3 flex items-center justify-center rounded-2xl bg-white p-3 ring-1 ring-zinc-200">
              <QrCode value={passCode} size={200} fg="#0a0a13" bg="#ffffff" />
            </div>

            <div className="mt-3 flex items-center justify-between text-[10px] tabular-nums">
              <span className="text-zinc-500">PASS ID</span>
              <span className="font-mono">{passCode}</span>
            </div>

            {/* Perforation strip */}
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
              <div>
                <div className="text-[9px] uppercase tracking-wider text-zinc-500">
                  Credit
                </div>
                <div className="text-sm font-semibold tabular-nums">
                  ${balance.toFixed(0)}
                </div>
              </div>
              <div>
                <div className="text-[9px] uppercase tracking-wider text-zinc-500">
                  Plan
                </div>
                <div className="text-sm font-semibold">
                  {activeSub ? activeSub.planName : "—"}
                </div>
              </div>
              <div>
                <div className="text-[9px] uppercase tracking-wider text-zinc-500">
                  Renews
                </div>
                <div className="text-sm font-semibold">
                  {activeSub
                    ? new Date(activeSub.endsAt).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                      })
                    : "—"}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
          <ScanLine className="h-4 w-4" />
          Hold up to the door scanner
        </div>
      </div>

      <Card className="mx-auto max-w-md p-4 text-xs text-muted-foreground">
        <p style={{ textWrap: "pretty" } as React.CSSProperties}>
          This pass is tied to your account. In production it rotates every 60
          seconds so screenshots can&apos;t be reused — that part ships with
          the mobile app.
        </p>
      </Card>
    </div>
  );
}
