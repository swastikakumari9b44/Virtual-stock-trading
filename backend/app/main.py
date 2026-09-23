from __future__ import annotations

import logging

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.exc import SQLAlchemyError

from app.config import CORS_ORIGINS
from app.routes import market, portfolio, stocks, trade, transactions
from app.services.errors import ServiceError

log = logging.getLogger("virtual_trading")

app = FastAPI(
    title="Virtual Stock Trading Platform",
    description="Educational simulator: dummy market data and virtual money only. No real transactions.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(ServiceError)
async def service_error_handler(_: Request, exc: ServiceError):
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.message})


@app.exception_handler(RequestValidationError)
async def validation_error_handler(_: Request, exc: RequestValidationError):
    messages = []
    for err in exc.errors():
        field = ".".join(str(p) for p in err["loc"] if p not in ("body", "query"))
        messages.append(f"{field}: {err['msg']}" if field else err["msg"])
    return JSONResponse(status_code=422, content={"detail": "; ".join(messages)})


@app.exception_handler(SQLAlchemyError)
async def database_error_handler(_: Request, exc: SQLAlchemyError):
    log.exception("Database error: %s", exc)
    return JSONResponse(status_code=500, content={"detail": "A database error occurred. Nothing was changed."})


for r in (market.router, stocks.router, trade.router, portfolio.router, transactions.router):
    app.include_router(r)


@app.get("/api/health", tags=["meta"])
def health():
    return {"status": "ok", "simulated": True}
