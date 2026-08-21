import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUp, Mic, Volume2, VolumeX, Sparkles, Loader2, ArrowRight, PhoneOff, Radio } from 'lucide-react';
import ChatBubble from '../components/ui/ChatBubble';
import DisclaimerStrip from '../components/ui/DisclaimerStrip';
import SaraAvatar from '../components/ui/SaraAvatar';
import PrePostSurveyModal from '../components/ui/PrePostSurveyModal';
import { useChatStore } from '../store/chatStore';
import { synthesizeSpeech } from '../utils/speechUtils';
/**
 * AI Companion ("Sara") — Indian Hinglish Persona & Voice
 * Features:
 * - Auto-play TTS is OFF by default (user chooses when to hear voice)
 * - Abstracted TTS via synthesizeSpeech (ElevenLabs Multilingual v2 with hi-IN Indian fallback)
 * - Emoji-stripping step (stripEmojiForSpeech) applied ONLY to speech synthesis
 * - Voice-mode requests pass is_voice_mode flag to eliminate LLM emojis entirely
 * - Continuous 2-Way Voice Call Mode: Hands-free listening -> Auto send -> Auto TTS -> Resume listening!
 */

/**
 * AI Companion ("Sara") — Indian Hinglish Persona & Voice
 * Features:
 * - Auto-play TTS is OFF by default (user chooses when to hear voice)
 * - Indian voice synthesis selection (hi-IN / en-IN) for natural Indian tone
 * - Continuous 2-Way Voice Call Mode: Hands-free listening -> Auto send -> Auto TTS -> Resume listening!
 * - Right Sidebar: 3D Orb visual card + "Start voice with Sara" button
 * - "Try a starting point" card with 5 quick prompt starters
 */

const STARTING_POINTS = [
  {
    icon: '🍊',
    title: 'Talk about my day',
    subtitle: 'Help me reflect on today',
    prompt: 'I want to talk about my day and reflect on what happened.',
  },
  {
    icon: '🔑',
    title: 'Practice speaking',
    subtitle: 'Build my confidence',
    prompt: 'I want to practice speaking more clearly and build my confidence.',
  },
  {
    icon: '💼',
    title: 'Interview practice',
    subtitle: 'Prepare with Sara',
    prompt: 'I have an interview coming up and want to practice my answers.',
  },
  {
    icon: '⚡',
    title: 'Meet someone new',
    subtitle: 'Practice an introduction',
    prompt: 'Help me practice introducing myself to someone new.',
  },
  {
    icon: '🎤',
    title: 'Public speaking',
    subtitle: 'Reflect on a topic',
    prompt: 'I want to practice delivering a short speech on a topic.',
  },
];

