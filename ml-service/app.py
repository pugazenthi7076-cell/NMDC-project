"""
ML Prediction API Server for Industrial Belt Monitoring
Serves XGBoost, Random Forest, OpenCV, YOLO, 1D-CNN/LSTM, Sensor Fusion, and Alerts via REST API.
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import pickle
import numpy as np
import os
import json
import base64
import cv2

# Import new modules
from modules.opencv_processor import BeltImageProcessor, process_frame_base64
from modules.yolo_detector import BeltYOLODetector
from modules.deep_learning import (
    VibrationAnomalyDetector,
    TemperatureAnomalyDetector,
    MotorCurrentAnalyzer,
    AcousticAnalyzer,
)
from modules.sensor_fusion import SensorFusionEngine, fusion_engine
from modules.alerts import alert_manager
from modules.mqtt_client import mqtt_manager
from modules.minio_storage import minio_storage

app = Flask(__name__)
CORS(app)

MODELS_DIR = os.path.join(os.path.dirname(__file__), "trained_models")

# Load all trained models on startup
models = {}
encoders = {}

# Initialize modules
opencv_processor = BeltImageProcessor()
yolo_detector = BeltYOLODetector(confidence=0.45)
vibration_detector = VibrationAnomalyDetector()
temperature_detector = TemperatureAnomalyDetector()
motor_analyzer = MotorCurrentAnalyzer()
acoustic_analyzer = AcousticAnalyzer()


def load_models():
    """Load all trained models from disk."""
    model_files = {
        "failure_predictor": "xgboost_failure_model.pkl",
        "damage_classifier": "rf_damage_classifier.pkl",
        "health_scorer": "xgboost_health_model.pkl",
        "remaining_life": "rf_remaining_life.pkl",
        "severity_classifier": "rf_severity_classifier.pkl",
    }
    encoder_files = {
        "damage_encoder": "damage_label_encoder.pkl",
        "severity_encoder": "severity_label_encoder.pkl",
    }
    for name, filename in model_files.items():
        path = os.path.join(MODELS_DIR, filename)
        if os.path.exists(path):
            with open(path, "rb") as f:
                models[name] = pickle.load(f)
            print(f"  [OK] Loaded {name}")
        else:
            print(f"  [WARN] Missing {name}")

    for name, filename in encoder_files.items():
        path = os.path.join(MODELS_DIR, filename)
        if os.path.exists(path):
            with open(path, "rb") as f:
                encoders[name] = pickle.load(f)
            print(f"  [OK] Loaded {name}")


def extract_features(data, include_damage_risk=True):
    """Extract ML features from sensor data."""
    speed = data.get("speed", 4.0)
    tension = data.get("tension", 80)
    temperature = data.get("temperature", 35)
    load = data.get("load", 2000)
    vibration = data.get("vibration", 5.0)
    motor_current = data.get("motor_current", 200)
    acoustic = data.get("acoustic", 60)
    em_signal = data.get("em_signal", 0.3)
    damage_risk = data.get("damageRisk", 30)

    base = [
        speed, tension, temperature, load, vibration,
        motor_current, acoustic, em_signal,
        tension / max(speed, 0.1),
        temperature / max(load / 1000, 0.1),
        vibration / max(motor_current / 100, 0.1),
    ]
    if include_damage_risk:
        base.insert(8, damage_risk)
    return np.array([base])


# ============================================================
# HEALTH CHECK
# ============================================================
@app.route("/health", methods=["GET"])
def health():
    return jsonify({
        "status": "healthy",
        "models_loaded": len(models),
        "modules": ["opencv", "yolo", "deep_learning", "sensor_fusion", "alerts"],
    })


# ============================================================
# XGBOOST / RANDOM FOREST PREDICTIONS (existing)
# ============================================================
@app.route("/predict/failure", methods=["POST"])
def predict_failure():
    if "failure_predictor" not in models:
        return jsonify({"error": "Model not loaded"}), 503
    data = request.json
    features = extract_features(data)
    probability = models["failure_predictor"].predict_proba(features)[0][1]
    return jsonify({
        "model": "XGBoost Failure Predictor",
        "failure_probability": round(float(probability) * 100, 1),
        "will_fail_within_30d": bool(models["failure_predictor"].predict(features)[0]),
        "risk_level": "critical" if probability > 0.7 else "warning" if probability > 0.4 else "normal",
    })


@app.route("/predict/health", methods=["POST"])
def predict_health():
    if "health_scorer" not in models:
        return jsonify({"error": "Model not loaded"}), 503
    data = request.json
    features = extract_features(data, include_damage_risk=False)
    health = max(0, min(100, float(models["health_scorer"].predict(features)[0])))
    grade = "A" if health >= 85 else "B" if health >= 70 else "C" if health >= 55 else "D" if health >= 40 else "F"
    return jsonify({"model": "XGBoost Health Scorer", "health_score": round(health, 1), "grade": grade})


@app.route("/predict/full", methods=["POST"])
def predict_full():
    data = request.json
    features_12 = extract_features(data, include_damage_risk=True)
    features_11 = extract_features(data, include_damage_risk=False)
    results = {}
    if "failure_predictor" in models:
        prob = float(models["failure_predictor"].predict_proba(features_12)[0][1])
        results["failure"] = {"probability": round(prob * 100, 1), "will_fail": bool(models["failure_predictor"].predict(features_12)[0]),
                              "risk_level": "critical" if prob > 0.7 else "warning" if prob > 0.4 else "normal"}
    if "health_scorer" in models:
        health = max(0, min(100, float(models["health_scorer"].predict(features_11)[0])))
        grade = "A" if health >= 85 else "B" if health >= 70 else "C" if health >= 55 else "D" if health >= 40 else "F"
        results["health"] = {"score": round(health, 1), "grade": grade, "damage": round(100 - health, 1)}
    if "remaining_life" in models:
        rul = max(0, min(365, float(models["remaining_life"].predict(features_12)[0])))
        results["remaining_life"] = {"days": round(rul, 0), "priority": "urgent" if rul < 7 else "high" if rul < 14 else "medium" if rul < 30 else "low"}
    if "damage_classifier" in models and "damage_encoder" in encoders:
        pred = models["damage_classifier"].predict(features_12)[0]
        results["damage_type"] = {"type": encoders["damage_encoder"].inverse_transform([pred])[0]}
    if "severity_classifier" in models and "severity_encoder" in encoders:
        pred = models["severity_classifier"].predict(features_12)[0]
        results["severity"] = {"level": encoders["severity_encoder"].inverse_transform([pred])[0]}
    return jsonify({"model": "Ensemble (XGBoost + Random Forest)", "predictions": results})


# ============================================================
# OPENCV IMAGE PROCESSING
# ============================================================
@app.route("/analyze/image", methods=["POST"])
def analyze_image():
    """Analyze belt image using OpenCV for cracks, tears, abrasion, edge damage."""
    data = request.json
    image_data = data.get("image")
    if not image_data:
        return jsonify({"error": "No image data provided"}), 400
    result = opencv_processor.analyze_image(image_data)
    return jsonify({"model": "OpenCV Belt Image Processor", "analysis": result})


@app.route("/analyze/frame", methods=["POST"])
def analyze_frame():
    """Analyze a single camera frame (base64) using OpenCV."""
    data = request.json
    image_data = data.get("frame")
    if not image_data:
        return jsonify({"error": "No frame data"}), 400
    result = process_frame_base64(image_data)
    return jsonify({"model": "OpenCV Real-time Processor", "analysis": result})


# ============================================================
# YOLO OBJECT DETECTION
# ============================================================
@app.route("/detect/yolo", methods=["POST"])
def detect_yolo():
    """Run YOLO detection on an image."""
    data = request.json
    image_data = data.get("image")
    if not image_data:
        return jsonify({"error": "No image data"}), 400

    # Decode image
    if "," in image_data:
        image_data = image_data.split(",")[1]
    img_bytes = base64.b64decode(image_data)
    nparr = np.frombuffer(img_bytes, np.uint8)
    image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    if image is None:
        return jsonify({"error": "Invalid image"}), 400

    detections = yolo_detector.detect(image)
    summary = yolo_detector.get_detection_summary(detections)

    return jsonify({
        "model": "YOLOv8 Belt Defect Detector",
        "detections": detections,
        "summary": summary,
    })


@app.route("/detect/yolo/simulate", methods=["GET"])
def simulate_yolo():
    """Get simulated YOLO detections (for demo without camera)."""
    w = request.args.get("width", 640, type=int)
    h = request.args.get("height", 480, type=int)
    detections = yolo_detector.detect_simulated((h, w))
    summary = yolo_detector.get_detection_summary(detections)
    return jsonify({"model": "YOLOv8 (Simulated)", "detections": detections, "summary": summary})


# ============================================================
# 1D-CNN / LSTM TIME-SERIES ANALYSIS
# ============================================================
@app.route("/analyze/vibration", methods=["POST"])
def analyze_vibration():
    """Analyze vibration signal using 1D-CNN features."""
    data = request.json
    signal = np.array(data.get("signal", []))
    if len(signal) == 0:
        return jsonify({"error": "No signal data"}), 400
    result = vibration_detector.detect_anomaly(signal)
    return jsonify({"model": "1D-CNN Vibration Anomaly Detector", "analysis": result})


@app.route("/analyze/temperature", methods=["POST"])
def analyze_temperature():
    """Analyze temperature time-series using LSTM-inspired detection."""
    data = request.json
    temps = np.array(data.get("temperatures", []))
    if len(temps) == 0:
        return jsonify({"error": "No temperature data"}), 400
    result = temperature_detector.detect_anomaly(temps)
    return jsonify({"model": "LSTM Temperature Anomaly Detector", "analysis": result})


@app.route("/analyze/motor-current", methods=["POST"])
def analyze_motor_current():
    """Analyze motor current signal."""
    data = request.json
    current = np.array(data.get("current", []))
    nominal = data.get("nominal_current", 200)
    if len(current) == 0:
        return jsonify({"error": "No current data"}), 400
    analyzer = MotorCurrentAnalyzer(nominal_current=nominal)
    result = analyzer.analyze(current)
    return jsonify({"model": "Motor Current Analyzer", "analysis": result})


@app.route("/analyze/acoustic", methods=["POST"])
def analyze_acoustic():
    """Analyze acoustic signal."""
    data = request.json
    signal = np.array(data.get("signal", []))
    if len(signal) == 0:
        return jsonify({"error": "No acoustic data"}), 400
    result = acoustic_analyzer.analyze(signal)
    return jsonify({"model": "Acoustic Analyzer", "analysis": result})


# ============================================================
# SENSOR FUSION
# ============================================================
@app.route("/fusion/analyze", methods=["POST"])
def sensor_fusion_analyze():
    """Fuse all sensor data into unified health assessment."""
    data = request.json
    result = fusion_engine.fuse_all(data)
    return jsonify({"model": "Multi-Sensor Fusion Engine", "fusion": result})


@app.route("/fusion/correlate", methods=["POST"])
def sensor_correlate():
    """Cross-sensor correlation analysis."""
    data = request.json
    sensor_signals = {}
    for sensor, values in data.items():
        if isinstance(values, list):
            sensor_signals[sensor] = values
    result = fusion_engine.cross_sensor_correlation(sensor_signals)
    return jsonify({"model": "Cross-Sensor Correlation", "correlation": result})


# ============================================================
# ALERTS
# ============================================================
@app.route("/alerts/check", methods=["POST"])
def check_alerts():
    """Auto-check sensor data and generate alerts."""
    data = request.json
    belt_id = data.get("belt_id", "BLT-000")
    sensor_data = data.get("sensor_data", {})
    alerts = alert_manager.auto_check_and_alert(belt_id, sensor_data)
    return jsonify({"alerts_generated": len(alerts), "alerts": alerts})


@app.route("/alerts/manual", methods=["POST"])
def manual_alert():
    """Send a manual alert."""
    data = request.json
    alert = alert_manager.create_alert(
        belt_id=data.get("belt_id", "BLT-000"),
        severity=data.get("severity", "medium"),
        title=data.get("title", "Manual Alert"),
        message=data.get("message", "No message"),
        sensor=data.get("sensor", "manual"),
    )
    return jsonify({"alert": alert})


@app.route("/alerts/history", methods=["GET"])
def alert_history():
    """Get alert history."""
    belt_id = request.args.get("belt_id")
    limit = request.args.get("limit", 50, type=int)
    history = alert_manager.get_history(belt_id=belt_id, limit=limit)
    return jsonify({"history": history, "total": len(alert_manager.alert_history)})


@app.route("/alerts/stats", methods=["GET"])
def alert_stats():
    """Get alert statistics."""
    return jsonify(alert_manager.get_stats())


# ============================================================
# MQTT - REAL-TIME SENSOR COMMUNICATION
# ============================================================
@app.route("/mqtt/status", methods=["GET"])
def mqtt_status():
    """Get MQTT connection status and sensor data."""
    return jsonify({"mqtt": mqtt_manager.get_stats()})


@app.route("/mqtt/connect", methods=["POST"])
def mqtt_connect():
    """Connect to MQTT broker."""
    data = request.json or {}
    mqtt_manager.broker_host = data.get("broker", mqtt_manager.broker_host)
    mqtt_manager.broker_port = data.get("port", mqtt_manager.broker_port)
    result = mqtt_manager.connect()
    return jsonify({"connected": result, "broker": mqtt_manager.broker_host})


@app.route("/mqtt/sensors", methods=["GET"])
def mqtt_sensors():
    """Get latest sensor data from all belts via MQTT."""
    belt_id = request.args.get("belt_id")
    if belt_id:
        return jsonify({"belt_id": belt_id, "sensors": mqtt_manager.get_belt_sensors(belt_id)})
    return jsonify({"sensors": mqtt_manager.get_all_sensors()})


@app.route("/mqtt/history/<belt_id>/<sensor>", methods=["GET"])
def mqtt_history(belt_id, sensor):
    """Get sensor history for a belt."""
    limit = request.args.get("limit", 50, type=int)
    history = mqtt_manager.get_sensor_history(belt_id, sensor, limit)
    return jsonify({"belt_id": belt_id, "sensor": sensor, "history": history})


@app.route("/mqtt/publish", methods=["POST"])
def mqtt_publish():
    """Publish a message to MQTT broker."""
    data = request.json
    topic = data.get("topic", "nmdc/test")
    payload = data.get("payload", "")
    mqtt_manager.publish(topic, payload)
    return jsonify({"published": True, "topic": topic})


@app.route("/mqtt/log", methods=["GET"])
def mqtt_log():
    """Get recent MQTT messages."""
    limit = request.args.get("limit", 50, type=int)
    return jsonify({"log": mqtt_manager.get_message_log(limit)})


@app.route("/mqtt/simulate/<belt_id>", methods=["POST"])
def mqtt_simulate(belt_id):
    """Simulate sensor data for a belt (for testing without ESP32)."""
    sensors = mqtt_manager.simulate_sensor_data(belt_id)
    return jsonify({"belt_id": belt_id, "simulated": sensors})


# ============================================================
# MINIO - OBJECT STORAGE
# ============================================================
@app.route("/minio/status", methods=["GET"])
def minio_status():
    """Get MinIO storage status."""
    return jsonify({"minio": minio_storage.get_storage_stats()})


@app.route("/minio/connect", methods=["POST"])
def minio_connect():
    """Connect to MinIO server."""
    data = request.json or {}
    minio_storage.endpoint = data.get("endpoint", minio_storage.endpoint)
    minio_storage.access_key = data.get("access_key", minio_storage.access_key)
    minio_storage.secret_key = data.get("secret_key", minio_storage.secret_key)
    result = minio_storage.connect()
    return jsonify({"connected": result, "endpoint": minio_storage.endpoint})


@app.route("/minio/upload/image", methods=["POST"])
def minio_upload_image():
    """Upload a belt image to MinIO."""
    data = request.json
    belt_id = data.get("belt_id", "BLT-000")
    image_b64 = data.get("image", "")
    if not image_b64:
        return jsonify({"error": "No image data"}), 400

    # Decode base64 image
    if "," in image_b64:
        image_b64 = image_b64.split(",")[1]
    image_bytes = base64.b64decode(image_b64)

    filename = minio_storage.upload_image(belt_id, image_bytes)
    return jsonify({"uploaded": bool(filename), "filename": filename, "bucket": "nmdc-belt-images"})


@app.route("/minio/upload/detection", methods=["POST"])
def minio_upload_detection():
    """Upload a detection screenshot with metadata to MinIO."""
    data = request.json
    belt_id = data.get("belt_id", "BLT-000")
    image_b64 = data.get("image", "")
    detections = data.get("detections", {})

    if not image_b64:
        return jsonify({"error": "No image data"}), 400

    if "," in image_b64:
        image_b64 = image_b64.split(",")[1]
    image_bytes = base64.b64decode(image_b64)

    filename = minio_storage.upload_detection(belt_id, image_bytes, detections)
    return jsonify({"uploaded": bool(filename), "filename": filename, "bucket": "nmdc-detections"})


@app.route("/minio/upload/report", methods=["POST"])
def minio_upload_report():
    """Upload an analysis report to MinIO."""
    data = request.json
    belt_id = data.get("belt_id", "BLT-000")
    report_html = data.get("report", "")

    filename = minio_storage.upload_report(belt_id, report_html)
    return jsonify({"uploaded": bool(filename), "filename": filename, "bucket": "nmdc-reports"})


@app.route("/minio/list/<bucket>", methods=["GET"])
def minio_list(bucket):
    """List files in a MinIO bucket."""
    prefix = request.args.get("prefix", "")
    limit = request.args.get("limit", 50, type=int)
    files = minio_storage.list_files(bucket, prefix, limit)
    return jsonify({"bucket": bucket, "files": files, "count": len(files)})


@app.route("/minio/download/<bucket>/<path:filename>", methods=["GET"])
def minio_download(bucket, filename):
    """Get a presigned URL for downloading a file."""
    url = minio_storage.get_file_url(bucket, filename)
    return jsonify({"url": url, "filename": filename})


@app.route("/minio/delete/<bucket>/<path:filename>", methods=["DELETE"])
def minio_delete(bucket, filename):
    """Delete a file from MinIO."""
    result = minio_storage.delete_file(bucket, filename)
    return jsonify({"deleted": result, "filename": filename})


# ============================================================
# COMPREHENSIVE BELT ANALYSIS (combines everything)
# ============================================================
@app.route("/analyze/full", methods=["POST"])
def full_analysis():
    """Run complete analysis on a belt: ML predictions + sensor fusion + alerts."""
    data = request.json
    belt_id = data.get("belt_id", "BLT-000")
    sensor_data = data.get("sensors", {})

    results = {}

    # 1. XGBoost/RF predictions
    features_12 = extract_features(data, include_damage_risk=True)
    features_11 = extract_features(data, include_damage_risk=False)

    if "health_scorer" in models:
        health = max(0, min(100, float(models["health_scorer"].predict(features_11)[0])))
        results["ml_health"] = {"score": round(health, 1), "grade": "A" if health >= 85 else "B" if health >= 70 else "C" if health >= 55 else "D" if health >= 40 else "F"}

    if "failure_predictor" in models:
        prob = float(models["failure_predictor"].predict_proba(features_12)[0][1])
        results["ml_failure"] = {"probability": round(prob * 100, 1), "will_fail": bool(models["failure_predictor"].predict(features_12)[0])}

    if "remaining_life" in models:
        rul = max(0, min(365, float(models["remaining_life"].predict(features_12)[0])))
        results["ml_remaining_life"] = {"days": round(rul, 0)}

    # 2. Time-series analysis
    vib_signal = sensor_data.get("vibration_signal")
    if vib_signal:
        results["vibration_analysis"] = vibration_detector.detect_anomaly(np.array(vib_signal))

    temp_series = sensor_data.get("temperature_series")
    if temp_series:
        results["temperature_analysis"] = temperature_detector.detect_anomaly(np.array(temp_series))

    # 3. Sensor fusion
    fusion_input = {}
    for s in ["vibration", "temperature", "motor_current", "acoustic", "load_tension", "electromagnetic", "camera_ai"]:
        if s in sensor_data:
            fusion_input[s] = sensor_data[s]
    if fusion_input:
        results["sensor_fusion"] = fusion_engine.fuse_all(fusion_input)

    # 4. Auto-alerts
    alerts = alert_manager.auto_check_and_alert(belt_id, results)
    results["alerts"] = alerts

    return jsonify({"belt_id": belt_id, "full_analysis": results})


# ============================================================
# MODEL INFO
# ============================================================
@app.route("/models", methods=["GET"])
def list_models():
    """List all loaded models and modules."""
    results_path = os.path.join(MODELS_DIR, "training_results.json")
    training_info = {}
    if os.path.exists(results_path):
        with open(results_path, "r") as f:
            training_info = json.load(f)

    return jsonify({
        "loaded_models": list(models.keys()),
        "loaded_encoders": list(encoders.keys()),
        "training_info": training_info,
        "modules": {
            "opencv": "BeltImageProcessor - cracks, tears, abrasion, edge damage, misalignment",
            "yolo": "BeltYOLODetector - 7 defect classes with real-time detection",
            "vibration_1d_cnn": "VibrationAnomalyDetector - FFT features + 1D-CNN anomaly detection",
            "temperature_lstm": "TemperatureAnomalyDetector - trend + statistical process control",
            "motor_current": "MotorCurrentAnalyzer - overload, harmonics, fluctuation analysis",
            "acoustic": "AcousticAnalyzer - noise level, frequency, sound type classification",
            "sensor_fusion": "SensorFusionEngine - weighted voting + Bayesian fusion",
            "alerts": "AlertManager - email, SMS, webhook with throttling + escalation",
        },
    })


if __name__ == "__main__":
    import sys
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8")
    print("=" * 60)
    print("Industrial Belt Monitoring - Full ML API")
    print("=" * 60)
    print("\nLoading models...")
    load_models()
    # Try connecting to MQTT and MinIO
    print("\nConnecting to MQTT broker...")
    mqtt_connected = mqtt_manager.connect()
    print(f"  MQTT: {'Connected' if mqtt_connected else 'Offline (simulated mode)'}")

    print("\nConnecting to MinIO...")
    minio_connected = minio_storage.connect()
    print(f"  MinIO: {'Connected' if minio_connected else 'Offline (simulated mode)'}")

    print("\nModules loaded: OpenCV | YOLO | 1D-CNN/LSTM | Sensor Fusion | Alerts | MQTT | MinIO")
    print("\nStarting ML API on port 5001...")
    app.run(host="0.0.0.0", port=5001, debug=False)
