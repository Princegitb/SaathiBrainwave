import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Accessibility & User Preferences Store — PRD §6 NFR compliance
 * Manages font sizing, high contrast accessibility mode, default language ratio,
 * and voice synthesis rate.
 */
const useSettingsStore = create(
  persist(
    (set) => ({
      fontSize: 'normal', // 'normal' | 'large' | 'xl'
      highContrast: false,
      preferredLanguage: 'hinglish', // 'hinglish' | 'english' | 'hindi'
      voiceRate: 1.0,
      autoPlayVoice: false,

      setFontSize: (size) => set({ fontSize: size }),
      setHighContrast: (enabled) => set({ highContrast: enabled }),
      setPreferredLanguage: (lang) => set({ preferredLanguage: lang }),
      setVoiceRate: (rate) => set({ voiceRate: rate }),
      setAutoPlayVoice: (enabled) => set({ autoPlayVoice: enabled }),
      resetSettings: () =>
        set({
          fontSize: 'normal',
          highContrast: false,
          preferredLanguage: 'hinglish',
          voiceRate: 1.0,
          autoPlayVoice: false,
        }),
    }),
    {
      name: 'saathi-settings',
    }
  )
);

export default useSettingsStore;
