"use client";

import { useId } from "react";
import { cn } from "@/lib/utils";

export interface Datum {
  label: string;
  value: number;
}

const compact = (value: number) => (value >= 1000 ? `${(value / 1000).toFixed(1)}k` : String(value));

function Frame({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <figure className={cn("w-full", className)}>
      {children}
      <figcaption className="sr-only">{label}</figcaption>
    </figure>
  );
}

/** Smooth area/line chart with a gradient fill (signups per day, registrations per week). */
export function AreaChart({ data, label, height = 180 }: { data: Datum[]; label: string; height?: number }) {
  const gradientId = useId().replaceAll(":", "");
  const width = 480;
  const pad = { top: 12, right: 8, bottom: 22, left: 30 };
  const max = Math.max(1, ...data.map((d) => d.value));
  const stepX = data.length > 1 ? (width - pad.left - pad.right) / (data.length - 1) : 0;
  const y = (value: number) => pad.top + (1 - value / max) * (height - pad.top - pad.bottom);
  const points = data.map((d, index) => [pad.left + index * stepX, y(d.value)] as const);
  const line = points.map(([px, py], index) => `${index === 0 ? "M" : "L"}${px.toFixed(1)},${py.toFixed(1)}`).join(" ");
  const area = points.length ? `${line} L${points[points.length - 1][0].toFixed(1)},${height - pad.bottom} L${pad.left},${height - pad.bottom} Z` : "";
  const ticks = [0, 0.5, 1].map((t) => Math.round(max * t));
  const labelEvery = Math.max(1, Math.ceil(data.length / 6));

  if (data.length === 0) return <p className="grid h-40 place-items-center text-sm text-fg-subtle">No data yet</p>;
  return (
    <Frame label={label}>
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={label} className="h-auto w-full overflow-visible">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--primary)" stopOpacity="0.35" />
            <stop offset="1" stopColor="var(--primary)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {ticks.map((tick) => (
          <g key={tick}>
            <line x1={pad.left} x2={width - pad.right} y1={y(tick)} y2={y(tick)} stroke="var(--border)" strokeDasharray="3 4" />
            <text x={pad.left - 6} y={y(tick) + 4} textAnchor="end" className="fill-[var(--fg-subtle)] text-[11px]">
              {compact(tick)}
            </text>
          </g>
        ))}
        <path d={area} fill={`url(#${gradientId})`} />
        <path d={line} fill="none" stroke="var(--primary)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        {points.map(([px, py], index) => (
          <g key={data[index].label}>
            <circle cx={px} cy={py} r="3" fill="var(--surface)" stroke="var(--primary)" strokeWidth="2">
              <title>{`${data[index].label}: ${data[index].value}`}</title>
            </circle>
            {index % labelEvery === 0 && (
              <text x={px} y={height - 6} textAnchor="middle" className="fill-[var(--fg-subtle)] text-[11px]">
                {data[index].label.slice(5)}
              </text>
            )}
          </g>
        ))}
      </svg>
    </Frame>
  );
}

/** Vertical bars (confidence distribution, registrations per week). */
export function BarChart({ data, label, height = 180, tone = "var(--accent)" }: { data: Datum[]; label: string; height?: number; tone?: string }) {
  const width = 480;
  const pad = { top: 12, right: 8, bottom: 24, left: 30 };
  const max = Math.max(1, ...data.map((d) => d.value));
  const slot = (width - pad.left - pad.right) / Math.max(1, data.length);
  const barWidth = Math.min(48, slot * 0.6);
  if (data.length === 0) return <p className="grid h-40 place-items-center text-sm text-fg-subtle">No data yet</p>;
  return (
    <Frame label={label}>
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={label} className="h-auto w-full">
        {[0, 0.5, 1].map((t) => {
          const yy = pad.top + (1 - t) * (height - pad.top - pad.bottom);
          return (
            <g key={t}>
              <line x1={pad.left} x2={width - pad.right} y1={yy} y2={yy} stroke="var(--border)" strokeDasharray="3 4" />
              <text x={pad.left - 6} y={yy + 4} textAnchor="end" className="fill-[var(--fg-subtle)] text-[11px]">
                {compact(Math.round(max * t))}
              </text>
            </g>
          );
        })}
        {data.map((d, index) => {
          const h = (d.value / max) * (height - pad.top - pad.bottom);
          const x = pad.left + index * slot + (slot - barWidth) / 2;
          return (
            <g key={d.label}>
              <rect x={x} y={height - pad.bottom - h} width={barWidth} height={Math.max(h, 1)} rx="5" fill={tone}>
                <title>{`${d.label}: ${d.value}`}</title>
              </rect>
              <text x={x + barWidth / 2} y={height - 8} textAnchor="middle" className="fill-[var(--fg-subtle)] text-[11px]">
                {d.label.length > 8 ? d.label.slice(5) : d.label}
              </text>
            </g>
          );
        })}
      </svg>
    </Frame>
  );
}

export interface Slice extends Datum {
  color: string;
}

/** Donut with a legend (complaint status breakdown, answered vs unanswered). */
export function DonutChart({ data, label }: { data: Slice[]; label: string }) {
  const total = data.reduce((sum, slice) => sum + slice.value, 0);
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;
  return (
    <Frame label={label} className="flex flex-wrap items-center justify-center gap-6">
      <svg viewBox="0 0 140 140" role="img" aria-label={label} className="size-36 shrink-0 -rotate-90">
        <circle cx="70" cy="70" r={radius} fill="none" stroke="var(--surface-3)" strokeWidth="16" />
        {total > 0 &&
          data.map((slice) => {
            const length = (slice.value / total) * circumference;
            const circle = (
              <circle key={slice.label} cx="70" cy="70" r={radius} fill="none" stroke={slice.color} strokeWidth="16" strokeDasharray={`${length} ${circumference - length}`} strokeDashoffset={-offset}>
                <title>{`${slice.label}: ${slice.value}`}</title>
              </circle>
            );
            offset += length;
            return circle;
          })}
        <text x="70" y="70" transform="rotate(90 70 70)" textAnchor="middle" dominantBaseline="central" className="fill-[var(--fg)] font-display text-xl font-bold">
          {total}
        </text>
      </svg>
      <ul className="space-y-1.5 text-sm">
        {data.map((slice) => (
          <li key={slice.label} className="flex items-center gap-2">
            <span className="size-2.5 rounded-full" style={{ background: slice.color }} aria-hidden />
            <span className="text-fg-muted">{slice.label}</span>
            <span className="ml-auto pl-4 font-semibold tabular-nums">{slice.value}</span>
          </li>
        ))}
      </ul>
    </Frame>
  );
}

/** Horizontal ranked bars (top events, top searches). */
export function RankedBars({ data, label, suffix }: { data: Array<Datum & { hint?: string }>; label: string; suffix?: string }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  if (data.length === 0) return <p className="grid h-24 place-items-center text-sm text-fg-subtle">Nothing to rank yet</p>;
  return (
    <Frame label={label}>
      <ol className="space-y-3">
        {data.map((item) => (
          <li key={item.label}>
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="min-w-0 truncate font-medium">{item.label}</span>
              <span className="shrink-0 tabular-nums text-fg-muted">
                {item.value}
                {suffix}
              </span>
            </div>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-surface-3" aria-hidden>
              <div className="h-full rounded-full bg-brand-gradient" style={{ width: `${Math.max(3, (item.value / max) * 100)}%` }} />
            </div>
            {item.hint && <p className="mt-0.5 text-xs text-fg-subtle">{item.hint}</p>}
          </li>
        ))}
      </ol>
    </Frame>
  );
}
