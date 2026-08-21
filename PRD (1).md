# SAATHI — Product Requirements Document (PRD)

**Tagline:** "A safe space to speak, connect, practice, and be heard."
**Version:** 1.0 (Hackathon MVP Spec)
**Doc purpose:** This file is the single source of truth for what SAATHI is, who it's for, and exactly what needs to be built. It is written to be fed directly into an AI coding agent (e.g. Antigravity) as project context.

---

## 1. Product Summary

SAATHI is an AI-powered social confidence and communication-practice platform. It helps people who struggle with social anxiety, loneliness, low confidence, or speech disfluency move through a guided journey:

**AI Conversation → Communication Practice → AI Roleplay → Safe Human Connection → Real-World Confidence**

SAATHI does not diagnose, treat, or replace therapy. It is a rehearsal space and a bridge toward real human connection — not a destination in itself.

---

## 2. Problem Statement

People with social anxiety, stammering, or loneliness often don't need advice — they need a low-stakes environment to:
- Talk without fear of judgment
- Practice real conversations before they happen
- Get honest, non-clinical feedback on how they communicate
- Meet others who understand the same struggle
- Get nudged toward real-world action, not stay stuck in an app forever

Existing mental-health apps mostly do mood tracking, meditation, or 1:1 AI chat. None of them combine **structured communication practice** with **safe, matched peer connection** and a **visible progress journey**.

---

## 3. Target Users

| Persona | Core need |
|---|---|
| College student with interview anxiety | Practice answering questions out loud before it matters |
| Person who stammers | Practice speaking without being corrected or judged |
| Lonely user with no one to talk to | Low-pressure conversation, at their own pace |
| Socially anxious professional | Rehearse difficult conversations (asking for a raise, meeting new people) |

---

## 4. Core Pillars

1. **AI Companion** — non-judgmental conversational partner (text/voice)
2. **AI Communication & Speech Practice** — feedback on pace, pauses, filler words, clarity
3. **AI Roleplay Simulator** — scenario-based practice (interviews, introductions, etc.)
4. **Anonymous Peer Connection** — matched, safe conversations with real people
5. **Safety & Support System** — moderation layer + crisis-resource pathways

---

## 5. Feature Specifications

### 5.1 AI Companion
**What it does:** A conversational AI the user can talk to via text (MVP) or voice (stretch), acting as a warm, non-judgmental listener.

**Behavior requirements:**
- Responds empathetically, never clinically or robotically.
- Can proactively suggest a practice exercise when it detects nervousness/anxiety language (e.g. "I have an interview tomorrow" → offer to roleplay it).
- Maintains conversation context within a session (last N turns).
- Must include a persistent, non-intrusive disclaimer: *"SAATHI is a support and practice tool, not a replacement for therapy or medical care."*
- Never claims to diagnose any mental health condition.

**Inputs:** Free text (voice-to-text optional for MVP).
**Outputs:** Conversational reply + optional suggested action ("Practice this scenario?", "Try a roleplay?").

---

### 5.2 AI Speech / Communication Practice
**What it does:** Analyzes a user's spoken response (from mic input) and returns communication feedback — not medical/clinical diagnosis.

**Metrics tracked:**
- Speaking pace (words per minute → bucketed as Slow / Moderate / Fast)
- Long pauses (count of pauses > 2 seconds)
- Filler word count ("um", "uh", "like", "so", etc.)
- Response duration
- Basic clarity/consistency heuristic (via transcript coherence, not audio-level diagnosis)

**Output format (example):**
```
Speaking Pace: Moderate
Long Pauses: 3
Filler Words: 5
Response Clarity: Good
Suggestion: "Try slowing down slightly and taking a comfortable pause before your next sentence."
```

**Critical constraint:** UI copy must always frame this as "communication practice feedback," never as a stammering diagnosis or medical assessment.

---

### 5.3 AI Roleplay Simulator
**What it does:** Lets the user pick a real-life scenario; the AI plays the other party and conducts a structured interaction, then gives feedback at the end.

**Scenarios (MVP — build 2–3 fully, list the rest as "coming soon"):**
- Job interview *(build this one — most demo-friendly)*
- Meeting a new person / college introduction *(build this one)*
- Ordering food / small talk *(optional third)*
- Talking to a professor, public speaking, phone call, group discussion, asking for help — future scope

