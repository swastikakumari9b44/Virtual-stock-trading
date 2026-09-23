from __future__ import annotations

from datetime import datetime
from decimal import ROUND_HALF_UP, Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Holding, MarketData, Stock, Transaction, UserAccount
from app.schemas import HoldingOut, PerformancePoint, PortfolioOut
from app.services import market

ZERO = Decimal("0")
CENT = Decimal("0.01")


def money(x: Decimal) -> float:
    return float(x.quantize(CENT, rounding=ROUND_HALF_UP))


def safe_pct(numerator: Decimal, denominator: Decimal) -> Decimal:
    """Percentage that returns 0 instead of dividing by zero."""
    if denominator == 0:
        return ZERO
    return numerator / denominator * 100


def get_account(db: Session, *, lock: bool = False) -> UserAccount:
    q = select(UserAccount).order_by(UserAccount.id).limit(1)
    if lock:
        q = q.with_for_update()
    account = db.scalar(q)
    if account is None:
        raise market.ServiceError(503, "The demo account has not been created. Run the seed script first.")
    return account


def build_portfolio(db: Session, as_of: datetime | None = None) -> PortfolioOut:
    as_of = market.resolve_as_of(db, as_of)
    account = get_account(db)
    holdings = list(
        db.execute(
            select(Holding, Stock).join(Stock, Stock.id == Holding.stock_id).order_by(Stock.symbol)
        ).all()
    )
    ids = [h.stock_id for h, _ in holdings]
    snaps = market.snapshots(db, as_of, ids) if ids else {}
    refs = market.day_reference_prices(db, as_of) if ids else {}

    rows: list[HoldingOut] = []
    total_invested = holdings_value = day_pnl = ZERO
    for h, stock in holdings:
        snap = snaps.get(h.stock_id)
        # If a stock had no bar yet at `as_of`, fall back to the cost basis (P&L = 0).
        price = snap.price if snap else h.average_buy_price
        invested = h.average_buy_price * h.quantity
        current = price * h.quantity
        pnl = current - invested
        total_invested += invested
        holdings_value += current
        day_pnl += (price - refs.get(h.stock_id, price)) * h.quantity
        rows.append(
            HoldingOut(
                symbol=stock.symbol,
                name=stock.name,
                quantity=h.quantity,
                average_buy_price=money(h.average_buy_price),
                current_price=money(price),
                invested_value=money(invested),
                current_value=money(current),
                profit_loss=money(pnl),
                profit_loss_percentage=money(safe_pct(pnl, invested)),
            )
        )

    portfolio_value = account.cash_balance + holdings_value
    total_pnl = portfolio_value - account.initial_balance
    return PortfolioOut(
        cash_balance=money(account.cash_balance),
        initial_balance=money(account.initial_balance),
        total_invested_value=money(total_invested),
        holdings_value=money(holdings_value),
        portfolio_value=money(portfolio_value),
        unrealized_pnl=money(holdings_value - total_invested),
        total_pnl=money(total_pnl),
        total_pnl_percentage=money(safe_pct(total_pnl, account.initial_balance)),
        day_pnl=money(day_pnl),
        as_of=as_of,
        holdings=rows,
    )


def build_performance(db: Session, as_of: datetime | None = None) -> list[PerformancePoint]:
    """Portfolio value at every market timestamp up to `as_of`, replaying the trade log."""
    as_of = market.resolve_as_of(db, as_of)
    account = get_account(db)
    txns = list(db.scalars(select(Transaction).order_by(Transaction.timestamp, Transaction.id)))
    bars = db.execute(
        select(MarketData.timestamp, MarketData.stock_id, MarketData.price)
        .where(MarketData.timestamp <= as_of)
        .order_by(MarketData.timestamp)
    ).all()

    by_ts: dict[datetime, dict[int, Decimal]] = {}
    for ts, sid, price in bars:
        by_ts.setdefault(ts, {})[sid] = price

    cash = account.initial_balance
    qty: dict[int, int] = {}
    last_price: dict[int, Decimal] = {}
    i = 0
    out: list[PerformancePoint] = []
    for ts in sorted(by_ts):
        while i < len(txns) and txns[i].timestamp <= ts:
            t = txns[i]
            if t.transaction_type == "BUY":
                cash -= t.total_amount
                qty[t.stock_id] = qty.get(t.stock_id, 0) + t.quantity
            else:
                cash += t.total_amount
                qty[t.stock_id] = qty.get(t.stock_id, 0) - t.quantity
            i += 1
        last_price.update(by_ts[ts])
        value = cash + sum(q * last_price.get(sid, ZERO) for sid, q in qty.items() if q)
        out.append(PerformancePoint(timestamp=ts, value=money(value)))
    return out
