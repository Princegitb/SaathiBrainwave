"""
SAATHI Speech Practice Router
Provides communication feedback based on a transcript + duration.
Text-only — for the demo we don't pull in STT (browser-side transcription
is a stretch goal per PRD §5.2). All analysis is heuristic.
"""

import logging
import re
import os
from datetime import datetime
import httpx

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from database import get_or_create_user, log_progress
from services.auth_service import get_current_user_id

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

router = APIRouter()


class SpeechRequest(BaseModel):
    user_id: str | None = None
    transcript: str
    duration_seconds: float  # how long the user "spoke"


class SpeechFeedback(BaseModel):
    pace: str            # "Slow" | "Moderate" | "Fast"
    wpm: int
    filler_count: int
    long_pauses: int
    clarity: str         # "Good" | "Fair" | "Practise more"
    clarity_score: int   # 0-100
    suggestion: str
    transcript: str


class SynthesizeRequest(BaseModel):
    text: str
    voice_id: str | None = None


FILLER_WORDS = [
    "um", "uh", "er", "ah", "like", "you know", "i mean",
    "kinda", "sort of", "so", "well", "actually", "basically",
]


def _word_count(text: str) -> int:
    return len([w for w in re.findall(r"\b\w+\b", text) if w.strip()])


def _count_fillers(text: str) -> int:
    lower = text.lower()
    count = 0
    for f in FILLER_WORDS:
        # word-boundary match for single words; substring for multi-word phrases
        if " " in f:
            count += len(re.findall(re.escape(f), lower))
        else:
            count += len(re.findall(rf"\b{re.escape(f)}\b", lower))
    return count


def _estimate_pauses(text: str, duration: float) -> int:
    """
    Heuristic only — we don't have audio. Approximate "long pauses" as
    sentence count vs duration.
    """
    sentences = max(1, len(re.findall(r"[.!?]+", text)))
    # If average time per sentence is > 4s, assume some long pauses.
    avg = duration / sentences
    if avg > 5:
        return int(duration / 5) - sentences
    return 0


@router.post("/speech/feedback", response_model=SpeechFeedback)
async def speech_feedback(req: SpeechRequest, user_id: str = Depends(get_current_user_id)):
    """Generate non-clinical communication-practice feedback."""
    await get_or_create_user(user_id, "Friend")

    text = (req.transcript or "").strip()
    duration = max(1.0, float(req.duration_seconds or 1.0))
    words = _word_count(text)

    wpm = int(round(words / (duration / 60.0))) if duration > 0 else 0

    if wpm == 0:
        pace = "Slow"
    elif wpm < 110:
        pace = "Slow"
    elif wpm < 160:
        pace = "Moderate"
    else:
        pace = "Fast"

    filler_count = _count_fillers(text)
    long_pauses = _estimate_pauses(text, duration)

    # Clarity score is a non-clinical heuristic — drops with filler density.
    filler_rate = filler_count / max(words, 1)
    clarity_score = max(0, min(100, int(100 - (filler_rate * 1000) - (long_pauses * 5))))
    if clarity_score >= 75:
        clarity = "Good"
    elif clarity_score >= 50:
        clarity = "Fair"
    else:
        clarity = "Practise more"

    # Non-clinical suggestion (always framed as PRACTICE feedback).
    if pace == "Fast":
        s = "Try slowing down slightly — comfortable pauses make you feel more grounded and sound more confident."
    elif pace == "Slow":
        s = "A slightly brisker pace can keep your listener engaged. Try a quick breath before each sentence."
    elif filler_count > 5:
        s = "Watch out for filler words like 'um' and 'like'. A short pause is more confident than a filler."
    elif long_pauses > 2:
        s = "Try to bridge your pauses with a soft breath rather than a long silence — it keeps the flow natural."
    else:
        s = "Nice flow! Keep practising to lock in this comfortable rhythm."

    # Persist
    await log_progress(user_id, "speech_practice", {
        "wpm": wpm,
        "filler_count": filler_count,
        "clarity_score": clarity_score,
    })

    return SpeechFeedback(
        pace=pace,
        wpm=wpm,
        filler_count=filler_count,
        long_pauses=long_pauses,
        clarity=clarity,
        clarity_score=clarity_score,
        suggestion=s,
        transcript=text,
    )


@router.post("/speech/synthesize")
async def speech_synthesize(
    req: SynthesizeRequest,
    user_id: str = Depends(get_current_user_id),
):
    """Proxy Speech Synthesis requests to ElevenLabs Multilingual v2 for natural Hindi/Hinglish speech."""
    api_key = os.getenv("ELEVENLABS_API_KEY", "").strip()
    if not api_key:
        raise HTTPException(
            status_code=400,
            detail="ELEVENLABS_API_KEY is not configured in backend/.env"
        )

    voice_id = req.voice_id or os.getenv("ELEVENLABS_VOICE_ID", "21m00Tcm4TlvDq8ikWAM").strip()
    url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}"

    headers = {
        "Accept": "audio/mpeg",
        "xi-api-key": api_key,
        "Content-Type": "application/json",
    }

    payload = {
        "text": req.text,
        "model_id": "eleven_multilingual_v2",  # Natural Hindi, Hinglish & English support
        "voice_settings": {
            "stability": 0.55,
            "similarity_boost": 0.75,
            "style": 0.15,
            "use_speaker_boost": True,
        },
    }

    async def audio_stream():
        async with httpx.AsyncClient(timeout=30.0) as client:
            try:
                async with client.stream("POST", url, headers=headers, json=payload) as response:
                    if response.status_code != 200:
                        error_detail = await response.aread()
                        logger.error(f"ElevenLabs TTS failed ({response.status_code}): {error_detail.decode('utf-8', errors='ignore')}")
                        yield b""
                        return
                    async for chunk in response.aiter_bytes():
                        yield chunk
            except Exception as e:
                logger.error(f"ElevenLabs connection error: {e}")
                yield b""

    return StreamingResponse(audio_stream(), media_type="audio/mpeg")

