import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Users, UserCheck, UserX, DollarSign, Clock, Eye, Video, Wifi, WifiOff, Plus, RefreshCw, Briefcase, Activity } from 'lucide-react';
import { UserSession, StaffMember, SubAdmin } from '../types';

const playClick = () => {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 700;
    osc.type = 'sine';
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.08);
  } catch {}
};

interface WorkplaceCommandCenterProps {
  session: UserSession;
  soundEnabled: boolean;
}

const ATTITUDES = ['Working', 'Meeting', 'Break', 'Lunch', 'Sleeping', 'Focused', 'Reviewing'];

export default function WorkplaceCommandCenter({ session, soundEnabled }: WorkplaceCommandCenterProps) {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [subadmins, setSubadmins] = useState<SubAdmin[]>([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [loading, setLoading] = useState(true);
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [showAddStaff, setShowAddStaff] = useState(false);
  const [showAddSubadmin, setShowAddSubadmin] = useState(false);

  // Form states
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffEmail, setNewStaffEmail] = useState('');
  const [newStaffDept, setNewStaffDept] = useState('');
  const [newStaffSalary, setNewStaffSalary] = useState('3000');

  const [newSubName, setNewSubName] = useState('');
  const [newSubEmail, setNewSubEmail] = useState('');
  const [newSubScope, setNewSubScope] = useState('');

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

  // Fetch data
  const fetchData = async () => {
    setLoading(true);
    try {
      const [staffRes, subRes] = await Promise.all([
        fetch(`/api/staff?orgId=${session.orgId}`),
        fetch(`/api/subadmins?orgId=${session.orgId}`)
      ]);
      if (staffRes.ok) setStaff(await staffRes.json());
      if (subRes.ok) setSubadmins(await subRes.json());
    } catch {
      // Load from localStorage as fallback
      const savedStaff = localStorage.getItem(`clikko_staff_${session.orgId}`);
      const savedSubs = localStorage.getItem(`clikko_subs_${session.orgId}`);
      if (savedStaff) setStaff(JSON.parse(savedStaff));
      if (savedSubs) setSubadmins(JSON.parse(savedSubs));
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [session.orgId]);

  const handleClockToggle = async (s: StaffMember) => {
    if (soundEnabled) playClick();
    const newStatus = s.clockInStatus === 'Clocked In' ? 'Clocked Out' : 'Clocked In';
    const updated = staff.map(st => st.id === s.id ? {
      ...st,
      clockInStatus: newStatus,
      lastClockTime: new Date().toISOString()
    } : st);
    setStaff(updated);
    localStorage.setItem(`clikko_staff_${session.orgId}`, JSON.stringify(updated));
  };

  const handleAddStaff = async () => {
    if (!newStaffName.trim() || !newStaffEmail.trim() || !newStaffDept.trim()) return;
    if (soundEnabled) playClick();

    try {
      const res = await fetch('/api/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orgId: session.orgId,
          name: newStaffName,
          email: newStaffEmail,
          department: newStaffDept,
          baseSalary: Number(newStaffSalary) || 3000
        })
      });
      if (res.ok) {
        const data = await res.json();
        const updated = [data.staff, ...staff];
        setStaff(updated);
        localStorage.setItem(`clikko_staff_${session.orgId}`, JSON.stringify(updated));
      }
    } catch {
      // Local fallback
      const newMember: StaffMember = {
        id: `staff-${Date.now()}`,
        orgId: session.orgId,
        name: newStaffName,
        email: newStaffEmail,
        department: newStaffDept,
        avatarText: newStaffName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase(),
        baseSalary: Number(newStaffSalary) || 3000,
        salaryMultiplier: 1.0,
        attitudeStatus: 'Working',
        attitudeMessage: 'Ready to work.',
        clockInStatus: 'Clocked Out',
        lastClockTime: null,
        role: 'Staff'
      };
      const updated = [newMember, ...staff];
      setStaff(updated);
      localStorage.setItem(`clikko_staff_${session.orgId}`, JSON.stringify(updated));
    }

    setNewStaffName('');
    setNewStaffEmail('');
    setNewStaffDept('');
    setNewStaffSalary('3000');
    setShowAddStaff(false);
  };

  const handleAddSubadmin = async () => {
    if (!newSubName.trim() || !newSubEmail.trim()) return;
    if (soundEnabled) playClick();

    try {
      const res = await fetch('/api/subadmins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orgId: session.orgId,
          name: newSubName,
          email: newSubEmail,
          departmentScope: newSubScope || 'All Departments'
        })
      });
      if (res.ok) {
        const data = await res.json();
        const updated = [data.subadmin, ...subadmins];
        setSubadmins(updated);
        localStorage.setItem(`clikko_subs_${session.orgId}`, JSON.stringify(updated));
      }
    } catch {
      const newSub: SubAdmin = {
        id: `sub-${Date.now()}`,
        orgId: session.orgId,
        name: newSubName,
        email: newSubEmail,
        departmentScope: newSubScope || 'All Departments',
        role: 'SubAdmin',
        createdAt: new Date().toISOString()
      };
      const updated = [newSub, ...subadmins];
      setSubadmins(updated);
      localStorage.setItem(`clikko_subs_${session.orgId}`, JSON.stringify(updated));
    }

    setNewSubName('');
    setNewSubEmail('');
    setNewSubScope('');
    setShowAddSubadmin(false);
  };

  // Simulate random attitude changes
  useEffect(() => {
    const interval = setInterval(() => {
      setStaff(prev => prev.map(s => {
        if (Math.random() > 0.85) {
          const newAttitude = ATTITUDES[Math.floor(Math.random() * ATTITUDES.length)];
          return {
            ...s,
            attitudeStatus: newAttitude,
            attitudeMessage: `${s.name} is currently ${newAttitude.toLowerCase()}.`
          };
        }
        return s;
      }));
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const totalPayroll = staff.reduce((sum, s) => sum + s.baseSalary * s.salaryMultiplier, 0);
  const activeCount = staff.filter(s => s.clockInStatus === 'Clocked In').length;

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-slate-900 border border-slate-800 rounded-2xl p-4"
        >
          <div className="flex items-center gap-2 text-slate-400 mb-2">
            <Users size={16} />
            <span className="text-[10px] font-bold uppercase tracking-wider">Total Staff</span>
          </div>
          <div className="text-3xl font-black text-white">{staff.length}</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-slate-900 border border-slate-800 rounded-2xl p-4"
        >
          <div className="flex items-center gap-2 text-slate-400 mb-2">
            <UserCheck size={16} />
            <span className="text-[10px] font-bold uppercase tracking-wider">Active Now</span>
          </div>
          <div className="text-3xl font-black text-teal-400">{activeCount}</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-slate-900 border border-slate-800 rounded-2xl p-4"
        >
          <div className="flex items-center gap-2 text-slate-400 mb-2">
            <UserX size={16} />
            <span className="text-[10px] font-bold uppercase tracking-wider">Clocked Out</span>
          </div>
          <div className="text-3xl font-black text-slate-500">{staff.length - activeCount}</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-slate-900 border border-slate-800 rounded-2xl p-4"
        >
          <div className="flex items-center gap-2 text-slate-400 mb-2">
            <DollarSign size={16} />
            <span className="text-[10px] font-bold uppercase tracking-wider">Monthly Payroll</span>
          </div>
          <div className="text-2xl font-black text-amber-400">${totalPayroll.toLocaleString()}</div>
        </motion.div>
      </div>

      {/* Connection Status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {isOnline ? (
            <div className="flex items-center gap-1.5 text-xs text-teal-400">
              <Wifi size={14} />
              <span>Connected to Server</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-xs text-amber-400">
              <WifiOff size={14} />
              <span>Offline Mode</span>
            </div>
          )}
        </div>
        <button
          onClick={fetchData}
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Action Buttons */}
      {(session.role === 'SuperAdmin' || session.role === 'SubAdmin') && (
        <div className="flex gap-3">
          <button
            onClick={() => { if (soundEnabled) playClick(); setShowAddStaff(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-teal-500 hover:bg-teal-400 text-slate-950 rounded-xl text-xs font-bold transition-all shadow-lg shadow-teal-500/15"
          >
            <Plus size={14} />
            Add Staff Member
          </button>
          {session.role === 'SuperAdmin' && (
            <button
              onClick={() => { if (soundEnabled) playClick(); setShowAddSubadmin(true); }}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold border border-slate-700 transition-all"
            >
              <Plus size={14} />
              Add Sub-Admin
            </button>
          )}
        </div>
      )}

      {/* CCTV Monitor Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden"
      >
        <div className="bg-slate-950 px-5 py-4 border-b border-slate-800 flex items-center gap-2">
          <Video size={16} className="text-teal-400" />
          <span className="text-xs font-bold text-white">Live Workplace Monitor</span>
          <span className="ml-auto flex items-center gap-1.5 text-[10px] text-slate-400">
            <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
            LIVE
          </span>
        </div>

        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[600px] overflow-y-auto">
          {loading ? (
            <div className="col-span-full text-center py-12 text-slate-400">
              <RefreshCw size={32} className="mx-auto animate-spin mb-3" />
              <p>Loading workplace data...</p>
            </div>
          ) : staff.length === 0 ? (
            <div className="col-span-full text-center py-12 text-slate-500">
              <Users size={48} className="mx-auto mb-4 opacity-50" />
              <p className="text-sm">No staff members yet</p>
              <p className="text-xs mt-1">Add your first team member above</p>
            </div>
          ) : (
            staff.map((s, idx) => (
              <motion.div
                key={s.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.03 }}
                onClick={() => setSelectedStaff(s)}
                className={`relative bg-slate-800/50 border rounded-2xl p-4 cursor-pointer transition-all hover:border-slate-600 ${
                  s.clockInStatus === 'Clocked In' ? 'border-teal-500/30' : 'border-slate-700/50'
                }`}
              >
                {/* CCTV Scanlines Effect */}
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-slate-900/5 to-transparent pointer-events-none" style={{ backgroundSize: '100% 4px' }} />

                <div className="relative flex items-start gap-3">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-sm font-black ${
                    s.clockInStatus === 'Clocked In' ? 'bg-teal-500/20 text-teal-400' : 'bg-slate-700 text-slate-400'
                  }`}>
                    {s.avatarText}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white truncate">{s.name}</span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                        s.clockInStatus === 'Clocked In'
                          ? 'bg-teal-500/20 text-teal-400'
                          : 'bg-slate-700 text-slate-400'
                      }`}>
                        {s.clockInStatus === 'Clocked In' ? 'IN' : 'OUT'}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 truncate">{s.department}</p>
                  </div>

                  <div className="flex flex-col items-end">
                    <span className={`text-[9px] px-2 py-0.5 rounded ${
                      s.attitudeStatus === 'Working' ? 'bg-green-500/20 text-green-400' :
                      s.attitudeStatus === 'Meeting' ? 'bg-blue-500/20 text-blue-400' :
                      s.attitudeStatus === 'Break' || s.attitudeStatus === 'Lunch' ? 'bg-amber-500/20 text-amber-400' :
                      'bg-slate-700 text-slate-400'
                    }`}>
                      {s.attitudeStatus}
                    </span>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                    <Clock size={12} />
                    {s.lastClockTime ? new Date(s.lastClockTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '—'}
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                    <DollarSign size={12} />
                    {s.baseSalary.toLocaleString()}
                  </div>
                </div>

                {/* Quick Clock Toggle */}
                <button
                  onClick={e => { e.stopPropagation(); handleClockToggle(s); }}
                  className={`mt-3 w-full py-2 rounded-lg text-xs font-bold transition-all ${
                    s.clockInStatus === 'Clocked In'
                      ? 'bg-rose-500/10 text-rose-400 hover:bg-rose-500/20'
                      : 'bg-teal-500/10 text-teal-400 hover:bg-teal-500/20'
                  }`}
                >
                  {s.clockInStatus === 'Clocked In' ? 'Clock Out' : 'Clock In'}
                </button>
              </motion.div>
            ))
          )}
        </div>
      </motion.div>

      {/* Subadmins List */}
      {subadmins.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-slate-900 border border-slate-800 rounded-2xl p-5"
        >
          <div className="flex items-center gap-2 mb-4">
            <Briefcase size={18} className="text-amber-400" />
            <h2 className="text-sm font-bold text-white">Sub-Administrators</h2>
          </div>
          <div className="space-y-2">
            {subadmins.map(s => (
              <div key={s.id} className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-xl">
                <div className="w-9 h-9 rounded-lg bg-amber-500/20 flex items-center justify-center text-xs font-black text-amber-400">
                  {s.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-white">{s.name}</p>
                  <p className="text-[10px] text-slate-400">{s.email} · {s.departmentScope}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Add Staff Modal */}
      {showAddStaff && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4"
          >
            <h2 className="text-lg font-bold text-white">Add Staff Member</h2>

            <div className="space-y-3">
              <input
                type="text"
                value={newStaffName}
                onChange={e => setNewStaffName(e.target.value)}
                placeholder="Full Name"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-xs text-white outline-none focus:border-teal-500"
              />
              <input
                type="email"
                value={newStaffEmail}
                onChange={e => setNewStaffEmail(e.target.value)}
                placeholder="Email Address"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-xs text-white outline-none focus:border-teal-500"
              />
              <input
                type="text"
                value={newStaffDept}
                onChange={e => setNewStaffDept(e.target.value)}
                placeholder="Department"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-xs text-white outline-none focus:border-teal-500"
              />
              <input
                type="number"
                value={newStaffSalary}
                onChange={e => setNewStaffSalary(e.target.value)}
                placeholder="Base Salary"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-xs text-white outline-none focus:border-teal-500"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowAddStaff(false)}
                className="flex-1 py-3 bg-slate-800 text-white rounded-xl text-xs font-bold"
              >
                Cancel
              </button>
              <button
                onClick={handleAddStaff}
                className="flex-1 py-3 bg-teal-500 text-slate-950 rounded-xl text-xs font-bold"
              >
                Add Staff
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Add Subadmin Modal */}
      {showAddSubadmin && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4"
          >
            <h2 className="text-lg font-bold text-white">Add Sub-Administrator</h2>

            <div className="space-y-3">
              <input
                type="text"
                value={newSubName}
                onChange={e => setNewSubName(e.target.value)}
                placeholder="Full Name"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-xs text-white outline-none focus:border-teal-500"
              />
              <input
                type="email"
                value={newSubEmail}
                onChange={e => setNewSubEmail(e.target.value)}
                placeholder="Email Address"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-xs text-white outline-none focus:border-teal-500"
              />
              <input
                type="text"
                value={newSubScope}
                onChange={e => setNewSubScope(e.target.value)}
                placeholder="Department Scope (e.g. Engineering)"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-xs text-white outline-none focus:border-teal-500"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowAddSubadmin(false)}
                className="flex-1 py-3 bg-slate-800 text-white rounded-xl text-xs font-bold"
              >
                Cancel
              </button>
              <button
                onClick={handleAddSubadmin}
                className="flex-1 py-3 bg-amber-500 text-slate-950 rounded-xl text-xs font-bold"
              >
                Add Sub-Admin
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
