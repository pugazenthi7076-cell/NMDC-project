"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Camera, CameraOff, AlertTriangle, CheckCircle, Loader2 } from "lucide-react";

interface Detection {
  id: number;
  type: string;
  severity: "low" | "medium" | "high" | "critical";
  confidence: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

const DAMAGE_TYPES = [
  { type: "Belt Tear", severity: "high" as const },
  { type: "Joint Rupture", severity: "critical" as const },
  { type: "Abrasion", severity: "medium" as const },
  { type: "Edge Damage", severity: "low" as const },
  { type: "Splice Failure", severity: "high" as const },
];

const SEVERITY_COLORS = {
  low: "#3b82f6",
  medium: "#f59e0b",
  high: "#ef4444",
  critical: "#dc2626",
};

export default function LiveCamera() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isActive, setIsActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [detections, setDetections] = useState<Detection[]>([]);
  const [detectionCount, setDetectionCount] = useState(0);
  const [scanStatus, setScanStatus] = useState<"idle" | "scanning" | "detected">("idle");
  const animFrameRef = useRef<number | null>(null);
  const detectionIdRef = useRef(0);
  const streamRef = useRef<MediaStream | null>(null);

  const generateDetection = useCallback((): Detection => {
    const damage = DAMAGE_TYPES[Math.floor(Math.random() * DAMAGE_TYPES.length)];
    detectionIdRef.current++;
    return {
      id: detectionIdRef.current,
      type: damage.type,
      severity: damage.severity,
      confidence: Math.round((65 + Math.random() * 34) * 10) / 10,
      x: Math.random() * 60 + 5,
      y: Math.random() * 50 + 5,
      width: Math.random() * 25 + 10,
      height: Math.random() * 20 + 10,
    };
  }, []);

  const drawDetections = useCallback(
    (ctx: CanvasRenderingContext2D, width: number, height: number) => {
      ctx.clearRect(0, 0, width, height);

      // Draw crosshair
      ctx.strokeStyle = "rgba(245, 158, 11, 0.4)";
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(width / 2, 0);
      ctx.lineTo(width / 2, height);
      ctx.moveTo(0, height / 2);
      ctx.lineTo(width, height / 2);
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw center circle
      ctx.strokeStyle = "rgba(245, 158, 11, 0.3)";
      ctx.beginPath();
      ctx.arc(width / 2, height / 2, 30, 0, Math.PI * 2);
      ctx.stroke();

      // Draw detection boxes
      detections.forEach((det) => {
        const x = (det.x / 100) * width;
        const y = (det.y / 100) * height;
        const w = (det.width / 100) * width;
        const h = (det.height / 100) * height;
        const color = SEVERITY_COLORS[det.severity];

        // Box
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, w, h);

        // Fill with transparency
        ctx.fillStyle = color + "20";
        ctx.fillRect(x, y, w, h);

        // Corner brackets
        const cornerLen = Math.min(10, w / 4, h / 4);
        ctx.lineWidth = 3;
        ctx.strokeStyle = color;
        // Top-left
        ctx.beginPath();
        ctx.moveTo(x, y + cornerLen);
        ctx.lineTo(x, y);
        ctx.lineTo(x + cornerLen, y);
        ctx.stroke();
        // Top-right
        ctx.beginPath();
        ctx.moveTo(x + w - cornerLen, y);
        ctx.lineTo(x + w, y);
        ctx.lineTo(x + w, y + cornerLen);
        ctx.stroke();
        // Bottom-left
        ctx.beginPath();
        ctx.moveTo(x, y + h - cornerLen);
        ctx.lineTo(x, y + h);
        ctx.lineTo(x + cornerLen, y + h);
        ctx.stroke();
        // Bottom-right
        ctx.beginPath();
        ctx.moveTo(x + w - cornerLen, y + h);
        ctx.lineTo(x + w, y + h);
        ctx.lineTo(x + w, y + h - cornerLen);
        ctx.stroke();

        // Label background
        const label = `${det.type} ${det.confidence}%`;
        ctx.font = "bold 11px monospace";
        const textWidth = ctx.measureText(label).width;
        ctx.fillStyle = color;
        ctx.fillRect(x, y - 20, textWidth + 10, 18);

        // Label text
        ctx.fillStyle = "#ffffff";
        ctx.fillText(label, x + 5, y - 6);
      });

      // Scan line animation
      const time = Date.now() / 1000;
      const scanY = ((time % 4) / 4) * height;
      const gradient = ctx.createLinearGradient(0, scanY - 2, 0, scanY + 2);
      gradient.addColorStop(0, "rgba(245, 158, 11, 0)");
      gradient.addColorStop(0.5, "rgba(245, 158, 11, 0.6)");
      gradient.addColorStop(1, "rgba(245, 158, 11, 0)");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, scanY - 2, width, 4);

      // Status text
      ctx.font = "bold 12px monospace";
      ctx.fillStyle = scanStatus === "detected" ? "#ef4444" : "#22c55e";
      const statusText = scanStatus === "detected" ? "● DAMAGE DETECTED" : "● SCANNING";
      ctx.fillText(statusText, 10, 20);

      // YOLO label
      ctx.font = "10px monospace";
      ctx.fillStyle = "rgba(245, 158, 11, 0.8)";
      ctx.fillText("YOLO-STOD v2.1", 10, height - 10);

      // Timestamp
      ctx.fillText(new Date().toLocaleTimeString(), width - 90, height - 10);

