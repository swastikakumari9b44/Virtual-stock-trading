"""Idempotent database seeding, shared by the CLI script and the tests."""
from __future__ import annotations

import csv
from datetime import datetime
from decimal import Decimal
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session

from app.config import ACCOUNT_NAME, INITIAL_BALANCE, MARKET_DATA_CSV
from app.database import Base
from app.models import MarketData, Stock, UserAccount

SECTORS = {
    "AAPL": "Technology",
    "MSFT": "Technology",
    "GOOGL": "Communication Services",
    "AMZN": "Consumer Discretionary",
    "TSLA": "Automotive",
    "NVDA": "Semiconductors",
    "META": "Communication Services",
    "NFLX": "Communication Services",
    "AMD": "Semiconductors",
    "INTC": "Semiconductors",
}


def create_tables(engine: Engine) -> None:
    Base.metadata.create_all(engine)


def drop_tables(engine: Engine) -> None:
    Base.metadata.drop_all(engine)


def seed(session: Session, csv_path: Path = MARKET_DATA_CSV) -> dict[str, int]:
    """Insert stocks, CSV market data and the predefined account. Safe to re-run."""
    with open(csv_path, newline="") as fh:
        rows = list(csv.DictReader(fh))
    if not rows:
        raise SystemExit(f"{csv_path} is empty")

    names: dict[str, str] = {}
    for r in rows:
        names.setdefault(r["symbol"], r["name"])

    for symbol, name in names.items():
        if session.scalar(select(Stock).where(Stock.symbol == symbol)) is None:
            session.add(Stock(symbol=symbol, name=name, sector=SECTORS.get(symbol, "Other")))
    session.flush()
    ids = {s.symbol: s.id for s in session.scalars(select(Stock))}

    payload = [
        {
            "stock_id": ids[r["symbol"]],
            "timestamp": datetime.strptime(r["timestamp"], "%Y-%m-%d %H:%M:%S"),
            "price": Decimal(r["price"]),
        }
        for r in rows
    ]
    for i in range(0, len(payload), 1000):
        stmt = pg_insert(MarketData).values(payload[i : i + 1000])
        session.execute(stmt.on_conflict_do_nothing(constraint="uq_market_data_stock_timestamp"))

    if session.scalar(select(UserAccount)) is None:
        session.add(
            UserAccount(
                name=ACCOUNT_NAME,
                initial_balance=Decimal(INITIAL_BALANCE),
                cash_balance=Decimal(INITIAL_BALANCE),
            )
        )
    session.commit()
    return {"stocks": len(names), "market_rows": len(payload)}
