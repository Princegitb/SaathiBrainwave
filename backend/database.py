"""
SAATHI MongoDB Connection & Storage Layer
Uses Motor (async driver) for non-blocking DB access with FastAPI.
Includes fast timeout (2000ms) and automatic in-memory fallback
so the entire platform functions reliably even when MongoDB is offline.
"""

import logging
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Any
from motor.motor_asyncio import AsyncIOMotorClient
from config import MONGO_URI, DB_NAME

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

# Motor Async Client with 2-second timeout to prevent hanging on DB connection issues
client = AsyncIOMotorClient(MONGO_URI, serverSelectionTimeoutMS=2000)
db = client[DB_NAME]

# Collection references
users_collection = db["users"]
sessions_collection = db["sessions"]
roleplay_sessions_collection = db["roleplay_sessions"]
peer_sessions_collection = db["peer_sessions"]
progress_logs_collection = db["progress_logs"]
journey_collection = db["journey"]
reports_collection = db["reports"]

# In-memory storage fallback when MongoDB is offline
_MEM_USERS: Dict[str, dict] = {}
_MEM_PROGRESS: List[dict] = []
_MEM_SESSIONS: List[dict] = []
_MEM_ROLEPLAY: List[dict] = []
_MEM_PEER: List[dict] = []


def _now() -> datetime:
    return datetime.now(timezone.utc)


async def ping_db() -> bool:
    """Verify MongoDB connection is alive with short timeout."""
    try:
        await client.admin.command("ping")
        return True
    except Exception as e:
        logger.debug("MongoDB ping failed: %s", e)
        return False


async def get_or_create_user(user_id: str, display_name: str = "Friend") -> dict:
    """
    Find existing user or create one.
    Uses MongoDB if connected; falls back to memory.
    """
    if await ping_db():
        try:
            user = await users_collection.find_one({"user_id": user_id})
            if user:
                if user.get("display_name") != display_name:
                    await users_collection.update_one(
                        {"user_id": user_id},
                        {"$set": {"display_name": display_name, "updated_at": _now()}},
                    )
                    user["display_name"] = display_name
                return user

            new_user = {
                "user_id": user_id,
                "display_name": display_name,
                "preferences": {
                    "preferred_format": "text",
                    "session_length": "short",
                    "goal_tags": [],
                },
                "created_at": _now(),
                "updated_at": _now(),
            }
            await users_collection.insert_one(new_user)
            return new_user
        except Exception as e:
            logger.warning("MongoDB read failed in get_or_create_user, using in-memory: %s", e)

    # In-memory fallback
    if user_id in _MEM_USERS:
        _MEM_USERS[user_id]["display_name"] = display_name
        return _MEM_USERS[user_id]

    new_user = {
        "user_id": user_id,
        "display_name": display_name,
        "preferences": {
            "preferred_format": "text",
            "session_length": "short",
            "goal_tags": [],
        },
        "created_at": _now(),
        "updated_at": _now(),
    }
    _MEM_USERS[user_id] = new_user
    return new_user


async def log_progress(user_id: str, kind: str, payload: dict | None = None) -> None:
    """Append a daily progress event."""
    doc = {
        "user_id": user_id,
        "kind": kind,
        "payload": payload or {},
        "created_at": _now(),
        "day": _now().strftime("%Y-%m-%d"),
    }
    if await ping_db():
        try:
            await progress_logs_collection.insert_one(doc)
            return
        except Exception as e:
            logger.warning("DB insert failed in log_progress: %s", e)

    _MEM_PROGRESS.append(doc)


