from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")

DEFAULT_DATABASE_URL = "postgresql://postgres:password@localhost:5432/virtual_trading"


def _normalise_url(url: str) -> str:
    """Accept plain postgresql:// URLs and route them through the psycopg 3 driver."""
    if url.startswith("postgres://"):
        url = "postgresql://" + url[len("postgres://"):]
    if url.startswith("postgresql://"):
        url = "postgresql+psycopg://" + url[len("postgresql://"):]
    return url


DATABASE_URL = _normalise_url(os.getenv("DATABASE_URL", DEFAULT_DATABASE_URL))
CORS_ORIGINS = [
    o.strip()
    for o in os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",")
    if o.strip()
]
MARKET_DATA_CSV = Path(os.getenv("MARKET_DATA_CSV", BASE_DIR / "data" / "market_data.csv"))

ACCOUNT_NAME = "Demo Investor"
INITIAL_BALANCE = 1_000_000  # ₹10,00,000 of virtual money
