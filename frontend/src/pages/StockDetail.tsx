import { useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { PriceChart } from "../components/charts";
import { TradePanel } from "../components/TradePanel";
import { Delta, ErrorState, LoadingBlock, SectionTitle } from "../components/ui";
import { useMarket } from "../context/MarketContext";
import { usePortfolio } from "../context/PortfolioContext";
import { useApi } from "../hooks/useApi";
import { dateOf, fmtDateTime, hhmmOf, inr, num, pct, signedInr, toIso } from "../lib/format";
import { api } from "../services/api";

export default function StockDetail() {
  const { symbol = "" } = useParams();
  const sym = symbol.toUpperCase();
  const [params] = useSearchParams();
  const { marketTs, timeline } = useMarket();
  const { portfolio, dataVersion } = usePortfolio();

  // null = follow the simulated market clock; otherwise a timestamp the person picked.
  const [custom, setCustom] = useState<string | null>(null);
  const [view, setView] = useState<"all" | "day">("all");
  const selectedTs = custom ?? marketTs;

  const detail = useApi(() => api.stock(sym, marketTs), [sym, marketTs, dataVersion]);
  const history = useApi(() => api.history(sym), [sym]);
  const lookup = useApi(() => api.priceAt(sym, dateOf(selectedTs), hhmmOf(selectedTs)), [sym, selectedTs]);

  const lookupPrice = lookup.data && lookup.data.timestamp === selectedTs ? lookup.data.price : null;
  const lookupError = lookup.error && !lookup.fetching ? lookup.error : null;
  const priceLoading = lookup.fetching && lookupPrice === null;
  const holding = portfolio?.holdings.find((h) => h.symbol === sym);

  const setDate = (d: string) => d && setCustom(toIso(d, hhmmOf(selectedTs)));
  const setTime = (t: string) => t && setCustom(toIso(dateOf(selectedTs), t));

  if (detail.error && !detail.data) {
    const notFound = /not found/i.test(detail.error);
    return (
      <div className="card">
        <ErrorState message={detail.error} onRetry={notFound ? undefined : detail.reload} />
        <p className="px-5 pb-5 text-sm">
          <Link to="/markets" className="font-medium text-brand underline">
            Back to markets
          </Link>
        </p>
      </div>
    );
  }
  if (!detail.data) return <LoadingBlock height="h-96" label="Loading stock…" />;

  const d = detail.data;
  return (
    <>
      <p className="mb-3 text-sm">
        <Link to="/markets" className="text-brand hover:underline">
          {"\u2190"} Markets
        </Link>
      </p>

      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {d.name} <span className="ml-1 text-lg font-medium text-muted">{d.symbol}</span>
          </h1>
          <p className="mt-0.5 text-sm text-muted">{d.sector}</p>
        </div>
        <div className="text-right">
          <p className="num text-3xl font-semibold tracking-tight">{inr(d.currentPrice)}</p>
          <p className="text-sm">
            <Delta value={d.change} text={`${signedInr(d.change)} (${pct(d.changePercent)})`} />
          </p>
        </div>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[1fr_340px]">
        <div className="min-w-0 space-y-6">
          <section className="card overflow-hidden" aria-label="Price history">
            <SectionTitle
              aside={
                <div className="inline-flex rounded-lg border border-line p-0.5 text-xs font-medium" role="group" aria-label="Chart range">
                  {(["all", "day"] as const).map((v) => (
                    <button
                      key={v}
                      onClick={() => setView(v)}
                      aria-pressed={view === v}
                      className={`rounded-md px-2.5 py-1 ${view === v ? "bg-brand text-white" : "text-muted hover:text-ink"}`}
                    >
                      {v === "all" ? "All sessions" : "One session"}
                    </button>
                  ))}
                </div>
              }
            >
              Price history
            </SectionTitle>
            <div className="px-2 pb-3 pt-4 sm:px-4">
              {history.error && !history.data ? (
                <ErrorState message={history.error} onRetry={history.reload} />
              ) : history.data ? (
                <PriceChart data={history.data} marketTs={marketTs} selectedTs={selectedTs} view={view} />
              ) : (
                <LoadingBlock height="h-72" label="Loading chart…" />
              )}
            </div>
            <div className="flex flex-wrap gap-x-5 gap-y-1 border-t border-line px-5 py-3 text-xs text-muted">
              <span className="inline-flex items-center gap-1.5">
                <span aria-hidden className="h-0.5 w-4 bg-brand" /> Up to market time
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span aria-hidden className="w-4 border-t-2 border-dashed border-[#9aa9b5]" /> Not reached yet
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span aria-hidden className="h-2.5 w-2.5 rounded-full border-[3px] border-[#b7791f] bg-white" /> Selected time
              </span>
              <span className="num ml-auto">
                Session: open {inr(d.dayOpen)} · high {inr(d.dayHigh)} · low {inr(d.dayLow)}
              </span>
            </div>
          </section>

          <section className="card overflow-hidden" aria-label="Price at a selected date and time">
            <SectionTitle
              aside={
                custom !== null && (
                  <button className="text-sm font-medium text-brand hover:underline" onClick={() => setCustom(null)}>
                    Use market time
                  </button>
                )
              }
            >
              Check the price at a date and time
            </SectionTitle>
            <div className="grid gap-4 p-5 sm:grid-cols-2">
              <div>
                <label htmlFor="pick-date" className="label">
                  Date
                </label>
                <input
                  id="pick-date"
                  type="date"
                  className="input num"
                  value={dateOf(selectedTs)}
                  min={dateOf(timeline.start)}
                  max={dateOf(timeline.end)}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="pick-time" className="label">
                  Time
                </label>
                <input
                  id="pick-time"
                  type="time"
                  step={1800}
                  className="input num"
                  value={hhmmOf(selectedTs)}
                  onChange={(e) => setTime(e.target.value)}
                />
              </div>
            </div>
            <div className="border-t border-line px-5 py-4" aria-live="polite">
              {lookupError ? (
                <p className="rounded-md bg-loss-soft px-3 py-2 text-sm text-loss" role="alert">
                  {lookupError}
                </p>
              ) : (
                <dl className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <dt className="text-xs font-medium text-muted">Selected Date & Time</dt>
                    <dd className="num mt-0.5 font-semibold">{fmtDateTime(selectedTs)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium text-muted">Price at Selected Time</dt>
                    <dd className="num mt-0.5 text-xl font-semibold">
                      {lookupPrice !== null ? inr(lookupPrice) : "…"}
                    </dd>
                    {lookupPrice !== null && Math.abs(d.currentPrice - lookupPrice) >= 0.005 && (
                      <dd className="mt-0.5 text-xs text-muted">
                        Market price now is {inr(d.currentPrice)} ({" "}
                        <Delta value={d.currentPrice - lookupPrice} text={pct(((d.currentPrice - lookupPrice) / lookupPrice) * 100)} /> since then)
                      </dd>
                    )}
                  </div>
                </dl>
              )}
              <p className="mt-3 text-xs text-muted">
                Prices exist for 1–12 Sep 2026, on 30-minute marks from 9:30 AM to 4:00 PM. Anything else returns a clear
                error rather than a made-up price.
              </p>
            </div>
          </section>
        </div>

        <div className="space-y-6 lg:sticky lg:top-20">
          <TradePanel
            symbol={d.symbol}
            name={d.name}
            tradeTs={selectedTs}
            price={lookupPrice}
            priceLoading={priceLoading}
            priceError={lookupError}
            autoFocus={params.get("focus") === "trade"}
          />
          <section className="card p-5" aria-label="Your position">
            <h2 className="text-[15px] font-semibold">Your position</h2>
            {holding ? (
              <dl className="mt-3 space-y-2 text-sm">
                <PosRow label="Shares" value={num(holding.quantity)} />
                <PosRow label="Avg. buy price" value={inr(holding.averageBuyPrice)} />
                <PosRow label="Current value" value={inr(holding.currentValue)} />
                <PosRow
                  label="P&L"
                  value={<Delta value={holding.profitLoss} text={`${signedInr(holding.profitLoss)} (${pct(holding.profitLossPercentage)})`} />}
                />
              </dl>
            ) : (
              <p className="mt-2 text-sm text-muted">You don't own any {d.symbol} yet.</p>
            )}
          </section>
        </div>
      </div>
    </>
  );
}

function PosRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-muted">{label}</dt>
      <dd className="num font-medium">{value}</dd>
    </div>
  );
}
