"use client";

import * as React from "react";
import { LegionMark } from "./legion-mark";

function seededRandom(seedStr: string) {
  let s = 0;
  for (let i = 0; i < seedStr.length; i++) s = (s * 31 + seedStr.charCodeAt(i)) >>> 0;
  if (s === 0) s = 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    s = s >>> 0;
    return (s % 1000) / 1000;
  };
}

interface QrCodeProps {
  value?: string;
  size?: number;
  fg?: string;
  bg?: string;
  logo?: boolean;
  withLabel?: boolean;
}

export function QrCode({
  value = "legion-pass",
  size = 240,
  fg = "currentColor",
  bg = "transparent",
  logo = true,
  withLabel = false,
}: QrCodeProps) {
  const grid = 33;
  const quiet = 1;
  const total = grid + quiet * 2;
  const cell = size / total;

  const inFinder = (r: number, c: number) =>
    (r < 7 && c < 7) ||
    (r < 7 && c >= grid - 7) ||
    (r >= grid - 7 && c < 7);
  const inAlign = (r: number, c: number) =>
    r >= grid - 9 && r <= grid - 5 && c >= grid - 9 && c <= grid - 5;
  const inTiming = (r: number, c: number) => r === 6 || c === 6;
  const logoSpan = Math.round(grid * 0.3);
  const logoStart = Math.floor((grid - logoSpan) / 2);
  const inLogo = (r: number, c: number) =>
    logo &&
    r >= logoStart &&
    r < logoStart + logoSpan &&
    c >= logoStart &&
    c < logoStart + logoSpan;

  const cells: Array<[number, number]> = [];
  const rnd = seededRandom(value);
  for (let r = 0; r < grid; r++) {
    for (let c = 0; c < grid; c++) {
      if (inFinder(r, c) || inAlign(r, c) || inLogo(r, c)) continue;
      if (inTiming(r, c)) {
        if ((r + c) % 2 === 0) cells.push([r, c]);
        continue;
      }
      if (rnd() > 0.5) cells.push([r, c]);
    }
  }

  const innerBg = bg === "transparent" ? "hsl(var(--card))" : bg;

  const finder = (r0: number, c0: number, key: string) => {
    const x = (c0 + quiet) * cell;
    const y = (r0 + quiet) * cell;
    return (
      <g key={key}>
        <rect x={x} y={y} width={7 * cell} height={7 * cell} rx={cell * 1.4} fill={fg} />
        <rect
          x={x + cell}
          y={y + cell}
          width={5 * cell}
          height={5 * cell}
          rx={cell * 0.9}
          fill={innerBg}
        />
        <rect
          x={x + 2 * cell}
          y={y + 2 * cell}
          width={3 * cell}
          height={3 * cell}
          rx={cell * 0.5}
          fill={fg}
        />
      </g>
    );
  };

  const alignPat = (r0: number, c0: number) => {
    const x = (c0 + quiet) * cell;
    const y = (r0 + quiet) * cell;
    return (
      <g>
        <rect x={x} y={y} width={5 * cell} height={5 * cell} rx={cell * 1.1} fill={fg} />
        <rect
          x={x + cell}
          y={y + cell}
          width={3 * cell}
          height={3 * cell}
          rx={cell * 0.7}
          fill={innerBg}
        />
        <rect
          x={x + 2 * cell}
          y={y + 2 * cell}
          width={cell}
          height={cell}
          rx={cell * 0.3}
          fill={fg}
        />
      </g>
    );
  };

  const r = cell * 0.32;

  return (
    <div className="inline-flex flex-col items-center gap-2">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        xmlns="http://www.w3.org/2000/svg"
        style={{ display: "block" }}
      >
        {bg !== "transparent" && <rect width={size} height={size} fill={bg} />}
        {cells.map(([rr, cc], i) => (
          <rect
            key={i}
            x={(cc + quiet) * cell}
            y={(rr + quiet) * cell}
            width={cell}
            height={cell}
            rx={r}
            ry={r}
            fill={fg}
            style={{ animation: `fade-in .35s ease-out ${(rr + cc) * 0.004}s both` }}
          />
        ))}
        {finder(0, 0, "tl")}
        {finder(0, grid - 7, "tr")}
        {finder(grid - 7, 0, "bl")}
        {alignPat(grid - 9, grid - 9)}
        {logo && (
          <g>
            <rect
              x={(logoStart + quiet) * cell - cell * 0.5}
              y={(logoStart + quiet) * cell - cell * 0.5}
              width={(logoSpan + 1) * cell}
              height={(logoSpan + 1) * cell}
              rx={cell * 2}
              fill={innerBg}
            />
            <foreignObject
              x={(logoStart + quiet) * cell}
              y={(logoStart + quiet) * cell}
              width={logoSpan * cell}
              height={logoSpan * cell}
            >
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <LegionMark size={Math.round(logoSpan * cell * 0.95)} />
              </div>
            </foreignObject>
          </g>
        )}
      </svg>
      {withLabel && (
        <div className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground tabular-nums">
          {value}
        </div>
      )}
    </div>
  );
}