export default function AICompanion() {
  const [input, setInput] = useState('');
  const [mode, setMode] = useState('chat'); // 'chat' | 'voice'
  const [autoPlay, setAutoPlay] = useState(false); // DEFAULT OFF per user request!
  const [isListening, setIsListening] = useState(false);
  const [isVoiceCallActive, setIsVoiceCallActive] = useState(false);
  const [voiceCallStatus, setVoiceCallStatus] = useState('Listening...');
  const [liveTranscript, setLiveTranscript] = useState('');

  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);

  const {
    companionMessages,
    companionLoading,
    sendCompanionMessage,
    lastSentiment,
    fetchCompanionHistory,
  } = useChatStore();

  useEffect(() => {
    fetchCompanionHistory();
  }, [fetchCompanionHistory]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [companionMessages, companionLoading]);

  // Only auto-play TTS if user explicitly checked autoPlay!
  useEffect(() => {
    if (autoPlay && !isVoiceCallActive && companionMessages.length > 0) {
      const last = companionMessages[companionMessages.length - 1];
      if (last.role === 'assistant') {
        synthesizeSpeech(last.content);
      }
    }
  }, [companionMessages, autoPlay, isVoiceCallActive]);

  // ── CONTINUOUS 2-WAY VOICE CALL HANDLER ──
  const startVoiceCall = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Voice calls require speech recognition. Please try in Chrome or Edge!');
      return;
    }

    setIsVoiceCallActive(true);
    setMode('voice');
    setVoiceCallStatus('Sara is listening...');
    setLiveTranscript('');

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'hi-IN'; // Default to Indian English / Hindi recognition

    let silenceTimer = null;
    let finalSpeech = '';

    recognition.onstart = () => {
      setIsListening(true);
      setVoiceCallStatus('Sara is listening...');
    };

    recognition.onresult = (event) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalSpeech += event.results[i][0].transcript + ' ';
        } else {
          interim += event.results[i][0].transcript;
        }
      }

      const currentText = (finalSpeech + interim).trim();
      setLiveTranscript(currentText);

      if (silenceTimer) clearTimeout(silenceTimer);

      if (currentText.length > 2) {
        silenceTimer = setTimeout(() => {
          try {
            recognition.stop();
          } catch (e) {}

          setVoiceCallStatus('Sara is thinking...');
          sendCompanionMessage(currentText, { isVoiceMode: true }).then(() => {
            const msgs = useChatStore.getState().companionMessages;
            const lastMsg = msgs[msgs.length - 1];
            if (lastMsg && lastMsg.role === 'assistant') {
              setVoiceCallStatus('Sara is speaking...');
              synthesizeSpeech(lastMsg.content, () => {
                setLiveTranscript('');
                finalSpeech = '';
                setVoiceCallStatus('Sara is listening...');
                try {
                  recognition.start();
                } catch (e) {}
              });
            }
          });
        }, 900);
      }
    };

    recognition.onerror = () => {
      setVoiceCallStatus('Sara is listening...');
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch (e) {}
  };

  const stopVoiceCall = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsVoiceCallActive(false);
    setIsListening(false);
    setMode('chat');
    setLiveTranscript('');
  };

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || companionLoading) return;
    setInput('');
    sendCompanionMessage(trimmed);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[calc(100vh-100px)]">
      {/* ── LEFT & MAIN CHAT AREA (8 cols) ── */}
      <div className="lg:col-span-8 flex flex-col h-full bg-white/70 backdrop-blur-md rounded-3xl p-6 shadow-card border border-border-subtle relative overflow-hidden">
        
        {/* Continuous 2-Way Voice Call Overlay */}
        <AnimatePresence>
          {isVoiceCallActive && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="absolute inset-0 z-40 bg-gradient-to-b from-primary-dark/95 via-primary/95 to-bg-gradient-start/95 backdrop-blur-xl flex flex-col items-center justify-between p-8 text-white"
            >
              <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/20 text-[13px] font-medium">
                <Radio size={14} className="text-success animate-pulse" />
                <span>Live Voice Call with Sara (Indian Hinglish Voice)</span>
              </div>

              <div className="text-center space-y-6 my-auto">
                <div className="relative mx-auto w-32 h-32 flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full bg-white/20 animate-ping opacity-75" />
                  <div className="w-28 h-28 rounded-full bg-white text-primary flex items-center justify-center shadow-card-lg text-4xl">
                    🔮
                  </div>
                </div>

                <div className="space-y-2">
                  <h2 className="text-[26px] font-bold font-serif">{voiceCallStatus}</h2>
                  <p className="text-[14px] text-white/80 max-w-md mx-auto min-h-[40px]">
                    {liveTranscript ? `"${liveTranscript}"` : 'Bina kisi darr ke baat karo bro — Sara is listening...'}
                  </p>
                </div>
              </div>

              <button
                onClick={stopVoiceCall}
                className="py-3.5 px-8 rounded-full bg-danger text-white font-semibold text-[14.5px] flex items-center gap-2 shadow-card hover:bg-danger/90 transition-all cursor-pointer"
              >
                <PhoneOff size={18} />
                <span>End Voice Call</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Sara Header Bar */}
        <div className="flex items-center justify-between pb-4 border-b border-border-subtle mb-4">
          <div className="flex items-center gap-3">
            <SaraAvatar size="sm" emotion={companionLoading ? 'thinking' : 'happy'} />
            <div>
              <h2 className="font-bold text-[18px] text-text-primary leading-tight">Sara</h2>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-2 h-2 rounded-full bg-success inline-block" />
                <span className="text-[12px] text-text-tertiary font-normal">Your AI conversation companion</span>
              </div>
            </div>
          </div>

          <div className="flex items-center bg-surface-soft p-1 rounded-full border border-border-subtle">
            <button
              onClick={() => {
                if (isVoiceCallActive) stopVoiceCall();
                setMode('chat');
              }}
              className={`px-4 py-1.5 rounded-full text-[13px] font-medium transition-all flex items-center gap-1.5 ${
                mode === 'chat' ? 'bg-white text-text-primary shadow-sm' : 'text-text-tertiary hover:text-text-primary'
              }`}
            >
              <span>💬</span> Chat
            </button>
            <button
              onClick={startVoiceCall}
              className={`px-4 py-1.5 rounded-full text-[13px] font-medium transition-all flex items-center gap-1.5 ${
                mode === 'voice' ? 'bg-white text-text-primary shadow-sm' : 'text-text-tertiary hover:text-text-primary'
              }`}
            >
              <Mic size={13} /> Voice
            </button>
          </div>
        </div>

        <DisclaimerStrip variant="chat" />

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto py-4 px-2 space-y-4">
          {companionMessages.length === 0 && (
            <ChatBubble 
              message="Hey, I'm Sara. I'm here with you. How are you feeling today?" 
              role="assistant" 
              onSpeak={() => synthesizeSpeech("Hey, I'm Sara. I'm here with you. How are you feeling today?")}
            />
          )}

          {companionMessages.map((msg, i) => (
            <ChatBubble 
              key={i} 
              message={msg.content} 
              role={msg.role} 
              onSpeak={() => synthesizeSpeech(msg.content)} 
            />
          ))}

          {companionLoading && (
            <div className="flex items-center gap-2.5 mb-3">
              <SaraAvatar size="sm" emotion="thinking" />
              <div className="bg-[#F7F5FC]/50 rounded-2xl px-5 py-3 shadow-sm border border-border-subtle/50">
                <Loader2 size={18} className="text-primary animate-spin" />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="pt-3 border-t border-border-subtle">
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
              onClick={startVoiceCall}
              className="p-2.5 rounded-full text-text-tertiary hover:bg-surface-soft hover:text-primary transition-colors cursor-pointer shrink-0"
              title="Start Voice Call"
            >
              <Mic size={19} />
            </button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleSend}
              disabled={!input.trim() || companionLoading}
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
      </div>

      {/* ── RIGHT SIDEBAR: Sara Avatar & Starting Points ── */}
      <div className="lg:col-span-4 space-y-6">
        <div className="card text-center p-6 space-y-4 relative overflow-hidden bg-gradient-to-b from-white to-surface-soft">
          <SaraAvatar emotion={companionLoading ? 'thinking' : 'happy'} size="lg" className="mx-auto" />

          <div className="inline-block py-1.5 px-4 rounded-full bg-[#F7F5FC] text-[13px] text-text-primary font-medium">
            Ready when you are
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={startVoiceCall}
            className="w-full py-3.5 px-4 rounded-2xl bg-primary text-white font-semibold text-[14px] flex items-center justify-center gap-2 shadow-sm hover:bg-primary-dark transition-colors cursor-pointer"
          >
            <Mic size={18} />
            <span>Start voice with Sara</span>
          </motion.button>
          
          <p className="text-[12px] text-text-tertiary leading-relaxed">
            Talk, type, or switch modes. Sara keeps the same thread.
          </p>
        </div>

        {lastSentiment && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="card p-5 space-y-3 bg-gradient-to-br from-white to-[#F7F5FC] border border-border-subtle"
          >
            <div className="flex items-center gap-2.5">
              <span className="text-xl">🧠</span>
              <div>
                <h4 className="font-bold text-[14.5px] text-text-primary leading-tight">SaraSense</h4>
                <p className="text-[11.5px] text-text-tertiary mt-0.5">Emotional signal from your chat</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              <span className="rounded-full bg-primary-light/20 border border-primary/10 px-3 py-1 text-[12px] font-semibold text-primary capitalize shadow-sm">
                Emotion: {lastSentiment.emotion || "neutral"}
              </span>

              <span className="rounded-full bg-white border border-border-subtle px-3 py-1 text-[12px] font-medium text-text-secondary capitalize shadow-sm">
                Sentiment: {lastSentiment.sentiment || "neutral"}
              </span>

              {typeof lastSentiment.intensity === "number" && (
                <span className="rounded-full bg-white border border-border-subtle px-3 py-1 text-[12px] font-medium text-text-tertiary shadow-sm">
                  {lastSentiment.intensity}% signal
                </span>
              )}
            </div>

            <p className="text-[10.5px] text-text-tertiary leading-tight">
              *Supportive indicator, not clinical diagnosis.
            </p>
          </motion.div>
        )}

        <div className="card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-h2 text-[18px]">Try a starting point</h3>
              <p className="text-[12px] text-text-tertiary mt-0.5">One small prompt is enough</p>
            </div>
            <ArrowRight size={16} className="text-text-tertiary font-bold" />
          </div>

          <div className="space-y-2.5">
            {STARTING_POINTS.slice(0, 3).map((sp, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setInput(sp.prompt);
                  sendCompanionMessage(sp.prompt);
                }}
                className="w-full text-left p-3.5 rounded-2xl bg-white hover:bg-primary-light/10 transition-all flex items-center gap-4 group cursor-pointer border border-border-subtle/40"
              >
                <span className="text-xl p-2 bg-white rounded-xl shadow-sm border border-border-subtle/30 shrink-0">{sp.icon}</span>
                <div>
                  <p className="text-[13.5px] font-semibold text-text-primary group-hover:text-primary transition-colors">
                    {sp.title}
                  </p>
                  <p className="text-[11.5px] text-text-tertiary mt-0.5">{sp.subtitle}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
