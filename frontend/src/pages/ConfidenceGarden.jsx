import { useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Sprout, Flower, TreePine, Trees, Sparkles } from 'lucide-react';
import useProgressStore from '../store/progressStore';

/**
 * Confidence Garden — visual progress metaphor. The "garden" grows in 4 stages
 * based on total completed activities. Pure SVG/CSS, no extra deps.
 */
const STAGES = [
  {
    min: 0,
    label: 'Seed',
    sub: 'Your practice has begun. Keep going.',
    Icon: Sparkles,
    color: '#C4B5FD',
  },
  {
    min: 1,
    label: 'Sprout',
    sub: 'A green shoot! Your first conversations are taking root.',
    Icon: Sprout,
    color: '#34D399',
  },
  {
    min: 3,
    label: 'Young plant',
    sub: 'Leaves are growing. Your confidence is building.',
    Icon: Flower,
    color: '#A78BFA',
  },
  {
    min: 8,
    label: 'Tree',
    sub: 'Strong and steady. Real conversations feel natural now.',
    Icon: TreePine,
    color: '#8B5CF6',
  },
  {
    min: 15,
    label: 'Garden',
    sub: 'A flourishing garden. You\'re ready for the real world.',
    Icon: Trees,
    color: '#6D28D9',
  },
];

