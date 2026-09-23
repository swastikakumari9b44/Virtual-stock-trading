import { useCallback, useEffect, useRef, useState } from "react";
import { errorMessage } from "../services/api";

export interface ApiState<T> {
  data: T | null;
  error: string | null;
  /** True only while there is nothing to show yet (first load). */
  loading: boolean;
  /** True during any in-flight request, including background refreshes. */
  fetching: boolean;
  reload: () => void;
}

/**
 * Runs `fetcher` whenever `deps` change. Keeps the previous data on screen while
 * refreshing (so live simulation ticks don't flash spinners) and ignores stale responses.
 */
export function useApi<T>(fetcher: (() => Promise<T>) | null, deps: unknown[]): ApiState<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fetching, setFetching] = useState<boolean>(fetcher !== null);
  const [nonce, setNonce] = useState(0);
  const latest = useRef(0);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  useEffect(() => {
    const run = fetcherRef.current;
    if (!run) {
      setFetching(false);
      return;
    }
    const id = ++latest.current;
    setFetching(true);
    run()
      .then((d) => {
        if (id !== latest.current) return;
        setData(d);
        setError(null);
      })
      .catch((e) => {
        if (id !== latest.current) return;
        setError(errorMessage(e));
      })
      .finally(() => {
        if (id === latest.current) setFetching(false);
      });
  }, [...deps, nonce]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);
  return { data, error, loading: data === null && fetching, fetching, reload };
}
