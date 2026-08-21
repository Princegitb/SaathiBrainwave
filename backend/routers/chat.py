"""
SAATHI Chat Router
Handles AI Companion conversation with Safety Shield integration,
persistence to MongoDB, and redaction of contact info.
"""

import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Header, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from database import (
    get_or_create_user,
    log_progress,
    safe_insert,
    sessions_collection,
    ping_db,
)
from services.llm_service import get_companion_response, stream_companion_response
from services.safety_shield import check_message, redact_text
from services.sentiment import analyze_sentiment
from services.auth_service import get_current_user_id

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

router = APIRouter()


class ChatMessage(BaseModel):
    role: str  # "user" or "assistant"
    content: str


class ChatRequest(BaseModel):
    messages: list[ChatMessage]
    user_id: str | None = None
    gender: str | None = None
    is_voice_mode: bool = False


class ChatResponse(BaseModel):
    reply: str
    safety: dict
    suggestions: list[str] = []
    redacted: bool = False
    sentiment: dict = {}


@router.get("/chat/history")
async def get_chat_history(
    user_id: str = Depends(get_current_user_id),
    limit: int = 50,
):
    """
    Retrieve stored conversation history for the current user.
    """
    history = []
    sentiment = {}
    if await ping_db():
        try:
            cursor = (
                sessions_collection.find({"user_id": user_id})
                .sort("created_at", -1)
                .limit(1)
            )
            latest_session = await cursor.to_list(length=1)
            if latest_session:
                history = latest_session[0].get("messages", [])
                sentiment = latest_session[0].get("sentiment", {})
        except Exception as e:
            logger.warning("Failed to fetch chat history from DB: %s", e)

    return {"messages": history, "sentiment": sentiment}


@router.post("/chat", response_model=ChatResponse)
async def chat(
    request: ChatRequest,
    user_id: str = Depends(get_current_user_id),
):
    """
    AI Companion chat endpoint.
    Every message passes through the Safety Shield before processing.
    """
    effective_user_id = (request.user_id and request.user_id.strip()) or user_id
    user_profile = await get_or_create_user(effective_user_id, "Friend")
    user_gender = request.gender or user_profile.get("gender") or "neutral"

    raw_messages = [m.model_dump() for m in request.messages]
    
    # Deduplicate consecutive identical messages in history
    messages = []
    for msg in raw_messages:
        if not messages:
            messages.append(msg)
        elif messages[-1]["role"] != msg["role"] or messages[-1]["content"] != msg["content"]:
            messages.append(msg)

    if not messages:
        raise HTTPException(status_code=400, detail="No messages provided")

    user_message = messages[-1]["content"]

    # Redact PII (pass through before safety & LLM)
    redacted_message = redact_text(user_message)
    redacted = redacted_message != user_message
    if redacted:
        messages[-1]["content"] = redacted_message

    # Safety Shield Check (Deep Check)
    safety_result = await check_message(redacted_message, deep_check=True)

    # Sentiment analysis with DistilRoBERTa Transformer + Lexicon
    sentiment_result = analyze_sentiment(redacted_message)

    if not safety_result["is_safe"]:
        # Intercept unsafe input
        if safety_result.get("crisis") or safety_result["action"] == "crisis_redirect":
            reply_text = (
                "I hear how much pain you're in, and I care about your safety. "
                "Please reach out to someone who can help right now:\n\n"
                "**Tele-MANAS:** 14416 (24/7 Toll-Free, India)\n"
                "**KIRAN:** 1800-599-0019 (Mental Health Helpline)\n"
                "**Vandrevala Foundation:** +91 9999 666 555\n\n"
                "You don't have to carry this alone. Please talk to someone you trust. 💛"
            )
            suggestions = ["Get helpline support", "Talk to a loved one"]

            # Persist (don't store raw user message if it was redacted, store redacted form)
            await safe_insert(sessions_collection, {
                "user_id": effective_user_id,
                "messages": [{"role": m["role"], "content": m["content"]} for m in messages],
                "reply": reply_text,
                "safety": safety_result,
                "sentiment": sentiment_result,
                "created_at": datetime.now(timezone.utc),
            })
            await log_progress(effective_user_id, "companion_message")

            return ChatResponse(
                reply=reply_text,
                safety=safety_result,
                suggestions=suggestions,
                redacted=redacted,
                sentiment=sentiment_result,
            )

        if safety_result["action"] == "block":
            return ChatResponse(
                reply=(
                    "I want to keep our conversation supportive and safe. "
                    "Let's talk about something else — what would you like to practice today?"
                ),
                safety=safety_result,
                suggestions=["Practice a conversation", "Try a roleplay"],
                redacted=redacted,
                sentiment=sentiment_result,
            )

    # Get AI response with gender context
    try:
        reply = await get_companion_response(
            messages, 
            is_voice_mode=request.is_voice_mode, 
            gender=user_gender
        )
    except Exception as e:
        logger.exception("AI response failed: %s", e)
        reply = (
            "I'm having trouble connecting right now. Let's try again in a moment! 💛"
        )

    # Safety check the AI response too (catch LLM misbehavior)
    ai_safety = await check_message(reply, deep_check=False)
    if not ai_safety["is_safe"]:
        reply = "I'd love to help you practice! What kind of conversation would you like to work on today?"

    # Generate contextual suggestions
    suggestions = _generate_suggestions(user_message, reply)

    # Persist the turn
    await safe_insert(sessions_collection, {
        "user_id": effective_user_id,
        "messages": [{"role": m["role"], "content": m["content"]} for m in messages],
        "reply": reply,
        "safety": safety_result,
        "sentiment": sentiment_result,
        "created_at": datetime.now(timezone.utc),
    })
    await log_progress(effective_user_id, "companion_message")

    return ChatResponse(
        reply=reply,
        safety=safety_result,
        suggestions=suggestions,
        redacted=redacted,
        sentiment=sentiment_result,
    )


