"""
SAATHI Chat Router
Handles AI Companion conversation with Safety Shield integration,
persistence to MongoDB, and redaction of contact info.
"""

import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Header, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from database import (
    get_or_create_user,
    log_progress,
    safe_insert,
    sessions_collection,
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
):
    """Retrieve SARA companion chat history for the user from the database."""
    latest_doc = await sessions_collection.find_one(
        {"user_id": user_id},
        sort=[("created_at", -1)]
    )
    if not latest_doc:
        return {"messages": [], "sentiment": None}

    messages = latest_doc.get("messages", [])
    reply = latest_doc.get("reply", "")
    sentiment = latest_doc.get("sentiment", None)

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
    await get_or_create_user(user_id, "Friend")

    raw_messages = [m.model_dump() for m in request.messages]
    
    # Deduplicate consecutive identical messages in history
    messages = []
    for msg in raw_messages:
        if not messages:
            messages.append(msg)
        else:
            prev = messages[-1]
            if not (prev["role"] == msg["role"] and prev["content"].strip() == msg["content"].strip()):
                messages.append(msg)

    user_message = messages[-1]["content"] if messages else ""

    # First — redact any contact info in the user message before passing it anywhere.
    redacted_text = redact_text(user_message)
    redacted = redacted_text != user_message

    # Use the redacted text for everything downstream.
    messages[-1]["content"] = redacted_text
    user_message = redacted_text

    # Safety Shield: check the (already-redacted) message
    safety_result = await check_message(user_message, deep_check=True)
    sentiment_result = analyze_sentiment(user_message)

    if not safety_result["is_safe"]:
        if safety_result.get("crisis"):
            reply_text = (
                "It sounds like you might be going through something difficult right now. "
                "You're not alone, and there are people who can help. 💛\n\n"
                "Would you like to:\n"
                "• Talk to a trusted person in your life\n"
                "• Find professional support resources\n"
                "• Continue our conversation\n\n"
                "Remember: SAATHI is here to support your practice, "
                "and real help is always available when you need it."
            )
            suggestions = ["Find support resources", "Continue talking"]

            # Persist (don't store raw user message if it was redacted, store redacted form)
            await safe_insert(sessions_collection, {
                "user_id": user_id,
                "messages": [{"role": m["role"], "content": m["content"]} for m in messages],
                "reply": reply_text,
                "safety": safety_result,
                "sentiment": sentiment_result,
                "created_at": datetime.now(timezone.utc),
            })
            await log_progress(user_id, "companion_message")

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

    # Get AI response
    try:
        reply = await get_companion_response(messages, is_voice_mode=request.is_voice_mode)
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
        "user_id": user_id,
        "messages": [{"role": m["role"], "content": m["content"]} for m in messages],
        "reply": reply,
        "safety": safety_result,
        "sentiment": sentiment_result,
        "created_at": datetime.now(timezone.utc),
    })
    await log_progress(user_id, "companion_message")

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