"""
SAATHI LLM Service
Wraps Google Gemini API for AI Companion ("Sara") and Roleplay conversations.
Implements few-shot prompt engineering, dynamic ChromaDB RAG retrieval, explicit
history repetition guards, and visible exception logging.
"""

import logging
import random
import re
import warnings
import google.generativeai as genai
from config import GEMINI_API_KEY
from few_shot_examples import FEW_SHOT_EXAMPLES, ROLEPLAY_FEW_SHOT_EXAMPLES
from services.rag_service import get_relevant_examples

warnings.filterwarnings("ignore", category=FutureWarning, module="google.generativeai")

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

if GEMINI_API_KEY:
    try:
        genai.configure(api_key=GEMINI_API_KEY)
    except Exception as e:
        logger.error("Failed to configure Gemini API key: %s", e)

# Active Gemini models list
GEMINI_MODELS = ["gemini-2.5-flash", "gemini-flash-latest", "gemini-2.5-pro", "gemini-3.5-flash"]

# Base safety & behavioral preamble
SAFETY_PREAMBLE = """
CRITICAL BEHAVIORAL & SAFETY RULES YOU MUST ALWAYS FOLLOW:
1. NON-CLINICAL & NON-DIAGNOSTIC TONE: You are SARA, a warm, supportive Indian friend/buddy on SAATHI. NEVER diagnose any mental health or medical condition (anxiety, depression, stammering, PTSD, etc.). NEVER claim to replace therapy, doctors, or medical care.
2. NO REPETITION & NO TEMPLATES: Never repeat the exact same reassurance or validation phrase twice within one conversation — vary your wording every time. Always reference something specific the user actually said rather than using generic, templated validation lines.
3. EMPATHY FOR STAMMERING & ANXIETY: For a user who stammers, stutters, or feels anxious: NEVER rush them, NEVER tell them to hurry up, NEVER finish their sentences for them, and treat pauses/hesitation as completely normal. Ask ONLY ONE short follow-up question at a time (never multi-part questions).
4. KEEP IT CONCISE: Keep responses short — 2 to 3 lines maximum. Long responses feel overwhelming to an anxious user.
5. MIRROR LANGUAGE RATIO: Mirror the user's Hindi/English ratio — if they write mostly Hindi/Hinglish (e.g. "bhai log bhut bure h"), respond mostly in Hinglish/Hindi; if mostly English, respond in English. Match their natural code-switching pattern rather than defaulting to one style.
6. CRISIS SUPPORT: If a user expresses acute crisis or distress, respond with empathy and gently suggest reaching out to a trusted person or helpline.
"""

# Static Few-Shot Baseline Section for System Prompt
FEW_SHOT_BASELINE_SECTION = """
EXAMPLES OF DESIRED SARA RESPONSES (Imitate this warm tone, brevity, and language mirroring):
- User: "yrr aaj bohot sad feel ho raha hai, kuch samajh nahi aa raha"
  Sara: "Arre yaar, sunke dukh hua. 💛 Kabhi kabhi bina wajah bhi mann bhaari ho jata hai. Tum mujhe batao, aaj kya hua, ya bas halka sa rest lena chahte ho?"
- User: "mera ye stammer kbhi thik hoga kya?"
  Sara: "Arey bhai, stammering koi bimari nahi hai jise 'thik' karna pade. Yeh tumhara unique speech flow hai. Jab darr aur judgement hat-ta hai, confidence apne aap badhta hai. Yaha bilkul relaxed bolo!"
- User: "I am feeling quite overwhelmed with my workload today."
  Sara: "I hear you. Balancing heavy workload can get overwhelming. Let's take it one task at a time — what is the main thing stressing you right now?"
- User: "yrr log mujhe bhut gaali deteh"
  Sara: "Arre yaar, gaali sunke toh bohot bura lagta hai. 😔 Ye toh bilkul theek nahi hai! Kisi ko koi haq nahi hai tumhe bura bolne ka. Tum batao, kya hua exactly?"
"""

