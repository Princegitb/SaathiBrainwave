import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MessageSquare, Mic, ShieldCheck, Heart, Sparkles, Filter } from 'lucide-react';
import PillChip from '../components/ui/PillChip';

/**
 * FindSaathi — Matches Reference Image 4
 * Header: A SOFTER WAY TO MEET PEOPLE -> Find your Saathi.
 * 3D Orb visual card with orbit rings & floating badges
 * Thoughtful matches with filter chips & 3 detailed match cards
 * Footer: Anonymous by design notice
 */

const SAATHI_MATCHES = [
  {
    id: 'saathi-284',
    alias: 'Anonymous #284',
    badgeNum: '4',
    status: 'Online',
    statusColor: 'text-success',
    compatibility: 82,
    tags: ['Technology', 'Music', 'College'],
    goal: 'Practice meeting new people',
    language: 'English',
    format: 'Text + voice',
    category: 'Technology',
  },
  {
    id: 'saathi-517',
    alias: 'Anonymous #517',
    badgeNum: '7',
    status: 'Available today',
    statusColor: 'text-success',
    compatibility: 76,
    tags: ['Books', 'Design', 'Movies'],
    goal: 'Speak more confidently',
    language: 'English',
    format: 'Text',
    category: 'Books',
  },
  {
    id: 'saathi-631',
    alias: 'Anonymous #631',
    badgeNum: '1',
    status: 'Available today',
    statusColor: 'text-success',
    compatibility: 71,
    tags: ['Football', 'Travel', 'Music'],
    goal: 'Make a new friend',
    language: 'English + Hindi',
    format: 'Voice',
    category: 'Music',
  },
];

const CATEGORY_FILTERS = ['All', 'Technology', 'Music', 'College', 'Books'];

export default function FindSaathi() {
  const navigate = useNavigate();
  const [selectedFilter, setSelectedFilter] = useState('All');

  const filteredMatches = selectedFilter === 'All'
    ? SAATHI_MATCHES
    : SAATHI_MATCHES.filter(m => m.tags.includes(selectedFilter) || m.category === selectedFilter);

  const startChat = (saathiId) => {
    navigate(`/peer/chat/${saathiId}`);
  };

  return (
    <div className="space-y-8 pb-10">
      {/* ── HERO SECTION matching Image 4 ── */}
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

        {/* Right Hero Visual Card matching Image 4 */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="lg:col-span-6"
        >
          <div className="card p-8 relative overflow-hidden bg-gradient-to-br from-white via-surface-soft to-primary-light/20 min-h-[220px] flex items-center justify-center border border-border-subtle shadow-card-lg">
            {/* Orbit rings & floating badges */}
            <div className="absolute top-4 left-6 bg-white/80 backdrop-blur-md px-3 py-1 rounded-full text-[12px] text-text-primary shadow-card border border-border-subtle">
              82% compatible
            </div>

            <div className="absolute top-10 right-8 bg-white/80 backdrop-blur-md px-3 py-1 rounded-full text-[12px] text-text-primary shadow-card border border-border-subtle">
              Text + voice
            </div>

            <div className="absolute bottom-6 left-12 bg-white/80 backdrop-blur-md px-3 py-1 rounded-full text-[12px] text-text-primary shadow-card border border-border-subtle">
              Shared interests
            </div>

            {/* 3D Orb visual */}
            <div className="w-28 h-28 rounded-full bg-gradient-to-tr from-primary via-accent-lilac to-primary-light flex items-center justify-center shadow-float animate-pulse">
              <Heart size={44} className="text-white drop-shadow-md" />
            </div>
          </div>
        </motion.div>
      </div>

      {/* ── THOUGHTFUL MATCHES SECTION matching Image 4 ── */}
      <div className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-[24px] font-bold text-text-primary">Thoughtful matches</h2>
            <p className="text-body text-[13.5px]">A few people who might feel easy to talk to</p>
          </div>

          {/* Filter Chips matching Image 4 */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {CATEGORY_FILTERS.map((cat) => (
              <PillChip
                key={cat}
                label={cat}
                active={selectedFilter === cat}
                variant="soft"
                size="sm"
                onClick={() => setSelectedFilter(cat)}
              />
            ))}
          </div>
        </div>

        {/* 3 Match Cards Grid matching Image 4 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {filteredMatches.map((match, i) => (
            <motion.div
              key={match.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: i * 0.1 }}
              className="card p-6 flex flex-col justify-between bg-white/80 backdrop-blur-md border border-border-subtle hover:shadow-card-hover"
            >
              <div className="space-y-4">
                {/* Header: Circle Badge + Title + Status */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-primary/20 text-primary-dark font-bold text-[14px] flex items-center justify-center">
                      {match.badgeNum}
                    </div>
                    <div>
                      <h3 className="text-h2 text-[16px]">{match.alias}</h3>
                      <p className="text-[12px] text-text-secondary">
                        <span className={`font-semibold ${match.statusColor}`}>• {match.status}</span>
                      </p>
                    </div>
                  </div>
                </div>

                {/* Compatibility % */}
                <div>
                  <span className="text-[20px] font-bold text-primary">{match.compatibility}%</span>
                  <span className="text-[12px] text-text-tertiary ml-1.5 font-medium">compatible</span>
                </div>

                {/* Tag Pills */}
                <div className="flex flex-wrap gap-1.5">
                  {match.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2.5 py-1 rounded-full text-[11px] bg-surface-soft text-text-secondary border border-border-subtle"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                {/* Goal Prompt Line */}
                <div className="pt-2 border-t border-border-subtle">
                  <p className="text-[13px] text-text-primary font-medium">{match.goal}</p>
                </div>

                {/* Format & Language info */}
                <div className="flex items-center justify-between text-[11.5px] text-text-tertiary">
                  <span>{match.language}</span>
                  <span>{match.format}</span>
                </div>
              </div>

              {/* Action Buttons: -> Start Chat | 🎤 Voice */}
              <div className="grid grid-cols-2 gap-2 pt-4 mt-2">
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
        </div>
      </div>

      {/* Footer Security Notice matching Image 4 */}
      <div className="flex items-center justify-center gap-2 p-3 bg-surface-soft/80 rounded-2xl border border-border-subtle text-[12.5px] text-text-tertiary">
        <ShieldCheck size={16} className="text-primary" />
        <span>Anonymous by design. You can report, block, or leave a conversation at any time.</span>
      </div>
    </div>
  );
}