# SAATHI — Design System
Reference: attached "Mindo"-style wellness dashboard (soft lavender, glassmorphic cards, 3D hero illustration).

This file describes the exact visual language to replicate, then maps it onto SAATHI's specific screens.

---

## 1. Visual Identity Summary

- **Mood:** calm, soft, clinical-but-warm. Not playful/cartoonish, not sterile/medical.
- **Background:** full-bleed soft lavender-to-lilac gradient, subtle, almost flat (not a loud gradient).
- **Cards:** white or near-white, floating on the gradient with soft, diffused shadows (glassmorphism-lite — not heavy blur, just soft elevation).
- **Corners:** consistently rounded, 16–24px radius on cards, 999px (full pill) on nav items and small tags.
- **Hero element:** a 3D illustrative centerpiece (brain in the reference) with small floating stat "badge" cards overlapping its edges — for SAATHI this becomes an abstract 3D "confidence" motif (see Section 6).
- **Density:** generous whitespace, low visual noise, one clear focal point per screen.

---

## 2. Color Palette

```css
--bg-gradient-start: #EDE9FB;   /* soft lavender top */
--bg-gradient-end:   #D9CFF3;   /* deeper lilac bottom */

--surface-white:     #FFFFFF;
--surface-soft:      #F7F5FC;   /* nested card-on-card surface */

--primary-purple:    #8B5CF6;   /* main accent — buttons, active states */
--primary-purple-dark: #6D28D9; /* hover/pressed */
--primary-purple-light: #C4B5FD; /* badges, chips */

--accent-lilac-3d:   #A78BFA;   /* hero illustration base tone */

--text-primary:      #1E1B2E;   /* near-black navy, headings */
--text-secondary:    #6B7280;   /* muted gray, subtext/labels */
--text-tertiary:     #9CA3AF;   /* timestamps, faint labels */

--success-green:     #34D399;   /* "Low" stress, positive trend */
--warning-amber:     #FBBF24;   /* moderate/caution states */
--danger-red:         #F87171;  /* Safety Shield alerts only */

--border-subtle:     #EEECF7;
--shadow-color:       rgba(139, 92, 246, 0.12); /* tinted purple shadow, not gray */
```

**Rule:** shadows should be tinted purple (`--shadow-color`), never plain gray — this is what gives the reference image its soft, cohesive look instead of a generic SaaS look.

---

## 3. Typography

