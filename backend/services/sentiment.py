from functools import lru_cache

from fastapi import APIRouter
from pydantic import BaseModel
from transformers import pipeline


router = APIRouter()


MODEL_NAME = "j-hartmann/emotion-english-distilroberta-base"


@lru_cache(maxsize=1)
def get_emotion_classifier():
    """
    Load the transformer model only once.
    The first request may take longer because the model
    needs to be downloaded and loaded.
    """
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


def analyze_sentiment(text: str) -> dict:
    """
    Transformer-based emotion and sentiment analysis.

    This analyzes emotional signals from conversation text.
    It is NOT a medical diagnosis.
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

    classifier = get_emotion_classifier()

    results = classifier(text.strip())

    if not results:
        return {
            "sentiment": "neutral",
            "emotion": "neutral",
            "intensity": 0,
            "confidence": 0.0,
            "suggested_action": "continue_conversation",
            "is_diagnostic": False,
        }

    predictions = results[0]

    best_prediction = max(
        predictions,
        key=lambda item: item["score"]
    )

    emotion = best_prediction["label"].lower()
    confidence = float(best_prediction["score"])

    sentiment = EMOTION_TO_SENTIMENT.get(
        emotion,
        "neutral"
    )

    intensity = round(confidence * 100)

    suggested_action = EMOTION_ACTIONS.get(
        emotion,
        "continue_conversation"
    )

    return {
        "sentiment": sentiment,
        "emotion": emotion,
        "intensity": intensity,
        "confidence": round(confidence, 2),
        "suggested_action": suggested_action,
        "is_diagnostic": False,
    }


@router.post("/sentiment")
def sentiment_analysis(request: SentimentRequest):
    return analyze_sentiment(request.text)