"use client";

import * as React from "react";

// --- AreaChart ----------------------------------------------------

interface AreaPoint {
  m: string;
  v: number;
}

interface AreaChartProps {
  data: AreaPoint[];
  height?: number;
  formatValue?: (v: number) => string;
}

export function AreaChart({
  data,
  height = 220,
  formatValue = (v) => `$${v}k`,
}: AreaChartProps) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [width, setWidth] = React.useState(600);
  const [hover, setHover] = React.useState<number | null>(null);

  React.useLayoutEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([e]) => setWidth(e.contentRect.width));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);

  const padding = { top: 20, right: 16, bottom: 28, left: 40 };
  const innerW = Math.max(1, width - padding.left - padding.right);
  const innerH = height - padding.top - padding.bottom;
  const vals = data.map((d) => d.v);
  const max = Math.max(...vals) * 1.15;
  const min = 0;
  const x = (i: number) =>
    padding.left + (i / Math.max(1, data.length - 1)) * innerW;
  const y = (v: number) => padding.top + innerH - ((v - min) / (max - min)) * innerH;

  const pts = data.map((d, i): [number, number] => [x(i), y(d.v)]);
  const linePath = (() => {
    if (pts.length < 2) return "";
    let p = `M ${pts[0][0]} ${pts[0][1]}`;
    for (let i = 1; i < pts.length; i++) {
      const [x0, y0] = pts[i - 1];
      const [x1, y1] = pts[i];
      const cpx = (x0 + x1) / 2;
      p += ` C ${cpx} ${y0}, ${cpx} ${y1}, ${x1} ${y1}`;
    }
    return p;
  })();
  const areaPath = `${linePath} L ${x(data.length - 1)} ${y(min)} L ${x(0)} ${y(min)} Z`;

  const yTicks = 4;
  const tickVals = Array.from({ length: yTicks + 1 }, (_, i) =>
    Math.round((max / yTicks) * i)
  );
  const id = React.useId().replace(/:/g, "");

  const pathRef = React.useRef<SVGPathElement>(null);
  const [pathLen, setPathLen] = React.useState(2000);
  React.useEffect(() => {
    if (pathRef.current) {
      setPathLen(pathRef.current.getTotalLength());
    }
  }, [linePath]);

  const onMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const mx = e.clientX - r.left;
    if (mx < padding.left || mx > width - padding.right) {
      setHover(null);
      return;
    }
    const rel = (mx - padding.left) / innerW;
    const idx = Math.round(rel * (data.length - 1));
    setHover(Math.max(0, Math.min(data.length - 1, idx)));
  };

  return (
    <div ref={ref} className="w-full relative">
      <svg
        width={width}
        height={height}
        className="overflow-visible"
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id={`area-${id}`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="hsl(var(--chart-1))" stopOpacity="0.4" />
            <stop offset="100%" stopColor="hsl(var(--chart-1))" stopOpacity="0" />
          </linearGradient>
          <filter id={`glow-${id}`} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {tickVals.map((tv, i) => (
          <g key={i}>
            <line
              x1={padding.left}
              x2={width - padding.right}
              y1={y(tv)}
              y2={y(tv)}
              stroke="hsl(var(--border))"
              strokeDasharray="3 4"
              strokeWidth="1"
            />
            <text
              x={padding.left - 8}
              y={y(tv) + 3}
              textAnchor="end"
              fontSize="10"
              fill="hsl(var(--muted-foreground))"
              className="tabular-nums"
            >
              {formatValue(tv)}
            </text>
          </g>
        ))}
        <path
          d={areaPath}
          fill={`url(#area-${id})`}
          style={{ animation: "fade-in 1.2s ease-out .2s both" }}
        />
        <path
          ref={pathRef}
          d={linePath}
          fill="none"
          stroke="hsl(var(--chart-1))"
          strokeWidth="2.25"
          strokeLinecap="round"
          strokeLinejoin="round"
          filter={`url(#glow-${id})`}
          style={{
            strokeDasharray: pathLen,
            strokeDashoffset: pathLen,
            animation: "draw-on 1.3s cubic-bezier(0.16,1,0.3,1) forwards",
          }}
        />
        {data.map((d, i) => (
          <g key={i}>
            <circle
              cx={x(i)}
              cy={y(d.v)}
              r={hover === i ? 5 : 3}
              fill="hsl(var(--card))"
              stroke="hsl(var(--chart-1))"
              strokeWidth="2"
              style={{
                animation: `zoom-in .3s cubic-bezier(0.16,1,0.3,1) ${
                  0.4 + i * 0.06
                }s both`,
                transition: "r .15s ease",
              }}
            />
            <text
              x={x(i)}
              y={height - 10}
              textAnchor="middle"
              fontSize="10"
              fill="hsl(var(--muted-foreground))"
            >
              {d.m}
            </text>
          </g>
        ))}
        {hover != null && (
          <g pointerEvents="none">
            <line
              x1={x(hover)}
              x2={x(hover)}
              y1={padding.top}
              y2={padding.top + innerH}
              stroke="hsl(var(--ring))"
              strokeDasharray="3 3"
              strokeWidth="1"
              opacity="0.7"
            />
            <circle
              cx={x(hover)}
              cy={y(data[hover].v)}
              r="6"
              fill="hsl(var(--chart-1))"
              opacity="0.18"
            />
          </g>
        )}
      </svg>
      {hover != null && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-md border border-border bg-popover px-2.5 py-1.5 text-xs shadow-md animate-fade-in"
          style={{ left: x(hover), top: y(data[hover].v) - 6 }}
        >
          <div className="text-muted-foreground">{data[hover].m}</div>
          <div className="font-semibold tabular-nums">
            {formatValue(data[hover].v)}
          </div>
        </div>
      )}
    </div>
  );
}

