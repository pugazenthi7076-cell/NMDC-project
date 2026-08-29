"""
Sensor Fusion Module for Industrial Belt Monitoring
Combines data from all 7 sensor types for comprehensive health assessment.
Uses weighted voting, Bayesian fusion, and correlation analysis.
"""

import numpy as np
from typing import Dict, List, Optional
from datetime import datetime


# Sensor weights for fusion (learned from importance)
SENSOR_WEIGHTS = {
    "vibration": 0.20,
    "temperature": 0.15,
    "motor_current": 0.15,
    "acoustic": 0.10,
    "load_tension": 0.15,
    "electromagnetic": 0.10,
    "camera_ai": 0.15,
}

# Sensor reliability scores
SENSOR_RELIABILITY = {
    "vibration": 0.92,
    "temperature": 0.95,
    "motor_current": 0.90,
    "acoustic": 0.85,
    "load_tension": 0.88,
    "electromagnetic": 0.82,
    "camera_ai": 0.93,
}


class SensorFusionEngine:
    """Fuses multiple sensor inputs into a unified health assessment."""

    def __init__(self):
        self.sensor_weights = SENSOR_WEIGHTS.copy()
        self.reliability = SENSOR_RELIABILITY.copy()

    def compute_weighted_health(self, sensor_scores: Dict[str, float]) -> Dict:
        """
        Compute weighted health score from all sensors.
        Each sensor_score is 0-100 (100 = perfect health).
        """
        available_sensors = {k: v for k, v in sensor_scores.items() if v is not None}

        if not available_sensors:
            return {"health_score": 0, "confidence": 0, "sensors_used": 0}

        total_weight = 0
        weighted_sum = 0

        for sensor, score in available_sensors.items():
            w = self.sensor_weights.get(sensor, 0.1) * self.reliability.get(sensor, 0.8)
            weighted_sum += score * w
            total_weight += w

        health_score = weighted_sum / total_weight if total_weight > 0 else 0
        confidence = min(1.0, total_weight / sum(self.sensor_weights.values()))

        return {
            "health_score": round(float(health_score), 1),
            "confidence": round(float(confidence), 3),
            "sensors_used": len(available_sensors),
            "total_sensors": len(SENSOR_WEIGHTS),
        }

    def bayesian_fusion(self, sensor_anomalies: Dict[str, Dict]) -> Dict:
        """
        Bayesian sensor fusion for anomaly probability.
        Each sensor returns { anomaly: bool, score: float }.
        """
        # Prior probability of anomaly (from historical data)
        prior_anomaly = 0.15

        # Convert scores to probabilities
        p_anomaly_given_sensor = {}
        for sensor, result in sensor_anomalies.items():
            if result is None:
                continue
            score = result.get("score", 0)
            is_anomaly = result.get("anomaly", False)

            # Likelihood: P(sensor_reading | anomaly)
            if is_anomaly:
                p_given_anomaly = 0.5 + score * 0.4  # 0.5 - 0.9
            else:
                p_given_anomaly = 0.1 + score * 0.3  # 0.1 - 0.4

            # P(sensor_reading | no anomaly)
            p_given_normal = 1 - p_given_anomaly

            p_anomaly_given_sensor[sensor] = {
                "likelihood_anomaly": p_given_anomaly,
                "likelihood_normal": p_given_normal,
            }

        if not p_anomaly_given_sensor:
            return {"anomaly_probability": prior_anomaly, "confidence": 0}

        # Bayesian update
        p_anomaly = prior_anomaly
        p_normal = 1 - prior_anomaly

        for sensor, likelihoods in p_anomaly_given_sensor.items():
            weight = self.sensor_weights.get(sensor, 0.1)
            la = likelihoods["likelihood_anomaly"]
            ln = likelihoods["likelihood_normal"]

            # Weighted Bayesian update
            p_anomaly_new = (la * p_anomaly) ** weight
            p_normal_new = (ln * p_normal) ** weight

            total = p_anomaly_new + p_normal_new
            if total > 0:
                p_anomaly = p_anomaly_new / total
                p_normal = p_normal_new / total

        confidence = 1 - abs(p_anomaly - p_normal)

        return {
            "anomaly_probability": round(float(p_anomaly), 4),
            "is_anomalous": p_anomaly > 0.5,
            "confidence": round(float(confidence), 3),
            "posterior_odds": round(float(p_anomaly / p_normal), 3) if p_normal > 0 else float("inf"),
        }

    def cross_sensor_correlation(self, sensor_data: Dict[str, List[float]]) -> Dict:
        """Analyze correlations between different sensor signals."""
        correlations = {}
        sensors = list(sensor_data.keys())

        for i, s1 in enumerate(sensors):
            for s2 in sensors[i + 1:]:
                d1 = sensor_data[s1]
                d2 = sensor_data[s2]
                min_len = min(len(d1), len(d2))
                if min_len < 2:
                    continue
                arr1 = np.array(d1[:min_len])
                arr2 = np.array(d2[:min_len])

                corr = np.corrcoef(arr1, arr2)[0, 1]
                correlations[f"{s1}_vs_{s2}"] = round(float(corr), 3)

        # Find strong correlations (potential root cause)
        strong_correlations = {
            k: v for k, v in correlations.items()
            if abs(v) > 0.7
        }

        return {
            "correlations": correlations,
            "strong_correlations": strong_correlations,
            "root_cause_hint": self._infer_root_cause(strong_correlations),
        }

    def _infer_root_cause(self, strong_correlations: Dict[str, float]) -> Optional[str]:
        """Infer likely root cause from cross-sensor correlations."""
        if not strong_correlations:
            return None

        for pair, corr in strong_correlations.items():
            if "vibration" in pair and "temperature" in pair:
                return "bearing_degradation"
            if "vibration" in pair and "motor_current" in pair:
                return "mechanical_resistance"
            if "acoustic" in pair and "vibration" in pair:
                return "component_wear"
            if "load_tension" in pair and "vibration" in pair:
                return "belt_overstress"
            if "electromagnetic" in pair and "vibration" in pair:
                return "internal_structure_damage"

        return "multi_sensor_anomaly"

    def fuse_all(self, sensor_data: Dict) -> Dict:
        """Complete sensor fusion pipeline."""
        # Extract sensor scores
        sensor_scores = {}
        sensor_anomalies = {}

        for sensor in SENSOR_WEIGHTS:
            data = sensor_data.get(sensor)
            if data is None:
                continue

            # Convert sensor data to health score
            if isinstance(data, dict):
                if "health_score" in data:
                    sensor_scores[sensor] = data["health_score"]
                elif "anomaly" in data:
                    score = 100 - (data.get("score", 0) * 100)
                    sensor_scores[sensor] = score
                    sensor_anomalies[sensor] = data
                elif "anomaly_score" in data:
                    score = 100 - (data["anomaly_score"] * 100)
                    sensor_scores[sensor] = score
                    sensor_anomalies[sensor] = {"anomaly": data["anomaly_score"] > 0.3, "score": data["anomaly_score"]}
            elif isinstance(data, (int, float)):
                sensor_scores[sensor] = data

        # Weighted health
        health = self.compute_weighted_health(sensor_scores)

        # Bayesian anomaly fusion
        bayesian = self.bayesian_fusion(sensor_anomalies) if sensor_anomalies else {"anomaly_probability": 0, "confidence": 0}

        # Determine overall status
        if health["health_score"] >= 85:
            status = "healthy"
        elif health["health_score"] >= 70:
            status = "warning"
        elif health["health_score"] >= 50:
            status = "degraded"
        else:
            status = "critical"

        return {
            "fused_health_score": health["health_score"],
            "fused_status": status,
            "confidence": health["confidence"],
            "sensors_used": health["sensors_used"],
            "anomaly_probability": bayesian.get("anomaly_probability", 0),
            "is_anomalous": bayesian.get("is_anomalous", False),
            "sensor_scores": sensor_scores,
            "timestamp": datetime.now().isoformat(),
        }


# Singleton instance
fusion_engine = SensorFusionEngine()
