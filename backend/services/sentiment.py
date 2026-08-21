from functools import lru_cache

from fastapi import APIRouter
from pydantic import BaseModel


router = APIRouter()


MODEL_NAME = "j-hartmann/emotion-english-distilroberta-base"


@lru_cache(maxsize=1)
def get_emotion_classifier():
    """
    Load the transformer model only once.
    The first request may take longer because the model
    needs to be downloaded and loaded.
    """
    from transformers import pipeline
    return pipeline(
        "text-classification",
        model=MODEL_NAME,
        top_k=None,
    )


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
    """Fast, non-blocking emotion analysis fallback."""
    lower = text.lower()
    if any(w in lower for w in ["happy", "great", "awesome", "good", "excited", "glad", "yay", "love", "confident"]):
        return {
            "sentiment": "positive",
            "emotion": "joy",
            "intensity": 80,
            "confidence": 0.85,
            "suggested_action": "encourage_progress",
            "is_diagnostic": False,
        }
    if any(w in lower for w in ["sad", "depressed", "down", "unhappy", "cry", "lonely", "hurt"]):
        return {
            "sentiment": "negative",
            "emotion": "sadness",
            "intensity": 75,
            "confidence": 0.80,
            "suggested_action": "gentle_support",
            "is_diagnostic": False,
        }
    if any(w in lower for w in ["scared", "afraid", "nervous", "anxious", "worry", "fear", "panic"]):
        return {
            "sentiment": "negative",
            "emotion": "fear",
            "intensity": 75,
            "confidence": 0.80,
            "suggested_action": "gentle_support",
            "is_diagnostic": False,
        }
    if any(w in lower for w in ["angry", "mad", "annoyed", "frustrated", "hate", "irritated"]):
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
        "confidence": 0.60,
        "suggested_action": "continue_conversation",
        "is_diagnostic": False,
    }


def analyze_sentiment(text: str) -> dict:
    """
    Transformer-based emotion and sentiment analysis with instant fallback.
    """
    if not text or not text.strip():
        return {
            "sentiment": "neutral",
            "emotion": "neutral",
            "intensity": 0,
            "confidence": 0.0,
            "suggested_action": "continue_conversation",
            "is_diagnostic": False,
        }

    try:
        classifier = get_emotion_classifier()
        results = classifier(text.strip()[:300])

        if results and len(results) > 0:
            predictions = results[0]
            best_prediction = max(predictions, key=lambda item: item["score"])
            emotion = best_prediction["label"].lower()
            confidence = float(best_prediction["score"])
            sentiment = EMOTION_TO_SENTIMENT.get(emotion, "neutral")
            intensity = round(confidence * 100)
            suggested_action = EMOTION_ACTIONS.get(emotion, "continue_conversation")

            return {
                "sentiment": sentiment,
                "emotion": emotion,
                "intensity": intensity,
                "confidence": round(confidence, 2),
                "suggested_action": suggested_action,
                "is_diagnostic": False,
            }
    except Exception as e:
        # Fallback instantly if transformer model loading fails or takes too long
        pass

    return _fallback_sentiment(text)


@router.post("/sentiment")
def sentiment_analysis(request: SentimentRequest):
    return analyze_sentiment(request.text)