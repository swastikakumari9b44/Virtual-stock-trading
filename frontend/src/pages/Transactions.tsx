import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { EmptyState, ErrorState, LoadingBlock, PageHeader, TypeBadge } from "../components/ui";
import { usePortfolio } from "../context/PortfolioContext";
import { useApi } from "../hooks/useApi";
import { useDebounced } from "../hooks/useDebounced";
import { fmtDateTime, inr, num } from "../lib/format";
import { api } from "../services/api";
import type { TradeSide } from "../types";

const PAGE_SIZE = 15;

export default function Transactions() {
  const { dataVersion } = usePortfolio();
  const stocks = useApi(() => api.stocks(), []);
  const [symbol, setSymbol] = useState("");
  const [type, setType] = useState<"" | TradeSide>("");
  const [date, setDate] = useState("");
  const [page, setPage] = useState(1);
  const debouncedSymbol = useDebounced(symbol.trim().toUpperCase(), 300);

  useEffect(() => setPage(1), [debouncedSymbol, type, date]);

  const { data, error, loading, reload } = useApi(
    () => api.transactions({ symbol: debouncedSymbol, type: type || undefined, date, page, pageSize: PAGE_SIZE }),
    [debouncedSymbol, type, date, page, dataVersion],
  );

  const filtered = Boolean(symbol || type || date);
  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;
  const from = data && data.total > 0 ? (data.page - 1) * data.pageSize + 1 : 0;
  const to = data ? Math.min(data.page * data.pageSize, data.total) : 0;

  return (
    <>
      <PageHeader title="Transactions" subtitle="Every buy and sell, newest first. Times are simulated market times." />

      <div className="card mb-5 grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_auto] lg:items-end">
        <div>
          <label htmlFor="f-symbol" className="label">
            Stock
          </label>
          <input
            id="f-symbol"
            list="symbols"
            className="input"
            placeholder="Any, or type a symbol"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            autoComplete="off"
          />
          <datalist id="symbols">
            {(stocks.data ?? []).map((s) => (
              <option key={s.symbol} value={s.symbol}>
                {s.name}
              </option>
            ))}
          </datalist>
        </div>
        <div>
          <label htmlFor="f-type" className="label">
            Transaction
          </label>
          <select id="f-type" className="input" value={type} onChange={(e) => setType(e.target.value as "" | TradeSide)}>
            <option value="">Buy and sell</option>
            <option value="BUY">Buy only</option>
            <option value="SELL">Sell only</option>
          </select>
        </div>
        <div>
          <label htmlFor="f-date" className="label">
            Trade date
          </label>
          <input id="f-date" type="date" className="input num" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <button
          className="btn-quiet"
          disabled={!filtered}
          onClick={() => {
            setSymbol("");
            setType("");
            setDate("");
          }}
        >
          Clear filters
        </button>
      </div>

      <div className="card overflow-hidden">
        {error && !data ? (
          <ErrorState message={error} onRetry={reload} />
        ) : loading || !data ? (
          <LoadingBlock height="h-64" label="Loading transactions…" />
        ) : data.items.length === 0 ? (
          filtered ? (
            <EmptyState title="No transactions match these filters" body="Try a different stock, type or date, or clear the filters." />
          ) : (
            <EmptyState title="No transactions yet" body="Buy or sell a stock and the trade will be recorded here." actionLabel="Browse markets" actionTo="/markets" />
          )
        ) : (
          <>
            <div className="relative overflow-x-auto">
              <table className="w-full min-w-[720px] border-collapse">
                <caption className="sr-only">Transaction history</caption>
                <thead>
                  <tr>
                    <th className="th">Timestamp</th>
                    <th className="th">Stock</th>
                    <th className="th">Transaction</th>
                    <th className="th text-right">Quantity</th>
                    <th className="th text-right">Price</th>
                    <th className="th text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((t) => (
                    <tr key={t.id} className="hover:bg-paper/60">
                      <td className="td num">{fmtDateTime(t.timestamp)}</td>
                      <td className="td">
                        <Link to={`/stocks/${t.symbol}`} className="font-semibold text-brand hover:underline">
                          {t.symbol}
                        </Link>
                        <span className="ml-2 text-xs text-muted">{t.name}</span>
                      </td>
                      <td className="td">
                        <TypeBadge type={t.transactionType} />
                      </td>
                      <td className="td num text-right">{num(t.quantity)}</td>
                      <td className="td num text-right">{inr(t.price)}</td>
                      <td className="td num text-right font-medium">{inr(t.totalAmount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
              <p className="num text-muted">
                Showing {from}–{to} of {num(data.total)}
              </p>
              <div className="flex items-center gap-2">
                <button className="btn-quiet !py-1.5" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  Previous
                </button>
                <span className="num text-muted">
                  Page {data.page} of {pages}
                </span>
                <button className="btn-quiet !py-1.5" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
