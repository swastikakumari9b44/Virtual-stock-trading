from __future__ import annotations

from datetime import date
from typing import Literal

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas import TransactionPage
from app.services.transactions import list_transactions

router = APIRouter(prefix="/api/transactions", tags=["transactions"])


@router.get("", response_model=TransactionPage, summary="Transaction history, newest first")
def transactions(
    symbol: str | None = Query(None),
    type: Literal["BUY", "SELL"] | None = Query(None, description="BUY or SELL"),
    date: date | None = Query(None, description="Only trades executed on this market date"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    return list_transactions(db, symbol=symbol, side=type, on_date=date, page=page, page_size=page_size)
