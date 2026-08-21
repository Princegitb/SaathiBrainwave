import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Sparkles, Mail, Lock, User, ArrowRight, ShieldCheck, AlertCircle, Check } from 'lucide-react';
import useUserStore from '../store/userStore';

const GOAL_OPTIONS = [
  'Stammering & Speech Practice',
  'Social Anxiety & Confidence',
  'Job Interview Prep',
  'Public Speaking & Presentations',
  'Making Friends & Casual Chat',
];

export default function Signup() {
  const navigate = useNavigate();
  const signup = useUserStore((s) => s.signup);

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedGoals, setSelectedGoals] = useState(['Stammering & Speech Practice']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const toggleGoal = (goal) => {
    if (selectedGoals.includes(goal)) {
      setSelectedGoals(selectedGoals.filter((g) => g !== goal));
    } else {
      setSelectedGoals([...selectedGoals, goal]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password || !displayName) return;

    setLoading(true);
    setError(null);

    try {
      await signup(email, password, displayName, selectedGoals);
      navigate('/');
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-b from-bg-gradient-start via-surface-soft to-bg-gradient-end">
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg bg-white/80 backdrop-blur-xl rounded-3xl p-8 shadow-card-lg border border-border-subtle space-y-6"
      >
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-primary mx-auto flex items-center justify-center shadow-card">
            <Sparkles size={24} className="text-white" />
          </div>
          <h1 className="text-[28px] font-bold text-text-primary tracking-tight font-serif">
            Create your account
          </h1>
          <p className="text-body text-[14px]">
            Join SAATHI — a safe, non-judgmental space to practice speaking.
          </p>
        </div>

        {error && (
          <div className="p-3.5 rounded-2xl bg-danger/10 border border-danger/20 text-danger text-[13px] flex items-center gap-2.5">
            <AlertCircle size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Signup Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-[12px] font-semibold text-text-secondary uppercase tracking-wider">Your Display Alias / Name</label>
            <div className="mt-1 flex items-center gap-2 px-4 py-3 rounded-2xl bg-surface-soft border border-border-subtle focus-within:border-primary transition-colors">
              <User size={18} className="text-text-tertiary" />
              <input
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g. Alex or Lotus"
                className="flex-1 bg-transparent text-[14px] text-text-primary outline-none"
              />
            </div>
          </div>

          <div>
            <label className="text-[12px] font-semibold text-text-secondary uppercase tracking-wider">Email Address</label>
            <div className="mt-1 flex items-center gap-2 px-4 py-3 rounded-2xl bg-surface-soft border border-border-subtle focus-within:border-primary transition-colors">
              <Mail size={18} className="text-text-tertiary" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="flex-1 bg-transparent text-[14px] text-text-primary outline-none"
              />
            </div>
          </div>

          <div>
            <label className="text-[12px] font-semibold text-text-secondary uppercase tracking-wider">Password</label>
            <div className="mt-1 flex items-center gap-2 px-4 py-3 rounded-2xl bg-surface-soft border border-border-subtle focus-within:border-primary transition-colors">
              <Lock size={18} className="text-text-tertiary" />
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="flex-1 bg-transparent text-[14px] text-text-primary outline-none"
              />
            </div>
          </div>

          {/* Goal selection pills */}
          <div>
            <label className="text-[12px] font-semibold text-text-secondary uppercase tracking-wider">What would you like to practice?</label>
            <div className="flex flex-wrap gap-2 mt-2">
              {GOAL_OPTIONS.map((g) => {
                const active = selectedGoals.includes(g);
                return (
                  <button
                    key={g}
                    type="button"
                    onClick={() => toggleGoal(g)}
                    className={`px-3 py-1.5 rounded-full text-[12px] font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                      active
                        ? 'bg-primary text-white shadow-card font-semibold'
                        : 'bg-surface-soft text-text-secondary hover:bg-primary-light/30'
                    }`}
                  >
                    {active && <Check size={12} />}
                    <span>{g}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-4 rounded-2xl bg-primary text-white text-[14px] font-semibold flex items-center justify-center gap-2 hover:bg-primary-dark transition-colors disabled:opacity-50 cursor-pointer shadow-card mt-4"
          >
            <span>{loading ? 'Creating Account...' : 'Get Started'}</span>
            <ArrowRight size={16} />
          </motion.button>
        </form>

        {/* Footer info & Login Link */}
        <div className="pt-2 text-center text-[13.5px] text-text-tertiary space-y-3">
          <p>
            Already have an account?{' '}
            <Link to="/login" className="text-primary font-semibold hover:underline">
              Log in
            </Link>
          </p>

          <div className="flex items-center justify-center gap-1.5 text-[11.5px] text-text-tertiary">
            <ShieldCheck size={14} className="text-success" />
            <span>Anonymous by default. Your data stays private.</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
