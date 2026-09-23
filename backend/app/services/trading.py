"""BUY / SELL execution. Everything happens in one database transaction."""
from __future__ import annotations

from datetime import datetime
from decimal import ROUND_HALF_UP, Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Holding, Transaction
from app.schemas import TradeResponse, TransactionOut
from app.services import market
from app.services.errors import ServiceError
from app.services.portfolio import build_portfolio, get_account

AVG_PRICE_PLACES = Decimal("0.0001")


def inr(x: Decimal) -> str:
    """Indian digit grouping, e.g. 1234567.5 -> ₹12,34,567.50"""
    s = f"{x:.2f}"
    whole, frac = s.split(".")
    sign = ""
    if whole.startswith("-"):
        sign, whole = "-", whole[1:]
    if len(whole) > 3:
        head, tail = whole[:-3], whole[-3:]
        parts = []
        while len(head) > 2:
            parts.insert(0, head[-2:])
            head = head[:-2]
        if head:
            parts.insert(0, head)
        whole = ",".join(parts + [tail])
    return f"{sign}₹{whole}.{frac}"


def _txn_out(t: Transaction, symbol: str, name: str) -> TransactionOut:
    return TransactionOut(
        id=t.id,
        timestamp=t.timestamp,
        symbol=symbol,
        name=name,
        transaction_type=t.transaction_type,  # type: ignore[arg-type]
        quantity=t.quantity,
        price=float(t.price),
        total_amount=float(t.total_amount),
    )


def execute_trade(db: Session, side: str, symbol: str, quantity: int, timestamp: datetime) -> TradeResponse:
    if quantity <= 0:
        raise ServiceError(422, "Quantity must be a positive whole number.")
    try:
        stock = market.get_stock(db, symbol)
        bar = market.exact_price(db, stock, timestamp)  # price ALWAYS comes from market_data
        price = bar.price
        total = (price * quantity).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

        # Lock the single account row: concurrent trades are serialised.
        account = get_account(db, lock=True)
        holding = db.scalar(select(Holding).where(Holding.stock_id == stock.id).with_for_update())

        if side == "BUY":
            if total > account.cash_balance:
                raise ServiceError(
                    400,
                    f"Insufficient virtual balance. This order costs {inr(total)} "
                    f"but you have {inr(account.cash_balance)} available.",
                )
            account.cash_balance -= total
            if holding is None:
                holding = Holding(stock_id=stock.id, quantity=quantity, average_buy_price=price)
                db.add(holding)
            else:
                new_qty = holding.quantity + quantity
                holding.average_buy_price = (
                    (holding.average_buy_price * holding.quantity + total) / new_qty
                ).quantize(AVG_PRICE_PLACES, rounding=ROUND_HALF_UP)
                holding.quantity = new_qty
            verb = "Bought"
        else:  # SELL (no short selling)
            owned = holding.quantity if holding else 0
            if quantity > owned:
                raise ServiceError(
                    400,
                    "You cannot sell more shares than you own. "
                    f"You hold {owned} share{'s' if owned != 1 else ''} of {stock.symbol}.",
                )
            account.cash_balance += total
            holding.quantity -= quantity
            if holding.quantity == 0:
                db.delete(holding)
            verb = "Sold"

        txn = Transaction(
            stock_id=stock.id,
            transaction_type=side,
            quantity=quantity,
            price=price,
            total_amount=total,
            timestamp=timestamp,
        )
        db.add(txn)
        db.flush()
        db.commit()
    except Exception:
        db.rollback()
        raise

    portfolio = build_portfolio(db, as_of=timestamp)
    return TradeResponse(
        message=f"{verb} {quantity} {stock.symbol} at {inr(price)} for {inr(total)}.",
        transaction=_txn_out(txn, stock.symbol, stock.name),
        portfolio=portfolio,
    )