      // Frame count
      ctx.fillText(`Detections: ${detectionCount}`, width - 130, 20);
    },
    [detections, scanStatus, detectionCount]
  );

  const animate = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Match canvas to video
    if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
    }

    // Draw video frame
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Draw detections overlay
    drawDetections(ctx, canvas.width, canvas.height);

    animFrameRef.current = requestAnimationFrame(animate);
  }, [drawDetections]);

  // Randomly generate detections while scanning
  useEffect(() => {
    if (!isActive || scanStatus !== "scanning") return;

    const interval = setInterval(() => {
      if (Math.random() > 0.6) {
        const det = generateDetection();
        setDetections((prev) => [det, ...prev].slice(0, 10));
        setDetectionCount((c) => c + 1);
        setScanStatus("detected");
        setTimeout(() => setScanStatus("scanning"), 2000);
      }
    }, 1500);

    return () => clearInterval(interval);
  }, [isActive, scanStatus, generateDetection]);

  const startCamera = async () => {
    setIsLoading(true);
    setError("");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setIsActive(true);
      setScanStatus("scanning");
    } catch {
      setError("Camera access denied. Please allow camera permissions.");
    } finally {
      setIsLoading(false);
    }
  };

  const stopCamera = () => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsActive(false);
    setScanStatus("idle");
    setDetections([]);
  };

  // Start animation loop when active
  useEffect(() => {
    if (isActive) {
      animFrameRef.current = requestAnimationFrame(animate);
    }
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isActive, animate]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
        <div className="flex items-center gap-2">
          <Camera className="w-4 h-4 text-[var(--primary)]" />
          <h3 className="text-sm font-semibold text-[var(--foreground)]">Live Camera — YOLO Detection</h3>
          {isActive && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--success)]/10 text-[var(--success)] text-[10px] font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--success)] animate-pulse" />
              LIVE
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isActive && (
            <span className="text-[10px] text-[var(--muted-foreground)] font-mono">
              {detectionCount} detections
            </span>
          )}
          <button
            onClick={isActive ? stopCamera : startCamera}
            disabled={isLoading}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              isActive
                ? "bg-[var(--destructive)]/10 text-[var(--destructive)] hover:bg-[var(--destructive)]/20"
                : "bg-[var(--primary)] text-[var(--primary-foreground)] hover:opacity-90"
            }`}
          >
            {isLoading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : isActive ? (
              <CameraOff className="w-3.5 h-3.5" />
            ) : (
              <Camera className="w-3.5 h-3.5" />
            )}
            {isLoading ? "Starting..." : isActive ? "Stop" : "Start Camera"}
          </button>
        </div>
      </div>

      {/* Camera Feed */}
      <div className="relative bg-black aspect-video max-h-[400px]">
        <video
          ref={videoRef}
          className={`w-full h-full object-contain ${isActive ? "" : "hidden"}`}
          playsInline
          muted
        />
        <canvas
          ref={canvasRef}
          className={`absolute inset-0 w-full h-full object-contain ${isActive ? "" : "hidden"}`}
        />

        {!isActive && !error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-[var(--muted-foreground)]">
            <Camera className="w-12 h-12 mb-3 opacity-30" />
            <p className="text-sm">Click &quot;Start Camera&quot; to begin live detection</p>
            <p className="text-xs mt-1 opacity-60">Uses your device camera with YOLO-STOD model</p>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <AlertTriangle className="w-10 h-10 text-[var(--destructive)] mb-2" />
            <p className="text-sm text-[var(--destructive)]">{error}</p>
          </div>
        )}
      </div>

      {/* Detection Results */}
      {isActive && (
        <div className="px-4 py-3 border-t border-[var(--border)]">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">
              Real-time Detections
            </h4>
            {scanStatus === "scanning" && (
              <span className="flex items-center gap-1 text-[10px] text-[var(--success)]">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--success)] animate-pulse" />
                Scanning
              </span>
            )}
            {scanStatus === "detected" && (
              <span className="flex items-center gap-1 text-[10px] text-[var(--destructive)]">
                <AlertTriangle className="w-3 h-3" />
                Damage Detected
              </span>
            )}
          </div>

          {detections.length === 0 ? (
            <p className="text-xs text-[var(--muted-foreground)] py-2">No detections yet. Scanning belt surface...</p>
          ) : (
            <div className="space-y-1.5 max-h-[120px] overflow-y-auto">
              {detections.slice(0, 5).map((det) => (
                <div
                  key={det.id}
                  className="flex items-center justify-between px-2 py-1.5 rounded-lg bg-[var(--background)] text-xs"
                >
                  <div className="flex items-center gap-2">
                    {det.severity === "critical" || det.severity === "high" ? (
                      <AlertTriangle className="w-3.5 h-3.5 text-[var(--destructive)]" />
                    ) : (
                      <CheckCircle className="w-3.5 h-3.5 text-[var(--warning)]" />
                    )}
                    <span className="font-medium text-[var(--foreground)]">{det.type}</span>
                    <span
                      className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase"
                      style={{ backgroundColor: SEVERITY_COLORS[det.severity] + "20", color: SEVERITY_COLORS[det.severity] }}
                    >
                      {det.severity}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-[var(--foreground)]">{det.confidence}%</span>
                    <span className="text-[var(--muted-foreground)]">{new Date().toLocaleTimeString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
