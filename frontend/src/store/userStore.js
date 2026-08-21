import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { nanoid } from 'nanoid';

/**
 * User store — handles login, signup, persistent authentication state,
 * display alias, user goals, and preferences.
 */

const useUserStore = create(
  persist(
    (set, get) => ({
      token: null,
      userId: null,
      email: '',
      displayName: '',
      gender: 'neutral', // 'female' | 'male' | 'neutral'
      goals: [],
      isAuthenticated: false,
      preferences: {
        preferred_format: 'text',
        session_length: 'short',
        goal_tags: [],
        gender: 'neutral',
      },
      onboarded: false,

      ensureUserId: () => {
        let { userId } = get();
        if (!userId) {
          userId = `guest_${nanoid(8)}`;
          set({ userId });
        }
        return userId;
      },

      setGender: (gender) => {
        set({ gender });
      },

      login: async (email, password) => {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.detail || 'Login failed. Please check your credentials.');
        }

        const data = await res.json();
        if (data.access_token) {
          localStorage.setItem('saathi_token', data.access_token);
        }
        set({
          token: data.access_token || null,
          userId: data.user_id,
          email: data.email,
          displayName: data.display_name,
          gender: data.gender || 'neutral',
          goals: data.goals || [],
          isAuthenticated: true,
          onboarded: true,
        });

        return data;
      },

      signup: async (email, password, displayName, goals = [], gender = 'neutral') => {
        const res = await fetch('/api/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email,
            password,
            display_name: displayName,
            goals,
            gender,
          }),
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.detail || 'Registration failed.');
        }

        const data = await res.json();
        if (data.access_token) {
          localStorage.setItem('saathi_token', data.access_token);
        }
        set({
          token: data.access_token || null,
          userId: data.user_id,
          email: data.email,
          displayName: data.display_name,
          gender: data.gender || gender || 'neutral',
          goals: data.goals || [],
          isAuthenticated: true,
          onboarded: true,
        });

        return data;
      },

      logout: () => {
        localStorage.removeItem('saathi_token');
        set({
          token: null,
          userId: null,
          email: '',
          displayName: '',
          goals: [],
          isAuthenticated: false,
          onboarded: false,
        });
        localStorage.removeItem('saathi-user');
      },

      setDisplayName: async (name) => {
        const userId = get().ensureUserId();
        const trimmed = (name || '').trim().slice(0, 32) || 'Friend';
        set({ displayName: trimmed });
        try {
          await fetch('/api/user/identify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: userId, display_name: trimmed }),
          });
        } catch (e) {
          console.warn('Failed to sync display name:', e);
        }
      },

      setPreferences: async (prefs) => {
        const userId = get().ensureUserId();
        const merged = { ...get().preferences, ...prefs };
        set({ preferences: merged });
        try {
          await fetch('/api/user/preferences', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: userId, preferences: merged }),
          });
        } catch (e) {
          console.warn('Failed to sync preferences:', e);
        }
      },

      finishOnboarding: () => set({ onboarded: true }),

      reset: () => {
        set({
          userId: null,
          email: '',
          displayName: '',
          goals: [],
          isAuthenticated: false,
          preferences: {
            preferred_format: 'text',
            session_length: 'short',
            goal_tags: [],
          },
          onboarded: false,
        });
      },
    }),
    {
      name: 'saathi-user',
      partialize: (s) => ({
        token: s.token,
        userId: s.userId,
        email: s.email,
        displayName: s.displayName,
        goals: s.goals,
        isAuthenticated: s.isAuthenticated,
        preferences: s.preferences,
        onboarded: s.onboarded,
      }),
    },
  ),
);

export default useUserStore;