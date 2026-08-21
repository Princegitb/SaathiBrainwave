import { ShieldCheck } from 'lucide-react';

/**
 * DisclaimerStrip — PRD §5.1
 * Persistent, non-intrusive disclaimer pinned above the chat input.
 *
 * Props:
 *   variant — "chat" (thin, above input) | "banner" (wider, more prominent)
 */
export default function DisclaimerStrip({ variant = 'chat' }) {
  if (variant === 'banner') {
    return (
      <div className="flex items-start gap-2.5 px-5 py-3 bg-surface-soft rounded-2xl text-[13px] text-text-secondary">
        <ShieldCheck size={16} className="text-primary shrink-0 mt-0.5" />
        <p>
          <span className="font-medium text-text-primary">SAATHI</span> is a support and practice tool, not a replacement for therapy or medical care.{' '}
          If you're in crisis, please reach out to a{' '}
          <a
            href="https://www.thelivelovelaughfoundation.org/find-help/helplines"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Professional helpline (opens in a new tab)"
            className="text-primary underline underline-offset-2 hover:text-primary-dark"
          >
            professional helpline
          </a>
          .
        </p>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center gap-1.5 px-4 py-2 bg-surface-soft/80 text-[11.5px] text-text-tertiary">
      <ShieldCheck size={13} className="text-primary-light shrink-0" />
      <span>
        SAATHI is a support and practice tool, not a replacement for therapy or medical care.
      </span>
    </div>
  );
}
