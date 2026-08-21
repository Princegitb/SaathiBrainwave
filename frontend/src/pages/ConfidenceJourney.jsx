import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  MessageSquare, Mic, Briefcase, Users, Globe,
  Check, Lock, ArrowRight
} from 'lucide-react';
import useProgressStore from '../store/progressStore';
import SkeletonCard from '../components/ui/SkeletonCard';

const LEVEL_ICONS = [MessageSquare, Mic, Briefcase, Users, Globe];

export default function ConfidenceJourney() {
  const navigate = useNavigate();
  const journey = useProgressStore((s) => s.journey);
  const fetchAll = useProgressStore((s) => s.fetchAll);

  useEffect(() => {
    fetchAll(true);
  }, []);

  const currentLevel = journey?.current_level || 1;
  const progressPct = journey?.level_progress_pct || 0;
  const levels = journey?.levels || [];

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <h1 className="text-h1">Confidence Journey</h1>
        <p className="text-body mt-1.5 max-w-xl">
          Five small steps from text chats to real-world confidence. Each level
          unlocks the next — there are no hard gates, just gentle nudges.
        </p>
      </motion.div>

      {/* Current level progress card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="card relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary to-accent-lilac" />
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div>
            <p className="text-label text-primary">Current level</p>
            <h2 className="text-h2 mt-1">Level {currentLevel}</h2>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="w-32 h-2 rounded-full bg-surface-soft overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progressPct}%` }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
                className="h-full bg-gradient-to-r from-primary to-accent-lilac rounded-full"
              />
            </div>
            <span className="text-[13px] font-semibold text-text-primary">{progressPct}%</span>
          </div>
        </div>
        <p className="text-body">
          {levels[currentLevel - 1]?.description || 'Loading your journey...'}
        </p>
      </motion.div>

      {/* Level ladder */}
      <div className="space-y-3">
        {(!journey ? Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} height={88} />) :
          levels.map((level, idx) => {
            const Icon = LEVEL_ICONS[idx] || MessageSquare;
            const isCurrent = level.level === currentLevel;
            const isDone = level.level < currentLevel;
            const isLocked = level.level > currentLevel && !isCurrent;
            const isComingSoon = level.coming_soon;

            return (
              <motion.button
                key={level.level}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.25, delay: idx * 0.06 }}
                disabled={isComingSoon}
                onClick={() => !isComingSoon && !isLocked && navigate(level.route)}
                className={`w-full flex items-center gap-4 p-5 rounded-2xl border transition-all text-left ${
                  isCurrent
                    ? 'bg-primary text-white border-primary shadow-card-hover'
                    : isDone
                    ? 'bg-white border-border-subtle hover:border-primary-light'
                    : 'bg-white/60 border-border-subtle opacity-75 cursor-not-allowed'
                }`}
              >
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                    isCurrent
                      ? 'bg-white/20'
                      : isDone
                      ? 'bg-success/15'
                      : 'bg-surface-soft'
                  }`}
                >
                  {isDone ? (
                    <Check size={20} className="text-success" />
                  ) : isComingSoon ? (
                    <Lock size={20} className="text-text-tertiary" />
                  ) : (
                    <Icon size={20} className={isCurrent ? 'text-white' : 'text-primary'} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-label ${isCurrent ? 'text-white/80' : 'text-primary'}`}>
                      Level {level.level}
                    </span>
                    {isComingSoon && (
                      <span className="text-[11px] font-medium text-warning bg-warning/15 px-2 py-0.5 rounded-full">
                        Coming soon
                      </span>
                    )}
                  </div>
                  <h3 className={`text-[15px] font-semibold ${isCurrent ? 'text-white' : 'text-text-primary'}`}>
                    {level.title}
                  </h3>
                  <p className={`text-[12.5px] mt-0.5 line-clamp-2 ${isCurrent ? 'text-white/80' : 'text-text-secondary'}`}>
                    {level.description}
                  </p>
                </div>
                {!isComingSoon && !isLocked && (
                  <ArrowRight
                    size={18}
                    className={isCurrent ? 'text-white shrink-0' : 'text-text-tertiary shrink-0'}
                  />
                )}
              </motion.button>
            );
          })
        )}
      </div>
    </div>
  );
}