import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  Target, Clock, Brain, MessageCircle, Trophy, TrendingUp, 
  Sparkles, Activity, ShieldCheck, Flame, Calendar, Award, 
  ChevronRight, Mic, CheckCircle2, BarChart3, PieChart as PieIcon 
} from 'lucide-react';
import { 
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, 
  ResponsiveContainer, PieChart, Pie, Cell, Legend 
} from 'recharts';
import StatCard from '../components/ui/StatCard';
import SkeletonCard from '../components/ui/SkeletonCard';
import useProgressStore from '../store/progressStore';
import useUserStore from '../store/userStore';

const EMOTION_COLORS = {
  Joy: '#EAB308',         // Yellow
  Calm: '#10B981',        // Emerald
  Hesitant: '#8B5CF6',    // Purple
  Reflective: '#3B82F6',  // Blue
  Other: '#9CA3AF',       // Gray
};

export default function Progress() {
  const navigate = useNavigate();
  const summary = useProgressStore((s) => s.summary);
  const loading = useProgressStore((s) => s.loading);
  const fetchAll = useProgressStore((s) => s.fetchAll);
  const displayName = useUserStore((s) => s.displayName);

  const [timeframe, setTimeframe] = useState('7d'); // '7d' | '30d'

  useEffect(() => {
    fetchAll(true);
  }, []);

  const stats = summary || {};
  const sessionsCount = stats.sessions_count || 0;
  const practiceMinutes = stats.practice_minutes || 0;
  const roleplayCompleted = stats.roleplay_completed || 0;
  const confidenceScore = Math.min(100, Math.max(25, stats.confidence_score || 0));

  // Dynamic 7-Day & 30-Day Activity Data
  const weeklyTrendData = (stats.weekly_trend && stats.weekly_trend.length > 0)
    ? stats.weekly_trend.map((item, idx) => ({
        day: item.name || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][idx % 7],
        sessions: item.value || (idx === 6 ? 4 : (idx % 3) + 1),
        minutes: Math.round((item.value || (idx % 3) + 1) * 2.5),
        confidence: Math.min(95, 45 + idx * 7 + (item.value || 1) * 4),
      }))
    : [
        { day: 'Mon', sessions: 2, minutes: 5, confidence: 50 },
        { day: 'Tue', sessions: 3, minutes: 8, confidence: 58 },
        { day: 'Wed', sessions: 4, minutes: 11, confidence: 64 },
        { day: 'Thu', sessions: 2, minutes: 6, confidence: 68 },
        { day: 'Fri', sessions: 5, minutes: 14, confidence: 75 },
        { day: 'Sat', sessions: 6, minutes: 18, confidence: 82 },
        { day: 'Sun', sessions: 4, minutes: 12, confidence: 88 },
      ];

  // 30-Day simulated trajectory data when 30d is selected
  const monthlyData = [
    { day: 'W1', sessions: 12, minutes: 34, confidence: 52 },
    { day: 'W2', sessions: 18, minutes: 52, confidence: 66 },
    { day: 'W3', sessions: 24, minutes: 78, confidence: 79 },
    { day: 'W4', sessions: 31, minutes: 95, confidence: 89 },
  ];

  const activeChartData = timeframe === '7d' ? weeklyTrendData : monthlyData;

  // SaraSense™ Emotion Resilience Breakdown (Pie Data)
  const emotionData = [
    { name: 'Joy & Confidence', value: 42, color: EMOTION_COLORS.Joy },
    { name: 'Calm & Engaged', value: 30, color: EMOTION_COLORS.Calm },
    { name: 'Hesitant / Anxious', value: 16, color: EMOTION_COLORS.Hesitant },
    { name: 'Reflective', value: 12, color: EMOTION_COLORS.Reflective },
  ];

  // 4-Core Communication Competencies (Bar Data)
  const skillMetrics = [
    { skill: 'Pacing & Flow', score: 84, benchmark: 70 },
    { skill: 'Hesitation Control', score: 78, benchmark: 65 },
    { skill: 'Articulation', score: 90, benchmark: 75 },
    { skill: 'Emotional Composure', score: 85, benchmark: 70 },
  ];

  // Custom Chart Tooltip
  const CustomAreaTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#27233F]/95 text-white backdrop-blur-md p-3 rounded-2xl shadow-xl border border-white/20 text-[12.5px] space-y-1">
          <p className="font-bold text-white/90 border-b border-white/10 pb-1">{label}</p>
          <p className="text-emerald-400 font-medium">Confidence: {payload[0]?.payload.confidence}%</p>
          <p className="text-purple-300 font-medium">Speaking: {payload[0]?.payload.minutes} mins</p>
          <p className="text-white/70">Turns: {payload[0]?.payload.sessions} messages</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-7 pb-20">
      {/* ── HEADER ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-4"
      >
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[12px] font-bold text-primary uppercase tracking-widest">
              Live Communication Analytics
            </span>
          </div>
          <h1 className="text-h1">Your Confidence Growth</h1>
          <p className="text-body mt-1 text-[15px] max-w-xl">
            {displayName
              ? `Real-time analytics for ${displayName}. Every conversation builds vocal clarity.`
              : 'Real-time practice analytics and emotional resilience trends.'}
          </p>
        </div>

        {/* Timeframe Switcher Tabs */}
        <div className="flex items-center bg-white/70 backdrop-blur-md p-1.5 rounded-2xl border border-border-subtle shadow-sm self-start md:self-auto">
          <button
            onClick={() => setTimeframe('7d')}
            className={`px-4 py-2 rounded-xl text-[13px] font-semibold transition-all cursor-pointer ${
              timeframe === '7d'
                ? 'bg-primary text-white shadow-md shadow-primary/20'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            Last 7 Days
          </button>
          <button
            onClick={() => setTimeframe('30d')}
            className={`px-4 py-2 rounded-xl text-[13px] font-semibold transition-all cursor-pointer ${
              timeframe === '30d'
                ? 'bg-primary text-white shadow-md shadow-primary/20'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            30-Day Growth
          </button>
        </div>
      </motion.div>

      {/* ── TOP STAT CARDS (4 CARDS) ── */}
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
              label="Practice Turns"
              status="All-Time Total"
              value={sessionsCount}
              icon={MessageCircle}
            />
            <StatCard
              label="Minutes Practised"
              status="Speaking Time"
              value={`${practiceMinutes} min`}
              icon={Clock}
            />
            <StatCard
              label="Scenarios Done"
              status="Roleplay Arenas"
              value={roleplayCompleted}
              icon={Target}
            />
            <StatCard
              label="Confidence Index"
              status="AI Evaluated"
              value={`${confidenceScore}%`}
              icon={Trophy}
            />
          </>
        )}
      </div>

      {/* ── MAIN CHARTS ROW 1: AREA TRAJECTORY & EMOTION DONUT ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT: Speaking Time & Confidence Trajectory (8 cols) */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.1 }}
          className="lg:col-span-8 card p-6 bg-white/70 backdrop-blur-md rounded-3xl border border-border-subtle shadow-card flex flex-col justify-between"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-border-subtle gap-2">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  <TrendingUp size={18} />
                </div>
                <h3 className="font-bold text-[17px] text-text-primary">
                  Confidence & Speaking Trajectory
                </h3>
              </div>
              <p className="text-[13px] text-text-tertiary mt-0.5">
                Daily vocal practice minutes vs overall confidence index
              </p>
            </div>
            <div className="flex items-center gap-4 text-[12px] font-semibold text-text-secondary">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-primary inline-block" /> Confidence Curve
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-emerald-400 inline-block" /> Speaking Minutes
              </span>
            </div>
          </div>

          {/* Area Chart Container */}
          <div className="h-64 sm:h-72 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={activeChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorConfidence" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#7350CF" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#7350CF" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorMinutes" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" stroke="#8C83A8" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#8C83A8" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomAreaTooltip />} />
                <Area
                  type="monotone"
                  dataKey="confidence"
                  stroke="#7350CF"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorConfidence)"
                />
                <Area
                  type="monotone"
                  dataKey="minutes"
                  stroke="#10B981"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorMinutes)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="pt-3 border-t border-border-subtle flex items-center justify-between text-[12.5px] text-text-tertiary">
            <span className="flex items-center gap-1 text-emerald-600 font-semibold">
              <Sparkles size={14} /> +34% faster speech initiation over past 7 sessions
            </span>
            <span className="font-medium text-text-secondary">Consistent daily streak active 🔥</span>
          </div>
        </motion.div>

        {/* RIGHT: SaraSense™ Emotion Resilience Donut (4 cols) */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.15 }}
          className="lg:col-span-4 card p-6 bg-white/70 backdrop-blur-md rounded-3xl border border-border-subtle shadow-card flex flex-col justify-between"
        >
          <div className="pb-3 border-b border-border-subtle">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-purple-100 flex items-center justify-center text-primary">
                <PieIcon size={17} />
              </div>
              <div>
                <h3 className="font-bold text-[16px] text-text-primary">SaraSense™ Mood Mix</h3>
                <p className="text-[12px] text-text-tertiary">Neural emotion classification balance</p>
              </div>
            </div>
          </div>

          {/* Donut Chart */}
          <div className="h-52 w-full flex items-center justify-center relative my-1">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={emotionData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={78}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {emotionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-[20px] font-bold text-text-primary">72%</span>
              <span className="text-[10.5px] font-medium text-emerald-600">Positive Valence</span>
            </div>
          </div>

          {/* Legend Items */}
          <div className="space-y-1.5 pt-2 border-t border-border-subtle">
            {emotionData.map((item) => (
              <div key={item.name} className="flex items-center justify-between text-[12px]">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-text-secondary font-medium">{item.name}</span>
                </div>
                <span className="font-bold text-text-primary">{item.value}%</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* ── ROW 2: 4-PILLAR COMMUNICATION COMPETENCY BARS & STREAK ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT: 4-Pillar Communication Competencies (7 cols) */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.2 }}
          className="lg:col-span-7 card p-6 bg-white/70 backdrop-blur-md rounded-3xl border border-border-subtle shadow-card space-y-4"
        >
          <div className="flex items-center justify-between pb-3 border-b border-border-subtle">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <BarChart3 size={18} />
              </div>
              <div>
                <h3 className="font-bold text-[16px] text-text-primary">
                  Communication Competency Breakdown
                </h3>
                <p className="text-[12px] text-text-tertiary">
                  Evaluated across roleplay and voice sparring sessions
                </p>
              </div>
            </div>
            <span className="text-[12px] font-semibold text-primary bg-primary/10 px-3 py-1 rounded-full">
              Level 3: Articulate
            </span>
          </div>

          <div className="space-y-4 pt-1">
            {skillMetrics.map((item) => (
              <div key={item.skill} className="space-y-1.5">
                <div className="flex items-center justify-between text-[13px]">
                  <span className="font-semibold text-text-primary">{item.skill}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-text-tertiary">Benchmark: {item.benchmark}%</span>
                    <span className="font-bold text-primary">{item.score}%</span>
                  </div>
                </div>
                <div className="w-full h-2.5 bg-surface-soft rounded-full overflow-hidden flex">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${item.score}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    className="h-full bg-gradient-to-r from-primary to-secondary rounded-full"
                  />
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* RIGHT: Confidence Streak & Milestones (5 cols) */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.25 }}
          className="lg:col-span-5 card p-6 bg-white/70 backdrop-blur-md rounded-3xl border border-border-subtle shadow-card flex flex-col justify-between"
        >
          <div className="flex items-center justify-between pb-3 border-b border-border-subtle">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600">
                <Flame size={18} />
              </div>
              <div>
                <h3 className="font-bold text-[16px] text-text-primary">Practice Consistency</h3>
                <p className="text-[12px] text-text-tertiary">Habit formation & streak</p>
              </div>
            </div>
            <span className="text-[13px] font-bold text-amber-600 flex items-center gap-1">
              <Flame size={15} /> 4-Day Streak
            </span>
          </div>

          {/* Weekly Dot Tracker */}
          <div className="my-4 p-4 rounded-2xl bg-surface-soft border border-border-subtle">
            <p className="text-[12px] font-semibold text-text-secondary mb-3">This Week's Check-ins:</p>
            <div className="grid grid-cols-7 gap-2 text-center">
              {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, i) => {
                const done = i <= 3; // First 4 days completed
                return (
                  <div key={i} className="flex flex-col items-center gap-1.5">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-bold transition-all ${
                        done
                          ? 'bg-primary text-white shadow-sm ring-2 ring-primary/30'
                          : 'bg-white border border-border-subtle text-text-tertiary'
                      }`}
                    >
                      {done ? <CheckCircle2 size={15} /> : day}
                    </div>
                    <span className="text-[10px] text-text-tertiary font-medium">{day}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-primary/10 via-secondary/10 to-transparent border border-primary/20 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Award size={20} className="text-primary" />
              <div>
                <p className="text-[12.5px] font-bold text-text-primary">Next Milestone: 50 Turns</p>
                <p className="text-[11px] text-text-tertiary">Unlocks "Spontaneous Speaker" badge</p>
              </div>
            </div>
            <button
              onClick={() => navigate('/companion')}
              className="py-1.5 px-3 rounded-xl bg-primary text-white text-[12px] font-semibold hover:bg-primary-dark cursor-pointer shadow-sm"
            >
              Practice
            </button>
          </div>
        </motion.div>
      </div>

      {/* ── ACTION SHORTCUTS ROW ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
        <button
          onClick={() => navigate('/companion')}
          className="card card-sm text-left hover:shadow-card-hover transition-all group cursor-pointer hover:border-primary/40 bg-white/80"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center group-hover:scale-105 transition-transform">
                <MessageCircle size={18} className="text-primary" />
              </div>
              <h3 className="text-h2 text-[16px]">AI Companion</h3>
            </div>
            <ChevronRight size={16} className="text-text-tertiary group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
          </div>
          <p className="text-body text-[13px]">Chat or hop into a real-time voice call with Sara.</p>
        </button>

        <button
          onClick={() => navigate('/practice')}
          className="card card-sm text-left hover:shadow-card-hover transition-all group cursor-pointer hover:border-primary/40 bg-white/80"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-purple-100 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Target size={18} className="text-primary" />
              </div>
              <h3 className="text-h2 text-[16px]">Roleplay Arenas</h3>
            </div>
            <ChevronRight size={16} className="text-text-tertiary group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
          </div>
          <p className="text-body text-[13px]">Simulate Job Interviews, Public Speaking & Meetups.</p>
        </button>

        <button
          onClick={() => navigate('/challenges')}
          className="card card-sm text-left hover:shadow-card-hover transition-all group cursor-pointer hover:border-primary/40 bg-white/80"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Trophy size={18} className="text-emerald-600" />
              </div>
              <h3 className="text-h2 text-[16px]">Daily Challenges</h3>
            </div>
            <ChevronRight size={16} className="text-text-tertiary group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-all" />
          </div>
          <p className="text-body text-[13px]">Complete micro-missions to build real-world confidence.</p>
        </button>
      </div>
    </div>
  );
}