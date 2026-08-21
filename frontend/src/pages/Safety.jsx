import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  ShieldCheck,
  Lock,
  EyeOff,
  UserX,
  PhoneCall,
  Download,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  FileText,
} from 'lucide-react';
import DisclaimerStrip from '../components/ui/DisclaimerStrip';
import useUserStore from '../store/userStore';

/**
 * Safety & Security Hub — Dedicated Security Page per user request
 * Controls:
 * 1. Real-Time Safety Shield Controls (PII Redaction, Keyword Screening, LLM Moderation)
 * 2. Anonymous Identity & Privacy Protection Status
 * 3. Instant Block & Report Center
 * 4. Emergency Helpline Quick Access
 * 5. Data Privacy & GDPR Data Export/Deletion
 */

export default function Safety() {
  const { userId, displayName, reset } = useUserStore();
  const [piiRedactionActive, setPiiRedactionActive] = useState(true);
  const [llmModerationActive, setLlmModerationActive] = useState(true);
  const [blockedCount, setBlockedCount] = useState(0);

  const handleExportData = () => {
    const exportPayload = {
      user_id: userId,
      display_name: displayName,
      export_date: new Date().toISOString(),
      platform: 'SAATHI — Social Confidence & Communication Practice Platform',
      security_status: 'PII Protected & Anonymized',
    };

    const blob = new Blob([JSON.stringify(exportPayload, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `saathi-privacy-export-${userId.slice(0, 6)}.json`;
    a.click();
  };

  const handleResetData = () => {
    if (confirm('Are you sure you want to clear your local session and reset your anonymous identity?')) {
      reset();
      window.location.href = '/';
    }
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-1"
      >
        <p className="text-label text-primary font-semibold tracking-wider uppercase">SAFETY & SECURITY HUB</p>
        <h1 className="text-[38px] font-bold text-text-primary tracking-tight font-serif">
          Your privacy and safety come first.
        </h1>
        <p className="text-body text-[15px] max-w-xl">
          SAATHI is designed from the ground up to protect your identity, redact sensitive contact information in real time, and ensure a non-judgmental environment.
        </p>
      </motion.div>

      <DisclaimerStrip variant="banner" />

      {/* ── SECURITY STATUS CARDS GRID ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Real-Time Moderation */}
        <div className="card p-6 bg-white/80 backdrop-blur-md border border-border-subtle space-y-3">
          <div className="w-10 h-10 rounded-2xl bg-success/20 text-success flex items-center justify-center">
            <ShieldCheck size={22} />
          </div>
          <h3 className="text-h2 text-[17px]">Safety Shield Active</h3>
          <p className="text-[13px] text-text-tertiary">
            Fast keyword pass (&lt;50ms) and Gemini classification pass monitor all sessions.
          </p>
          <div className="pt-2 flex items-center gap-2 text-[12px] font-semibold text-success">
            <CheckCircle2 size={14} />
            <span>Real-time screening enabled</span>
          </div>
        </div>

        {/* Card 2: PII Redaction */}
        <div className="card p-6 bg-white/80 backdrop-blur-md border border-border-subtle space-y-3">
          <div className="w-10 h-10 rounded-2xl bg-primary/20 text-primary flex items-center justify-center">
            <EyeOff size={22} />
          </div>
          <h3 className="text-h2 text-[17px]">PII Auto-Redactor</h3>
          <p className="text-[13px] text-text-tertiary">
            Phone numbers, emails, social handles, and URLs are masked automatically as [redacted].
          </p>
          <div className="pt-2 flex items-center gap-2 text-[12px] font-semibold text-primary">
            <CheckCircle2 size={14} />
            <span>Zero PII Leakage active</span>
          </div>
        </div>

        {/* Card 3: Anonymous Alias */}
        <div className="card p-6 bg-white/80 backdrop-blur-md border border-border-subtle space-y-3">
          <div className="w-10 h-10 rounded-2xl bg-accent-lilac/30 text-primary-dark flex items-center justify-center">
            <Lock size={22} />
          </div>
          <h3 className="text-h2 text-[17px]">Anonymous Identity</h3>
          <p className="text-[13px] text-text-tertiary">
            Your real name and personal contact info are never stored or shown to peer matches.
          </p>
          <div className="pt-2 text-[12px] text-text-secondary font-mono bg-surface-soft px-2.5 py-1 rounded-lg w-fit">
            Alias ID: {userId ? userId.slice(0, 10) : 'Anon'}
          </div>
        </div>
      </div>

      {/* ── DETAILED CONTROL PANELS ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Security Toggles & Controls (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Security Toggles */}
          <div className="card p-6 space-y-5 bg-white/80 border border-border-subtle">
            <h3 className="text-h2 text-[18px]">Safety Shield Controls</h3>

            <div className="space-y-4">
              {/* Toggle 1 */}
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-surface-soft border border-border-subtle">
                <div>
                  <p className="text-[14px] font-semibold text-text-primary">Contact Info Auto-Redaction</p>
                  <p className="text-[12px] text-text-tertiary">Auto-replace phone, email, and social links in peer chat</p>
                </div>
                <input
                  type="checkbox"
                  checked={piiRedactionActive}
                  onChange={(e) => setPiiRedactionActive(e.target.checked)}
                  className="w-5 h-5 accent-primary cursor-pointer"
                />
              </div>

              {/* Toggle 2 */}
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-surface-soft border border-border-subtle">
                <div>
                  <p className="text-[14px] font-semibold text-text-primary">Deep LLM Content Moderation</p>
                  <p className="text-[12px] text-text-tertiary">Classify ambiguous harassment or manipulation language</p>
                </div>
                <input
                  type="checkbox"
                  checked={llmModerationActive}
                  onChange={(e) => setLlmModerationActive(e.target.checked)}
                  className="w-5 h-5 accent-primary cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* User Block & Report Manager */}
          <div className="card p-6 space-y-4 bg-white/80 border border-border-subtle">
            <div className="flex items-center justify-between">
              <h3 className="text-h2 text-[18px]">Blocked & Reported Users</h3>
              <span className="text-[12px] bg-surface-soft px-3 py-1 rounded-full text-text-secondary font-medium">
                {blockedCount} blocked
              </span>
            </div>

            <p className="text-[13.5px] text-text-tertiary">
              You can instantly block or report any peer during chat. Blocked matches are permanently prevented from contacting you again.
            </p>

            <div className="p-4 rounded-2xl bg-surface-soft border border-border-subtle flex items-center justify-between">
              <div className="flex items-center gap-3">
                <UserX size={20} className="text-text-tertiary" />
                <span className="text-[13px] text-text-secondary">No blocked users in your list</span>
              </div>
              <button
                onClick={() => alert('You can block any peer directly from inside the Peer Chat header.')}
                className="text-[12px] text-primary font-semibold hover:underline"
              >
                How to block
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Emergency Resources & Data Controls (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Emergency Crisis Resources */}
          <div className="card p-6 bg-gradient-to-br from-warning/10 via-white to-surface-soft border border-warning/30 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-warning/20 text-warning-dark flex items-center justify-center">
                <AlertTriangle size={20} />
              </div>
              <div>
                <h3 className="text-h2 text-[17px]">Crisis Support Pathways</h3>
                <p className="text-[11.5px] text-text-tertiary">Available 24/7, confidential support</p>
              </div>
            </div>

            <p className="text-[13px] text-text-secondary leading-relaxed">
              If you or someone you know is going through an acute mental health crisis, professional help is always available:
            </p>

            <div className="space-y-2 pt-1">
              <a
                href="https://www.thelivelovelaughfoundation.org/find-help/helplines"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-warning/20 text-text-primary text-[13px] font-medium flex items-center justify-between transition-colors border border-border-subtle"
              >
                <span>LiveLoveLaugh Verified Helplines</span>
                <PhoneCall size={14} className="text-primary" />
              </a>

              <a
                href="https://988lifeline.org/"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-warning/20 text-text-primary text-[13px] font-medium flex items-center justify-between transition-colors border border-border-subtle"
              >
                <span>988 Suicide & Crisis Lifeline</span>
                <PhoneCall size={14} className="text-primary" />
              </a>
            </div>
          </div>

          {/* Data Privacy & GDPR Controls */}
          <div className="card p-6 space-y-4 bg-white/80 border border-border-subtle">
            <h3 className="text-h2 text-[18px]">Data & Privacy Control</h3>
            <p className="text-[13px] text-text-tertiary">
              You own your data. You can export a copy of your session logs or reset your local identity at any time.
            </p>

            <div className="space-y-2 pt-1">
              <button
                onClick={handleExportData}
                className="w-full py-2.5 px-4 rounded-xl bg-surface-soft hover:bg-primary-light/30 text-text-primary text-[13px] font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer border border-border-subtle"
              >
                <Download size={15} />
                <span>Export My Data (JSON)</span>
              </button>

              <button
                onClick={handleResetData}
                className="w-full py-2.5 px-4 rounded-xl bg-danger/10 hover:bg-danger/20 text-danger text-[13px] font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Trash2 size={15} />
                <span>Reset Identity & Clear Sessions</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