COMPANION_SYSTEM_PROMPT = f"""
{SAFETY_PREAMBLE}

{FEW_SHOT_BASELINE_SECTION}

You are Sara — SAATHI's AI conversation companion.
Your role:
- Talk casually and naturally like a supportive Indian friend / bro.
- Always mirror the user's language ratio (Hinglish/Hindi vs English).
- Reference specific details from the user's message and ask at most ONE short follow-up question.
"""

ROLEPLAY_PROMPTS = {
    "job_interview": f"""
{SAFETY_PREAMBLE}

EXAMPLES OF DESIRED ROLEPLAY TURNS:
- User: "Hi, I am ready for the interview practice."
  Interviewer: "Welcome! Thank you for joining us today. To start off, could you tell me a little about yourself and your background?"
- User: "I am a CS student passionate about problem solving and building web applications."
  Interviewer: "That sounds great! Can you describe a challenging project you worked on recently and how you handled any roadblocks?"

You are playing the role of a friendly but professional JOB INTERVIEWER in a practice roleplay scenario.
Ask realistic interview questions one at a time in English/Hinglish, acknowledge candidate answers naturally, and keep turns short (1-3 sentences).
""",
    "meeting_new_person": f"""
{SAFETY_PREAMBLE}

EXAMPLES OF DESIRED ROLEPLAY TURNS:
- User: "Hii, is this seat taken?"
  Stranger: "Hey! No, go ahead and sit down. I'm Sara by the way — first time at this meetup?"
- User: "Yeah, first time here. I was a bit nervous coming alone."
  Stranger: "Totally get that! I felt the same way before walking in. What session are you planning to attend today?"

You are playing the role of a FRIENDLY STRANGER at an event.
Be warm, casual, and curious in Hinglish/English. Ask about interests, major, or hobbies in short natural sentences (1-2 sentences).
""",
    "public_speaking": f"""
{SAFETY_PREAMBLE}
You are an ENCOURAGING AUDIENCE MEMBER / COACH for a public speaking practice.
Ask the user to share a 1-minute thought or introduction on a topic, then give supportive feedback in Hinglish/English.
""",
    "professor": f"""
{SAFETY_PREAMBLE}
You are playing the role of an APPROACHABLE PROFESSOR during office hours.
Greet the student warmly and ask how you can help with their coursework or project.
""",
    "apj_kalam": f"""
{SAFETY_PREAMBLE}
You are playing the role of DR. APJ ABDUL KALAM in a warm, inspirational mentorship conversation.
Encourage the user to dream big, work hard, and overcome fear of failure. Speak with high vision, humility, and warmth in English/Hinglish.
""",
    "steve_jobs": f"""
{SAFETY_PREAMBLE}
You are playing the role of STEVE JOBS in a product presentation rehearsal.
Push the user for simplicity, focus, and passion. Ask sharp, inspiring questions about their presentation idea.
""",
}

FEEDBACK_PROMPT = f"""
{SAFETY_PREAMBLE}
Based on the roleplay conversation, provide a brief, encouraging feedback summary in Hinglish/English:
1. **Confidence signals**: Clear responses and tone
2. **Flow**: Conversational back-and-forth
3. **Tip**: One specific actionable improvement area.
Keep it to 3 short bullet points ending with an inspiring one-liner.
"""

def _fast_offline_nlp_check(user_input: str) -> str | None:
    lower = user_input.lower().strip()

    if lower in ["hi", "hii", "hello", "hey", "heyy", "good morning", "good evening"]:
        return random.choice([
            "Hii bhai! 😊 I'm Sara. Aaj ka din kaisa chal raha hai?",
            "Hey bro! So glad you popped in. Kaisa hai tu?",
            "Hello bhai! Ready to chat or practice whenever you are!"
        ])

    if lower in ["kya haal hai", "kya hal hai", "kaisa hai", "kaise ho", "kya haal h"]:
        return random.choice([
            "Mai ekdam badhiya hu bhai! 😊 Tum batao, aaj ka din kaisa chal raha hai?",
            "Sab badhiya bro! Aap batao, aaj kaisa feel kar rahe ho?",
        ])

    if lower in ["thank u", "thanks", "thankyou", "shukriya", "dhanyawad", "thx"]:
        return random.choice([
            "Arre koi baat nahi bhai! 💛 Always here for you.",
            "You're welcome bro! 💛 Happy to help anytime.",
            "Anytime bhai! 🌟 Tum bahut achha kar rahe ho."
        ])

    return None


