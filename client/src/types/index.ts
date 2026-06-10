export interface Organization {
  id: string;
  name: string;
  superAdminName: string;
  superAdminEmail: string;
  superAdminPassword?: string;
  createdAt: string;
}

export interface SubAdmin {
  id: string;
  orgId?: string;
  name: string;
  email: string;
  password?: string;
  departmentScope: string;
  role: 'SubAdmin';
  createdAt: string;
}

export interface StaffMember {
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

export interface TimeEntry {
  id: string;
  userId: string;
  orgId: string;
  categoryName: string;
  durationSeconds: number;
  notes?: string;
  startTime: string;
}

export interface UserSession {
  userId: string;
  name: string;
  email: string;
  role: 'SuperAdmin' | 'SubAdmin' | 'Staff';
  orgId: string;
  orgName: string;
}