// --- BarChart -----------------------------------------------------

interface BarPoint {
  d: string;
  v: number;
}

interface BarChartProps {
  data: BarPoint[];
  height?: number;
}

export function BarChart({ data, height = 220 }: BarChartProps) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [width, setWidth] = React.useState(400);
  React.useLayoutEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([e]) => setWidth(e.contentRect.width));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);

  const padding = { top: 16, right: 8, bottom: 28, left: 36 };
  const innerW = Math.max(1, width - padding.left - padding.right);
  const innerH = height - padding.top - padding.bottom;
  const vals = data.map((d) => d.v);
  const max = Math.max(...vals) * 1.15;
  const barW = (innerW / data.length) * 0.62;
  const x = (i: number) =>
    padding.left + (i + 0.5) * (innerW / data.length) - barW / 2;
  const y = (v: number) => padding.top + innerH - (v / max) * innerH;

  const yTicks = 4;
  const tickVals = Array.from({ length: yTicks + 1 }, (_, i) =>
    Math.round((max / yTicks) * i)
  );

  return (
    <div ref={ref} className="w-full">
      <svg width={width} height={height} className="overflow-visible">
        {tickVals.map((tv, i) => (
          <g key={i}>
            <line
              x1={padding.left}
              x2={width - padding.right}
              y1={y(tv)}
              y2={y(tv)}
              stroke="hsl(var(--border))"
              strokeDasharray="3 4"
              strokeWidth="1"
            />
            <text
              x={padding.left - 8}
              y={y(tv) + 3}
              textAnchor="end"
              fontSize="10"
              fill="hsl(var(--muted-foreground))"
              className="tabular-nums"
            >
              {tv}
            </text>
          </g>
        ))}
        {data.map((d, i) => {
          const h = innerH - (y(d.v) - padding.top);
          return (
            <g key={i}>
              <rect
                x={x(i)}
                y={y(d.v)}
                width={barW}
                height={Math.max(2, h)}
                fill="hsl(var(--chart-1))"
                rx="4"
                style={{
                  transformOrigin: `${x(i) + barW / 2}px ${padding.top + innerH}px`,
                  animation: `bar-grow .7s cubic-bezier(0.16,1,0.3,1) ${
                    0.1 + i * 0.07
                  }s both`,
                }}
              />
              <text
                x={x(i) + barW / 2}
                y={height - 10}
                textAnchor="middle"
                fontSize="10"
                fill="hsl(var(--muted-foreground))"
              >
                {d.d}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// --- Sparkline ----------------------------------------------------

interface SparklineProps {
  data: number[];
  color?: string;
  height?: number;
  width?: number;
  animated?: boolean;
}

export function Sparkline({
  data,
  color = "hsl(var(--chart-1))",
  height = 36,
  width = 96,
  animated = false,
}: SparklineProps) {
  const ref = React.useRef<SVGPolylineElement>(null);
  const [len, setLen] = React.useState(200);
  React.useEffect(() => {
    if (ref.current) setLen(ref.current.getTotalLength());
  }, []);

  if (!data?.length) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const pad = 2;
  const x = (i: number) => pad + (i / (data.length - 1)) * (width - pad * 2);
  const y = (v: number) =>
    pad + (1 - (v - min) / (max - min || 1)) * (height - pad * 2);
  const pts = data.map((v, i) => `${x(i)},${y(v)}`).join(" ");
  const id = React.useId().replace(/:/g, "");

  return (
    <svg width={width} height={height} className="overflow-visible">
      <defs>
        <linearGradient id={`spark-${id}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon
        points={`${pad},${height - pad} ${pts} ${width - pad},${height - pad}`}
        fill={`url(#spark-${id})`}
      />
      <polyline
        ref={ref}
        points={pts}
        fill="none"
        stroke={color}
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={
          animated
            ? {
                strokeDasharray: len,
                strokeDashoffset: len,
                animation: "draw-on 1.2s cubic-bezier(0.16,1,0.3,1) .3s forwards",
              }
            : undefined
        }
      />
    </svg>
  );
}

// --- RadialChart --------------------------------------------------

export interface RadialSeries {
  label: string;
  value: number;
  color: string;
}

interface RadialChartProps {
  series: RadialSeries[];
  size?: number;
  thickness?: number;
  centerLabel?: string;
  centerValue?: string;
}

export function RadialChart({
  series,
  size = 220,
  thickness = 18,
  centerLabel,
  centerValue,
}: RadialChartProps) {
  const r = (size - thickness) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const C = 2 * Math.PI * r;
  const total = series.reduce((a, s) => a + s.value, 0) || 1;
  const [active, setActive] = React.useState<number | null>(null);
  const id = React.useId().replace(/:/g, "");

  let acc = 0;
  const computed = series.map((s, i) => {
    const frac = s.value / total;
    const dash = C * frac;
    const gap = C - dash;
    const offset = -C * (acc / total);
    acc += s.value;
    return { ...s, dash, gap, offset, i };
  });

  return (
    <div
      className="relative inline-flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth={thickness}
        />
        {computed.map((s) => {
          const isActive = active === s.i;
          return (
            <circle
              key={s.i}
              cx={cx}
              cy={cy}
              r={r}
              fill="none"
              stroke={s.color}
              strokeWidth={isActive ? thickness + 3 : thickness}
              strokeDasharray={`${s.dash} ${s.gap}`}
              strokeDashoffset={s.offset}
              strokeLinecap="butt"
              style={{
                animation: `arc-grow-${id}-${s.i} 1.1s cubic-bezier(0.16,1,0.3,1) ${
                  s.i * 0.12
                }s both`,
                transition: "stroke-width .2s ease",
                cursor: "pointer",
              }}
              onMouseEnter={() => setActive(s.i)}
              onMouseLeave={() => setActive(null)}
            />
          );
        })}
        <style>
          {computed
            .map(
              (s) =>
                `@keyframes arc-grow-${id}-${s.i} { from { stroke-dasharray: 0 ${C}; } to { stroke-dasharray: ${s.dash} ${s.gap}; } }`
            )
            .join("\n")}
        </style>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
          {active != null ? series[active].label : centerLabel}
        </div>
        <div className="text-2xl font-semibold tracking-tight tabular-nums">
          {active != null ? series[active].value.toLocaleString() : centerValue}
        </div>
        {active != null && (
          <div className="mt-0.5 text-[11px] text-muted-foreground tabular-nums">
            {Math.round((series[active].value / total) * 100)}% of total
          </div>
        )}
      </div>
    </div>
  );
}

// --- Heatmap ------------------------------------------------------

interface HeatmapProps {
  data: number[][];
  rowLabels: string[];
  colLabels: string[];
  valueLabel?: string;
}

export function Heatmap({
  data,
  rowLabels,
  colLabels,
  valueLabel = "sessions",
}: HeatmapProps) {
  const flat = data.flat();
  const max = Math.max(...flat, 1);
  const [hover, setHover] = React.useState<[number, number] | null>(null);

  return (
    <div className="w-full">
      <div className="flex">
        <div className="w-12 shrink-0" />
        <div
          className="grid flex-1 gap-1"
          style={{ gridTemplateColumns: `repeat(${colLabels.length}, minmax(0, 1fr))` }}
        >
          {colLabels.map((c, i) => (
            <div
              key={i}
              className="text-center text-[10px] uppercase tracking-wider text-muted-foreground"
            >
              {c}
            </div>
          ))}
        </div>
      </div>
      <div className="mt-2 flex">
        <div className="w-12 shrink-0 flex flex-col gap-1">
          {rowLabels.map((r, i) => (
            <div
              key={i}
              className="h-6 flex items-center text-[10px] uppercase tracking-wider text-muted-foreground"
            >
              {r}
            </div>
          ))}
        </div>
        <div
          className="grid flex-1 gap-1"
          style={{
            gridTemplateColumns: `repeat(${colLabels.length}, minmax(0, 1fr))`,
            gridAutoRows: "24px",
          }}
        >
          {data.flatMap((row, ri) =>
            row.map((v, ci) => {
              const intensity = v / max;
              const isHover = hover && hover[0] === ri && hover[1] === ci;
              return (
                <div
                  key={`${ri}-${ci}`}
                  onMouseEnter={() => setHover([ri, ci])}
                  onMouseLeave={() => setHover(null)}
                  className="relative rounded-sm cursor-pointer transition-all hover:scale-110 hover:z-10"
                  style={{
                    background: `hsl(var(--chart-1) / ${0.08 + intensity * 0.78})`,
                    animation: `fade-in .35s ease-out ${
                      (ri * colLabels.length + ci) * 0.018
                    }s both`,
                    outline: isHover ? "2px solid hsl(var(--ring))" : "none",
                    outlineOffset: "1px",
                  }}
                  title={`${rowLabels[ri]} ${colLabels[ci]}: ${v} ${valueLabel}`}
                />
              );
            })
          )}
        </div>
      </div>
      {hover && (
        <div className="mt-3 inline-flex items-center gap-2 rounded-md border border-border bg-popover px-2.5 py-1.5 text-xs animate-fade-in">
          <span className="font-medium tabular-nums">
            {rowLabels[hover[0]]} · {colLabels[hover[1]]}
          </span>
          <span className="text-muted-foreground">
            {data[hover[0]][hover[1]]} {valueLabel}
          </span>
        </div>
      )}
    </div>
  );
}
