import { useState } from 'react';
import { motion } from 'framer-motion';
import { Mic, Sparkles, ArrowRight } from 'lucide-react';
import SkeletonCard from '../components/ui/SkeletonCard';
import EmptyState from '../components/ui/EmptyState';
import useUserStore from '../store/userStore';
import { useToast } from '../components/ui/Toast';

/**
 * Speech Feedback page — text-based speech analysis for the MVP.
 * Submits to /api/speech/feedback which computes pace / filler / clarity.
 */
const SAMPLE = "Hi, um, my name is Aarav. I, uh, recently graduated from, like, the local college where I studied, you know, computer science. I really enjoy, um, working with people and, uh, building things that help others.";

export default function SpeechFeedback() {
  const userId = useUserStore((s) => s.ensureUserId());
  const toast = useToast();

  const [transcript, setTranscript] = useState('');
  const [duration, setDuration] = useState(45);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const wordCount = transcript.trim().split(/\s+/).filter(Boolean).length;

  const submit = async () => {
    if (!transcript.trim()) {
      toast({ type: 'error', message: 'Type or paste what you said first.' });
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch('/api/speech/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          transcript,
          duration_seconds: duration,
        }),
      });
      if (!res.ok) throw new Error('Request failed');
      const data = await res.json();
      setResult(data);
    } catch (e) {
      toast({ type: 'error', message: 'Could not analyse — please try again.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <h1 className="text-h1">Speech Practice</h1>
        <p className="text-body mt-1.5 max-w-xl">
          Type (or paste) what you said, set how long it took, and we'll share some
          communication-practice feedback. This is not a clinical assessment — just
          a friendly way to notice your rhythm.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="card space-y-4"
        >
          <div>
            <label className="block text-[12.5px] font-medium text-text-secondary uppercase tracking-wide mb-2">
              Your transcript
            </label>
            <textarea
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              placeholder="Type or paste what you said..."
              rows={8}
              className="w-full px-4 py-3 rounded-2xl bg-surface-soft text-[14.5px] text-text-primary placeholder-text-tertiary outline-none focus:ring-2 focus:ring-primary/30 resize-none"
            />
            <div className="flex items-center justify-between mt-2 text-[12px] text-text-tertiary">
              <span>{wordCount} words</span>
              <button
                onClick={() => setTranscript(SAMPLE)}
                className="text-primary hover:text-primary-dark transition-colors"
              >
                Try a sample
              </button>
            </div>
          </div>

          <div>
            <label className="block text-[12.5px] font-medium text-text-secondary uppercase tracking-wide mb-2">
              Duration (seconds)
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="10"
                max="180"
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="flex-1 accent-primary"
              />
              <span className="text-[14px] font-semibold text-text-primary w-14 text-right">
                {duration}s
              </span>
            </div>
          </div>

          <button
            onClick={submit}
            disabled={loading || !transcript.trim()}
            className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-primary text-white rounded-2xl font-medium hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Analysing...
              </span>
            ) : (
              <>
                <Sparkles size={16} />
                Get feedback
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.15 }}
          className="card"
        >
          {loading ? (
            <div className="space-y-3">
              <SkeletonCard height={60} />
              <SkeletonCard height={60} />
              <SkeletonCard height={60} />
              <SkeletonCard height={80} />
            </div>
          ) : !result ? (
            <EmptyState
              icon={Mic}
              title="Awaiting your input"
              subtitle="Submit a transcript on the left to see your communication-practice feedback here."
            />
          ) : (
            <div className="space-y-4">
              <h3 className="text-h2">Your feedback</h3>

              <div className="grid grid-cols-2 gap-3">
                <FeedbackMetric label="Pace" value={`${result.pace}`} sub={`${result.wpm} wpm`} />
                <FeedbackMetric label="Filler words" value={`${result.filler_count}`} sub="um, uh, like..." />
                <FeedbackMetric label="Long pauses" value={`${result.long_pauses}`} sub="approximate" />
                <FeedbackMetric label="Clarity" value={result.clarity} sub={`${result.clarity_score}/100`} />
              </div>

              <div className="p-4 bg-surface-soft rounded-2xl">
                <p className="text-label text-primary mb-2">Suggestion</p>
                <p className="text-[14.5px] text-text-primary leading-relaxed">
                  {result.suggestion}
                </p>
              </div>

              <p className="text-[11.5px] text-text-tertiary text-center">
                SAATHI provides communication-practice feedback, not medical or
                psychological assessment.
              </p>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}

function FeedbackMetric({ label, value, sub }) {
  return (
    <div className="p-4 bg-surface-soft rounded-2xl">
      <p className="text-label">{label}</p>
      <p className="text-stat mt-1.5 text-[20px]">{value}</p>
      <p className="text-[12px] text-text-tertiary mt-0.5">{sub}</p>
    </div>
  );
}