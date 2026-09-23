"""Market-data lookups. All prices come from the market_data table."""
from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime, time
from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import MarketData, Stock
from app.services.errors import ServiceError


@dataclass
class PriceSnapshot:
    price: Decimal
    previous: Decimal
    timestamp: datetime


def fmt_ts(ts: datetime) -> str:
    return ts.strftime("%d %b %Y, %H:%M")


def get_stock(db: Session, symbol: str) -> Stock:
    stock = db.scalar(select(Stock).where(Stock.symbol == symbol.strip().upper()))
    if stock is None:
        raise ServiceError(404, f"Stock '{symbol.strip().upper()}' was not found.")
    return stock


def timeline_bounds(db: Session) -> tuple[datetime, datetime]:
    lo, hi = db.execute(select(func.min(MarketData.timestamp), func.max(MarketData.timestamp))).one()
    if lo is None:
        raise ServiceError(503, "No market data has been loaded. Run the seed script first.")
    return lo, hi


def resolve_as_of(db: Session, as_of: datetime | None) -> datetime:
    """The valuation instant: the given timestamp, or the latest available data."""
    lo, hi = timeline_bounds(db)
    if as_of is None:
        return hi
    as_of = as_of.replace(tzinfo=None)
    if as_of < lo:
        raise ServiceError(400, f"as_of is before the first market timestamp ({fmt_ts(lo)}).")
    return min(as_of, hi)


def snapshots(db: Session, as_of: datetime, stock_ids: list[int] | None = None) -> dict[int, PriceSnapshot]:
    """Latest price at or before `as_of`, plus the bar before it, for each stock."""
    rn = (
        func.row_number()
        .over(partition_by=MarketData.stock_id, order_by=MarketData.timestamp.desc())
        .label("rn")
    )
    q = select(MarketData.stock_id, MarketData.timestamp, MarketData.price, rn).where(
        MarketData.timestamp <= as_of
    )
    if stock_ids is not None:
        q = q.where(MarketData.stock_id.in_(stock_ids))
    sub = q.subquery()
    rows = db.execute(
        select(sub.c.stock_id, sub.c.timestamp, sub.c.price, sub.c.rn)
        .where(sub.c.rn <= 2)
        .order_by(sub.c.stock_id, sub.c.rn)
    ).all()
    latest: dict[int, tuple[datetime, Decimal]] = {}
    previous: dict[int, Decimal] = {}
    for stock_id, ts, price, n in rows:
        if n == 1:
            latest[stock_id] = (ts, price)
        else:
            previous[stock_id] = price
    return {
        sid: PriceSnapshot(price=price, previous=previous.get(sid, price), timestamp=ts)
        for sid, (ts, price) in latest.items()
    }


def day_reference_prices(db: Session, as_of: datetime) -> dict[int, Decimal]:
    """Reference for "today's" move: previous session close, else today's first bar."""
    day_start = datetime.combine(as_of.date(), time.min)
    ref: dict[int, Decimal] = {}

    rn_close = (
        func.row_number()
        .over(partition_by=MarketData.stock_id, order_by=MarketData.timestamp.desc())
        .label("rn")
    )
    close_sub = (
        select(MarketData.stock_id, MarketData.price, rn_close)
        .where(MarketData.timestamp < day_start)
        .subquery()
    )
    for sid, price in db.execute(select(close_sub.c.stock_id, close_sub.c.price).where(close_sub.c.rn == 1)):
        ref[sid] = price

    rn_open = (
        func.row_number()
        .over(partition_by=MarketData.stock_id, order_by=MarketData.timestamp.asc())
        .label("rn")
    )
    open_sub = (
        select(MarketData.stock_id, MarketData.price, rn_open)
        .where(MarketData.timestamp >= day_start, MarketData.timestamp <= as_of)
        .subquery()
    )
    for sid, price in db.execute(select(open_sub.c.stock_id, open_sub.c.price).where(open_sub.c.rn == 1)):
        ref.setdefault(sid, price)
    return ref


def exact_price(db: Session, stock: Stock, ts: datetime) -> MarketData:
    """Exact-match price lookup. Never interpolates or invents a price."""
    row = db.scalar(
        select(MarketData).where(MarketData.stock_id == stock.id, MarketData.timestamp == ts)
    )
    if row is None:
        raise ServiceError(
            404,
            f"No market price is available for {stock.symbol} at {fmt_ts(ts)}. "
            "Pick a date between 1 and 12 Sep 2026 and a 30-minute mark between 09:30 and 16:00.",
        )
    return row


def history(db: Session, stock: Stock, start: datetime | None, end: datetime | None) -> list[MarketData]:
    q = select(MarketData).where(MarketData.stock_id == stock.id)
    if start is not None:
        q = q.where(MarketData.timestamp >= start)
    if end is not None:
        q = q.where(MarketData.timestamp <= end)
    return list(db.scalars(q.order_by(MarketData.timestamp)))


def day_stats(db: Session, stock: Stock, as_of: datetime) -> tuple[Decimal, Decimal, Decimal]:
    day_start = datetime.combine(as_of.date(), time.min)
    rows = list(
        db.scalars(
            select(MarketData.price)
            .where(
                MarketData.stock_id == stock.id,
                MarketData.timestamp >= day_start,
                MarketData.timestamp <= as_of,
            )
            .order_by(MarketData.timestamp)
        )
    )
    if not rows:
        raise ServiceError(404, f"No market data for {stock.symbol} on {as_of.date():%d %b %Y}.")
    return rows[0], max(rows), min(rows)


def parse_bound(value: str | None, *, end: bool) -> datetime | None:
    """Accept YYYY-MM-DD or a full ISO datetime for start/end filters."""
    if not value:
        return None
    try:
        if len(value) == 10:
            d = date.fromisoformat(value)
            return datetime.combine(d, time.max if end else time.min)
        return datetime.fromisoformat(value).replace(tzinfo=None)
    except ValueError:
        raise ServiceError(422, f"'{value}' is not a valid date. Use YYYY-MM-DD or an ISO timestamp.")
