"use client";

import * as React from "react";
import { ArrowDownRight, ArrowUpRight, type LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { TiltCard } from "@/components/ui/tilt-card";
import { Sparkline } from "@/components/charts";
import { useCountUp } from "@/lib/hooks";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  label: string;
  /** Display fallback if numericTarget is not provided */
  value: string;
  numericTarget?: number;
  numericPrefix?: string;
  numericSuffix?: string;
  delta: string;
  deltaPositive: boolean;
  icon: LucideIcon;
  tintHue: number;
  sparkline?: number[];
  sparklineColor?: string;
}

export function KpiCard({
  label,
  value,
  numericTarget,
  numericPrefix = "",
  numericSuffix = "",
  delta,
  deltaPositive,
  icon: Icon,
  tintHue,
  sparkline,
  sparklineColor,
}: KpiCardProps) {
  const animated = useCountUp(numericTarget ?? 0, {
    duration: 1100,
    format: (n) => {
      if (numericTarget == null) return value;
      if (Number.isInteger(numericTarget))
        return numericPrefix + Math.round(n).toLocaleString() + numericSuffix;
      return numericPrefix + n.toFixed(1) + numericSuffix;
    },
  });
  const displayValue = numericTarget != null ? animated : value;

  return (
    <TiltCard max={5} className="rounded-xl">
      <Card className="relative overflow-hidden border-border/80 hover:border-primary/30 transition-colors h-full">
        <div
          className="pointer-events-none absolute inset-0 living-tint"
          style={{ ["--tint-hue" as string]: tintHue }}
        />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent dark:via-white/10" />
        <div className="relative p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-col gap-1 tilt-pop">
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                {label}
              </p>
              <p className="text-3xl font-semibold tracking-tight tabular-nums">
                {displayValue}
              </p>
            </div>
            <span
              className="tilt-pop flex h-10 w-10 items-center justify-center rounded-lg text-white shadow-sm ring-1 ring-white/15"
              style={{
                background: `linear-gradient(135deg, hsl(${tintHue} 75% 58%), hsl(${
                  tintHue + 30
                } 70% 55%))`,
              }}
            >
              <Icon className="h-[18px] w-[18px]" />
            </span>
          </div>
          <div className="mt-4 flex items-center justify-between">
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium tabular-nums",
                deltaPositive
                  ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                  : "bg-rose-500/15 text-rose-700 dark:text-rose-400"
              )}
            >
              {deltaPositive ? (
                <ArrowUpRight className="h-3 w-3" />
              ) : (
                <ArrowDownRight className="h-3 w-3" />
              )}
              {delta}
            </span>
            {sparkline && (
              <Sparkline data={sparkline} color={sparklineColor} animated />
            )}
          </div>
        </div>
      </Card>
    </TiltCard>
  );
}
