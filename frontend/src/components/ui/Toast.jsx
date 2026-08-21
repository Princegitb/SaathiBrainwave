import { create } from 'zustand';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { useEffect } from 'react';

/**
 * Lightweight toast system. Components dispatch toasts via useToast(); the
 * <ToastViewport /> renders them in a fixed position. Auto-dismiss after 4s.
 */

const ICONS = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
};

const useToastStore = create((set, get) => ({
  toasts: [],
  add: (toast) => {
    const id = Date.now() + Math.random();
    set({ toasts: [...get().toasts, { id, ...toast }] });
    setTimeout(() => get().dismiss(id), toast.duration || 4000);
    return id;
  },
  dismiss: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
}));

export const useToast = () => useToastStore((s) => s.add);

const colorClass = {
  success: 'bg-success text-white',
  error: 'bg-danger text-white',
  info: 'bg-primary text-white',
};

export function ToastViewport() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-sm">
      <AnimatePresence>
        {toasts.map((t) => {
          const Icon = ICONS[t.type] || Info;
          return (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, x: 20, scale: 0.96 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 20, scale: 0.96 }}
              transition={{ duration: 0.2 }}
              className={`flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-card-lg ${colorClass[t.type] || colorClass.info}`}
              role="status"
            >
              <Icon size={18} className="shrink-0" />
              <span className="text-[14px] font-medium flex-1">{t.message}</span>
              <button
                onClick={() => dismiss(t.id)}
                aria-label="Dismiss notification"
                className="opacity-70 hover:opacity-100 transition-opacity"
              >
                <X size={16} />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}