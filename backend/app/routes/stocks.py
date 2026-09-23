from __future__ import annotations

from datetime import date, datetime, time as dtime

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Stock
from app.schemas import HistoryPoint, PricePoint, StockDetail, StockSummary
from app.services import market
from app.services.errors import ServiceError
from app.services.portfolio import money, safe_pct

router = APIRouter(prefix="/api/stocks", tags=["stocks"])


def _summary(stock: Stock, snap: market.PriceSnapshot) -> dict:
    change = snap.price - snap.previous
    return dict(
        symbol=stock.symbol,
        name=stock.name,
        sector=stock.sector,
        current_price=money(snap.price),
        previous_price=money(snap.previous),
        change=money(change),
        change_percent=money(safe_pct(change, snap.previous)),
        as_of=snap.timestamp,
    )


@router.get("", response_model=list[StockSummary], summary="All stocks with their latest price")
def list_stocks(
    as_of: datetime | None = Query(None, description="Simulated market time; defaults to the latest data"),
    db: Session = Depends(get_db),
):
    at = market.resolve_as_of(db, as_of)
    stocks = list(db.scalars(select(Stock).order_by(Stock.symbol)))
    snaps = market.snapshots(db, at)
    return [StockSummary(**_summary(s, snaps[s.id])) for s in stocks if s.id in snaps]


@router.get("/{symbol}", response_model=StockDetail, summary="Stock details with price change")
def stock_detail(
    symbol: str,
    as_of: datetime | None = Query(None),
    db: Session = Depends(get_db),
):
    stock = market.get_stock(db, symbol)
    at = market.resolve_as_of(db, as_of)
    snap = market.snapshots(db, at, [stock.id]).get(stock.id)
    if snap is None:
        raise ServiceError(404, f"No market data for {stock.symbol} at or before {market.fmt_ts(at)}.")
    day_open, high, low = market.day_stats(db, stock, snap.timestamp)
    return StockDetail(
        **_summary(stock, snap), day_open=money(day_open), day_high=money(high), day_low=money(low)
    )


@router.get("/{symbol}/history", response_model=list[HistoryPoint], summary="Historical prices for charts")
def stock_history(
    symbol: str,
    start: str | None = Query(None, description="YYYY-MM-DD or ISO timestamp"),
    end: str | None = Query(None, description="YYYY-MM-DD or ISO timestamp"),
    db: Session = Depends(get_db),
):
    stock = market.get_stock(db, symbol)
    rows = market.history(db, stock, market.parse_bound(start, end=False), market.parse_bound(end, end=True))
    return [HistoryPoint(timestamp=r.timestamp, price=float(r.price)) for r in rows]


@router.get("/{symbol}/price", response_model=PricePoint, summary="Exact price at a selected date and time")
def price_at(
    symbol: str,
    date_: date = Query(..., alias="date", description="YYYY-MM-DD"),
    time_: dtime = Query(..., alias="time", description="HH:MM"),
    db: Session = Depends(get_db),
):
    stock = market.get_stock(db, symbol)
    ts = datetime.combine(date_, time_.replace(second=0, microsecond=0, tzinfo=None))
    row = market.exact_price(db, stock, ts)
    return PricePoint(symbol=stock.symbol, timestamp=row.timestamp, price=float(row.price))