@router.post("/chat/companion/stream")
async def chat_stream(
    request: ChatRequest,
    user_id: str = Depends(get_current_user_id),
):
    """Streaming endpoint for AI Companion text responses with Safety Shield."""
    await get_or_create_user(user_id, "Friend")

    raw_messages = [m.model_dump() for m in request.messages]
    if not raw_messages:
        return StreamingResponse(iter([""]), media_type="text/plain")

    user_message = raw_messages[-1]["content"]

    # Redact
    redacted_text = redact_text(user_message)
    raw_messages[-1]["content"] = redacted_text
    user_message = redacted_text

    # Safety Check
    safety_result = await check_message(user_message, deep_check=True)
    if not safety_result["is_safe"]:
        if safety_result.get("crisis"):
            reply_text = (
                "It sounds like you might be going through something difficult right now. "
                "You're not alone, and there are people who can help. 💛\n\n"
                "Remember: SAATHI is here to support your practice, "
                "and real help is always available when you need it."
            )
        else:
            reply_text = (
                "I want to keep our conversation supportive and safe. "
                "Let's talk about something else — what would you like to practice today?"
            )
        async def mock_stream():
            yield reply_text
        return StreamingResponse(mock_stream(), media_type="text/plain")

    async def safety_checked_stream():
        full_reply = ""
        async for chunk in stream_companion_response(raw_messages, is_voice_mode=request.is_voice_mode):
            full_reply += chunk
            yield chunk

        # Persist the full conversation
        await safe_insert(sessions_collection, {
            "user_id": user_id,
            "messages": [{"role": m["role"], "content": m["content"]} for m in raw_messages],
            "reply": full_reply,
            "safety": safety_result,
            "created_at": datetime.now(timezone.utc),
        })
        await log_progress(user_id, "companion_message")

    return StreamingResponse(safety_checked_stream(), media_type="text/plain")


def _generate_suggestions(user_msg: str, ai_reply: str) -> list[str]:
    """Generate contextual action suggestions based on conversation."""
    suggestions = []
    lower = user_msg.lower()

    if any(word in lower for word in ["interview", "job", "hiring", "resume"]):
        suggestions.append("Practice job interview")
    if any(word in lower for word in ["meet", "new people", "friends", "talk to"]):
        suggestions.append("Practice meeting someone new")
    if any(word in lower for word in ["nervous", "scared", "anxious", "worried"]):
        suggestions.append("Try a roleplay scenario")
    if any(word in lower for word in ["lonely", "alone", "isolated", "vent"]):
        suggestions.append("Find your Saathi")
    if any(word in lower for word in ["practice", "better", "improve"]):
        suggestions.append("Start a practice session")

    if not suggestions:
        suggestions = ["Try a roleplay scenario", "View practice tips"]

    return suggestions[:3]