**Flow:**
1. User selects scenario.
2. AI opens with a natural first line ("Tell me about yourself.")
3. User responds (text or voice).
4. AI continues the scenario for 3–6 turns.
5. On completion, AI gives a short feedback summary (tone, clarity, confidence signals — non-clinical).

---

### 5.4 Anonymous Peer Connection
**What it does:** Connects users to each other anonymously, grouped into interest/support communities.

**Communities (MVP — pick 3–4 to seed):**
- Social Anxiety Support
- Stammering Support
- Loneliness
- Confidence Building
- College Stress
- Public Speaking

**Requirements:**
- No real names, photos, or identifying info required to join.
- Users pick a display alias (auto-generated or self-chosen, no PII).
- Conversations are session-scoped by default (re-matched each time), not persistent long-term pairing, to reduce grooming/predatory-contact risk.
- All contact-info sharing attempts (phone numbers, socials, external links) are auto-flagged/redacted.

---

### 5.5 AI-Powered Peer Matching
**What it does:** Matches users based on stated preferences, not randomly.

**Matching inputs:**
- Preferred format (text vs voice)
- Preferred conversation length (short/long)
- Support goal (practice / casual / venting / listening only)
- Interest/community tags

**Matching logic (MVP):** Cosine similarity over a vector embedding of the user's stated preferences (see Tech Stack — ChromaDB). No sensitive medical/mental-health data is embedded — only self-declared, non-clinical preference tags.

**UI moment:** "Find Your Saathi" → shows compatibility framing ("You have several compatible conversation preferences") without exposing raw scores or personal data.

---

### 5.6 Safe Conversation Mode
Before a peer chat starts, the user picks an interaction intent:
- **Casual Conversation** — "Just want someone to talk to."
- **Practice Conversation** — "I want to practice communicating."
- **Support Conversation** — "I am having a difficult day."
- **Listening Mode** — "I don't need advice, just want someone to listen."

This sets expectations for both sides before the chat begins and should be visibly shown to both matched users.

---

### 5.7 AI Safety Shield
**What it does:** Moderates all peer conversations in real time.

**Detects:**
- Harassment / bullying / abusive language
- Sexual harassment
- Threatening behavior
- Manipulation patterns
- Signs of acute distress / crisis language

**Two-stage moderation (recommended architecture):**
1. **Fast local pass** — lightweight keyword/intent screening (low latency, catches obvious cases).
2. **LLM classification pass** — escalates ambiguous or high-risk messages to an LLM safety classifier for nuanced judgment.

**On crisis-language detection:**
- Never diagnose. Show a supportive, non-alarming message:
  > "It sounds like you might be going through something difficult right now."
- Offer options: Talk to a trusted person / Find professional support / Continue talking / Access emergency resources.
- Must not make categorical claims about confidentiality or automatic authority involvement.

**On abuse/harassment detection:**
- Immediate block option for the affected user.
- Auto-flag the conversation for review (report queue).
- Rate-limit new-account-to-new-account matching to reduce bot/predatory-farm patterns.

---

### 5.8 Confidence Journey
A 5-level visual progression that structures the whole product:

```
LEVEL 1 — Text conversation with AI
LEVEL 2 — Voice conversation with AI
LEVEL 3 — AI roleplay
LEVEL 4 — Anonymous conversation with another user
LEVEL 5 — Real-world communication challenge
```

Each level unlocks contextually (not hard-gated) — the system nudges the user forward but never blocks access.

---

### 5.9 Real-World Challenges
Small, optional, real-life prompts shown after in-app practice:
- "Ask someone for directions."
- "Introduce yourself to a new person."
- "Speak for one minute about your favorite topic."
- "Ask a professor one question."

User self-reports completion via a "Mark as done" action — no verification needed for MVP.

---

### 5.10 Gamification — Confidence Garden
A visual metaphor for progress. Each completed activity grows a virtual garden.

| Milestone | Visual state |
|---|---|
| First AI conversation | Seed planted |
| Completed speech practice | Plant growing |
| Completed AI roleplay | Tree growing |
| Multiple peer conversations | Garden expanding |

MVP: a simple visual state machine (4–5 stages) driven by an activity counter — no complex animation required.

---

### 5.11 Progress Dashboard
Shows practice metrics — explicitly framed as **practice stats, not psychological scores**.

