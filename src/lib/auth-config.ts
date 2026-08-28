// Admin credentials configuration
// Multiple admins with role-based access and session limits
export interface AdminAccount {
  id: string;
  password: string;
  name: string;
  role: "super_admin" | "admin" | "operator";
  maxSessions: number; // max concurrent sessions
  department: string;
}

export const ADMIN_ACCOUNTS: AdminAccount[] = [
  {
    id: "admin",
    password: "admin",
    name: "Super Admin",
    role: "super_admin",
    maxSessions: 5, // can have up to 5 concurrent sessions
    department: "System Administration",
  },
  {
    id: "operator1",
    password: "operator123",
    name: "Belt Operator 1",
    role: "operator",
    maxSessions: 2, // operators limited to 2 sessions
    department: "Conveyor Operations",
  },
  {
    id: "engineer1",
    password: "engineer123",
    name: "Maintenance Engineer",
    role: "admin",
    maxSessions: 3,
    department: "Maintenance & Repair",
  },
];

// Session configuration
export const SESSION_EXPIRY_HOURS = 24;
export const MAX_GLOBAL_SESSIONS = 10; // total concurrent sessions across all admins

// Rate limiting - prevent brute force
export const MAX_LOGIN_ATTEMPTS = 5;
export const LOGIN_LOCKOUT_MINUTES = 15;

// Helper: find admin by id
export function findAdmin(id: string): AdminAccount | undefined {
  return ADMIN_ACCOUNTS.find((a) => a.id === id);
}

// Helper: get admin role permissions
export function getRolePermissions(role: AdminAccount["role"]) {
  switch (role) {
    case "super_admin":
      return {
        canManageUsers: true,
        canViewAllBelts: true,
        canAcknowledgeAlerts: true,
        canModifySettings: true,
        canExportData: true,
        canViewAnalytics: true,
      };
    case "admin":
      return {
        canManageUsers: false,
        canViewAllBelts: true,
        canAcknowledgeAlerts: true,
        canModifySettings: false,
        canExportData: true,
        canViewAnalytics: true,
      };
    case "operator":
      return {
        canManageUsers: false,
        canViewAllBelts: true,
        canAcknowledgeAlerts: false,
        canModifySettings: false,
        canExportData: false,
        canViewAnalytics: true,
      };
  }
}
