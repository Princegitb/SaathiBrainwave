from fastapi import APIRouter
from pydantic import BaseModel, Field
from services.sentiment import analyze_sentiment

router = APIRouter()


class SentimentRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=6000)
    source: str = "journal"


@router.post("/sentiment")
async def sentiment(request: SentimentRequest):
    result = analyze_sentiment(request.text)
    result["source"] = request.source
    return result