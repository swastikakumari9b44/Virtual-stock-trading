from __future__ import annotations

from datetime import datetime
from decimal import Decimal

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Stock(Base):
    __tablename__ = "stocks"

    id: Mapped[int] = mapped_column(primary_key=True)
    symbol: Mapped[str] = mapped_column(String(12), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(100))
    sector: Mapped[str] = mapped_column(String(60))


class MarketData(Base):
    __tablename__ = "market_data"
    __table_args__ = (
        UniqueConstraint("stock_id", "timestamp", name="uq_market_data_stock_timestamp"),
        Index("ix_market_data_timestamp", "timestamp"),
        CheckConstraint("price > 0", name="ck_market_data_price_positive"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    stock_id: Mapped[int] = mapped_column(ForeignKey("stocks.id", ondelete="CASCADE"))
    timestamp: Mapped[datetime] = mapped_column(DateTime)
    price: Mapped[Decimal] = mapped_column(Numeric(12, 2))

    stock: Mapped[Stock] = relationship()


class UserAccount(Base):
    """The single predefined virtual account (no authentication in the MVP)."""

    __tablename__ = "user_account"
    __table_args__ = (CheckConstraint("cash_balance >= 0", name="ck_account_cash_non_negative"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100))
    initial_balance: Mapped[Decimal] = mapped_column(Numeric(14, 2))
    cash_balance: Mapped[Decimal] = mapped_column(Numeric(14, 2))


class Holding(Base):
    __tablename__ = "holdings"
    __table_args__ = (
        CheckConstraint("quantity > 0", name="ck_holdings_quantity_positive"),
        UniqueConstraint("stock_id", name="uq_holdings_stock"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    stock_id: Mapped[int] = mapped_column(ForeignKey("stocks.id"), index=True)
    quantity: Mapped[int] = mapped_column(Integer)
    average_buy_price: Mapped[Decimal] = mapped_column(Numeric(14, 4))

    stock: Mapped[Stock] = relationship()


class Transaction(Base):
    __tablename__ = "transactions"
    __table_args__ = (
        CheckConstraint("transaction_type IN ('BUY', 'SELL')", name="ck_transactions_type"),
        CheckConstraint("quantity > 0", name="ck_transactions_quantity_positive"),
        Index("ix_transactions_timestamp", "timestamp"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    stock_id: Mapped[int] = mapped_column(ForeignKey("stocks.id"), index=True)
    transaction_type: Mapped[str] = mapped_column(String(4))
    quantity: Mapped[int] = mapped_column(Integer)
    price: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    total_amount: Mapped[Decimal] = mapped_column(Numeric(14, 2))
    # Market timestamp the trade was executed at (not wall-clock time).
    timestamp: Mapped[datetime] = mapped_column(DateTime)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    stock: Mapped[Stock] = relationship()
