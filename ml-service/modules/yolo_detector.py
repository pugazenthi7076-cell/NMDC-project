"""
YOLO Object Detection Module for Industrial Belt Monitoring
Uses YOLOv8 for real-time defect detection on conveyor belts.

Classes:
  0: belt_tear
  1: surface_crack
  2: splice_failure
  3: edge_damage
  4: abrasion
  5: misalignment
  6: foreign_object
"""

import numpy as np
import cv2
import os
import json
from typing import Dict, List, Optional, Tuple

# Try importing ultralytics; fall back to simulated mode
try:
    from ultralytics import YOLO
    YOLO_AVAILABLE = True
except ImportError:
    YOLO_AVAILABLE = False

# Damage classes
DAMAGE_CLASSES = {
    0: {"name": "belt_tear", "severity": "critical", "color": (0, 0, 255)},
    1: {"name": "surface_crack", "severity": "high", "color": (0, 128, 255)},
    2: {"name": "splice_failure", "severity": "critical", "color": (0, 0, 200)},
    3: {"name": "edge_damage", "severity": "high", "color": (0, 255, 255)},
    4: {"name": "abrasion", "severity": "medium", "color": (0, 255, 0)},
    5: {"name": "misalignment", "severity": "medium", "color": (255, 255, 0)},
    6: {"name": "foreign_object", "severity": "high", "color": (255, 0, 255)},
}


class BeltYOLODetector:
    """YOLO-based real-time belt defect detector."""

    def __init__(self, model_path: Optional[str] = None, confidence: float = 0.5):
        self.confidence = confidence
        self.model = None
        self.model_loaded = False

        # Try loading YOLO model
        if model_path and os.path.exists(model_path):
            try:
                self.model = YOLO(model_path)
                self.model_loaded = True
            except Exception as e:
                print(f"  [WARN] Could not load YOLO model: {e}")

        if not self.model_loaded:
            print("  [INFO] Running in simulated YOLO mode (no model file)")

    def detect_real(self, image: np.ndarray) -> List[Dict]:
        """Run real YOLO inference on an image."""
        results = self.model(image, conf=self.confidence, verbose=False)
        detections = []

        for result in results:
            boxes = result.boxes
            if boxes is None:
                continue
            for box in boxes:
                cls_id = int(box.cls[0])
                conf = float(box.conf[0])
                x1, y1, x2, y2 = box.xyxy[0].tolist()

                class_info = DAMAGE_CLASSES.get(cls_id, {"name": "unknown", "severity": "medium", "color": (128, 128, 128)})

                detections.append({
                    "class_id": cls_id,
                    "class_name": class_info["name"],
                    "confidence": round(conf, 3),
                    "bbox": [int(x1), int(y1), int(x2 - x1), int(y2 - y1)],
                    "bbox_xyxy": [round(v, 1) for v in [x1, y1, x2, y2]],
                    "severity": class_info["severity"],
                    "color": class_info["color"],
                })

        return detections

    def detect_simulated(self, image_shape: Tuple) -> List[Dict]:
        """Generate realistic simulated detections for demo purposes."""
        h, w = image_shape[:2]
        np.random.seed()

        # Random number of detections (0-4)
        num_detections = np.random.choice([0, 0, 1, 1, 1, 2, 2, 3], p=[0.15, 0.1, 0.2, 0.15, 0.1, 0.1, 0.1, 0.1])

        detections = []
        for _ in range(num_detections):
            cls_id = np.random.choice(list(DAMAGE_CLASSES.keys()),
                                       p=[0.1, 0.2, 0.05, 0.2, 0.25, 0.15, 0.05])
            conf = np.random.uniform(0.45, 0.98)
            class_info = DAMAGE_CLASSES[cls_id]

            # Generate bbox within image
            bw = np.random.randint(30, min(150, w // 3))
            bh = np.random.randint(20, min(100, h // 3))
            bx = np.random.randint(0, max(1, w - bw))
            by = np.random.randint(0, max(1, h - bh))

            detections.append({
                "class_id": cls_id,
                "class_name": class_info["name"],
                "confidence": round(float(conf), 3),
                "bbox": [int(bx), int(by), int(bw), int(bh)],
                "bbox_xyxy": [float(bx), float(by), float(bx + bw), float(by + bh)],
                "severity": class_info["severity"],
                "color": class_info["color"],
            })

        return detections

    def detect(self, image: np.ndarray) -> List[Dict]:
        """Run detection (real or simulated)."""
        if self.model_loaded and self.model is not None:
            return self.detect_real(image)
        return self.detect_simulated(image.shape)

    def draw_detections(self, image: np.ndarray, detections: List[Dict]) -> np.ndarray:
        """Draw YOLO detection bounding boxes on image with labels."""
        annotated = image.copy()

        for det in detections:
            x, y, w, h = det["bbox"]
            color = det.get("color", (0, 255, 0))
            conf = det["confidence"]
            label = det["class_name"]

            # Draw corner brackets style (CCTV look)
            bracket_len = min(20, w // 4, h // 4)

            # Top-left corner
            cv2.line(annotated, (x, y), (x + bracket_len, y), color, 2)
            cv2.line(annotated, (x, y), (x, y + bracket_len), color, 2)
            # Top-right corner
            cv2.line(annotated, (x + w, y), (x + w - bracket_len, y), color, 2)
            cv2.line(annotated, (x + w, y), (x + w, y + bracket_len), color, 2)
            # Bottom-left corner
            cv2.line(annotated, (x, y + h), (x + bracket_len, y + h), color, 2)
            cv2.line(annotated, (x, y + h), (x, y + h - bracket_len), color, 2)
            # Bottom-right corner
            cv2.line(annotated, (x + w, y + h), (x + w - bracket_len, y + h), color, 2)
            cv2.line(annotated, (x + w, y + h), (x + w, y + h - bracket_len), color, 2)

            # Label background
            label_text = f"{label} {conf:.0%}"
            (tw, th), _ = cv2.getTextSize(label_text, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 1)
            cv2.rectangle(annotated, (x, y - th - 8), (x + tw + 4, y), color, -1)
            cv2.putText(annotated, label_text, (x + 2, y - 4),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)

        return annotated

    def get_detection_summary(self, detections: List[Dict]) -> Dict:
        """Summarize detection results."""
        if not detections:
            return {
                "total": 0,
                "by_type": {},
                "by_severity": {},
                "overall_severity": "normal",
                "needs_action": False,
            }

        by_type = {}
        by_severity = {"critical": 0, "high": 0, "medium": 0, "low": 0}

        for det in detections:
            name = det["class_name"]
            sev = det["severity"]
            by_type[name] = by_type.get(name, 0) + 1
            by_severity[sev] = by_severity.get(sev, 0) + 1

        # Overall severity is the highest detected
        if by_severity["critical"] > 0:
            overall = "critical"
        elif by_severity["high"] > 0:
            overall = "high"
        elif by_severity["medium"] > 0:
            overall = "medium"
        else:
            overall = "low"

        avg_conf = np.mean([d["confidence"] for d in detections])

        return {
            "total": len(detections),
            "by_type": by_type,
            "by_severity": by_severity,
            "overall_severity": overall,
            "avg_confidence": round(float(avg_conf), 3),
            "needs_action": overall in ["critical", "high"],
        }
