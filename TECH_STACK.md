# SAATHI — Tech Stack

Scoped for a hackathon build (fast to ship, demo-stable) but structured so it doesn't have to be thrown away post-hackathon.

---

## 1. Frontend

| Layer | Choice | Notes |
|---|---|---|
| Framework | React + Vite | Fast dev server, matches attached UI reference's component-driven layout |
| Styling | Tailwind CSS | Utility-first, fastest way to hit the exact card/gradient look in the reference image |
| Animation | Framer Motion | For garden growth, level-up transitions, chat message entry |
| Charts | Recharts | Weekly trend line (Health Improvement–style chart in reference) |
| Icons | lucide-react | Clean line icons matching the reference's minimal iconography |
| Voice input | Web Speech API | Browser-native STT for MVP — no extra backend infra needed |
| Realtime chat | WebSocket (native or socket.io-client) | Peer chat + streaming AI responses |
| State | React Context or Zustand | Keep it light — avoid Redux for a hackathon timeline |

---

## 2. Backend

| Layer | Choice | Notes |
|---|---|---|
| Framework | Python + FastAPI | Async-friendly, fast to scaffold REST + WebSocket endpoints |
| Realtime | FastAPI WebSocket routes | Peer chat, streaming AI companion responses |
| Auth | JWT (fastapi-users or custom) | Keep signup minimal — email + password is enough for MVP |
| Background tasks | FastAPI BackgroundTasks or simple async queue | Safety Shield's async LLM classification pass |

---

## 3. Database

| Layer | Choice | Notes |
|---|---|---|
| Primary DB | MongoDB | Matches flexible, evolving schema needs (sessions, chat logs, progress) |
| Collections | `users`, `sessions`, `roleplay_sessions`, `peer_conversations`, `progress`, `communities`, `reports` | Keep PII out of `peer_conversations` — reference by anonymous alias only |
| Vector store | ChromaDB | Peer-matching embeddings (preferences → similarity search) — good excuse to use your existing RAG skillset |

---

## 4. AI Layer

| Use case | Approach |
|---|---|
| AI Companion conversation | LLM (Claude or Gemini) via system prompt defining tone: warm, non-clinical, encouraging |
| Roleplay engine | LLM with per-scenario system prompt + conversation history in context — no need for a custom model |
| Communication feedback | Rule-based analysis on transcript (WPM calc, filler-word regex/dictionary match, pause detection from STT timestamps) + LLM-generated natural-language suggestion |
| Safety Shield — fast pass | wink-nlp (keyword/intent screening) — reuse the same pattern from your HR bot's intent detection layer |
| Safety Shield — deep pass | LLM classification prompt: "Classify this message for harassment / crisis language / manipulation. Return structured JSON." |
| Peer matching | Embed user preference tags → ChromaDB similarity search → top-N compatible matches |

---

## 5. Speech Pipeline (MVP-realistic version)

```
Voice Input (Web Speech API, browser-native)
        ↓
Transcript + rough timestamps
        ↓
Local stats: WPM, pause count, filler-word count (regex/dictionary)
        ↓
LLM: turn stats into a natural, encouraging suggestion sentence
        ↓
Render feedback card
```

For the live demo: if real-time STT proves flaky under demo conditions, fall back to a pre-recorded sample clip with precomputed stats — this is a completely normal hackathon move and won't be penalized if the pipeline is clearly real elsewhere.

---

## 6. Architecture Diagram (text form)

```
USER
  ↓
REACT + VITE FRONTEND (Tailwind, Framer Motion)
  ↓
FASTAPI BACKEND (REST + WebSocket)
  ↓
AI ORCHESTRATION LAYER
  ├── AI Companion (LLM)
  ├── Roleplay Engine (LLM + scenario prompts)
  ├── Speech Analysis (local stats + LLM suggestion)
  ├── Peer Matching (ChromaDB similarity search)
  └── Safety Shield (wink-nlp fast pass → LLM deep pass)
  ↓
MONGODB
  ├── users
  ├── sessions / roleplay_sessions
  ├── peer_conversations
  ├── progress
  └── reports
```

---

## 7. Deployment (hackathon-appropriate)

| Layer | Suggestion |
|---|---|
| Frontend | Vercel or Netlify |
| Backend | Render / Railway (fast FastAPI deploy) |
| Database | MongoDB Atlas free tier |
| Vector DB | ChromaDB (in-process or hosted, no separate infra needed for demo scale) |

---

## 8. Why this stack fits you specifically

- FastAPI + Mongo mirrors patterns you already know from the HR bot (Node/Express/MongoDB Atlas) — same mental model, different framework.
- wink-nlp reused for the Safety Shield fast-pass is a direct callback to your intent-detection work — a strong story for interviews.
- ChromaDB in peer matching gives you a legitimate embeddings/RAG-adjacent build for your GenAI portfolio, not just a hackathon prop.
- Web Speech API keeps the speech pipeline achievable in a hackathon timeframe without standing up a dedicated STT service.
