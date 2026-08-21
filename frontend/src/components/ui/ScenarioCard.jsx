import { motion } from 'framer-motion';
import { ArrowRight, Lock } from 'lucide-react';

/**
 * ScenarioCard — DESIGN_SYSTEM.md Section 7.3
 * White card with icon + title + description + "Start" pill button.
 * Used in the Roleplay Selector grid.
 *
 * Props:
 *   icon        — Lucide icon or emoji string
 *   title       — e.g. "Job Interview"
 *   description — one-line description
 *   onStart     — click handler
 *   disabled    — shows "Coming Soon" state
 *   className   — additional classes
 */
export default function ScenarioCard({
  icon: Icon,
  emoji,
  title,
  description,
  onStart,
  disabled = false,
  className = '',
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className={`card relative overflow-hidden ${
        disabled ? 'opacity-60' : 'hover:shadow-card-hover'
      } ${className}`}
    >
      {/* Icon */}
      <div className="w-14 h-14 rounded-2xl bg-surface-soft flex items-center justify-center mb-4">
        {emoji ? (
          <span className="text-2xl">{emoji}</span>
        ) : Icon ? (
          <Icon size={26} className="text-primary" />
        ) : null}
      </div>

      {/* Title */}
      <h3 className="text-h2 mb-1.5">{title}</h3>

      {/* Description */}
      <p className="text-body text-[13.5px] mb-5">{description}</p>

      {/* CTA Button */}
      {disabled ? (
        <div className="flex items-center gap-2 text-text-tertiary text-[13px]">
          <Lock size={14} />
          <span>Coming Soon</span>
        </div>
      ) : (
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          onClick={onStart}
          className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white text-[14px] font-medium rounded-full hover:bg-primary-dark transition-colors cursor-pointer"
        >
          Start
          <ArrowRight size={16} />
        </motion.button>
      )}
    </motion.div>
  );
}
