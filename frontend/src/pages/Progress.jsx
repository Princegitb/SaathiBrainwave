import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Target, Clock, Brain, MessageCircle, Trophy, Check } from 'lucide-react';
import StatCard from '../components/ui/StatCard';
import SkeletonCard from '../components/ui/SkeletonCard';
import EmptyState from '../components/ui/EmptyState';
import useProgressStore from '../store/progressStore';
import useUserStore from '../store/userStore';

/**
 * Progress Dashboard — comprehensive view of practice stats and trends.
 */
export default function Progress() {
  const navigate = useNavigate();
  const summary = useProgressStore((s) => s.summary);
  const loading = useProgressStore((s) => s.loading);
  const fetchAll = useProgressStore((s) => s.fetchAll);
  const displayName = useUserStore((s) => s.displayName);

  useEffect(() => {
    fetchAll(true);
  }, []);

  const stats = summary || {};

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <h1 className="text-h1">Your Progress</h1>
        <p className="text-body mt-1.5 max-w-xl">
          {displayName
            ? `Here's how your practice is going, ${displayName}. Every session builds confidence.`
            : 'Every session builds confidence. Here\'s how yours is going.'}
        </p>
      </motion.div>

      {/* Top stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {loading || !summary ? (
          <>
            <SkeletonCard height={110} />
            <SkeletonCard height={110} />
            <SkeletonCard height={110} />
            <SkeletonCard height={110} />
          </>
        ) : (
          <>
            <StatCard
              label="Practice Sessions"
              status="Total"
              value={stats.sessions_count || 0}
              icon={MessageCircle}
            />
            <StatCard
              label="Minutes Practised"
              status="Estimated"
              value={`${stats.practice_minutes || 0} min`}
              icon={Clock}
            />
            <StatCard
              label="Scenarios Completed"
              status="AI Roleplay"
              value={stats.roleplay_completed || 0}
              icon={Target}
            />
            <StatCard
              label="Confidence Score"
              status="Practice based"
              value={`${stats.confidence_score || 0}%`}
              icon={Trophy}
            />
          </>
        )}
      </div>

      {/* Empty state for new users */}
      {!loading && summary && summary.sessions_count === 0 && (
        <div className="card">
          <EmptyState
            icon={Brain}
            title="Your story starts here"
            subtitle="Have a conversation with your AI Companion or try a roleplay to see your stats grow."
            ctaLabel="Talk to AI Companion"
            onCta={() => navigate('/companion')}
          />
        </div>
      )}

      {/* Quick links to the things that move the needle */}
      {!loading && summary && summary.sessions_count > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => navigate('/companion')}
            className="card card-sm text-left hover:shadow-card-hover transition-shadow group"
          >
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-9 h-9 rounded-xl bg-primary-light flex items-center justify-center">
                <MessageCircle size={18} className="text-primary-dark" />
              </div>
              <h3 className="text-h2 text-[16px]">AI Companion</h3>
            </div>
            <p className="text-body text-[13px]">Keep your daily conversation streak going.</p>
          </button>
          <button
            onClick={() => navigate('/practice')}
            className="card card-sm text-left hover:shadow-card-hover transition-shadow"
          >
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-9 h-9 rounded-xl bg-accent-lilac/30 flex items-center justify-center">
                <Target size={18} className="text-primary-dark" />
              </div>
              <h3 className="text-h2 text-[16px]">Roleplay</h3>
            </div>
            <p className="text-body text-[13px]">Practice another scenario to grow your confidence.</p>
          </button>
          <button
            onClick={() => navigate('/challenges')}
            className="card card-sm text-left hover:shadow-card-hover transition-shadow"
          >
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-9 h-9 rounded-xl bg-success/20 flex items-center justify-center">
                <Trophy size={18} className="text-success" />
              </div>
              <h3 className="text-h2 text-[16px]">Challenges</h3>
            </div>
            <p className="text-body text-[13px]">Try a real-world communication challenge today.</p>
          </button>
        </div>
      )}
    </div>
  );
}