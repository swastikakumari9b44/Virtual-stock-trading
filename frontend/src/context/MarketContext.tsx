import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useApi } from "../hooks/useApi";
import { api } from "../services/api";
import { dateOf } from "../lib/format";
import type { MarketTimeline } from "../types";

export const SPEEDS = [
  { label: "1\u00d7", ms: 5000 },
  { label: "2\u00d7", ms: 2500 },
  { label: "4\u00d7", ms: 1250 },
] as const;

export interface DayInfo {
  date: string;
  firstIndex: number;
  count: number;
}

interface MarketApi {
  timeline: MarketTimeline;
  marketTs: string;
  index: number;
  lastIndex: number;
  days: DayInfo[];
  dayNumber: number;
  playing: boolean;
  speedIdx: number;
  setPlaying: (p: boolean) => void;
  setSpeedIdx: (i: number) => void;
  seek: (i: number) => void;
  step: (delta: number) => void;
}

const Ctx = createContext<MarketApi | null>(null);
const KEY = "vst.market.v1";

function loadSaved(): { index?: number; speedIdx?: number } {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "{}");
  } catch {
    return {};
  }
}

/** First visit starts at the open of the 5th session so charts already have history behind them. */
function defaultIndex(days: DayInfo[]): number {
  return days[Math.min(4, days.length - 1)]?.firstIndex ?? 0;
}

export function MarketProvider({ children }: { children: ReactNode }) {
  const tl = useApi(() => api.timeline(), []);
  if (tl.error && !tl.data) {
    return (
      <div className="grid min-h-screen place-items-center p-6">
        <div className="max-w-md rounded-xl border border-line bg-white p-6 text-center">
          <h1 className="text-lg font-semibold">Can't load market data</h1>
          <p className="mt-2 text-sm text-muted">{tl.error}</p>
          <button className="btn-primary mt-4" onClick={tl.reload}>
            Try again
          </button>
        </div>
      </div>
    );
  }
  if (!tl.data) {
    return (
      <div className="grid min-h-screen place-items-center text-sm text-muted" role="status">
        Loading market data…
      </div>
    );
  }
  return <Inner timeline={tl.data}>{children}</Inner>;
}

function Inner({ timeline, children }: { timeline: MarketTimeline; children: ReactNode }) {
  const days = useMemo<DayInfo[]>(() => {
    const out: DayInfo[] = [];
    timeline.timestamps.forEach((ts, i) => {
      const d = dateOf(ts);
      const last = out[out.length - 1];
      if (last && last.date === d) last.count++;
      else out.push({ date: d, firstIndex: i, count: 1 });
    });
    return out;
  }, [timeline]);

  const lastIndex = timeline.timestamps.length - 1;
  const [index, setIndex] = useState(() => {
    const saved = loadSaved().index;
    return typeof saved === "number" && saved >= 0 && saved <= lastIndex ? saved : defaultIndex(days);
  });
  const [speedIdx, setSpeedIdx] = useState(() => {
    const s = loadSaved().speedIdx;
    return typeof s === "number" && s >= 0 && s < SPEEDS.length ? s : 0;
  });
  const [playing, setPlaying] = useState(true);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify({ index, speedIdx }));
    } catch {
      /* storage unavailable: the simulation still works, it just won't be remembered */
    }
  }, [index, speedIdx]);

  useEffect(() => {
    if (!playing) return;
    if (index >= lastIndex) {
      setPlaying(false);
      return;
    }
    const id = window.setTimeout(() => setIndex((i) => Math.min(i + 1, lastIndex)), SPEEDS[speedIdx].ms);
    return () => window.clearTimeout(id);
  }, [playing, index, lastIndex, speedIdx]);

  const seek = useCallback((i: number) => setIndex(Math.max(0, Math.min(lastIndex, i))), [lastIndex]);
  const step = useCallback((d: number) => setIndex((i) => Math.max(0, Math.min(lastIndex, i + d))), [lastIndex]);

  const marketTs = timeline.timestamps[index];
  const dayNumber = days.findIndex((d) => d.date === dateOf(marketTs)) + 1;

  const value = useMemo<MarketApi>(
    () => ({
      timeline,
      marketTs,
      index,
      lastIndex,
      days,
      dayNumber,
      playing,
      speedIdx,
      setPlaying,
      setSpeedIdx,
      seek,
      step,
    }),
    [timeline, marketTs, index, lastIndex, days, dayNumber, playing, speedIdx, seek, step],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useMarket(): MarketApi {
  const v = useContext(Ctx);
  if (!v) throw new Error("useMarket must be used inside MarketProvider");
  return v;
}
