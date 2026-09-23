import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { useApi } from "../hooks/useApi";
import { api } from "../services/api";
import type { Portfolio } from "../types";
import { useMarket } from "./MarketContext";

interface PortfolioApi {
  portfolio: Portfolio | null;
  error: string | null;
  loading: boolean;
  /** Bumped after every trade; include it in a hook's deps to refetch that data. */
  dataVersion: number;
  /** Call after a successful trade to refresh balance, holdings, P&L and history everywhere. */
  refresh: () => void;
}

const Ctx = createContext<PortfolioApi | null>(null);

export function PortfolioProvider({ children }: { children: ReactNode }) {
  const { marketTs } = useMarket();
  const [dataVersion, setVersion] = useState(0);
  const { data, error, loading } = useApi(() => api.portfolio(marketTs), [marketTs, dataVersion]);
  const refresh = useCallback(() => setVersion((v) => v + 1), []);
  const value = useMemo(
    () => ({ portfolio: data, error, loading, dataVersion, refresh }),
    [data, error, loading, dataVersion, refresh],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePortfolio(): PortfolioApi {
  const v = useContext(Ctx);
  if (!v) throw new Error("usePortfolio must be used inside PortfolioProvider");
  return v;
}
