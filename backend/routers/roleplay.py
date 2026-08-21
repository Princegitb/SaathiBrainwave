"""
SAATHI Roleplay Router
Handles roleplay scenario sessions with Safety Shield integration,
persistence, and redaction of contact info.
"""

import logging
import re
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Header, Depends
from pydantic import BaseModel

from database import (
    get_or_create_user,
    log_progress,
    roleplay_sessions_collection,
    safe_insert,
)
from services.llm_service import get_roleplay_feedback, get_roleplay_response
from services.safety_shield import check_message, redact_text
from services.auth_service import get_current_user_id

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

router = APIRouter()


class RoleplayMessage(BaseModel):
    role: str
    content: str


class RoleplayStartRequest(BaseModel):
    scenario: str
    user_id: str | None = None


class RoleplayMessageRequest(BaseModel):
    scenario: str
    messages: list[RoleplayMessage]
    user_id: str | None = None


class RoleplayEndRequest(BaseModel):
    scenario: str
    messages: list[RoleplayMessage]
    user_id: str | None = None


class RoleplayResponse(BaseModel):
    reply: str
    safety: dict
    turn_count: int = 0
    should_end: bool = False
    redacted: bool = False


class RoleplayFeedbackResponse(BaseModel):
    feedback: str
    scenario: str


# Opening lines for each scenario
SCENARIO_OPENERS = {
    "job_interview": (
        "Welcome! Thanks for coming in today. I'm glad you could make it. "
        "Let's get started — could you tell me a little about yourself?"
    ),
    "meeting_new_person": (
        "Hey! Is this your first time at this event too? "
        "I just got here and don't really know anyone yet 😄"
    ),
    "apj_kalam": (
        "Greetings my young friend! It is wonderful to speak with you today. "
        "What dream or goal are you currently working on?"
    ),
    "steve_jobs": (
        "Hey there. Great ideas come from passion and extreme clarity. "
        "What project or product idea are you practicing to present today?"
    ),
}

SCENARIO_LABELS = {
    "job_interview": "Job Interview",
    "meeting_new_person": "Meeting a New Person",
    "apj_kalam": "Dr. APJ Abdul Kalam Practice",
    "steve_jobs": "Steve Jobs Rehearsal",
}


@router.get("/roleplay/history")
async def get_roleplay_history(
    user_id: str = Depends(get_current_user_id),
):
    """Retrieve the current active (incomplete) roleplay session for the user."""
    latest_any = await roleplay_sessions_collection.find_one(
        {"user_id": user_id},
        sort=[("created_at", -1)]
    )
    if not latest_any or latest_any.get("completed") is True:
        return {"scenario": None, "messages": []}

    messages = latest_any.get("messages", [])
    reply = latest_any.get("reply", "")
    scenario = latest_any.get("scenario", "")

    history = []
    for msg in messages:
        history.append({
            "role": msg.get("role"),
            "content": msg.get("content")
        })

    if reply:
        if not history or history[-1]["role"] != "assistant" or history[-1]["content"] != reply:
            history.append({
                "role": "assistant",
                "content": reply
            })

    return {"scenario": scenario, "messages": history}


@router.post("/roleplay/start", response_model=RoleplayResponse)
async def start_roleplay(
    request: RoleplayStartRequest,
    user_id: str = Depends(get_current_user_id),
):
    """Start a new roleplay scenario with an AI opening line."""
    await get_or_create_user(user_id, "Friend")

    scenario = request.scenario
    opener = SCENARIO_OPENERS.get(
        scenario,
        "Hi there! Let's get started with our practice conversation.",
    )

    # Persist the start of session (with empty message list, just opener in DB)
    await safe_insert(roleplay_sessions_collection, {
        "user_id": user_id,
        "scenario": scenario,
        "messages": [],
        "reply": opener,
        "should_end": False,
        "completed": False,
        "created_at": datetime.now(timezone.utc),
    })

    return RoleplayResponse(
        reply=opener,
        safety={"is_safe": True, "category": "safe"},
        turn_count=1,
        should_end=False,
        redacted=False,
    )