async def get_progress_summary(user_id: str) -> dict:
    """Compute aggregated stats for the dashboard."""
    if await ping_db():
        try:
            companion_messages = await sessions_collection.count_documents({"user_id": user_id})
            roleplay_completed = await roleplay_sessions_collection.count_documents(
                {"user_id": user_id, "completed": True}
            )
            peer_messages = await peer_sessions_collection.count_documents({"user_id": user_id})
            challenges_done = await progress_logs_collection.count_documents(
                {"user_id": user_id, "kind": "challenge_complete"}
            )

            today = _now().date()
            weekly = []
            for i in range(6, -1, -1):
                day = (today - timedelta(days=i)).strftime("%Y-%m-%d")
                count = await progress_logs_collection.count_documents(
                    {"user_id": user_id, "day": day}
                )
                label = (today - timedelta(days=i)).strftime("%a")
                weekly.append({"name": label, "value": count})

            practice_minutes = (companion_messages * 0.5) + (roleplay_completed * 4) + (peer_messages * 0.5)

            return {
                "sessions_count": companion_messages,
                "roleplay_completed": roleplay_completed,
                "peer_messages": peer_messages,
                "challenges_done": challenges_done,
                "practice_minutes": int(practice_minutes),
                "weekly_trend": weekly,
                "confidence_score": min(
                    100,
                    int(
                        (companion_messages * 0.5)
                        + (roleplay_completed * 12)
                        + (peer_messages * 0.5)
                        + (challenges_done * 5)
                    ),
                ),
                "current_level": 1 + min(4, (companion_messages + roleplay_completed * 2) // 5),
                "level_progress_pct": min(
                    100, int(((companion_messages + roleplay_completed * 2) % 5) * 20)
                ),
            }
        except Exception as e:
            logger.warning("MongoDB error in get_progress_summary, using memory: %s", e)

    # In-memory calculation fallback
    user_logs = [p for p in _MEM_PROGRESS if p["user_id"] == user_id]
    companion_count = len([p for p in user_logs if p["kind"] == "companion_session"])
    roleplay_count = len([p for p in user_logs if p["kind"] == "roleplay_complete"])
    peer_count = len([p for p in user_logs if p["kind"] == "peer_message"])
    challenges_count = len([p for p in user_logs if p["kind"] == "challenge_complete"])

    today = _now().date()
    weekly = []
    for i in range(6, -1, -1):
        day_str = (today - timedelta(days=i)).strftime("%Y-%m-%d")
        count = len([p for p in user_logs if p.get("day") == day_str])
        label = (today - timedelta(days=i)).strftime("%a")
        weekly.append({"name": label, "value": count})

    practice_minutes = (companion_count * 0.5) + (roleplay_count * 4) + (peer_count * 0.5)

    return {
        "sessions_count": companion_count,
        "roleplay_completed": roleplay_count,
        "peer_messages": peer_count,
        "challenges_done": challenges_count,
        "practice_minutes": int(practice_minutes),
        "weekly_trend": weekly,
        "confidence_score": min(
            100,
            int(
                (companion_count * 0.5)
                + (roleplay_count * 12)
                + (peer_count * 0.5)
                + (challenges_count * 5)
            ),
        ),
        "current_level": 1 + min(4, (companion_count + roleplay_count * 2) // 5),
        "level_progress_pct": min(
            100, int(((companion_count + roleplay_count * 2) % 5) * 20)
        ),
    }


async def safe_insert(collection, doc: dict) -> bool:
    """
    Insert a document if MongoDB is reachable; otherwise no-op safely.
    Prevents unhandled exceptions (and the resulting CORS-masked 500s)
    from crashing routes when the DB is offline.
    """
    if await ping_db():
        try:
            await collection.insert_one(doc)
            return True
        except Exception as e:
            logger.warning("MongoDB insert failed, continuing without persistence: %s", e)
    else:
        logger.debug("MongoDB unavailable, skipping insert (in-memory mode).")
    return False


async def safe_count(collection, query: dict) -> int:
    """
    Count documents if MongoDB is reachable; otherwise return 0.
    Same rationale as safe_insert — keeps routes resilient when DB is offline.
    """
    if await ping_db():
        try:
            return await collection.count_documents(query)
        except Exception as e:
            logger.warning("MongoDB count failed, defaulting to 0: %s", e)
    return 0


async def get_recent_activity(user_id: str, limit: int = 8) -> list[dict]:
    """Get the most recent activity items for the dashboard practice-log list."""
    if await ping_db():
        try:
            cursor = (
                progress_logs_collection.find({"user_id": user_id})
                .sort("created_at", -1)
                .limit(limit)
            )
            items = []
            async for doc in cursor:
                kind = doc.get("kind")
                created = doc.get("created_at")
                date_str = created.strftime("%b %d, %Y • %H:%M") if hasattr(created, "strftime") else ""
                items.append(
                    {
                        "kind": kind,
                        "title": _title_for_kind(kind, doc.get("payload", {})),
                        "date": date_str,
                        "subtitle": _subtitle_for_kind(kind),
                        "href": _href_for_kind(kind, doc.get("payload", {})),
                    }
                )
            if items:
                return items
        except Exception as e:
            logger.warning("MongoDB error in get_recent_activity: %s", e)

    # In-memory fallback
    user_logs = [p for p in _MEM_PROGRESS if p["user_id"] == user_id]
    user_logs.sort(key=lambda x: x["created_at"], reverse=True)

    items = []
    for doc in user_logs[:limit]:
        kind = doc.get("kind")
        created = doc.get("created_at")
        date_str = created.strftime("%b %d, %Y • %H:%M") if hasattr(created, "strftime") else ""
        items.append(
            {
                "kind": kind,
                "title": _title_for_kind(kind, doc.get("payload", {})),
                "date": date_str,
                "subtitle": _subtitle_for_kind(kind),
                "href": _href_for_kind(kind, doc.get("payload", {})),
            }
        )
    return items


def _title_for_kind(kind: str, payload: dict) -> str:
    return {
        "companion_message": "AI Companion — Conversation",
        "companion_session": "AI Companion — Conversation",
        "roleplay_complete": f"Roleplay — {payload.get('scenario_label', 'Practice')}",
        "peer_message": "Peer Saathi — Conversation",
        "challenge_complete": payload.get("title", "Real-World Challenge"),
        "speech_practice": "Speech Practice — Communication feedback",
    }.get(kind, "Activity")


def _subtitle_for_kind(kind: str) -> str:
    return {
        "companion_message": "AI Session",
        "companion_session": "AI Session",
        "roleplay_complete": "AI Practice",
        "peer_message": "Peer Chat",
        "challenge_complete": "Challenge",
        "speech_practice": "Speech Practice",
    }.get(kind, "Activity")


def _href_for_kind(kind: str, payload: dict) -> str:
    return {
        "companion_message": "/companion",
        "companion_session": "/companion",
        "roleplay_complete": f"/roleplay/{payload.get('scenario_id', 'job_interview')}",
        "peer_message": "/peer",
        "challenge_complete": "/challenges",
        "speech_practice": "/speech",
    }.get(kind, "/")