export default function ConfidenceGarden() {
  const summary = useProgressStore((s) => s.summary);
  const fetchAll = useProgressStore((s) => s.fetchAll);

  useEffect(() => {
    fetchAll(true);
  }, []);

  const total = useMemo(() => {
    if (!summary) return 0;
    return (
      (summary.sessions_count || 0) +
      (summary.roleplay_completed || 0) * 2 +
      (summary.peer_messages || 0) +
      (summary.challenges_done || 0) * 3
    );
  }, [summary]);

  const stage = [...STAGES].reverse().find((s) => total >= s.min) || STAGES[0];
  const StageIcon = stage.Icon;

  // Next stage for the progress bar
  const stageIdx = STAGES.indexOf(stage);
  const nextStage = STAGES[stageIdx + 1];
  const progress = nextStage
    ? Math.min(100, Math.round(((total - stage.min) / (nextStage.min - stage.min)) * 100))
    : 100;

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <h1 className="text-h1">Confidence Garden</h1>
        <p className="text-body mt-1.5 max-w-xl">
          Each session helps your garden grow. There are no failures here — only
          seasons of practice.
        </p>
      </motion.div>

      {/* The garden visual */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="card relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary to-accent-lilac" />

        {/* Hero garden SVG */}
        <div className="flex items-center justify-center py-8">
          <GardenIllustration stageIdx={stageIdx} color={stage.color} />
        </div>

        <div className="text-center">
          <p className="text-label text-primary">Current stage</p>
          <h2 className="text-h2 mt-1.5 flex items-center justify-center gap-2">
            <StageIcon size={22} style={{ color: stage.color }} />
            {stage.label}
          </h2>
          <p className="text-body mt-2 max-w-md mx-auto">{stage.sub}</p>
        </div>

        {/* Progress bar */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[12px] text-text-tertiary">{stage.label}</span>
            <span className="text-[12px] text-text-tertiary">
              {nextStage ? `${nextStage.label} at ${nextStage.min}` : 'Max stage'}
            </span>
          </div>
          <div className="h-2.5 rounded-full bg-surface-soft overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className="h-full rounded-full"
              style={{ background: `linear-gradient(90deg, ${stage.color}, #8B5CF6)` }}
            />
          </div>
          <p className="text-[12px] text-text-tertiary mt-2 text-center">
            {total} {total === 1 ? 'activity' : 'activities'} counted
          </p>
        </div>
      </motion.div>

      {/* Stage ladder */}
      <div className="card">
        <h3 className="text-h2 mb-4">How it grows</h3>
        <div className="space-y-3">
          {STAGES.map((s, i) => {
            const reached = total >= s.min;
            return (
              <div
                key={s.label}
                className={`flex items-center gap-4 p-3 rounded-xl transition-colors ${
                  reached ? 'bg-surface-soft' : 'opacity-50'
                }`}
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: `${s.color}20` }}
                >
                  <s.Icon size={18} style={{ color: s.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-semibold text-text-primary">{s.label}</p>
                  <p className="text-[12px] text-text-tertiary">{s.sub}</p>
                </div>
                <span className="text-[12px] font-semibold text-text-tertiary">
                  {s.min}+
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Real World Impact: Plant a Real Tree ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="card p-6 bg-gradient-to-br from-emerald-50 via-white to-green-50 border-2 border-emerald-200/60 shadow-sm"
      >
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center text-2xl shadow-card shrink-0">
            🌱
          </div>
          <div className="space-y-1.5 flex-1">
            <div className="flex items-center justify-between">
              <span className="text-label text-emerald-600 font-bold uppercase tracking-wider">
                NGO Reforestation Partnership
              </span>
              <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[12px] font-bold">
                {Math.floor(total / 10)} Real Trees Planted 🌳
              </span>
            </div>
            <h3 className="text-h2 text-[18px] font-bold text-text-primary">
              Plant a Real Tree for Every 10 Practice Sessions
            </h3>
            <p className="text-body text-[13.5px] text-text-secondary leading-relaxed">
              Your personal confidence growth creates real-world environmental impact! SAATHI partners with global reforestation NGOs to plant 1 real sapling for every 10 sessions you complete.
            </p>
            <div className="pt-2 flex items-center gap-3">
              <div className="flex-1 h-2 rounded-full bg-emerald-200/70 overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all"
                  style={{ width: `${((total % 10) / 10) * 100}%` }}
                />
              </div>
              <span className="text-[12px] font-bold text-emerald-700">
                {total % 10}/10 Sessions to Next Tree
              </span>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

/**
 * Pure SVG garden illustration — grows with the stage. No external deps.
 */
function GardenIllustration({ stageIdx, color }) {
  const heights = [10, 30, 55, 90, 120]; // trunk / stem heights per stage
  const canopyScales = [0, 0.5, 0.8, 1, 1.2];

  return (
    <svg
      viewBox="0 0 240 240"
      className="w-60 h-60"
      style={{ animation: stageIdx > 0 ? 'float 5s ease-in-out infinite' : 'none' }}
      aria-label={`Garden stage ${stageIdx}`}
    >
      {/* Sky gradient */}
      <defs>
        <radialGradient id="sky" cx="50%" cy="30%" r="80%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#EDE9FB" />
        </radialGradient>
        <linearGradient id="trunk" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#A78BFA" />
          <stop offset="100%" stopColor="#6D28D9" />
        </linearGradient>
        <radialGradient id="canopy" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#A78BFA" />
          <stop offset="100%" stopColor="#8B5CF6" />
        </radialGradient>
      </defs>
      <circle cx="120" cy="120" r="120" fill="url(#sky)" />

      {/* Sun */}
      <motion.circle
        cx="195"
        cy="55"
        r="18"
        fill="#FBBF24"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.6, ease: 'backOut' }}
        style={{ transformOrigin: '195px 55px' }}
      />

      {/* Ground */}
      <ellipse cx="120" cy="200" rx="100" ry="14" fill="#C4B5FD" opacity="0.5" />
      <ellipse cx="120" cy="200" rx="80" ry="8" fill="#8B5CF6" opacity="0.25" />

      {/* Pot (always present) */}
      <path
        d="M 80 195 L 90 215 L 150 215 L 160 195 Z"
        fill="#6D28D9"
      />
      <rect x="80" y="190" width="80" height="8" rx="2" fill="#8B5CF6" />

      {/* Trunk / stem */}
      {stageIdx >= 0 && (
        <motion.rect
          x="115"
          y={210 - heights[stageIdx]}
          width="10"
          height={heights[stageIdx]}
          rx="5"
          fill="url(#trunk)"
          initial={{ scaleY: 0 }}
          animate={{ scaleY: 1 }}
          transition={{ duration: 0.6, ease: 'backOut' }}
          style={{ transformOrigin: '120px 210px' }}
        />
      )}

      {/* Canopy */}
      {stageIdx >= 2 && (
        <motion.circle
          cx="120"
          cy={210 - heights[stageIdx] - 20}
          r={28 * canopyScales[stageIdx]}
          fill="url(#canopy)"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.6, ease: 'backOut', delay: 0.2 }}
          style={{ transformOrigin: `120px ${210 - heights[stageIdx] - 20}px` }}
        />
      )}

      {/* Stage 4: multiple plants around */}
      {stageIdx >= 3 && (
        <>
          <motion.circle
            cx="55"
            cy="195"
            r="14"
            fill="#34D399"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            style={{ transformOrigin: '55px 195px' }}
          />
          <motion.circle
            cx="190"
            cy="195"
            r="14"
            fill="#A78BFA"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            style={{ transformOrigin: '190px 195px' }}
          />
        </>
      )}

      {/* Stage 5: extra blooms */}
      {stageIdx >= 4 && (
        <>
          <motion.circle cx="80" cy="180" r="6" fill="#FBBF24" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ duration: 0.4, delay: 0.6 }} style={{ transformOrigin: '80px 180px' }} />
          <motion.circle cx="160" cy="180" r="6" fill="#F87171" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ duration: 0.4, delay: 0.7 }} style={{ transformOrigin: '160px 180px' }} />
          <motion.circle cx="120" cy="160" r="6" fill="#FBBF24" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ duration: 0.4, delay: 0.8 }} style={{ transformOrigin: '120px 160px' }} />
        </>
      )}

      {/* Stage 1 sprout (tiny leaf) */}
      {stageIdx === 1 && (
        <motion.ellipse
          cx="120"
          cy={210 - heights[1] - 5}
          rx="10"
          ry="5"
          fill="#34D399"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          style={{ transformOrigin: `120px ${210 - heights[1] - 5}px` }}
        />
      )}
    </svg>
  );
}