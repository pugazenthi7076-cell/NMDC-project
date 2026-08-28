"""
ML Prediction API Server for Industrial Belt Monitoring
Serves XGBoost and Random Forest model predictions via REST API.
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import pickle
import numpy as np
import os
import json

app = Flask(__name__)
CORS(app)

MODELS_DIR = os.path.join(os.path.dirname(__file__), "trained_models")

# Load all trained models on startup
models = {}
encoders = {}


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
            print(f"  [WARN] Missing {name} ({filename})")

    for name, filename in encoder_files.items():
        path = os.path.join(MODELS_DIR, filename)
        if os.path.exists(path):
            with open(path, "rb") as f:
                encoders[name] = pickle.load(f)
            print(f"  [OK] Loaded {name}")
        else:
            print(f"  [WARN] Missing {name} ({filename})")


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


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "healthy", "models_loaded": len(models)})


@app.route("/predict/failure", methods=["POST"])
def predict_failure():
    """Predict if belt will fail within 30 days (XGBoost)."""
    if "failure_predictor" not in models:
        return jsonify({"error": "Model not loaded"}), 503

    data = request.json
    features = extract_features(data)
    probability = models["failure_predictor"].predict_proba(features)[0][1]
    will_fail = bool(models["failure_predictor"].predict(features)[0])

    return jsonify({
        "model": "XGBoost Failure Predictor",
        "failure_probability": round(float(probability) * 100, 1),
        "will_fail_within_30d": will_fail,
        "risk_level": "critical" if probability > 0.7 else "warning" if probability > 0.4 else "normal",
        "confidence": round(float(max(probability, 1 - probability)) * 100, 1),
    })


@app.route("/predict/damage-type", methods=["POST"])
def predict_damage_type():
    """Classify damage type (Random Forest)."""
    if "damage_classifier" not in models or "damage_encoder" not in encoders:
        return jsonify({"error": "Model not loaded"}), 503

    data = request.json
    features = extract_features(data)
    prediction = models["damage_classifier"].predict(features)[0]
    probabilities = models["damage_classifier"].predict_proba(features)[0]

    damage_type = encoders["damage_encoder"].inverse_transform([prediction])[0]
    confidence = float(max(probabilities)) * 100

    # Get all class probabilities
    class_probs = {}
    for cls, prob in zip(encoders["damage_encoder"].classes_, probabilities):
        class_probs[cls] = round(float(prob) * 100, 1)

    return jsonify({
        "model": "Random Forest Damage Classifier",
        "predicted_type": damage_type,
        "confidence": round(confidence, 1),
        "all_probabilities": class_probs,
        "is_damaged": damage_type != "none",
    })


@app.route("/predict/health", methods=["POST"])
def predict_health():
    """Predict belt health score 0-100 (XGBoost)."""
    if "health_scorer" not in models:
        return jsonify({"error": "Model not loaded"}), 503

    data = request.json
    features = extract_features(data, include_damage_risk=False)
    health_score = float(models["health_scorer"].predict(features)[0])
    health_score = max(0, min(100, health_score))

    if health_score >= 85:
        grade = "A"
    elif health_score >= 70:
        grade = "B"
    elif health_score >= 55:
        grade = "C"
    elif health_score >= 40:
        grade = "D"
    else:
        grade = "F"

    return jsonify({
        "model": "XGBoost Health Scorer",
        "health_score": round(health_score, 1),
        "grade": grade,
        "damage_score": round(100 - health_score, 1),
    })


@app.route("/predict/remaining-life", methods=["POST"])
def predict_remaining_life():
    """Predict remaining useful life in days (Random Forest)."""
    if "remaining_life" not in models:
        return jsonify({"error": "Model not loaded"}), 503

    data = request.json
    features = extract_features(data)
    rul = float(models["remaining_life"].predict(features)[0])
    rul = max(0, min(365, rul))

    if rul < 7:
        priority = "urgent"
    elif rul < 14:
        priority = "high"
    elif rul < 30:
        priority = "medium"
    else:
        priority = "low"

    return jsonify({
        "model": "Random Forest Remaining Life",
        "remaining_days": round(rul, 0),
        "priority": priority,
        "recommendation": (
            "Immediate replacement required" if rul < 7
            else "Schedule replacement within 2 weeks" if rul < 14
            else "Monitor closely, plan maintenance" if rul < 30
            else "No immediate action needed"
        ),
    })


@app.route("/predict/severity", methods=["POST"])
def predict_severity():
    """Classify damage severity (Random Forest)."""
    if "severity_classifier" not in models or "severity_encoder" not in encoders:
        return jsonify({"error": "Model not loaded"}), 503

    data = request.json
    features = extract_features(data)
    prediction = models["severity_classifier"].predict(features)[0]
    probabilities = models["severity_classifier"].predict_proba(features)[0]

    severity = encoders["severity_encoder"].inverse_transform([prediction])[0]
    confidence = float(max(probabilities)) * 100

    return jsonify({
        "model": "Random Forest Severity Classifier",
        "severity": severity,
        "confidence": round(confidence, 1),
    })


@app.route("/predict/full", methods=["POST"])
def predict_full():
    """Run all models and return comprehensive prediction."""
    data = request.json
    features_12 = extract_features(data, include_damage_risk=True)
    features_11 = extract_features(data, include_damage_risk=False)
    results = {}

    # Failure prediction
    if "failure_predictor" in models:
        prob = float(models["failure_predictor"].predict_proba(features_12)[0][1])
        results["failure"] = {
            "probability": round(prob * 100, 1),
            "will_fail": bool(models["failure_predictor"].predict(features_12)[0]),
            "risk_level": "critical" if prob > 0.7 else "warning" if prob > 0.4 else "normal",
        }

    # Health score (uses 11 features - no damage_risk)
    if "health_scorer" in models:
        health = max(0, min(100, float(models["health_scorer"].predict(features_11)[0])))
        grade = "A" if health >= 85 else "B" if health >= 70 else "C" if health >= 55 else "D" if health >= 40 else "F"
        results["health"] = {"score": round(health, 1), "grade": grade, "damage": round(100 - health, 1)}

    # Remaining life
    if "remaining_life" in models:
        rul = max(0, min(365, float(models["remaining_life"].predict(features_12)[0])))
        priority = "urgent" if rul < 7 else "high" if rul < 14 else "medium" if rul < 30 else "low"
        results["remaining_life"] = {"days": round(rul, 0), "priority": priority}

    # Damage type
    if "damage_classifier" in models and "damage_encoder" in encoders:
        pred = models["damage_classifier"].predict(features_12)[0]
        dmg_type = encoders["damage_encoder"].inverse_transform([pred])[0]
        results["damage_type"] = {"type": dmg_type, "is_damaged": dmg_type != "none"}

    # Severity
    if "severity_classifier" in models and "severity_encoder" in encoders:
        pred = models["severity_classifier"].predict(features_12)[0]
        sev = encoders["severity_encoder"].inverse_transform([pred])[0]
        results["severity"] = {"level": sev}

    return jsonify({
        "model": "Ensemble (XGBoost + Random Forest)",
        "predictions": results,
    })


@app.route("/models", methods=["GET"])
def list_models():
    """List all loaded models and their info."""
    results_path = os.path.join(MODELS_DIR, "training_results.json")
    training_info = {}
    if os.path.exists(results_path):
        with open(results_path, "r") as f:
            training_info = json.load(f)

    return jsonify({
        "loaded_models": list(models.keys()),
        "loaded_encoders": list(encoders.keys()),
        "training_info": training_info,
    })


if __name__ == "__main__":
    import sys
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')
    print("=" * 50)
    print("Industrial Belt Monitoring - ML API")
    print("=" * 50)
    print("\nLoading models...")
    load_models()
    print("\nStarting ML API on port 5001...")
    app.run(host="0.0.0.0", port=5001, debug=False)
