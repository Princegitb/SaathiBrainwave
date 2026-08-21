import React from 'react';
import { motion } from 'framer-motion';
import { Type, Eye, Volume2, Globe, Shield, RotateCcw } from 'lucide-react';
import useSettingsStore from '../store/settingsStore';
import useUserStore from '../store/userStore';

export default function Settings() {
  const {
    fontSize,
    setFontSize,
    highContrast,
    setHighContrast,
    preferredLanguage,
    setPreferredLanguage,
    voiceRate,
    setVoiceRate,
    autoPlayVoice,
    setAutoPlayVoice,
    resetSettings,
  } = useSettingsStore();

  const { email, displayName, logout } = useUserStore();

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-h1 text-[28px] font-bold text-text-primary">Settings & Accessibility</h1>
        <p className="text-body text-[14.5px] text-text-secondary mt-1">
          Customize font sizes, high-contrast modes, language preferences, and audio playback.
        </p>
      </div>

      {/* ── Section 1: Accessibility (PRD §6 NFR) ── */}
      <div className="card p-6 space-y-6">
        <div className="flex items-center gap-3 border-b border-border-subtle pb-4">
          <div className="w-10 h-10 rounded-xl bg-primary-light flex items-center justify-center text-primary-dark">
            <Eye size={20} />
          </div>
          <div>
            <h2 className="text-h2 text-[17px] font-semibold text-text-primary">Accessibility & Visual Contrast</h2>
            <p className="text-[13px] text-text-tertiary">Adjust typography sizes and high-contrast display</p>
          </div>
        </div>

        {/* Font Size Selector */}
        <div className="space-y-3">
          <label className="text-[14px] font-medium text-text-primary flex items-center gap-2">
            <Type size={16} /> Font Size
          </label>
          <div className="grid grid-cols-3 gap-3">
            {[
              { id: 'normal', label: 'Normal (14px)', size: 'text-[14px]' },
              { id: 'large', label: 'Large (16px)', size: 'text-[16px]' },
              { id: 'xl', label: 'Extra Large (18px)', size: 'text-[18px]' },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setFontSize(item.id)}
                className={`p-3.5 rounded-2xl border text-center transition-all cursor-pointer font-medium ${item.size} ${
                  fontSize === item.id
                    ? 'border-primary bg-primary-light/40 text-primary-dark shadow-sm'
                    : 'border-border-subtle bg-white hover:bg-surface-soft text-text-secondary'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* High Contrast Mode Toggle */}
        <div className="flex items-center justify-between pt-2">
          <div>
            <span className="text-[14.5px] font-medium text-text-primary block">High Contrast Mode</span>
            <span className="text-[12.5px] text-text-tertiary">Increases border contrast and darkens text for enhanced readability</span>
          </div>
          <button
            onClick={() => setHighContrast(!highContrast)}
            className={`w-13 h-7 rounded-full p-1 transition-colors cursor-pointer ${
              highContrast ? 'bg-primary' : 'bg-gray-300'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-white transition-transform ${
                highContrast ? 'translate-x-6' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      {/* ── Section 2: Language & AI Persona ── */}
      <div className="card p-6 space-y-6">
        <div className="flex items-center gap-3 border-b border-border-subtle pb-4">
          <div className="w-10 h-10 rounded-xl bg-accent-lilac/30 flex items-center justify-center text-primary">
            <Globe size={20} />
          </div>
          <div>
            <h2 className="text-h2 text-[17px] font-semibold text-text-primary">Language Preference</h2>
            <p className="text-[13px] text-text-tertiary">Select Sara's primary language code-switching ratio</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {[
            { id: 'hinglish', label: 'Hinglish (Recommended)', desc: 'Natural Indian conversation blend' },
            { id: 'english', label: 'English', desc: 'Mostly English phrasing' },
            { id: 'hindi', label: 'Hindi / Devanagari', desc: 'Hindi priority responses' },
          ].map((lang) => (
            <button
              key={lang.id}
              onClick={() => setPreferredLanguage(lang.id)}
              className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                preferredLanguage === lang.id
                  ? 'border-primary bg-primary-light/30 text-primary-dark shadow-sm'
                  : 'border-border-subtle bg-white hover:bg-surface-soft text-text-secondary'
              }`}
            >
              <div className="text-[14px] font-semibold">{lang.label}</div>
              <div className="text-[12px] text-text-tertiary mt-1">{lang.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* ── Section 3: Audio & Voice Synthesis ── */}
      <div className="card p-6 space-y-6">
        <div className="flex items-center gap-3 border-b border-border-subtle pb-4">
          <div className="w-10 h-10 rounded-xl bg-accent-cream flex items-center justify-center text-accent-warm">
            <Volume2 size={20} />
          </div>
          <div>
            <h2 className="text-h2 text-[17px] font-semibold text-text-primary">Voice & Speech Settings</h2>
            <p className="text-[13px] text-text-tertiary">Adjust Sara's TTS cadence and auto-speech settings</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[14.5px] font-medium text-text-primary">Voice Speech Rate ({voiceRate}x)</span>
            <input
              type="range"
              min="0.8"
              max="1.2"
              step="0.05"
              value={voiceRate}
              onChange={(e) => setVoiceRate(parseFloat(e.target.value))}
              className="w-48 accent-primary cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            <div>
              <span className="text-[14.5px] font-medium text-text-primary block">Auto-play Sara Voice</span>
              <span className="text-[12.5px] text-text-tertiary">Automatically speak Sara's text replies upon arrival</span>
            </div>
            <button
              onClick={() => setAutoPlayVoice(!autoPlayVoice)}
              className={`w-13 h-7 rounded-full p-1 transition-colors cursor-pointer ${
                autoPlayVoice ? 'bg-primary' : 'bg-gray-300'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transition-transform ${
                  autoPlayVoice ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* ── Section 4: Account & Security ── */}
      <div className="card p-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-text-secondary">
            <Shield size={20} />
          </div>
          <div>
            <h2 className="text-[15px] font-semibold text-text-primary">{displayName || 'Signed In User'}</h2>
            <p className="text-[12.5px] text-text-tertiary">{email || 'Logged in via JWT session'}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={resetSettings}
            className="px-4 py-2.5 rounded-xl border border-border-subtle text-text-tertiary hover:bg-surface-soft hover:text-text-primary text-[13px] font-medium transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <RotateCcw size={14} /> Reset Settings
          </button>
          <button
            onClick={logout}
            className="px-5 py-2.5 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 text-[13px] font-semibold transition-colors cursor-pointer"
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
