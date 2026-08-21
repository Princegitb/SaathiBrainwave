from fastapi import APIRouter, File, Form, UploadFile, HTTPException

from services.communication_service import analyze_communication


router = APIRouter(
    prefix="/communication",
    tags=["Communication Intelligence"],
)


@router.post("/analyze")
async def analyze_voice_communication(
    audio: UploadFile = File(...),
    transcript: str = Form(...),
):
    """
    Analyze a completed voice practice session.
    """

    try:
        audio_bytes = await audio.read()

        if not audio_bytes:
            raise HTTPException(
                status_code=400,
                detail="Audio file is empty.",
            )

        if not transcript.strip():
            raise HTTPException(
                status_code=400,
                detail="Transcript is required.",
            )

        result = analyze_communication(
            audio_bytes,
            transcript,
        )

        return {
            "success": True,
            "analysis": result,
        }

    except HTTPException:
        raise

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Communication analysis failed: {str(exc)}",
        )