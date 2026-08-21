"""
SAATHI Backend — FastAPI Application
Main entry point with CORS, REST routes, and startup checks.
"""

import logging
import os
import threading
from datetime import datetime, timezone

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import FRONTEND_URL, GEMINI_API_KEY
from database import ping_db
from services.sentiment import preload_transformer

# Configure logging — replaces scattered print() with a single stream handler.
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("saathi")

app = FastAPI(
    title="SAATHI API",
    description="AI-powered social confidence and communication practice platform",
    version="1.0.0",
)

# CORS — allow the frontend dev server. Not using allow_credentials (no cookies),
# so we can be permissive for dev. Lock down origins in production.
ALLOWED_ORIGINS = [
    o.strip() for o in os.getenv(
        "CORS_ORIGINS",
        f"{FRONTEND_URL},http://localhost:5173,http://localhost:3000,https://saathi-brainwave.vercel.app"
    ).split(",") if o.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


START_TIME = datetime.now(timezone.utc)


@app.on_event("startup")
async def _startup_event():
    if not GEMINI_API_KEY:
        logger.warning(
            "GEMINI_API_KEY is not set — running in MOCK MODE. "
            "All AI responses will be drawn from a small canned set. "
            "Set GEMINI_API_KEY in backend/.env to enable live responses."
        )
    else:
        logger.info("GEMINI_API_KEY configured — live model responses enabled.")

    db_ok = await ping_db()
    if db_ok:
        logger.info("MongoDB connection OK.")
    else:
        logger.warning(
            "MongoDB ping failed — db-backed features will degrade. "
            "Verify MONGO_URI in backend/.env and that mongod is running."
        )

    # Pre-warm DistilRoBERTa Transformer model asynchronously in background
    try:
        threading.Thread(target=preload_transformer, daemon=True).start()
    except Exception as e:
        logger.warning("Background transformer thread trigger failed: %s", e)


@app.get("/")
async def root():
    return {
        "message": "SAATHI API is running",
        "version": "1.0.0",
        "uptime_seconds": (datetime.now(timezone.utc) - START_TIME).total_seconds(),
    }


@app.get("/health")
async def health_check():
    db_ok = await ping_db()
    return {
        "status": "healthy" if db_ok else "degraded",
        "database": "connected" if db_ok else "unavailable",
        "gemini": "configured" if GEMINI_API_KEY else "mock_mode",
        "version": "1.0.0",
        "uptime_seconds": (datetime.now(timezone.utc) - START_TIME).total_seconds(),
    }


# ── Register all routers ─────────────────────────────────────────────────────
from routers import (
    auth,
    chat,
    journey,
    peer,
    progress,
    roleplay,
    speech,
    user,
    weekly_note,
    sentiment,
    communication,
)  # noqa: E402

app.include_router(auth.router, prefix="/api", tags=["Authentication"])
app.include_router(
    communication.router,
    prefix="/api",
)
app.include_router(chat.router, prefix="/api", tags=["AI Companion"])
app.include_router(roleplay.router, prefix="/api", tags=["Roleplay"])
app.include_router(progress.router, prefix="/api", tags=["Progress"])
app.include_router(user.router, prefix="/api", tags=["User"])
app.include_router(peer.router, prefix="/api", tags=["Peer"])
app.include_router(speech.router, prefix="/api", tags=["Speech"])
app.include_router(journey.router, prefix="/api", tags=["Journey"])
app.include_router(weekly_note.router, prefix="/api", tags=["Weekly Note"])
app.include_router(sentiment.router, prefix="/api", tags=["Sentiment"])
