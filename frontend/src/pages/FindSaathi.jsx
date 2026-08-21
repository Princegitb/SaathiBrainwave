import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageSquare, Mic, ShieldCheck, Heart, Sparkles, Plus, 
  X, Check, Search, SlidersHorizontal, UserCheck, Flame 
} from 'lucide-react';
import PillChip from '../components/ui/PillChip';

const DEFAULT_INTEREST_SUGGESTIONS = [
  { id: 'Technology', label: 'Technology 💻' },
  { id: 'Music', label: 'Music 🎵' },
  { id: 'College', label: 'College 🎓' },
  { id: 'Books', label: 'Books 📚' },
  { id: 'Gaming', label: 'Gaming 🎮' },
  { id: 'Movies', label: 'Movies 🎬' },
  { id: 'Fitness', label: 'Fitness 🏃' },
  { id: 'Travel', label: 'Travel ✈️' },
  { id: 'Public Speaking', label: 'Public Speaking 🎙️' },
  { id: 'Psychology', label: 'Psychology 🧠' },
  { id: 'Startups', label: 'Startups 🚀' },
  { id: 'Art', label: 'Art 🎨' },
];

const ALL_SAATHI_PEERS = [
  {
    id: 'saathi-284',
    alias: 'Anonymous #284',
    badgeNum: '4',
    status: 'Online',
    statusColor: 'text-success',
    baseScore: 78,
    tags: ['Technology', 'Music', 'College', 'Gaming'],
    goal: 'Practice meeting new people without feeling judged',
    language: 'English + Hinglish',
    format: 'Text + voice',
    bio: 'CS student learning to speak up during team standups. Passionate about retro rock and indie tech.',
  },
  {
    id: 'saathi-517',
    alias: 'Anonymous #517',
    badgeNum: '7',
    status: 'Available today',
    statusColor: 'text-success',
    baseScore: 74,
    tags: ['Books', 'Design', 'Movies', 'Psychology'],
    goal: 'Speak more confidently in 1-on-1 conversations',
    language: 'English',
    format: 'Text',
    bio: 'Working through interview hesitation. Love discussing sci-fi books, cinematography, and human behavior.',
  },
  {
    id: 'saathi-631',
    alias: 'Anonymous #631',
    badgeNum: '1',
    status: 'Available today',
    statusColor: 'text-success',
    baseScore: 71,
    tags: ['Fitness', 'Travel', 'Music', 'Public Speaking'],
    goal: 'Make a supportive practice friend',
    language: 'English + Hindi',
    format: 'Voice',
    bio: 'Runner and music lover. Practicing impromptu speaking and overcoming social hesitation.',
  },
  {
    id: 'saathi-409',
    alias: 'Anonymous #409',
    badgeNum: '9',
    status: 'Online',
    statusColor: 'text-success',
    baseScore: 75,
    tags: ['Startups', 'Technology', 'Public Speaking', 'Art'],
    goal: 'Prepare for elevator pitches and networking',
    language: 'English + Hindi',
    format: 'Text + voice',
    bio: 'Early-stage builder. Looking for casual mock presentation partners to refine vocal cadence.',
  },
  {
    id: 'saathi-892',
    alias: 'Anonymous #892',
    badgeNum: '3',
    status: 'Available today',
    statusColor: 'text-success',
    baseScore: 72,
    tags: ['College', 'Gaming', 'Books', 'Fitness'],
    goal: 'Overcome stammering and conversation fear',
    language: 'Hinglish',
    format: 'Text + voice',
    bio: 'Engineering undergrad taking small daily steps to conquer speech hesitation in friendly banter.',
  },
  {
    id: 'saathi-105',
    alias: 'Anonymous #105',
    badgeNum: '5',
    status: 'Online',
    statusColor: 'text-success',
    baseScore: 76,
    tags: ['Movies', 'Music', 'Psychology', 'Travel'],
    goal: 'Gentle, pressure-free evening reflection',
    language: 'Hindi + English',
    format: 'Text',
    bio: 'Calm listener. Happy to exchange stories about favorite tracks, weekend travels, and daily wins.',
  },
];

