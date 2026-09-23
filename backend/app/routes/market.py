from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import MarketData, Stock
from app.schemas import MarketTimeline
from app.services import market

router = APIRouter(prefix="/api/market", tags=["market"])


@router.get("/timeline", response_model=MarketTimeline, summary="Every market timestamp (drives the simulation clock)")
def timeline(db: Session = Depends(get_db)):
    lo, hi = market.timeline_bounds(db)
    stamps = list(db.scalars(select(MarketData.timestamp).distinct().order_by(MarketData.timestamp)))
    days = len({t.date() for t in stamps})
    stocks = db.scalar(select(func.count()).select_from(Stock)) or 0
    return MarketTimeline(timestamps=stamps, start=lo, end=hi, trading_days=days, stock_count=stocks)
