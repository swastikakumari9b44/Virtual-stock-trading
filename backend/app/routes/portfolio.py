from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas import PerformancePoint, PortfolioOut
from app.services import portfolio as svc

router = APIRouter(prefix="/api/portfolio", tags=["portfolio"])


@router.get("", response_model=PortfolioOut, summary="Cash, holdings, portfolio value and P&L")
def get_portfolio(
    as_of: datetime | None = Query(None, description="Simulated market time; defaults to the latest data"),
    db: Session = Depends(get_db),
):
    return svc.build_portfolio(db, as_of)


@router.get("/performance", response_model=list[PerformancePoint], summary="Portfolio value over time")
def get_performance(as_of: datetime | None = Query(None), db: Session = Depends(get_db)):
    return svc.build_performance(db, as_of)
