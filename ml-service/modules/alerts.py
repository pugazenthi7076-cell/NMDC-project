"""
Alert System for Industrial Belt Monitoring
Supports Email (SMTP), SMS (Twilio), and Webhook notifications.
Includes alert throttling, escalation, and history tracking.
"""

import smtplib
import json
import os
import time
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Dict, List, Optional
from datetime import datetime, timedelta
from collections import defaultdict


class AlertManager:
    """Manages alerts with throttling, escalation, and multi-channel delivery."""

    # Throttle: minimum seconds between alerts of same type per belt
    THROTTLE_SECONDS = 300  # 5 minutes

    # Escalation thresholds
    ESCALATION_RULES = {
        "critical": {"channels": ["email", "sms", "webhook"], "repeat_minutes": 15},
        "high": {"channels": ["email", "webhook"], "repeat_minutes": 30},
        "medium": {"channels": ["email"], "repeat_minutes": 60},
        "low": {"channels": ["webhook"], "repeat_minutes": 0},
    }

    def __init__(self):
        self.alert_history: List[Dict] = []
        self.last_sent: Dict[str, float] = defaultdict(float)
        self.alert_counter = 0

        # Email config (from env)
        self.smtp_host = os.getenv("SMTP_HOST", "smtp.gmail.com")
        self.smtp_port = int(os.getenv("SMTP_PORT", "587"))
        self.smtp_user = os.getenv("SMTP_USER", "")
        self.smtp_pass = os.getenv("SMTP_PASS", "")
        self.alert_email = os.getenv("ALERT_EMAIL", "")

        # Webhook config
        self.webhook_url = os.getenv("ALERT_WEBHOOK_URL", "")

        # SMS config (Twilio)
        self.twilio_sid = os.getenv("TWILIO_SID", "")
        self.twilio_token = os.getenv("TWILIO_TOKEN", "")
        self.twilio_from = os.getenv("TWILIO_FROM", "")
        self.alert_phone = os.getenv("ALERT_PHONE", "")

    def should_alert(self, alert_key: str, severity: str) -> bool:
        """Check if we should send alert (throttling)."""
        now = time.time()
        last = self.last_sent.get(alert_key, 0)
        throttle = self.ESCALATION_RULES.get(severity, {}).get("repeat_minutes", 0) * 60

        if throttle == 0:
            return True
        return (now - last) >= max(throttle, self.THROTTLE_SECONDS)

    def create_alert(self, belt_id: str, severity: str, title: str, message: str,
                     sensor: str = "system", anomaly_data: Optional[Dict] = None) -> Dict:
        """Create and optionally send an alert."""
        self.alert_counter += 1
        alert_id = f"ALT-{self.alert_counter:04d}"

        alert = {
            "id": alert_id,
            "belt_id": belt_id,
            "severity": severity,
            "title": title,
            "message": message,
            "sensor": sensor,
            "anomaly_data": anomaly_data or {},
            "timestamp": datetime.now().isoformat(),
            "status": "active",
            "channels_sent": [],
        }

        # Check throttling
        alert_key = f"{belt_id}:{sensor}:{severity}"
        if not self.should_alert(alert_key, severity):
            alert["status"] = "throttled"
            alert["message"] += " [throttled - previously sent recently]"
            self.alert_history.append(alert)
            return alert

        # Determine channels
        channels = self.ESCALATION_RULES.get(severity, {}).get("channels", [])

        # Send via each channel
        for channel in channels:
            try:
                if channel == "email" and self.smtp_user:
                    self._send_email(alert)
                    alert["channels_sent"].append("email")
                elif channel == "sms" and self.twilio_sid:
                    self._send_sms(alert)
                    alert["channels_sent"].append("sms")
                elif channel == "webhook" and self.webhook_url:
                    self._send_webhook(alert)
                    alert["channels_sent"].append("webhook")
            except Exception as e:
                alert["channels_sent"].append(f"{channel}_failed:{str(e)[:50]}")

        self.last_sent[alert_key] = time.time()
        alert["status"] = "sent" if alert["channels_sent"] else "no_channels_configured"
        self.alert_history.append(alert)

        return alert

    def _send_email(self, alert: Dict):
        """Send email alert via SMTP."""
        severity_colors = {
            "critical": "#dc2626",
            "high": "#ea580c",
            "medium": "#ca8a04",
            "low": "#2563eb",
        }
        color = severity_colors.get(alert["severity"], "#666")

        html = f"""
        <html><body style="font-family: Arial, sans-serif;">
        <div style="background: {color}; color: white; padding: 15px; border-radius: 8px 8px 0 0;">
            <h2 style="margin:0;">[ALERT][{alert['severity'].upper()}] {alert['title']}</h2>
        </div>
        <div style="padding: 20px; border: 1px solid #ddd; border-top: none;">
            <p><strong>Belt:</strong> {alert['belt_id']}</p>
            <p><strong>Sensor:</strong> {alert['sensor']}</p>
            <p><strong>Time:</strong> {alert['timestamp']}</p>
            <p><strong>Message:</strong> {alert['message']}</p>
            {'<p><strong>Details:</strong> ' + json.dumps(alert.get('anomaly_data', {}), indent=2) + '</p>' if alert.get('anomaly_data') else ''}
            <hr>
            <p style="color: #888; font-size: 12px;">Industrial Belt Monitoring Alert System</p>
        </div>
        </body></html>
        """

        msg = MIMEMultipart("alternative")
        msg["Subject"] = f"[{alert['severity'].upper()}] {alert['title']} - {alert['belt_id']}"
        msg["From"] = self.smtp_user
        msg["To"] = self.alert_email
        msg.attach(MIMEText(html, "html"))

        with smtplib.SMTP(self.smtp_host, self.smtp_port) as server:
            server.starttls()
            server.login(self.smtp_user, self.smtp_pass)
            server.sendmail(self.smtp_user, [self.alert_email], msg.as_string())

    def _send_sms(self, alert: Dict):
        """Send SMS alert via Twilio."""
        import urllib.request
        import urllib.parse

        body = f"[{alert['severity'].upper()}] {alert['title']}\nBelt: {alert['belt_id']}\n{alert['message'][:150]}"

        data = urllib.parse.urlencode({
            "To": self.alert_phone,
            "From": self.twilio_from,
            "Body": body,
        }).encode()

        url = f"https://api.twilio.com/2010-04-01/Accounts/{self.twilio_sid}/Messages.json"
        req = urllib.request.Request(url, data=data)
        req.add_header("Authorization", "Basic " + __import__("base64").b64encode(
            f"{self.twilio_sid}:{self.twilio_token}".encode()
        ).decode())

        with urllib.request.urlopen(req) as resp:
            pass  # 201 = sent

    def _send_webhook(self, alert: Dict):
        """Send alert to webhook (Slack, Discord, custom)."""
        import urllib.request

        payload = json.dumps({
            "text": f"[{alert['severity'].upper()}] {alert['title']}",
            "alert_id": alert["id"],
            "belt_id": alert["belt_id"],
            "severity": alert["severity"],
            "sensor": alert["sensor"],
            "message": alert["message"],
            "timestamp": alert["timestamp"],
        }).encode()

        req = urllib.request.Request(self.webhook_url, data=payload, method="POST")
        req.add_header("Content-Type", "application/json")

        with urllib.request.urlopen(req) as resp:
            pass

    def get_history(self, belt_id: Optional[str] = None, limit: int = 50) -> List[Dict]:
        """Get alert history, optionally filtered by belt."""
        history = self.alert_history
        if belt_id:
            history = [a for a in history if a["belt_id"] == belt_id]
        return history[-limit:]

    def get_stats(self) -> Dict:
        """Get alert statistics."""
        total = len(self.alert_history)
        by_severity = defaultdict(int)
        by_belt = defaultdict(int)
        by_sensor = defaultdict(int)

        for alert in self.alert_history:
            by_severity[alert["severity"]] += 1
            by_belt[alert["belt_id"]] += 1
            by_sensor[alert["sensor"]] += 1

        return {
            "total_alerts": total,
            "by_severity": dict(by_severity),
            "by_belt": dict(by_belt),
            "by_sensor": dict(by_sensor),
        }

    def auto_check_and_alert(self, belt_id: str, sensor_data: Dict) -> List[Dict]:
        """Automatically check sensor data and generate alerts if needed."""
        alerts = []

        # Vibration alert
        vib = sensor_data.get("vibration", {})
        if isinstance(vib, dict) and vib.get("anomaly"):
            a = self.create_alert(
                belt_id=belt_id,
                severity=vib.get("severity", "medium"),
                title=f"Vibration Anomaly - {belt_id}",
                message=f"Vibration anomaly detected. Score: {vib.get('score', 0):.2f}. "
                        f"Fault type: {vib.get('fault_type', 'unknown')}",
                sensor="vibration",
                anomaly_data=vib,
            )
            alerts.append(a)

        # Temperature alert
        temp = sensor_data.get("temperature", {})
        if isinstance(temp, dict) and temp.get("anomaly"):
            a = self.create_alert(
                belt_id=belt_id,
                severity=temp.get("severity", "medium"),
                title=f"Temperature Alert - {belt_id}",
                message=f"Temperature anomaly: {temp.get('current_temp', 0)}C "
                        f"(avg: {temp.get('moving_average', 0)}C). "
                        f"Trend: {temp.get('trend', 'unknown')}",
                sensor="temperature",
                anomaly_data=temp,
            )
            alerts.append(a)

        # Motor current alert
        motor = sensor_data.get("motor_current", {})
        if isinstance(motor, dict) and motor.get("anomaly"):
            a = self.create_alert(
                belt_id=belt_id,
                severity=motor.get("severity", "medium"),
                title=f"Motor Current Alert - {belt_id}",
                message=f"Motor current anomaly: {motor.get('issue_type', 'unknown')}. "
                        f"Load ratio: {motor.get('load_ratio', 0):.1%}",
                sensor="motor_current",
                anomaly_data=motor,
            )
            alerts.append(a)

        # Acoustic alert
        acoust = sensor_data.get("acoustic", {})
        if isinstance(acoust, dict) and acoust.get("anomaly"):
            a = self.create_alert(
                belt_id=belt_id,
                severity=acoust.get("severity", "medium"),
                title=f"Acoustic Alert - {belt_id}",
                message=f"Unusual sound detected: {acoust.get('sound_type', 'unknown')}. "
                        f"Level: {acoust.get('mean_db', 0):.1f} dB",
                sensor="acoustic",
                anomaly_data=acoust,
            )
            alerts.append(a)

        return alerts


# Singleton
alert_manager = AlertManager()
