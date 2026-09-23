"""Create tables, load the 10 stocks + CSV market data, and create the demo account.

Run from the backend/ directory:

    python seed_database.py                    # migrate + seed (safe to re-run)
    python seed_database.py --reset            # drop everything first (wipes trades)
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from alembic import command  # noqa: E402
from alembic.config import Config  # noqa: E402
from sqlalchemy import func, select, text  # noqa: E402

from app.config import INITIAL_BALANCE, MARKET_DATA_CSV  # noqa: E402
from app.database import SessionLocal, engine  # noqa: E402
from app.models import MarketData, Stock, UserAccount  # noqa: E402
from app.services.seed import drop_tables, seed  # noqa: E402

BACKEND_DIR = Path(__file__).resolve().parent.parent


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--reset", action="store_true", help="drop all tables first (deletes trades)")
    args = parser.parse_args()

    if args.reset:
        print("Dropping existing tables...")
        drop_tables(engine)
        with engine.begin() as conn:
            conn.execute(text("DROP TABLE IF EXISTS alembic_version"))
    print("Applying database migrations (alembic upgrade head)...")
    command.upgrade(Config(str(BACKEND_DIR / "alembic.ini")), "head")
    print(f"Importing {MARKET_DATA_CSV.name}...")
    with SessionLocal() as session:
        seed(session)
        stocks = session.scalar(select(func.count()).select_from(Stock))
        rows = session.scalar(select(func.count()).select_from(MarketData))
        days = session.scalar(select(func.count(func.distinct(func.date(MarketData.timestamp)))))
        account = session.scalar(select(UserAccount))
    print(
        f"Done: {stocks} stocks, {rows} price rows over {days} trading days, "
        f"account '{account.name}' with cash ₹{account.cash_balance:,.2f} "
        f"(initial ₹{INITIAL_BALANCE:,})."
    )


if __name__ == "__main__":
    main()
