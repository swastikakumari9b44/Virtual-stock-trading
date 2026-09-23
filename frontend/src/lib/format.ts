const INR2 = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2, maximumFractionDigits: 2 });
const NUM = new Intl.NumberFormat("en-IN");
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export const MINUS = "\u2212";

export function inr(n: number, decimals = 2): string {
  const f =
    decimals === 2
      ? INR2
      : new Intl.NumberFormat("en-IN", {
          style: "currency",
          currency: "INR",
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals,
        });
  return f.format(n).replace("-", MINUS);
}

export function signedInr(n: number): string {
  if (Math.abs(n) < 0.005) return inr(0);
  return (n > 0 ? "+" : "") + inr(n);
}

export function pct(n: number, signed = true): string {
  const v = Math.abs(n) < 0.005 ? 0 : n;
  const s = Math.abs(v).toFixed(2) + "%";
  if (v > 0) return (signed ? "+" : "") + s;
  if (v < 0) return MINUS + s;
  return s;
}

export function num(n: number): string {
  return NUM.format(n);
}

interface Parts {
  y: number;
  m: number;
  d: number;
  hh: number;
  mm: number;
}

/** Parse "2026-09-08T11:30:00" without any timezone conversion. */
export function parts(ts: string): Parts {
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/.exec(ts);
  if (!m) return { y: 0, m: 1, d: 1, hh: 0, mm: 0 };
  return { y: +m[1], m: +m[2], d: +m[3], hh: +(m[4] ?? 0), mm: +(m[5] ?? 0) };
}

export function fmtDate(ts: string): string {
  const p = parts(ts);
  return `${p.d} ${MONTHS[p.m - 1]} ${p.y}`;
}

export function fmtShortDate(ts: string): string {
  const p = parts(ts);
  return `${p.d} ${MONTHS[p.m - 1]}`;
}

export function fmtTime(ts: string): string {
  const p = parts(ts);
  const h12 = p.hh % 12 === 0 ? 12 : p.hh % 12;
  return `${h12}:${String(p.mm).padStart(2, "0")} ${p.hh < 12 ? "AM" : "PM"}`;
}

/** 12 Sep 2026, 11:30 AM */
export function fmtDateTime(ts: string): string {
  return `${fmtDate(ts)}, ${fmtTime(ts)}`;
}

export const dateOf = (ts: string) => ts.slice(0, 10);
export const hhmmOf = (ts: string) => ts.slice(11, 16);
export const toIso = (date: string, hhmm: string) => `${date}T${hhmm}:00`;