@router.post("/roleplay/message", response_model=RoleplayResponse)
async def roleplay_message(
    request: RoleplayMessageRequest,
    user_id: str = Depends(get_current_user_id),
):
    """Continue a roleplay conversation. Safety Shield checks every message."""
    await get_or_create_user(user_id, "Friend")

    messages = [m.model_dump() for m in request.messages]
    if not messages:
        return RoleplayResponse(
            reply="Let's keep our practice focused and positive. Shall we continue with the scenario?",
            safety={"is_safe": True, "category": "safe"},
            turn_count=0,
            should_end=False,
            redacted=False,
        )

    # Redact contact info before anything else
    user_message = messages[-1]["content"]
    redacted_text = redact_text(user_message)
    redacted = redacted_text != user_message
    messages[-1]["content"] = redacted_text
    user_message = redacted_text

    # Safety Shield check
    safety_result = await check_message(user_message, deep_check=True)

    if not safety_result["is_safe"]:
        if safety_result.get("crisis"):
            return RoleplayResponse(
                reply=(
                    "I notice this might be bringing up some difficult feelings. "
                    "That's okay — we can pause this practice anytime. 💛\n\n"
                    "Would you like to take a break, or continue when you're ready?"
                ),
                safety=safety_result,
                turn_count=len(messages),
                should_end=True,
                redacted=redacted,
            )

        if safety_result.get("action") == "block":
            return RoleplayResponse(
                reply="Let's keep our practice focused and positive. Shall we continue with the scenario?",
                safety=safety_result,
                turn_count=len(messages),
                should_end=False,
                redacted=redacted,
            )

    # Count USER turns only (this is the threshold the UX cares about)
    user_turns = sum(1 for m in messages if m["role"] == "user")
    should_end = user_turns >= 6

    # Get AI response
    try:
        reply = await get_roleplay_response(request.scenario, messages)
    except Exception as e:
        logger.exception("Roleplay response failed: %s", e)
        reply = "Sorry, I lost my train of thought — could you say that again?"

    # Safety check on AI reply too
    ai_safety = await check_message(reply, deep_check=False)
    if not ai_safety["is_safe"]:
        reply = "That's a great point! Tell me more about that."

    # Persist every turn
    await safe_insert(roleplay_sessions_collection, {
        "user_id": user_id,
        "scenario": request.scenario,
        "messages": messages,
        "reply": reply,
        "should_end": should_end,
        "completed": False,
        "created_at": datetime.now(timezone.utc),
    })

    return RoleplayResponse(
        reply=reply,
        safety=safety_result,
        turn_count=user_turns,  # report user turns, not total messages
        should_end=should_end,
        redacted=redacted,
    )


@router.post("/roleplay/feedback", response_model=RoleplayFeedbackResponse)
async def roleplay_feedback(
    request: RoleplayEndRequest,
    user_id: str = Depends(get_current_user_id),
):
    """Generate end-of-session feedback summary for a completed roleplay."""
    await get_or_create_user(user_id, "Friend")

    messages = [m.model_dump() for m in request.messages]
    feedback = await get_roleplay_feedback(request.scenario, messages)

    # Persist a final completion record
    await safe_insert(roleplay_sessions_collection, {
        "user_id": user_id,
        "scenario": request.scenario,
        "messages": messages,
        "feedback": feedback,
        "completed": True,
        "created_at": datetime.now(timezone.utc),
    })

    # Progress-log so the dashboard reflects it
    await log_progress(user_id, "roleplay_complete", {
        "scenario_id": request.scenario,
        "scenario_label": SCENARIO_LABELS.get(request.scenario, request.scenario),
    })

    return RoleplayFeedbackResponse(
        feedback=feedback,
        scenario=SCENARIO_LABELS.get(request.scenario, request.scenario),
    )


class RoleplayAnalyzeRequest(BaseModel):
    scenario: str
    messages: list[RoleplayMessage]
    user_id: str | None = None


class RoleplayAnalyzeResponse(BaseModel):
    scenario: str
    total_turns: int
    total_words: int
    filler_words: int
    filler_word_rate: float
    average_words_per_turn: float
    clarity_score: int
    confidence_score: int
    communication_score: int
    feedback: str


