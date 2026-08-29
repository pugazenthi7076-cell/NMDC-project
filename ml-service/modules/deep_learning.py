"""
1D-CNN and LSTM Models for Time-Series Anomaly Detection
Detects unusual patterns in vibration, temperature, motor current, and acoustic signals.
"""

import numpy as np
from typing import Dict, List, Optional, Tuple
import os
import pickle
import json

# Try importing tensorflow; fall back to numpy-based detection
try:
    import tensorflow as tf
    from tensorflow import keras
    from tensorflow.keras import layers
    TF_AVAILABLE = True
except ImportError:
    TF_AVAILABLE = False


class VibrationAnomalyDetector:
    """1D-CNN model for vibration anomaly detection."""

    def __init__(self, sequence_length: int = 100, threshold: float = 0.15):
        self.sequence_length = sequence_length
        self.threshold = threshold
        self.model = None
        self.scaler_mean = None
        self.scaler_std = None

    def build_model(self):
        """Build 1D-CNN architecture for vibration analysis."""
        if not TF_AVAILABLE:
            return None

        model = keras.Sequential([
            layers.Input(shape=(self.sequence_length, 1)),
            layers.Conv1D(32, kernel_size=5, activation="relu", padding="same"),
            layers.BatchNormalization(),
            layers.MaxPooling1D(pool_size=2),
            layers.Conv1D(64, kernel_size=3, activation="relu", padding="same"),
            layers.BatchNormalization(),
            layers.MaxPooling1D(pool_size=2),
            layers.Conv1D(32, kernel_size=3, activation="relu", padding="same"),
            layers.Flatten(),
            layers.Dense(64, activation="relu"),
            layers.Dropout(0.3),
            layers.Dense(self.sequence_length, activation="linear"),
        ])
        model.compile(optimizer="adam", loss="mse")
        return model

    def extract_vibration_features(self, signal: np.ndarray) -> Dict:
        """Extract features from vibration signal."""
        if len(signal) == 0:
            return {}

        # Time-domain features
        rms = np.sqrt(np.mean(signal ** 2))
        peak = np.max(np.abs(signal))
        crest_factor = peak / rms if rms > 0 else 0
        kurtosis = float(np.mean((signal - np.mean(signal)) ** 4) / (np.std(signal) ** 4)) if np.std(signal) > 0 else 0
        skewness = float(np.mean((signal - np.mean(signal)) ** 3) / (np.std(signal) ** 3)) if np.std(signal) > 0 else 0

        # Frequency-domain features (simple FFT)
        fft_vals = np.abs(np.fft.rfft(signal))
        fft_freqs = np.fft.rfftfreq(len(signal))

        dominant_freq = float(fft_freqs[np.argmax(fft_vals[1:]) + 1]) if len(fft_vals) > 1 else 0
        spectral_centroid = float(np.sum(fft_freqs * fft_vals) / np.sum(fft_vals)) if np.sum(fft_vals) > 0 else 0
        spectral_spread = float(np.sqrt(np.sum(((fft_freqs - spectral_centroid) ** 2) * fft_vals) / np.sum(fft_vals))) if np.sum(fft_vals) > 0 else 0

        # Band energy ratios
        n = len(fft_vals)
        low_band = np.sum(fft_vals[:n // 5])
        mid_band = np.sum(fft_vals[n // 5:2 * n // 5])
        high_band = np.sum(fft_vals[2 * n // 5:])
        total_energy = low_band + mid_band + high_band

        return {
            "rms": round(float(rms), 4),
            "peak": round(float(peak), 4),
            "crest_factor": round(float(crest_factor), 4),
            "kurtosis": round(float(kurtosis), 4),
            "skewness": round(float(skewness), 4),
            "dominant_freq": round(float(dominant_freq), 6),
            "spectral_centroid": round(float(spectral_centroid), 6),
            "spectral_spread": round(float(spectral_spread), 6),
            "low_band_energy": round(float(low_band / total_energy), 4) if total_energy > 0 else 0,
            "mid_band_energy": round(float(mid_band / total_energy), 4) if total_energy > 0 else 0,
            "high_band_energy": round(float(high_band / total_energy), 4) if total_energy > 0 else 0,
        }

    def detect_anomaly(self, signal: np.ndarray) -> Dict:
        """Detect anomalies in a vibration signal."""
        features = self.extract_vibration_features(signal)

        if not features:
            return {"anomaly": False, "score": 0, "features": {}}

        # Rule-based anomaly detection (works without TensorFlow)
        anomaly_score = 0
        reasons = []

        # High kurtosis indicates impulsive events (bearing damage)
        if features.get("kurtosis", 0) > 5:
            anomaly_score += 0.3
            reasons.append("High kurtosis (impulsive events)")

        # High crest factor indicates peaks (early bearing damage)
        if features.get("crest_factor", 0) > 3:
            anomaly_score += 0.2
            reasons.append("High crest factor")

        # Abnormal spectral centroid
        if features.get("spectral_centroid", 0) > 0.3:
            anomaly_score += 0.2
            reasons.append("High frequency energy shift")

        # High frequency energy ratio
        if features.get("high_band_energy", 0) > 0.4:
            anomaly_score += 0.15
            reasons.append("Excessive high frequency energy")

        # Low RMS could indicate sensor failure or belt stoppage
        if features.get("rms", 0) < 0.01:
            anomaly_score += 0.1
            reasons.append("Very low RMS (possible sensor issue)")

        anomaly_score = min(1.0, anomaly_score)
        is_anomaly = anomaly_score > self.threshold

        # Classify fault type based on features
        fault_type = "none"
        if is_anomaly:
            if features.get("kurtosis", 0) > 5:
                fault_type = "bearing_fault"
            elif features.get("high_band_energy", 0) > 0.5:
                fault_type = "gearbox_issue"
            elif features.get("crest_factor", 0) > 4:
                fault_type = "pulley_misalignment"
            else:
                fault_type = "belt_vibration"

        return {
            "anomaly": is_anomaly,
            "score": round(anomaly_score, 3),
            "fault_type": fault_type,
            "reasons": reasons,
            "features": features,
            "severity": "critical" if anomaly_score > 0.7 else "high" if anomaly_score > 0.5 else "medium" if anomaly_score > 0.3 else "low",
        }


class TemperatureAnomalyDetector:
    """LSTM-inspired detector for temperature time-series anomalies."""

    def __init__(self, window_size: int = 20, threshold_std: float = 2.5):
        self.window_size = window_size
        self.threshold_std = threshold_std

    def detect_anomaly(self, temperatures: np.ndarray) -> Dict:
        """Detect temperature anomalies using statistical process control."""
        if len(temperatures) < self.window_size:
            return {"anomaly": False, "score": 0, "trend": "stable"}

        # Moving statistics
        window = temperatures[-self.window_size:]
        moving_mean = np.mean(window)
        moving_std = np.std(window) if np.std(window) > 0 else 1

        current = temperatures[-1]
        z_score = (current - moving_mean) / moving_std

        # Trend detection
        if len(temperatures) >= 10:
            recent = temperatures[-10:]
            slope = np.polyfit(range(len(recent)), recent, 1)[0]
            if slope > 0.5:
                trend = "rising"
            elif slope < -0.5:
                trend = "falling"
            else:
                trend = "stable"
        else:
            trend = "stable"
            slope = 0

        # Rate of change
        if len(temperatures) >= 2:
            rate_of_change = temperatures[-1] - temperatures[-2]
        else:
            rate_of_change = 0

        anomaly_score = min(1.0, abs(z_score) / (self.threshold_std * 2))
        is_anomaly = abs(z_score) > self.threshold_std or current > 75

        # Overheating classification
        if current > 80:
            heat_level = "critical_overheat"
        elif current > 65:
            heat_level = "warning_overheat"
        elif current > 50:
            heat_level = "elevated"
        else:
            heat_level = "normal"

        reasons = []
        if abs(z_score) > self.threshold_std:
            reasons.append(f"Z-score {z_score:.1f} exceeds threshold")
        if trend == "rising":
            reasons.append("Temperature trending upward")
        if heat_level in ["critical_overheat", "warning_overheat"]:
            reasons.append(f"Temperature {current:.1f}C - {heat_level}")

        return {
            "anomaly": is_anomaly,
            "score": round(anomaly_score, 3),
            "current_temp": round(float(current), 1),
            "moving_average": round(float(moving_mean), 1),
            "z_score": round(float(z_score), 2),
            "trend": trend,
            "trend_slope": round(float(slope), 3),
            "rate_of_change": round(float(rate_of_change), 2),
            "heat_level": heat_level,
            "reasons": reasons,
            "severity": "critical" if current > 75 else "high" if current > 60 else "medium" if current > 50 else "low",
        }


class MotorCurrentAnalyzer:
    """Analyze motor current signals for overload and mechanical issues."""

    def __init__(self, nominal_current: float = 200, threshold: float = 1.3):
        self.nominal_current = nominal_current
        self.threshold = threshold

    def analyze(self, current_readings: np.ndarray) -> Dict:
        """Analyze motor current for anomalies."""
        if len(current_readings) == 0:
            return {"anomaly": False}

        mean_current = np.mean(current_readings)
        max_current = np.max(current_readings)
        min_current = np.min(current_readings)
        std_current = np.std(current_readings)

        # Current ratio vs nominal
        load_ratio = mean_current / self.nominal_current if self.nominal_current > 0 else 0

        # Harmonic distortion estimate (simplified)
        fft_vals = np.abs(np.fft.rfft(current_readings))
        fundamental = fft_vals[1] if len(fft_vals) > 1 else 1
        harmonics = np.sum(fft_vals[2:min(10, len(fft_vals))])
        thd = harmonics / fundamental if fundamental > 0 else 0

        # Fluctuation analysis
        fluctuation = std_current / mean_current if mean_current > 0 else 0

        anomaly_score = 0
        reasons = []

        if load_ratio > self.threshold:
            anomaly_score += 0.4
            reasons.append(f"Overload: {load_ratio:.1%} of nominal")
        if max_current > self.nominal_current * 1.5:
            anomaly_score += 0.3
            reasons.append(f"Current spike: {max_current:.0f}A")
        if thd > 0.1:
            anomaly_score += 0.15
            reasons.append("High harmonic distortion (mechanical resistance)")
        if fluctuation > 0.2:
            anomaly_score += 0.15
            reasons.append("High current fluctuation")

        anomaly_score = min(1.0, anomaly_score)

        # Determine issue type
        issue_type = "none"
        if anomaly_score > 0.3:
            if load_ratio > 1.4:
                issue_type = "overload"
            elif thd > 0.15:
                issue_type = "mechanical_resistance"
            elif fluctuation > 0.3:
                issue_type = "loose_component"
            else:
                issue_type = "general_anomaly"

        return {
            "anomaly": anomaly_score > 0.3,
            "score": round(anomaly_score, 3),
            "mean_current": round(float(mean_current), 1),
            "max_current": round(float(max_current), 1),
            "min_current": round(float(min_current), 1),
            "load_ratio": round(float(load_ratio), 3),
            "thd": round(float(thd), 4),
            "fluctuation": round(float(fluctuation), 4),
            "issue_type": issue_type,
            "reasons": reasons,
            "severity": "critical" if anomaly_score > 0.7 else "high" if anomaly_score > 0.5 else "medium" if anomaly_score > 0.3 else "low",
        }


class AcousticAnalyzer:
    """Analyze acoustic signals for unusual sounds."""

    def __init__(self, normal_db_range: Tuple[float, float] = (45, 65)):
        self.normal_min, self.normal_max = normal_db_range

    def analyze(self, acoustic_signal: np.ndarray) -> Dict:
        """Analyze acoustic signal for anomalies."""
        if len(acoustic_signal) == 0:
            return {"anomaly": False}

        mean_db = np.mean(acoustic_signal)
        max_db = np.max(acoustic_signal)
        std_db = np.std(acoustic_signal)

        # Frequency analysis
        fft_vals = np.abs(np.fft.rfft(acoustic_signal))
        fft_freqs = np.fft.rfftfreq(len(acoustic_signal), d=1/44100) if len(acoustic_signal) > 1 else np.array([0])

        # Dominant frequency
        if len(fft_vals) > 1:
            dom_idx = np.argmax(fft_vals[1:]) + 1
            dom_freq = float(fft_freqs[dom_idx])
        else:
            dom_freq = 0

        # Detect unusual sound patterns
        anomaly_score = 0
        reasons = []

        if mean_db > self.normal_max:
            anomaly_score += 0.3
            reasons.append(f"High noise level: {mean_db:.1f} dB")
        if max_db > self.normal_max + 15:
            anomaly_score += 0.3
            reasons.append(f"Noise spike: {max_db:.1f} dB")
        if std_db > 10:
            anomaly_score += 0.2
            reasons.append("High noise variability")

        # High frequency screeching (bearing issue)
        if dom_freq > 5000:
            anomaly_score += 0.2
            reasons.append(f"High frequency screech at {dom_freq:.0f} Hz")

        anomaly_score = min(1.0, anomaly_score)

        sound_type = "normal"
        if anomaly_score > 0.3:
            if dom_freq > 5000:
                sound_type = "screeching"
            elif mean_db > 80:
                sound_type = "grinding"
            elif std_db > 15:
                sound_type = "rattling"
            else:
                sound_type = "abnormal"

        return {
            "anomaly": anomaly_score > 0.3,
            "score": round(anomaly_score, 3),
            "mean_db": round(float(mean_db), 1),
            "max_db": round(float(max_db), 1),
            "dominant_freq": round(float(dom_freq), 1),
            "sound_type": sound_type,
            "reasons": reasons,
            "severity": "critical" if anomaly_score > 0.7 else "high" if anomaly_score > 0.5 else "medium" if anomaly_score > 0.3 else "low",
        }
