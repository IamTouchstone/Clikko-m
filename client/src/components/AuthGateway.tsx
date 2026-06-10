import { useState, useEffect, FormEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Building2, Mail, Lock, User, ArrowRight, Sparkles, Copy, Check, ShieldCheck, Info, Inbox } from 'lucide-react';
import { UserSession } from '../types';

const playClick = () => {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 800;
    osc.type = 'sine';
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.1);
  } catch {}
};

interface AuthGatewayProps {
  onLogin: (session: UserSession) => void;
  soundEnabled: boolean;
}

export default function AuthGateway({ onLogin, soundEnabled }: AuthGatewayProps) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [orgKey, setOrgKey] = useState('clikko-corp');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newOrgName, setNewOrgName] = useState('');
  const [newAdminName, setNewAdminName] = useState('');
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [validationError, setValidationError] = useState('');
  const [simulatedEmail, setSimulatedEmail] = useState<{
    to: string;
    orgName: string;
    orgKey: string;
    passwordGenerated: string;
    adminName: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  const handleCopy = (text: string) => {
    if (soundEnabled) playClick();
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLoginSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (soundEnabled) playClick();
    setValidationError('');

    if (!orgKey.trim() || !email.trim() || !password.trim()) {
      setValidationError('Please complete all credential fields.');
      return;
    }

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgKey: orgKey.trim().toLowerCase(), email: email.trim().toLowerCase(), password })
      });

      if (response.ok) {
        const data = await response.json();
        onLogin(data.session);
      } else {
        const err = await response.json();
        setValidationError(err.error || 'Invalid credentials.');
      }
    } catch {
      setValidationError('Server unreachable. Please try again.');
    }
  };

  const handleRegisterSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (soundEnabled) playClick();
    setValidationError('');

    if (!newOrgName.trim() || !newAdminName.trim() || !newAdminEmail.trim()) {
      setValidationError('All registration fields must be provided.');
      return;
    }

    try {
      const response = await fetch('/api/orgs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgName: newOrgName, adminName: newAdminName, adminEmail: newAdminEmail })
      });

      if (response.ok) {
        const data = await response.json();
        setOrgKey(data.orgKey);
        setEmail(newAdminEmail);
        setPassword(data.password);
        setSimulatedEmail({
          to: newAdminEmail,
          orgName: newOrgName,
          orgKey: data.orgKey,
          passwordGenerated: data.password,
          adminName: newAdminName
        });
        setNewOrgName('');
        setNewAdminName('');
        setNewAdminEmail('');
        setIsRegistering(false);
      } else {
        const err = await response.json();
        setValidationError(err.error || 'Registration failed.');
      }
    } catch {
      setValidationError('Server unreachable. Please try again.');
    }
  };

  const autoFillRole = (role: 'super' | 'subadmin' | 'staff') => {
    if (soundEnabled) playClick();
    setOrgKey('clikko-corp');
    if (role === 'super') { setEmail('admin@clikko.com'); setPassword('admin'); }
    else if (role === 'subadmin') { setEmail('subadmin@clikko.com'); setPassword('subadmin'); }
    else { setEmail('staff@clikko.com'); setPassword('staff'); }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute top-[-25%] left-[-20%] w-[60%] h-[60%] bg-teal-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-sky-500/5 rounded-full blur-[100px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 relative z-10 shadow-2xl space-y-6"
      >
        {/* Brand */}
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <div className="w-12 h-12 bg-gradient-to-tr from-teal-500 to-teal-400 rounded-2xl flex items-center justify-center shadow-lg shadow-teal-500/25">
              <svg className="w-7 h-7 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12,6 12,12 16,14"/>
              </svg>
            </div>
          </div>
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight flex items-center justify-center gap-2">
              Clikko
              <span className="text-[10px] bg-teal-500/15 text-teal-400 px-2 py-0.5 rounded-full font-bold">v1.3</span>
            </h1>
            <p className="text-xs text-slate-400 font-medium">Enterprise Time Tracking & Workplace Command</p>
          </div>
        </div>

        {/* Info */}
        <div className="bg-slate-800/40 border border-slate-700 rounded-2xl px-4 py-3 text-[11px] text-slate-400 flex gap-2.5 items-start">
          <Info size={16} className="text-teal-400 shrink-0 mt-0.5" />
          <span>
            <strong className="text-slate-200">Notice:</strong> Only organizations can register. Creating an organization activates your Super Admin account.
          </span>
        </div>

        {validationError && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-3.5 bg-rose-500/10 border border-rose-500/20 text-xs font-bold text-rose-400 rounded-2xl flex items-center gap-2"
          >
            <div className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-pulse" />
            <span>{validationError}</span>
          </motion.div>
        )}

        <AnimatePresence mode="wait">
          {!isRegistering ? (
            <motion.form
              key="login"
              initial={{ opacity: 0, x: -15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 15 }}
              onSubmit={handleLoginSubmit}
              className="space-y-4"
            >
              <div className="space-y-1">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Organization ID / Key</label>
                <div className="relative">
                  <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={15} />
                  <input
                    type="text"
                    value={orgKey}
                    onChange={e => setOrgKey(e.target.value)}
                    placeholder="e.g. clikko-corp"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-teal-500 rounded-xl py-3 pl-10 pr-4 text-xs font-medium text-white transition-all outline-none"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={15} />
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="name@company.com"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-teal-500 rounded-xl py-3 pl-10 pr-4 text-xs font-medium text-white transition-all outline-none"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={15} />
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-teal-500 rounded-xl py-3 pl-10 pr-4 text-xs font-medium text-white transition-all outline-none"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold py-3.5 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 text-xs shadow-lg shadow-teal-500/10"
              >
                <span>Unlock Secure Terminal</span>
                <ArrowRight size={14} />
              </button>

              {/* Demo accounts */}
              <div className="space-y-2 pt-3 border-t border-slate-800/60">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Quick Testing Accounts</span>
                  <span className="text-[8px] font-semibold text-slate-400 px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700">Pre-seeded</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {['super', 'subadmin', 'staff'].map(role => (
                    <button
                      key={role}
                      type="button"
                      onClick={() => autoFillRole(role as any)}
                      className="py-2 px-1 rounded-lg border border-slate-800 hover:border-slate-700 bg-slate-950 hover:bg-slate-900 text-[10px] font-bold text-teal-400 text-center transition-all cursor-pointer"
                    >
                      {role === 'super' ? 'Super Admin' : role === 'subadmin' ? 'Sub-Admin' : 'Staff'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => { if (soundEnabled) playClick(); setIsRegistering(true); }}
                  className="text-xs font-bold text-teal-400 hover:text-teal-300 transition-colors"
                >
                  Create New Organization Account
                </button>
              </div>
            </motion.form>
          ) : (
            <motion.form
              key="register"
              initial={{ opacity: 0, x: 15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -15 }}
              onSubmit={handleRegisterSubmit}
              className="space-y-4"
            >
              <div className="space-y-1">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Organization Name</label>
                <div className="relative">
                  <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={15} />
                  <input
                    type="text"
                    value={newOrgName}
                    onChange={e => setNewOrgName(e.target.value)}
                    placeholder="e.g. Starlight Tech"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-teal-500 rounded-xl py-3 pl-10 pr-4 text-xs font-medium text-white transition-all outline-none"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Super Admin Name</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={15} />
                  <input
                    type="text"
                    value={newAdminName}
                    onChange={e => setNewAdminName(e.target.value)}
                    placeholder="e.g. Bernie"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-teal-500 rounded-xl py-3 pl-10 pr-4 text-xs font-medium text-white transition-all outline-none"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Admin Email</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={15} />
                  <input
                    type="email"
                    value={newAdminEmail}
                    onChange={e => setNewAdminEmail(e.target.value)}
                    placeholder="admin@company.com"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-teal-500 rounded-xl py-3 pl-10 pr-4 text-xs font-medium text-white transition-all outline-none"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold py-3.5 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 text-xs shadow-lg shadow-teal-500/10"
              >
                <span>Register & Create Account</span>
                <Sparkles size={14} />
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => { if (soundEnabled) playClick(); setIsRegistering(false); }}
                  className="text-xs font-bold text-slate-400 hover:text-white transition-colors"
                >
                  Already have an organization? Sign In
                </button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Simulated Email Modal */}
      <AnimatePresence>
        {simulatedEmail && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl"
            >
              {/* Header */}
              <div className="bg-slate-950 px-5 py-4 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-rose-500" />
                  <div className="w-3 h-3 rounded-full bg-amber-500" />
                  <div className="w-3 h-3 rounded-full bg-teal-500" />
                </div>
                <span className="text-[10px] font-mono font-bold text-slate-400 flex items-center gap-1.5 uppercase tracking-widest">
                  <Inbox size={12} className="text-teal-400 animate-pulse" />
                  Secure SMTP Mail Queue
                </span>
                <div className="w-6" />
              </div>

              {/* Email Content */}
              <div className="p-6 space-y-4">
                <div className="space-y-1.5 border-b border-slate-800/80 pb-3">
                  <span className="block text-[10px] uppercase font-bold text-slate-500">From</span>
                  <span className="text-xs font-semibold text-teal-400">no-reply@clikko.com</span>
                </div>

                <div className="space-y-1.5 border-b border-slate-800/80 pb-3">
                  <span className="block text-[10px] uppercase font-bold text-slate-500">To</span>
                  <span className="text-xs font-semibold text-white">{simulatedEmail.to}</span>
                </div>

                <div className="space-y-1.5 border-b border-slate-800/80 pb-3">
                  <span className="block text-[10px] uppercase font-bold text-slate-500">Subject</span>
                  <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                    <Sparkles size={13} fill="currentColor" />
                    CLIKKO Organization Key & Super Admin Activated!
                  </span>
                </div>

                <div className="bg-slate-950/80 border border-slate-800 py-4 px-5 rounded-2xl space-y-3 font-mono text-[11px] leading-relaxed text-slate-300">
                  <p>Dear {simulatedEmail.adminName},</p>
                  <p>Your enterprise organization has been registered. Here are your credentials:</p>

                  <div className="p-3 bg-slate-900 border border-slate-700 rounded-xl space-y-1.5 text-xs text-white">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Org Key:</span>
                      <span className="font-bold text-teal-400">{simulatedEmail.orgKey}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Email:</span>
                      <span className="font-bold text-slate-200">{simulatedEmail.to}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Password:</span>
                      <span className="font-bold text-amber-400">{simulatedEmail.passwordGenerated}</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="grid grid-cols-2 gap-3.5 pt-2">
                  <button
                    onClick={() => handleCopy(`${simulatedEmail.orgKey} | ${simulatedEmail.to} | ${simulatedEmail.passwordGenerated}`)}
                    className="py-3 px-4 rounded-xl border border-slate-800 hover:border-slate-700 text-slate-300 font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {copied ? <Check size={14} className="text-teal-400" /> : <Copy size={14} />}
                    <span>{copied ? 'Copied!' : 'Copy Credentials'}</span>
                  </button>

                  <button
                    onClick={() => {
                      if (soundEnabled) playClick();
                      onLogin({
                        userId: 'super-admin',
                        name: simulatedEmail.adminName,
                        email: simulatedEmail.to,
                        role: 'SuperAdmin',
                        orgId: simulatedEmail.orgKey,
                        orgName: simulatedEmail.orgName
                      });
                      setSimulatedEmail(null);
                    }}
                    className="py-3 px-4 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-teal-500/15"
                  >
                    <ShieldCheck size={14} />
                    <span>Quick Login</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
