from __future__ import annotations

from decimal import Decimal

import pytest
from sqlalchemy import func, select

from app.models import Holding, Transaction

T1 = "2026-09-08T11:30:00"
T2 = "2026-09-09T14:00:00"


def price_of(client, symbol: str, ts: str) -> Decimal:
    date, time = ts.split("T")
    r = client.get(f"/api/stocks/{symbol}/price", params={"date": date, "time": time[:5]})
    assert r.status_code == 200, r.text
    return Decimal(str(r.json()["price"]))


def buy(client, symbol="AAPL", quantity=10, ts=T1, **extra):
    return client.post("/api/trade/buy", json={"symbol": symbol, "quantity": quantity, "timestamp": ts, **extra})


def sell(client, symbol="AAPL", quantity=5, ts=T2):
    return client.post("/api/trade/sell", json={"symbol": symbol, "quantity": quantity, "timestamp": ts})


# 1. Get stocks ------------------------------------------------------------------------------
def test_get_stocks_returns_ten_with_prices(client):
    r = client.get("/api/stocks")
    assert r.status_code == 200
    data = r.json()
    assert len(data) == 10
    assert {s["symbol"] for s in data} >= {"AAPL", "MSFT", "GOOGL", "AMZN", "TSLA", "NVDA", "META", "NFLX", "AMD", "INTC"}
    for s in data:
        assert s["currentPrice"] > 0
        assert s["change"] == pytest.approx(s["currentPrice"] - s["previousPrice"], abs=0.011)


def test_stock_detail_and_unknown_symbol(client):
    r = client.get("/api/stocks/aapl")
    assert r.status_code == 200 and r.json()["symbol"] == "AAPL"
    assert client.get("/api/stocks/NOPE").status_code == 404


# 2. Historical data -------------------------------------------------------------------------
def test_history_full_and_filtered(client):
    full = client.get("/api/stocks/AAPL/history").json()
    assert len(full) == 12 * 14
    day = client.get("/api/stocks/AAPL/history", params={"start": "2026-09-01", "end": "2026-09-01"}).json()
    assert len(day) == 14
    assert day[0]["timestamp"] == "2026-09-01T09:30:00" and day[-1]["timestamp"] == "2026-09-01T16:00:00"
    assert client.get("/api/stocks/AAPL/history", params={"start": "garbage"}).status_code == 422


# 3. Price at selected timestamp ---------------------------------------------------------------
def test_price_at_exact_timestamp(client):
    r = client.get("/api/stocks/AAPL/price", params={"date": "2026-09-08", "time": "11:30"})
    assert r.status_code == 200
    body = r.json()
    assert body["timestamp"] == T1 and body["price"] > 0
    hist = {p["timestamp"]: p["price"] for p in client.get("/api/stocks/AAPL/history").json()}
    assert body["price"] == hist[T1]


@pytest.mark.parametrize(
    "date,time",
    [("2026-09-13", "11:30"), ("2026-09-08", "11:15"), ("2026-09-08", "17:00"), ("2027-01-01", "10:00")],
)
def test_price_missing_timestamp_is_a_clear_404(client, date, time):
    r = client.get("/api/stocks/AAPL/price", params={"date": date, "time": time})
    assert r.status_code == 404
    assert "No market price is available" in r.json()["detail"]


# 4. Successful BUY ----------------------------------------------------------------------------
def test_buy_success_updates_cash_holding_and_transaction(client, cash, db):
    p = price_of(client, "AAPL", T1)
    r = buy(client, quantity=10)
    assert r.status_code == 200, r.text
    body = r.json()
    total = p * 10
    assert Decimal(str(body["transaction"]["totalAmount"])) == total
    assert cash() == Decimal("1000000") - total
    h = body["portfolio"]["holdings"][0]
    assert (h["symbol"], h["quantity"], h["averageBuyPrice"]) == ("AAPL", 10, float(p))
    assert db.scalar(select(func.count()).select_from(Transaction)) == 1


def test_buy_recalculates_average_price(client, db):
    p1, p2 = price_of(client, "AAPL", T1), price_of(client, "AAPL", T2)
    assert buy(client, quantity=10, ts=T1).status_code == 200
    r = buy(client, quantity=5, ts=T2)
    expected = (p1 * 10 + p2 * 5) / 15
    h = r.json()["portfolio"]["holdings"][0]
    assert h["quantity"] == 15
    assert h["averageBuyPrice"] == pytest.approx(float(expected), abs=0.006)


