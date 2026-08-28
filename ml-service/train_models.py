"""
ML Training Script for Industrial Belt Monitoring
Uses XGBoost and Random Forest to predict belt failures and classify damage.
"""

import numpy as np
import pandas as pd
import xgboost as xgb
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, mean_absolute_error, classification_report
from sklearn.preprocessing import LabelEncoder
import pickle
import os
import json
from datetime import datetime, timedelta

MODELS_DIR = os.path.join(os.path.dirname(__file__), "trained_models")
os.makedirs(MODELS_DIR, exist_ok=True)


def generate_training_data(n_samples=2000):
    """Generate realistic sensor training data based on NMDC conveyor belt patterns."""
    np.random.seed(42)

    data = []
    for i in range(n_samples):
        # Normal operating conditions (70%)
        if np.random.random() < 0.7:
            speed = np.random.uniform(3.0, 5.5)
            tension = np.random.uniform(70, 95)
            temperature = np.random.uniform(28, 50)
            load = np.random.uniform(1500, 3500)
            vibration = np.random.uniform(1.0, 6.0)
            motor_current = np.random.uniform(150, 230)
            acoustic = np.random.uniform(45, 68)
            em_signal = np.random.uniform(0.1, 0.4)
            damage_risk = np.random.uniform(0, 25)
            failure_within_30d = 0
            damage_type = "none"
            severity = "low"
            health_grade = "A" if damage_risk < 10 else "B"

        # Warning conditions (20%)
        elif np.random.random() < 0.5:
            speed = np.random.uniform(2.5, 4.5)
            tension = np.random.uniform(85, 115)
            temperature = np.random.uniform(45, 65)
            load = np.random.uniform(2000, 4000)
            vibration = np.random.uniform(5.0, 10.0)
            motor_current = np.random.uniform(200, 260)
            acoustic = np.random.uniform(60, 78)
            em_signal = np.random.uniform(0.3, 0.6)
            damage_risk = np.random.uniform(25, 60)
            failure_within_30d = np.random.choice([0, 1], p=[0.7, 0.3])
            damage_type = np.random.choice(["abrasion", "edge_damage", "splice_wear"])
            severity = np.random.choice(["low", "medium"])
            health_grade = "C"
        # Critical conditions (10%)
        else:
            speed = np.random.uniform(0.5, 3.0)
            tension = np.random.uniform(100, 130)
            temperature = np.random.uniform(60, 85)
            load = np.random.uniform(800, 2000)
            vibration = np.random.uniform(9.0, 18.0)
            motor_current = np.random.uniform(250, 320)
            acoustic = np.random.uniform(75, 95)
            em_signal = np.random.uniform(0.5, 1.0)
            damage_risk = np.random.uniform(60, 98)
            failure_within_30d = np.random.choice([0, 1], p=[0.2, 0.8])
            damage_type = np.random.choice(["tear", "joint_rupture", "splice_failure", "bearing_failure"])
            severity = np.random.choice(["high", "critical"])
            health_grade = np.random.choice(["D", "F"])

        data.append({
            "speed": round(speed, 2),
            "tension": round(tension, 2),
            "temperature": round(temperature, 2),
            "load": round(load, 0),
            "vibration": round(vibration, 2),
            "motor_current": round(motor_current, 2),
            "acoustic": round(acoustic, 2),
            "em_signal": round(em_signal, 3),
            "damage_risk": round(damage_risk, 2),
            "failure_within_30d": failure_within_30d,
            "damage_type": damage_type,
            "severity": severity,
            "health_grade": health_grade,
            # Derived features
            "tension_speed_ratio": round(tension / max(speed, 0.1), 2),
            "temp_load_ratio": round(temperature / max(load / 1000, 0.1), 2),
            "vibration_current_ratio": round(vibration / max(motor_current / 100, 0.1), 2),
        })

    return pd.DataFrame(data)


