from __future__ import annotations

from datetime import datetime

from app.schemas.base import CamelModel


class StockSummary(CamelModel):
    symbol: str
    name: str
    sector: str
    current_price: float
    previous_price: float
    change: float
    change_percent: float
    as_of: datetime


class StockDetail(StockSummary):
    day_open: float
    day_high: float
    day_low: float


class HistoryPoint(CamelModel):
    timestamp: datetime
    price: float


class PricePoint(CamelModel):
    symbol: str
    timestamp: datetime
    price: float


class MarketTimeline(CamelModel):
    timestamps: list[datetime]
    start: datetime
    end: datetime
    trading_days: int
    stock_count: int
