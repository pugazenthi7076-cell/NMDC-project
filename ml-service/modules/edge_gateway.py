"""
Edge Gateway Module - PLC Data Bridge
Reads data from PLC via Modbus TCP/OPC-UA, normalizes it, buffers during outages,
and sends JSON to backend API via MQTT or HTTPS.

PDF Section 7: Edge Gateway responsibilities:
- Read PLC values
- Normalize/validate data
- Buffer data during network outages
- Send data using MQTT or HTTPS
- Optionally run AI inference locally

Architecture:
PLC → Industrial Network → Edge Gateway → MQTT/HTTPS → Backend API → Database → Dashboard
"""
import json
import time
import threading
import queue
from datetime import datetime
from typing import Any, Dict, List, Optional, Callable

try:
    import requests
    REQUESTS_AVAILABLE = True
except ImportError:
    REQUESTS_AVAILABLE = False


class EdgeGateway:
    """
    Edge Gateway that bridges PLC and Backend.
    Reads PLC data, normalizes, buffers, and forwards to backend.
    """

    def __init__(self, gateway_id: str = "EDGE-001", backend_url: str = "http://localhost:5001"):
        self.gateway_id = gateway_id
        self.backend_url = backend_url
        self._running = False
        self._thread: Optional[threading.Thread] = None
        self._buffer: queue.Queue = queue.Queue(maxsize=10000)
        self._callbacks: List[Callable] = []
        self._plc_clients: Dict[str, Any] = {}
        self._collection_interval = 2.0  # seconds
        self._retry_queue: List[Dict] = []
        self._stats = {
            "total_readings": 0,
            "total_sent": 0,
            "total_buffered": 0,
            "total_errors": 0,
            "last_reading_time": None,
            "last_send_time": None,
            "buffer_size": 0,
            "connection_status": "disconnected",
        }
        self._lock = threading.Lock()

    def register_plc(self, belt_id: str, plc_client):
        """Register a PLC client for data collection."""
        self._plc_clients[belt_id] = plc_client
        print(f"[EdgeGateway] Registered PLC: {belt_id}")

    def register_callback(self, callback: Callable):
        """Register callback for new data: callback(belt_id, data)"""
        self._callbacks.append(callback)

    def start(self):
        """Start the edge gateway data collection."""
        self._running = True
        self._thread = threading.Thread(target=self._collection_loop, daemon=True)
        self._thread.start()

        # Start retry thread for failed sends
        self._retry_thread = threading.Thread(target=self._retry_loop, daemon=True)
        self._retry_thread.start()

        # Start buffer flush thread
        self._flush_thread = threading.Thread(target=self._flush_loop, daemon=True)
        self._flush_thread.start()

        print(f"[EdgeGateway] Started (interval={self._collection_interval}s)")

    def _collection_loop(self):
        """Main collection loop - reads from all registered PLCs."""
        while self._running:
            for belt_id, plc_client in self._plc_clients.items():
                try:
                    # Read from PLC (Modbus TCP)
                    if hasattr(plc_client, 'read_all_sensors'):
                        raw_data = plc_client.read_all_sensors()
                    elif hasattr(plc_client, 'read_sensor_data'):
                        raw_data = plc_client.read_sensor_data()
                    else:
                        continue

                    # Normalize data to PDF format
                    normalized = self._normalize_data(belt_id, raw_data)

                    # Store in buffer
                    self._buffer.put(normalized, block=False)
                    self._stats["total_readings"] += 1
                    self._stats["last_reading_time"] = datetime.utcnow().isoformat()

                    # Notify callbacks
                    for cb in self._callbacks:
                        try:
                            cb(belt_id, normalized)
                        except Exception:
                            pass

                except queue.Full:
                    self._stats["total_buffered"] += 1
                except Exception as e:
                    self._stats["total_errors"] += 1
                    print(f"[EdgeGateway] Read error for {belt_id}: {e}")

            time.sleep(self._collection_interval)

    def _normalize_data(self, belt_id: str, raw_data: Dict) -> Dict:
        """Normalize PLC data to standard JSON format (PDF Section 5)."""
        # Map PLC register names to PDF format
        normalized = {
            "beltId": belt_id,
            "gatewayId": self.gateway_id,
            "timestamp": raw_data.get("timestamp", datetime.utcnow().isoformat()),
            "source": "edge_gateway",
        }

        # Map from PLC format
        field_map = {
            "speed": ["belt_speed", "speed"],
            "motorRPM": ["motor_rpm", "motorRPM"],
            "motorCurrent": ["motor_current", "motorCurrent"],
            "temperature": ["temperature"],
            "vibration": ["vibration"],
            "beltStatus": ["beltStatus", "belt_status"],
            "alignment": ["alignment"],
            "alarm": ["alarm_status", "alarm"],
            "bearingTemp": ["bearing_temp"],
            "gearboxTemp": ["gearbox_temp"],
            "motorVoltage": ["motor_voltage"],
            "beltTension": ["belt_tension"],
            "emergencyStop": ["emergency_stop"],
            "beltSlip": ["belt_slip"],
            "operatingHours": ["operating_hours"],
            "alarmCode": ["alarm_code"],
        }

        for target_key, source_keys in field_map.items():
            for sk in source_keys:
                if sk in raw_data and raw_data[sk] is not None:
                    normalized[target_key] = raw_data[sk]
                    break

        # Ensure required fields have defaults
        normalized.setdefault("speed", 0.0)
        normalized.setdefault("motorRPM", 0)
        normalized.setdefault("motorCurrent", 0.0)
        normalized.setdefault("temperature", 0.0)
        normalized.setdefault("vibration", 0.0)
        normalized.setdefault("beltStatus", "UNKNOWN")
        normalized.setdefault("alignment", "NORMAL")
        normalized.setdefault("alarm", False)
        normalized.setdefault("operatingHours", 0)

        return normalized

    def _retry_loop(self):
        """Retry sending buffered data that failed."""
        while self._running:
            if self._retry_queue:
                failed = self._retry_queue.pop(0)
                if self._send_to_backend(failed):
                    self._stats["total_sent"] += 1
                else:
                    # Re-queue (max 3 retries)
                    if failed.get("_retries", 0) < 3:
                        failed["_retries"] = failed.get("_retries", 0) + 1
                        self._retry_queue.append(failed)
                    else:
                        self._stats["total_errors"] += 1
            time.sleep(5)

    def _flush_loop(self):
        """Periodically flush buffer to backend."""
        while self._running:
            while not self._buffer.empty():
                try:
                    data = self._buffer.get(block=False)
                    if self._send_to_backend(data):
                        self._stats["total_sent"] += 1
                        self._stats["last_send_time"] = datetime.utcnow().isoformat()
                    else:
                        data["_retries"] = 0
                        self._retry_queue.append(data)
                except queue.Empty:
                    break
                except Exception as e:
                    self._stats["total_errors"] += 1

            self._stats["buffer_size"] = self._buffer.qsize()
            time.sleep(1)

    def _send_to_backend(self, data: Dict) -> bool:
        """Send data to backend API via HTTPS."""
        if not REQUESTS_AVAILABLE:
            # Store locally as fallback
            self._store_locally(data)
            return True

        try:
            url = f"{self.backend_url}/api/edge/data"
            response = requests.post(url, json=data, timeout=5)
            if response.status_code == 200:
                return True
            else:
                print(f"[EdgeGateway] Backend returned {response.status_code}")
                return False
        except requests.exceptions.ConnectionError:
            self._store_locally(data)
            return False
        except Exception as e:
            print(f"[EdgeGateway] Send error: {e}")
            self._store_locally(data)
            return False

    def _store_locally(self, data: Dict):
        """Store data locally when backend is unavailable."""
        try:
            filename = f"/tmp/edge_buffer_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.json"
            with open(filename, 'w') as f:
                json.dump(data, f)
        except Exception:
            pass

    def send_to_backend(self, data: Dict) -> bool:
        """Manually send data to backend (for testing)."""
        return self._send_to_backend(data)

    def get_stats(self) -> Dict:
        """Get gateway statistics."""
        return {
            **self._stats,
            "gateway_id": self.gateway_id,
            "backend_url": self.backend_url,
            "registered_plcs": list(self._plc_clients.keys()),
            "collection_interval": self._collection_interval,
            "running": self._running,
        }

    def stop(self):
        """Stop the edge gateway."""
        self._running = False


