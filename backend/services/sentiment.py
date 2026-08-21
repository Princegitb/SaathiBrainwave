import logging
import threading
from functools import lru_cache

from fastapi import APIRouter
from pydantic import BaseModel

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

router = APIRouter()

MODEL_NAME = "j-hartmann/emotion-english-distilroberta-base"

_TRANSFORMER_PIPELINE = None
_IS_LOADING_TRANSFORMER = False


def preload_transformer():
    """
    Background worker that pre-warms the HuggingFace DistilRoBERTa model.
    Runs asynchronously at server startup so user requests never hang.
    """
    global _TRANSFORMER_PIPELINE, _IS_LOADING_TRANSFORMER
    if _TRANSFORMER_PIPELINE is not None or _IS_LOADING_TRANSFORMER:
        return

    _IS_LOADING_TRANSFORMER = True
    try:
        logger.info("Initializing DistilRoBERTa Transformer emotion model in background...")
        from transformers import pipeline
        _TRANSFORMER_PIPELINE = pipeline(
            "text-classification",
            model=MODEL_NAME,
            top_k=None,
        )
        logger.info("✅ DistilRoBERTa Transformer emotion model successfully loaded into RAM!")
    except Exception as e:
        logger.warning("Transformer preload notice: %s. Using bilingual rule engine.", e)
    finally:
        _IS_LOADING_TRANSFORMER = False


EMOTION_TO_SENTIMENT = {
    "joy": "positive",
    "surprise": "positive",
    "neutral": "neutral",
    "sadness": "negative",
    "fear": "negative",
    "anger": "negative",
    "disgust": "negative",
}

EMOTION_ACTIONS = {
    "fear": "gentle_support",
    "sadness": "gentle_support",
    "anger": "calm_and_support",
    "disgust": "calm_and_support",
    "joy": "encourage_progress",
    "surprise": "continue_conversation",
    "neutral": "continue_conversation",
}


class SentimentRequest(BaseModel):
    text: str


def _fallback_sentiment(text: str) -> dict:
    """Fast, non-blocking bilingual (Hindi, Hinglish, English) emotion analysis."""
    lower = text.lower()

    # 1. Joy / Positive (English + Hindi/Hinglish)
    joy_cues = [
        "happy", "great", "awesome", "good", "excited", "glad", "yay", "love", "confident", "smile",
        "khush", "mast", "badhiya", "achha", "accha", "mazza", "maza", "shandar", "zabardast", "badiya", "sukoon"
    ]
    if any(w in lower for w in joy_cues):
        return {
            "sentiment": "positive",
            "emotion": "joy",
            "intensity": 85,
            "confidence": 0.90,
            "suggested_action": "encourage_progress",
            "is_diagnostic": False,
        }

    # 2. Sadness / Low mood
    sad_cues = [
        "sad", "depressed", "down", "unhappy", "cry", "lonely", "hurt", "hopeless", "tears",
        "dukhi", "udas", "akela", "mann kharab", "rona", "dil toota", "dard", "bura lag raha", "udaas"
    ]
    if any(w in lower for w in sad_cues):
        return {
            "sentiment": "negative",
            "emotion": "sadness",
            "intensity": 75,
            "confidence": 0.85,
            "suggested_action": "gentle_support",
            "is_diagnostic": False,
        }

    # 3. Fear / Anxiety / Hesitation
    fear_cues = [
        "scared", "afraid", "nervous", "anxious", "worry", "fear", "panic", "hesitant", "stammer", "stutter",
        "darr", "dar", "ghabrahat", "tension", "chinta", "fatt gayi", "fat gayi", "seham", "kaap"
    ]
    if any(w in lower for w in fear_cues):
        return {
            "sentiment": "negative",
            "emotion": "fear",
            "intensity": 80,
            "confidence": 0.88,
            "suggested_action": "gentle_support",
            "is_diagnostic": False,
        }

    # 4. Anger / Frustration
    anger_cues = [
        "angry", "mad", "annoyed", "frustrated", "hate", "irritated", "furious",
        "gussa", "chidh", "pareshan", "bakwaas", "chutiya", "gadhe", "hate", "bura"
    ]
    if any(w in lower for w in anger_cues):
        return {
            "sentiment": "negative",
            "emotion": "anger",
            "intensity": 80,
            "confidence": 0.85,
            "suggested_action": "calm_and_support",
            "is_diagnostic": False,
        }

    return {
        "sentiment": "neutral",
        "emotion": "neutral",
        "intensity": 50,
        "confidence": 0.70,
        "suggested_action": "continue_conversation",
        "is_diagnostic": False,
    }


def analyze_sentiment(text: str) -> dict:
    """
    Hybrid Sentiment & Emotion Analysis:
    1. Uses DistilRoBERTa transformer if loaded in RAM.
    2. Uses bilingual rules if transformer is still pre-warming.
    """
    if not text or not text.strip():
        return {
            "sentiment": "neutral",
            "emotion": "neutral",
            "intensity": 0,
            "confidence": 0.0,
            "suggested_action": "continue_conversation",
            "is_diagnostic": False,
            "model_source": "empty",
        }

    # 1. Check if HuggingFace Transformer Pipeline is loaded in memory
    if _TRANSFORMER_PIPELINE is not None:
        try:
            results = _TRANSFORMER_PIPELINE(text.strip()[:300])
            if results and len(results) > 0:
                predictions = results[0]
                best = max(predictions, key=lambda item: item["score"])
                emotion = best["label"].lower()
                confidence = float(best["score"])
                sentiment = EMOTION_TO_SENTIMENT.get(emotion, "neutral")

                return {
                    "sentiment": sentiment,
                    "emotion": emotion,
                    "intensity": round(confidence * 100),
                    "confidence": round(confidence, 2),
                    "suggested_action": EMOTION_ACTIONS.get(emotion, "continue_conversation"),
                    "is_diagnostic": False,
                    "model_source": "distilroberta-transformer",
                }
        except Exception as e:
            logger.debug("Transformer inference exception: %s", e)

    # 2. Fast bilingual heuristic engine
    res = _fallback_sentiment(text)
    res["model_source"] = "bilingual-engine"
    return res


@router.post("/sentiment")
def sentiment_analysis(request: SentimentRequest):
    return analyze_sentiment(request.text)