@router.post("/roleplay/analyze", response_model=RoleplayAnalyzeResponse)
async def analyze_roleplay(
    request: RoleplayAnalyzeRequest,
    user_id: str = Depends(get_current_user_id),
):
    """
    Analyze a completed roleplay session.

    This is a communication-performance analysis,
    NOT a medical/psychological diagnosis.
    """
    await get_or_create_user(user_id, "Friend")

    # Only analyze user's spoken/written responses
    user_messages = [
        m.content.strip()
        for m in request.messages
        if m.role == "user" and m.content.strip()
    ]

    total_turns = len(user_messages)

    if not user_messages:
        return RoleplayAnalyzeResponse(
            scenario=SCENARIO_LABELS.get(
                request.scenario,
                request.scenario,
            ),
            total_turns=0,
            total_words=0,
            filler_words=0,
            filler_word_rate=0.0,
            average_words_per_turn=0.0,
            clarity_score=0,
            confidence_score=0,
            communication_score=0,
            feedback="Not enough conversation data to analyze yet.",
        )

    # ---------------------------------------------------------
    # WORD ANALYSIS
    # ---------------------------------------------------------

    all_text = " ".join(user_messages)
    words = all_text.split()

    total_words = len(words)

    average_words_per_turn = (
        total_words / total_turns
        if total_turns
        else 0
    )

    # ---------------------------------------------------------
    # FILLER WORD ANALYSIS
    # ---------------------------------------------------------

    filler_pattern = r"\b(um|uh|umm|hmm|like|actually|basically|you know|i mean|matlab|ummm|uhh)\b"

    filler_words = len(
        re.findall(
            filler_pattern,
            all_text.lower(),
        )
    )

    filler_word_rate = (
        filler_words / total_words * 100
        if total_words
        else 0
    )

    # ---------------------------------------------------------
    # CLARITY SCORE
    # ---------------------------------------------------------

    clarity_score = 100

    if filler_word_rate > 15:
        clarity_score -= 30
    elif filler_word_rate > 10:
        clarity_score -= 20
    elif filler_word_rate > 5:
        clarity_score -= 10

    if average_words_per_turn < 3:
        clarity_score -= 20

    clarity_score = max(
        0,
        min(100, clarity_score),
    )

    # ---------------------------------------------------------
    # CONFIDENCE SCORE
    # ---------------------------------------------------------

    confidence_score = 50

    confident_words = [
        "I can",
        "I will",
        "I have",
        "I believe",
        "I am",
        "my experience",
        "I would",
        "I know",
    ]

    uncertain_words = [
        "maybe",
        "perhaps",
        "I think",
        "not sure",
        "probably",
        "I don't know",
    ]

    lower_text = all_text.lower()

    for phrase in confident_words:
        if phrase.lower() in lower_text:
            confidence_score += 5

    for phrase in uncertain_words:
        if phrase.lower() in lower_text:
            confidence_score -= 5

    confidence_score = max(
        0,
        min(100, confidence_score),
    )

    # ---------------------------------------------------------
    # COMMUNICATION SCORE
    # ---------------------------------------------------------

    communication_score = round(
        (clarity_score + confidence_score) / 2
    )

    # ---------------------------------------------------------
    # DYNAMIC CONVERSATION-BASED FEEDBACK
    # ---------------------------------------------------------

    feedback_points = []

    # Filler words
    if filler_words == 0:
        feedback_points.append(
            "You avoided noticeable filler words, which helped your responses sound more direct."
        )
    elif filler_words <= 3:
        feedback_points.append(
            f"You used {filler_words} filler word(s). Your delivery was mostly clean, "
            "but replacing fillers with short pauses can make you sound more confident."
        )
    else:
        feedback_points.append(
            f"You used {filler_words} filler words. Try pausing briefly instead of using "
            "words such as 'um', 'uh', 'like', or 'you know'."
        )

    # Response length
    if average_words_per_turn >= 20:
        feedback_points.append(
            "You gave reasonably detailed responses and explained your ideas rather than "
            "answering only with short statements."
        )
    elif average_words_per_turn >= 8:
        feedback_points.append(
            "Your responses had a useful amount of detail. Try adding a specific example "
            "when answering important questions."
        )
    else:
        feedback_points.append(
            "Several responses were quite short. Try explaining your reasoning and adding "
            "one concrete example to make your answers stronger."
        )

    # Confidence language
    confidence_phrases = [
        "i can",
        "i will",
        "i have",
        "i believe",
        "i am",
        "my experience",
        "i would",
        "i know",
    ]

    uncertain_phrases = [
        "maybe",
        "perhaps",
        "i think",
        "not sure",
        "probably",
        "i don't know",
    ]

    confident_count = sum(
        lower_text.count(phrase)
        for phrase in confidence_phrases
    )

    uncertain_count = sum(
        lower_text.count(phrase)
        for phrase in uncertain_phrases
    )

    if confident_count > uncertain_count:
        feedback_points.append(
            "Your language contained several confident statements. Keep using direct "
            "phrasing when describing your skills and experience."
        )
    elif uncertain_count > confident_count:
        feedback_points.append(
            "Your responses contained some uncertainty-oriented language. Try replacing "
            "phrases such as 'maybe' or 'I think' with clearer statements when you are "
            "confident about your answer."
        )
    else:
        feedback_points.append(
            "Your language showed a balanced communication style. Continue practicing "
            "direct and specific responses."
        )

    # Clarity
    if clarity_score >= 80:
        feedback_points.append(
            "Overall, your responses were relatively clear and easy to follow."
        )
    elif clarity_score >= 60:
        feedback_points.append(
            "Your ideas were understandable, although some responses could be more "
            "structured and concise."
        )
    else:
        feedback_points.append(
            "Work on structuring your responses into a clear beginning, main point, "
            "and conclusion."
        )

    # Final dynamic summary
    feedback = " ".join(feedback_points)

    # ---------------------------------------------------------
    # SAVE ANALYSIS
    # ---------------------------------------------------------

    await safe_insert(
        roleplay_sessions_collection,
        {
            "user_id": user_id,
            "scenario": request.scenario,
            "analysis": {
                "total_turns": total_turns,
                "total_words": total_words,
                "filler_words": filler_words,
                "filler_word_rate": filler_word_rate,
                "average_words_per_turn": average_words_per_turn,
                "clarity_score": clarity_score,
                "confidence_score": confidence_score,
                "communication_score": communication_score,
            },
            "created_at": datetime.now(timezone.utc),
        },
    )

    return RoleplayAnalyzeResponse(
        scenario=SCENARIO_LABELS.get(
            request.scenario,
            request.scenario,
        ),
        total_turns=total_turns,
        total_words=total_words,
        filler_words=filler_words,
        filler_word_rate=round(
            filler_word_rate,
            2,
        ),
        average_words_per_turn=round(
            average_words_per_turn,
            2,
        ),
        clarity_score=clarity_score,
        confidence_score=confidence_score,
        communication_score=communication_score,
        feedback=feedback,
    )