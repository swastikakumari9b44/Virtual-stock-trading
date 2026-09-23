from __future__ import annotations

from datetime import datetime
from typing import Literal

from app.schemas.base import CamelModel


class TransactionOut(CamelModel):
    id: int
    timestamp: datetime
    symbol: str
    name: str
    transaction_type: Literal["BUY", "SELL"]
    quantity: int
    price: float
    total_amount: float


class TransactionPage(CamelModel):
    items: list[TransactionOut]
    total: int
    page: int
    page_size: int
