import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Trophy, MapPin, MessageCircle, Users, Sparkles, Check, Mic } from 'lucide-react';
import { useToast } from '../components/ui/Toast';
import useUserStore from '../store/userStore';

/**
 * Real-World Challenges — small, opt-in real-life communication tasks.
 * Self-reported completion (per PRD §5.9).
 */
const CHALLENGES = [
  {
    id: 'ask-directions',
    title: 'Ask someone for directions',
    description: 'Walk up to a stranger and politely ask for the way somewhere.',
    icon: MapPin,
  },
  {
    id: 'introduce-yourself',
    title: 'Introduce yourself to a new person',
    description: 'At a class, event, or gathering — say hi and share your name.',
    icon: Users,
  },
  {
    id: 'one-minute-speech',
    title: 'Speak for one minute about a favourite topic',
    description: 'Pick any subject you love and talk about it for a full minute.',
    icon: Mic,
  },
  {
    id: 'ask-professor',
    title: 'Ask a professor one question',
    description: 'After class or during office hours, ask anything you\'re curious about.',
    icon: MessageCircle,
  },
  {
    id: 'compliment',
    title: 'Give a genuine compliment',
    description: 'Say something kind to someone — a friend, colleague, or stranger.',
    icon: Sparkles,
  },
  {
    id: 'order-alone',
    title: 'Order food by yourself',
    description: 'Place your order without pointing at the menu or asking for help.',
    icon: Trophy,
  },
];

export default function Challenges() {
  const userId = useUserStore((s) => s.ensureUserId());
  const toast = useToast();
  const [completed, setCompleted] = useState({});
  const [loading, setLoading] = useState(true);

  // Load recent activity to know which challenges were already done
  useEffect(() => {
    fetch(`/api/progress/recent?user_id=${userId}&limit=100`)
      .then((r) => r.json())
      .then((d) => {
        const items = d.items || [];
        const map = {};
        for (const it of items) {
          if (it.kind === 'challenge_complete' && it.payload?.id) {
            map[it.payload.id] = it.date;
          }
        }
        setCompleted(map);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [userId]);

  const markDone = async (challenge) => {
    try {
      const res = await fetch('/api/progress/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          kind: 'challenge_complete',
          payload: { id: challenge.id, title: challenge.title },
        }),
      });
      if (!res.ok) throw new Error();
      setCompleted((c) => ({ ...c, [challenge.id]: new Date().toLocaleDateString() }));
      toast({ type: 'success', message: 'Marked complete. Nicely done! 🌱' });
    } catch {
      toast({ type: 'error', message: 'Could not save — try again.' });
    }
  };

  const doneCount = Object.keys(completed).length;

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <h1 className="text-h1">Real-World Challenges</h1>
        <p className="text-body mt-1.5 max-w-xl">
          Small, opt-in practice steps for the real world. No verification — just
          a gentle nudge to try. {doneCount > 0 && (
            <span className="text-primary font-medium">
              {doneCount} {doneCount === 1 ? 'done' : 'done'} so far.
            </span>
          )}
        </p>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {CHALLENGES.map((c, i) => {
          const Icon = c.icon;
          const isDone = !!completed[c.id];
          return (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: i * 0.05 }}
              className={`card relative overflow-hidden ${
                isDone ? 'border-success/30' : ''
              }`}
            >
              {isDone && (
                <div className="absolute top-0 left-0 right-0 h-1 bg-success" />
              )}

              <div className="flex items-start justify-between mb-4">
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                    isDone ? 'bg-success/15' : 'bg-primary-light/30'
                  }`}
                >
                  <Icon
                    size={22}
                    className={isDone ? 'text-success' : 'text-primary-dark'}
                  />
                </div>
                {isDone && (
                  <div className="flex items-center gap-1.5 text-success text-[12px] font-semibold">
                    <Check size={14} />
                    Done
                  </div>
                )}
              </div>

              <h3 className="text-h2 text-[16px] mb-2">{c.title}</h3>
              <p className="text-body text-[13px] mb-5 min-h-[3rem]">
                {c.description}
              </p>

              {isDone ? (
                <p className="text-[12px] text-text-tertiary">
                  Completed {completed[c.id]}
                </p>
              ) : (
                <button
                  onClick={() => markDone(c)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-white rounded-2xl text-[14px] font-medium hover:bg-primary-dark transition-colors"
                >
                  Mark as done
                </button>
              )}
            </motion.div>
          );
        })}
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.5 }}
        className="card card-soft text-center"
      >
        <p className="text-[13.5px] text-text-secondary">
          Small steps in the real world build real confidence. No streaks, no
          pressure — just gentle nudges when you're ready.
        </p>
      </motion.div>
    </div>
  );
}