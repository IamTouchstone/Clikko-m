import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';

// --- DATA TYPES & LOCAL ARCHITECTURE ---
interface Organization {
  id: string;
  name: string;
  superAdminName: string;
  superAdminEmail: string;
  superAdminPassword?: string;
  createdAt: string;
}

interface SubAdmin {
  id: string;
  orgId: string;
  name: string;
  email: string;
  password?: string;
  departmentScope: string;
  role: 'SubAdmin';
  createdAt: string;
}

interface StaffMember {
  id: string;
  orgId: string;
  name: string;
  department: string;
  avatarText: string;
  baseSalary: number;
  salaryMultiplier: number;
  attitudeStatus: string;
  attitudeMessage: string;
  clockInStatus: 'Clocked In' | 'Clocked Out';
  lastClockTime: string | null;
  email: string;
  password?: string;
  role: 'Staff';
}

interface TimeEntry {
  id: string;
  userId: string;
  orgId: string;
  categoryName: string;
  durationSeconds: number;
  notes?: string;
  startTime: string; // ISO String
}

// In-Memory Fallback structure synced to a JSON file format
interface ClikkoDatabase {
  organizations: Organization[];
  subadmins: SubAdmin[];
  staff: StaffMember[];
  timeEntries: TimeEntry[];
}

const DB_FILE = path.join(process.cwd(), 'clikko_db.json');

// Helper to load current database state
function loadDatabase(): ClikkoDatabase {
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Error reading clikko_db.json, recreating store:', err);
  }

  // Pre-seed premium sample org, subadmin, and staff for robust default workflows on Bolt.new
  const defaultDb: ClikkoDatabase = {
    organizations: [
      {
        id: 'clikko-corp',
        name: 'Clikko Global Logistics',
        superAdminName: 'Alex Rivera',
        superAdminEmail: 'admin@clikko.com',
        superAdminPassword: 'admin',
        createdAt: new Date().toISOString()
      }
    ],
    subadmins: [
      {
        id: 'sub-marcus',
        orgId: 'clikko-corp',
        name: 'Marcus Vance',
        email: 'subadmin@clikko.com',
        password: 'subadmin',
        departmentScope: 'Operations Sector',
        role: 'SubAdmin',
        createdAt: new Date().toISOString()
      }
    ],
    staff: [
      {
        id: 'staff-joy',
        orgId: 'clikko-corp',
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
        orgId: 'clikko-corp',
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
    ],
    timeEntries: []
  };

  saveDatabase(defaultDb);
  return defaultDb;
}

