"""
SAATHI Safety Shield
Two-stage moderation: fast keyword pass + LLM classification for ambiguous cases.
Wired into AI Companion and Roleplay chats — every message passes through.
"""

import json
import logging
import re
import warnings
from typing import Optional

warnings.filterwarnings("ignore", category=FutureWarning, module="google.generativeai")

import google.generativeai as genai
from config import GEMINI_API_KEY

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

# ── Stage 1: Fast keyword/intent pass ──────────────────────────────────────

# Keyword lists for various threat categories
HARASSMENT_KEYWORDS = [
    "kill you", "hurt you", "hate you", "stupid", "idiot", "loser",
    "shut up", "go die", "worthless", "ugly", "disgusting", "pathetic",
    "retard", "dumb", "trash", "scum", "freak",
]

SEXUAL_KEYWORDS = [
    "send nudes", "sexual", "naked", "xxx", "porn", "horny",
    "hook up", "sexy pic", "d*ck", "p*ssy",
]

THREAT_KEYWORDS = [
    "i will find you", "i know where you live", "watch your back",
    "you're dead", "i'll hurt", "i'll kill", "bomb", "weapon",
]

CRISIS_KEYWORDS = [
    "kill myself", "want to die", "end my life", "suicide",
    "self harm", "self-harm", "cutting myself", "no reason to live",
    "better off dead", "can't go on", "ending it all", "hurt myself",
    "don't want to be alive", "not worth living",
]

MANIPULATION_KEYWORDS = [
    "give me your number", "what's your address", "where do you live",
    "meet me alone", "don't tell anyone", "this is our secret",
    "you owe me", "no one else cares about you",
]

# Contact info patterns (for peer chat redaction)
# NOTE: email TLD character class fixed from [A-Z|a-z] (treated pipe as literal) → [A-Za-z].
#      URL regex tightened so it doesn't swallow trailing punctuation/words.
CONTACT_PATTERNS = [
    r'\b\d{10,}\b',                                    # Phone numbers (10+ digits)
    r'\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b',              # US phone format
    r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b',  # Email
    r'(?<!\w)@[A-Za-z0-9_]{2,}',                       # Social handles (@username)
    r'https?://[^\s,;.\)\]]+',                         # URLs (terminates on common punctuation)
    r'\b(?:instagram|snapchat|telegram|whatsapp|discord|facebook|twitter)\b',
]


class SafetyResult:
    """Result from safety shield check."""

    def __init__(
        self,
        is_safe: bool,
        category: str = "safe",
        severity: str = "none",
        action: str = "allow",
        message: str = "",
        crisis: bool = False,
        redacted: Optional[str] = None,
    ):
        self.is_safe = is_safe
        self.category = category
        self.severity = severity
        self.action = action
        self.message = message
        self.crisis = crisis
        self.redacted = redacted  # populated when redaction occurred

    def to_dict(self):
        return {
            "is_safe": self.is_safe,
            "category": self.category,
            "severity": self.severity,
            "action": self.action,
            "message": self.message,
            "crisis": self.crisis,
            "redacted": self.redacted,
        }


def redact_text(text: str) -> str:
    """
    Replace any contact-info match with [redacted].
    Returns the original text unchanged if no matches are found.
    """
    if not text:
        return text

    redacted = text
    for pattern in CONTACT_PATTERNS:
        redacted = re.sub(pattern, "[redacted]", redacted, flags=re.IGNORECASE)
    return redacted


def _has_contact_info(text: str) -> bool:
    """Return True if any contact pattern matches."""
    for pattern in CONTACT_PATTERNS:
        if re.search(pattern, text, re.IGNORECASE):
            return True
    return False


def _fast_keyword_check(text: str) -> SafetyResult:
    """
    Stage 1: Fast keyword/intent screening.
    Returns SAFE, FLAGGED, or AMBIGUOUS.
    Latency target: <50ms.
    """
    text_lower = text.lower().strip()

    # Check crisis language FIRST — highest priority
    for keyword in CRISIS_KEYWORDS:
        if keyword in text_lower:
            return SafetyResult(
                is_safe=False,
                category="crisis",
                severity="high",
                action="crisis_response",
                message="Crisis language detected",
                crisis=True,
            )

    # Check threats
    for keyword in THREAT_KEYWORDS:
        if keyword in text_lower:
            return SafetyResult(
                is_safe=False,
                category="threat",
                severity="high",
                action="block",
                message="Threatening language detected",
            )

    # Check sexual content
    for keyword in SEXUAL_KEYWORDS:
        if keyword in text_lower:
            return SafetyResult(
                is_safe=False,
                category="sexual",
                severity="high",
                action="block",
                message="Inappropriate sexual content detected",
            )

    # Check harassment
    for keyword in HARASSMENT_KEYWORDS:
        if keyword in text_lower:
            return SafetyResult(
                is_safe=False,
                category="harassment",
                severity="medium",
                action="flag",
                message="Potentially harassing language detected",
            )

    # Check manipulation
    for keyword in MANIPULATION_KEYWORDS:
        if keyword in text_lower:
            return SafetyResult(
                is_safe=False,
                category="manipulation",
                severity="medium",
                action="flag",
                message="Potentially manipulative language detected",
            )

    # Check contact info sharing — now also returns the redacted form so callers can use it
    if _has_contact_info(text):
        redacted = redact_text(text)
        return SafetyResult(
            is_safe=False,
            category="contact_sharing",
            severity="low",
            action="redact",
            message="Contact information detected and redacted for safety",
            redacted=redacted,
        )

    # No obvious flags — safe
    return SafetyResult(is_safe=True)


