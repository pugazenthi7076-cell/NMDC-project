"""
MQTT Module for Industrial Belt Monitoring
Handles real-time sensor communication from ESP32/IoT devices.

Topics:
  nmdc/belt/{belt_id}/vibration   - Vibration sensor data (float)
  nmdc/belt/{belt_id}/temperature - Temperature readings (float)
  nmdc/belt/{belt_id}/motor       - Motor current (float)
  nmdc/belt/{belt_id}/acoustic    - Acoustic sensor (float)
  nmdc/belt/{belt_id}/load        - Load/tension sensor (float)
  nmdc/belt/{belt_id}/em          - Electromagnetic sensor (float)
  nmdc/belt/{belt_id}/status      - Belt operational status (json)
  nmdc/alerts/{belt_id}           - Outbound alerts (json)
"""

import json
import os
import time
import threading
from typing import Dict, List, Optional, Callable
from datetime import datetime
from collections import defaultdict

try:
    import paho.mqtt.client as mqtt
    MQTT_AVAILABLE = True
except ImportError:
    MQTT_AVAILABLE = False


class MQTTManager:
    """Manages MQTT connections for real-time sensor data from ESP32 devices."""

    def __init__(self, broker_host: str = "localhost", broker_port: int = 1883,
                 client_id: str = "nmdc-ml-service"):
        self.broker_host = broker_host
        self.broker_port = broker_port
        self.client_id = client_id
        self.client = None
        self.connected = False
        self.subscribed_topics: List[str] = []

        # Sensor data storage (latest values per belt)
        self.sensor_data: Dict[str, Dict] = defaultdict(lambda: {
            "vibration": None,
            "temperature": None,
            "motor_current": None,
            "acoustic": None,
            "load_tension": None,
            "em_signal": None,
            "status": None,
            "last_update": None,
        })

        # Sensor history (last 100 readings per sensor per belt)
        self.sensor_history: Dict[str, Dict[str, List]] = defaultdict(lambda: defaultdict(list))
        self.MAX_HISTORY = 100

        # Callbacks for real-time processing
        self.on_sensor_callbacks: List[Callable] = []

        # Message log
        self.message_log: List[Dict] = []
        self.MAX_LOG = 500

    def connect(self) -> bool:
        """Connect to MQTT broker."""
        if not MQTT_AVAILABLE:
            print("  [WARN] paho-mqtt not installed")
            return False

        try:
            self.client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2, client_id=self.client_id)
            self.client.on_connect = self._on_connect
            self.client.on_message = self._on_message
            self.client.on_disconnect = self._on_disconnect

            self.client.connect(self.broker_host, self.broker_port, keepalive=60)
            self.client.loop_start()

            # Wait briefly for connection
            time.sleep(1)
            return self.connected
        except Exception as e:
            print(f"  [WARN] MQTT connection failed: {e}")
            return False

    def _on_connect(self, client, userdata, flags, rc, properties=None):
        """Called when connected to broker."""
        self.connected = True
        print(f"  [MQTT] Connected to {self.broker_host}:{self.broker_port}")

        # Subscribe to all belt sensor topics
        self.subscribe("nmdc/belt/+/vibration")
        self.subscribe("nmdc/belt/+/temperature")
        self.subscribe("nmdc/belt/+/motor")
        self.subscribe("nmdc/belt/+/acoustic")
        self.subscribe("nmdc/belt/+/load")
        self.subscribe("nmdc/belt/+/em")
        self.subscribe("nmdc/belt/+/status")

    def _on_disconnect(self, client, userdata, flags, rc, properties=None):
        """Called when disconnected."""
        self.connected = False
        print("  [MQTT] Disconnected from broker")

    def _on_message(self, client, userdata, msg):
        """Handle incoming MQTT messages from ESP32 sensors."""
        try:
            topic = msg.topic
            payload = msg.payload.decode("utf-8")

            # Parse topic: nmdc/belt/{belt_id}/{sensor_type}
            parts = topic.split("/")
            if len(parts) < 4:
                return

            belt_id = parts[2]
            sensor_type = parts[3]

            # Parse payload
            try:
                value = json.loads(payload)
            except json.JSONDecodeError:
                value = float(payload) if payload.replace(".", "").replace("-", "").isdigit() else payload

            # Map sensor type to internal name
            sensor_map = {
                "vibration": "vibration",
                "temperature": "temperature",
                "motor": "motor_current",
                "acoustic": "acoustic",
                "load": "load_tension",
                "em": "em_signal",
                "status": "status",
            }

            internal_name = sensor_map.get(sensor_type, sensor_type)

            # Store latest value
            self.sensor_data[belt_id][internal_name] = value
            self.sensor_data[belt_id]["last_update"] = datetime.now().isoformat()

            # Store history
            history = self.sensor_history[belt_id][internal_name]
            history.append({"value": value, "timestamp": datetime.now().isoformat()})
            if len(history) > self.MAX_HISTORY:
                history.pop(0)

            # Log message
            log_entry = {
                "topic": topic,
                "belt_id": belt_id,
                "sensor": internal_name,
                "value": value,
                "timestamp": datetime.now().isoformat(),
            }
            self.message_log.append(log_entry)
            if len(self.message_log) > self.MAX_LOG:
                self.message_log.pop(0)

            # Run callbacks
            for callback in self.on_sensor_callbacks:
                try:
                    callback(belt_id, internal_name, value)
                except Exception:
                    pass

        except Exception as e:
            print(f"  [MQTT] Error processing message: {e}")

    def subscribe(self, topic: str):
        """Subscribe to an MQTT topic."""
        if self.client and self.connected:
            self.client.subscribe(topic)
            self.subscribed_topics.append(topic)

    def publish(self, topic: str, payload: str, qos: int = 1):
        """Publish a message (e.g., alerts to ESP32 devices)."""
        if self.client and self.connected:
            self.client.publish(topic, payload, qos=qos)

    def publish_alert(self, belt_id: str, alert_data: Dict):
        """Publish an alert to a belt's alert topic."""
        topic = f"nmdc/alerts/{belt_id}"
        self.publish(topic, json.dumps(alert_data))

    def get_belt_sensors(self, belt_id: str) -> Dict:
        """Get latest sensor data for a specific belt."""
        return dict(self.sensor_data.get(belt_id, {}))

    def get_all_sensors(self) -> Dict:
        """Get latest sensor data for all belts."""
        return {belt_id: dict(sensors) for belt_id, sensors in self.sensor_data.items()}

    def get_sensor_history(self, belt_id: str, sensor: str, limit: int = 50) -> List:
        """Get sensor history for a belt."""
        history = self.sensor_history.get(belt_id, {}).get(sensor, [])
        return history[-limit:]

    def get_message_log(self, limit: int = 50) -> List:
        """Get recent MQTT messages."""
        return self.message_log[-limit:]

    def get_stats(self) -> Dict:
        """Get MQTT connection statistics."""
        unique_belts = set()
        total_messages = 0
        for belt_id, sensors in self.sensor_data.items():
            unique_belts.add(belt_id)
            for sensor, value in sensors.items():
                if value is not None and sensor != "last_update":
                    total_messages += 1

        return {
            "connected": self.connected,
            "broker": f"{self.broker_host}:{self.broker_port}",
            "subscribed_topics": len(self.subscribed_topics),
            "belts_reporting": len(unique_belts),
            "total_sensor_readings": total_messages,
            "message_log_size": len(self.message_log),
        }

    def add_callback(self, callback: Callable):
        """Register a callback for sensor data events."""
        self.on_sensor_callbacks.append(callback)

    def simulate_sensor_data(self, belt_id: str):
        """Simulate sensor data for testing when no MQTT broker is available."""
        import random

        sensors = {
            "vibration": round(random.uniform(1.0, 15.0), 2),
            "temperature": round(random.uniform(25, 75), 1),
            "motor_current": round(random.uniform(150, 300), 1),
            "acoustic": round(random.uniform(40, 90), 1),
            "load_tension": round(random.uniform(60, 120), 1),
            "em_signal": round(random.uniform(0.1, 0.9), 3),
        }

        for sensor, value in sensors.items():
            self.sensor_data[belt_id][sensor] = value
            self.sensor_data[belt_id]["last_update"] = datetime.now().isoformat()

            history = self.sensor_history[belt_id][sensor]
            history.append({"value": value, "timestamp": datetime.now().isoformat()})
            if len(history) > self.MAX_HISTORY:
                history.pop(0)

        return sensors

    def disconnect(self):
        """Disconnect from MQTT broker."""
        if self.client:
            self.client.loop_stop()
            self.client.disconnect()
            self.connected = False


# Singleton
mqtt_manager = MQTTManager(
    broker_host=os.getenv("MQTT_BROKER", "localhost"),
    broker_port=int(os.getenv("MQTT_PORT", "1883")),
)
