import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUp, Mic, MicOff, Volume2, VolumeX, Sparkles, Loader2, PhoneOff, Phone, Radio, Globe, Send, RefreshCw, Activity, Heart, Smile, ShieldCheck, TrendingUp } from 'lucide-react';
import ChatBubble from '../components/ui/ChatBubble';
import DisclaimerStrip from '../components/ui/DisclaimerStrip';
import SaraAvatar from '../components/ui/SaraAvatar';
import { useChatStore } from '../store/chatStore';
import { synthesizeSpeech } from '../utils/speechUtils';

/**
 * AI Companion ("Sara")
 * Dedicated Separation:
 * - 💬 Chat Mode: Text conversation thread with message history & quick prompts.
 * - 📞 Voice Call Mode: Dedicated calling room with audio visualizer, mute option, language switch, & instant send.
 * - 🧠 SaraSense™ Live Mood: Real-time sentiment, emotional intensity & Sara's adaptive coaching tone.
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

const RECOGNITION_LANGUAGES = [
  { code: 'en-IN', label: 'Hinglish / Indian English (en-IN)' },
  { code: 'hi-IN', label: 'Hindi (hi-IN)' },
  { code: 'en-US', label: 'English (US)' },
];

export default function AICompanion() {
  const [input, setInput] = useState('');
  const [activeTab, setActiveTab] = useState('chat'); // 'chat' | 'call'
  const [autoPlay, setAutoPlay] = useState(false);

  // ── Voice Call State ──
  // 'idle' | 'listening' | 'thinking' | 'speaking'
  const [callState, setCallState] = useState('idle');
  const [callStatusText, setCallStatusText] = useState('Ready when you are');
  const [userSpeechCaption, setUserSpeechCaption] = useState('');
  const [saraSpeechCaption, setSaraSpeechCaption] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  const [selectedLang, setSelectedLang] = useState('en-IN');
  const [audioLevel, setAudioLevel] = useState(0); // 0 to 100 for live visualizer

  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);
  const silenceTimerRef = useRef(null);
  const callStateRef = useRef('idle');
  const isMutedRef = useRef(false);
  const selectedLangRef = useRef('en-IN');
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const animFrameRef = useRef(null);

  const {
    companionMessages,
    companionLoading,
    sendCompanionMessage,
    fetchCompanionHistory,
    lastSentiment,
  } = useChatStore();

  useEffect(() => {
    fetchCompanionHistory();
  }, [fetchCompanionHistory]);

  // Keep refs synced
  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  useEffect(() => {
    selectedLangRef.current = selectedLang;
  }, [selectedLang]);

  // Auto-scroll chat
  useEffect(() => {
    if (activeTab === 'chat') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [companionMessages, companionLoading, activeTab]);

  // Helper to safely transition call state
  const updateCallState = (newState, statusText = '') => {
    callStateRef.current = newState;
    setCallState(newState);
    if (statusText) setCallStatusText(statusText);
  };

  // ── START LIVE MICROPHONE AUDIO VISUALIZER ──
  const startAudioVisualizer = async () => {
    try {
      if (mediaStreamRef.current) return;
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const AudioContext = window.AudioContext || window.webkitAudioContext;
      const audioCtx = new AudioContext();
      audioContextRef.current = audioCtx;

      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      analyserRef.current = analyser;

      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const updateVolume = () => {
        if (!isMutedRef.current && callStateRef.current === 'listening') {
          analyser.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
          }
          const avg = sum / dataArray.length;
          setAudioLevel(Math.min(100, Math.round(avg * 1.5)));
        } else {
          setAudioLevel(0);
        }
        animFrameRef.current = requestAnimationFrame(updateVolume);
      };
      updateVolume();
    } catch (e) {
      console.warn('Microphone visualizer initialization notice:', e);
    }
  };

  const stopAudioVisualizer = () => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
    if (audioContextRef.current) {
      try { audioContextRef.current.close(); } catch (e) {}
      audioContextRef.current = null;
    }
    setAudioLevel(0);
  };

  // ── START LISTENING IN VOICE CALL ──
  const startListeningTurn = useCallback(() => {
    if (activeTab !== 'call' || callStateRef.current === 'idle' || isMutedRef.current) return;

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
    recognition.lang = selectedLangRef.current;

    recognition.onstart = () => {
      if (callStateRef.current === 'idle' || isMutedRef.current) {
        try { recognition.abort(); } catch (e) {}
        return;
      }
      updateCallState('listening', 'Sara is listening to you...');
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

            // Finished speaking — resume listening for user's next sentence
            setUserSpeechCaption('');
            setSaraSpeechCaption('');
            updateCallState('listening', 'Sara is listening to you...');
            setTimeout(() => {
              if (!isMutedRef.current && callStateRef.current !== 'idle') {
                startListeningTurn();
              }
            }, 300);
          });
        } else {
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
      if (isMutedRef.current) return;
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

      // Auto-detect silence after 950ms of speech
      if (current.length >= 2) {
        silenceTimerRef.current = setTimeout(() => {
          submitVoiceQuery(current);
        }, 950);
      }
    };

    recognition.onerror = (e) => {
      if (e.error !== 'aborted' && callStateRef.current === 'listening' && !isMutedRef.current) {
        setTimeout(() => {
          if (callStateRef.current === 'listening' && !isMutedRef.current) startListeningTurn();
        }, 500);
      }
    };

    recognition.onend = () => {
      if (callStateRef.current === 'listening' && !isMutedRef.current) {
        setTimeout(() => {
          if (callStateRef.current === 'listening' && !isMutedRef.current) startListeningTurn();
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
    setIsMuted(false);
    isMutedRef.current = false;
    setUserSpeechCaption('');
    setSaraSpeechCaption('');
    updateCallState('listening', 'Sara is listening to you...');

    startAudioVisualizer();

    setTimeout(() => {
      startListeningTurn();
    }, 250);
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
    stopAudioVisualizer();
    setUserSpeechCaption('');
    setSaraSpeechCaption('');
    setActiveTab('chat');
  };

  const toggleMute = () => {
    if (isMuted) {
      setIsMuted(false);
      isMutedRef.current = false;
      if (callStateRef.current === 'listening') {
        startListeningTurn();
      }
    } else {
      setIsMuted(true);
      isMutedRef.current = true;
      if (recognitionRef.current) {
        try {
          recognitionRef.current.onend = null;
          recognitionRef.current.onerror = null;
          recognitionRef.current.abort();
        } catch (e) {}
      }
      setAudioLevel(0);
    }
  };

  const manualSendVoice = () => {
    if (!userSpeechCaption.trim()) return;
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    const t = userSpeechCaption.trim();
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onend = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.abort();
      } catch (e) {}
    }
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
          updateCallState('listening', 'Sara is listening to you...');
          if (!isMutedRef.current) startListeningTurn();
        });
      }
    });
  };

  useEffect(() => {
    return () => {
      stopAudioVisualizer();
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

  const getEmotionConfig = (emotion) => {
    switch (emotion?.toLowerCase()) {
      case 'joy':
        return {
          icon: '💛',
          label: 'Joy & Confidence',
          badgeColor: 'bg-amber-50 text-amber-700 border-amber-200',
          barColor: 'from-amber-400 to-yellow-500',
          actionLabel: 'Encouraging progress & celebrating wins',
        };
      case 'fear':
        return {
          icon: '💜',
          label: 'Hesitant / Anxious',
          badgeColor: 'bg-purple-50 text-purple-700 border-purple-200',
          barColor: 'from-purple-500 to-indigo-500',
          actionLabel: 'Gentle support & pacing down speech',
        };
      case 'sadness':
        return {
          icon: '💙',
          label: 'Low Mood / Reflective',
          badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
          barColor: 'from-blue-400 to-cyan-500',
          actionLabel: 'Empathetic listening & comforting space',
        };
      case 'anger':
        return {
          icon: '🧡',
          label: 'Frustrated / Overwhelmed',
          badgeColor: 'bg-orange-50 text-orange-700 border-orange-200',
          barColor: 'from-orange-500 to-rose-500',
          actionLabel: 'Calm grounded de-escalation',
        };
      default:
        return {
          icon: '✨',
          label: 'Calm & Engaged',
          badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          barColor: 'from-emerald-400 to-teal-500',
          actionLabel: 'Continuing natural conversational flow',
        };
    }
  };

  const currentEmotion = getEmotionConfig(lastSentiment?.emotion);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[calc(100vh-100px)]">
      {/* ── MAIN INTERACTION AREA (8 cols) ── */}
      <div className="lg:col-span-8 flex flex-col h-full bg-white/70 backdrop-blur-md rounded-3xl p-6 shadow-card border border-border-subtle relative overflow-hidden">
        
        {/* Top Header Bar */}
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
          <div className="flex flex-col flex-1 items-center justify-between py-6 px-4 select-none relative bg-gradient-to-b from-[#18122B] via-[#241438] to-[#120D22] rounded-2xl text-white overflow-hidden shadow-2xl">
            
            {/* Top Toolbar: Status & Language Selector */}
            <div className="flex flex-wrap items-center justify-between gap-3 w-full max-w-lg px-2">
              <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 border border-white/20 text-[12px] font-medium backdrop-blur-md">
                <span className={`w-2.5 h-2.5 rounded-full ${isMuted ? 'bg-danger' : 'bg-emerald-400 animate-ping'}`} />
                <span>{isMuted ? 'Microphone Muted' : 'Live Sara Voice Call'}</span>
              </div>

              {/* Language Selector Dropdown */}
              <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur-md px-3 py-1 rounded-full border border-white/20 text-[12px]">
                <Globe size={13} className="text-primary-light" />
                <select
                  value={selectedLang}
                  onChange={(e) => {
                    setSelectedLang(e.target.value);
                    selectedLangRef.current = e.target.value;
                    if (callState === 'listening' && !isMuted) {
                      startListeningTurn();
                    }
                  }}
                  className="bg-transparent text-white text-[12px] font-medium outline-none cursor-pointer"
                >
                  {RECOGNITION_LANGUAGES.map((l) => (
                    <option key={l.code} value={l.code} className="bg-[#1E1736] text-white">
                      {l.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Central Speaking / Listening Orb + Live Audio Visualizer */}
            <div className="text-center space-y-5 my-auto max-w-md w-full">
              <div className="relative mx-auto w-44 h-44 flex items-center justify-center">
                
                {/* Dynamic Audio Visualizer Rings */}
                {callState === 'listening' && !isMuted && (
                  <>
                    <div 
                      className="absolute inset-0 rounded-full bg-primary/30 transition-all duration-75"
                      style={{ transform: `scale(${1 + audioLevel / 80})` }}
                    />
                    <div 
                      className="absolute -inset-3 rounded-full bg-primary/15 transition-all duration-75"
                      style={{ transform: `scale(${1 + audioLevel / 60})` }}
                    />
                  </>
                )}

                {callState === 'thinking' && (
                  <div className="absolute inset-0 rounded-full border-4 border-t-amber-400 border-r-transparent border-b-primary border-l-transparent animate-spin" />
                )}

                {callState === 'speaking' && (
                  <>
                    <div className="absolute inset-0 rounded-full bg-emerald-500/30 animate-ping opacity-60" />
                    <div className="absolute -inset-4 rounded-full bg-emerald-400/20 animate-pulse" />
                  </>
                )}

                {/* Center Orb */}
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    if (callState === 'listening' && userSpeechCaption.trim()) {
                      manualSendVoice();
                    } else if (callState !== 'listening' && callState !== 'speaking' && callState !== 'thinking') {
                      startListeningTurn();
                    }
                  }}
                  className={`w-32 h-32 rounded-full flex flex-col items-center justify-center text-4xl shadow-2xl transition-all cursor-pointer ${
                    isMuted
                      ? 'bg-gradient-to-tr from-gray-700 to-gray-600 text-white shadow-gray-700/50'
                      : callState === 'listening'
                      ? 'bg-gradient-to-tr from-primary via-purple-500 to-indigo-500 text-white shadow-primary/60'
                      : callState === 'thinking'
                      ? 'bg-gradient-to-tr from-amber-500 to-orange-400 text-white shadow-amber-500/40 animate-pulse'
                      : 'bg-gradient-to-tr from-emerald-500 to-teal-400 text-white shadow-emerald-500/60'
                  }`}
                >
                  <span>{isMuted ? '🔇' : callState === 'listening' ? '🎙️' : callState === 'thinking' ? '🔮' : '✨'}</span>
                  <span className="text-[10px] uppercase font-bold tracking-widest mt-1 opacity-80">
                    {isMuted ? 'Muted' : callState}
                  </span>
                </motion.div>
              </div>

              {/* Status Header */}
              <div className="space-y-2">
                <div className="flex items-center justify-center gap-2">
                  <h3 className="text-[22px] font-bold tracking-tight">
                    {isMuted ? 'Microphone is Muted' : callStatusText}
                  </h3>
                  {callState === 'thinking' && <Loader2 size={18} className="animate-spin text-amber-300" />}
                </div>

                {/* Dynamic Speech Captions Box */}
                <div className="min-h-[75px] flex flex-col items-center justify-center px-4">
                  {callState === 'listening' && !isMuted && (
                    <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/15 max-w-md w-full text-center space-y-2">
                      <p className="text-[14.5px] text-white/95 font-medium min-h-[22px]">
                        {userSpeechCaption ? `"${userSpeechCaption}"` : 'Bolo bhai, main sun rahi hoon... (Start speaking)'}
                      </p>
                      {userSpeechCaption && (
                        <div className="flex items-center justify-center gap-2 pt-1">
                          <button
                            onClick={manualSendVoice}
                            className="py-1 px-3.5 rounded-full bg-primary text-white text-[12px] font-semibold flex items-center gap-1.5 hover:bg-primary-dark cursor-pointer shadow-sm"
                          >
                            <Send size={12} /> Send Now
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {isMuted && (
                    <p className="text-[13.5px] text-white/60 italic">
                      Unmute below to speak with Sara.
                    </p>
                  )}

                  {callState === 'thinking' && (
                    <p className="text-[13.5px] text-white/70 italic max-w-md">
                      Sara is preparing a short response in natural Hindi & English...
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

            {/* Bottom Call Controls (Mute, Restart Listening, End Call) */}
            <div className="flex items-center justify-center gap-4 pt-2">
              {/* Mute Button */}
              <button
                onClick={toggleMute}
                className={`p-3.5 rounded-full font-semibold text-[13.5px] flex items-center gap-2 transition-all cursor-pointer shadow-md ${
                  isMuted
                    ? 'bg-danger text-white hover:bg-danger-dark ring-2 ring-danger/50'
                    : 'bg-white/15 text-white hover:bg-white/25 border border-white/20'
                }`}
                title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
              >
                {isMuted ? <MicOff size={18} /> : <Mic size={18} />}
                <span>{isMuted ? 'Unmute' : 'Mute'}</span>
              </button>

              {/* End Call Button */}
              <button
                onClick={endCall}
                className="py-3.5 px-7 rounded-full bg-danger text-white font-semibold text-[14px] flex items-center gap-2.5 shadow-lg shadow-danger/40 transition-all cursor-pointer hover:bg-danger-dark hover:scale-105 active:scale-95"
              >
                <PhoneOff size={18} />
                <span>End Call</span>
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

        {/* ── SARASENSE™ LIVE SENTIMENT & MOOD CARD ── */}
        <div className="bg-white/70 backdrop-blur-md rounded-3xl p-6 shadow-card border border-border-subtle transition-all">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                <Activity size={17} />
              </div>
              <div>
                <h3 className="font-bold text-[15px] text-text-primary leading-tight">SaraSense™ Mood</h3>
                <p className="text-[11.5px] text-text-tertiary">Real-time emotion & tone</p>
              </div>
            </div>
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
            </span>
          </div>

          {lastSentiment ? (
            <div className="space-y-3.5">
              {/* Emotion Badge */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-surface-soft border border-border-subtle">
                <div className="flex items-center gap-2.5">
                  <span className="text-2xl">{currentEmotion.icon}</span>
                  <div>
                    <p className="font-bold text-[13.5px] text-text-primary">
                      {currentEmotion.label}
                    </p>
                    <p className="text-[11px] text-text-tertiary capitalize">
                      Sentiment: <span className="font-semibold text-text-secondary">{lastSentiment.sentiment || 'Neutral'}</span>
                    </p>
                  </div>
                </div>
                <span className={`text-[11.5px] font-bold px-2.5 py-1 rounded-full border ${currentEmotion.badgeColor}`}>
                  {lastSentiment.intensity || 75}% Intensity
                </span>
              </div>

              {/* Intensity Progress Bar */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-[11.5px] text-text-tertiary">
                  <span>Emotional Resonance</span>
                  <span className="font-semibold text-text-secondary">{lastSentiment.intensity || 75}%</span>
                </div>
                <div className="w-full h-2 bg-surface-soft rounded-full overflow-hidden border border-border-subtle/60">
                  <div 
                    className={`h-full rounded-full bg-gradient-to-r ${currentEmotion.barColor} transition-all duration-500`}
                    style={{ width: `${lastSentiment.intensity || 75}%` }}
                  />
                </div>
              </div>

              {/* Sara's Adaptive Action */}
              <div className="p-3 rounded-xl bg-primary/5 border border-primary/15 text-[12px] text-text-secondary flex items-start gap-2">
                <Heart size={14} className="text-primary shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-primary">Sara's Tone: </span>
                  <span>{currentEmotion.actionLabel}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-4 text-center space-y-1.5">
              <Smile size={24} className="text-primary/40 mx-auto" />
              <p className="text-[13px] font-medium text-text-secondary">Listening to your tone & mood</p>
              <p className="text-[11.5px] text-text-tertiary max-w-[220px] mx-auto">
                Send a message to see real-time emotion & sentiment analysis here.
              </p>
            </div>
          )}
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
