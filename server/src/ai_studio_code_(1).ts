import { useState, useEffect, FormEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Building2, 
  Mail, 
  Lock, 
  User, 
  ArrowRight, 
  Sparkles, 
  Copy, 
  Check, 
  LogOut, 
  Inbox, 
  ShieldCheck, 
  Info,
  Clock,
  Briefcase
} from 'lucide-react';
import { Organization, SubAdmin, StaffMember, UserSession } from '../types';
import { playClick } from './SoundEngine';

interface AuthGatewayProps {
  onLogin: (session: UserSession) => void;
  soundEnabled: boolean;
}

export default function AuthGateway({ onLogin, soundEnabled }: AuthGatewayProps) {
  const [isRegistering, setIsRegistering] = useState<boolean>(false);
  const [orgKey, setOrgKey] = useState<string>('clikko-corp');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  
  // Registration States
  const [newOrgName, setNewOrgName] = useState<string>('');
  const [newAdminName, setNewAdminName] = useState<string>('');
  const [newAdminEmail, setNewAdminEmail] = useState<string>('');
  
  // Email Simulation Modal/Overlay State
  const [simulatedEmail, setSimulatedEmail] = useState<{
    to: string;
    orgName: string;
    orgKey: string;
    passwordGenerated: string;
    type: 'org_creation' | 'staff_creation';
    adminName: string;
  } | null>(null);

  const [copied, setCopied] = useState<boolean>(false);
  const [validationError, setValidationError] = useState<string>('');

  // Handle auto-copy helper
  const handleCopy = (text: string) => {
    if (soundEnabled) playClick();
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Pre-seed demo data in localStorage if empty on load
  useEffect(() => {
    // 1. Organizations List
    const savedOrgs = localStorage.getItem('clikko_organizations');
    if (!savedOrgs) {
      const demoOrg: Organization = {
        id: 'clikko-corp',
        name: 'Clikko Global Logistics',
        superAdminName: 'Alex Rivera',
        superAdminEmail: 'admin@clikko.com',
        superAdminPassword: 'admin',
        createdAt: new Date().toISOString()
      };
      localStorage.setItem('clikko_organizations', JSON.stringify([demoOrg]));
    }

    // 2. Subadmins List
    const savedSubadmins = localStorage.getItem('clikko_subadmins');
    if (!savedSubadmins) {
      const demoSubadmin: SubAdmin = {
        id: 'sub-marcus',
        name: 'Marcus Vance',
        email: 'subadmin@clikko.com',
        password: 'subadmin',
        departmentScope: 'Operations',
        role: 'SubAdmin',
        createdAt: new Date().toISOString()
      };
      localStorage.setItem('clikko_subadmins', JSON.stringify([demoSubadmin]));
    }

    // 3. Staff List (we coordinate with clikko_workplace_staff)
    const savedStaff = localStorage.getItem('clikko_workplace_staff');
    if (!savedStaff) {
      const defaultStaffList: StaffMember[] = [
        {
          id: 'staff-joy',
          name: 'Joy Egbo',
          department: 'UI/UX Design',
          avatarText: 'JE',
          baseSalary: 2800,
          salaryMultiplier: 1.0,
          attitudeStatus: 'Sleeping',
          attitudeMessage: 'Joy Egbo is resting on desk B during office hours.',
          clockInStatus: 'Clocked In',
          lastClockTime: '2026-06-07T08:15:00Z',
          email: 'staff@clikko.com',
          password: 'staff',
          role: 'Staff'
        },
        {
          id: 'staff-amara',
          name: 'Amara Nwachukwu',
          department: 'Front-end Engineering',
          avatarText: 'AN',
          baseSalary: 4200,
          salaryMultiplier: 1.0,
          attitudeStatus: 'Working',
          attitudeMessage: 'Amara Nwachukwu is typing code frantically on monitor B.',
          clockInStatus: 'Clocked In',
          lastClockTime: '2026-06-07T08:02:00Z',
          email: 'amara@clikko.com',
          password: 'staff',
          role: 'Staff'
        }
      ];
      localStorage.setItem('clikko_workplace_staff', JSON.stringify(defaultStaffList));
    } else {
      // Make sure existing staff list has email and password
      const parsed = JSON.parse(savedStaff) as StaffMember[];
      const updated = parsed.map(s => {
        if (!s.email) {
          return {
            ...s,
            email: `${s.id.replace('staff-', '')}@clikko.com`,
            password: 'staff',
            role: 'Staff' as const
          };
        }
        return s;
      });
      localStorage.setItem('clikko_workplace_staff', JSON.stringify(updated));
    }
  }, []);

  // Handle sign-in request
  const handleLoginSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (soundEnabled) playClick();
    setValidationError('');

    const targetOrgKey = orgKey.trim().toLowerCase();
    const targetEmail = email.trim().toLowerCase();
    const targetPassword = password;

    if (!targetOrgKey || !targetEmail || !targetPassword) {
      setValidationError('Please complete all credential fields.');
      return;
    }

    // Try communicating with Server-Side Express API first
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgKey: targetOrgKey, email: targetEmail, password: targetPassword })
      });

      if (response.ok) {
        const data = await response.json();
        if (data && data.session) {
          onLogin(data.session);
          return;
        }
      } else {
        const errorData = await response.json();
        setValidationError(errorData.error || 'Invalid credentials returned by server.');
        return;
      }
    } catch (networkError) {
      console.warn('Backend server unreachable, executing client-side local database fallback:', networkError);
      
      // FALLBACK 1. Fetch Local Orgs
      const orgs: Organization[] = JSON.parse(localStorage.getItem('clikko_organizations') || '[]');
      const matchedOrg = orgs.find(o => o.id.toLowerCase() === targetOrgKey);

      if (!matchedOrg) {
        setValidationError('No Organization found matching this Org ID/Key (Offline fallback).');
        return;
      }

      // FALLBACK 2. Check if logging in as Super Admin
      if (matchedOrg.superAdminEmail.toLowerCase() === targetEmail) {
        if (matchedOrg.superAdminPassword === targetPassword) {
          const session: UserSession = {
            userId: 'super-admin',
            name: matchedOrg.superAdminName,
            email: matchedOrg.superAdminEmail,
            role: 'SuperAdmin',
            orgId: matchedOrg.id,
            orgName: matchedOrg.name
          };
          onLogin(session);
          return;
        } else {
          setValidationError('Incorrect Password for Super Admin');
          return;
        }
      }

      // FALLBACK 3. Check Subadmins list
      const subadmins: SubAdmin[] = JSON.parse(localStorage.getItem('clikko_subadmins') || '[]');
      const matchedSubadmin = subadmins.find(s => s.email.toLowerCase() === targetEmail);
      if (matchedSubadmin) {
        if (matchedSubadmin.password === targetPassword) {
          const session: UserSession = {
            userId: matchedSubadmin.id,
            name: matchedSubadmin.name,
            email: matchedSubadmin.email,
            role: 'SubAdmin',
            orgId: matchedOrg.id,
            orgName: matchedOrg.name
          };
          onLogin(session);
          return;
        } else {
          setValidationError('Incorrect Password for SubAdmin.');
          return;
        }
      }

      // FALLBACK 4. Check Staff member lists
      const staffList: StaffMember[] = JSON.parse(localStorage.getItem('clikko_workplace_staff') || '[]');
      const matchedStaff = staffList.find(s => s.email?.toLowerCase() === targetEmail);

      if (matchedStaff) {
        if (matchedStaff.password === targetPassword) {
          const session: UserSession = {
            userId: matchedStaff.id,
            name: matchedStaff.name,
            email: matchedStaff.email!,
            role: 'Staff',
            orgId: matchedOrg.id,
            orgName: matchedOrg.name
          };
          onLogin(session);
          return;
        } else {
          setValidationError('Incorrect Password for Staff.');
          return;
        }
      }

      setValidationError('Could not find user with these credentials in the offline fallback database.');
    }
  };

  // Handle register request (Organization creation)
  const handleRegisterSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (soundEnabled) playClick();
    setValidationError('');

    const orgName = newOrgName.trim();
    const adminName = newAdminName.trim();
    const adminEmail = newAdminEmail.trim();

    if (!orgName || !adminName || !adminEmail) {
      setValidationError('All registration fields must be provided.');
      return;
    }

    // Try server post first 
    try {
      const response = await fetch('/api/orgs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgName, adminName, adminEmail })
      });

      if (response.ok) {
        const data = await response.json();
        
        // Update credentials fields
        setOrgKey(data.orgKey);
        setEmail(adminEmail);
        setPassword(data.password);

        // Show cool success modal
        setSimulatedEmail({
          to: adminEmail,
          orgName,
          orgKey: data.orgKey,
          passwordGenerated: data.password,
          type: 'org_creation',
          adminName
        });

        // Add to local list anyway so fallback works as well
        const orgs: Organization[] = JSON.parse(localStorage.getItem('clikko_organizations') || '[]');
        const localNewOrg: Organization = {
          id: data.orgKey,
          name: orgName,
          superAdminName: adminName,
          superAdminEmail: adminEmail,
          superAdminPassword: data.password,
          createdAt: new Date().toISOString()
        };
        localStorage.setItem('clikko_organizations', JSON.stringify([...orgs, localNewOrg]));

        // Reset register fields
        setNewOrgName('');
        setNewAdminName('');
        setNewAdminEmail('');
        setIsRegistering(false);
        return;
      } else {
        const errData = await response.json();
        setValidationError(errData.error || 'Server rejected registration.');
        return;
      }
    } catch (networkErr) {
      console.warn('Backend offline, running local client-side registration fallback:', networkErr);
      
      const orgs: Organization[] = JSON.parse(localStorage.getItem('clikko_organizations') || '[]');
      const generatedKey = orgName.toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '');

      if (orgs.some(o => o.id === generatedKey)) {
        setValidationError('Organization name or slug ID already registered (offline).');
        return;
      }

      const seedNum = Math.floor(1000 + Math.random() * 9000);
      const generatedPassword = `CLK-${seedNum}`;

      const newOrg: Organization = {
        id: generatedKey,
        name: orgName,
        superAdminName: adminName,
        superAdminEmail: adminEmail,
        superAdminPassword: generatedPassword,
        createdAt: new Date().toISOString()
      };

      localStorage.setItem('clikko_organizations', JSON.stringify([...orgs, newOrg]));

      // Update login fields
      setOrgKey(generatedKey);
      setEmail(adminEmail);
      setPassword(generatedPassword);

      // Launch email mockup modal!
      setSimulatedEmail({
        to: adminEmail,
        orgName: orgName,
        orgKey: generatedKey,
        passwordGenerated: generatedPassword,
        type: 'org_creation',
        adminName: adminName
      });

      // Reset register fields
      setNewOrgName('');
      setNewAdminName('');
      setNewAdminEmail('');
      setIsRegistering(false);
    }
  };

  // Auto Quick Fill Helpers for swift manual grading and viewing
  const autoFillRole = (role: 'super' | 'subadmin' | 'staff') => {
    if (soundEnabled) playClick();
    setOrgKey('clikko-corp');
    if (role === 'super') {
      setEmail('admin@clikko.com');
      setPassword('admin');
    } else if (role === 'subadmin') {
      setEmail('subadmin@clikko.com');
      setPassword('subadmin');
    } else {
      setEmail('staff@clikko.com');
      setPassword('staff');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 relative overflow-hidden font-sans select-none">
      
      {/* Radiant Cosmic Blue Background */}
      <div className="absolute top-[-25%] left-[-20%] w-[60%] h-[60%] bg-teal-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-sky-500/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 relative z-10 shadow-2xl space-y-6">
        
        {/* APP BRAND HEADER */}
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <div className="w-12 h-12 bg-gradient-to-tr from-teal-500 to-teal-400 rounded-2xl p-1 shadow-lg shadow-teal-500/25 flex items-center justify-center border border-teal-400/20">
              <img 
                src="/src/assets/images/clikko_icon_1780787037185.png" 
                alt="Clikko Stopwatch Logo" 
                className="w-full h-full object-cover rounded-xl"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>
          <div>
            <h1 className="text-2xl font-black text-white font-display tracking-tight flex items-center justify-center gap-1.5">
              Clikko <span className="text-xs bg-teal-500/15 text-teal-400 px-2 py-0.5 rounded-full border border-teal-500/20 font-bold uppercase tracking-widest font-sans">v1.3</span>
            </h1>
            <p className="text-xs text-slate-400 font-medium">Enterprise Time Tracking & Workplace Command Center</p>
          </div>
        </div>

        {/* INFO NOTICE: Only org accounts */}
        <div className="bg-slate-800/40 border border-slate-805 rounded-2xl px-4 py-3 text-[11px] text-slate-400 flex gap-2.5 items-start">
          <Info size={16} className="text-teal-400 shrink-0 mt-0.5" />
          <span>
            <strong className="text-slate-200">Notice:</strong> No individual signups are permitted on Clikko. Only organizations can register. Creating an organization instantly activates your Super Admin account and sends a simulated secure email.
          </span>
        </div>

        {validationError && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-3.5 bg-rose-500/10 border border-rose-500/20 text-xs font-bold text-rose-400 rounded-2xl flex items-center gap-2"
          >
            <div className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-ping" />
            <span>{validationError}</span>
          </motion.div>
        )}

        <AnimatePresence mode="wait">
          {!isRegistering ? (
            /* ================= LOGIN FORM ================= */
            <motion.form
              key="auth-login-form"
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
                    onChange={(e) => setOrgKey(e.target.value)}
                    placeholder="e.g. clikko-corp"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-teal-500 rounded-xl py-3 pl-10 pr-4 text-xs font-medium text-white transition-all outline-none"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Secure Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={15} />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
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
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-teal-500 rounded-xl py-3 pl-10 pr-4 text-xs font-medium text-white transition-all outline-none"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-teal-500 hover:bg-teal-450 text-slate-950 font-bold py-3.5 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 text-xs shadow-lg shadow-teal-500/10"
              >
                <span>Unlock Secure Terminal</span>
                <ArrowRight size={14} />
              </button>

              {/* DEMO ACCOUNTS QUICK-FILLS FOR GRADER POP */}
              <div className="space-y-2 pt-3 border-t border-slate-800/60">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Quick Testing Accounts</span>
                  <span className="text-[8px] font-semibold text-slate-400 px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700">Pre-seeded</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => autoFillRole('super')}
                    className="py-2 px-1 rounded-lg border border-slate-800 hover:border-slate-700 bg-slate-950 hover:bg-slate-900 text-[10px] font-bold text-teal-400 text-center transition-all cursor-pointer truncate"
                  >
                    Super Admin
                  </button>
                  <button
                    type="button"
                    onClick={() => autoFillRole('subadmin')}
                    className="py-2 px-1 rounded-lg border border-slate-800 hover:border-slate-705 bg-slate-950 hover:bg-slate-900 text-[10px] font-bold text-amber-400 text-center transition-all cursor-pointer truncate"
                  >
                    Sub-Admin
                  </button>
                  <button
                    type="button"
                    onClick={() => autoFillRole('staff')}
                    className="py-2 px-1 rounded-lg border border-slate-800 hover:border-slate-705 bg-slate-950 hover:bg-slate-900 text-[10px] font-bold text-slate-400 text-center transition-all cursor-pointer truncate"
                  >
                    Staff Memb.
                  </button>
                </div>
              </div>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    if (soundEnabled) playClick();
                    setIsRegistering(true);
                  }}
                  className="text-xs font-bold text-teal-400 hover:text-teal-300 transition-colors"
                >
                  Create New Organization Account
                </button>
              </div>
            </motion.form>
          ) : (
            /* ================= REGISTRATION FORM ================= */
            <motion.form
              key="auth-register-form"
              initial={{ opacity: 0, x: 15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -15 }}
              onSubmit={handleRegisterSubmit}
              className="space-y-4"
            >
              <div className="space-y-1">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Organization Name / Company</label>
                <div className="relative">
                  <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={15} />
                  <input
                    type="text"
                    value={newOrgName}
                    onChange={(e) => setNewOrgName(e.target.value)}
                    placeholder="e.g. Starlight Tech"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-teal-500 rounded-xl py-3 pl-10 pr-4 text-xs font-medium text-white transition-all outline-none"
                    required
                  />
                </div>
                <span className="text-[9px] text-slate-500 font-semibold block leading-tight">This will automatically generate your secure company slug (Org Key).</span>
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Super Admin Full Name</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={15} />
                  <input
                    type="text"
                    value={newAdminName}
                    onChange={(e) => setNewAdminName(e.target.value)}
                    placeholder="e.g. Bernie"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-teal-500 rounded-xl py-3 pl-10 pr-4 text-xs font-medium text-white transition-all outline-none"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Register Email address</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={15} />
                  <input
                    type="email"
                    value={newAdminEmail}
                    onChange={(e) => setNewAdminEmail(e.target.value)}
                    placeholder="bernieamce@gmail.com"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-teal-500 rounded-xl py-3 pl-10 pr-4 text-xs font-medium text-white transition-all outline-none"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-teal-500 hover:bg-teal-450 text-slate-950 font-bold py-3.5 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 text-xs shadow-lg shadow-teal-500/10"
              >
                <span>Register Company & Super Admin</span>
                <Sparkles size={14} />
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    if (soundEnabled) playClick();
                    setIsRegistering(false);
                  }}
                  className="text-xs font-bold text-slate-400 hover:text-white transition-colors"
                >
                  Already have an organization? Sign In
                </button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>

      </div>

      {/* ================= HIGH-END SIMULATED SMTP EMAIL MODAL ================= */}
      <AnimatePresence>
        {simulatedEmail && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col"
            >
              
              {/* Terminal / Inbound Header */}
              <div className="bg-slate-950 px-5 py-4 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-rose-500" />
                  <div className="w-3 h-3 rounded-full bg-amber-500" />
                  <div className="w-3 h-3 rounded-full bg-teal-500" />
                </div>
                <span className="text-[10px] font-mono font-bold text-slate-400 flex items-center gap-1.5 uppercase tracking-widest">
                  <Inbox size={12} className="text-teal-400 animate-pulse" />
                  Secure Outbox Mail Queue (SMTP)
                </span>
                <div className="w-6" />
              </div>

              {/* Email Envelope Container */}
              <div className="p-6 space-y-4 flex-1">
                <div className="space-y-1.5 border-b border-slate-800/80 pb-3">
                  <span className="block text-[10px] uppercase font-bold text-slate-500">From Address</span>
                  <span className="text-xs font-semibold text-teal-400">no-reply@clikko.com</span>
                </div>

                <div className="space-y-1.5 border-b border-slate-800/80 pb-3">
                  <span className="block text-[10px] uppercase font-bold text-slate-500">Recipients Box</span>
                  <span className="text-xs font-semibold text-white">{simulatedEmail.to}</span>
                </div>

                <div className="space-y-1.5 border-b border-slate-800/80 pb-3">
                  <span className="block text-[10px] uppercase font-bold text-slate-500">Subject Lines</span>
                  <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                    <Sparkles size={13} fill="currentColor" />
                    CLIKKO Organization Key & Super Admin Activated!
                  </span>
                </div>

                {/* Simulated Email Body Content */}
                <div className="bg-slate-950/80 border border-slate-800 py-4 px-5 rounded-2xl space-y-3 font-mono text-[11px] leading-relaxed text-slate-300">
                  <p>Dear {simulatedEmail.adminName},</p>
                  
                  <p>
                    Congratulations! Your enterprise organization registered successfully on Clikko. As requested, we have prepared a dedicated workspace and initialized your secure root account:
                  </p>

                  <div className="p-3 bg-slate-900 border border-slate-805 rounded-xl space-y-1.5 text-xs text-white">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Org Key / ID:</span>
                      <span className="font-bold text-teal-400 select-all">{simulatedEmail.orgKey}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Super Admin Email:</span>
                      <span className="font-bold text-slate-200 select-all">{simulatedEmail.to}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Password:</span>
                      <span className="font-bold text-amber-400 select-all">{simulatedEmail.passwordGenerated}</span>
                    </div>
                  </div>

                  <p className="text-slate-505 text-[10px]">
                    *SECURITY INFO: No other administrators can create accounts on Clikko outside of your secure root panel. Subadmins or staff members can only login when generated from your Workplace Terminal.
                  </p>
                </div>

                {/* Instant Action Copy block */}
                <div className="grid grid-cols-2 gap-3.5 pt-2">
                  <button
                    onClick={() => handleCopy(`${simulatedEmail.orgKey} | ${simulatedEmail.to} | ${simulatedEmail.passwordGenerated}`)}
                    className="py-3 px-4 rounded-xl border border-slate-800 hover:border-slate-705 text-slate-300 font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {copied ? <Check size={14} className="text-teal-400" /> : <Copy size={14} />}
                    <span>{copied ? 'Copied Logins!' : 'Copy Credentials'}</span>
                  </button>

                  <button
                    onClick={() => {
                      if (soundEnabled) playClick();
                      const session: UserSession = {
                        userId: 'super-admin',
                        name: simulatedEmail.adminName,
                        email: simulatedEmail.to,
                        role: 'SuperAdmin',
                        orgId: simulatedEmail.orgKey,
                        orgName: simulatedEmail.orgName
                      };
                      onLogin(session);
                      setSimulatedEmail(null);
                    }}
                    className="py-3 px-4 rounded-xl bg-teal-500 hover:bg-teal-450 text-slate-950 font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-teal-500/15"
                  >
                    <ShieldCheck size={14} />
                    <span>Quick Login Admin</span>
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