from __future__ import annotations

from datetime import datetime

from pydantic import Field, field_validator

from app.schemas.base import CamelModel
from app.schemas.portfolio import PortfolioOut
from app.schemas.transaction import TransactionOut


class TradeRequest(CamelModel):
    """Note: there is deliberately no price field. Prices come from market_data only."""

    symbol: str = Field(min_length=1, max_length=12)
    quantity: int = Field(gt=0, le=1_000_000, description="Positive whole number of shares")
    timestamp: datetime = Field(description="Market timestamp to trade at, e.g. 2026-09-05T11:30:00")

    @field_validator("symbol")
    @classmethod
    def _upper(cls, v: str) -> str:
        return v.strip().upper()

    @field_validator("timestamp")
    @classmethod
    def _naive(cls, v: datetime) -> datetime:
        # Market timestamps are exchange-local and stored without a timezone.
        return v.replace(tzinfo=None)


class TradeResponse(CamelModel):
    message: str
    transaction: TransactionOut
    portfolio: PortfolioOut