def train_failure_prediction_model(df):
    """Train XGBoost model for failure prediction within 30 days."""
    print("\n🔴 Training XGBoost Failure Prediction Model...")

    features = ["speed", "tension", "temperature", "load", "vibration",
                "motor_current", "acoustic", "em_signal", "damage_risk",
                "tension_speed_ratio", "temp_load_ratio", "vibration_current_ratio"]

    X = df[features]
    y = df["failure_within_30d"]

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)

    model = xgb.XGBClassifier(
        n_estimators=200,
        max_depth=6,
        learning_rate=0.1,
        subsample=0.8,
        colsample_bytree=0.8,
        use_label_encoder=False,
        eval_metric="logloss",
        random_state=42,
    )

    model.fit(X_train, y_train, eval_set=[(X_test, y_test)], verbose=False)

    y_pred = model.predict(X_test)
    accuracy = accuracy_score(y_test, y_pred)

    print(f"   ✅ Accuracy: {accuracy * 100:.1f}%")
    print(f"   📊 Classification Report:")
    print(classification_report(y_test, y_pred, target_names=["No Failure", "Failure"]))

    model_path = os.path.join(MODELS_DIR, "xgboost_failure_model.pkl")
    with open(model_path, "wb") as f:
        pickle.dump(model, f)
    print(f"   💾 Saved to {model_path}")

    return model, accuracy


def train_damage_classifier(df):
    """Train Random Forest model for damage type classification."""
    print("\n🟡 Training Random Forest Damage Classifier...")

    df_class = df[df["damage_type"] != "none"].copy()

    features = ["speed", "tension", "temperature", "load", "vibration",
                "motor_current", "acoustic", "em_signal", "damage_risk",
                "tension_speed_ratio", "temp_load_ratio", "vibration_current_ratio"]

    le = LabelEncoder()
    X = df_class[features]
    y = le.fit_transform(df_class["damage_type"])

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    model = RandomForestClassifier(
        n_estimators=150,
        max_depth=10,
        min_samples_split=5,
        min_samples_leaf=2,
        random_state=42,
    )

    model.fit(X_train, y_train)

    y_pred = model.predict(X_test)
    accuracy = accuracy_score(y_test, y_pred)

    print(f"   ✅ Accuracy: {accuracy * 100:.1f}%")

    model_path = os.path.join(MODELS_DIR, "rf_damage_classifier.pkl")
    encoder_path = os.path.join(MODELS_DIR, "damage_label_encoder.pkl")
    with open(model_path, "wb") as f:
        pickle.dump(model, f)
    with open(encoder_path, "wb") as f:
        pickle.dump(le, f)
    print(f"   💾 Saved to {model_path}")

    return model, le, accuracy


def train_health_scorer(df):
    """Train XGBoost regressor for belt health scoring (0-100)."""
    print("\n🟢 Training XGBoost Health Scorer...")

    features = ["speed", "tension", "temperature", "load", "vibration",
                "motor_current", "acoustic", "em_signal",
                "tension_speed_ratio", "temp_load_ratio", "vibration_current_ratio"]

    X = df[features]
    y = 100 - df["damage_risk"]  # Health = 100 - damage risk

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    model = xgb.XGBRegressor(
        n_estimators=150,
        max_depth=5,
        learning_rate=0.1,
        subsample=0.8,
        random_state=42,
    )

    model.fit(X_train, y_train, verbose=False)

    y_pred = model.predict(X_test)
    mae = mean_absolute_error(y_test, y_pred)

    print(f"   ✅ MAE: {mae:.2f}%")
    print(f"   📊 Health score range: {y_pred.min():.1f} - {y_pred.max():.1f}")

    model_path = os.path.join(MODELS_DIR, "xgboost_health_model.pkl")
    with open(model_path, "wb") as f:
        pickle.dump(model, f)
    print(f"   💾 Saved to {model_path}")

    return model, mae


