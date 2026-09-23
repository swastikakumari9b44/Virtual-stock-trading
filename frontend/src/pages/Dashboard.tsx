import { Link } from "react-router-dom";
import { PerformanceChart } from "../components/charts";
import { Delta, EmptyState, ErrorState, LoadingBlock, SectionTitle, TypeBadge } from "../components/ui";
import { useMarket } from "../context/MarketContext";
import { usePortfolio } from "../context/PortfolioContext";
import { useApi } from "../hooks/useApi";
import { fmtDateTime, inr, num, pct, signedInr } from "../lib/format";
import { api } from "../services/api";

export default function Dashboard() {
  const { marketTs } = useMarket();
  const { portfolio, error: pfError, loading: pfLoading, dataVersion } = usePortfolio();
  const perf = useApi(() => api.performance(marketTs), [marketTs, dataVersion]);
  const stocks = useApi(() => api.stocks(marketTs), [marketTs]);
  const recent = useApi(() => api.transactions({ pageSize: 5 }), [dataVersion]);

  const movers = [...(stocks.data ?? [])].sort((a, b) => b.changePercent - a.changePercent);
  const up = movers.filter((s) => s.change > 0).length;
  const down = movers.filter((s) => s.change < 0).length;
  const topHoldings = [...(portfolio?.holdings ?? [])].sort((a, b) => b.currentValue - a.currentValue).slice(0, 5);
  const cashShare = portfolio && portfolio.portfolioValue > 0 ? (portfolio.cashBalance / portfolio.portfolioValue) * 100 : 100;

  return (
    <>
      <h1 className="sr-only">Dashboard</h1>

      <section className="card overflow-hidden" aria-label="Portfolio overview">
        {pfError && !portfolio ? (
          <ErrorState message={pfError} />
        ) : pfLoading || !portfolio ? (
          <LoadingBlock height="h-72" label="Loading portfolio…" />
        ) : (
          <div className="grid lg:grid-cols-[320px_1fr]">
            <div className="border-b border-line p-6 lg:border-b-0 lg:border-r">
              <p className="text-sm text-muted">Total portfolio value</p>
              <p className="num mt-1 text-[34px] font-semibold leading-tight tracking-tight">
                {inr(portfolio.portfolioValue)}
              </p>
              <p className="mt-1 text-sm">
                <Delta value={portfolio.totalPnl} text={`${signedInr(portfolio.totalPnl)} (${pct(portfolio.totalPnlPercentage)})`} />
                <span className="ml-1.5 text-muted">since you started</span>
              </p>

              <dl className="mt-6 divide-y divide-line text-sm">
                <Row label="Available cash" value={inr(portfolio.cashBalance)} />
                <Row label="Invested" value={inr(portfolio.totalInvestedValue)} />
                <Row label="Holdings value" value={inr(portfolio.holdingsValue)} />
                <Row
                  label="Unrealised P&L"
                  value={<Delta value={portfolio.unrealizedPnl} text={signedInr(portfolio.unrealizedPnl)} />}
                />
                <Row
                  label="Today's move"
                  value={<Delta value={portfolio.dayPnl} text={signedInr(portfolio.dayPnl)} />}
                  hint="Change in the value of what you hold since the previous close"
                />
              </dl>

              <div className="mt-5">
                <div className="flex h-2 overflow-hidden rounded-full bg-brand" role="img" aria-label={`${cashShare.toFixed(1)}% cash, ${(100 - cashShare).toFixed(1)}% invested`}>
                  <div className="bg-line" style={{ width: `${cashShare}%` }} />
                </div>
                <div className="num mt-1.5 flex justify-between text-xs text-muted">
                  <span>Cash {cashShare.toFixed(1)}%</span>
                  <span>Invested {(100 - cashShare).toFixed(1)}%</span>
                </div>
              </div>
            </div>

            <div className="p-5">
              <div className="mb-2 flex items-baseline justify-between">
                <h2 className="text-[15px] font-semibold">Portfolio value over time</h2>
                <span className="text-xs text-muted">Dashed line is your starting capital</span>
              </div>
              {perf.error && !perf.data ? (
                <ErrorState message={perf.error} onRetry={perf.reload} />
              ) : perf.data ? (
                <PerformanceChart data={perf.data} baseline={portfolio.initialBalance} />
              ) : (
                <LoadingBlock height="h-64" />
              )}
              {portfolio.holdings.length === 0 && (
                <p className="mt-1 text-center text-xs text-muted">
                  The line stays flat until you place a trade. <Link to="/markets" className="font-medium text-brand underline">Browse the market</Link>
                </p>
              )}
            </div>
          </div>
        )}
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="card overflow-hidden" aria-label="Top holdings">
          <SectionTitle aside={<Link to="/portfolio" className="text-sm font-medium text-brand hover:underline">All holdings</Link>}>
            Top holdings
          </SectionTitle>
          {!portfolio ? (
            <LoadingBlock />
          ) : topHoldings.length === 0 ? (
            <EmptyState title="No holdings yet" body="Buy your first shares and they will show up here with live P&L." actionLabel="Browse markets" actionTo="/markets" />
          ) : (
            <ul className="divide-y divide-line">
              {topHoldings.map((h) => (
                <li key={h.symbol}>
                  <Link to={`/stocks/${h.symbol}`} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-paper/70">
                    <div className="min-w-0">
                      <p className="font-semibold">{h.symbol}</p>
                      <p className="num text-xs text-muted">{num(h.quantity)} shares</p>
                    </div>
                    <div className="text-right">
                      <p className="num font-medium">{inr(h.currentValue)}</p>
                      <p className="text-xs">
                        <Delta value={h.profitLoss} text={`${signedInr(h.profitLoss)} (${pct(h.profitLossPercentage)})`} />
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card overflow-hidden" aria-label="Recent transactions">
          <SectionTitle aside={<Link to="/transactions" className="text-sm font-medium text-brand hover:underline">View all</Link>}>
            Recent transactions
          </SectionTitle>
          {recent.error && !recent.data ? (
            <ErrorState message={recent.error} onRetry={recent.reload} />
          ) : !recent.data ? (
            <LoadingBlock />
          ) : recent.data.items.length === 0 ? (
            <EmptyState title="No trades yet" body="Every buy and sell you make is recorded here." />
          ) : (
            <ul className="divide-y divide-line">
              {recent.data.items.map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 font-semibold">
                      {t.symbol} <TypeBadge type={t.transactionType} />
                    </p>
                    <p className="num text-xs text-muted">
                      {num(t.quantity)} × {inr(t.price)} · {fmtDateTime(t.timestamp)}
                    </p>
                  </div>
                  <p className="num font-medium">{inr(t.totalAmount)}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="card mt-6 overflow-hidden" aria-label="Market overview">
        <SectionTitle
          aside={
            stocks.data ? (
              <span className="num text-sm text-muted">
                {up} up · {down} down
              </span>
            ) : undefined
          }
        >
          Market overview
        </SectionTitle>
        {stocks.error && !stocks.data ? (
          <ErrorState message={stocks.error} onRetry={stocks.reload} />
        ) : !stocks.data ? (
          <LoadingBlock />
        ) : (
          <div className="grid divide-y divide-line md:grid-cols-2 md:divide-x md:divide-y-0">
            <MoverList title="Biggest gainers" items={movers.slice(0, 3)} />
            <MoverList title="Biggest decliners" items={[...movers].reverse().slice(0, 3)} />
          </div>
        )}
      </section>
    </>
  );
}

function Row({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5" title={hint}>
      <dt className="text-muted">{label}</dt>
      <dd className="num font-medium">{value}</dd>
    </div>
  );
}

function MoverList({ title, items }: { title: string; items: { symbol: string; name: string; currentPrice: number; change: number; changePercent: number }[] }) {
  return (
    <div>
      <p className="px-5 pb-1 pt-3 text-xs font-medium text-muted">{title}</p>
      <ul>
        {items.map((s) => (
          <li key={s.symbol}>
            <Link to={`/stocks/${s.symbol}`} className="flex items-center justify-between gap-3 px-5 py-2.5 hover:bg-paper/70">
              <div>
                <p className="font-semibold">{s.symbol}</p>
                <p className="text-xs text-muted">{s.name}</p>
              </div>
              <div className="text-right">
                <p className="num font-medium">{inr(s.currentPrice)}</p>
                <p className="text-xs">
                  <Delta value={s.change} text={pct(s.changePercent)} />
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
