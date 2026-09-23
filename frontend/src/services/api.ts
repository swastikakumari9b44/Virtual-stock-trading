import axios, { AxiosError } from "axios";
import type {
  HistoryPoint,
  MarketTimeline,
  PerformancePoint,
  Portfolio,
  PricePoint,
  StockDetail,
  StockSummary,
  TradeResponse,
  TradeSide,
  TransactionFilters,
  TransactionPage,
} from "../types";

export const API_URL: string = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

const http = axios.create({ baseURL: API_URL, timeout: 15000 });

/** Turn any thrown value into a message that is safe to show a person. */
export function errorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const e = err as AxiosError<{ detail?: unknown }>;
    if (!e.response) {
      return e.code === "ECONNABORTED"
        ? "The server took too long to respond. Try again."
        : `Can't reach the trading server at ${API_URL}. Check that the backend is running.`;
    }
    const detail = e.response.data?.detail;
    if (typeof detail === "string" && detail) return detail;
    if (e.response.status >= 500) return "The server hit an unexpected error. Nothing was changed. Try again.";
    return `Request failed (${e.response.status}).`;
  }
  return err instanceof Error ? err.message : "Something went wrong.";
}

const asOfParams = (asOf?: string) => (asOf ? { as_of: asOf } : {});

export const api = {
  timeline: () => http.get<MarketTimeline>("/api/market/timeline").then((r) => r.data),
  stocks: (asOf?: string) =>
    http.get<StockSummary[]>("/api/stocks", { params: asOfParams(asOf) }).then((r) => r.data),
  stock: (symbol: string, asOf?: string) =>
    http.get<StockDetail>(`/api/stocks/${symbol}`, { params: asOfParams(asOf) }).then((r) => r.data),
  history: (symbol: string) =>
    http.get<HistoryPoint[]>(`/api/stocks/${symbol}/history`).then((r) => r.data),
  priceAt: (symbol: string, date: string, time: string) =>
    http.get<PricePoint>(`/api/stocks/${symbol}/price`, { params: { date, time } }).then((r) => r.data),
  portfolio: (asOf?: string) =>
    http.get<Portfolio>("/api/portfolio", { params: asOfParams(asOf) }).then((r) => r.data),
  performance: (asOf?: string) =>
    http.get<PerformancePoint[]>("/api/portfolio/performance", { params: asOfParams(asOf) }).then((r) => r.data),
  transactions: (f: TransactionFilters) =>
    http
      .get<TransactionPage>("/api/transactions", {
        params: {
          symbol: f.symbol || undefined,
          type: f.type || undefined,
          date: f.date || undefined,
          page: f.page ?? 1,
          page_size: f.pageSize ?? 15,
        },
      })
      .then((r) => r.data),
  trade: (side: TradeSide, symbol: string, quantity: number, timestamp: string) =>
    http
      .post<TradeResponse>(`/api/trade/${side.toLowerCase()}`, { symbol, quantity, timestamp })
      .then((r) => r.data),
};