- **Font:** Inter or Plus Jakarta Sans (both free, both match the reference's geometric-but-friendly sans letterforms).
- **Scale:**
  - H1 / Greeting header: 28–32px, semi-bold, `--text-primary`
  - H2 / Card section titles: 18–20px, semi-bold
  - Body: 14–15px, regular, `--text-secondary`
  - Stat numbers (e.g. "65%", "42 mins"): 24–28px, bold, `--text-primary`
  - Labels/eyebrow text ("Status: Standard"): 11–12px, medium, `--text-tertiary`, uppercase optional

**Greeting pattern (direct from reference):**
> "Hello, **Sara** 👋 How are you feeling today?" — first name bolded, emoji inline, rest regular weight.
For SAATHI: `"Hello, {name} 👋 Ready to practice today?"` (rotate the second clause based on context — see Section 7).

---

## 4. Core Components

### 4.1 Top Navigation (pill nav bar)
- Horizontal row of pill-shaped nav buttons, one active (filled purple, white text/icon), rest inactive (white/transparent bg, gray text).
- Icon + label per pill: `Dashboard`, `Practice`, `Peer Chat`, `Progress` (SAATHI equivalents of the reference's Dashboard/Psychiatrist/Session/Progress).

### 4.2 Stat Card (floating badge card)
Used for: Goal Progress, Stress Level equivalent, Focus Power equivalent.
- White rounded rect, small icon top-right (settings/expand glyph), label + status line, then a large bold stat value.
- Can float partially overlapping the hero illustration (as in reference) on desktop; stack normally on mobile.

```
┌─────────────────────────┐
│ Goal Progress        ⚙  │
│ Status: Standard         │
│                           │
│ 65%                       │
└─────────────────────────┘
```

### 4.3 Trend Chart Card
- Title + subtitle ("Health Improvement / This week" → SAATHI: "Confidence Trend / This week")
- Smooth line/area chart, purple gradient fill under the line, day labels (Mon–Sun) on x-axis, minimal gridlines.

### 4.4 List Row (Reports-style)
Used for: session history, practice log.
- Left: small circular avatar/icon + title (bold) + date (muted, small, below title).
- Right: secondary label (e.g. counselor name) + circular download/action icon button.

### 4.5 Upcoming/Featured Card
Used for: "Next Roleplay Session" or "Continue Practice" CTA.
- Bold eyebrow label ("Upcoming Session" → "Continue Practice")
- Large countdown or stat (e.g. remaining time)
- Bottom row: circular avatar + name/context + arrow/CTA icon top-right.

### 4.6 Path/Track Chips (right rail)
Used for: "Active path" list (Meditation / Exercise / Journaling in reference).
- Vertical stack of pill/rounded-rect buttons, one per activity type.
- SAATHI equivalents: `AI Companion`, `Roleplay`, `Peer Chat`, `Real-World Challenge`.

### 4.7 3D Hero Illustration
- Reference uses a glossy 3D brain, purple-toned, centered, with soft ambient shadow beneath it.
- **SAATHI equivalent:** a 3D abstract "confidence" motif — options: a glowing 3D speech-bubble/sound-wave form, or a 3D plant/seedling (ties directly into the Confidence Garden gamification feature — recommended, since it reuses one visual metaphor across the whole product instead of introducing a second one).
- Implementation note for Antigravity: this can be a static illustration (Spline/Blender export as PNG/WebP) or a lightweight Three.js/Spline embed if time allows. For MVP, a well-lit static illustration is enough — do not over-invest build time here.

---

## 5. Layout Grid (Desktop Dashboard)

```
┌───────────────────────────────────────────────────────────┐
│  Logo          [ Dashboard ] [ Practice ] [ Peer ] [Progress] │  ← pill nav
├───────────────────────────────────────────────────────────┤
│  Hello, Sara 👋                     Confidence Trend        │
│  Ready to practice today?           (line chart card)       │
│                                                               │
│         [3D hero illustration]      [Stress/Focus            │
│    [Goal Progress] [Focus Power]     equivalent cards]       │
│                                                               │
├───────────────────────────────┬─────────────┬───────────────┤
│  Reports / Session History      │ Continue     │ Active Path   │
│  (list rows)                    │ Practice     │ (chip stack)  │
│                                  │ (CTA card)   │               │
└───────────────────────────────┴─────────────┴───────────────┘
```

Three-zone layout: **left/center** = greeting + hero + primary stats, **top-right column** = trend chart + secondary stat cards, **bottom row** = three panels (history list / featured CTA / quick-access chips) — this mirrors the reference image's structure exactly.

---

## 6. Screen-by-Screen Mapping

| Reference element | SAATHI equivalent |
|---|---|
| "Hello, Sara 👋 How are you feeling today?" | "Hello, {name} 👋 Ready to practice today?" |
| Goal Progress 65% | Confidence Journey progress (Level 2 of 5, etc.) |
| Stress Level — Low 70% | Confidence Score / Ease Level |
| Focus Power — 42 mins | Practice Time Today |
| Health Improvement (weekly chart) | Confidence Trend (weekly chart — speaking pace / filler-word trend) |
| Reports list (Cognitive Therapy, Dr. Jasmin...) | Practice Log (Job Interview Roleplay, Peer Chat, Speech Practice — with date + icon) |
| Upcoming Session + Dr. Jams Alther | Continue Practice / Next Suggested Roleplay |
| Active path (Meditation, Exercise, Journaling) | Quick Access (AI Companion, Roleplay, Peer Chat, Challenge) |
| 3D brain illustration | 3D seedling/speech-wave illustration (ties to Confidence Garden) |

---

## 7. Screen Specs (build these exact screens)

1. **Dashboard** — layout per Section 5, using the mapping table above.
2. **AI Companion Chat** — same lavender background, chat bubbles: user bubble = filled `--primary-purple`, white text, right-aligned; AI bubble = white card, `--text-primary`, left-aligned; persistent thin disclaimer strip pinned above input field.
3. **Roleplay Selector** — grid of scenario cards (same white-card style, icon + title + one-line description + "Start" pill button).
4. **Roleplay Session** — chat-style UI identical to AI Companion, with a small persistent scenario label chip at top ("🎤 Job Interview — in progress").
5. **Speech Feedback Result** — 4 stat cards in a grid (Pace / Pauses / Filler Words / Clarity) styled like Section 4.2, plus one full-width suggestion card below in `--surface-soft` background.
6. **Find Your Saathi** — centered card: alias avatar placeholder, compatibility tags as pill chips, conversation-intent selector (4 buttons per PRD Section 5.6), primary CTA button.
7. **Peer Chat** — same chat UI as AI Companion, alias name instead of real name, block/report icon buttons top-right, subtle "This conversation is monitored for safety" strip.
8. **Confidence Journey** — horizontal or vertical 5-step progress tracker, filled steps in `--primary-purple`, unfilled in `--border-subtle`, connecting line between them.
9. **Confidence Garden** — centered 3D/illustrative garden state (4–5 growth stages) with a small caption of the latest milestone.
10. **Progress Dashboard** — stat grid (Section 4.2 style) + one trend chart (Section 4.3 style) + practice log list (Section 4.4 style).

---

## 8. Motion Guidelines

- Card entry: fade + slight upward slide (12px), 200–300ms, ease-out.
- Chat messages: fade + slide-in from the sender's side, 150ms.
- Garden growth transitions: gentle scale/fade between stages, 400–600ms — this is the one place a slightly more delightful animation is worth the build time.
- Avoid bouncy/springy easing anywhere except the garden — the overall tone is calm, not playful.

---

## 9. Notes for Antigravity Prompting

When prompting the coding agent, reference this file plus `PRD.md` and `TECH_STACK.md` together, and be explicit that:
- The visual system in Section 2–5 is authoritative — don't default to a generic dark-mode SaaS look.
- Reuse one hero motif (seedling/speech-wave) across Dashboard and Confidence Garden for visual consistency — don't invent a second illustration style.
- Tailwind config should define the palette in Section 2 as custom theme colors up front, before any component is built, so every screen pulls from the same tokens.
