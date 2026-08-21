import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import DisclaimerStrip from '../components/ui/DisclaimerStrip';
import { useChatStore } from '../store/chatStore';

/**
 * RoleplaySelector — Matches Reference Image 3
 * Header: PRACTICE ROOM -> Choose a conversation
 * 6 Scenarios grid:
 * 1. Job Interview
 * 2. Meeting Someone New
 * 3. Public Speaking
 * 4. Talking to a Professor
 * 5. Phone Call
 * 6. Ordering Food
 */

const SCENARIOS = [
  {
    id: 'job_interview',
    emoji: '💼',
    title: 'Job Interview',
    description: 'Prepare for your next opportunity',
  },
  {
    id: 'meeting_new_person',
    emoji: '👋',
    title: 'Meeting Someone New',
    description: 'Practice a natural introduction',
  },
  {
    id: 'public_speaking',
    emoji: '🎙️',
    title: 'Public Speaking',
    description: 'Share your ideas clearly',
  },
  {
    id: 'professor',
    emoji: '📚',
    title: 'Talking to a Professor',
    description: 'Ask with confidence',
  },
  {
    id: 'phone_call',
    emoji: '☎️',
    title: 'Phone Call',
    description: 'Find your steady voice',
  },
  {
    id: 'apj_kalam',
    emoji: '🚀',
    title: 'Dr. APJ Abdul Kalam',
    description: 'Inspirational speech & mentorship practice',
  },
  {
    id: 'steve_jobs',
    emoji: '🍏',
    title: 'Steve Jobs Rehearsal',
    description: 'Product presentation & pitch practice',
  },
  {
    id: 'ordering_food',
    emoji: '🍜',
    title: 'Ordering Food',
    description: 'Practice everyday moments',
  },
];

export default function RoleplaySelector() {
  const navigate = useNavigate();
  const { startRoleplay } = useChatStore();

  const handleStart = (scenarioId) => {
    navigate(`/roleplay/${scenarioId}`);
  };

  return (
    <div className="space-y-6">
      {/* Eyebrow + Header matching Image 3 */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="space-y-1"
      >
        <p className="text-label text-primary font-semibold tracking-wider uppercase">PRACTICE ROOM</p>
        <h1 className="text-[38px] font-bold text-text-primary tracking-tight font-serif">
          Choose a conversation
        </h1>
        <p className="text-body text-[15px]">
          Sara will meet you there. Switch between text and voice whenever you like.
        </p>
      </motion.div>

      <DisclaimerStrip variant="banner" />

      {/* 6 Scenario Cards Grid matching Image 3 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pt-2">
        {SCENARIOS.map((scenario, i) => (
          <motion.div
            key={scenario.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: i * 0.05 }}
            onClick={() => handleStart(scenario.id)}
            className="card p-7 hover:shadow-card-hover cursor-pointer group flex flex-col justify-between h-[180px] bg-white/80 backdrop-blur-md border border-border-subtle"
          >
            <div>
              <div className="text-3xl mb-3 group-hover:scale-110 transition-transform w-fit">
                {scenario.emoji}
              </div>
              <h3 className="text-h2 text-[18px] group-hover:text-primary transition-colors">
                {scenario.title}
              </h3>
              <p className="text-[13.5px] text-text-tertiary mt-1">
                {scenario.description}
              </p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}