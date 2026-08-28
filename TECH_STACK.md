# 🔧 NMDC Analyzer — Conveyor Belt Monitoring System

## Tech Stack

| Layer | Technology | Why We Use It |
| --- | --- | --- |
| 🌐 **Frontend Framework** | **Next.js 16** | Full-stack React framework with file-based routing, API routes, and server-side rendering |
| ⚛️ **UI Library** | **React 19** | Interactive component-based UI for the real-time monitoring dashboard |
| 📝 **Language** | **TypeScript** | Static type safety across all components, APIs, and data models |
| 🎨 **Styling** | **Tailwind CSS v4** | Utility-first CSS for responsive, dark-themed industrial dashboard design |
| 📊 **Data Visualization** | **Recharts** | Interactive charts — frequency spectrum, waveforms, radar, bar, line, and gauge charts for sensor data |
| 🎯 **Icons** | **Lucide React** | Lightweight, customizable icon library for sidebar, cards, and status indicators |
| 📷 **Live Camera / AI Vision** | **WebRTC + Canvas API** | Real-time camera feed with YOLO-style bounding box overlay for belt damage detection |
| ⚙️ **Backend / API** | **Next.js API Routes (Route Handlers)** | RESTful API endpoints — login, register, session management, password reset, alerts |
| 🔐 **Authentication** | **Custom Session Store** | Role-based access control (Super Admin / Admin / Operator), rate limiting, session limits, and expiry |
| 🗄️ **Database** | **In-Memory JavaScript Map** | Demo data store (easily replaceable with PostgreSQL / MongoDB for production) |
| 📱 **IoT Sensor Integration** | **7 Sensor Categories** | Vibration (bearing/pulley/gearbox), Temperature (overheating), Motor Current (overload), Acoustic (unusual sounds), Load/Tension (belt stress), Electromagnetic (steel-cord damage), Camera/AI (cracks/tears/misalignment) |
| 🤖 **AI / ML** | **YOLO Object Detection** | Simulated real-time damage detection with bounding boxes, confidence scores, and severity classification |
| 🖨️ **Report Export** | **PDF via Print API** | Browser-native print-to-PDF for analysis records, sensor reports, and detection logs |
| 🧪 **Dev Tools** | **ESLint + TypeScript Compiler** | Code quality enforcement and static type checking |
| 🚀 **Bundler / Dev Server** | **Turbopack** | Next.js 16's built-in bundler for fast HMR and development builds |
| 🔌 **Build Tool** | **Node.js** | JavaScript runtime for server-side logic and development toolchain |

---

## Project Features

| Module | Description |
| --- | --- |
| 🔐 **Auth System** | Login, registration, role-based access, session management, password reset |
| 📊 **Dashboard** | Real-time conveyor belt health overview with stats and charts |
| 🔍 **Belt Monitoring** | Individual belt status tracking with live readings |
| ⚠️ **Damage Detection** | AI-powered damage detection with live camera YOLO overlay |
| 📈 **Predictive Maintenance** | ML-based failure prediction with confidence scores |
| 🔬 **Analysis** | 7-category sensor analysis with specialized charts (FFT, waveforms, radar, heatmap) |
| 🔔 **Alerts** | Real-time alert system with severity levels and acknowledgment |
| 👥 **Admin Management** | User session monitoring and admin controls |
| ⚙️ **Settings** | System configuration and belt management |

---

## Sensor Categories & Visualization

| Sensor Type | What It Detects | Chart Type |
| --- | --- | --- |
| 📳 **Vibration** | Bearing, pulley, gearbox problems | FFT Frequency Spectrum (Bar Chart) |
| 🌡️ **Temperature** | Overheating zones | Thermal Zone Heatmap + Temperature Bars |
| ⚡ **Motor Current** | Overload / mechanical resistance | Current Waveform (Line Chart) |
| 🎤 **Acoustic** | Unusual sounds / bearing noise | Sound Waveform (Area Chart) |
| ⚖️ **Load/Tension** | Abnormal belt stress | Gauge Meters + Distribution Bars |
| 🧲 **Electromagnetic** | Steel-cord / internal belt damage | Radar Chart + Integrity Progress Bars |
| 📷 **Camera/AI Vision** | Cracks, tears, misalignment, surface damage | Detection Grid with Bounding Boxes |

---

## Smart India Hackathon 2026 — Spidy Hackers
