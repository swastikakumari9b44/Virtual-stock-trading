import type { ReactNode } from "react";
import { Link } from "react-router-dom";

export function Delta({ value, text, className = "" }: { value: number; text: string; className?: string }) {
  const dir = Math.abs(value) < 0.005 ? 0 : value > 0 ? 1 : -1;
  const color = dir > 0 ? "text-gain" : dir < 0 ? "text-loss" : "text-muted";
  // Arrow + explicit sign in `text` + screen-reader wording: colour is never the only cue.
  const arrow = dir > 0 ? "\u25B2" : dir < 0 ? "\u25BC" : "\u2013";
  return (
    <span className={`num inline-flex items-center gap-1 font-medium ${color} ${className}`}>
      <span aria-hidden className="text-[0.65em] leading-none">
        {arrow}
      </span>
      {text}
      <span className="sr-only">{dir > 0 ? " (up)" : dir < 0 ? " (down)" : " (unchanged)"}</span>
    </span>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {actions}
    </div>
  );
}

export function SectionTitle({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3.5">
      <h2 className="text-[15px] font-semibold">{children}</h2>
      {aside}
    </div>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-line/70 ${className}`} aria-hidden />;
}

export function LoadingBlock({ label = "Loading…", height = "h-40" }: { label?: string; height?: string }) {
  return (
    <div className={`grid ${height} place-items-center text-sm text-muted`} role="status">
      {label}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="m-5 rounded-lg border border-loss/30 bg-loss-soft px-4 py-3 text-sm" role="alert">
      <p className="font-semibold text-loss">This section didn't load</p>
      <p className="mt-0.5 text-ink/80">{message}</p>
      {onRetry && (
        <button className="btn-quiet mt-3 !py-1.5" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}

export function EmptyState({
  title,
  body,
  actionLabel,
  actionTo,
}: {
  title: string;
  body: string;
  actionLabel?: string;
  actionTo?: string;
}) {
  return (
    <div className="px-6 py-10 text-center">
      <p className="font-semibold">{title}</p>
      <p className="mx-auto mt-1 max-w-sm text-sm text-muted">{body}</p>
      {actionLabel && actionTo && (
        <Link to={actionTo} className="btn-primary mt-4">
          {actionLabel}
        </Link>
      )}
    </div>
  );
}

export function TypeBadge({ type }: { type: "BUY" | "SELL" }) {
  return type === "BUY" ? (
    <span className="inline-flex items-center gap-1 rounded bg-brand-soft px-2 py-0.5 text-xs font-semibold text-brand-strong">
      <span aria-hidden>+</span> BUY
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded bg-loss-soft px-2 py-0.5 text-xs font-semibold text-loss">
      <span aria-hidden>{"\u2212"}</span> SELL
    </span>
  );
}

export function Disclaimer({ className = "" }: { className?: string }) {
  return (
    <p className={`text-xs leading-relaxed text-muted ${className}`}>
      This platform uses simulated market data and virtual money for educational/demo purposes only. No real-money
      transactions are performed.
    </p>
  );
}
