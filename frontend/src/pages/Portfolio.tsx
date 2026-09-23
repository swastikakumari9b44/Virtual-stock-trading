import { Link } from "react-router-dom";
import { Delta, EmptyState, ErrorState, LoadingBlock, PageHeader } from "../components/ui";
import { usePortfolio } from "../context/PortfolioContext";
import { fmtDateTime, inr, num, pct, signedInr } from "../lib/format";

export default function Portfolio() {
  const { portfolio: p, error, loading } = usePortfolio();

  return (
    <>
      <PageHeader title="Portfolio" subtitle={p ? `Valued at market prices as of ${fmtDateTime(p.asOf)}.` : undefined} />

      {error && !p ? (
        <div className="card">
          <ErrorState message={error} />
        </div>
      ) : loading || !p ? (
        <div className="card">
          <LoadingBlock height="h-64" label="Loading portfolio…" />
        </div>
      ) : (
        <>
          <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line lg:grid-cols-3">
            <Metric label="Portfolio value" value={inr(p.portfolioValue)} big />
            <Metric label="Available cash" value={inr(p.cashBalance)} />
            <Metric label="Invested" value={inr(p.totalInvestedValue)} />
            <Metric label="Current value of holdings" value={inr(p.holdingsValue)} />
            <Metric
              label="Unrealised P&L"
              value={<Delta value={p.unrealizedPnl} text={signedInr(p.unrealizedPnl)} />}
            />
            <Metric
              label="Total P&L"
              value={<Delta value={p.totalPnl} text={`${signedInr(p.totalPnl)} (${pct(p.totalPnlPercentage)})`} />}
              note={`vs. ${inr(p.initialBalance)} starting capital`}
            />
          </dl>

          <div className="card mt-6 overflow-hidden">
            {p.holdings.length === 0 ? (
              <EmptyState
                title="Your portfolio is empty"
                body="You have all of your virtual cash available. Pick a stock to place your first trade."
                actionLabel="Browse markets"
                actionTo="/markets"
              />
            ) : (
              <div className="relative overflow-x-auto">
                <table className="w-full min-w-[820px] border-collapse">
                  <caption className="sr-only">Current holdings with profit and loss</caption>
                  <thead>
                    <tr>
                      <th className="th">Stock</th>
                      <th className="th text-right">Quantity</th>
                      <th className="th text-right">Avg. buy price</th>
                      <th className="th text-right">Current price</th>
                      <th className="th text-right">Invested</th>
                      <th className="th text-right">Current value</th>
                      <th className="th text-right">P&L</th>
                      <th className="th text-right">P&L %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {p.holdings.map((h) => (
                      <tr key={h.symbol} className="hover:bg-paper/60">
                        <td className="td">
                          <Link to={`/stocks/${h.symbol}`} className="font-semibold text-brand hover:underline">
                            {h.symbol}
                          </Link>
                          <span className="ml-2 text-xs text-muted">{h.name}</span>
                        </td>
                        <td className="td num text-right">{num(h.quantity)}</td>
                        <td className="td num text-right">{inr(h.averageBuyPrice)}</td>
                        <td className="td num text-right">{inr(h.currentPrice)}</td>
                        <td className="td num text-right">{inr(h.investedValue)}</td>
                        <td className="td num text-right font-medium">{inr(h.currentValue)}</td>
                        <td className="td text-right">
                          <Delta value={h.profitLoss} text={signedInr(h.profitLoss)} />
                        </td>
                        <td className="td text-right">
                          <Delta value={h.profitLoss} text={pct(h.profitLossPercentage)} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-paper/60 font-semibold">
                      <td className="td" colSpan={4}>
                        Total
                      </td>
                      <td className="td num text-right">{inr(p.totalInvestedValue)}</td>
                      <td className="td num text-right">{inr(p.holdingsValue)}</td>
                      <td className="td text-right">
                        <Delta value={p.unrealizedPnl} text={signedInr(p.unrealizedPnl)} />
                      </td>
                      <td className="td text-right">
                        <Delta
                          value={p.unrealizedPnl}
                          text={pct(p.totalInvestedValue > 0 ? (p.unrealizedPnl / p.totalInvestedValue) * 100 : 0)}
                        />
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
          <p className="mt-3 text-xs text-muted">
            P&L = current value − invested value. Total P&L = portfolio value (cash + holdings) − starting capital.
          </p>
        </>
      )}
    </>
  );
}

function Metric({ label, value, note, big }: { label: string; value: React.ReactNode; note?: string; big?: boolean }) {
  return (
    <div className="bg-white p-4 sm:p-5">
      <dt className="text-xs font-medium text-muted">{label}</dt>
      <dd className={`num mt-1 font-semibold ${big ? "text-2xl" : "text-lg"}`}>{value}</dd>
      {note && <dd className="mt-0.5 text-xs text-muted">{note}</dd>}
    </div>
  );
}
