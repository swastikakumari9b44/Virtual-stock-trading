from __future__ import annotations

from datetime import date, datetime, time, timedelta

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import Stock, Transaction
from app.schemas import TransactionOut, TransactionPage


def list_transactions(
    db: Session,
    *,
    symbol: str | None,
    side: str | None,
    on_date: date | None,
    page: int,
    page_size: int,
) -> TransactionPage:
    q = select(Transaction, Stock).join(Stock, Stock.id == Transaction.stock_id)
    if symbol:
        q = q.where(Stock.symbol == symbol.strip().upper())
    if side:
        q = q.where(Transaction.transaction_type == side)
    if on_date:
        start = datetime.combine(on_date, time.min)
        q = q.where(Transaction.timestamp >= start, Transaction.timestamp < start + timedelta(days=1))

    total = db.scalar(select(func.count()).select_from(q.subquery())) or 0
    rows = db.execute(
        q.order_by(Transaction.timestamp.desc(), Transaction.id.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    ).all()
    items = [
        TransactionOut(
            id=t.id,
            timestamp=t.timestamp,
            symbol=s.symbol,
            name=s.name,
            transaction_type=t.transaction_type,  # type: ignore[arg-type]
            quantity=t.quantity,
            price=float(t.price),
            total_amount=float(t.total_amount),
        )
        for t, s in rows
    ]
    return TransactionPage(items=items, total=total, page=page, page_size=page_size)
