import { useState, useRef, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, ArrowLeft, Star, Target, Mic, ArrowUp } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import ChatBubble from '../components/ui/ChatBubble';
import DisclaimerStrip from '../components/ui/DisclaimerStrip';
import PillChip from '../components/ui/PillChip';
import SaraAvatar from '../components/ui/SaraAvatar';
import { useChatStore } from '../store/chatStore';
import useProgressStore from '../store/progressStore';
import { synthesizeSpeech } from '../utils/speechUtils';

const SCENARIO_META = {
  job_interview: {
    label: 'Job Interview Practice Room',
    emoji: '💼',
    persona: 'Interviewer Persona',
    hint: 'Focus on clear answers. Pauses are completely fine!',
    quickChips: [
      "Hi! I'm eager to learn and contribute to your team.",
      "My biggest strength is problem solving under pressure.",
      "I handled a tough project by breaking it into small goals.",
    ],
  },
  meeting_new_person: {
    label: 'Meeting Someone New',
    emoji: '👋',
    persona: 'Friendly Stranger Persona',
    hint: 'Keep it casual & natural in Hinglish or English.',
    quickChips: [
      "Hii bhai! Mai pehli baar aaya hu yaha, aap batao?",
      "Mujhe music aur tech pasand hai, aap kya karte ho?",
      "Really nice meeting you! What brings you here today?",
    ],
  },
  public_speaking: {
    label: 'Public Speaking Room',
    emoji: '🎙️',
    persona: 'Speech Coach Persona',
    hint: 'Practice your 1-minute intro clearly.',
    quickChips: [
      "Today I want to share a 1-minute talk on building confidence.",
      "Let me start with a short story about overcoming fear.",
    ],
  },
  professor: {
    label: 'Talking to a Professor',
    emoji: '📚',
    persona: 'Approachable Professor Persona',
    hint: 'Ask your academic question politely.',
    quickChips: [
      "Hello Sir, I had a quick question regarding the project deadline.",
      "Could you please guide me on how to prepare for the final assessment?",
    ],
  },
  phone_call: {
    label: 'Phone Call Practice Room',
    emoji: '☎️',
    persona: 'Receptionist Persona',
    hint: 'Find your steady phone voice.',
    quickChips: [
      "Hello, I am calling to confirm my appointment for tomorrow.",
      "Could you please transfer my call to the support desk?",
    ],
  },
  ordering_food: {
    label: 'Ordering Food Practice',
    emoji: '🍜',
    persona: 'Café Cashier Persona',
    hint: 'Practice ordering your food comfortably.',
    quickChips: [
      "Hi! I would like to order one cold coffee and a sandwich please.",
      "Could I get that to-go? Thank you!",
    ],
  },
};

