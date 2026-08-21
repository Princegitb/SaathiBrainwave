import { motion } from 'framer-motion';

/**
 * StatCard — DESIGN_SYSTEM.md Section 4.2
 * White rounded card with icon, label, status line, and large bold stat value.
 *
 * Props:
 *   label    — e.g. "Goal Progress"
 *   status   — e.g. "Status: Standard"
 *   value    — e.g. "65%"
 *   icon     — Lucide icon component (optional)
 *   color    — accent color for the value (optional)
 *   className — additional classes
 *   onClick  — optional handler (makes card clickable)
 */
export default function StatCard({
  label,
  status,
  value,
  icon: Icon,
  color,
  className = '',
  onClick,
}) {
  const Wrapper = onClick ? motion.button : motion.div;
  const wrapperProps = onClick
    ? {
        whileHover: { y: -2 },
        whileTap: { scale: 0.98 },
        onClick,
      }
    : {};

  return (
    <Wrapper
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className={`card text-left ${onClick ? 'cursor-pointer w-full' : ''} ${className}`}
      {...wrapperProps}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-h2">{label}</h3>
          {status && <p className="text-label mt-1">{status}</p>}
        </div>
        {Icon && (
          <div className="w-9 h-9 rounded-xl bg-primary-light/40 flex items-center justify-center">
            <Icon size={16} className="text-primary-dark" />
          </div>
        )}
      </div>
      <p
        className="text-stat mt-2"
        style={color ? { color } : undefined}
      >
        {value}
      </p>
    </Wrapper>
  );
}