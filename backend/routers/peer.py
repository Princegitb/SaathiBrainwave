import logging
import random
from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from database import (
    get_or_create_user,
    log_progress,
    peer_sessions_collection,
    safe_insert,
)
from services.safety_shield import check_message, redact_text
from services.auth_service import get_current_user_id

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

router = APIRouter()


# Seeded saathi profiles (mock for the demo) — display alias + tag overlap
SEEDED_SAATHIS = [
    {
        "id": "saathi-284",
        "alias": "Anonymous #284",
        "tags": ["social-anxiety", "college", "practice"],
        "bio": "Working through social anxiety one chat at a time. Love talking about books and music.",
        "intent": "support",
    },
    {
        "id": "saathi-517",
        "alias": "Anonymous #517",
        "tags": ["confidence", "interview", "practice"],
        "bio": "Practiced for 30+ interviews last year. Happy to rehearse with you.",
        "intent": "practice",
    },
    {
        "id": "saathi-631",
        "alias": "Anonymous #631",
        "tags": ["loneliness", "casual", "listening"],
        "bio": "Here for low-pressure conversations. No advice unless asked.",
        "intent": "casual",
    },
]


@router.get("/peer/saathi")
async def find_saathi(user_id: str = Depends(get_current_user_id), anchor: str | None = None):
    """
    Return seeded saathi profiles. If anchor is provided, prefer the one whose
    alias matches (used by the "Continue chatting" flow). Otherwise return all.
    """
    if anchor:
        for s in SEEDED_SAATHIS:
            if s["id"] == anchor or s["alias"].lower() == anchor.lower():
                return {"match": s, "alternatives": [x for x in SEEDED_SAATHIS if x["id"] != s["id"]][:2]}
    return {"match": random.choice(SEEDED_SAATHIS), "alternatives": SEEDED_SAATHIS[:3]}


@router.get("/peer/saathi/all")
async def list_all_saathis():
    """List all seeded saathis for the Find Your Saathi page."""
    return {"saathis": SEEDED_SAATHIS}


class PeerMessage(BaseModel):
    role: str  # "user" | "saathi"
    content: str


class PeerChatRequest(BaseModel):
    user_id: str
    saathi_id: str
    intent: str  # "casual" | "practice" | "support" | "listening"
    messages: list[PeerMessage]


class PeerChatResponse(BaseModel):
    reply: str
    safety: dict
    redacted: bool = False


