import { useEffect, useRef, useState } from "react";
import { usePortfolio } from "../context/PortfolioContext";
import { useToast } from "../context/ToastContext";
import { fmtDateTime, inr, num } from "../lib/format";
import { api, errorMessage } from "../services/api";
import type { TradeSide } from "../types";
import { ConfirmDialog } from "./ConfirmDialog";

interface Props {
  symbol: string;
  name: string;
  /** Market timestamp the trade will execute at. */
  tradeTs: string;
  /** Price at tradeTs as returned by the server, or null when unavailable. */
  price: number | null;
  priceLoading: boolean;
  priceError: string | null;
  autoFocus?: boolean;
}

const MAX_QTY = 1_000_000;

export function TradePanel({ symbol, name, tradeTs, price, priceLoading, priceError, autoFocus }: Props) {
  const { portfolio, refresh } = usePortfolio();
  const toast = useToast();
  const [qtyText, setQtyText] = useState("10");
  const [busy, setBusy] = useState<TradeSide | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{ ts: string; price: number; qty: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  const trimmed = qtyText.trim();
  const qty = /^\d+$/.test(trimmed) ? parseInt(trimmed, 10) : NaN;
  const qtyValid = Number.isInteger(qty) && qty > 0 && qty <= MAX_QTY;
  const total = qtyValid && price !== null ? qty * price : null;
  const cash = portfolio?.cashBalance ?? 0;
  const owned = portfolio?.holdings.find((h) => h.symbol === symbol)?.quantity ?? 0;
  const maxAffordable = price ? Math.floor(cash / price) : 0;
  const canTrade = qtyValid && price !== null && busy === null;

  let qtyHint: string | null = null;
  if (trimmed !== "" && !qtyValid) qtyHint = "Enter a whole number of shares, 1 or more.";
  else if (total !== null && total > cash) qtyHint = `That's more than your available cash (${inr(cash)}).`;

  async function trade(side: TradeSide, ts: string) {
    if (!qtyValid) return;
    setBusy(side);
    setFailure(null);
    try {
      const res = await api.trade(side, symbol, qty, ts);
      toast.success(res.message);
      refresh();
      setConfirm(null);
    } catch (e) {
      const msg = errorMessage(e);
      setFailure(msg);
      toast.error(msg);
      setConfirm(null);
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="card p-5" aria-label={`Trade ${symbol}`}>
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold">{symbol}</h2>
        <span className="truncate text-sm text-muted">{name}</span>
      </div>

      <dl className="mt-4 space-y-3">
        <div>
          <dt className="text-xs font-medium text-muted">Selected price</dt>
          <dd className="num mt-0.5 text-2xl font-semibold">
            {price !== null ? inr(price) : priceLoading ? "…" : "Unavailable"}
          </dd>
          <dd className="mt-0.5 text-xs text-muted">at {fmtDateTime(tradeTs)}</dd>
          {priceError && !priceLoading && (
            <dd className="mt-2 rounded-md bg-loss-soft px-3 py-2 text-xs text-loss" role="alert">
              {priceError}
            </dd>
          )}
        </div>
      </dl>

      <div className="mt-4">
        <label htmlFor="qty" className="label">
          Quantity
        </label>
        <input
          id="qty"
          ref={inputRef}
          className="input num"
          inputMode="numeric"
          autoComplete="off"
          value={qtyText}
          onChange={(e) => {
            setQtyText(e.target.value);
            setFailure(null);
          }}
          aria-invalid={qtyHint !== null && !qtyValid}
          aria-describedby="qty-hint"
        />
        <p id="qty-hint" className={`mt-1 min-h-4 text-xs ${qtyHint ? "text-loss" : "text-muted"}`}>
          {qtyHint ??
            (price
              ? `You own ${num(owned)} · you can afford up to ${num(maxAffordable)}`
              : `You own ${num(owned)}`)}
        </p>
      </div>

      <div className="mt-3 flex items-baseline justify-between border-t border-line pt-3">
        <span className="text-sm text-muted">Estimated total</span>
        <span className="num text-lg font-semibold">{total !== null ? inr(total) : "\u2014"}</span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <button className="btn-primary" disabled={!canTrade} onClick={() => trade("BUY", tradeTs)}>
          {busy === "BUY" ? "Buying…" : "BUY"}
        </button>
        <button
          className="btn-sell"
          disabled={!canTrade}
          onClick={() => price !== null && setConfirm({ ts: tradeTs, price, qty })}
        >
          SELL
        </button>
      </div>

      {failure && (
        <p className="mt-3 rounded-md bg-loss-soft px-3 py-2 text-sm text-loss" role="alert">
          {failure}
        </p>
      )}
      <p className="mt-3 text-xs text-muted">
        The estimate updates as you type. The server prices and validates every order.
      </p>

      {confirm && (
        <ConfirmDialog
          title={`Sell ${num(confirm.qty)} ${symbol}?`}
          confirmLabel="Confirm sell"
          busy={busy === "SELL"}
          onConfirm={() => trade("SELL", confirm.ts)}
          onCancel={() => setConfirm(null)}
        >
          <p>
            Estimated proceeds <span className="num font-semibold text-ink">{inr(confirm.qty * confirm.price)}</span> at{" "}
            <span className="num">{inr(confirm.price)}</span> per share, priced at {fmtDateTime(confirm.ts)}.
          </p>
          <p className="mt-2">Virtual money only. The final price is set by the server.</p>
        </ConfirmDialog>
      )}
    </section>
  );
}
