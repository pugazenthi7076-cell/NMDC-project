import mongoose, { Schema, Document } from "mongoose";

// ===== USER MODEL =====
export interface IUserDocument extends Document {
  id: string;
  name: string;
  email: string;
  mobile: string;
  role: "admin" | "worker";
  department: string;
  designation: string;
  sectionHead: string;
  password: string;
  createdAt: string;
  isActive: boolean;
}

const UserSchema = new Schema<IUserDocument>(
  {
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    mobile: { type: String, required: true, unique: true },
    role: { type: String, enum: ["admin", "worker"], required: true },
    department: { type: String, required: true },
    designation: { type: String, required: true },
    sectionHead: { type: String, required: true },
    password: { type: String, required: true },
    createdAt: { type: String, default: () => new Date().toISOString() },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: false }
);

export const User = mongoose.models.User || mongoose.model<IUserDocument>("User", UserSchema);

// ===== SESSION MODEL =====
export interface ISessionDocument extends Document {
  sessionId: string;
  userId: string;
  loginTime: number;
  expiry: number;
  ip: string;
}

const SessionSchema = new Schema<ISessionDocument>(
  {
    sessionId: { type: String, required: true, unique: true },
    userId: { type: String, required: true },
    loginTime: { type: Number, required: true },
    expiry: { type: Number, required: true },
    ip: { type: String, default: "unknown" },
  },
  { timestamps: false }
);

export const Session = mongoose.models.Session || mongoose.model<ISessionDocument>("Session", SessionSchema);

// ===== BELT STATUS MODEL =====
export interface IBeltDocument extends Document {
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

const BeltSchema = new Schema<IBeltDocument>(
  {
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    status: { type: String, enum: ["operational", "warning", "critical", "offline"], required: true },
    speed: { type: Number, required: true },
    tension: { type: Number, required: true },
    temperature: { type: Number, required: true },
    load: { type: Number, required: true },
    uptime: { type: Number, required: true },
    lastInspection: { type: String, required: true },
    damageRisk: { type: Number, required: true },
  },
  { timestamps: false }
);

export const Belt = mongoose.models.Belt || mongoose.model<IBeltDocument>("Belt", BeltSchema);

// ===== DAMAGE DETECTION MODEL =====
export interface IDetectionDocument extends Document {
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

const DetectionSchema = new Schema<IDetectionDocument>(
  {
    id: { type: String, required: true, unique: true },
    beltId: { type: String, required: true },
    type: { type: String, enum: ["tear", "abrasion", "splice_failure", "edge_damage", "joint_rupture"], required: true },
    severity: { type: String, enum: ["low", "medium", "high", "critical"], required: true },
    confidence: { type: Number, required: true },
    location: { type: String, required: true },
    timestamp: { type: String, required: true },
    imageUrl: { type: String, default: "" },
    status: { type: String, enum: ["detected", "acknowledged", "repaired"], default: "detected" },
  },
  { timestamps: false }
);

export const Detection = mongoose.models.Detection || mongoose.model<IDetectionDocument>("Detection", DetectionSchema);

// ===== PREDICTION MODEL =====
export interface IPredictionDocument extends Document {
  id: string;
  beltId: string;
  component: string;
  predictedFailureDate: string;
  confidence: number;
  remainingLife: number;
  priority: "low" | "medium" | "high" | "urgent";
  recommendation: string;
}

const PredictionSchema = new Schema<IPredictionDocument>(
  {
    id: { type: String, required: true, unique: true },
    beltId: { type: String, required: true },
    component: { type: String, required: true },
    predictedFailureDate: { type: String, required: true },
    confidence: { type: Number, required: true },
    remainingLife: { type: Number, required: true },
    priority: { type: String, enum: ["low", "medium", "high", "urgent"], required: true },
    recommendation: { type: String, required: true },
  },
  { timestamps: false }
);

export const Prediction = mongoose.models.Prediction || mongoose.model<IPredictionDocument>("Prediction", PredictionSchema);

// ===== ALERT MODEL =====
export interface IAlertDocument extends Document {
  id: string;
  type: "damage" | "maintenance" | "thermal" | "system";
  severity: "info" | "warning" | "critical";
  message: string;
  timestamp: string;
  acknowledged: boolean;
}

const AlertSchema = new Schema<IAlertDocument>(
  {
    id: { type: String, required: true, unique: true },
    type: { type: String, enum: ["damage", "maintenance", "thermal", "system"], required: true },
    severity: { type: String, enum: ["info", "warning", "critical"], required: true },
    message: { type: String, required: true },
    timestamp: { type: String, required: true },
    acknowledged: { type: Boolean, default: false },
  },
  { timestamps: false }
);

export const AlertModel = mongoose.models.Alert || mongoose.model<IAlertDocument>("Alert", AlertSchema);

// ===== ANALYSIS RECORD MODEL =====
export interface IAnalysisDocument extends Document {
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

const AnalysisSchema = new Schema<IAnalysisDocument>(
  {
    id: { type: String, required: true, unique: true },
    beltId: { type: String, required: true },
    category: {
      type: String,
      enum: ["vibration", "temperature", "motor_current", "acoustic", "load_tension", "electromagnetic", "camera_ai"],
      required: true,
    },
    component: { type: String, required: true },
    value: { type: Number, required: true },
    unit: { type: String, required: true },
    threshold: { type: Number, required: true },
    status: { type: String, enum: ["normal", "warning", "critical"], required: true },
    severity: { type: String, enum: ["low", "medium", "high", "critical"], required: true },
    details: { type: String, required: true },
    recommendation: { type: String, required: true },
    timestamp: { type: String, required: true },
  },
  { timestamps: false }
);

export const AnalysisRecord = mongoose.models.AnalysisRecord || mongoose.model<IAnalysisDocument>("AnalysisRecord", AnalysisSchema);

// ===== THERMAL READING MODEL =====
export interface IThermalDocument extends Document {
  id: string;
  beltId: string;
  zone: string;
  temperature: number;
  anomalyScore: number;
  timestamp: string;
  status: "normal" | "elevated" | "critical";
}

const ThermalSchema = new Schema<IThermalDocument>(
  {
    id: { type: String, required: true, unique: true },
    beltId: { type: String, required: true },
    zone: { type: String, required: true },
    temperature: { type: Number, required: true },
    anomalyScore: { type: Number, required: true },
    timestamp: { type: String, required: true },
    status: { type: String, enum: ["normal", "elevated", "critical"], required: true },
  },
  { timestamps: false }
);

export const ThermalReading = mongoose.models.ThermalReading || mongoose.model<IThermalDocument>("ThermalReading", ThermalSchema);
