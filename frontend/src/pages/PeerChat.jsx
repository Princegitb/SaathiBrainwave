import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, ArrowLeft, Users, ShieldCheck, Loader2 } from 'lucide-react';
import ChatBubble from '../components/ui/ChatBubble';
import DisclaimerStrip from '../components/ui/DisclaimerStrip';
import EmptyState from '../components/ui/EmptyState';
import { useToast } from '../components/ui/Toast';
import useUserStore from '../store/userStore';

/**
 * PeerChat — anonymous chat with a matched Saathi. Mock replies are served
 * by the backend (real human matching is a future-scope item).
 */
const INTENTS = [
  { id: 'casual', label: 'Casual conversation' },
  { id: 'practice', label: 'Practice conversation' },
  { id: 'support', label: 'Support conversation' },
  { id: 'listening', label: 'Listening mode' },
];

export default function PeerChat() {
  const { saathiId } = useParams();
  const navigate = useNavigate();
  const userId = useUserStore((s) => s.ensureUserId());
  const toast = useToast();

  const [saathi, setSaathi] = useState(null);
  const [messages, setMessages] = useState([]);
  const [intent, setIntent] = useState(null);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [ended, setEnded] = useState(false);
  const messagesEndRef = useRef(null);

  // Load saathi profile
  useEffect(() => {
    fetch(`/api/peer/saathi?user_id=${userId}&anchor=${saathiId}`)
      .then((r) => r.json())
      .then((d) => setSaathi(d.match))
      .catch(() => {
        toast({ type: 'error', message: 'Could not load saathi.' });
      });
  }, [saathiId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const send = async () => {
    const trimmed = input.trim();
    if (!trimmed || !intent || loading || ended) return;
    setInput('');
    const userMsg = { role: 'user', content: trimmed };
    setMessages((m) => [...m, userMsg]);
    setLoading(true);

    try {
      const res = await fetch('/api/peer/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          saathi_id: saathiId,
          intent,
          messages: [...messages, userMsg],
        }),
      });
      const data = await res.json();
      if (data.redacted) {
        toast({
          type: 'info',
          message: 'Contact info was redacted for safety.',
        });
      }
      setMessages((m) => [...m, { role: 'saathi', content: data.reply }]);
    } catch (e) {
      toast({ type: 'error', message: 'Connection lost. Try again.' });
    } finally {
      setLoading(false);
    }
  };

  const endChat = () => {
    setEnded(true);
    toast({ type: 'success', message: 'Conversation ended. Take care! 💛' });
  };

  const initial = saathi?.alias?.[0]?.toUpperCase() || 'S';

  return (
    <div className="flex flex-col h-[calc(100vh-88px)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/peer')}
            aria-label="Back to saathi list"
            className="w-10 h-10 rounded-2xl bg-white shadow-card flex items-center justify-center hover:bg-surface-soft transition-colors"
          >
            <ArrowLeft size={18} className="text-text-primary" />
          </button>

          {saathi && (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary to-accent-lilac flex items-center justify-center text-white font-bold">
                {initial}
              </div>
              <div>
                <h2 className="text-h2">{saathi.alias}</h2>
                <p className="text-[12px] text-text-tertiary capitalize">
                  Anonymous • {saathi.intent}
                </p>
              </div>
            </div>
          )}
        </div>

        {!ended && (
          <button
            onClick={endChat}
            className="flex items-center gap-1.5 px-4 py-2 text-[13px] font-medium text-danger bg-danger/10 rounded-full hover:bg-danger/20 transition-colors"
            aria-label="End conversation"
          >
            End chat
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto py-4 px-1 space-y-1">
        {/* Intent picker */}
        {!intent && saathi && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="card max-w-xl mx-auto mt-4"
          >
            <div className="flex items-center gap-2 mb-3">
              <ShieldCheck size={18} className="text-primary" />
              <h3 className="text-h2 text-[16px]">How would you like to chat?</h3>
            </div>
            <p className="text-body text-[13.5px] mb-4">
              Your saathi will see the same intent, so you both know what kind of
              conversation this is.
            </p>
            <div className="grid grid-cols-2 gap-2.5">
              {INTENTS.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setIntent(opt.id)}
                  className="px-4 py-3 bg-surface-soft text-text-primary rounded-2xl text-[13px] font-medium hover:bg-primary-light/30 hover:text-primary-dark transition-colors text-left"
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {intent && messages.length === 0 && !loading && (
          <EmptyState
            icon={Users}
            title={`Say hi to ${saathi?.alias || 'your Saathi'}`}
            subtitle="Start with how you're feeling today, or anything you'd like to talk about."
          />
        )}

        {messages.map((msg, i) => (
          <ChatBubble key={i} message={msg.content} role={msg.role === 'user' ? 'user' : 'assistant'} />
        ))}

        {loading && (
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent-lilac flex items-center justify-center text-white text-[13px] font-bold">
              {initial}
            </div>
            <div className="bg-white rounded-2xl px-5 py-3 shadow-card">
              <Loader2 size={18} className="text-primary animate-spin" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      {intent && !ended && (
        <div className="mt-auto">
          <DisclaimerStrip variant="chat" />
          <div className="flex items-end gap-3 pt-3 pb-2">
            <div className="flex-1 bg-white rounded-2xl shadow-card px-4 py-3">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
                placeholder={`Message ${saathi?.alias || 'your saathi'}...`}
                rows={1}
                className="w-full bg-transparent text-[14.5px] text-text-primary placeholder-text-tertiary outline-none resize-none max-h-[120px]"
              />
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={send}
              disabled={!input.trim() || loading}
              aria-label="Send message"
              className="w-12 h-12 rounded-2xl bg-primary text-white flex items-center justify-center hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
            >
              <Send size={18} />
            </motion.button>
          </div>
        </div>
      )}

      {ended && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-auto card text-center"
        >
          <p className="text-body mb-3">This conversation has ended.</p>
          <button
            onClick={() => navigate('/peer')}
            className="px-5 py-2.5 bg-primary text-white rounded-2xl text-[14px] font-medium hover:bg-primary-dark transition-colors"
          >
            Find another Saathi
          </button>
        </motion.div>
      )}
    </div>
  );
}