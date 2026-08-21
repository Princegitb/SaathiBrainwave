import { useState } from 'react';
import { motion } from 'framer-motion';
import { Users, Check, ArrowRight, Quote } from 'lucide-react';

/**
 * Community — Matches Reference Image 5
 * Header: YOU ARE NOT THE ONLY ONE -> Find a corner that feels safe.
 * Right Quote Card: "You don't need to arrive confident. Just arrive as you are."
 * 6 Community Cards grid with member counts and Joined toggles
 */

const COMMUNITIES = [
  {
    id: 'comm-1',
    emoji: '🌱',
    title: 'Confidence Corner',
    members: '2.4k',
    description: 'Small wins, gentle encouragement, and honest progress.',
    joined: true,
  },
  {
    id: 'comm-2',
    emoji: '🎙️',
    title: 'Speaking Practice',
    members: '1.8k',
    description: 'A kind place to practice introductions and ideas.',
    joined: true,
  },
  {
    id: 'comm-3',
    emoji: '📚',
    title: 'College Life',
    members: '3.1k',
    description: 'Navigate campus conversations together.',
    joined: true,
  },
  {
    id: 'comm-4',
    emoji: '👏',
    title: 'Making Friends',
    members: '2.7k',
    description: 'Low-pressure prompts for finding your people.',
    joined: true,
  },
  {
    id: 'comm-5',
    emoji: '✨',
    title: 'Public Speaking',
    members: '946',
    description: 'Share your next talk and get supportive feedback.',
    joined: true,
  },
  {
    id: 'comm-6',
    emoji: '💭',
    title: 'Daily Thoughts',
    members: '4.2k',
    description: 'A calm, anonymous corner for what is on your mind.',
    joined: true,
  },
];

export default function Community() {
  const [communities, setCommunities] = useState(COMMUNITIES);

  const toggleJoin = (id) => {
    setCommunities(prev =>
      prev.map(c => c.id === id ? { ...c, joined: !c.joined } : c)
    );
  };

  return (
    <div className="space-y-8 pb-10">
      {/* ── HERO SECTION matching Image 5 ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        {/* Left Hero Text */}
        <motion.div
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          className="lg:col-span-7 space-y-3"
        >
          <p className="text-label text-primary font-semibold tracking-wider uppercase">
            YOU ARE NOT THE ONLY ONE
          </p>
          <h1 className="text-[44px] font-bold text-text-primary tracking-tight font-serif leading-tight">
            Find a corner <br />that feels <span className="text-primary italic">safe.</span>
          </h1>
          <p className="text-body text-[15.5px] max-w-md">
            Anonymous communities for practice, reflection, and small moments of belonging.
          </p>
        </motion.div>

        {/* Right Quote Card matching Image 5 */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="lg:col-span-5"
        >
          <div className="card p-7 bg-white/80 backdrop-blur-md border border-border-subtle shadow-card-lg relative space-y-4">
            <Quote size={32} className="text-primary/40" />
            <p className="text-[20px] font-serif font-bold text-text-primary leading-snug">
              “Either I will find a way, or I will make one.”
            </p>
            <p className="text-[13px] text-text-tertiary font-medium">— Confidence Corner</p>
          </div>
        </motion.div>
      </div>

      {/* ── 6 COMMUNITY CARDS GRID matching Image 5 ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pt-2">
        {communities.map((comm, i) => (
          <motion.div
            key={comm.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: i * 0.08 }}
            className="card p-6 flex flex-col justify-between h-[200px] bg-white/80 backdrop-blur-md border border-border-subtle hover:shadow-card-hover"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-2xl">{comm.emoji}</span>
                <span className="text-[12px] text-text-tertiary flex items-center gap-1 font-medium">
                  <Users size={13} />
                  {comm.members}
                </span>
              </div>

              <h3 className="text-h2 text-[17px] mb-1">{comm.title}</h3>
              <p className="text-[13px] text-text-tertiary leading-relaxed">
                {comm.description}
              </p>
            </div>

            {/* Joined ✓ -> button matching Image 5 */}
            <button
              onClick={() => toggleJoin(comm.id)}
              className={`w-full py-2.5 px-4 rounded-full text-[13px] font-medium flex items-center justify-center gap-2 transition-all cursor-pointer ${
                comm.joined
                  ? 'bg-surface-soft text-text-primary hover:bg-primary-light/30'
                  : 'bg-primary text-white hover:bg-primary-dark shadow-card'
              }`}
            >
              <span>{comm.joined ? 'Joined ✓' : 'Join Community'}</span>
              <ArrowRight size={14} />
            </button>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
