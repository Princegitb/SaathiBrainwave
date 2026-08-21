import { motion } from 'framer-motion';

/**
 * PillChip — DESIGN_SYSTEM.md Section 4.6
 * Rounded pill button for quick-access items.
 * Used for: Activity path chips, suggestion chips, tags.
 *
 * Props:
 *   label     — display text
 *   icon      — Lucide icon component (optional)
 *   active    — is this chip currently active/selected
 *   onClick   — click handler
 *   variant   — "default" | "outline" | "soft"
 *   size      — "sm" | "md"
 *   className — additional classes
 */
export default function PillChip({
  label,
  icon: Icon,
  active = false,
  onClick,
  variant = 'default',
  size = 'md',
  className = '',
}) {
  const sizeClasses = size === 'sm'
    ? 'px-3.5 py-1.5 text-[12.5px]'
    : 'px-5 py-2.5 text-[14px]';

  const variantClasses = {
    default: active
      ? 'bg-primary text-white shadow-card'
      : 'bg-white text-text-secondary hover:bg-surface-soft hover:text-text-primary',
    outline: active
      ? 'bg-primary text-white border-primary'
      : 'bg-transparent border border-border-subtle text-text-secondary hover:border-primary-light hover:text-primary',
    soft: active
      ? 'bg-primary-light text-primary-dark'
      : 'bg-surface-soft text-text-secondary hover:bg-primary-light/30 hover:text-primary',
  };

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className={`
        flex items-center gap-2 rounded-full font-medium
        transition-all duration-200 cursor-pointer
        ${sizeClasses}
        ${variantClasses[variant]}
        ${className}
      `}
    >
      {Icon && <Icon size={size === 'sm' ? 14 : 17} />}
      {label}
    </motion.button>
  );
}
