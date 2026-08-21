"""
SAATHI Communication Intelligence

Analyzes voice-practice communication behavior.

This module intentionally does NOT diagnose anxiety,
stress, depression, or any medical condition.

It measures observable communication characteristics:
- speaking pace
- pauses
- filler words
- voice energy
- pitch variation
- response fluency
"""

import io
import re
import numpy as np
import librosa


FILLER_WORDS = {
    "um",
    "uh",
    "erm",
    "hmm",
    "like",
    "actually",
    "basically",
    "you know",
    "i mean",
    "sort of",
    "kind of",
}


def _count_words(text: str) -> int:
    words = re.findall(r"\b[\w']+\b", text.lower())
    return len(words)


def _detect_fillers(text: str):
    text_lower = text.lower()

    detected = []

    for filler in FILLER_WORDS:
        if " " in filler:
            count = len(
                re.findall(
                    rf"\b{re.escape(filler)}\b",
                    text_lower,
                )
            )
        else:
            count = len(
                re.findall(
                    rf"\b{re.escape(filler)}\b",
                    text_lower,
                )
            )

        if count > 0:
            detected.extend([filler] * count)

    return detected


def _analyze_pauses(audio, sr):
    """
    Detect relatively quiet sections in the recording.

    Returns:
        pause_count
        average_pause_duration
        total_pause_duration
    """

    if len(audio) == 0:
        return 0, 0.0, 0.0

    intervals = librosa.effects.split(
        audio,
        top_db=35,
    )

    if len(intervals) == 0:
        return 0, 0.0, 0.0

    pauses = []

    for i in range(len(intervals) - 1):
        end_previous = intervals[i][1]
        start_next = intervals[i + 1][0]

        duration = (start_next - end_previous) / sr

        if duration >= 0.35:
            pauses.append(duration)

    if not pauses:
        return 0, 0.0, 0.0

    return (
        len(pauses),
        round(float(np.mean(pauses)), 2),
        round(float(np.sum(pauses)), 2),
    )


def _analyze_energy(audio):
    """
    Estimate overall voice energy using RMS.
    """

    if len(audio) == 0:
        return 0.0

    rms = librosa.feature.rms(y=audio)[0]

    if len(rms) == 0:
        return 0.0

    energy = float(np.mean(rms))

    # Convert to a simple 0-100 scale.
    score = min(100.0, energy * 1000)

    return round(score, 1)


def _analyze_pitch(audio, sr):
    """
    Estimate pitch variation using fundamental frequency.
    """

    if len(audio) == 0:
        return 0.0

    try:
        f0, voiced_flag, voiced_prob = librosa.pyin(
            audio,
            fmin=librosa.note_to_hz("C2"),
            fmax=librosa.note_to_hz("C7"),
        )

        valid_pitch = f0[~np.isnan(f0)]

        if len(valid_pitch) < 2:
            return 0.0

        variation = np.std(valid_pitch)

        return round(float(variation), 2)

    except Exception:
        return 0.0


def _pace_label(words_per_minute: float):
    if words_per_minute < 90:
        return "Slow"

    if words_per_minute < 130:
        return "Moderate"

    if words_per_minute < 170:
        return "Good"

    return "Fast"


def _pause_label(pause_count: int):
    if pause_count == 0:
        return "Minimal"

    if pause_count <= 3:
        return "Occasional"

    if pause_count <= 6:
        return "Frequent"

    return "Very frequent"


def _fluency_score(
    words_per_minute,
    filler_count,
    pause_count,
):
    score = 100

    # Pace
    if words_per_minute < 70:
        score -= 15
    elif words_per_minute > 190:
        score -= 15

    # Fillers
    score -= min(30, filler_count * 5)

    # Pauses
    score -= min(25, max(0, pause_count - 2) * 4)

    return max(0, min(100, score))


def _fluency_label(score):
    if score >= 85:
        return "Excellent"

    if score >= 70:
        return "Good"

    if score >= 50:
        return "Developing"

    return "Needs practice"


def _generate_feedback(
    pace_label,
    pause_label,
    filler_count,
    fluency_label,
):
    suggestions = []

    if pace_label == "Fast":
        suggestions.append(
            "Try slowing down slightly so your ideas are easier to follow."
        )

    elif pace_label == "Slow":
        suggestions.append(
            "Try maintaining a slightly more consistent speaking pace."
        )

    if pause_label == "Very frequent":
        suggestions.append(
            "Practice connecting your sentences with shorter pauses."
        )

    elif pause_label == "Frequent":
        suggestions.append(
            "Try taking intentional pauses instead of stopping mid-thought."
        )

    if filler_count >= 3:
        suggestions.append(
            "Try replacing filler words with a short, intentional pause."
        )

    if not suggestions:
        suggestions.append(
            "Your communication was clear and reasonably fluent. "
            "Keep practicing with the same confidence."
        )

    return suggestions


def analyze_communication(
    audio_bytes: bytes,
    transcript: str,
):
    """
    Main communication analysis function.
    """

    audio, sr = librosa.load(
        io.BytesIO(audio_bytes),
        sr=None,
        mono=True,
    )

    duration = len(audio) / sr if sr else 0

    word_count = _count_words(transcript)

    fillers = _detect_fillers(transcript)

    if duration > 0:
        words_per_minute = (word_count / duration) * 60
    else:
        words_per_minute = 0

    pause_count, average_pause, total_pause = _analyze_pauses(
        audio,
        sr,
    )

    energy = _analyze_energy(audio)

    pitch_variation = _analyze_pitch(
        audio,
        sr,
    )

    pace_label = _pace_label(words_per_minute)

    pause_label = _pause_label(pause_count)

    fluency_score = _fluency_score(
        words_per_minute,
        len(fillers),
        pause_count,
    )

    fluency_label = _fluency_label(
        fluency_score
    )

    feedback = _generate_feedback(
        pace_label,
        pause_label,
        len(fillers),
        fluency_label,
    )

    return {
        "duration_seconds": round(duration, 2),

        "speaking_rate": {
            "words_per_minute": round(
                words_per_minute,
                1,
            ),
            "label": pace_label,
        },

        "pauses": {
            "count": pause_count,
            "average_duration_seconds": average_pause,
            "total_duration_seconds": total_pause,
            "label": pause_label,
        },

        "filler_words": {
            "count": len(fillers),
            "words": fillers,
        },

        "voice_energy": {
            "score": energy,
        },

        "pitch_variation": {
            "score": pitch_variation,
        },

        "response_fluency": {
            "score": fluency_score,
            "label": fluency_label,
        },

        "feedback": feedback,
    }