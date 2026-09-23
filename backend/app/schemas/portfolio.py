from __future__ import annotations

from datetime import datetime

from app.schemas.base import CamelModel


class HoldingOut(CamelModel):
    symbol: str
    name: str
    quantity: int
    average_buy_price: float
    current_price: float
    invested_value: float
    current_value: float
    profit_loss: float
    profit_loss_percentage: float


class PortfolioOut(CamelModel):
    cash_balance: float
    initial_balance: float
    total_invested_value: float
    holdings_value: float
    portfolio_value: float
    unrealized_pnl: float
    total_pnl: float
    total_pnl_percentage: float
    day_pnl: float
    as_of: datetime
    holdings: list[HoldingOut]


class PerformancePoint(CamelModel):
    timestamp: datetime
    value: float
