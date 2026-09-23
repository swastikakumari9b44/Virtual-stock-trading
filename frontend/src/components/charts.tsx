import { useMemo } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { dateOf, fmtDateTime, fmtShortDate, fmtTime, inr } from "../lib/format";
import type { HistoryPoint, PerformancePoint } from "../types";

const BRAND = "#0e5a78";
const GRID = "#e6ebef";
const MUTED = "#566573";

function tickIndexes(stamps: string[], mode: "days" | "hours"): number[] {
  if (mode === "hours") return stamps.map((_, i) => i).filter((i) => i % 2 === 0);
  const firsts: number[] = [];
  stamps.forEach((ts, i) => {
    if (i === 0 || dateOf(ts) !== dateOf(stamps[i - 1])) firsts.push(i);
  });
  const step = firsts.length > 8 ? 2 : 1;
  return firsts.filter((_, i) => i % step === 0);
}

function padDomain(lo: number, hi: number): [number, number] {
  const span = hi - lo;
  const pad = span > 0 ? span * 0.12 : Math.max(Math.abs(hi) * 0.005, 0.5);
  return [lo - pad, hi + pad];
}

interface TipProps {
  active?: boolean;
  payload?: ReadonlyArray<{ payload?: { ts: string; price?: number; value?: number } }>;
}

function Tip({ active, payload }: TipProps) {
  const row = payload?.[0]?.payload;
  if (!active || !row) return null;
  const v = row.price ?? row.value;
  return (
    <div className="rounded-lg border border-line bg-white px-3 py-2 text-xs shadow-md">
      <div className="text-muted">{fmtDateTime(row.ts)}</div>
      <div className="num mt-0.5 text-sm font-semibold">{v === undefined ? "" : inr(v)}</div>
    </div>
  );
}

export function PriceChart({
  data,
  marketTs,
  selectedTs,
  view,
}: {
  data: HistoryPoint[];
  marketTs: string;
  selectedTs: string;
  view: "all" | "day";
}) {
  const shown = useMemo(
    () => (view === "day" ? data.filter((p) => dateOf(p.timestamp) === dateOf(selectedTs)) : data),
    [data, view, selectedTs],
  );

  const rows = useMemo(() => {
    let lastPast = -1;
    shown.forEach((p, i) => {
      if (p.timestamp <= marketTs) lastPast = i;
    });
    return shown.map((p, i) => ({
      i,
      ts: p.timestamp,
      price: p.price,
      // Solid line up to the simulated market time, dashed after it.
      past: i <= lastPast ? p.price : null,
      future: i >= lastPast ? p.price : null,
    }));
  }, [shown, marketTs]);

  if (rows.length === 0) {
    return <div className="grid h-72 place-items-center text-sm text-muted">No price data for this day.</div>;
  }

  const stamps = rows.map((r) => r.ts);
  const ticks = tickIndexes(stamps, view === "day" ? "hours" : "days");
  const marketRow = rows.find((r) => r.ts === marketTs);
  const selectedRow = rows.find((r) => r.ts === selectedTs);

  return (
    <div className="h-72 w-full sm:h-80">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={rows} margin={{ top: 10, right: 16, bottom: 0, left: 0 }}>
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis
            dataKey="i"
            type="number"
            domain={[0, rows.length - 1]}
            ticks={ticks}
            tickFormatter={(i: number) => (view === "day" ? fmtTime(stamps[i] ?? "") : fmtShortDate(stamps[i] ?? ""))}
            tick={{ fill: MUTED, fontSize: 12 }}
            tickLine={false}
            axisLine={{ stroke: GRID }}
            allowDataOverflow
          />
          <YAxis
            domain={([lo, hi]: readonly [number, number]): [number, number] => padDomain(lo, hi)}
            tickFormatter={(v: number) => v.toFixed(2)}
            tick={{ fill: MUTED, fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            width={62}
            tickCount={5}
          />
          <Tooltip content={<Tip />} cursor={{ stroke: MUTED, strokeDasharray: "3 3" }} />
          <Line dataKey="future" stroke="#9aa9b5" strokeWidth={1.6} strokeDasharray="4 4" dot={false} isAnimationActive={false} connectNulls={false} />
          <Line dataKey="past" stroke={BRAND} strokeWidth={2.2} dot={false} isAnimationActive={false} connectNulls={false} />
          {marketRow && (
            <ReferenceDot x={marketRow.i} y={marketRow.price} r={5} fill={BRAND} stroke="#fff" strokeWidth={2} ifOverflow="visible" />
          )}
          {selectedRow && selectedRow.ts !== marketRow?.ts && (
            <ReferenceDot x={selectedRow.i} y={selectedRow.price} r={6} fill="#fff" stroke="#b7791f" strokeWidth={3} ifOverflow="visible" />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function PerformanceChart({ data, baseline }: { data: PerformancePoint[]; baseline: number }) {
  const rows = useMemo(() => data.map((p, i) => ({ i, ts: p.timestamp, value: p.value })), [data]);
  if (rows.length === 0) return <div className="grid h-64 place-items-center text-sm text-muted">No data yet.</div>;

  const values = rows.map((r) => r.value);
  const lo = Math.min(baseline, ...values);
  const hi = Math.max(baseline, ...values);
  const stamps = rows.map((r) => r.ts);
  const ticks = tickIndexes(stamps, "days");
  const range = hi - lo;
  const decimals = range < 10 ? 2 : range < 100 ? 1 : 0;

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={rows} margin={{ top: 10, right: 16, bottom: 0, left: 0 }}>
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis
            dataKey="i"
            type="number"
            domain={[0, Math.max(rows.length - 1, 1)]}
            ticks={ticks}
            tickFormatter={(i: number) => fmtShortDate(stamps[i] ?? "")}
            tick={{ fill: MUTED, fontSize: 12 }}
            tickLine={false}
            axisLine={{ stroke: GRID }}
          />
          <YAxis
            domain={([a, b]: readonly [number, number]): [number, number] => padDomain(Math.min(a, baseline), Math.max(b, baseline))}
            tickFormatter={(v: number) => inr(v, decimals)}
            tick={{ fill: MUTED, fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            width={88}
            tickCount={4}
          />
          <Tooltip content={<Tip />} cursor={{ stroke: MUTED, strokeDasharray: "3 3" }} />
          <ReferenceLine y={baseline} stroke="#9aa9b5" strokeDasharray="4 4" />
          <Area dataKey="value" type="stepAfter" stroke={BRAND} strokeWidth={2.2} fill={BRAND} fillOpacity={0.08} isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