class DataNormalizer:
    """Normalizes data from different PLC manufacturers to standard format."""

    MANUFACTURER_MAPS = {
        "siemens": {
            "belt_speed": "DB1.DBW0",
            "motor_rpm": "DB1.DBW2",
            "motor_current": "DB1.DBD4",
            "temperature": "DB1.DBD8",
            "vibration": "DB1.DBD12",
        },
        "allen_bradley": {
            "belt_speed": "N7:0",
            "motor_rpm": "N7:1",
            "motor_current": "F8:0",
            "temperature": "F8:1",
            "vibration": "F8:2",
        },
        "schneider": {
            "belt_speed": "%MW0",
            "motor_rpm": "%MW1",
            "motor_current": "%MF0",
            "temperature": "%MF1",
            "vibration": "%MF2",
        },
    }

    @staticmethod
    def normalize_alarm_code(code: int) -> Dict:
        """Convert PLC alarm code to human-readable format."""
        alarms = {
            0: {"status": "NORMAL", "message": "No alarms", "severity": "info"},
            1: {"status": "OVERTEMP", "message": "Bearing temperature high", "severity": "warning"},
            2: {"status": "OVERCURRENT", "message": "Motor overload", "severity": "critical"},
            3: {"status": "MISALIGN", "message": "Belt misalignment detected", "severity": "warning"},
            4: {"status": "SPLICE", "message": "Splice failure detected", "severity": "critical"},
            5: {"status": "SLIP", "message": "Belt slip detected", "severity": "warning"},
            10: {"status": "VIBRATION", "message": "Excessive vibration", "severity": "warning"},
            11: {"status": "ESTOP", "message": "Emergency stop activated", "severity": "critical"},
            99: {"status": "FAULT", "message": "General fault", "severity": "critical"},
        }
        return alarms.get(code, {"status": "UNKNOWN", "message": f"Unknown alarm code {code}", "severity": "info"})


# Global instances
edge_gateway = EdgeGateway()
data_normalizer = DataNormalizer()
