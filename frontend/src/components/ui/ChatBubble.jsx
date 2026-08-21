import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Volume2 } from 'lucide-react';

/**
 * ChatBubble — Redesigned according to new SARA UI reference.
 * User bubble: solid primary purple, white text, right-aligned.
 * AI bubble: clean white card, text-primary, left-aligned, with SARA headers and speaker action inside.
 * Peer/Other bubble: simple markdown card without SARA headers.
 *
 * Props:
 *   message  — text content
 *   role     — "user" | "assistant"
 *   animate  — whether to animate entry (default: true)
 *   onSpeak  — optional callback to trigger text-to-speech (only for Sara AI)
 */
export default function ChatBubble({ message, role, animate = true, onSpeak }) {
  const isUser = role === 'user';

  const motionProps = animate
    ? {
        initial: { opacity: 0, x: isUser ? 20 : -20, y: 5 },
        animate: { opacity: 1, x: 0, y: 0 },
        transition: { duration: 0.15, ease: 'easeOut' },
      }
    : {};

  return (
    <motion.div
      {...motionProps}
      className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} mb-5`}
    >
      {/* Outer Name Label */}
      <span className="text-[10px] font-bold uppercase tracking-wider text-text-tertiary mb-1 px-1.5 select-none">
        {isUser ? 'YOU' : 'SARA'}
      </span>

      <div
        className={`
          max-w-[78%] px-6 py-4.5 text-[14.5px] leading-relaxed break-words overflow-hidden shadow-sm
          ${
            isUser
              ? 'bg-[#7654D9] text-white rounded-[22px] rounded-br-[6px]'
              : 'bg-white text-text-primary rounded-[22px] rounded-bl-[6px] border border-[#E9E5F3]'
          }
        `}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap">{message}</p>
        ) : onSpeak ? (
          <div className="flex flex-col w-full">
            <button
              onClick={onSpeak}
              className="flex items-center gap-1.5 text-[11.5px] text-text-tertiary hover:text-primary transition-colors mb-2 self-start"
              title="Listen to Sara response"
            >
              <Volume2 size={13} className="text-text-tertiary" />
              <span>Sara response</span>
            </button>
            <div className="markdown-body whitespace-pre-wrap text-text-primary">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{message}</ReactMarkdown>
            </div>
          </div>
        ) : (
          <div className="markdown-body whitespace-pre-wrap text-text-primary">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{message}</ReactMarkdown>
          </div>
        )}
      </div>
    </motion.div>
  );
}