export default function RoleplaySession() {
  const { scenarioId } = useParams();
  const navigate = useNavigate();
  const [input, setInput] = useState('');
  const [autoPlay, setAutoPlay] = useState(false);
  const [isListening, setIsListening] = useState(false);

  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);

  const {
    roleplayMessages,
    roleplayLoading,
    roleplayScenario,
    roleplayShouldEnd,
    roleplayFeedback,
    sendRoleplayMessage,
    endRoleplay,
    clearRoleplay,
    startRoleplay,
  } = useChatStore();
  const invalidateProgress = useProgressStore((s) => s.invalidate);

  useEffect(() => {
    startRoleplay(scenarioId);
  }, [scenarioId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [roleplayMessages, roleplayLoading, roleplayFeedback]);

  // Handle auto-play voice
  useEffect(() => {
    if (autoPlay && roleplayMessages.length > 0) {
      const last = roleplayMessages[roleplayMessages.length - 1];
      if (last.role === 'assistant') {
        synthesizeSpeech(last.content);
      }
    }
  }, [roleplayMessages, autoPlay]);

  const meta = SCENARIO_META[scenarioId] || {
    label: 'Practice Session Room',
    emoji: '🎯',
    persona: 'Practice Partner',
    hint: 'Take your time and practice at your own pace.',
    quickChips: ["Hii! Ready to start practice."],
  };

  const safeMessages = Array.isArray(roleplayMessages) ? roleplayMessages : [];

  const userTurns = safeMessages.filter((m) => m.role === 'user').length;

  const communicationStats = useMemo(() => {
    const userMessages = safeMessages
      .filter((m) => m.role === 'user')
      .map((m) => m.content || '');

    const transcript = userMessages.join(' ');

    if (!transcript.trim()) {
      return {
        words: 0,
        fillerWords: 0,
        pace: 'Not enough data',
        clarity: 'Not enough data',
      };
    }

    const words = transcript.trim().split(/\s+/).length;

    const fillerPattern =
      /\b(um|uh|umm|hmm|like|actually|basically|you know|i mean|matlab|ummm|uhh)\b/gi;

    const fillerMatches = transcript.match(fillerPattern) || [];
    const fillerWords = fillerMatches.length;

    // Approximate speaking pace from conversation length.
    // This will be replaced by actual audio timing in the next step.
    const estimatedMinutes = Math.max(userMessages.length * 0.35, 0.35);
    const wordsPerMinute = Math.round(words / estimatedMinutes);

    let pace = 'Moderate';
    if (wordsPerMinute < 90) {
      pace = 'Slow';
    } else if (wordsPerMinute > 160) {
      pace = 'Fast';
    }

    let clarity = 'Good';
    if (fillerWords >= 6) {
      clarity = 'Needs improvement';
    } else if (fillerWords >= 3) {
      clarity = 'Fair';
    }

    return {
      words,
      fillerWords,
      pace,
      clarity,
    };
  }, [safeMessages]);

  const handleSend = (textToSend) => {
    const messageContent = (textToSend || input).trim();
    if (!messageContent || roleplayLoading) return;
    setInput('');
    sendRoleplayMessage(messageContent);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleEndSession = async () => {
    endRoleplay();
    setTimeout(() => invalidateProgress(), 3500);
  };

  const handleTryAgain = async () => {
    clearRoleplay();
    await startRoleplay(scenarioId);
  };

  const handleBackToScenarios = () => {
    clearRoleplay();
    navigate('/practice');
  };

  const toggleSpeechInput = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Voice transcription is not supported in this browser. Please try Chrome or Edge.');
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const rec = new SpeechRecognition();
    rec.continuous = false;
    rec.interimResults = false;
    rec.lang = 'hi-IN'; // Indian accent support

    rec.onstart = () => setIsListening(true);
    rec.onresult = (e) => {
      const text = e.results[0][0].transcript;
      setInput((prev) => (prev ? prev + ' ' + text : text));
    };
    rec.onend = () => setIsListening(false);
    rec.onerror = () => setIsListening(false);

    recognitionRef.current = rec;
    rec.start();
  };

  return (
    <div className="max-w-4xl mx-auto w-full flex flex-col pb-12">
      {/* Back breadcrumb */}
      <button
        onClick={handleBackToScenarios}
        className="text-[12.5px] text-text-tertiary hover:text-primary flex items-center gap-1 transition-colors mb-3 cursor-pointer font-semibold self-start"
      >
        <ArrowLeft size={14} /> Back to scenarios
      </button>

      {/* Guided Roleplay Header */}
      <div className="mb-5 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="space-y-1">
          <span className="text-[10px] font-bold tracking-wider text-primary uppercase">GUIDED ROLEPLAY</span>
          <h1 className="text-[36px] font-bold text-text-primary font-serif leading-tight">
            {meta.label.replace(" Practice Room", "").replace(" Practice", "").replace(" Room", "")}
          </h1>
          <p className="text-[14px] text-text-secondary">
            Stay curious, take your time, and let the conversation unfold.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <div className="px-3.5 py-1.5 rounded-full bg-white/70 backdrop-blur-sm border border-border-subtle shadow-sm text-[13px] font-semibold text-text-secondary">
            00:00
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/70 backdrop-blur-sm border border-border-subtle text-[12.5px] font-semibold text-text-secondary">
            <Target size={14} className="text-primary" />
            <span>Turn {userTurns}/6</span>
          </div>

          {!roleplayShouldEnd && (
            <button
              onClick={handleEndSession}
              className="px-3.5 py-1.5 text-[12.5px] font-semibold text-danger bg-danger/10 rounded-full hover:bg-danger/20 transition-colors cursor-pointer"
            >
              End Session
            </button>
          )}
        </div>
      </div>

      {/* Main Conversation Container Card with set height (mockup-style) */}
      <div className="bg-white/70 backdrop-blur-md rounded-3xl p-6 shadow-card border border-border-subtle relative overflow-hidden flex flex-col h-[520px]">
        {/* Messages Log */}
        <div className="flex-1 overflow-y-auto py-2 space-y-4 pr-1">
          {safeMessages.map((msg, i) => (
            <ChatBubble
              key={i}
              message={msg.content}
              role={msg.role}
              onSpeak={() => synthesizeSpeech(msg.content)}
            />
          ))}

          {roleplayLoading && (
            <div className="flex items-center gap-2.5 mb-3">
              <SaraAvatar size="sm" emotion="thinking" />
              <div className="bg-[#F7F5FC]/50 rounded-2xl px-5 py-3 shadow-sm border border-border-subtle/50">
                <Loader2 size={18} className="text-primary animate-spin" />
              </div>
            </div>
          )}

          <AnimatePresence>
            {roleplayShouldEnd && roleplayFeedback && (
              <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
                className="card border-2 border-primary/20 bg-surface-soft mx-2 my-4 p-6"
              >
                <div className="flex items-center gap-2.5 mb-4">
                  <div className="w-10 h-10 rounded-2xl bg-primary flex items-center justify-center shadow-card">
                    <Star size={20} className="text-white" />
                  </div>
                  <div>
                    <h3 className="text-h2 text-[18px]">Practice Feedback Summary</h3>
                    <p className="text-[12px] text-text-tertiary">
                      {meta.label} — Completed
                    </p>
                  </div>
                </div>

                <div className="markdown-body text-body leading-relaxed text-[14px]">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {roleplayFeedback}
                  </ReactMarkdown>
                </div>

                {/* Sara Communication Intelligence */}
                <div className="mt-6 pt-5 border-t border-border-subtle">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                      🎙️
                    </div>

                    <div>
                      <h4 className="font-semibold text-[16px] text-text-primary">
                        Your Communication Snapshot
                      </h4>
                      <p className="text-[12px] text-text-tertiary">
                        Based on your practice conversation
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

                    <div className="rounded-2xl bg-white p-4 border border-border-subtle">
                      <p className="text-[12px] text-text-tertiary mb-2">
                        Speaking Pace
                      </p>
                      <p className="font-semibold text-text-primary">
                        ●●●●○ {communicationStats.pace}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-white p-4 border border-border-subtle">
                      <p className="text-[12px] text-text-tertiary mb-2">
                        Pauses
                      </p>
                      <p className="font-semibold text-text-primary">
                        ●●●○○ Occasional
                      </p>
                    </div>

                    <div className="rounded-2xl bg-white p-4 border border-border-subtle">
                      <p className="text-[12px] text-text-tertiary mb-2">
                        Filler Words
                      </p>
                      <p className="font-semibold text-text-primary">
                        {communicationStats.fillerWords} detected
                      </p>
                    </div>

                    <div className="rounded-2xl bg-white p-4 border border-border-subtle">
                      <p className="text-[12px] text-text-tertiary mb-2">
                        Response Clarity
                      </p>
                      <p className="font-semibold text-text-primary">
                        ●●●●○ {communicationStats.clarity}
                      </p>
                    </div>

                  </div>

                  <div className="mt-4 rounded-2xl bg-primary/5 p-4">
                    <p className="text-[12px] font-semibold text-primary mb-2">
                      Sara says:
                    </p>

                    <p className="text-[14px] text-text-secondary leading-relaxed">
                      "You explained your answer clearly. Try taking a short pause
                      before starting your next sentence."
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 mt-5 pt-4 border-t border-border-subtle">
                  <PillChip
                    label="Try Again"
                    variant="soft"
                    onClick={handleTryAgain}
                  />
                  <PillChip
                    label="Back to Practice Rooms"
                    variant="outline"
                    onClick={handleBackToScenarios}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {roleplayShouldEnd && !roleplayFeedback && (
            <div className="flex items-center justify-center py-8">
              <div className="flex items-center gap-3 text-text-secondary">
                <Loader2 size={20} className="text-primary animate-spin" />
                <span className="text-[14px]">Generating practice room feedback...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Response Chips & Input */}
        {!roleplayShouldEnd && (
          <div className="mt-4 pt-3 border-t border-border-subtle space-y-3 shrink-0">
            <div className="bg-white rounded-full p-2 pl-5 shadow-card border border-border-subtle hover:border-primary/40 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all flex items-center gap-3">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Talk to Sara..."
                className="flex-1 bg-transparent text-[14.5px] text-text-primary placeholder-text-tertiary outline-none border-none py-1"
              />
              <button
                onClick={toggleSpeechInput}
                className={`p-2 rounded-full transition-colors cursor-pointer shrink-0 ${
                  isListening
                    ? 'text-danger bg-danger/10 animate-pulse'
                    : 'text-text-tertiary hover:bg-surface-soft hover:text-primary'
                }`}
                title="Tap to speak"
              >
                <Mic size={18} />
              </button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleSend()}
                disabled={!input.trim() || roleplayLoading}
                aria-label="Send response"
                className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center hover:bg-primary-dark transition-all disabled:opacity-40 cursor-pointer shrink-0 shadow-sm"
              >
                <ArrowUp size={16} />
              </motion.button>
            </div>

            <div className="flex items-center justify-between mt-3 text-[12px] text-text-tertiary px-2">
              <span>Text and voice stay in one conversation</span>
              <label className="flex items-center gap-1.5 cursor-pointer hover:text-text-primary">
                <input
                  type="checkbox"
                  checked={autoPlay}
                  onChange={(e) => setAutoPlay(e.target.checked)}
                  className="accent-primary rounded"
                />
                <span>Auto-play Sara</span>
              </label>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}