import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Smile, TrendingUp, X } from 'lucide-react';
import useUserStore from '../../store/userStore';

export default function PrePostSurveyModal({
  isOpen,
  onClose,
  type = 'pre', // 'pre' | 'post'
  sessionType = 'practice',
  onComplete,
}) {
  const [score, setScore] = useState(5);
  const [submitted, setSubmitted] = useState(false);
  const { userId } = useUserStore();

  if (!isOpen) return null;

  const handleSubmit = async () => {
    try {
      await fetch('/api/progress/confidence-survey', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId || 'demo-user',
          survey_type: type,
          score,
          session_type: sessionType,
        }),
      });
    } catch (e) {
      console.warn('Failed to post survey score:', e);
    }

    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      if (onComplete) onComplete(score);
      onClose();
    }, 1200);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 15 }}
          className="card max-w-md w-full p-6 bg-white relative shadow-modal"
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-text-tertiary hover:text-text-primary p-1"
          >
            <X size={18} />
          </button>

          {!submitted ? (
            <div className="space-y-6 text-center">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-primary-light flex items-center justify-center text-primary-dark">
                {type === 'pre' ? <Smile size={24} /> : <TrendingUp size={24} />}
              </div>

              <div>
                <h3 className="text-h2 text-[19px] font-bold text-text-primary">
                  {type === 'pre' ? 'Pre-Session Check-In' : 'Post-Session Reflection'}
                </h3>
                <p className="text-[13.5px] text-text-secondary mt-1">
                  {type === 'pre'
                    ? 'How confident do you feel right now before starting?'
                    : 'How confident do you feel after completing this practice?'}
                </p>
              </div>

              {/* 1-10 Slider */}
              <div className="space-y-3 pt-2">
                <div className="text-3xl font-extrabold text-primary">{score} / 10</div>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={score}
                  onChange={(e) => setScore(parseInt(e.target.value))}
                  className="w-full accent-primary cursor-pointer h-2 bg-surface-soft rounded-lg"
                />
                <div className="flex justify-between text-[11.5px] text-text-tertiary font-medium">
                  <span>1 - Anxious / Hesitant</span>
                  <span>10 - Fully Confident</span>
                </div>
              </div>

              <button
                onClick={handleSubmit}
                className="w-full py-3 rounded-2xl bg-primary text-white font-semibold hover:bg-primary-dark transition-colors cursor-pointer shadow-card"
              >
                Submit Score
              </button>
            </div>
          ) : (
            <div className="py-8 text-center space-y-3">
              <div className="text-4xl animate-bounce">🎉</div>
              <h4 className="text-h3 text-[17px] font-bold text-text-primary">
                Score Logged!
              </h4>
              <p className="text-[13px] text-text-tertiary">
                Your confidence trajectory has been updated on your dashboard.
              </p>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
