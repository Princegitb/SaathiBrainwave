import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ArrowRight, MessageCircle, Heart, Users } from 'lucide-react';
import useUserStore from '../store/userStore';

/**
 * OnboardingModal — first-run experience. Captures a display name + a couple
 * of preference chips. Persists to userStore and POSTs to /api/user/identify.
 */
export default function OnboardingModal() {
  const { onboarded, setDisplayName, setPreferences, finishOnboarding } =
    useUserStore();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [goals, setGoals] = useState([]);

  useEffect(() => {
    if (!onboarded) {
      // Slight delay so the page renders first
      const t = setTimeout(() => setOpen(true), 600);
      return () => clearTimeout(t);
    }
  }, [onboarded]);

  const close = async () => {
    await setDisplayName(name || 'Friend');
    await setPreferences({ goal_tags: goals });
    finishOnboarding();
    setOpen(false);
  };

  const toggleGoal = (g) =>
    setGoals((prev) => (prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]));

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-center justify-center bg-text-primary/40 backdrop-blur-sm p-4"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.25 }}
            className="bg-white rounded-3xl shadow-float p-8 max-w-md w-full"
          >
            <div className="flex items-center gap-3 mb-5">
              <div className="w-11 h-11 rounded-2xl bg-primary flex items-center justify-center">
                <Sparkles size={20} className="text-white" />
              </div>
              <div>
                <h2 className="text-h2">Welcome to SAATHI</h2>
                <p className="text-[12.5px] text-text-tertiary">
                  {step === 0 ? 'A safe space to practice.' : 'What brings you here?'}
                </p>
              </div>
            </div>

            {step === 0 ? (
              <>
                <p className="text-body mb-5">
                  SAATHI is your practice partner for tough conversations. Chat, rehearse,
                  meet peers — all in a safe, judgement-free space.
                </p>
                <label className="block text-[12.5px] font-medium text-text-secondary uppercase tracking-wide mb-2">
                  What should we call you?
                </label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && name.trim() && setStep(1)}
                  placeholder="e.g. Aarav"
                  maxLength={32}
                  className="w-full px-4 py-3 rounded-2xl bg-surface-soft text-[15px] text-text-primary placeholder-text-tertiary outline-none focus:ring-2 focus:ring-primary/30 mb-5"
                  autoFocus
                />
                <button
                  onClick={() => setStep(1)}
                  disabled={!name.trim()}
                  className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-primary text-white rounded-2xl font-medium hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Continue
                  <ArrowRight size={16} />
                </button>
              </>
            ) : (
              <>
                <p className="text-body mb-4">Pick anything that resonates — you can change these later.</p>
                <div className="grid grid-cols-1 gap-2.5 mb-5">
                  {[
                    { id: 'social-anxiety', label: 'Social anxiety support', icon: Heart },
                    { id: 'interview', label: 'Practising for interviews', icon: MessageCircle },
                    { id: 'confidence', label: 'Building confidence', icon: Sparkles },
                    { id: 'lonely', label: 'Just want to talk', icon: Users },
                  ].map(({ id, label, icon: Icon }) => {
                    const active = goals.includes(id);
                    return (
                      <button
                        key={id}
                        onClick={() => toggleGoal(id)}
                        className={`flex items-center gap-3 px-4 py-3 rounded-2xl border transition-all ${
                          active
                            ? 'bg-primary text-white border-primary'
                            : 'bg-surface-soft text-text-secondary border-transparent hover:border-primary-light'
                        }`}
                      >
                        <Icon size={18} />
                        <span className="text-[14px] font-medium">{label}</span>
                      </button>
                    );
                  })}
                </div>
                <button
                  onClick={close}
                  className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-primary text-white rounded-2xl font-medium hover:bg-primary-dark transition-colors"
                >
                  Start exploring
                  <ArrowRight size={16} />
                </button>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}