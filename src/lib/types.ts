// ===== USER & AUTH TYPES =====

export type UserRole = "admin" | "worker";

export interface UserProfile {
  id: string; // auto-generated: ADM-0001, WKR-0001 etc.
  name: string;
  email: string;
  mobile: string;
  role: UserRole;
  department: string;
  designation: string;
  sectionHead: string; // department head for admin approval chain
  createdAt: string;
  isActive: boolean;
}

export interface UserAccount extends UserProfile {
  password: string;
}

export interface SessionData {
  sessionId: string;
  userId: string;
  loginTime: number;
  expiry: number;
  ip: string;
}

// ===== DASHBOARD DATA TYPES =====

export interface BeltStatus {
  id: string;
  name: string;
  status: "operational" | "warning" | "critical" | "offline";
  speed: number;
  tension: number;
  temperature: number;
  load: number;
  uptime: number;
  lastInspection: string;
  damageRisk: number;
}

export interface DamageDetection {
  id: string;
  beltId: string;
  type: "tear" | "abrasion" | "splice_failure" | "edge_damage" | "joint_rupture";
  severity: "low" | "medium" | "high" | "critical";
  confidence: number;
  location: string;
  timestamp: string;
  imageUrl: string;
  status: "detected" | "acknowledged" | "repaired";
}

export interface MaintenancePrediction {
  id: string;
  beltId: string;
  component: string;
  predictedFailureDate: string;
  confidence: number;
  remainingLife: number;
  priority: "low" | "medium" | "high" | "urgent";
  recommendation: string;
}

export interface ThermalReading {
  id: string;
  beltId: string;
  zone: string;
  temperature: number;
  anomalyScore: number;
  timestamp: string;
  status: "normal" | "elevated" | "critical";
}

export interface Alert {
  id: string;
  type: "damage" | "maintenance" | "thermal" | "system";
  severity: "info" | "warning" | "critical";
  message: string;
  timestamp: string;
  acknowledged: boolean;
}

export interface AnalysisRecord {
  id: string;
  beltId: string;
  category: "vibration" | "temperature" | "motor_current" | "acoustic" | "load_tension" | "electromagnetic" | "camera_ai";
  component: string;
  value: number;
  unit: string;
  threshold: number;
  status: "normal" | "warning" | "critical";
  severity: "low" | "medium" | "high" | "critical";
  details: string;
  recommendation: string;
  timestamp: string;
}

export interface DashboardStats {
  totalBelts: number;
  operationalBelts: number;
  warningBelts: number;
  criticalBelts: number;
  activeAlerts: number;
  avgUptime: number;
  totalTonnage: number;
  damageDetections: number;
  predictionsPending: number;
}
