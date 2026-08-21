"""
SAATHI Weekly AI Letter Router
Generates "Sara's Weekly Note to You" — a personal, inspiring AI letter
summarizing user practice sessions, growth points, and encouragement.
"""

import logging
from datetime import datetime, timezone
from fastapi import APIRouter, Depends
from pydantic import BaseModel

from database import get_progress_summary, get_recent_activity
from services.llm_service import GEMINI_MODELS, GEMINI_API_KEY
from services.auth_service import get_current_user_id
import google.generativeai as genai

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

router = APIRouter()


class WeeklyNoteResponse(BaseModel):
    title: str
    date_range: str
    letter_text: str
    highlights: list[str]


@router.get("/journey/weekly-note", response_model=WeeklyNoteResponse)
async def get_weekly_note(user_id: str = Depends(get_current_user_id)):
    """Generate or retrieve Sara's personalized weekly note for the user."""
    summary = await get_progress_summary(user_id)
    recent = await get_recent_activity(user_id, limit=5)

    sessions_completed = summary.get("sessions_count", 5)
    streak_days = summary.get("current_streak", 4)

    if GEMINI_API_KEY:
        try:
            model = genai.GenerativeModel(
                GEMINI_MODELS[0],
                system_instruction=(
                    "You are Sara, SAATHI's warm AI companion. "
                    "Write a short, heartfelt 3-paragraph weekly letter to the user ('bhai'/friend) "
                    "praising their courage, progress in practicing social communication, and resilience. "
                    "Use warm Indian Hinglish with emojis. Keep it under 150 words total."
                )
            )
            prompt = f"User stats: {sessions_completed} practice sessions done, {streak_days}-day streak active. Recent activities: {[x.get('title') for x in recent]}."
            res = model.generate_content(prompt)
            if res.text:
                letter = res.text.strip()
                return WeeklyNoteResponse(
                    title="Sara's Letter to You 💌",
                    date_range="This Week's Reflection",
                    letter_text=letter,
                    highlights=[
                        f"{sessions_completed} Practice Sessions Completed",
                        f"{streak_days}-Day Active Practice Streak",
                        "Continuous Speech & Confidence Growth"
                    ]
                )
        except Exception as e:
            logger.warning("Failed to generate AI weekly note: %s", e)

    # Static Fallback Letter
    fallback_letter = (
        "Hii bhai! 💛\n\n"
        f"I wanted to take a moment to tell you how proud I am of your effort this week. "
        f"You completed {sessions_completed} practice sessions and maintained a {streak_days}-day active streak! "
        "Showing up even on days when speaking feels intimidating takes real courage.\n\n"
        "Remember, every single conversation you practice here makes your voice stronger and your mind calmer. "
        "Keep taking small, brave steps. I'm right here with you every step of the way! 🌟\n\n"
        "With warmth,\nSara"
    )

    return WeeklyNoteResponse(
        title="Sara's Letter to You 💌",
        date_range="This Week's Reflection",
        letter_text=fallback_letter,
        highlights=[
            f"{sessions_completed} Practice Sessions Completed",
            f"{streak_days}-Day Active Practice Streak",
            "Continuous Speech & Confidence Growth"
        ]
    )
