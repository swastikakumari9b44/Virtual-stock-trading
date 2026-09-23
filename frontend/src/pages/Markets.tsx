import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { SearchIcon } from "../components/icons";
import { Delta, EmptyState, ErrorState, LoadingBlock, PageHeader } from "../components/ui";
import { useMarket } from "../context/MarketContext";
import { useApi } from "../hooks/useApi";
import { inr, pct } from "../lib/format";
import { api } from "../services/api";
import type { StockSummary } from "../types";

type SortKey = "symbol" | "name" | "currentPrice" | "change" | "changePercent";

const COLUMNS: { key: SortKey; label: string; align?: "right" }[] = [
  { key: "symbol", label: "Symbol" },
  { key: "name", label: "Company" },
  { key: "currentPrice", label: "Current price", align: "right" },
  { key: "change", label: "Change", align: "right" },
  { key: "changePercent", label: "Change %", align: "right" },
];

export default function Markets() {
  const { marketTs } = useMarket();
  const navigate = useNavigate();
  const { data, error, loading, reload } = useApi(() => api.stocks(marketTs), [marketTs]);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "symbol", dir: 1 });

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = (data ?? []).filter((s) => !q || s.symbol.toLowerCase().includes(q) || s.name.toLowerCase().includes(q));
    return [...filtered].sort((a: StockSummary, b: StockSummary) => {
      const av = a[sort.key];
      const bv = b[sort.key];
      const c = typeof av === "string" ? av.localeCompare(bv as string) : (av as number) - (bv as number);
      return c * sort.dir;
    });
  }, [data, query, sort]);

  const toggle = (key: SortKey) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === 1 ? -1 : 1 } : { key, dir: key === "symbol" || key === "name" ? 1 : -1 }));

  return (
    <>
      <PageHeader
        title="Markets"
        subtitle="10 simulated stocks. Prices move as the market clock advances."
        actions={
          <div className="relative w-full sm:w-64">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" width={16} height={16} />
            <label htmlFor="stock-search" className="sr-only">
              Search stocks
            </label>
            <input
              id="stock-search"
              className="input pl-9"
              placeholder="Search symbol or company"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        }
      />

      <div className="card overflow-hidden">
        {error && !data ? (
          <ErrorState message={error} onRetry={reload} />
        ) : loading ? (
          <LoadingBlock height="h-64" label="Loading stocks…" />
        ) : rows.length === 0 ? (
          <EmptyState title="No stocks match" body={`Nothing matches "${query}". Try a ticker such as AAPL or a company name.`} />
        ) : (
          <div className="relative overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse">
              <caption className="sr-only">Simulated stocks and their latest prices</caption>
              <thead>
                <tr>
                  {COLUMNS.map((c) => {
                    const active = sort.key === c.key;
                    return (
                      <th
                        key={c.key}
                        className={`th ${c.align === "right" ? "text-right" : ""}`}
                        aria-sort={active ? (sort.dir === 1 ? "ascending" : "descending") : "none"}
                      >
                        <button onClick={() => toggle(c.key)} className="inline-flex items-center gap-1 font-semibold hover:text-ink">
                          {c.label}
                          <span aria-hidden className={active ? "text-ink" : "text-muted/40"}>
                            {active ? (sort.dir === 1 ? "\u2191" : "\u2193") : "\u2195"}
                          </span>
                        </button>
                      </th>
                    );
                  })}
                  <th className="th text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((s) => (
                  <tr key={s.symbol} className="hover:bg-paper/60">
                    <td className="td font-semibold">
                      <Link to={`/stocks/${s.symbol}`} className="text-brand hover:underline">
                        {s.symbol}
                      </Link>
                    </td>
                    <td className="td">
                      {s.name}
                      <span className="ml-2 text-xs text-muted">{s.sector}</span>
                    </td>
                    <td className="td num text-right font-medium">{inr(s.currentPrice)}</td>
                    <td className="td text-right">
                      <Delta value={s.change} text={(s.change > 0 ? "+" : s.change < 0 ? "\u2212" : "") + Math.abs(s.change).toFixed(2)} />
                    </td>
                    <td className="td text-right">
                      <Delta value={s.change} text={pct(s.changePercent)} />
                    </td>
                    <td className="td">
                      <div className="flex justify-end gap-2">
                        <button className="btn-primary !px-3 !py-1.5" onClick={() => navigate(`/stocks/${s.symbol}?focus=trade`)} aria-label={`Buy ${s.symbol}`}>
                          Buy
                        </button>
                        <Link to={`/stocks/${s.symbol}`} className="btn-quiet !px-3 !py-1.5" aria-label={`View details for ${s.symbol}`}>
                          Details
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <p className="mt-3 text-xs text-muted">Change is measured against the previous 30-minute price.</p>
    </>
  );
}
