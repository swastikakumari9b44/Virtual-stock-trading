"""Generate deterministic, fictional market data for the simulator.

Usage (from the backend/ directory):
    python scripts/generate_market_data.py

Writes data/market_data.csv: 10 stocks x 12 consecutive trading days (2026-09-01 to 2026-09-12) x 14 half-hour bars.
Prices are produced by a seeded random walk, so every run yields identical
output. None of this is real market data.
"""
from __future__ import annotations

import csv
import random
from datetime import date, datetime, timedelta
from pathlib import Path

OUTPUT = Path(__file__).resolve().parent.parent / "data" / "market_data.csv"

# symbol, name, starting price, per-bar volatility, per-bar drift
STOCKS = [
    ("AAPL", "Apple", 181.25, 0.0030, 0.00005),
    ("MSFT", "Microsoft", 412.40, 0.0028, 0.00006),
    ("GOOGL", "Alphabet", 141.80, 0.0034, 0.00003),
    ("AMZN", "Amazon", 178.55, 0.0036, 0.00004),
    ("TSLA", "Tesla", 248.30, 0.0062, -0.00002),
    ("NVDA", "NVIDIA", 121.75, 0.0058, 0.00012),
    ("META", "Meta", 503.10, 0.0040, 0.00005),
    ("NFLX", "Netflix", 622.90, 0.0042, 0.00004),
    ("AMD", "AMD", 164.20, 0.0055, 0.00002),
    ("INTC", "Intel", 31.45, 0.0048, -0.00008),
]

SLOTS = [(9 + (30 + 30 * i) // 60, (30 + 30 * i) % 60) for i in range(14)]  # 09:30 .. 16:00
FIRST_DAY = date(2026, 9, 1)
TRADING_DAYS = 12


def trading_days(start: date, count: int) -> list[date]:
    days, d = [], start
    while len(days) < count:
        days.append(d)  # simulated market: open every calendar day so all spec example dates exist
        d += timedelta(days=1)
    return days


def main() -> None:
    days = trading_days(FIRST_DAY, TRADING_DAYS)
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    with OUTPUT.open("w", newline="") as fh:
        writer = csv.writer(fh, lineterminator="\n")
        writer.writerow(["symbol", "name", "timestamp", "price"])
        for symbol, name, start_price, vol, drift in STOCKS:
            rng = random.Random(f"virtual-trading-{symbol}")
            price = start_price
            for day in days:
                price *= 1 + rng.gauss(0, vol * 1.6)  # overnight gap
                for hour, minute in SLOTS:
                    price *= 1 + drift + rng.gauss(0, vol)
                    price = max(price, 1.0)
                    ts = datetime(day.year, day.month, day.day, hour, minute)
                    writer.writerow([symbol, name, ts.strftime("%Y-%m-%d %H:%M:%S"), f"{price:.2f}"])
    print(f"Wrote {len(STOCKS) * len(days) * len(SLOTS)} rows to {OUTPUT}")


if __name__ == "__main__":
    main()
