// Client-side record export utility for NMDC Conveyor & Sensor telemetry
import { BeltStatus, ThermalReading, UserProfile, AnalysisRecord } from "./types";
import { mockBelts, mockThermalData, mockAlerts, mockDetections, mockPredictions, mockAnalysisData } from "./mock-data";

function downloadBlob(content: string, filename: string, mimeType = "text/csv;charset=utf-8;") {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// 1. Export Conveyor Sensor Telemetry Records (CSV)
export function exportSensorRecordsCSV(belts: BeltStatus[] = mockBelts): string {
  const headers = [
    "Belt ID",
    "Belt Name",
    "Status",
    "Speed (m/s)",
    "Tension (kN)",
    "Temperature (°C)",
    "Dynamic Load (tonnes/h)",
    "System Uptime (%)",
    "Damage Risk Score (%)",
    "Last Inspection Date",
    "Timestamp",
  ];

  const now = new Date().toISOString();
  const rows = belts.map((b) => [
    `"${b.id}"`,
    `"${b.name}"`,
    `"${b.status.toUpperCase()}"`,
    b.speed,
    b.tension,
    b.temperature,
    b.load,
    b.uptime,
    b.damageRisk,
    `"${b.lastInspection}"`,
    `"${now}"`,
  ]);

  const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
  const filename = `NMDC_Conveyor_Sensor_Records_${new Date().toISOString().slice(0, 10)}.csv`;
  downloadBlob(csvContent, filename);
  return filename;
}

// 2. Export Multi-Sensor Diagnostics Records (Vibration, Temp, Acoustic, EM, Motor, Tension)
export function exportAnalysisRecordsCSV(records: AnalysisRecord[] = mockAnalysisData): string {
  const headers = [
    "Record ID",
    "Belt ID",
    "Sensor Category",
    "Monitored Component",
    "Measured Value",
    "Unit",
    "Threshold Limit",
    "Condition Status",
    "Severity",
    "Diagnostic Findings",
    "Engineering Recommendation",
    "Timestamp",
  ];

  const rows = records.map((r) => [
    `"${r.id}"`,
    `"${r.beltId}"`,
    `"${r.category.toUpperCase()}"`,
    `"${r.component}"`,
    r.value,
    `"${r.unit}"`,
    r.threshold,
    `"${r.status.toUpperCase()}"`,
    `"${r.severity.toUpperCase()}"`,
    `"${r.details.replace(/"/g, '""')}"`,
    `"${r.recommendation.replace(/"/g, '""')}"`,
    `"${r.timestamp}"`,
  ]);

  const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
  const filename = `NMDC_Multi_Sensor_Diagnostics_Records_${new Date().toISOString().slice(0, 10)}.csv`;
  downloadBlob(csvContent, filename);
  return filename;
}

// 3. Export Thermal Infrared Sensor Logs (CSV)
export function exportThermalSensorRecordsCSV(thermals: ThermalReading[] = mockThermalData): string {
  const headers = [
    "Reading ID",
    "Belt ID",
    "Conveyor Zone",
    "Temperature (°C)",
    "Anomaly Score",
    "Status",
    "Timestamp",
  ];

  const rows = thermals.map((t) => [
    `"${t.id}"`,
    `"${t.beltId}"`,
    `"${t.zone}"`,
    t.temperature,
    t.anomalyScore,
    `"${t.status.toUpperCase()}"`,
    `"${t.timestamp}"`,
  ]);

  const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
  const filename = `NMDC_Thermal_Sensor_Logs_${new Date().toISOString().slice(0, 10)}.csv`;
  downloadBlob(csvContent, filename);
  return filename;
}

// 4. Export Senior Staff & Personnel / User Accounts (CSV)
export function exportSeniorStaffRecordsCSV(users?: UserProfile[]): string {
  const defaultStaff: UserProfile[] = users && users.length > 0 ? users : [
    {
      id: "ADM-0001",
      name: "Super Admin",
      email: "admin@nmdc.in",
      mobile: "9000000001",
      role: "admin",
      department: "System Administration",
      designation: "Chief Technical Officer / System Administrator",
      sectionHead: "Director of Mines",
      createdAt: "2026-08-01T00:00:00.000Z",
      isActive: true,
    },
    {
      id: "ADM-0002",
      name: "K. R. Venkat",
      email: "venkat@nmdc.in",
      mobile: "9000000010",
      role: "admin",
      department: "Bailadila Complex",
      designation: "Senior Plant Manager",
      sectionHead: "Chief Executive Officer",
      createdAt: "2026-08-10T00:00:00.000Z",
      isActive: true,
    },
    {
      id: "WKR-0001",
      name: "Rajesh Kumar",
      email: "rajesh@nmdc.in",
      mobile: "9000000002",
      role: "worker",
      department: "Conveyor Maintenance",
      designation: "Lead Inspection Technician",
      sectionHead: "Senior Plant Manager",
      createdAt: "2026-08-15T00:00:00.000Z",
      isActive: true,
    },
    {
      id: "WKR-0002",
      name: "Suresh Patel",
      email: "suresh@nmdc.in",
      mobile: "9000000003",
      role: "worker",
      department: "Ore Crushing Plant",
      designation: "Senior Belt Operator",
      sectionHead: "Plant Superintendent",
      createdAt: "2026-08-16T00:00:00.000Z",
      isActive: true,
    },
  ];

  const headers = [
    "Staff ID",
    "Full Name",
    "Role",
    "Department",
    "Designation / Title",
    "Senior Section Head / Reporting To",
    "Official Email",
    "Contact Mobile",
    "Account Status",
    "Enrolled Date",
  ];

  const rows = defaultStaff.map((u) => [
    `"${u.id}"`,
    `"${u.name}"`,
    `"${u.role.toUpperCase()}"`,
    `"${u.department}"`,
    `"${u.designation}"`,
    `"${u.sectionHead || "N/A"}"`,
    `"${u.email}"`,
    `"${u.mobile}"`,
    `"${u.isActive ? "ACTIVE" : "INACTIVE"}"`,
    `"${u.createdAt}"`,
  ]);

  const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
  const filename = `NMDC_Senior_Staff_and_Personnel_Records_${new Date().toISOString().slice(0, 10)}.csv`;
  downloadBlob(csvContent, filename);
  return filename;
}

// 5. Export Full System Telemetry Snapshot (JSON)
export function exportFullTelemetryJSON(): string {
  const payload = {
    metadata: {
      system: "NMDC Intelligent Belt Monitoring System",
      sector: "Bailadila Deposit-14 Complex",
      exportedAt: new Date().toISOString(),
      version: "2.4.0",
    },
    sensors: mockBelts,
    multiSensorDiagnostics: mockAnalysisData,
    thermals: mockThermalData,
    alerts: mockAlerts,
    detections: mockDetections,
    predictions: mockPredictions,
  };

  const jsonString = JSON.stringify(payload, null, 2);
  const filename = `NMDC_Full_Telemetry_Snapshot_${new Date().toISOString().slice(0, 10)}.json`;
  downloadBlob(jsonString, filename, "application/json;charset=utf-8;");
  return filename;
}
