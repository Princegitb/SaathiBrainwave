import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';

/**
 * CTACard — DESIGN_SYSTEM.md Section 4.5
 * Featured card: bold eyebrow label, large stat/countdown, avatar + context, CTA arrow.
 */
export default function CTACard({
  eyebrow,
  title,
  stat,
  avatarIcon: AvatarIcon,
  subtitle,
  onClick,
  className = '',
}) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut', delay: 0.15 }}
      onClick={onClick}
      className={`w-full text-left card relative overflow-hidden cursor-pointer group ${className}`}
    >
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary to-accent-lilac" />

      <p className="text-label text-primary mb-3">{eyebrow}</p>
      <h3 className="text-h2 mb-2">{title}</h3>
      {stat && <p className="text-stat text-primary mb-4">{stat}</p>}

      <div className="flex items-center justify-between mt-auto pt-3 border-t border-border-subtle">
        <div className="flex items-center gap-3">
          {AvatarIcon && (
            <div className="w-10 h-10 rounded-full bg-primary-light flex items-center justify-center">
              <AvatarIcon size={18} className="text-primary-dark" />
            </div>
          )}
          {subtitle && <span className="text-body text-[13px]">{subtitle}</span>}
        </div>
        <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center group-hover:bg-primary-dark transition-colors">
          <ArrowRight size={16} className="text-white" />
        </div>
      </div>
    </motion.button>
  );
}