// Helper to save server-side changes to persistence store
function saveDatabase(db: ClikkoDatabase) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf8');
  } catch (err) {
    console.error('Error writing to clikko_db.json:', err);
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware setups
  app.use(express.json());

  // CORS headers
  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  // --- API BACKEND ENDPOINTS ---

  // Health probe checker
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', serverTime: new Date().toISOString() });
  });

  // Get list of registered organizations
  app.get('/api/orgs', (req, res) => {
    const db = loadDatabase();
    // Exclude actual raw passwords in simple listings
    const safeOrgs = db.organizations.map(({ superAdminPassword, ...rest }) => rest);
    res.json(safeOrgs);
  });

  // Register a brand new organization (forces superadmin creation too)
  app.post('/api/orgs', (req, res) => {
    const { orgName, adminName, adminEmail } = req.body;

    if (!orgName || !adminName || !adminEmail) {
      return res.status(400).json({ error: 'All registration parameters are required.' });
    }

    const db = loadDatabase();

    // Generate unique slug identifier (Org Key)
    const generatedKey = orgName.toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');

    // Check collision index
    if (db.organizations.some(o => o.id === generatedKey)) {
      return res.status(400).json({ error: 'An organization with a similar name or slug ID already exists.' });
    }

    // Generate neat secure start password
    const seedNum = Math.floor(1000 + Math.random() * 9000);
    const generatedPassword = `CLK-${seedNum}`;

    const newOrg: Organization = {
      id: generatedKey,
      name: orgName.trim(),
      superAdminName: adminName.trim(),
      superAdminEmail: adminEmail.trim().toLowerCase(),
      superAdminPassword: generatedPassword,
      createdAt: new Date().toISOString()
    };

    db.organizations.push(newOrg);
    saveDatabase(db);

    console.log(`[BACKEND] Registered Org: ${generatedKey} | Admin: ${adminEmail} | Pass: ${generatedPassword}`);

    res.json({
      success: true,
      orgKey: generatedKey,
      password: generatedPassword,
      organization: {
        id: generatedKey,
        name: newOrg.name,
        superAdminName: newOrg.superAdminName,
        superAdminEmail: newOrg.superAdminEmail
      }
    });
  });

  // Consolidated Authorization & Authentication logic route
  app.post('/api/auth/login', (req, res) => {
    const { orgKey, email, password } = req.body;

    if (!orgKey || !email || !password) {
      return res.status(400).json({ error: 'Organization Key, Email address, and Password are required.' });
    }

    const db = loadDatabase();
    const targetOrgKey = orgKey.trim().toLowerCase();
    const targetEmail = email.trim().toLowerCase();

    // 1. Validate Organization Exist
    const matchedOrg = db.organizations.find(o => o.id.toLowerCase() === targetOrgKey);
    if (!matchedOrg) {
      return res.status(404).json({ error: 'Corporate Organization not found matching Org ID/Key.' });
    }

    // 2. Try authenticate Super Admin
    if (matchedOrg.superAdminEmail.toLowerCase() === targetEmail) {
      if (matchedOrg.superAdminPassword === password) {
        return res.json({
          session: {
            userId: 'super-admin',
            name: matchedOrg.superAdminName,
            email: matchedOrg.superAdminEmail,
            role: 'SuperAdmin',
            orgId: matchedOrg.id,
            orgName: matchedOrg.name
          }
        });
      } else {
        return res.status(401).json({ error: 'Incorrect credentials for Super Admin account.' });
      }
    }

    // 3. Try authenticate SubAdmin accounts
    const matchedSub = db.subadmins.find(s => s.orgId === matchedOrg.id && s.email.toLowerCase() === targetEmail);
    if (matchedSub) {
      if (matchedSub.password === password) {
        return res.json({
          session: {
            userId: matchedSub.id,
            name: matchedSub.name,
            email: matchedSub.email,
            role: 'SubAdmin',
            orgId: matchedOrg.id,
            orgName: matchedOrg.name
          }
        });
      } else {
        return res.status(401).json({ error: 'Incorrect credentials for Sub-Admin account.' });
      }
    }

    // 4. Try authenticate Staff accounts
    const matchedStaff = db.staff.find(s => s.orgId === matchedOrg.id && s.email.toLowerCase() === targetEmail);
    if (matchedStaff) {
      if (matchedStaff.password === password) {
        return res.json({
          session: {
            userId: matchedStaff.id,
            name: matchedStaff.name,
            email: matchedStaff.email,
            role: 'Staff',
            orgId: matchedOrg.id,
            orgName: matchedOrg.name
          }
        });
      } else {
        return res.status(401).json({ error: 'Incorrect credentials for Staff account.' });
      }
    }

    return res.status(401).json({ error: 'Could not find authorized account with these details in the organization.' });
  });

  // Staff Management (fetch or add)
  app.get('/api/staff', (req, res) => {
    const { orgId } = req.query;
    if (!orgId) {
      return res.status(400).json({ error: 'orgId parameter is required.' });
    }

    const db = loadDatabase();
    const list = db.staff.filter(s => s.orgId === String(orgId));
    res.json(list);
  });

  app.post('/api/staff', (req, res) => {
    const { orgId, name, email, department, baseSalary } = req.body;

    if (!orgId || !name || !email || !department) {
      return res.status(400).json({ error: 'Required creator parameters missing.' });
    }

    const db = loadDatabase();

    // Check if duplicate email in staff or subadmins
    if (db.staff.some(s => s.email.toLowerCase() === email.trim().toLowerCase())) {
      return res.status(400).json({ error: 'Account email is already registered on Clikko.' });
    }

    // Generate random code for password
    const randCode = Math.floor(1000 + Math.random() * 9000);
    const tempPassword = `STF-${randCode}`;

    // Compute simple avatar text
    const initials = name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || 'ST';

    const newStaff: StaffMember = {
      id: `staff-${Date.now()}`,
      orgId: String(orgId),
      name: name.trim(),
      department: department.trim(),
      avatarText: initials,
      baseSalary: Number(baseSalary) || 2500,
      salaryMultiplier: 1.0,
      attitudeStatus: 'Working',
      attitudeMessage: 'Assigned and ready to begin tracking tasks.',
      clockInStatus: 'Clocked Out',
      lastClockTime: null,
      email: email.trim().toLowerCase(),
      password: tempPassword,
      role: 'Staff'
    };

    db.staff.push(newStaff);
    saveDatabase(db);

    console.log(`[BACKEND] Created Staff under Org: ${orgId} | Name: ${name} | Email: ${email} | Pass: ${tempPassword}`);

    res.json({
      success: true,
      staff: newStaff
    });
  });

  // Subadmins Registry API
  app.get('/api/subadmins', (req, res) => {
    const { orgId } = req.query;
    if (!orgId) {
      return res.status(400).json({ error: 'orgId parameter is required.' });
    }

    const db = loadDatabase();
    const list = db.subadmins.filter(s => s.orgId === String(orgId));
    res.json(list);
  });

  app.post('/api/subadmins', (req, res) => {
    const { orgId, name, email, departmentScope } = req.body;

    if (!orgId || !name || !email) {
      return res.status(400).json({ error: 'Missing subadmin credentials.' });
    }

    const db = loadDatabase();

    if (db.subadmins.some(s => s.email.toLowerCase() === email.trim().toLowerCase())) {
      return res.status(400).json({ error: 'Email already registered as Sub-Admin.' });
    }

    const randCode = Math.floor(1000 + Math.random() * 9000);
    const tempPassword = `SUB-${randCode}`;

    const newSub: SubAdmin = {
      id: `subadmin-${Date.now()}`,
      orgId: String(orgId),
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password: tempPassword,
      departmentScope: departmentScope || 'All Departments',
      role: 'SubAdmin',
      createdAt: new Date().toISOString()
    };

    db.subadmins.push(newSub);
    saveDatabase(db);

    console.log(`[BACKEND] Created Sub-Admin under Org: ${orgId} | Email: ${email} | Pass: ${tempPassword}`);

    res.json({
      success: true,
      subadmin: newSub
    });
  });

  // Time Entry Synchronization System
  app.post('/api/sync/entries', (req, res) => {
    const { userId, orgId, entries } = req.body;

    if (!userId || !orgId || !Array.isArray(entries)) {
      return res.status(400).json({ error: 'Invalid sync payload body structure.' });
    }

    const db = loadDatabase();

    // 1. Remove current server-side synchronized entries for this specific user in this org
    db.timeEntries = db.timeEntries.filter(e => !(e.userId === userId && e.orgId === orgId));

    // 2. Push fresh list with org mappings
    const formattedEntries: TimeEntry[] = entries.map(ent => ({
      id: ent.id,
      userId: userId,
      orgId: orgId,
      categoryName: ent.categoryName,
      durationSeconds: Number(ent.durationSeconds) || 0,
      notes: ent.notes,
      startTime: ent.startTime
    }));

    db.timeEntries.push(...formattedEntries);
    saveDatabase(db);

    console.log(`[BACKEND] Synchronized ${entries.length} time records for user: ${userId} in org: ${orgId}`);

    res.json({
      success: true,
      synchronizedCount: entries.length,
      serverTime: new Date().toISOString()
    });
  });

  // Pull latest central backed-up entries list
  app.get('/api/sync/entries', (req, res) => {
    const { userId, orgId } = req.query;

    if (!userId || !orgId) {
      return res.status(400).json({ error: 'userId and orgId are required for synching.' });
    }

    const db = loadDatabase();
    const matched = db.timeEntries.filter(e => e.userId === String(userId) && e.orgId === String(orgId));
    res.json(matched);
  });

  // --- INTEGRATION OF FRONTEND MIDDLEWARE SPAN ---

  if (process.env.NODE_ENV !== 'production') {
    console.log('[BACKEND] Initializing Vite Development Middleware Mode...');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    console.log('[BACKEND] Serving static bundles in Production Environment...');
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Bind to 0.0.0.0 and port 3000 as mandated by proxy ingress
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n===========================================`);
    console.log(`🚀 CLIKKO BACKEND ENGINE RUNNING ON PORT ${PORT}`);
    console.log(`📌 Ingress URL: http://localhost:${PORT}`);
    console.log(`💾 JSON Db Persistence: ${DB_FILE}`);
    console.log(`===========================================\n`);
  });
}

startServer();