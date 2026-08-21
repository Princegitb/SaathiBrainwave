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
    speaking_pace: str = "5.5 words/turn"
    pace_dots: str = "●●●●○"
    pauses: str = "Occasional"
    pause_dots: str = "●●●○○"
    clarity_score: int
    confidence_score: int
    communication_score: int
    feedback: str
    sara_quote: str = ""


@router.post("/roleplay/analyze", response_model=RoleplayAnalyzeResponse)
async def analyze_roleplay(
    request: RoleplayAnalyzeRequest,
    user_id: str = Depends(get_current_user_id),
):
    """
    Analyze a completed roleplay session with dynamic multi-factor scoring.

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
            scenario=SCENARIO_LABELS.get(request.scenario, request.scenario),
            total_turns=0,
            total_words=0,
            filler_words=0,
            filler_word_rate=0.0,
            average_words_per_turn=0.0,
            speaking_pace="0 words/turn",
            pace_dots="●○○○○",
            pauses="Minimal",
            pause_dots="●●●●●",
            clarity_score=50,
            confidence_score=50,
            communication_score=50,
            feedback="Not enough conversation data to analyze yet.",
            sara_quote="Take your time and try speaking a few sentences to get personalized feedback!",
        )

    # ---------------------------------------------------------
    # 1. WORD & TURN ANALYSIS
    # ---------------------------------------------------------
    all_text = " ".join(user_messages)
    words = all_text.split()
    total_words = len(words)
    average_words_per_turn = round(total_words / total_turns, 1) if total_turns else 0.0

    # ---------------------------------------------------------
    # 2. FILLER WORD & HESITATION ANALYSIS
    # ---------------------------------------------------------
    filler_pattern = r"\b(um|uh|umm|hmm|like|actually|basically|you know|i mean|matlab|ummm|uhh|er|erm)\b"
    detected_fillers = re.findall(filler_pattern, all_text.lower())
    filler_words = len(detected_fillers)
    filler_word_rate = round((filler_words / total_words * 100), 1) if total_words else 0.0

    # Repetition / Stuttering cues (e.g. "I I", "the the", "w-what", ellipses)
    repetition_pattern = r"(\b(\w+)\s+\2\b|\b\w+-\w+\b|\.\.\.)"
    repetitions = len(re.findall(repetition_pattern, all_text.lower()))

    # ---------------------------------------------------------
    # 3. DYNAMIC SPEAKING PACE & PAUSES
    # ---------------------------------------------------------
    estimated_wpm = round(min(220, max(55, (average_words_per_turn * 12.0) + (8 if filler_words == 0 else -filler_words * 3))))

    if average_words_per_turn < 4:
        speaking_pace = f"{average_words_per_turn} words/turn"
        pace_dots = "●●○○○"
        pace_label = "Slow / Hesitant"
    elif average_words_per_turn < 8:
        speaking_pace = f"{average_words_per_turn} words/turn"
        pace_dots = "●●●○○"
        pace_label = "Deliberate"
    elif average_words_per_turn < 20:
        speaking_pace = f"{average_words_per_turn} words/turn"
        pace_dots = "●●●●●"
        pace_label = "Steady & Ideal"
    elif average_words_per_turn < 32:
        speaking_pace = f"{average_words_per_turn} words/turn"
        pace_dots = "●●●●○"
        pace_label = "Brisk & Detailed"
    else:
        speaking_pace = f"{average_words_per_turn} words/turn"
        pace_dots = "●●●○○"
        pace_label = "Fast Pace"

    pause_cues = repetitions + len(re.findall(r"(\.\.\.|--|\b(um|uh)\b)", all_text.lower()))
    if pause_cues == 0:
        pauses = "Minimal"
        pause_dots = "●●●●●"
    elif pause_cues <= 2:
        pauses = "Natural"
        pause_dots = "●●●●○"
    elif pause_cues <= 5:
        pauses = "Occasional"
        pause_dots = "●●●○○"
    else:
        pauses = "Frequent"
        pause_dots = "●●○○○"

    # ---------------------------------------------------------
    # 4. DYNAMIC CONFIDENCE SCORE CALCULATION
    # ---------------------------------------------------------
    # Baseline anchored by engagement & conversational turn length
    if average_words_per_turn < 3:
        base_confidence = 38.0  # very brief answers like "hi" or "yes"
    elif average_words_per_turn < 6:
        base_confidence = 54.0
    elif average_words_per_turn < 12:
        base_confidence = 68.0
    elif average_words_per_turn < 22:
        base_confidence = 78.0
    else:
        base_confidence = 84.0

    lower_text = all_text.lower()

    # Confident, assertive markers
    confident_phrases = [
        "i can", "i will", "i have", "i believe", "i am", "my experience",
        "i know", "i would", "specifically", "definitely", "absolutely",
        "achieved", "developed", "managed", "led", "confident", "passionate",
        "excited", "clear", "expertise", "gladly", "happy to", "surely",
        "solution", "handled", "worked on"
    ]
    confident_count = sum(lower_text.count(p) for p in confident_phrases)

    # Uncertainty, hesitant markers
    uncertain_phrases = [
        "maybe", "perhaps", "i think", "not sure", "probably", "i don't know",
        "i guess", "kind of", "sort of", "idk", "kinda", "sorry", "matlab",
        "i cannot", "not really", "doubt"
    ]
    uncertain_count = sum(lower_text.count(p) for p in uncertain_phrases)

    computed_confidence = (
        base_confidence
        + min(22, confident_count * 4.5)
        - min(25, uncertain_count * 5.0)
        - min(15, filler_word_rate * 1.2)
        - min(10, repetitions * 3.0)
    )

    if filler_words == 0 and total_words >= 8:
        computed_confidence += 6.0  # Bonus for crisp speech

    confidence_score = max(25, min(98, round(computed_confidence)))

    # ---------------------------------------------------------
    # 5. DYNAMIC CLARITY SCORE CALCULATION
    # ---------------------------------------------------------
    computed_clarity = 100.0
    if filler_word_rate > 15:
        computed_clarity -= 28.0
    elif filler_word_rate > 8:
        computed_clarity -= 18.0
    elif filler_word_rate > 3:
        computed_clarity -= 9.0

    if average_words_per_turn < 3:
        computed_clarity -= 22.0
    elif average_words_per_turn < 6:
        computed_clarity -= 10.0

    computed_clarity -= min(15.0, repetitions * 4.0)

    # Vocabulary diversity bonus
    unique_words_ratio = len(set(words)) / max(total_words, 1)
    if unique_words_ratio > 0.75 and total_words >= 10:
        computed_clarity += 5.0

    clarity_score = max(30, min(99, round(computed_clarity)))

    # ---------------------------------------------------------
    # 6. DYNAMIC OVERALL COMMUNICATION SCORE
    # ---------------------------------------------------------
    pace_score = 90 if "Ideal" in pace_label else (80 if "Detailed" in pace_label or "Deliberate" in pace_label else 65)
    communication_score = max(25, min(98, round(
        (confidence_score * 0.42) + (clarity_score * 0.40) + (pace_score * 0.18)
    )))

    # ---------------------------------------------------------
    # 7. DYNAMIC FEEDBACK & SARA COACHING TIP
    # ---------------------------------------------------------
    feedback_points = []

    if filler_words == 0:
        feedback_points.append("You avoided noticeable filler words, which gave your delivery a crisp and direct impression.")
    elif filler_words <= 2:
        feedback_points.append(f"You only used {filler_words} filler word(s). Your delivery was mostly clean and easy to follow.")
    else:
        feedback_points.append(f"You used {filler_words} filler words ({', '.join(set(detected_fillers[:3]))}). Try taking a brief 1-second pause instead of using fillers.")

    if average_words_per_turn >= 18:
        feedback_points.append("You provided detailed, articulate responses that explained your thoughts thoroughly.")
    elif average_words_per_turn >= 8:
        feedback_points.append("Your response length was well-balanced. Try adding one specific real-world example to make your points even stronger.")
    else:
        feedback_points.append("Several responses were quite brief. Practice elaborating with an example or explaining the 'why' behind your point.")

    if confident_count > uncertain_count:
        feedback_points.append("Your language featured strong, proactive phrasing that projected genuine capability.")
    elif uncertain_count > 0:
        feedback_points.append("You used a few hedging phrases (like 'maybe' or 'I think'). Replacing these with direct statements will instantly boost your authority.")

    feedback = " ".join(feedback_points)

    # Dynamic Sara Quote
    if confidence_score >= 80 and clarity_score >= 80:
        sara_quote = "Outstanding delivery! Your responses were structured, confident, and direct. Keep this momentum going in real conversations!"
    elif filler_words >= 3:
        sara_quote = "Great thoughts shared! Try replacing filler words with a calm, silent breath — it gives you natural gravitas."
    elif average_words_per_turn < 6:
        sara_quote = "Good start! In your next practice, try expanding your answer with 1 extra sentence to build your presence."
    elif confident_count >= 2:
        sara_quote = "I noticed your confident phrasing when explaining your points. That kind of clarity leaves a memorable impression!"
    else:
        sara_quote = "You communicated clearly and stayed composed. Practice pausing for one beat before answering to sound effortlessly confident."

    # ---------------------------------------------------------
    # 8. SAVE ANALYSIS TO MONGO
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
                "speaking_pace": speaking_pace,
                "pace_dots": pace_dots,
                "pauses": pauses,
                "pause_dots": pause_dots,
                "clarity_score": clarity_score,
                "confidence_score": confidence_score,
                "communication_score": communication_score,
                "sara_quote": sara_quote,
            },
            "created_at": datetime.now(timezone.utc),
        },
    )

    return RoleplayAnalyzeResponse(
        scenario=SCENARIO_LABELS.get(request.scenario, request.scenario),
        total_turns=total_turns,
        total_words=total_words,
        filler_words=filler_words,
        filler_word_rate=filler_word_rate,
        average_words_per_turn=average_words_per_turn,
        speaking_pace=speaking_pace,
        pace_dots=pace_dots,
        pauses=pauses,
        pause_dots=pause_dots,
        clarity_score=clarity_score,
        confidence_score=confidence_score,
        communication_score=communication_score,
        feedback=feedback,
        sara_quote=sara_quote,
    )