def train_remaining_life_model(df):
    """Train Random Forest regressor for remaining useful life (days)."""
    print("\n🔵 Training Random Forest Remaining Life Model...")

    features = ["speed", "tension", "temperature", "load", "vibration",
                "motor_current", "acoustic", "em_signal", "damage_risk",
                "tension_speed_ratio", "temp_load_ratio", "vibration_current_ratio"]

    X = df[features]
    # RUL: higher damage risk = fewer days remaining
    y = np.maximum(0, (100 - df["damage_risk"]) * 0.9 + np.random.normal(0, 3, len(df)))

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    model = RandomForestRegressor(
        n_estimators=120,
        max_depth=8,
        random_state=42,
    )

    model.fit(X_train, y_train)

    y_pred = model.predict(X_test)
    mae = mean_absolute_error(y_test, y_pred)

    print(f"   ✅ MAE: {mae:.1f} days")

    model_path = os.path.join(MODELS_DIR, "rf_remaining_life.pkl")
    with open(model_path, "wb") as f:
        pickle.dump(model, f)
    print(f"   💾 Saved to {model_path}")

    return model, mae


def train_severity_classifier(df):
    """Train Random Forest for severity classification."""
    print("\n🟠 Training Random Forest Severity Classifier...")

    features = ["speed", "tension", "temperature", "load", "vibration",
                "motor_current", "acoustic", "em_signal", "damage_risk",
                "tension_speed_ratio", "temp_load_ratio", "vibration_current_ratio"]

    df_sev = df[df["damage_type"] != "none"].copy()
    X = df_sev[features]
    le = LabelEncoder()
    y = le.fit_transform(df_sev["severity"])

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    model = RandomForestClassifier(n_estimators=100, max_depth=8, random_state=42)
    model.fit(X_train, y_train)

    y_pred = model.predict(X_test)
    accuracy = accuracy_score(y_test, y_pred)

    print(f"   ✅ Accuracy: {accuracy * 100:.1f}%")

    model_path = os.path.join(MODELS_DIR, "rf_severity_classifier.pkl")
    encoder_path = os.path.join(MODELS_DIR, "severity_label_encoder.pkl")
    with open(model_path, "wb") as f:
        pickle.dump(model, f)
    with open(encoder_path, "wb") as f:
        pickle.dump(le, f)
    print(f"   💾 Saved to {model_path}")

    return model, le, accuracy


def main():
    import sys, io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')
    print("=" * 60)
    print("Industrial Belt Monitoring - ML Model Training")
    print("=" * 60)

    print("\n📊 Generating training data (2000 samples)...")
    df = generate_training_data(2000)
    print(f"   ✅ Generated {len(df)} samples")
    print(f"   📈 Failure rate: {df['failure_within_30d'].mean() * 100:.1f}%")
    print(f"   📊 Damage types: {df['damage_type'].value_counts().to_dict()}")

    # Save training data
    df.to_csv(os.path.join(MODELS_DIR, "training_data.csv"), index=False)

    # Train all models
    results = {}

    model1, acc1 = train_failure_prediction_model(df)
    results["xgboost_failure"] = round(acc1 * 100, 1)

    model2, le2, acc2 = train_damage_classifier(df)
    results["rf_damage"] = round(acc2 * 100, 1)

    model3, mae3 = train_health_scorer(df)
    results["xgboost_health"] = round(mae3, 2)

    model4, mae4 = train_remaining_life_model(df)
    results["rf_remaining_life"] = round(mae4, 1)

    model5, le5, acc5 = train_severity_classifier(df)
    results["rf_severity"] = round(acc5 * 100, 1)

    # Save results
    with open(os.path.join(MODELS_DIR, "training_results.json"), "w") as f:
        json.dump({
            "trained_at": datetime.now().isoformat(),
            "samples": len(df),
            "models": results,
        }, f, indent=2)

    print("\n" + "=" * 60)
    print("✅ All models trained and saved!")
    print(f"📁 Models directory: {MODELS_DIR}")
    print("\nModel Summary:")
    for name, score in results.items():
        print(f"   • {name}: {score}")
    print("=" * 60)


if __name__ == "__main__":
    main()