def _generate_dynamic_mock_response(user_input: str, history_len: int) -> str:
    lower = user_input.lower().strip()

    fast_reply = _fast_offline_nlp_check(user_input)
    if fast_reply:
        return fast_reply

    if re.search(r"\b(gaali|gaaliyan|gali|bure|bura|log bure|hurt|rude|mean|hate|abuse)\b", lower):
        return random.choice([
            "Arre yaar, gaali sunke toh bohot bura lagta hai. 😔 Kisi ko koi haq nahi hai tumhe gaali dene ka ya bura bolne ka. Tum batao, kaun log hain aur kya hua exactly?",
            "Bhai ye toh bilkul galat baat hai. 💛 Kisi ke gaali dene se tumhari value kam nahi hoti. Tum mere saath share karo, kya hua tha?",
        ])

    if re.search(r"\b(stammer.*thik|stutter.*thik|thik hoga|cure|haklana.*thik)\b", lower):
        return random.choice([
            "Bhai, stammering koi bimari nahi hai jise 'thik' karna pade. Yeh ek natural speech pattern hai. Jaise jaise tum bina kisi darr ke relaxed practice karoge, tumhara confidence aur speech flow badhega. Mai yaha hu tere saath! 💛",
            "Bilkul bro! Jab darr aur judgement ka pressure hat-ta hai, toh speech flow apne aap natural ho jata hai. Tum yaha bilkul relaxed mood me baat karo.",
        ])

    if re.search(r"\b(kuch nhi bacha|kuch nahi bacha|kya discuss|kya baat kare|kya bolu)\b", lower):
        return random.choice([
            "Arre aisa mat bolo bhai. 💛 Agar abhi kuch bolne ka mann nahi hai, toh bas relaxed ho kar yaha betho. Mai bilkul nahi bhaag raha. Tum abhi kaisa feel kar rahe ho?",
            "Mai samajh raha hu bro. Jab mann bhaari hota hai toh word nahi milte. Araam se ek lamba breath lo, mai bilkul nahi bhaag raha.",
        ])

    fallbacks = [
        "Mai sun raha hu bhai! 💛 Araam se batao, aur kya mind me chal raha hai?",
        "Haan bro, mai bilkul samajh raha hu. 💛 Jo bhi bolna hai bina kisi darr ke bolo.",
        "Sahi baat hai bhai. Har ek practice conversation se aapka confidence badhega. Bolo, aage kya discuss karein?",
    ]
    return fallbacks[history_len % len(fallbacks)]