**Example fields:**
- Practice Sessions: 17
- Speaking Time: 2h 14m
- Scenarios Completed: 12
- Peer Conversations: 5
- Challenges Completed: 8
- Trend charts: speaking pace, pause frequency, filler-word frequency, practice consistency

---

### 5.12 Personalized AI Coach
Uses session history to recommend the next practice step.
Examples:
- Frequent struggle with interview scenarios → "Your next challenge is a 5-minute mock interview."
- Prefers short sessions → "Let's start with a 2-minute conversation."

MVP: rule-based recommendation using simple session-history heuristics (no need for a full ML personalization model at hackathon stage).

---

## 6. Non-Functional Requirements

- **Multilingual:** English, Hindi, Hinglish (MVP UI copy should support at least English + Hinglish tone).
- **Accessibility:** Adjustable font size, high-contrast mode, text-to-speech, voice-to-text, simple/low-bandwidth mode.
- **Privacy:** Minimal PII collection. No real names required for peer features. Users can delete their data.
- **Latency:** Safety Shield fast-pass should respond in <300ms; LLM calls can be async with a loading state.

---

## 7. Ethical Guardrails (must be enforced in every AI-facing feature)

- Never diagnose a mental health condition.
- Never claim to replace a therapist, doctor, or professional service.
- Always disclose AI limitations clearly and persistently in the UI.
- Never encourage emotional dependency on the AI companion (no love-bombing language, no "I'll always be here for you only" framing).
- Always provide an exit path to real human/professional support during any distress signal.
- Give users control: block, report, delete conversation, delete account.

---

## 8. MVP Scope (Build This, Not Everything)

**Build fully:**
1. AI Companion (text-based)
2. AI Roleplay (2 scenarios: job interview, meeting someone new)
3. AI Safety Shield (keyword pass + one LLM classification pass)

**Build convincingly with light mocking (fine for a hackathon demo):**
4. Speech/Communication Feedback (can use a pre-recorded demo clip + precomputed stats if live STT is too heavy to build in time)
5. Anonymous Peer Chat + Matching (2 seeded demo profiles is acceptable)
6. Confidence Progress Dashboard (static/seeded data acceptable)

**Explicitly out of scope for MVP:** therapist marketplace, wearable integration, group voice discussions, institution dashboards — list these under Future Features only.

---

## 9. User Journey (End-to-End)

1. User creates an account.
2. Onboarding asks about communication preferences and goals (no clinical questions).
3. User enters AI Companion, has first conversation.
4. SAATHI recommends a communication exercise.
5. User completes an AI Roleplay.
6. User receives communication feedback.
7. SAATHI recommends an appropriate peer conversation.
8. User connects anonymously with a compatible peer.
9. User completes an optional real-world challenge.
10. Progress reflects in the Confidence Journey + Garden.

---

## 10. Success Metrics (for demo/pitch, not production analytics)

- Sessions completed per user
- Roleplay scenarios completed
- Peer conversations initiated
- Real-world challenges marked complete
- Safety Shield: flagged messages / false-positive rate (even a mocked number for the demo is fine)

---

## 11. Screens to Build (mapped to attached UI reference)

Reference style: soft lavender/purple gradient background, white glassmorphic cards, rounded 16–20px corners, pill-shaped nav, 3D illustrative hero element, minimal dark-navy text on white cards.

1. **Dashboard (Home)** — greeting header, Goal Progress card, Confidence Level card, Practice Time card, weekly trend chart, session list, "Continue Practice" CTA (maps directly to the attached reference image layout).
2. **AI Companion Chat** — chat interface, disclaimer strip, suggested-action chips.
3. **Roleplay Selector** — scenario cards grid.
4. **Roleplay Session** — chat/voice interface + live scenario label.
5. **Speech Feedback Result** — stat cards (pace, pauses, filler words, clarity) + suggestion text.
6. **Find Your Saathi (Peer Matching)** — compatibility card, conversation-intent selector, start-chat CTA.
7. **Peer Chat** — anonymous alias chat, block/report controls visible.
8. **Confidence Journey** — 5-level progress tracker.
9. **Confidence Garden** — gamified visual progress.
10. **Progress Dashboard** — stats grid + trend charts.

See `DESIGN_SYSTEM.md` for exact visual spec of these screens.
