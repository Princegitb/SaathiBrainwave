import { motion } from 'framer-motion';
import { Play } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

/**
 * ListRow — DESIGN_SYSTEM.md Section 4.4
 * Left: small circular icon/avatar + title (bold) + date (muted, below).
 * Right: secondary label + clickable play button. When href is provided,
 * the whole row navigates on click AND the play button is shown.
 */
export default function ListRow({
  icon: Icon,
  iconBg,
  title,
  date,
  subtitle,
  href,
  onAction,
  actionIcon: ActionIcon = Play,
}) {
  const navigate = useNavigate();

  const handleClick = () => {
    if (onAction) onAction();
    else if (href) navigate(href);
  };

  const handleAction = (e) => {
    e.stopPropagation();
    handleClick();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      onClick={handleClick}
      className="flex items-center justify-between py-3.5 px-2 border-b border-border-subtle last:border-b-0 hover:bg-surface-soft/50 rounded-xl transition-colors cursor-pointer"
    >
      {/* Left */}
      <div className="flex items-center gap-3.5 flex-1 min-w-0">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
          style={{ backgroundColor: iconBg || '#C4B5FD' }}
        >
          {Icon && <Icon size={18} className="text-white" />}
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-[14.5px] text-text-primary truncate">{title}</p>
          <p className="text-[12px] text-text-tertiary mt-0.5 truncate">{date}</p>
        </div>
      </div>

      {/* Right */}
      <div className="flex items-center gap-3 shrink-0">
        {subtitle && (
          <span className="text-[13px] text-text-secondary hidden sm:block">{subtitle}</span>
        )}
        {(onAction || href) && (
          <button
            onClick={handleAction}
            className="w-9 h-9 rounded-full bg-surface-soft flex items-center justify-center hover:bg-primary-light/30 transition-colors"
            aria-label={`Resume ${title}`}
          >
            <ActionIcon size={16} className="text-primary" />
          </button>
        )}
      </div>
    </motion.div>
  );
}