"""
SAATHI Progress Router
Aggregates user progress from the various collections for the dashboard
and Progress page.
"""

import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from database import (
    get_progress_summary,
    get_recent_activity,
    log_progress,
    progress_logs_collection,
)
from services.auth_service import get_current_user_id

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

router = APIRouter()


@router.get("/progress")
async def get_progress(user_id: str = Depends(get_current_user_id)):
    """Overall progress summary for the dashboard."""
    summary = await get_progress_summary(user_id)
    return summary


@router.get("/progress/recent")
async def get_recent(user_id: str = Depends(get_current_user_id), limit: int = 8):
    """Recent activity feed for the dashboard practice-log list."""
    items = await get_recent_activity(user_id, limit=limit)
    return {"items": items}


class LogRequest(BaseModel):
    user_id: str | None = None
    kind: str
    payload: dict | None = None


@router.post("/progress/log")
async def log_event(req: LogRequest, user_id: str = Depends(get_current_user_id)):
    """Log a generic activity (e.g. challenge completion)."""
    await log_progress(user_id, req.kind, req.payload or {})
    return {"ok": True}


class ConfidenceSurveyRequest(BaseModel):
    user_id: str | None = None
    survey_type: str  # "pre" or "post"
    score: int  # 1-10
    session_type: str | None = "practice"


@router.post("/progress/confidence-survey")
async def log_confidence_survey(req: ConfidenceSurveyRequest, user_id: str = Depends(get_current_user_id)):
    """Log pre/post session confidence ratings (1-10) for 30-day trajectory tracking."""
    await log_progress(user_id, "confidence_survey", {
        "survey_type": req.survey_type,
        "score": req.score,
        "session_type": req.session_type or "practice",
    })
    return {"ok": True, "score": req.score}
