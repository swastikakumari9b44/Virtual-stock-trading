from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas import TradeRequest, TradeResponse
from app.services.trading import execute_trade

router = APIRouter(prefix="/api/trade", tags=["trade"])


@router.post("/buy", response_model=TradeResponse, summary="Buy shares with virtual cash")
def buy(body: TradeRequest, db: Session = Depends(get_db)):
    return execute_trade(db, "BUY", body.symbol, body.quantity, body.timestamp)


@router.post("/sell", response_model=TradeResponse, summary="Sell shares you own (no short selling)")
def sell(body: TradeRequest, db: Session = Depends(get_db)):
    return execute_trade(db, "SELL", body.symbol, body.quantity, body.timestamp)
