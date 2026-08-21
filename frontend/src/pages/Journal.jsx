import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Plus, Sparkles, Calendar, Trash2, BrainCircuit, Loader2 } from 'lucide-react';
import DisclaimerStrip from '../components/ui/DisclaimerStrip';

/**
 * Journal — Daily Reflection & Confidence Log Page
 * Allows users to record small wins, daily reflections, and post-practice thoughts.
 * Saved locally so it persists across sessions.
 */

export default function Journal() {
  const [entries, setEntries] = useState(() => {
    const saved = localStorage.getItem('saathi-journal-entries');
    return saved ? JSON.parse(saved) : [
      {
        id: '1',
        title: 'Completed my first Job Interview roleplay!',
        content: 'I felt a bit nervous at first, but taking a breath before answering helped me speak at a moderate pace.',
        tag: 'Milestone',
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      },
    ];
  });

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tag, setTag] = useState('Daily Reflection');
  const [sentimentPreview, setSentimentPreview] = useState(null);
  const [sentimentLoading, setSentimentLoading] = useState(false);

  useEffect(() => {
    localStorage.setItem('saathi-journal-entries', JSON.stringify(entries));
  }, [entries]);

  const handleAddEntry = async (e) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    setSentimentLoading(true);
    let sentiment = null;
    try {
      const res = await fetch('/api/sentiment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: `${title.trim()}. ${content.trim()}`, source: 'journal' }),
      });
      if (res.ok) sentiment = await res.json();
    } catch (error) {
      console.warn('SaraSense unavailable:', error);
    }

    const newEntry = {
      id: Date.now().toString(),
      title: title.trim(),
      content: content.trim(),
      tag,
      sentiment,
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    };

    setEntries([newEntry, ...entries]);
    setSentimentPreview(sentiment);
    setTitle('');
    setContent('');
    setSentimentLoading(false);
  };

  const handleDelete = (id) => {
    setEntries(entries.filter(e => e.id !== id));
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-1"
      >
        <p className="text-label text-primary font-semibold tracking-wider uppercase">REFLECTION JOURNAL</p>
        <h1 className="text-[38px] font-bold text-text-primary tracking-tight font-serif">
          Your quiet space to reflect.
        </h1>
        <p className="text-body text-[15px] max-w-xl">
          Write down small wins, daily thoughts, or key takeaways after a practice session.
        </p>
      </motion.div>

      <DisclaimerStrip variant="banner" />

      {sentimentPreview && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="card p-5 bg-white/75 border border-border-subtle flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary-light/40 text-primary flex items-center justify-center">
              <BrainCircuit size={20} />
            </div>
            <div>
              <p className="text-[12px] uppercase tracking-wider font-semibold text-primary">SaraSense · emotional signal</p>
              <p className="text-[15px] font-semibold text-text-primary capitalize">{sentimentPreview.emotion} · {sentimentPreview.sentiment}</p>
              <p className="text-[12px] text-text-secondary mt-0.5">{sentimentPreview.summary}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-[12px] text-text-tertiary">Signal intensity</div>
              <div className="text-[20px] font-bold text-primary">{sentimentPreview.intensity}%</div>
            </div>
            <button type="button" onClick={() => setSentimentPreview(null)} className="text-[12px] px-3 py-2 rounded-xl border border-border-subtle text-text-secondary hover:bg-white">Dismiss</button>
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: New Entry Form (5 cols) */}
        <div className="lg:col-span-5">
          <form onSubmit={handleAddEntry} className="card p-6 space-y-4 bg-white/80 border border-border-subtle shadow-card">
            <h3 className="text-h2 text-[18px]">New Reflection</h3>

            <div>
              <label className="text-[12px] font-semibold text-text-secondary uppercase">Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Practiced speaking out loud today"
                className="w-full mt-1 p-3 rounded-xl bg-surface-soft border border-border-subtle text-[14px] text-text-primary outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="text-[12px] font-semibold text-text-secondary uppercase">Tag</label>
              <select
                value={tag}
                onChange={(e) => setTag(e.target.value)}
                className="w-full mt-1 p-3 rounded-xl bg-surface-soft border border-border-subtle text-[14px] text-text-primary outline-none"
              >
                <option value="Daily Reflection">Daily Reflection</option>
                <option value="Milestone">Milestone</option>
                <option value="Practice Notes">Practice Notes</option>
                <option value="Small Win">Small Win</option>
              </select>
            </div>

            <div>
              <label className="text-[12px] font-semibold text-text-secondary uppercase">Your Thoughts</label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="How did you feel during practice today? What went well?"
                rows={4}
                className="w-full mt-1 p-3 rounded-xl bg-surface-soft border border-border-subtle text-[14px] text-text-primary outline-none focus:border-primary resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={!title.trim() || !content.trim()}
              className="w-full py-3 px-4 rounded-xl bg-primary text-white text-[14px] font-medium flex items-center justify-center gap-2 hover:bg-primary-dark transition-colors disabled:opacity-50 cursor-pointer shadow-card"
            >
              {sentimentLoading ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
              <span>{sentimentLoading ? 'Reading your reflection…' : 'Save Entry'}</span>
            </button>
          </form>
        </div>

        {/* Right: Saved Journal Entries List (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <h3 className="text-h2 text-[18px]">Past Entries ({entries.length})</h3>

          {entries.length === 0 ? (
            <div className="card p-8 text-center text-text-tertiary">
              <BookOpen size={32} className="mx-auto mb-2 opacity-50" />
              <p>No journal entries yet. Write your first reflection above!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {entries.map((entry) => (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="card p-6 bg-white/80 border border-border-subtle space-y-3 relative group"
                >
                  <div className="flex items-center justify-between">
                    <span className="px-3 py-1 rounded-full text-[11px] font-medium bg-primary-light/30 text-primary-dark">
                      {entry.tag}
                    </span>
                    <div className="flex items-center gap-3 text-[12px] text-text-tertiary">
                      <span className="flex items-center gap-1">
                        <Calendar size={12} />
                        {entry.date}
                      </span>
                      <button
                        onClick={() => handleDelete(entry.id)}
                        className="text-text-tertiary hover:text-danger opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Delete Entry"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  <h4 className="text-[16px] font-bold text-text-primary">{entry.title}</h4>
                  <p className="text-[14px] text-text-secondary leading-relaxed whitespace-pre-wrap">
                    {entry.content}
                  </p>
                  {entry.sentiment?.emotion && (
                    <div className="flex items-center justify-between gap-3 pt-2">
                      <div className="inline-flex items-center gap-2 rounded-full bg-primary-light/25 border border-primary/10 px-3 py-1.5 text-[11px] text-primary-dark">
                        <BrainCircuit size={13} />
                        <span className="capitalize">{entry.sentiment.emotion}</span>
                        <span className="text-text-tertiary">· {entry.sentiment.intensity}% signal</span>
                      </div>
                      <span className="text-[10px] text-text-tertiary">Not a diagnosis</span>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}