# Pre-written diverse replies per intent (20-30 unique lines each in Hinglish & English)
_SAATHI_REPLIES = {
    "casual": [
        "Hii bhai! Same here honestly. What kind of stuff do you usually talk about?",
        "Arey wah, that sounds really nice! I could go for something like that right now.",
        "Haha, fair point bro. So what's been on your mind this week?",
        "Sahi baat hai bhai! Main bhi zyadatar thoda chill aur relaxed conversations prefer karta hu.",
        "That's awesome! Weekend pe kya plan ban raha hai fir?",
        "Bilkul samajhta hu. Kabhi kabhi aisi low-pressure baatein karna hi sabse refreshing hota hai.",
        "Oh nice! Maine bhi haal me aisi ek cheez try ki thi. How was your experience?",
        "Bhai sachme, life me thoda pause lena aur bina filter baat karna kitna zaroori hai na.",
        "Haha yes! Waise your vibe seems really calm. Do you usually chat here often?",
        "Arey bilkul bro! Main to har din thoda time nikal ke aisi baatein kar leta hu.",
    ],
    "practice": [
        "Okay, let's try a quick one. Tell me about yourself as if you just met me at a college event.",
        "Nicely done — your pacing felt really natural! Want to try a slightly tougher question next?",
        "I noticed you paused before answering. That actually worked in your favor — made you sound thoughtful!",
        "Chalo great! Imagine main ek interviewer hu: 'What is your biggest project strength?' Take your time!",
        "Woah, that was crisp! Practice se hi ye nervousness door hogi. Next turn try karte hain?",
        "Aapka introduction kafi clean tha bro! Micro-pauses fine hain, bass rush mat karo.",
        "Let's practice ordering food or making small talk: 'Hey, is this seat taken?' How would you respond?",
        "Bohot achha delivery tha bhai! Aapka confidence clear nazar aa raha hai.",
        "Awesome bro! Ab pretend karo hum meeting room me hain — introduce your main idea in 2 sentences.",
        "Superb progress! Har ek rehearsal ke saath hesitation aadha hota chala ja raha hai.",
    ],
    "support": [
        "I hear you. Some days just feel like a lot, you know? Glad you reached out here. 💛",
        "That sounds exhausting bro. Is there anything small that helps when it gets that heavy?",
        "Just so you know — you don't have to have it all figured out. You're allowed to take it slow.",
        "Bhai main poori tarah samajh sakta hu. Bilkul relaxed ho kar jo bhi mann me aaye share karo.",
        "Heavy feel hona natural hai bro. Zero judgement hai yaha — take a deep breath.",
        "Arey bhai, it's totally okay to feel overwhelmed. Ek-ek step leke chalte hain na.",
        "Main yaha hu tere saath. You don't have to carry all this stress alone.",
        "Bhai dukh mat karo. Every tough phase passes, aur aap akahle nahi ho isme.",
        "It takes courage to express when things feel hard. Main sun raha hu bro.",
        "Aapki jagah koi bhi hota toh aisi hi feel karta. Don't be too hard on yourself. 💛",
    ],
    "listening": [
        "I'm here. Take all the time you need. 💛",
        "Mm, main dhyaan se sun raha hu bro. Continue karo.",
        "Thank you for sharing that with me. It means a lot.",
        "Haan bhai, go on. Main bilkul jaldi me nahi hu.",
        "I'm listening quietly. Speak at your own pace.",
        "Bilkul relaxed hoke bolo. I'm right here.",
        "Take your time bro, zero pressure here.",
        "Main sun raha hu. Jab ready ho aage batao.",
        "Always here to listen bro.",
    ],
}


@router.post("/peer/chat", response_model=PeerChatResponse)
async def peer_chat(
    req: PeerChatRequest,
    user_id: str = Depends(get_current_user_id),
):
    """
    Forward a peer message through Safety Shield, persist it, and return
    a mock saathi reply. Real peer matching would deliver the reply from
    the matched human; for the MVP we keep a scripted simulated reply.
    """
    await get_or_create_user(user_id, "Friend")

    if not req.messages:
        return PeerChatResponse(
            reply="",
            safety={"is_safe": True, "category": "safe"},
        )

    user_msg = req.messages[-1].content
    redacted_text = redact_text(user_msg)
    redacted = redacted_text != user_msg

    safety = await check_message(redacted_text, deep_check=True)
    if not safety["is_safe"]:
        if safety.get("crisis"):
            return PeerChatResponse(
                reply=(
                    "Hey — I think that's something a real human should hear. "
                    "Would you be open to reaching out to someone you trust, or a helpline? "
                    "I'm here, but I want you to get the kind of support that really helps. 💛"
                ),
                safety=safety,
                redacted=redacted,
            )
        if safety["action"] == "block":
            return PeerChatResponse(
                reply="Let's keep this conversation respectful, okay?",
                safety=safety,
                redacted=redacted,
            )

    # Pick a mock reply with non-repeating dynamic index
    pool = _SAATHI_REPLIES.get(req.intent, _SAATHI_REPLIES["casual"])
    user_turn_count = sum(1 for m in req.messages if m.role == "user")
    # Mix user_turn_count with msg hash to ensure varied turns across sessions
    reply_idx = (user_turn_count - 1 + hash(user_msg) % len(pool)) % len(pool)
    reply = pool[reply_idx]

    # Persist
    await safe_insert(peer_sessions_collection, {
        "user_id": user_id,
        "saathi_id": req.saathi_id,
        "intent": req.intent,
        "messages": [{"role": m.role, "content": m.content} for m in req.messages],
        "reply": reply,
        "safety": safety,
        "created_at": datetime.now(timezone.utc),
    })
    await log_progress(user_id, "peer_message", {"saathi_id": req.saathi_id})

    return PeerChatResponse(reply=reply, safety=safety, redacted=redacted)