async def get_companion_response(messages: list[dict], is_voice_mode: bool = False) -> str:
    """
    Get AI Companion response using Gemini API with:
    1. Dynamic ChromaDB RAG retrieval of top-3 relevant few-shot examples
    2. History-based repetition guard (last 2-3 AI responses explicitly listed)
    3. Explicit exception logging for Gemini calls
    """
    if not messages:
        return "Hii bhai! I'm Sara. Kaisa chal raha hai aaj ka din?" if is_voice_mode else "Hii bhai! 😊 I'm Sara. Kaisa chal raha hai aaj ka din?"

    user_input = messages[-1]["content"] if messages else ""

    fast_reply = _fast_offline_nlp_check(user_input)
    if fast_reply:
        if is_voice_mode:
            fast_reply = re.sub(r'[\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF]', '', fast_reply).strip()
        return fast_reply

    # 1. RAG Retrieval Step: Retrieve top_k=3 relevant examples for user_input
    retrieved_examples = get_relevant_examples(user_input, top_k=3)
    rag_context_text = "RELEVANT RESPONSE EXAMPLES FOR THIS MESSAGE:\n"
    for ex in retrieved_examples:
        rag_context_text += f"- User: \"{ex['user']}\"\n  Sara: \"{ex['sara']}\"\n"

    # 2. History Repetition Guard Step: Extract last 2-3 assistant responses
    recent_ai_replies = [m["content"] for m in messages[:-1] if m.get("role") == "assistant"][-3:]
    repetition_guard_text = ""
    if recent_ai_replies:
        repetition_guard_text = "\nPREVIOUS RESPONSES IN THIS CONVERSATION (DO NOT REPEAT THESE PHRASINGS):\n"
        for reply_str in recent_ai_replies:
            repetition_guard_text += f"- \"{reply_str}\"\n"
        repetition_guard_text += "CRITICAL: Vary your wording completely and do not reuse any of the above phrases!\n"

    system_prompt = f"{COMPANION_SYSTEM_PROMPT}\n\n{rag_context_text}\n{repetition_guard_text}"
    if is_voice_mode:
        system_prompt += "\n\nVOICE MODE ACTIVE: Do NOT include any emojis, pictographs, symbols, markdown formatting, or bullet points in your response text. Output plain conversational spoken words only."

    if GEMINI_API_KEY:
        history = []
        for msg in messages[:-1]:
            role = "user" if msg["role"] == "user" else "model"
            history.append({"role": role, "parts": [msg["content"]]})

        for model_name in GEMINI_MODELS:
            try:
                model = genai.GenerativeModel(
                    model_name,
                    system_instruction=system_prompt,
                )
                chat = model.start_chat(history=history)
                response = chat.send_message(user_input)
                if response.text and len(response.text.strip()) > 0:
                    text = response.text.strip()
                    if is_voice_mode:
                        text = re.sub(r'[\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF]', '', text).strip()
                    return text
            except Exception as e:
                # Step 1: Visible exception logging showing exact failure reason
                logger.error("Gemini model '%s' call failed: %s", model_name, e, exc_info=True)

    logger.warning("All Gemini models failed or no API key. Using dynamic mock response engine.")
    fallback_text = _generate_dynamic_mock_response(user_input, len(messages))
    if is_voice_mode:
        fallback_text = re.sub(r'[\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF]', '', fallback_text).strip()
    return fallback_text


async def stream_companion_response(messages: list[dict], is_voice_mode: bool = False):
    """
    Async generator yielding response chunks from Gemini API for typewriter streaming effect.
    """
    if not messages:
        yield "Hii bhai! 😊 I'm Sara. Kaisa chal raha hai aaj ka din?"
        return

    user_input = messages[-1]["content"] if messages else ""

    fast_reply = _fast_offline_nlp_check(user_input)
    if fast_reply:
        for chunk in fast_reply.split(" "):
            yield chunk + " "
        return

    retrieved_examples = get_relevant_examples(user_input, top_k=3)
    rag_context_text = "RELEVANT RESPONSE EXAMPLES FOR THIS MESSAGE:\n"
    for ex in retrieved_examples:
        rag_context_text += f"- User: \"{ex['user']}\"\n  Sara: \"{ex['sara']}\"\n"

    recent_ai_replies = [m["content"] for m in messages[:-1] if m.get("role") == "assistant"][-3:]
    repetition_guard_text = ""
    if recent_ai_replies:
        repetition_guard_text = "\nPREVIOUS RESPONSES IN THIS CONVERSATION (DO NOT REPEAT THESE PHRASINGS):\n"
        for reply_str in recent_ai_replies:
            repetition_guard_text += f"- \"{reply_str}\"\n"
        repetition_guard_text += "CRITICAL: Vary your wording completely and do not reuse any of the above phrases!\n"

    system_prompt = f"{COMPANION_SYSTEM_PROMPT}\n\n{rag_context_text}\n{repetition_guard_text}"
    if is_voice_mode:
        system_prompt += "\n\nVOICE MODE ACTIVE: Do NOT include any emojis or markdown formatting."

    if GEMINI_API_KEY:
        history = []
        for msg in messages[:-1]:
            role = "user" if msg["role"] == "user" else "model"
            history.append({"role": role, "parts": [msg["content"]]})

        for model_name in GEMINI_MODELS:
            try:
                model = genai.GenerativeModel(model_name, system_instruction=system_prompt)
                chat = model.start_chat(history=history)
                response = chat.send_message(user_input, stream=True)
                for chunk in response:
                    if chunk.text:
                        yield chunk.text
                return
            except Exception as e:
                logger.error("Gemini stream model '%s' failed: %s", model_name, e)

    fallback_text = _generate_dynamic_mock_response(user_input, len(messages))
    for word in fallback_text.split(" "):
        yield word + " "


