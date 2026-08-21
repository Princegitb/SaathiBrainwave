"""
SAATHI Journey Router
Tracks the user's current level on the 5-level Confidence Journey.
"""

import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from database import (
    get_or_create_user,
    journey_collection,
    progress_logs_collection,
    roleplay_sessions_collection,
    safe_count,
    sessions_collection,
    peer_sessions_collection,
)
from services.auth_service import get_current_user_id

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

router = APIRouter()


LEVELS = [
    {
        "level": 1,
        "title": "Text conversation with AI",
        "description": "Start with a friendly chat — your practice partner is here for you.",
        "route": "/companion",
        "cta": "Talk to AI Companion",
    },
    {
        "level": 2,
        "title": "Voice conversation with AI",
        "description": "Speak your responses — voice adds warmth and builds confidence.",
        "route": "/companion",
        "cta": "Coming soon",
        "coming_soon": True,
    },
    {
        "level": 3,
        "title": "AI Roleplay",
        "description": "Practice real scenarios — interviews, meeting new people, public speaking.",
        "route": "/practice",
        "cta": "Choose a roleplay",
    },
    {
        "level": 4,
        "title": "Anonymous conversation with another user",
        "description": "Talk to a real Saathi — anonymous, matched, and supportive.",
        "route": "/peer",
        "cta": "Find your Saathi",
    },
    {
        "level": 5,
        "title": "Real-world communication challenge",
        "description": "Take a small step in the real world. We'll be here when you come back.",
        "route": "/challenges",
        "cta": "See Challenges",
    },
]


async def _derive_level(user_id: str) -> dict:
    """Compute the user's current level from activity counts."""
    companion = await safe_count(sessions_collection, {"user_id": user_id})
    roleplay = await safe_count(roleplay_sessions_collection, {"user_id": user_id, "completed": True})
    peer = await safe_count(peer_sessions_collection, {"user_id": user_id})
    challenges = await safe_count(progress_logs_collection, {"user_id": user_id, "kind": "challenge_complete"})

    # Promotion rules (heuristic, non-blocking per PRD §5.8)
    if challenges >= 3:
        current = 5
    elif peer >= 5:
        current = 4
    elif roleplay >= 1:
        current = 3
    elif companion >= 3:
        current = 2
    elif companion >= 1:
        current = 1
    else:
        current = 1

    # Progress within the current level (for the bar)
    if current == 1:
        pct = min(100, int(companion * 25))
    elif current == 2:
        pct = 0 if companion < 3 else min(100, int((companion - 3) * 25))
    elif current == 3:
        pct = min(100, int(roleplay * 50))
    elif current == 4:
        pct = min(100, int(peer * 20))
    else:
        pct = min(100, int(challenges * 33))

    return {
        "current_level": current,
        "level_progress_pct": pct,
        "levels": LEVELS,
        "counts": {
            "companion_messages": companion,
            "roleplay_completed": roleplay,
            "peer_messages": peer,
            "challenges_done": challenges,
        },
    }


@router.get("/journey")
async def get_journey(user_id: str = Depends(get_current_user_id)):
    """Get current journey state for the user."""
    await get_or_create_user(user_id, "Friend")
    state = await _derive_level(user_id)
    return state


class AdvanceRequest(BaseModel):
    user_id: str | None = None


@router.post("/journey/advance")
async def advance_journey(req: AdvanceRequest, user_id: str = Depends(get_current_user_id)):
    """Mark a manual level advance (used by the Journey page)."""
    await journey_collection.update_one(
        {"user_id": user_id},
        {"$set": {"last_advanced_at": datetime.now(timezone.utc)}},
        upsert=True,
    )
    return {"ok": True}