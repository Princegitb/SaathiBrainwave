import { create } from 'zustand';
import useUserStore from './userStore';

/**
 * Progress store — caches /api/progress and /api/progress/recent for the
 * Dashboard, Progress page, and any other component that needs them.
 */

const useProgressStore = create((set, get) => ({
  summary: null,
  recent: [],
  journey: null,
  loading: false,
  error: null,
  lastFetched: 0,

  fetchAll: async (force = false) => {
    const userId = useUserStore.getState().ensureUserId();
    const token = useUserStore.getState().token;
    if (!userId) return;

    const stale = Date.now() - get().lastFetched > 30_000;
    if (!force && !stale && get().summary) return;

    set({ loading: true, error: null });
    try {
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const [summaryRes, recentRes, journeyRes] = await Promise.all([
        fetch(`/api/progress?user_id=${userId}`, { headers }),
        fetch(`/api/progress/recent?user_id=${userId}&limit=8`, { headers }),
        fetch(`/api/journey?user_id=${userId}`, { headers }),
      ]);

      const summary = summaryRes.ok ? await summaryRes.json() : null;
      const recent = recentRes.ok ? (await recentRes.json()).items || [] : [];
      const journey = journeyRes.ok ? await journeyRes.json() : null;

      set({
        summary,
        recent,
        journey,
        loading: false,
        lastFetched: Date.now(),
        error: null,
      });
    } catch (e) {
      console.warn('Failed to fetch progress:', e);
      set({ loading: false, error: e.message || 'Failed to load progress' });
    }
  },

  invalidate: () => set({ lastFetched: 0 }),
}));

export default useProgressStore;