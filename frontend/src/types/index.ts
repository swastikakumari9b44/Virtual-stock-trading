export interface StockSummary {
  symbol: string;
  name: string;
  sector: string;
  currentPrice: number;
  previousPrice: number;
  change: number;
  changePercent: number;
  asOf: string;
}

export interface StockDetail extends StockSummary {
  dayOpen: number;
  dayHigh: number;
  dayLow: number;
}

export interface HistoryPoint {
  timestamp: string;
  price: number;
}

export interface PricePoint {
  symbol: string;
  timestamp: string;
  price: number;
}

export interface MarketTimeline {
  timestamps: string[];
  start: string;
  end: string;
  tradingDays: number;
  stockCount: number;
}

export interface Holding {
  symbol: string;
  name: string;
  quantity: number;
  averageBuyPrice: number;
  currentPrice: number;
  investedValue: number;
  currentValue: number;
  profitLoss: number;
  profitLossPercentage: number;
}

export interface Portfolio {
  cashBalance: number;
  initialBalance: number;
  totalInvestedValue: number;
  holdingsValue: number;
  portfolioValue: number;
  unrealizedPnl: number;
  totalPnl: number;
  totalPnlPercentage: number;
  dayPnl: number;
  asOf: string;
  holdings: Holding[];
}

export interface PerformancePoint {
  timestamp: string;
  value: number;
}

export type TradeSide = "BUY" | "SELL";

export interface Transaction {
  id: number;
  timestamp: string;
  symbol: string;
  name: string;
  transactionType: TradeSide;
  quantity: number;
  price: number;
  totalAmount: number;
}

export interface TransactionPage {
  items: Transaction[];
  total: number;
  page: number;
  pageSize: number;
}

export interface TradeResponse {
  message: string;
  transaction: Transaction;
  portfolio: Portfolio;
}

export interface TransactionFilters {
  symbol?: string;
  type?: TradeSide;
  date?: string;
  page?: number;
  pageSize?: number;
}
