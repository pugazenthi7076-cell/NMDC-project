"""
OpenCV Image Processing Module for Industrial Belt Monitoring
Analyzes conveyor belt images for surface defects, cracks, tears, and misalignment.
"""

import cv2
import numpy as np
from typing import Dict, List, Tuple, Optional
import base64
import io


class BeltImageProcessor:
    """Process belt images using OpenCV for damage detection."""

    # Damage type thresholds
    CRACK_MIN_LENGTH = 30
    TEAR_MIN_AREA = 500
    ABRASION_MIN_AREA = 200
    EDGE_TOLERANCE = 15

    def __init__(self):
        """Initialize processor with detection kernels."""
        # Edge detection kernels
        self.sobel_x = np.array([[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]], dtype=np.float32)
        self.sobel_y = np.array([[-1, -2, -1], [0, 0, 0], [1, 2, 1]], dtype=np.float32)

        # Morphological kernels
        self.kernel_small = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
        self.kernel_medium = cv2.getStructuringElement(cv2.MORPH_RECT, (5, 5))
        self.kernel_large = cv2.getStructuringElement(cv2.MORPH_RECT, (9, 9))

    def decode_image(self, image_data: str) -> np.ndarray:
        """Decode base64 image to OpenCV format."""
        if "," in image_data:
            image_data = image_data.split(",")[1]
        img_bytes = base64.b64decode(image_data)
        nparr = np.frombuffer(img_bytes, np.uint8)
        return cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    def preprocess(self, image: np.ndarray) -> Dict[str, np.ndarray]:
        """Preprocess image into multiple color spaces and edge maps."""
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        blurred = cv2.GaussianBlur(gray, (5, 5), 0)

        # Canny edges at multiple thresholds
        edges_low = cv2.Canny(blurred, 50, 150)
        edges_high = cv2.Canny(blurred, 100, 300)

        # Adaptive threshold for varying lighting
        adaptive = cv2.adaptiveThreshold(
            blurred, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
            cv2.THRESH_BINARY_INV, 11, 2
        )

        # HSV for color-based defect detection
        hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)

        return {
            "original": image,
            "gray": gray,
            "blurred": blurred,
            "edges_low": edges_low,
            "edges_high": edges_high,
            "adaptive": adaptive,
            "hsv": hsv,
        }

    def detect_cracks(self, preprocessed: Dict[str, np.ndarray]) -> List[Dict]:
        """Detect crack-like structures using morphological operations."""
        edges = preprocessed["edges_high"]

        # Thin the edges to get crack-like structures
        skeleton = cv2.ximgproc.thinning(edges) if hasattr(cv2, 'ximgproc') else edges

        # Find contours
        contours, _ = cv2.findContours(skeleton, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

        cracks = []
        for contour in contours:
            # Filter by length (cracks are long and thin)
            perimeter = cv2.arcLength(contour, True)
            if perimeter < self.CRACK_MIN_LENGTH:
                continue

            # Calculate aspect ratio (cracks have high aspect ratio)
            rect = cv2.minAreaRect(contour)
            width, height = rect[1]
            if min(width, height) < 1:
                continue
            aspect_ratio = max(width, height) / min(width, height)

            if aspect_ratio > 3.0:  # Cracks are elongated
                x, y, w, h = cv2.boundingRect(contour)
                severity = "high" if perimeter > 100 else "medium" if perimeter > 50 else "low"
                cracks.append({
                    "type": "crack",
                    "bbox": [int(x), int(y), int(w), int(h)],
                    "length": round(float(perimeter), 1),
                    "aspect_ratio": round(float(aspect_ratio), 2),
                    "severity": severity,
                    "confidence": min(0.95, 0.5 + perimeter / 200),
                })

        return cracks

    def detect_tears(self, preprocessed: Dict[str, np.ndarray]) -> List[Dict]:
        """Detect tears using contour area analysis."""
        adaptive = preprocessed["adaptive"]

        # Morphological closing to connect nearby regions
        closed = cv2.morphologyEx(adaptive, cv2.MORPH_CLOSE, self.kernel_large)

        contours, _ = cv2.findContours(closed, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

        tears = []
        for contour in contours:
            area = cv2.contourArea(contour)
            if area < self.TEAR_MIN_AREA:
                continue

            # Tears have irregular shapes (high convexity defect)
            hull = cv2.convexHull(contour)
            hull_area = cv2.contourArea(hull)
            solidity = area / hull_area if hull_area > 0 else 0

            if solidity < 0.7:  # Irregular shape suggests tear
                x, y, w, h = cv2.boundingRect(contour)
                severity = "critical" if area > 2000 else "high" if area > 1000 else "medium"
                tears.append({
                    "type": "tear",
                    "bbox": [int(x), int(y), int(w), int(h)],
                    "area": int(area),
                    "solidity": round(float(solidity), 3),
                    "severity": severity,
                    "confidence": min(0.95, 0.6 + (1 - solidity) * 0.4),
                })

        return tears

    def detect_surface_defects(self, preprocessed: Dict[str, np.ndarray]) -> List[Dict]:
        """Detect surface abrasion and wear patterns."""
        gray = preprocessed["blurred"]

        # Local Binary Pattern approximation using texture analysis
        # Calculate local variance as a proxy for texture
        mean = cv2.blur(gray, (15, 15))
        sq_mean = cv2.blur(gray.astype(np.float32) ** 2, (15, 15))
        variance = np.maximum(sq_mean - mean.astype(np.float32) ** 2, 0)
        std_dev = np.sqrt(variance).astype(np.uint8)

        # High variance regions = texture anomalies (abrasion)
        _, thresh = cv2.threshold(std_dev, 30, 255, cv2.THRESH_BINARY)

        # Clean up
        cleaned = cv2.morphologyEx(thresh, cv2.MORPH_OPEN, self.kernel_small)
        cleaned = cv2.morphologyEx(cleaned, cv2.MORPH_CLOSE, self.kernel_medium)

        contours, _ = cv2.findContours(cleaned, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

        defects = []
        for contour in contours:
            area = cv2.contourArea(contour)
            if area < self.ABRASION_MIN_AREA:
                continue

            x, y, w, h = cv2.boundingRect(contour)
            severity = "high" if area > 1500 else "medium" if area > 800 else "low"
            defects.append({
                "type": "abrasion",
                "bbox": [int(x), int(y), int(w), int(h)],
                "area": int(area),
                "severity": severity,
                "confidence": min(0.9, 0.5 + area / 3000),
            })

        return defects

    def detect_edge_damage(self, preprocessed: Dict[str, np.ndarray], image_shape: Tuple) -> List[Dict]:
        """Detect edge damage along belt margins."""
        edges = preprocessed["edges_low"]
        h, w = image_shape[:2]

        # Define edge zones (top and bottom margins)
        edge_zone_height = int(h * 0.1)
        top_zone = edges[:edge_zone_height, :]
        bottom_zone = edges[h - edge_zone_height:, :]

        damages = []
        for zone, zone_name in [(top_zone, "top_edge"), (bottom_zone, "bottom_edge")]:
            # Count edge pixels
            edge_density = np.sum(zone > 0) / zone.size

            if edge_density > 0.15:  # More than 15% edge pixels = damage
                contours, _ = cv2.findContours(zone, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
                for contour in contours:
                    area = cv2.contourArea(contour)
                    if area > 100:
                        x, y, w_zone, h_zone = cv2.boundingRect(contour)
                        y_offset = 0 if zone_name == "top_edge" else h - edge_zone_height
                        severity = "high" if edge_density > 0.3 else "medium"
                        damages.append({
                            "type": "edge_damage",
                            "zone": zone_name,
                            "bbox": [int(x), int(y + y_offset), int(w_zone), int(h_zone)],
                            "edge_density": round(float(edge_density), 3),
                            "area": int(area),
                            "severity": severity,
                            "confidence": min(0.9, 0.4 + edge_density),
                        })

        return damages

    def detect_misalignment(self, preprocessed: Dict[str, np.ndarray], image_shape: Tuple) -> Dict:
        """Detect belt misalignment using Hough line detection."""
        edges = preprocessed["edges_low"]
        h, w = image_shape[:2]

        # Hough line detection
        lines = cv2.HoughLinesP(edges, 1, np.pi / 180, threshold=80,
                                minLineLength=w // 4, maxLineGap=10)

        if lines is None:
            return {"detected": False, "angle": 0, "severity": "none"}

        # Calculate dominant angle
        angles = []
        for line in lines:
            x1, y1, x2, y2 = line[0]
            angle = np.degrees(np.arctan2(y2 - y1, x2 - x1))
            if abs(angle) < 30:  # Filter near-horizontal lines (belt edges)
                angles.append(angle)

        if not angles:
            return {"detected": False, "angle": 0, "severity": "none"}

        avg_angle = np.mean(angles)
        deviation = abs(avg_angle)

        if deviation > 5:
            severity = "critical"
        elif deviation > 2:
            severity = "high"
        elif deviation > 1:
            severity = "medium"
        else:
            severity = "low"

        return {
            "detected": deviation > 1,
            "angle": round(float(avg_angle), 2),
            "deviation_degrees": round(float(deviation), 2),
            "num_lines": len(angles),
            "severity": severity,
            "confidence": min(0.95, 0.5 + deviation / 10),
        }

    def analyze_image(self, image_data: str) -> Dict:
        """Complete belt image analysis pipeline."""
        image = self.decode_image(image_data)
        if image is None:
            return {"error": "Invalid image data"}

        preprocessed = self.preprocess(image)
        h, w = image.shape[:2]

        # Run all detectors
        cracks = self.detect_cracks(preprocessed)
        tears = self.detect_tears(preprocessed)
        defects = self.detect_surface_defects(preprocessed)
        edge_damage = self.detect_edge_damage(preprocessed, image.shape)
        misalignment = self.detect_misalignment(preprocessed, image.shape)

        all_detections = cracks + tears + defects + edge_damage

        # Calculate overall damage score
        total_area = sum(d.get("area", d.get("length", 50)) for d in all_detections)
        damage_percentage = min(100, (total_area / (h * w)) * 100 * 10)

        # Count by severity
        severity_counts = {"critical": 0, "high": 0, "medium": 0, "low": 0}
        for d in all_detections:
            sev = d.get("severity", "low")
            severity_counts[sev] = severity_counts.get(sev, 0) + 1

        return {
            "image_size": {"width": w, "height": h},
            "detections": {
                "cracks": cracks,
                "tears": tears,
                "surface_defects": defects,
                "edge_damage": edge_damage,
            },
            "misalignment": misalignment,
            "summary": {
                "total_detections": len(all_detections),
                "damage_percentage": round(damage_percentage, 1),
                "severity_counts": severity_counts,
                "health_score": round(max(0, 100 - damage_percentage), 1),
                "needs_attention": any(d["severity"] in ["critical", "high"] for d in all_detections),
            },
        }


def process_frame_base64(base64_image: str) -> Dict:
    """Convenience function to process a single base64 frame."""
    processor = BeltImageProcessor()
    return processor.analyze_image(base64_image)
