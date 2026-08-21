import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowUpRight, Clock3, MessageCircle, Mic, Sparkles, Target, Users, Check, BriefcaseBusiness } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import useProgressStore from '../store/progressStore';
import useUserStore from '../store/userStore';

const scenarios = [
  { icon: '💼', title: 'Job Interview', subtitle: 'Get ready for your next opportunity', path: '/practice' },
  { icon: '👋', title: 'Meet Someone New', subtitle: 'Practice a warm introduction', path: '/practice' },
  { icon: '🎙️', title: 'Public Speaking', subtitle: 'Find your clear, steady voice', path: '/practice' },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const displayName = useUserStore((s) => s.displayName);
  const summary = useProgressStore((s) => s.summary);
  const fetchAll = useProgressStore((s) => s.fetchAll);

  useEffect(() => { fetchAll(true); }, [fetchAll]);

  const practiceMinutes = summary?.practice_minutes ?? 1;
  const sessions = summary?.sessions_count ?? 4;
  const progress = summary?.level_progress_pct ?? 56;
  const name = displayName || 'Sara';

  const weeklyTrend = summary?.weekly_trend || [
    { name: 'M', value: 1 },
    { name: 'T', value: 2 },
    { name: 'W', value: 3 },
    { name: 'T', value: 4 },
    { name: 'F', value: 2 },
    { name: 'S', value: 5 },
    { name: 'S', value: 1 },
  ];

  const streak = summary?.current_streak ?? 4;

  return (
    <div className="saathi-dashboard pb-20">
      <section className="dash-hero">
        <div className="dash-copy">
          <div className="eyebrow">YOUR COMMUNICATION SPACE</div>
          <h1>Hello, {name === 'Sara' ? 'Sara' : name} <span className="wave">👋</span><br/>How are you feeling<br/>today?</h1>
          <p>A quiet place to talk, practice, and build confidence at your own pace.</p>
        </div>
        <div className="hero-orb-card">
          <div className="orb-lines" />
          <div className="hero-orb">
            <strong>Small steps<br/>become progress</strong>
            <span>Sara is here whenever you are ready</span>
          </div>
        </div>
      </section>

      <section className="dash-stats">
        <div className="old-card stat-box">
          <span>Practice progress</span><Sparkles size={18}/>
          <b>{progress}%</b><small>Keep going, gently</small>
        </div>
        <div className="old-card stat-box">
          <span>Sessions complete</span><MessageCircle size={18}/>
          <b>{sessions}</b><small>Real practice, not pressure</small>
        </div>
        <div className="old-card stat-box">
          <span>Practice time</span><Clock3 size={18}/>
          <b>{practiceMinutes}<em> min</em></b><small>This journey is yours</small>
        </div>
      </section>

      <section className="dash-check-grid">
        <div className="old-card feeling-card">
          <div><h3>How are you feeling today?</h3><p>A check-in, not a label.</p></div>
          <Check size={19} className="accent-icon"/>
          <div className="mood-row">
            {['😞','😕','😐','🙂','😊'].map((m, i) => <button key={m} aria-label={`Mood ${i+1}`}>{m}</button>)}
          </div>
        </div>
        <button className="old-card start-sara" onClick={() => navigate('/companion')}>
          <div><h3>Start with Sara</h3><p>Choose a gentle first step</p></div><ArrowUpRight size={20}/>
        </button>
      </section>

      <section className="dash-activity-grid">
        <div className="old-card weekly-card">
          <div className="section-head"><div><h3>Weekly activity</h3><p>Your practice rhythm</p></div><span>{streak} day streak</span></div>
          <div className="bars">{weeklyTrend.map((day, i) => {
            const h = Math.min(100, Math.max(4, day.value * 15));
            return (
              <div className="bar-col" key={i}>
                <div className="bar" style={{height:`${h}px`}} title={`${day.value} sessions`}/>
                <small>{day.name}</small>
              </div>
            );
          })}</div>
        </div>
        <div className="old-card upcoming-card">
          <div className="section-head"><div><h3>Continue your practice</h3><p>Pick a gentle next step</p></div></div>
          <button onClick={() => navigate('/practice')}><span>💼 &nbsp; Job Interview</span><ArrowUpRight size={16}/></button>
          <button onClick={() => navigate('/practice')}><span>👋 &nbsp; Meet Someone New</span><ArrowUpRight size={16}/></button>
          <button onClick={() => navigate('/practice')}><span>🎙️ &nbsp; Public Speaking</span><ArrowUpRight size={16}/></button>
        </div>
      </section>

      <section className="useful-section">
        <div className="section-head useful-head">
          <div><div className="eyebrow">A LITTLE PRACTICE GOES A LONG WAY</div><h2>What would feel useful today?</h2></div>
          <div className="useful-actions"><button onClick={() => navigate('/companion')} className="voice-btn"><Mic size={17}/> Voice with Sara</button><button onClick={() => navigate('/companion')} className="primary-btn">Talk to Sara</button></div>
        </div>
        <div className="scenario-row">
          {scenarios.map((s) => <button key={s.title} onClick={() => navigate(s.path)} className="old-card scenario-tile"><span className="scenario-icon">{s.icon}</span><h3>{s.title}</h3><p>{s.subtitle}</p></button>)}
        </div>
      </section>

      <section className="connection-banner">
        <div><div className="eyebrow">AI + HUMAN CONNECTION</div><h2>Feel → Talk → Practice → Connect → Grow</h2><p>Sara helps you take the next small step toward the people you want to meet.</p></div>
        <button onClick={() => navigate('/peer')} className="primary-btn">Find your Saathi 🤝</button>
      </section>
    </div>
  );
}