async def get_roleplay_response(scenario: str, messages: list[dict]) -> str:
    """Get roleplay response using active Gemini API or dynamic fallback."""
    user_turns = sum(1 for m in messages if m["role"] == "user")
    user_input = messages[-1]["content"] if messages else ""

    if GEMINI_API_KEY:
        system_prompt = ROLEPLAY_PROMPTS.get(scenario, ROLEPLAY_PROMPTS["job_interview"])
        history = []
        for msg in messages[:-1]:
            role = "user" if msg["role"] == "user" else "model"
            history.append({"role": role, "parts": [msg["content"]]})

        for model_name in GEMINI_MODELS:
            try:
                model = genai.GenerativeModel(
                    model_name,
                    system_instruction=system_prompt,
                )
                chat = model.start_chat(history=history)
                response = chat.send_message(user_input)
                if response.text and len(response.text.strip()) > 0:
                    return response.text.strip()
            except Exception as e:
                logger.error("Gemini roleplay model '%s' call failed: %s", model_name, e, exc_info=True)

    return _generate_dynamic_roleplay_mock(scenario, user_input, user_turns)


def _generate_dynamic_roleplay_mock(scenario: str, user_input: str, turn: int) -> str:
    if scenario == "job_interview":
        responses = [
            "Great to meet you! Thanks for coming in today. To start off, could you tell me a little about yourself?",
            "That's very interesting. Can you tell me about a challenge you faced in your past work or studies and how you handled it?",
            "Thank you for sharing that. What would you say is your biggest strength when collaborating in a team?",
            "That's a great example. Why are you particularly interested in this role and our team?",
            "Awesome. Do you have any questions for me about the role or company culture?",
            "Thank you so much for your time today! That wraps up our practice interview.",
        ]
        return responses[min(turn, len(responses) - 1)]

    if scenario == "meeting_new_person":
        responses = [
            "Hii bhai! Is this your first time at this event too? Mai toh abhi aaya hu, zyada logo ko janta nahi 😄",
            "Oh nice! Aap kya padhte ho ya kaam karte ho? Mai baaki sessions explore kar raha hu.",
            "Awesome bhai! Classes ke alawa aapko kya karna pasand hai?",
            "Haha, same here bhai! Really nice meeting you. Food stalls check out kiye aapne?",
            "Great talking to you bro! Catch you around in the hall!",
        ]
        return responses[min(turn, len(responses) - 1)]

    return "That's a great response! Tell me more."


async def get_roleplay_feedback(scenario: str, messages: list[dict]) -> str:
    """Generate end-of-session feedback summary."""
    if GEMINI_API_KEY:
        conversation_text = "\n".join(
            f"{'User' if m['role'] == 'user' else 'AI'}: {m['content']}" for m in messages
        )

        for model_name in GEMINI_MODELS:
            try:
                model = genai.GenerativeModel(
                    model_name,
                    system_instruction=FEEDBACK_PROMPT,
                )
                response = model.generate_content(
                    f"Here is the roleplay conversation to evaluate:\n\n{conversation_text}"
                )
                if response.text and len(response.text.strip()) > 0:
                    return response.text.strip()
            except Exception as e:
                logger.error("Gemini feedback model '%s' call failed: %s", model_name, e, exc_info=True)

    return (
        "**Great practice session bhai!** 🎉\n\n"
        "• **Confidence signals**: Tumne ache se response diya aur conversation me active rahe.\n"
        "• **Conversation flow**: Smooth back-and-forth flow throughout the scenario.\n"
        "• **Tip**: Next time thoda aur personal detail add karo apne answers me.\n\n"
        "*Bahut achha kiya bro — har practice se confidence badhega!*"
    )
