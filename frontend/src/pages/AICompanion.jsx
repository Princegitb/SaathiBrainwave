import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUp, Mic, Volume2, VolumeX, Sparkles, Loader2, PhoneOff, Phone, Radio } from 'lucide-react';
import ChatBubble from '../components/ui/ChatBubble';
import DisclaimerStrip from '../components/ui/DisclaimerStrip';
import SaraAvatar from '../components/ui/SaraAvatar';
import { useChatStore } from '../store/chatStore';
import { synthesizeSpeech } from '../utils/speechUtils';

/**
 * AI Companion ("Sara")
 * Dedicated Separation:
 * - 💬 Chat Mode: Text conversation thread with message history & quick prompts.
 * - 📞 Voice Call Mode: Dedicated hands-free calling room with zero-flicker state machine & real-time subtitles.
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
  const [activeTab, setActiveTab] = useState('chat'); // 'chat' | 'call'
  const [autoPlay, setAutoPlay] = useState(false);

  // ── Voice Call State Machine ──
  // 'idle' | 'listening' | 'thinking' | 'speaking'
  const [callState, setCallState] = useState('idle');
  const [callStatusText, setCallStatusText] = useState('Ready when you are');
  const [userSpeechCaption, setUserSpeechCaption] = useState('');
  const [saraSpeechCaption, setSaraSpeechCaption] = useState('');

  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);
  const silenceTimerRef = useRef(null);
  const callStateRef = useRef('idle'); // single source of truth for async callbacks

  const {
    companionMessages,
    companionLoading,
    sendCompanionMessage,
    fetchCompanionHistory,
  } = useChatStore();

  useEffect(() => {
    fetchCompanionHistory();
  }, [fetchCompanionHistory]);

  // Auto-scroll chat
  useEffect(() => {
    if (activeTab === 'chat') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [companionMessages, companionLoading, activeTab]);

  // Only auto-play in chat tab if user checked autoPlay
  useEffect(() => {
    if (autoPlay && activeTab === 'chat' && companionMessages.length > 0) {
      const last = companionMessages[companionMessages.length - 1];
      if (last.role === 'assistant') {
        synthesizeSpeech(last.content);
      }
    }
  }, [companionMessages, autoPlay, activeTab]);

  // Helper to safely transition call state
  const updateCallState = (newState, statusText = '') => {
    callStateRef.current = newState;
    setCallState(newState);
    if (statusText) setCallStatusText(statusText);
  };

  // ── START LISTENING IN VOICE CALL ──
  const startListeningTurn = useCallback(() => {
    if (activeTab !== 'call' || callStateRef.current === 'idle') return;

    // Abort existing recognition safely
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onend = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.abort();
      } catch (e) {}
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Voice calls require Google Chrome or Microsoft Edge with Speech Recognition support.');
      updateCallState('idle', 'Microphone not supported');
      return;
    }

    let localTranscript = '';
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'hi-IN';

    recognition.onstart = () => {
      if (callStateRef.current === 'idle') {
        try { recognition.abort(); } catch (e) {}
        return;
      }
      updateCallState('listening', 'Sara is listening...');
      setUserSpeechCaption('');
    };

    const submitVoiceQuery = (speechText) => {
      const trimmed = speechText.trim();
      if (!trimmed || trimmed.length < 2 || callStateRef.current === 'idle') return;

      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);

      try {
        recognition.onend = null;
        recognition.onerror = null;
        recognition.abort();
      } catch (e) {}

      updateCallState('thinking', 'Sara is thinking...');
      setUserSpeechCaption(trimmed);

      sendCompanionMessage(trimmed, { isVoiceMode: true }).then(() => {
        if (callStateRef.current === 'idle') return;

        const msgs = useChatStore.getState().companionMessages;
        const lastMsg = msgs[msgs.length - 1];

        if (lastMsg && lastMsg.role === 'assistant') {
          updateCallState('speaking', 'Sara is speaking...');
          setSaraSpeechCaption(lastMsg.content);

          synthesizeSpeech(lastMsg.content, () => {
            if (callStateRef.current === 'idle') return;

            // Audio finished! Transition back to listening
            setUserSpeechCaption('');
            setSaraSpeechCaption('');
            updateCallState('listening', 'Sara is listening...');
            setTimeout(() => {
              startListeningTurn();
            }, 300);
          });
        } else {
          // Fallback if no reply
          setTimeout(() => {
            if (callStateRef.current !== 'idle') startListeningTurn();
          }, 600);
        }
      }).catch(() => {
        if (callStateRef.current !== 'idle') {
          setTimeout(() => startListeningTurn(), 800);
        }
      });
    };

    recognition.onresult = (event) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          localTranscript += event.results[i][0].transcript + ' ';
        } else {
          interim += event.results[i][0].transcript;
        }
      }

      const current = (localTranscript + interim).trim();
      setUserSpeechCaption(current);

      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);

      // Auto-detect end of speech after 900ms pause
      if (current.length >= 2) {
        silenceTimerRef.current = setTimeout(() => {
          submitVoiceQuery(current);
        }, 900);
      }
    };

    recognition.onerror = (e) => {
      if (e.error !== 'aborted' && callStateRef.current === 'listening') {
        setTimeout(() => {
          if (callStateRef.current === 'listening') startListeningTurn();
        }, 500);
      }
    };

    recognition.onend = () => {
      // If recognition stopped unexpectedly while in listening mode, revive it
      if (callStateRef.current === 'listening') {
        setTimeout(() => {
          if (callStateRef.current === 'listening') startListeningTurn();
        }, 300);
      }
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch (e) {
      console.warn('Recognition start exception:', e);
    }
  }, [activeTab, sendCompanionMessage]);

  // ── CALL CONTROLS ──
  const startCall = () => {
    setActiveTab('call');
    setUserSpeechCaption('');
    setSaraSpeechCaption('');
    updateCallState('listening', 'Sara is listening...');

    // Short greeting before first listen if messages are empty
    setTimeout(() => {
      startListeningTurn();
    }, 200);
  };

  const endCall = () => {
    updateCallState('idle', 'Call ended');
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onend = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.abort();
      } catch (e) {}
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setUserSpeechCaption('');
    setSaraSpeechCaption('');
    setActiveTab('chat');
  };

  // Clean up on unmount or tab switch
  useEffect(() => {
    return () => {
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      if (recognitionRef.current) {
        try {
          recognitionRef.current.onend = null;
          recognitionRef.current.onerror = null;
          recognitionRef.current.abort();
        } catch (e) {}
      }
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const handleSendText = () => {
    const trimmed = input.trim();
    if (!trimmed || companionLoading) return;
    setInput('');
    sendCompanionMessage(trimmed);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendText();
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[calc(100vh-100px)]">
      {/* ── MAIN INTERACTION AREA (8 cols) ── */}
      <div className="lg:col-span-8 flex flex-col h-full bg-white/70 backdrop-blur-md rounded-3xl p-6 shadow-card border border-border-subtle relative overflow-hidden">
        
        {/* Header with Mode Switcher */}
        <div className="flex items-center justify-between pb-4 border-b border-border-subtle mb-4">
          <div className="flex items-center gap-3">
            <SaraAvatar size="sm" emotion={companionLoading || callState === 'thinking' ? 'thinking' : 'happy'} />
            <div>
              <h2 className="font-bold text-[18px] text-text-primary leading-tight">Sara</h2>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className={`w-2 h-2 rounded-full inline-block ${activeTab === 'call' ? 'bg-emerald-500 animate-pulse' : 'bg-success'}`} />
                <span className="text-[12px] text-text-tertiary font-normal">
                  {activeTab === 'call' ? 'Live Voice Room Active' : 'Your AI conversation companion'}
                </span>
              </div>
            </div>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="flex items-center bg-surface-soft p-1 rounded-full border border-border-subtle">
            <button
              onClick={() => {
                if (activeTab === 'call') endCall();
                setActiveTab('chat');
              }}
              className={`px-4 py-1.5 rounded-full text-[13px] font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'chat' ? 'bg-white text-text-primary shadow-sm' : 'text-text-tertiary hover:text-text-primary'
              }`}
            >
              <span>💬</span> Chat Mode
            </button>
            <button
              onClick={() => {
                if (activeTab !== 'call') startCall();
              }}
              className={`px-4 py-1.5 rounded-full text-[13px] font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'call' ? 'bg-primary text-white shadow-sm' : 'text-text-tertiary hover:text-text-primary'
              }`}
            >
              <Phone size={13} /> Voice Call
            </button>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* ── TAB 1: CHAT MODE (TEXT & CASUAL CHAT) ── */}
        {/* ═══════════════════════════════════════════════════════════ */}
        {activeTab === 'chat' && (
          <div className="flex flex-col flex-1 h-[calc(100%-80px)]">
            <DisclaimerStrip variant="chat" />

            {/* Messages Scroll Area */}
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

            {/* Chat Input Bar */}
            <div className="pt-3 border-t border-border-subtle">
              <div className="bg-white rounded-full p-2 pl-5 shadow-card border border-border-subtle hover:border-primary/40 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all flex items-center gap-3">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Message Sara in Hindi or English..."
                  className="flex-1 bg-transparent text-[14.5px] text-text-primary placeholder-text-tertiary outline-none border-none py-1"
                />
                <button
                  onClick={startCall}
                  className="p-2 rounded-full text-text-tertiary hover:bg-surface-soft hover:text-primary transition-colors cursor-pointer"
                  title="Switch to Voice Call"
                >
                  <Mic size={18} />
                </button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleSendText}
                  disabled={!input.trim() || companionLoading}
                  aria-label="Send message"
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
                  <span>Auto-play Sara audio in chat</span>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* ── TAB 2: DEDICATED LIVE VOICE CALL ROOM ── */}
        {/* ═══════════════════════════════════════════════════════════ */}
        {activeTab === 'call' && (
          <div className="flex flex-col flex-1 items-center justify-between py-6 px-4 select-none relative bg-gradient-to-b from-[#1E1736] via-[#2A1842] to-[#161028] rounded-2xl text-white overflow-hidden shadow-2xl">
            
            {/* Call Status Pill */}
            <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/20 text-[13px] font-medium backdrop-blur-md">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
              <span>Live Sara Voice Call (ElevenLabs Multilingual v2)</span>
            </div>

            {/* Central Animated Speaking/Listening Orb */}
            <div className="text-center space-y-6 my-auto max-w-md w-full">
              <div className="relative mx-auto w-40 h-40 flex items-center justify-center">
                {callState === 'listening' && (
                  <>
                    <div className="absolute inset-0 rounded-full bg-primary/40 animate-ping opacity-60" />
                    <div className="absolute -inset-4 rounded-full bg-primary/20 animate-pulse opacity-40" />
                  </>
                )}
                {callState === 'thinking' && (
                  <div className="absolute inset-0 rounded-full border-4 border-t-amber-400 border-r-transparent border-b-primary border-l-transparent animate-spin" />
                )}
                {callState === 'speaking' && (
                  <>
                    <div className="absolute inset-0 rounded-full bg-emerald-500/30 animate-ping opacity-50" />
                    <div className="absolute -inset-4 rounded-full bg-emerald-400/20 animate-pulse" />
                  </>
                )}

                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    if (callState === 'listening' && userSpeechCaption) {
                      // Manual tap sends immediately without waiting for silence
                      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
                      const t = userSpeechCaption;
                      if (recognitionRef.current) try { recognitionRef.current.abort(); } catch (e) {}
                      updateCallState('thinking', 'Sara is thinking...');
                      sendCompanionMessage(t, { isVoiceMode: true }).then(() => {
                        const msgs = useChatStore.getState().companionMessages;
                        const last = msgs[msgs.length - 1];
                        if (last?.role === 'assistant') {
                          updateCallState('speaking', 'Sara is speaking...');
                          setSaraSpeechCaption(last.content);
                          synthesizeSpeech(last.content, () => {
                            setUserSpeechCaption('');
                            setSaraSpeechCaption('');
                            updateCallState('listening', 'Sara is listening...');
                            startListeningTurn();
                          });
                        }
                      });
                    } else if (callState !== 'listening' && callState !== 'speaking' && callState !== 'thinking') {
                      startListeningTurn();
                    }
                  }}
                  className={`w-32 h-32 rounded-full flex flex-col items-center justify-center text-4xl shadow-2xl transition-all cursor-pointer ${
                    callState === 'listening'
                      ? 'bg-gradient-to-tr from-primary to-purple-500 text-white shadow-primary/50'
                      : callState === 'thinking'
                      ? 'bg-gradient-to-tr from-amber-500 to-orange-400 text-white shadow-amber-500/40 animate-pulse'
                      : 'bg-gradient-to-tr from-emerald-500 to-teal-400 text-white shadow-emerald-500/50'
                  }`}
                >
                  <span>{callState === 'listening' ? '🎙️' : callState === 'thinking' ? '🔮' : '✨'}</span>
                  <span className="text-[10px] uppercase font-bold tracking-widest mt-1 opacity-80">
                    {callState}
                  </span>
                </motion.div>
              </div>

              {/* Status and Dynamic Captions */}
              <div className="space-y-3">
                <div className="flex items-center justify-center gap-2">
                  <h3 className="text-[22px] font-bold tracking-tight">{callStatusText}</h3>
                  {callState === 'thinking' && <Loader2 size={18} className="animate-spin text-amber-300" />}
                </div>

                <div className="min-h-[70px] flex items-center justify-center px-4">
                  {callState === 'listening' && (
                    <div className="bg-white/10 backdrop-blur-md rounded-2xl px-5 py-3 border border-white/15 max-w-md w-full text-center">
                      <p className="text-[14px] text-white/90">
                        {userSpeechCaption ? `"${userSpeechCaption}"` : 'Bolo bhai, main sun rahi hoon... (Speak freely)'}
                      </p>
                      {userSpeechCaption && (
                        <span className="text-[11px] text-primary-light mt-1 block">Tap center orb to send immediately</span>
                      )}
                    </div>
                  )}

                  {callState === 'thinking' && (
                    <p className="text-[13.5px] text-white/70 italic max-w-md">
                      Sara is preparing a short response in natural Hindi/English...
                    </p>
                  )}

                  {callState === 'speaking' && (
                    <div className="bg-emerald-950/50 backdrop-blur-md rounded-2xl px-5 py-3 border border-emerald-400/30 max-w-md w-full leading-relaxed text-center">
                      <p className="text-[14.5px] font-medium text-emerald-200">
                        "{saraSpeechCaption || 'Speaking...'}"
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* End Call Button */}
            <div className="flex items-center gap-4">
              <button
                onClick={endCall}
                className="py-3.5 px-8 rounded-full bg-danger/90 hover:bg-danger text-white font-semibold text-[14px] flex items-center gap-2.5 shadow-lg shadow-danger/30 transition-all cursor-pointer hover:scale-105 active:scale-95"
              >
                <PhoneOff size={18} />
                <span>End Voice Call</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── RIGHT SIDEBAR (4 cols) ── */}
      <div className="lg:col-span-4 space-y-6">
        {/* 3D Orb Visual Card + Start Voice with Sara */}
        <div className="bg-white/70 backdrop-blur-md rounded-3xl p-6 shadow-card border border-border-subtle relative overflow-hidden text-center flex flex-col items-center">
          <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-primary via-secondary to-primary-light flex items-center justify-center text-4xl shadow-card-lg mb-4">
            🔮
          </div>

          <p className="text-[12px] font-semibold text-text-tertiary mb-4">
            {activeTab === 'call' ? 'Voice Call Active' : 'Ready when you are'}
          </p>

          <button
            onClick={() => {
              if (activeTab === 'call') {
                endCall();
              } else {
                startCall();
              }
            }}
            className={`w-full py-3.5 px-6 rounded-2xl font-bold text-[14px] flex items-center justify-center gap-2.5 transition-all shadow-md cursor-pointer ${
              activeTab === 'call'
                ? 'bg-danger text-white hover:bg-danger-dark'
                : 'bg-primary text-white hover:bg-primary-dark hover:shadow-lg'
            }`}
          >
            {activeTab === 'call' ? (
              <>
                <PhoneOff size={18} />
                <span>End voice call</span>
              </>
            ) : (
              <>
                <Phone size={18} />
                <span>Start voice with Sara</span>
              </>
            )}
          </button>

          <p className="text-[12px] text-text-tertiary mt-3">
            Talk, type, or switch modes. Sara keeps the same thread.
          </p>
        </div>

        {/* Try a Starting Point Card */}
        <div className="bg-white/70 backdrop-blur-md rounded-3xl p-6 shadow-card border border-border-subtle">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-[16px] text-text-primary">Try a starting point</h3>
              <p className="text-[12px] text-text-tertiary">One small prompt is enough</p>
            </div>
            <Sparkles size={16} className="text-secondary" />
          </div>

          <div className="space-y-2.5">
            {STARTING_POINTS.map((sp, i) => (
              <button
                key={i}
                onClick={() => {
                  if (activeTab === 'call') setActiveTab('chat');
                  sendCompanionMessage(sp.prompt);
                }}
                className="w-full p-3.5 rounded-2xl bg-white hover:bg-primary/5 border border-border-subtle hover:border-primary/30 transition-all flex items-center justify-between text-left cursor-pointer group shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">{sp.icon}</span>
                  <div>
                    <p className="font-semibold text-[13.5px] text-text-primary group-hover:text-primary transition-colors">
                      {sp.title}
                    </p>
                    <p className="text-[11.5px] text-text-tertiary">{sp.subtitle}</p>
                  </div>
                </div>
                <span className="text-text-tertiary group-hover:text-primary group-hover:translate-x-0.5 transition-all text-[14px]">
                  →
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
