"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type Tone = "gradient" | "solid" | "ghost";

interface LegionMarkProps {
  size?: number;
  tone?: Tone;
  className?: string;
}

export function LegionMark({ size = 36, tone = "gradient", className }: LegionMarkProps) {
  const reactId = React.useId().replace(/:/g, "");
  const radius = Math.round(size * 0.235);

  const bg = (() => {
    if (tone === "solid") return <rect width="32" height="32" rx="8" fill="hsl(var(--primary))" />;
    if (tone === "ghost")
      return (
        <rect
          width="32"
          height="32"
          rx="8"
          fill="rgba(255,255,255,0.12)"
          stroke="rgba(255,255,255,0.18)"
          strokeWidth="0.6"
        />
      );
    return (
      <>
        <rect width="32" height="32" rx="8" fill={`url(#bg-${reactId})`} />
        <rect width="32" height="14" rx="8" fill={`url(#gloss-${reactId})`} />
      </>
    );
  })();

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0", className)}
      style={{ borderRadius: radius }}
      aria-hidden
    >
      <defs>
        <linearGradient
          id={`bg-${reactId}`}
          x1="0"
          y1="0"
          x2="32"
          y2="32"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#F97316" />
          <stop offset="55%" stopColor="#FB923C" />
          <stop offset="100%" stopColor="#EC4899" />
        </linearGradient>
        <linearGradient
          id={`gloss-${reactId}`}
          x1="0"
          y1="0"
          x2="0"
          y2="14"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#fff" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
      {bg}
      <g
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        stroke="#fff"
        strokeWidth="2.4"
      >
        <path d="M8 23 L16 14 L24 23" opacity="0.35" />
        <path d="M8 19 L16 10 L24 19" opacity="0.65" />
        <path d="M8 15 L16 6 L24 15" />
      </g>
    </svg>
  );
}

interface LegionLogoProps {
  size?: number;
  className?: string;
  dark?: boolean;
}

export function LegionLogo({ size = 36, className, dark = false }: LegionLogoProps) {
  return (
    <div className={cn("inline-flex items-center gap-2.5", className)}>
      <LegionMark size={size} />
      <span
        className={cn(
          "font-extrabold tracking-tight tabular-nums",
          dark ? "text-white" : "text-foreground"
        )}
        style={{ fontSize: Math.round(size * 0.48), letterSpacing: "-0.02em" }}
      >
        Legion
      </span>
    </div>
  );
}