export default function FindSaathi() {
  const navigate = useNavigate();

  // User's selected interests (Multi-select)
  const [userInterests, setUserInterests] = useState(['Technology', 'Music']);
  const [customTagInput, setCustomTagInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Toggle interest selection
  const toggleInterest = (interestName) => {
    if (userInterests.includes(interestName)) {
      setUserInterests(userInterests.filter((i) => i !== interestName));
    } else {
      setUserInterests([...userInterests, interestName]);
    }
  };

  // Add custom typed interest tag
  const handleAddCustomInterest = (e) => {
    e?.preventDefault();
    const clean = customTagInput.trim();
    if (!clean) return;
    const formatted = clean.charAt(0).toUpperCase() + clean.slice(1);
    if (!userInterests.includes(formatted)) {
      setUserInterests([...userInterests, formatted]);
    }
    setCustomTagInput('');
  };

  // Dynamic Peer Matching & Compatibility Calculation Engine
  const matchedPeers = useMemo(() => {
    return ALL_SAATHI_PEERS.map((peer) => {
      // Find matching tag overlap
      const commonTags = peer.tags.filter((t) =>
        userInterests.some((ui) => ui.toLowerCase() === t.toLowerCase())
      );

      // Dynamic calculation: base score + (10% boost for each shared interest)
      let dynamicScore = peer.baseScore;
      if (userInterests.length > 0) {
        const overlapRatio = commonTags.length / Math.max(1, userInterests.length);
        dynamicScore = Math.min(98, Math.round(peer.baseScore + overlapRatio * 20 + commonTags.length * 4));
      }

      return {
        ...peer,
        calculatedScore: dynamicScore,
        matchingCount: commonTags.length,
        isHighMatch: commonTags.length >= 2,
      };
    })
      .filter((peer) => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return (
          peer.alias.toLowerCase().includes(q) ||
          peer.goal.toLowerCase().includes(q) ||
          peer.tags.some((t) => t.toLowerCase().includes(q))
        );
      })
      .sort((a, b) => b.calculatedScore - a.calculatedScore);
  }, [userInterests, searchQuery]);

  const startChat = (saathiId) => {
    navigate(`/peer/chat/${saathiId}`);
  };

  return (
    <div className="space-y-8 pb-16">
      {/* ── HERO SECTION ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        {/* Left Hero Text */}
        <motion.div
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          className="lg:col-span-6 space-y-3"
        >
          <p className="text-label text-primary font-semibold tracking-wider uppercase">
            A SOFTER WAY TO MEET PEOPLE
          </p>
          <h1 className="text-[44px] font-bold text-text-primary tracking-tight font-serif leading-tight">
            Find your Saathi.
          </h1>
          <p className="text-body text-[15.5px] max-w-md">
            Connect anonymously through shared interests, goals, and communication preferences—not labels.
          </p>
        </motion.div>

        {/* Right Hero Visual Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="lg:col-span-6"
        >
          <div className="card p-8 relative overflow-hidden bg-gradient-to-br from-white via-surface-soft to-primary-light/20 min-h-[220px] flex items-center justify-center border border-border-subtle shadow-card-lg">
            {/* Dynamic floating badges reflecting user's selected interests */}
            <div className="absolute top-4 left-6 bg-white/85 backdrop-blur-md px-3.5 py-1.5 rounded-full text-[12px] font-bold text-primary shadow-card border border-border-subtle flex items-center gap-1.5">
              <Sparkles size={13} className="text-amber-500" />
              <span>{matchedPeers[0]?.calculatedScore || 82}% top match</span>
            </div>

            <div className="absolute top-10 right-8 bg-white/85 backdrop-blur-md px-3.5 py-1.5 rounded-full text-[12px] text-text-primary shadow-card border border-border-subtle font-medium">
              Text + voice
            </div>

            <div className="absolute bottom-6 left-12 bg-white/85 backdrop-blur-md px-3.5 py-1.5 rounded-full text-[12px] text-text-primary shadow-card border border-border-subtle font-medium">
              {userInterests.length} Selected Interests
            </div>

            {/* 3D Orb visual */}
            <div className="w-28 h-28 rounded-full bg-gradient-to-tr from-primary via-accent-lilac to-primary-light flex items-center justify-center shadow-float animate-pulse">
              <Heart size={44} className="text-white drop-shadow-md" />
            </div>
          </div>
        </motion.div>
      </div>

      {/* ── INTERACTIVE INTEREST SELECTOR BAR ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="card p-6 bg-white/85 backdrop-blur-md rounded-3xl border border-border-subtle shadow-card space-y-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border-subtle">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <SlidersHorizontal size={18} />
            </div>
            <div>
              <h3 className="font-bold text-[16px] text-text-primary">
                Select Your Interests & Topics
              </h3>
              <p className="text-[12.5px] text-text-tertiary">
                Choose the topics you enjoy so we match you with compatible peers in real time
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[12px] font-semibold text-text-secondary">
              Active Filters: <strong className="text-primary">{userInterests.length}</strong>
            </span>
            {userInterests.length > 0 && (
              <button
                onClick={() => setUserInterests([])}
                className="text-[11.5px] text-text-tertiary hover:text-danger underline transition-colors cursor-pointer"
              >
                Clear all
              </button>
            )}
          </div>
        </div>

        {/* Selected & Suggested Interest Chips */}
        <div className="space-y-3 pt-1">
          <div className="flex flex-wrap items-center gap-2">
            {DEFAULT_INTEREST_SUGGESTIONS.map((item) => {
              const active = userInterests.includes(item.id);
              return (
                <button
                  key={item.id}
                  onClick={() => toggleInterest(item.id)}
                  className={`py-1.5 px-3.5 rounded-full text-[13px] font-medium transition-all flex items-center gap-1.5 cursor-pointer shadow-sm ${
                    active
                      ? 'bg-primary text-white font-semibold ring-2 ring-primary/30 shadow-md scale-105'
                      : 'bg-surface-soft text-text-secondary hover:bg-white hover:text-text-primary border border-border-subtle'
                  }`}
                >
                  {active && <Check size={13} className="stroke-[3]" />}
                  <span>{item.label}</span>
                </button>
              );
            })}

            {/* Any custom added tags */}
            {userInterests
              .filter((ui) => !DEFAULT_INTEREST_SUGGESTIONS.some((s) => s.id === ui))
              .map((customTag) => (
                <span
                  key={customTag}
                  className="py-1.5 px-3.5 rounded-full text-[13px] font-semibold bg-primary text-white ring-2 ring-primary/30 shadow-md flex items-center gap-1.5"
                >
                  <Check size={13} className="stroke-[3]" />
                  <span>{customTag}</span>
                  <button
                    onClick={() => toggleInterest(customTag)}
                    className="hover:text-amber-200 transition-colors cursor-pointer ml-0.5"
                  >
                    <X size={13} />
                  </button>
                </span>
              ))}
          </div>

          {/* Add Custom Tag Form */}
          <form
            onSubmit={handleAddCustomInterest}
            className="flex items-center gap-2 max-w-sm pt-2"
          >
            <div className="flex-1 bg-surface-soft border border-border-subtle rounded-2xl px-3.5 py-2 flex items-center gap-2 focus-within:border-primary focus-within:bg-white transition-all">
              <Plus size={16} className="text-text-tertiary" />
              <input
                type="text"
                value={customTagInput}
                onChange={(e) => setCustomTagInput(e.target.value)}
                placeholder="Add custom topic (e.g. AI, Anime, Chess)..."
                className="w-full bg-transparent text-[13px] text-text-primary outline-none placeholder-text-tertiary"
              />
            </div>
            <button
              type="submit"
              disabled={!customTagInput.trim()}
              className="py-2 px-4 rounded-2xl bg-primary text-white text-[13px] font-semibold hover:bg-primary-dark disabled:opacity-40 transition-all cursor-pointer shadow-sm"
            >
              Add
            </button>
          </form>
        </div>
      </motion.div>

      {/* ── THOUGHTFUL MATCHES SECTION ── */}
      <div className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-[24px] font-bold text-text-primary">Thoughtful Matches</h2>
              <span className="text-[12px] font-semibold bg-primary/10 text-primary px-2.5 py-0.5 rounded-full">
                {matchedPeers.length} Peers Available
              </span>
            </div>
            <p className="text-body text-[13.5px]">
              Ranked dynamically by compatibility with your selected interests
            </p>
          </div>

          {/* Search Peer Input */}
          <div className="w-full sm:w-64 bg-white/80 backdrop-blur-md rounded-2xl px-3.5 py-2 border border-border-subtle flex items-center gap-2 focus-within:border-primary shadow-sm">
            <Search size={16} className="text-text-tertiary" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by topic, goal..."
              className="w-full bg-transparent text-[13px] text-text-primary outline-none"
            />
          </div>
        </div>

        {/* 3+ Match Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <AnimatePresence>
            {matchedPeers.map((match, i) => (
              <motion.div
                key={match.id}
                layout
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.25, delay: i * 0.05 }}
                className="card p-6 flex flex-col justify-between bg-white/85 backdrop-blur-md border border-border-subtle hover:shadow-card-hover hover:border-primary/40 transition-all rounded-3xl"
              >
                <div className="space-y-4">
                  {/* Header: Circle Badge + Title + Status */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-primary/20 text-primary-dark font-bold text-[14px] flex items-center justify-center shadow-sm">
                        {match.badgeNum}
                      </div>
                      <div>
                        <h3 className="text-h2 text-[16px]">{match.alias}</h3>
                        <p className="text-[12px] text-text-secondary">
                          <span className={`font-semibold ${match.statusColor}`}>• {match.status}</span>
                        </p>
                      </div>
                    </div>

                    {match.isHighMatch && (
                      <span className="text-[11px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full flex items-center gap-1 border border-amber-200">
                        <Flame size={12} /> Top Match
                      </span>
                    )}
                  </div>

                  {/* Compatibility % */}
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-[24px] font-bold text-primary leading-none">
                      {match.calculatedScore}%
                    </span>
                    <span className="text-[12px] text-text-tertiary font-medium">compatibility</span>
                  </div>

                  {/* Tag Pills (Highlight Matching Tags) */}
                  <div className="flex flex-wrap gap-1.5">
                    {match.tags.map((tag) => {
                      const isMatching = userInterests.some(
                        (ui) => ui.toLowerCase() === tag.toLowerCase()
                      );
                      return (
                        <span
                          key={tag}
                          className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-all ${
                            isMatching
                              ? 'bg-primary text-white font-semibold shadow-sm'
                              : 'bg-surface-soft text-text-secondary border border-border-subtle'
                          }`}
                        >
                          {tag} {isMatching && '✓'}
                        </span>
                      );
                    })}
                  </div>

                  {/* Goal Prompt Line */}
                  <div className="pt-2 border-t border-border-subtle">
                    <p className="text-[13px] text-text-primary font-medium leading-snug">{match.goal}</p>
                    <p className="text-[12px] text-text-tertiary mt-1 italic leading-relaxed">"{match.bio}"</p>
                  </div>

                  {/* Format & Language info */}
                  <div className="flex items-center justify-between text-[11.5px] text-text-tertiary pt-1">
                    <span>{match.language}</span>
                    <span className="font-semibold text-text-secondary">{match.format}</span>
                  </div>
                </div>

                {/* Action Buttons: -> Start Chat | 🎤 Voice */}
                <div className="grid grid-cols-2 gap-2 pt-4 mt-3">
                  <button
                    onClick={() => startChat(match.id)}
                    className="py-2.5 px-3 rounded-full bg-primary text-white text-[13px] font-medium flex items-center justify-center gap-1.5 shadow-card hover:bg-primary-dark transition-colors cursor-pointer"
                  >
                    <span>→ Start Chat</span>
                  </button>
                  <button
                    onClick={() => startChat(match.id)}
                    className="py-2.5 px-3 rounded-full bg-surface-soft hover:bg-primary-light/30 text-text-primary text-[13px] font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Mic size={14} />
                    <span>Voice</span>
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Footer Security Notice */}
      <div className="flex items-center justify-center gap-2 p-3.5 bg-surface-soft/80 rounded-2xl border border-border-subtle text-[12.5px] text-text-tertiary">
        <ShieldCheck size={16} className="text-primary" />
        <span>Anonymous by design. You can report, block, or leave a conversation at any time.</span>
      </div>
    </div>
  );
}