def test_client_supplied_price_is_ignored(client):
    p = price_of(client, "AAPL", T1)
    r = buy(client, quantity=1, price=0.01)
    assert r.status_code == 200
    assert r.json()["transaction"]["price"] == float(p)


# 5. BUY with insufficient funds ---------------------------------------------------------------
def test_buy_insufficient_funds_changes_nothing(client, cash, db):
    r = buy(client, symbol="META", quantity=5000)
    assert r.status_code == 400
    assert "Insufficient virtual balance" in r.json()["detail"]
    assert cash() == Decimal("1000000")
    assert db.scalar(select(func.count()).select_from(Transaction)) == 0
    assert db.scalar(select(func.count()).select_from(Holding)) == 0


def test_buy_exactly_all_cash_is_allowed(client, cash):
    p = price_of(client, "INTC", T1)
    qty = int(Decimal("1000000") // p)
    assert buy(client, symbol="INTC", quantity=qty).status_code == 200
    assert cash() < p  # less than one more share left
    assert buy(client, symbol="INTC", quantity=int(cash() // p) + 1).status_code == 400


# 6. Successful SELL ---------------------------------------------------------------------------
def test_sell_success_and_full_sell_removes_holding(client, cash, db):
    p1, p2 = price_of(client, "AAPL", T1), price_of(client, "AAPL", T2)
    buy(client, quantity=10)
    r = sell(client, quantity=4)
    assert r.status_code == 200, r.text
    assert cash() == Decimal("1000000") - p1 * 10 + p2 * 4
    assert r.json()["portfolio"]["holdings"][0]["quantity"] == 6
    r = sell(client, quantity=6)
    assert r.status_code == 200
    assert r.json()["portfolio"]["holdings"] == []
    assert db.scalar(select(func.count()).select_from(Holding)) == 0
    assert db.scalar(select(func.count()).select_from(Transaction)) == 3


# 7. SELL with insufficient holdings ----------------------------------------------------------
def test_sell_more_than_owned_rejected(client, cash, db):
    buy(client, quantity=5)
    before = cash()
    r = sell(client, quantity=6)
    assert r.status_code == 400
    assert "cannot sell more shares than you own" in r.json()["detail"]
    assert cash() == before
    assert db.scalar(select(func.count()).select_from(Transaction)) == 1


def test_short_selling_not_allowed(client):
    r = sell(client, symbol="NVDA", quantity=1)
    assert r.status_code == 400
    assert "You hold 0 shares" in r.json()["detail"]


# 8. Portfolio calculation ---------------------------------------------------------------------
def test_portfolio_valuation_and_pnl(client):
    prices = {}
    buy(client, "AAPL", 10, T1)
    buy(client, "TSLA", 20, T1)
    for s in ("AAPL", "TSLA"):
        prices[s] = price_of(client, s, T1), price_of(client, s, T2)
    buy(client, "AAPL", 5, T2)

    later = "2026-09-11T15:00:00"
    r = client.get("/api/portfolio", params={"as_of": later})
    assert r.status_code == 200
    pf = r.json()

    now = {s: price_of(client, s, later) for s in ("AAPL", "TSLA")}
    aapl_cost = prices["AAPL"][0] * 10 + prices["AAPL"][1] * 5
    tsla_cost = prices["TSLA"][0] * 20
    holdings = {h["symbol"]: h for h in pf["holdings"]}

    a = holdings["AAPL"]
    assert a["quantity"] == 15
    assert a["averageBuyPrice"] == pytest.approx(float(aapl_cost / 15), abs=0.006)
    assert a["investedValue"] == pytest.approx(float(aapl_cost), abs=0.01)
    assert a["currentPrice"] == float(now["AAPL"])
    assert a["currentValue"] == pytest.approx(float(now["AAPL"] * 15), abs=0.01)
    assert a["profitLoss"] == pytest.approx(float(now["AAPL"] * 15 - aapl_cost), abs=0.01)
    assert a["profitLossPercentage"] == pytest.approx(float((now["AAPL"] * 15 - aapl_cost) / aapl_cost * 100), abs=0.01)

    cash = Decimal("1000000") - aapl_cost - tsla_cost
    value = cash + now["AAPL"] * 15 + now["TSLA"] * 20
    assert pf["cashBalance"] == pytest.approx(float(cash), abs=0.01)
    assert pf["totalInvestedValue"] == pytest.approx(float(aapl_cost + tsla_cost), abs=0.02)
    assert pf["portfolioValue"] == pytest.approx(float(value), abs=0.02)
    assert pf["totalPnl"] == pytest.approx(float(value - 1_000_000), abs=0.02)


def test_empty_portfolio_has_zero_pnl_and_no_division_errors(client):
    pf = client.get("/api/portfolio").json()
    assert pf["holdings"] == []
    assert pf["portfolioValue"] == 1_000_000 and pf["totalPnl"] == 0
    assert pf["totalPnlPercentage"] == 0 and pf["dayPnl"] == 0


def test_performance_series_tracks_trades(client):
    buy(client, "AAPL", 100, T1)
    series = client.get("/api/portfolio/performance", params={"as_of": "2026-09-08T16:00:00"}).json()
    by_ts = {p["timestamp"]: p["value"] for p in series}
    assert by_ts["2026-09-01T09:30:00"] == 1_000_000  # before the trade
    assert by_ts[T1] == pytest.approx(1_000_000, abs=0.01)  # priced at the trade -> no gain yet
    assert series[-1]["timestamp"] == "2026-09-08T16:00:00"
    pf = client.get("/api/portfolio", params={"as_of": "2026-09-08T16:00:00"}).json()
    assert series[-1]["value"] == pytest.approx(pf["portfolioValue"], abs=0.01)


# 9. Transaction creation / history ------------------------------------------------------------
def test_each_trade_creates_exactly_one_transaction_newest_first(client):
    buy(client, "AAPL", 10, T1)
    buy(client, "MSFT", 3, T1)
    sell(client, "AAPL", 4, T2)
    buy(client, "AAPL", 1000000, T1)  # fails: no transaction
    r = client.get("/api/transactions").json()
    assert r["total"] == 3
    assert [t["transactionType"] for t in r["items"]] == ["SELL", "BUY", "BUY"]
    assert [t["timestamp"] for t in r["items"]] == sorted([t["timestamp"] for t in r["items"]], reverse=True)
    for t in r["items"]:
        assert t["totalAmount"] == pytest.approx(t["quantity"] * t["price"], abs=0.01)


def test_transaction_filters_and_pagination(client):
    buy(client, "AAPL", 10, T1)
    buy(client, "MSFT", 3, T1)
    sell(client, "AAPL", 4, T2)
    assert client.get("/api/transactions", params={"symbol": "aapl"}).json()["total"] == 2
    assert client.get("/api/transactions", params={"type": "SELL"}).json()["total"] == 1
    assert client.get("/api/transactions", params={"date": "2026-09-09"}).json()["total"] == 1
    assert client.get("/api/transactions", params={"symbol": "AAPL", "type": "BUY", "date": "2026-09-09"}).json()["total"] == 0
    page = client.get("/api/transactions", params={"page_size": 2, "page": 2}).json()
    assert page["total"] == 3 and len(page["items"]) == 1
    assert client.get("/api/transactions", params={"type": "HOLD"}).status_code == 422


# 10. Invalid quantity ------------------------------------------------------------------------
@pytest.mark.parametrize("qty", [0, -5, 2.5, "abc", None])
def test_invalid_quantity_rejected(client, db, qty):
    for side in ("buy", "sell"):
        r = client.post(f"/api/trade/{side}", json={"symbol": "AAPL", "quantity": qty, "timestamp": T1})
        assert r.status_code == 422, (side, qty, r.text)
    assert db.scalar(select(func.count()).select_from(Transaction)) == 0


def test_unknown_symbol_and_missing_price_on_trade(client):
    assert buy(client, symbol="ZZZZ").status_code == 404
    r = buy(client, ts="2026-09-13T11:30:00")
    assert r.status_code == 404 and "No market price is available" in r.json()["detail"]


def test_spec_example_dates_exist_and_trade(client):
    """The assignment's own examples (2026-09-05 11:30, 2026-09-12) must resolve to real prices."""
    for d in ("2026-09-05", "2026-09-12"):
        r = client.get("/api/stocks/AAPL/price", params={"date": d, "time": "11:30"})
        assert r.status_code == 200, r.text
    r = buy(client, ts="2026-09-05T11:30:00")
    assert r.status_code == 200, r.text
