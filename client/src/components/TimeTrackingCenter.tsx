import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Pause, RotateCcw, Plus, Trash2, Clock, Save, Wifi, WifiOff, History, Timer } from 'lucide-react';
import { UserSession, TimeEntry } from '../types';

const playClick = () => {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 600;
    osc.type = 'sine';
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.08);
  } catch {}
};

interface TimeTrackingCenterProps {
  session: UserSession;
  soundEnabled: boolean;
}

const STORAGE_KEY = 'clikko_time_entries';

export default function TimeTrackingCenter({ session, soundEnabled }: TimeTrackingCenterProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [category, setCategory] = useState('Work');
  const [notes, setNotes] = useState('');
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [customCategory, setCustomCategory] = useState('');
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [categories, setCategories] = useState(['Work', 'Meeting', 'Break', 'Research']);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<Date | null>(null);

  // Load entries from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setEntries(JSON.parse(saved));
      } catch {}
    }
  }, []);

  // Online/offline detection
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Timer logic
  useEffect(() => {
    if (isRunning) {
      startTimeRef.current = new Date(Date.now() - elapsed * 1000);
      intervalRef.current = setInterval(() => {
        if (startTimeRef.current) {
          const now = new Date();
          setElapsed(Math.floor((now.getTime() - startTimeRef.current.getTime()) / 1000));
        }
      }, 100);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning]);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleStart = () => {
    if (soundEnabled) playClick();
    setIsRunning(true);
  };

  const handlePause = () => {
    if (soundEnabled) playClick();
    setIsRunning(false);
  };

  const handleReset = () => {
    if (soundEnabled) playClick();
    setIsRunning(false);
    setElapsed(0);
    setNotes('');
  };

  const handleSave = useCallback(async () => {
    if (soundEnabled) playClick();
    if (elapsed === 0) return;

    const newEntry: TimeEntry = {
      id: `entry-${Date.now()}`,
      userId: session.userId,
      orgId: session.orgId,
      categoryName: category,
      durationSeconds: elapsed,
      notes: notes.trim() || undefined,
      startTime: new Date(Date.now() - elapsed * 1000).toISOString()
    };

    const updatedEntries = [newEntry, ...entries];
    setEntries(updatedEntries);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedEntries));

    // Try sync to backend
    if (isOnline) {
      try {
        await fetch('/api/sync/entries', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: session.userId, orgId: session.orgId, entries: updatedEntries })
        });
      } catch {
        // Offline fallback already saved locally
      }
    }

    setIsRunning(false);
    setElapsed(0);
    setNotes('');
  }, [elapsed, category, notes, entries, session, soundEnabled, isOnline]);

  const handleDelete = (id: string) => {
    if (soundEnabled) playClick();
    const updated = entries.filter(e => e.id !== id);
    setEntries(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const handleAddCategory = () => {
    if (customCategory.trim()) {
      setCategories(prev => [...prev, customCategory.trim()]);
      setCategory(customCategory.trim());
      setCustomCategory('');
      setShowNewCategory(false);
    }
  };

  const totalToday = entries
    .filter(e => new Date(e.startTime).toDateString() === new Date().toDateString())
    .reduce((sum, e) => sum + e.durationSeconds, 0);

  return (
    <div className="max-w-5xl mx-auto p-4 space-y-6">
      {/* Status Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isOnline ? (
            <div className="flex items-center gap-1.5 text-xs text-teal-400">
              <Wifi size={14} />
              <span>Online</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-xs text-amber-400">
              <WifiOff size={14} />
              <span>Offline Mode</span>
            </div>
          )}
        </div>
        <div className="text-xs text-slate-400">
          Today: <span className="text-white font-bold">{formatTime(totalToday)}</span>
        </div>
      </div>

      {/* Timer Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl"
      >
        {/* Category Selection */}
        <div className="mb-6">
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Category</label>
          <div className="flex flex-wrap gap-2">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => { if (soundEnabled) playClick(); setCategory(cat); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  category === cat
                    ? 'bg-teal-500/20 text-teal-400 border border-teal-500/30'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {cat}
              </button>
            ))}
            <button
              onClick={() => setShowNewCategory(!showNewCategory)}
              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-800 text-slate-400 hover:text-white transition-all"
            >
              <Plus size={14} />
            </button>
          </div>
          {showNewCategory && (
            <div className="mt-3 flex gap-2">
              <input
                type="text"
                value={customCategory}
                onChange={e => setCustomCategory(e.target.value)}
                placeholder="New category..."
                className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-teal-500"
              />
              <button
                onClick={handleAddCategory}
                className="px-4 py-2 bg-teal-500 text-slate-950 rounded-lg text-xs font-bold"
              >
                Add
              </button>
            </div>
          )}
        </div>

        {/* Timer Display */}
        <div className="text-center py-8">
          <div className="relative inline-block">
            {isRunning && (
              <div className="absolute inset-0 bg-teal-500/20 rounded-full animate-pulse-ring" />
            )}
            <div className={`relative w-48 h-48 rounded-full border-4 flex items-center justify-center ${
              isRunning ? 'border-teal-500' : 'border-slate-700'
            }`}>
              <div className="text-center">
                <div className={`font-mono text-5xl font-black tracking-tight ${
                  isRunning ? 'text-teal-400' : 'text-white'
                }`}>
                  {formatTime(elapsed)}
                </div>
                <div className="text-xs text-slate-500 mt-1 uppercase tracking-wider">{category}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Notes Input */}
        <div className="mb-6">
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Notes (Optional)</label>
          <input
            type="text"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="What are you working on?"
            className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-xs text-white outline-none focus:border-teal-500"
          />
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-4">
          {!isRunning ? (
            <button
              onClick={handleStart}
              className="w-16 h-16 rounded-full bg-teal-500 hover:bg-teal-400 text-slate-950 flex items-center justify-center transition-all shadow-lg shadow-teal-500/25"
            >
              <Play size={28} fill="currentColor" />
            </button>
          ) : (
            <button
              onClick={handlePause}
              className="w-16 h-16 rounded-full bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center justify-center transition-all shadow-lg shadow-amber-500/25"
            >
              <Pause size={28} fill="currentColor" />
            </button>
          )}

          <button
            onClick={handleReset}
            className="w-12 h-12 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 flex items-center justify-center transition-all"
          >
            <RotateCcw size={20} />
          </button>

          <button
            onClick={handleSave}
            disabled={elapsed === 0}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
              elapsed > 0
                ? 'bg-green-500 hover:bg-green-400 text-slate-950'
                : 'bg-slate-800 text-slate-600 cursor-not-allowed'
            }`}
          >
            <Save size={20} />
          </button>
        </div>
      </motion.div>

      {/* History */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-slate-900 border border-slate-800 rounded-3xl p-6"
      >
        <div className="flex items-center gap-2 mb-4">
          <History size={18} className="text-teal-400" />
          <h2 className="text-lg font-bold text-white">Tracking History</h2>
          <span className="text-xs text-slate-400 ml-auto">{entries.length} entries</span>
        </div>

        {entries.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <Timer size={48} className="mx-auto mb-4 opacity-50" />
            <p className="text-sm">No time entries yet</p>
            <p className="text-xs mt-1">Start the timer and save your first entry</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {entries.map((entry, idx) => (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.03 }}
                className="flex items-center gap-4 p-3 bg-slate-800/50 rounded-xl border border-slate-700/50"
              >
                <div className="w-10 h-10 rounded-lg bg-slate-700 flex items-center justify-center">
                  <Clock size={18} className="text-teal-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white">{entry.categoryName}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-700 text-slate-400">
                      {formatTime(entry.durationSeconds)}
                    </span>
                  </div>
                  {entry.notes && (
                    <p className="text-xs text-slate-400 truncate mt-0.5">{entry.notes}</p>
                  )}
                  <p className="text-[10px] text-slate-500 mt-1">
                    {new Date(entry.startTime).toLocaleString()}
                  </p>
                </div>
                <button
                  onClick={() => handleDelete(entry.id)}
                  className="p-2 hover:bg-slate-700 rounded-lg transition-colors text-slate-400 hover:text-rose-400"
                >
                  <Trash2 size={16} />
                </button>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}
