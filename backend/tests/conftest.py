"""Tests run against a real PostgreSQL database named <DATABASE_URL db>_test."""
from __future__ import annotations

import os
from decimal import Decimal

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.engine import make_url
from sqlalchemy.orm import sessionmaker

from app import config
from app.database import get_db
from app.main import app
from app.models import UserAccount
from app.services.seed import create_tables, seed


def _test_url():
    explicit = os.getenv("TEST_DATABASE_URL")
    if explicit:
        return make_url(config._normalise_url(explicit))
    url = make_url(config.DATABASE_URL)
    return url.set(database=f"{url.database}_test")


@pytest.fixture(scope="session")
def engine():
    url = _test_url()
    admin = create_engine(url.set(database="postgres"), isolation_level="AUTOCOMMIT")
    with admin.connect() as conn:
        exists = conn.scalar(text("SELECT 1 FROM pg_database WHERE datname = :n"), {"n": url.database})
        if not exists:
            conn.execute(text(f'CREATE DATABASE "{url.database}"'))
    admin.dispose()

    eng = create_engine(url)
    create_tables(eng)
    Session = sessionmaker(bind=eng, expire_on_commit=False)
    with Session() as s:
        seed(s)
    yield eng
    eng.dispose()


@pytest.fixture(scope="session")
def SessionFactory(engine):
    return sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


@pytest.fixture(autouse=True)
def clean_state(engine, SessionFactory):
    """Every test starts with no trades and the full ₹10,00,000."""
    with engine.begin() as conn:
        conn.execute(text("TRUNCATE transactions, holdings RESTART IDENTITY"))
        conn.execute(text("UPDATE user_account SET cash_balance = initial_balance"))


@pytest.fixture
def client(SessionFactory):
    def override():
        db = SessionFactory()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override
    yield TestClient(app)
    app.dependency_overrides.clear()


@pytest.fixture
def db(SessionFactory):
    with SessionFactory() as s:
        yield s


@pytest.fixture
def cash(db):
    def _cash() -> Decimal:
        db.expire_all()
        return db.query(UserAccount).one().cash_balance

    return _cash
