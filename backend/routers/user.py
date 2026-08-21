"""
SAATHI User Router
Handles user identity (display alias + preferences) for the hackathon MVP.
No real auth — user_id is a frontend-generated localStorage uuid.
"""

import logging
from datetime import datetime, timezone

from fastapi import APIRouter
from pydantic import BaseModel

from database import get_or_create_user, users_collection

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

router = APIRouter()


class IdentifyRequest(BaseModel):
    user_id: str
    display_name: str


class PreferencesRequest(BaseModel):
    user_id: str
    preferences: dict


@router.post("/user/identify")
async def identify(req: IdentifyRequest):
    """Create or update a user with a display name + return their profile."""
    if not req.user_id or not req.display_name.strip():
        return {"error": "user_id and display_name required"}
    user = await get_or_create_user(req.user_id, req.display_name.strip())
    return {
        "user_id": user["user_id"],
        "display_name": user["display_name"],
        "preferences": user.get("preferences", {}),
    }


@router.get("/user/me")
async def get_me(user_id: str):
    """Fetch current user profile by id."""
    user = await users_collection.find_one({"user_id": user_id})
    if not user:
        return {"user_id": user_id, "display_name": "Friend", "preferences": {}}
    return {
        "user_id": user["user_id"],
        "display_name": user.get("display_name", "Friend"),
        "preferences": user.get("preferences", {}),
    }


@router.post("/user/preferences")
async def set_preferences(req: PreferencesRequest):
    """Update user preferences (used by onboarding modal)."""
    await users_collection.update_one(
        {"user_id": req.user_id},
        {"$set": {"preferences": req.preferences, "updated_at": datetime.now(timezone.utc)}},
        upsert=True,
    )
    return {"ok": True, "preferences": req.preferences}
