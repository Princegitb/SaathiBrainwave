import React from "react";
import "./CommunicationSnapshot.css";


export default function CommunicationSnapshot({
  analysis,
  loading = false,
}) {
  if (loading) {
    return (
      <div className="communication-card">
        <div className="communication-loading">
          Analyzing your communication...
        </div>
      </div>
    );
  }

  if (!analysis) {
    return null;
  }

  const {
    speaking_rate,
    pauses,
    filler_words,
    voice_energy,
    pitch_variation,
    response_fluency,
    feedback,
  } = analysis;

  return (
    <section className="communication-card">

      <div className="communication-header">
        <div>
          <span className="communication-eyebrow">
            SARA COMMUNICATION INTELLIGENCE
          </span>

          <h2>Your Communication Snapshot</h2>

          <p>
            Here's how your voice practice session went.
          </p>
        </div>

        <div className="communication-icon">
          🎙️
        </div>
      </div>


      <div className="communication-grid">

        <div className="communication-metric">
          <span className="metric-icon">🗣️</span>

          <div>
            <small>Speaking pace</small>

            <strong>
              {speaking_rate?.label || "—"}
            </strong>

            <span>
              {speaking_rate?.words_per_minute || 0} WPM
            </span>
          </div>
        </div>


        <div className="communication-metric">
          <span className="metric-icon">⏸️</span>

          <div>
            <small>Pauses</small>

            <strong>
              {pauses?.label || "—"}
            </strong>

            <span>
              {pauses?.count || 0} detected
            </span>
          </div>
        </div>


        <div className="communication-metric">
          <span className="metric-icon">🔤</span>

          <div>
            <small>Filler words</small>

            <strong>
              {filler_words?.count || 0} detected
            </strong>

            {filler_words?.words?.length > 0 && (
              <span>
                {filler_words.words.join(", ")}
              </span>
            )}
          </div>
        </div>


        <div className="communication-metric">
          <span className="metric-icon">🔊</span>

          <div>
            <small>Voice energy</small>

            <strong>
              {voice_energy?.score || 0}/100
            </strong>

            <span>
              Voice activity level
            </span>
          </div>
        </div>


        <div className="communication-metric">
          <span className="metric-icon">🎵</span>

          <div>
            <small>Pitch variation</small>

            <strong>
              {pitch_variation?.score || 0}
            </strong>

            <span>
              Vocal variation
            </span>
          </div>
        </div>


        <div className="communication-metric">
          <span className="metric-icon">💬</span>

          <div>
            <small>Response fluency</small>

            <strong>
              {response_fluency?.label || "—"}
            </strong>

            <span>
              {response_fluency?.score || 0}/100
            </span>
          </div>
        </div>

      </div>


      <div className="sara-feedback">

        <div className="sara-avatar">
          ✨
        </div>

        <div>
          <span>Sara says:</span>

          {feedback?.map((item, index) => (
            <p key={index}>
              "{item}"
            </p>
          ))}
        </div>

      </div>

    </section>
  );
}