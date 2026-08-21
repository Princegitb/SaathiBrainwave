import { useState, useRef, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, ArrowLeft, Star, Target, Mic, ArrowUp, Volume2, VolumeX } from 'lucide-react';
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
    roleplayShouldEnd,
    roleplayFeedback,
    roleplayCommunicationStats,
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
    const turns = userMessages.length;

    if (!transcript.trim() || turns === 0) {
      return {
        words: 0,
        fillerWords: 0,
        averageWordsPerTurn: 0,
        pace: '0 words/turn',
        paceDots: '●○○○○',
        pauses: 'Minimal',
        pauseDots: '●●●●●',
        clarityScore: 50,
        confidenceScore: 50,
        communicationScore: 50,
        saraQuote: 'Keep practicing to see your personalized communication snapshot!',
      };
    }

    const words = transcript.trim().split(/\s+/).length;
    const avgWpt = Number((words / turns).toFixed(1));

    const fillerPattern =
      /\b(um|uh|umm|hmm|like|actually|basically|you know|i mean|matlab|ummm|uhh|er|erm)\b/gi;
    const fillerMatches = transcript.match(fillerPattern) || [];
    const fillerWords = fillerMatches.length;
    const fillerRate = (fillerWords / words) * 100;

    const repetitionPattern = /(\b(\w+)\s+\2\b|\b\w+-\w+\b|\.\.\.)/gi;
    const repetitions = (transcript.match(repetitionPattern) || []).length;

    // Speaking pace & dots
    let paceDots = '●●●●○';
    let pace = `${avgWpt} words/turn`;
    if (avgWpt < 4) {
      paceDots = '●●○○○';
    } else if (avgWpt < 8) {
      paceDots = '●●●○○';
    } else if (avgWpt < 20) {
      paceDots = '●●●●●';
    } else if (avgWpt < 32) {
      paceDots = '●●●●○';
    } else {
      paceDots = '●●●○○';
    }

    // Pauses & flow
    const pauseCues = repetitions + (transcript.match(/(\.\.\.|--|\b(um|uh)\b)/gi) || []).length;
    let pauses = 'Natural';
    let pauseDots = '●●●●○';
    if (pauseCues === 0) {
      pauses = 'Minimal';
      pauseDots = '●●●●●';
    } else if (pauseCues <= 2) {
      pauses = 'Natural';
      pauseDots = '●●●●○';
    } else if (pauseCues <= 5) {
      pauses = 'Occasional';
      pauseDots = '●●●○○';
    } else {
      pauses = 'Frequent';
      pauseDots = '●●○○○';
    }

    // Dynamic Confidence Score
    let baseConf = 55;
    if (avgWpt < 3) baseConf = 38;
    else if (avgWpt < 6) baseConf = 54;
    else if (avgWpt < 12) baseConf = 68;
    else if (avgWpt < 22) baseConf = 78;
    else baseConf = 84;

    const lower = transcript.toLowerCase();
    const confidentPhrases = [
      "i can", "i will", "i have", "i believe", "i am", "my experience",
      "i know", "i would", "specifically", "definitely", "absolutely",
      "achieved", "developed", "managed", "led", "confident", "passionate",
      "excited", "clear", "expertise", "gladly", "happy to", "surely",
      "solution", "handled", "worked on"
    ];
    const confidentCount = confidentPhrases.reduce((acc, p) => acc + (lower.split(p).length - 1), 0);

    const uncertainPhrases = [
      "maybe", "perhaps", "i think", "not sure", "probably", "i don't know",
      "i guess", "kind of", "sort of", "idk", "kinda", "sorry", "matlab"
    ];
    const uncertainCount = uncertainPhrases.reduce((acc, p) => acc + (lower.split(p).length - 1), 0);

    let compConf = baseConf + Math.min(22, confidentCount * 4.5) - Math.min(25, uncertainCount * 5) - Math.min(15, fillerRate * 1.2) - Math.min(10, repetitions * 3);
    if (fillerWords === 0 && words >= 8) compConf += 6;
    const confidenceScore = Math.max(25, Math.min(98, Math.round(compConf)));

    // Dynamic Clarity Score
    let compClarity = 100 - (fillerRate > 15 ? 28 : (fillerRate > 8 ? 18 : (fillerRate > 3 ? 9 : 0))) - (avgWpt < 3 ? 22 : (avgWpt < 6 ? 10 : 0)) - Math.min(15, repetitions * 4);
    const clarityScore = Math.max(30, Math.min(99, Math.round(compClarity)));

    // Overall Communication Score
    const paceScore = paceDots === '●●●●●' ? 90 : (paceDots === '●●●●○' ? 80 : 65);
    const communicationScore = Math.max(25, Math.min(98, Math.round(confidenceScore * 0.42 + clarityScore * 0.40 + paceScore * 0.18)));

    // Sara Quote
    let saraQuote = "You communicated clearly and stayed composed. Practice pausing for one beat before answering to sound effortlessly confident.";
    if (confidenceScore >= 80 && clarityScore >= 80) {
      saraQuote = "Outstanding delivery! Your responses were structured, confident, and direct. Keep this momentum going in real conversations!";
    } else if (fillerWords >= 3) {
      saraQuote = "Great thoughts shared! Try replacing filler words with a calm, silent breath — it gives you natural gravitas.";
    } else if (avgWpt < 6) {
      saraQuote = "Good start! In your next practice, try expanding your answer with 1 extra sentence to build your presence.";
    } else if (confidentCount >= 2) {
      saraQuote = "I noticed your confident phrasing when explaining your points. That kind of clarity leaves a memorable impression!";
    }

    if (roleplayCommunicationStats) {
      return {
        words: roleplayCommunicationStats.words ?? words,
        fillerWords: roleplayCommunicationStats.fillerWords ?? fillerWords,
        averageWordsPerTurn: roleplayCommunicationStats.averageWordsPerTurn ?? avgWpt,
        pace: roleplayCommunicationStats.speakingPace ?? `${avgWpt} words/turn`,
        paceDots: roleplayCommunicationStats.paceDots ?? paceDots,
        pauses: roleplayCommunicationStats.pauses ?? pauses,
        pauseDots: roleplayCommunicationStats.pauseDots ?? pauseDots,
        clarityScore: roleplayCommunicationStats.clarityScore ?? clarityScore,
        confidenceScore: roleplayCommunicationStats.confidenceScore ?? confidenceScore,
        communicationScore: roleplayCommunicationStats.communicationScore ?? communicationScore,
        saraQuote: roleplayCommunicationStats.saraQuote || saraQuote,
      };
    }

    return {
      words,
      fillerWords,
      averageWordsPerTurn: avgWpt,
      pace: `${avgWpt} words/turn`,
      paceDots,
      pauses,
      pauseDots,
      clarityScore,
      confidenceScore,
      communicationScore,
      saraQuote,
    };
  }, [safeMessages, roleplayCommunicationStats]);

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
      alert('Voice transcription is not supported in this browser.');
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-IN';

      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      recognition.onerror = () => setIsListening(false);

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setInput((prev) => (prev ? `${prev} ${transcript}` : transcript));
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    }
  };

  return (
    <div className="max-w-4xl mx-auto w-full flex flex-col pb-12">
      <button
        onClick={handleBackToScenarios}
        className="text-[12.5px] text-text-tertiary hover:text-primary flex items-center gap-1 transition-colors mb-3 cursor-pointer font-semibold self-start"
      >
        <ArrowLeft size={14} /> Back to scenarios
      </button>

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
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/70 backdrop-blur-sm border border-border-subtle text-[12.5px] font-semibold text-text-secondary">
            <Target size={14} className="text-primary" />
            <span>Turn {userTurns}/6</span>
          </div>
          <button
            onClick={() => setAutoPlay(!autoPlay)}
            className={`p-2 rounded-full border transition-all ${
              autoPlay
                ? 'bg-primary text-white border-primary'
                : 'bg-white text-text-secondary border-border-subtle'
            }`}
          >
            {autoPlay ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </button>
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

      <div className="bg-white/70 backdrop-blur-md rounded-3xl p-6 shadow-card border border-border-subtle relative overflow-hidden flex flex-col h-[520px]">
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

                <div className="mt-6 pt-5 border-t border-border-subtle">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                      🎙️
                    </div>
                    <div>
                      <h4 className="font-semibold text-[16px] text-text-primary">
                        Your Communication Snapshot
                      </h4>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="rounded-2xl bg-white p-4 border border-border-subtle shadow-sm">
                      <p className="text-[12px] text-text-tertiary mb-1">Confidence Indicator</p>
                      <p className="font-bold text-[22px] text-primary">{communicationStats.confidenceScore}/100</p>
                    </div>
                    <div className="rounded-2xl bg-white p-4 border border-border-subtle shadow-sm">
                      <p className="text-[12px] text-text-tertiary mb-1">Communication Score</p>
                      <p className="font-bold text-[22px] text-primary">{communicationStats.communicationScore}/100</p>
                    </div>
                    <div className="rounded-2xl bg-white p-4 border border-border-subtle shadow-sm">
                      <p className="text-[12px] text-text-tertiary mb-1">Speaking Pace</p>
                      <p className="font-semibold text-[15px] text-text-primary">{communicationStats.pace}</p>
                    </div>
                    <div className="rounded-2xl bg-white p-4 border border-border-subtle shadow-sm">
                      <p className="text-[12px] text-text-tertiary mb-1">Pauses</p>
                      <p className="font-semibold text-[15px] text-text-primary">{communicationStats.pauseDots} {communicationStats.pauses}</p>
                    </div>
                    <div className="rounded-2xl bg-white p-4 border border-border-subtle shadow-sm">
                      <p className="text-[12px] text-text-tertiary mb-1">Filler Words</p>
                      <p className="font-semibold text-[15px] text-text-primary">{communicationStats.fillerWords} detected</p>
                    </div>
                    <div className="rounded-2xl bg-white p-4 border border-border-subtle shadow-sm">
                      <p className="text-[12px] text-text-tertiary mb-1">Response Clarity</p>
                      <p className="font-bold text-[22px] text-primary">{communicationStats.clarityScore}/100</p>
                    </div>
                  </div>

                  <div className="mt-4 rounded-2xl bg-primary/5 p-4 border border-primary/10">
                    <p className="text-[12px] font-semibold text-primary mb-1">Sara says:</p>
                    <p className="text-[14px] text-text-secondary leading-relaxed">"{communicationStats.saraQuote}"</p>
                  </div>
                </div>

                <div className="flex gap-3 mt-5 pt-4 border-t border-border-subtle">
                  <PillChip label="Try Again" variant="soft" onClick={handleTryAgain} />
                  <PillChip label="Back to Practice Rooms" variant="outline" onClick={handleBackToScenarios} />
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