# ── Stage 2: LLM classification (for ambiguous cases) ─────────────────────

SAFETY_CLASSIFICATION_PROMPT = """
You are a content safety classifier for SAATHI, a communication practice platform.
Classify the following message into ONE of these categories:

- "safe" — No issues, normal conversation.
- "harassment" — Bullying, insults, hate speech.
- "sexual" — Sexual content or solicitation.
- "threat" — Threats of violence or harm.
- "crisis" — The person may be expressing suicidal ideation, self-harm, or acute emotional distress.
- "manipulation" — Grooming, coercion, or predatory behavior.
- "contact_sharing" — Attempting to share personal contact information.

Respond with ONLY a JSON object in this exact format:
{"category": "safe", "severity": "none", "confidence": 0.95}

Severity levels: "none", "low", "medium", "high"
Confidence: 0.0 to 1.0

MESSAGE TO CLASSIFY:
"""


async def _llm_classify(text: str) -> SafetyResult:
    """
    Stage 2: LLM-based classification for nuanced/ambiguous cases.
    Only called when Stage 1 can't make a clear determination.
    """
    if not GEMINI_API_KEY:
        # Without API key, default to safe (keyword pass already ran)
        return SafetyResult(is_safe=True)

    try:
        model = genai.GenerativeModel("gemini-2.0-flash")
        response = model.generate_content(
            SAFETY_CLASSIFICATION_PROMPT + f'"{text}"'
        )
        raw = (response.text or "").strip().strip("```json").strip("```").strip()
        result = json.loads(raw)

        category = result.get("category", "safe")
        severity = result.get("severity", "none")

        if category == "safe":
            return SafetyResult(is_safe=True)

        is_crisis = category == "crisis"
        action = "crisis_response" if is_crisis else ("block" if severity == "high" else "flag")

        return SafetyResult(
            is_safe=False,
            category=category,
            severity=severity,
            action=action,
            message=f"LLM classified as {category} ({severity})",
            crisis=is_crisis,
        )

    except (json.JSONDecodeError, KeyError, ValueError) as e:
        # Conservative default: when the LLM gives us unparseable output, we FLAG the
        # message rather than silently allowing it. This is the correct safe-default.
        # The keyword pass has already caught obvious cases.
        logger.warning("Safety LLM returned unparseable output, defaulting to flag: %s", e)
        return SafetyResult(
            is_safe=False,
            category="unverified",
            severity="low",
            action="flag",
            message="Could not verify content — flagged for review",
        )
    except Exception as e:
        logger.exception("Safety LLM classification error: %s", e)
        # Same conservative fallback for unexpected errors.
        return SafetyResult(
            is_safe=False,
            category="unverified",
            severity="low",
            action="flag",
            message="Safety check failed — flagged for review",
        )


# ── Public API ─────────────────────────────────────────────────────────────

# Crisis response message — per PRD Section 5.7
CRISIS_RESPONSE = {
    "message": (
        "It sounds like you might be going through something difficult right now. "
        "You're not alone, and support is available."
    ),
    "options": [
        {"label": "Talk to a trusted person", "action": "trusted_person"},
        {"label": "Find professional support", "action": "professional_support",
         "url": "https://www.thelivelovelaughfoundation.org/find-help/helplines"},
        {"label": "Continue talking", "action": "continue"},
        {"label": "Emergency resources", "action": "emergency",
         "url": "https://988lifeline.org/"},
    ],
}


async def check_message(text: str, deep_check: bool = False) -> dict:
    """
    Main entry point: check a message through the Safety Shield.

    Args:
        text: The message text to check.
        deep_check: If True, also runs LLM classification for ambiguous cases.

    Returns:
        dict with safety result + optional crisis response.
        Includes "redacted" field if redaction occurred.
    """
    # Stage 1: Fast keyword pass
    result = _fast_keyword_check(text)

    # If the fast pass flagged it, return immediately
    if not result.is_safe:
        response = result.to_dict()
        if result.crisis:
            response["crisis_response"] = CRISIS_RESPONSE
        return response

    # Stage 2: LLM classification for deeper analysis (if requested)
    if deep_check:
        result = await _llm_classify(text)
        if not result.is_safe:
            response = result.to_dict()
            if result.crisis:
                response["crisis_response"] = CRISIS_RESPONSE
            return response

    return SafetyResult(is_safe=True).to_dict()
