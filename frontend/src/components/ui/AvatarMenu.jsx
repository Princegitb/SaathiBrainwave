import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Edit3, RotateCcw, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import useUserStore from '../../store/userStore';

/**
 * AvatarMenu — the profile badge in the AppLayout. Opens a dropdown with
 * the user's name, edit/reset/about options.
 */
export default function AvatarMenu() {
  const navigate = useNavigate();
  const { displayName, reset, setDisplayName } = useUserStore();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(displayName);
  const ref = useRef(null);

  const initial = (displayName || 'F')[0].toUpperCase();

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    setName(displayName);
  }, [displayName]);

  const handleSaveName = async () => {
    await setDisplayName(name);
    setEditing(false);
  };

  const handleReset = () => {
    if (confirm('This will clear your local data and start fresh. Continue?')) {
      reset();
      window.location.href = '/';
    }
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Open profile menu"
        className="w-9 h-9 rounded-full bg-primary-light flex items-center justify-center hover:ring-2 hover:ring-primary/40 transition-all"
      >
        <span className="text-[13px] font-bold text-primary-dark">{initial}</span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-12 w-72 bg-white rounded-2xl shadow-card-lg p-4 z-50 border border-border-subtle"
          >
            <div className="flex items-center gap-3 pb-3 border-b border-border-subtle">
              <div className="w-10 h-10 rounded-full bg-primary-light flex items-center justify-center">
                <span className="text-[15px] font-bold text-primary-dark">{initial}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-semibold text-text-primary truncate">
                  {displayName || 'Friend'}
                </p>
                <p className="text-[12px] text-text-tertiary">SAATHI member</p>
              </div>
            </div>

            {editing ? (
              <div className="mt-3">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
                  placeholder="Display name"
                  className="w-full px-3 py-2 rounded-xl bg-surface-soft text-[14px] text-text-primary outline-none focus:ring-2 focus:ring-primary/30"
                  autoFocus
                />
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={handleSaveName}
                    className="flex-1 px-3 py-1.5 bg-primary text-white rounded-lg text-[13px] font-medium hover:bg-primary-dark transition-colors"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => {
                      setEditing(false);
                      setName(displayName);
                    }}
                    className="flex-1 px-3 py-1.5 bg-surface-soft text-text-secondary rounded-lg text-[13px] hover:bg-border-subtle transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-2 space-y-1">
                <button
                  onClick={() => setEditing(true)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[14px] text-text-secondary hover:bg-surface-soft transition-colors"
                >
                  <Edit3 size={15} />
                  Edit name
                </button>
                <button
                  onClick={() => {
                    setOpen(false);
                    navigate('/journey');
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[14px] text-text-secondary hover:bg-surface-soft transition-colors"
                >
                  <User size={15} />
                  Your journey
                </button>
                <button
                  onClick={() => {
                    setOpen(false);
                    navigate('/progress');
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[14px] text-text-secondary hover:bg-surface-soft transition-colors"
                >
                  <Info size={15} />
                  Your progress
                </button>
                <button
                  onClick={() => {
                    useUserStore.getState().logout();
                    window.location.href = '/login';
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[14px] text-danger hover:bg-danger/10 transition-colors"
                >
                  <RotateCcw size={15} />
                  Log Out
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}