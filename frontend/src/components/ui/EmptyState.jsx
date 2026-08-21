import { motion } from 'framer-motion';

/**
 * EmptyState — friendly empty placeholder with icon, title, subtitle, optional CTA.
 */
export default function EmptyState({
  icon: Icon,
  title,
  subtitle,
  ctaLabel,
  onCta,
  className = '',
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`flex flex-col items-center text-center py-10 px-6 ${className}`}
    >
      {Icon && (
        <div className="w-16 h-16 rounded-3xl bg-surface-soft flex items-center justify-center mb-4">
          <Icon size={28} className="text-primary" />
        </div>
      )}
      <h3 className="text-h2 mb-1.5">{title}</h3>
      {subtitle && (
        <p className="text-body text-[13.5px] max-w-sm mb-5">{subtitle}</p>
      )}
      {ctaLabel && onCta && (
        <button
          onClick={onCta}
          className="px-5 py-2.5 bg-primary text-white text-[14px] font-medium rounded-full hover:bg-primary-dark transition-colors"
        >
          {ctaLabel}
        </button>
      )}
    </motion.div>
  );
}