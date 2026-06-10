import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import AuthGateway from './components/AuthGateway';
import TimeTrackingCenter from './components/TimeTrackingCenter';
import WorkplaceCommandCenter from './components/WorkplaceCommandCenter';
import { UserSession } from './types';

export default function App() {
  const [session, setSession] = useState<UserSession | null>(null);
  const [activeTab, setActiveTab] = useState<'tracking' | 'workplace'>('tracking');
  const [soundEnabled, setSoundEnabled] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem('clikko_session');
    if (saved) {
      try {
        setSession(JSON.parse(saved));
      } catch {}
    }
  }, []);

  const handleLogin = (sess: UserSession) => {
    setSession(sess);
    localStorage.setItem('clikko_session', JSON.stringify(sess));
  };

  const handleLogout = () => {
    setSession(null);
    localStorage.removeItem('clikko_session');
  };

  return (
    <div className="min-h-screen bg-slate-950 font-sans">
      <AnimatePresence mode="wait">
        {!session ? (
          <AuthGateway key="auth" onLogin={handleLogin} soundEnabled={soundEnabled} />
        ) : (
          <motion.div
            key="dashboard"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Header */}
            <header className="bg-slate-900/80 border-b border-slate-800 sticky top-0 z-50 backdrop-blur-xl">
              <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-gradient-to-br from-teal-500 to-teal-400 rounded-xl flex items-center justify-center shadow-lg shadow-teal-500/20">
                    <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <circle cx="12" cy="12" r="10"/>
                      <polyline points="12,6 12,12 16,14"/>
                    </svg>
                  </div>
                  <div>
                    <h1 className="text-lg font-black text-white tracking-tight">Clikko</h1>
                    <p className="text-[10px] text-slate-400 font-medium">{session.orgName}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="px-3 py-1.5 bg-slate-800 rounded-lg border border-slate-700">
                    <span className="text-[10px] font-bold text-slate-400">{session.role}</span>
                    <span className="text-xs font-semibold text-white ml-1">{session.name}</span>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
                    title="Logout"
                  >
                    <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>
                    </svg>
                  </button>
                </div>
              </div>

              {/* Tab Navigation */}
              <div className="border-t border-slate-800 px-4">
                <div className="max-w-7xl mx-auto flex gap-1 py-1">
                  <button
                    onClick={() => setActiveTab('tracking')}
                    className={`px-4 py-2.5 text-xs font-bold rounded-lg transition-all ${
                      activeTab === 'tracking'
                        ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    Time Tracking
                  </button>
                  <button
                    onClick={() => setActiveTab('workplace')}
                    className={`px-4 py-2.5 text-xs font-bold rounded-lg transition-all ${
                      activeTab === 'workplace'
                        ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    Workplace Command
                  </button>
                </div>
              </div>
            </header>

            {/* Main Content */}
            <main>
              {activeTab === 'tracking' ? (
                <TimeTrackingCenter session={session} soundEnabled={soundEnabled} />
              ) : (
                <WorkplaceCommandCenter session={session} soundEnabled={soundEnabled} />
              )}
            </main>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
