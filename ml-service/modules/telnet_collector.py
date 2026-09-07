"""
Telnet Data Collection Module
- Collects sensor data from ESP32/IoT devices via Telnet
- Supports real-time streaming from multiple belt sensors
- Parses sensor readings from Telnet responses
"""
import socket
import time
import threading
import re
from datetime import datetime
from typing import Any, Callable, Dict, List, Optional


class TelnetClient:
    """Telnet client for connecting to ESP32 sensor devices."""

    def __init__(self, host: str, port: int = 23, timeout: float = 5.0):
        self.host = host
        self.port = port
        self.timeout = timeout
        self.socket: Optional[socket.socket] = None
        self.connected = False
        self._buffer = ""

    def connect(self) -> bool:
        """Connect to Telnet server."""
        try:
            self.socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            self.socket.settimeout(self.timeout)
            self.socket.connect((self.host, self.port))
            self.connected = True
            print(f"[Telnet] Connected to {self.host}:{self.port}")

            # Read any welcome/banner message
            try:
                welcome = self.socket.recv(1024).decode("utf-8", errors="ignore")
                if welcome:
                    print(f"[Telnet] Banner: {welcome.strip()[:100]}")
            except socket.timeout:
                pass

            return True
        except Exception as e:
            print(f"[Telnet] Connection failed to {self.host}:{self.port}: {e}")
            self.connected = False
            return False

    def send(self, command: str) -> str:
        """Send a command and return the response."""
        if not self.connected or not self.socket:
            return ""

        try:
            # Send command with newline
            self.socket.sendall((command + "\n").encode("utf-8"))
            time.sleep(0.1)

            # Read response
            response = ""
            self.socket.settimeout(2.0)
            try:
                while True:
                    chunk = self.socket.recv(4096).decode("utf-8", errors="ignore")
                    if not chunk:
                        break
                    response += chunk
                    # Check for prompt or end of response
                    if any(p in chunk for p in [">", "$", "#", "\r\n>"]):
                        break
            except socket.timeout:
                pass

            return response.strip()
        except Exception as e:
            print(f"[Telnet] Send error: {e}")
            return ""

    def read_line(self) -> str:
        """Read a single line from the Telnet connection."""
        if not self.connected or not self.socket:
            return ""
        try:
            self.socket.settimeout(2.0)
            data = b""
            while True:
                byte = self.socket.recv(1)
                if not byte:
                    break
                if byte in (b"\n", b"\r"):
                    if data:
                        break
                    continue
                data += byte
            return data.decode("utf-8", errors="ignore").strip()
        except socket.timeout:
            return ""
        except Exception:
            return ""

    def disconnect(self):
        """Disconnect from Telnet server."""
        try:
            if self.socket:
                self.socket.close()
        except Exception:
            pass
        self.connected = False
        self.socket = None

    def is_alive(self) -> bool:
        """Check if connection is alive."""
        if not self.connected or not self.socket:
            return False
        try:
            self.socket.settimeout(0.1)
            data = self.socket.recv(1, socket.MSG_PEEK)
            return True
        except socket.timeout:
            return True  # Timeout means connection is alive, just no data
        except Exception:
            return False


class TelnetSensorCollector:
    """
    Collects sensor data from ESP32 devices via Telnet.
    Supports multiple belt sensors with automatic reconnection.
    """

    # Default sensor port mapping for ESP32
    SENSOR_TYPES = ["vibration", "temperature", "motor_current", "acoustic", "load", "em_signal"]

    def __init__(self):
        self.devices: Dict[str, TelnetClient] = {}
        self._readings: Dict[str, List[Dict]] = {}
        self._callbacks: List[Callable] = []
        self._running = False
        self._threads: Dict[str, threading.Thread] = {}
        self._lock = threading.Lock()
        self._stats = {
            "total_readings": 0,
            "connections_made": 0,
            "errors": 0,
            "last_reading_time": None,
        }

    def register_device(self, belt_id: str, host: str, port: int = 23) -> bool:
        """Register a belt's ESP32 device for data collection."""
        client = TelnetClient(host, port)
        if client.connect():
            with self._lock:
                self.devices[belt_id] = client
                self._readings[belt_id] = []
                self._stats["connections_made"] += 1
            print(f"[TelnetCollector] Registered device: {belt_id} at {host}:{port}")
            return True
        return False

    def disconnect_device(self, belt_id: str):
        """Disconnect from a device."""
        with self._lock:
            client = self.devices.pop(belt_id, None)
            if client:
                client.disconnect()

    def register_callback(self, callback: Callable):
        """Register callback for new readings: callback(belt_id, sensor_type, data)"""
        self._callbacks.append(callback)

    def collect_reading(self, belt_id: str, command: str = "GET_SENSORS") -> Optional[Dict]:
        """Collect a single reading from a belt's sensor device."""
        client = self.devices.get(belt_id)
        if not client:
            # Try to simulate if device not connected
            return self._simulate_reading(belt_id)

        if not client.connected:
            # Attempt reconnection
            if not client.connect():
                return self._simulate_reading(belt_id)

        response = client.send(command)
        if not response:
            return self._simulate_reading(belt_id)

        return self._parse_response(belt_id, response)

    def _parse_response(self, belt_id: str, response: str) -> Dict:
        """Parse sensor data from Telnet response."""
        reading = {
            "belt_id": belt_id,
            "timestamp": datetime.utcnow().isoformat(),
            "source": "telnet",
            "sensors": {},
            "raw": response,
        }

        # Try to parse JSON-like response
        try:
            import json
            data = json.loads(response)
            reading["sensors"] = data
            return reading
        except (json.JSONDecodeError, ValueError):
            pass

        # Parse key=value pairs (common in ESP32 responses)
        patterns = {
            "vibration": r"vibration[=:]\s*([\d.]+)",
            "temperature": r"temp(?:erature)?[=:]\s*([\d.]+)",
            "motor_current": r"motor[_\s]current[=:]\s*([\d.]+)",
            "acoustic": r"acoustic[=:]\s*([\d.]+)",
            "load": r"load[=:]\s*([\d.]+)",
            "em_signal": r"em[_\s]?signal[=:]\s*([\d.]+)",
        }

        for sensor_type, pattern in patterns.items():
            match = re.search(pattern, response, re.IGNORECASE)
            if match:
                reading["sensors"][sensor_type] = float(match.group(1))

        # Parse any numeric values if patterns didn't match
        if not reading["sensors"]:
            numbers = re.findall(r"[\d.]+", response)
            for i, sensor_type in enumerate(self.SENSOR_TYPES):
                if i < len(numbers):
                    reading["sensors"][sensor_type] = float(numbers[i])

        return reading

    def _simulate_reading(self, belt_id: str) -> Dict:
        """Simulate sensor reading when device is not connected."""
        import random
        reading = {
            "belt_id": belt_id,
            "timestamp": datetime.utcnow().isoformat(),
            "source": "simulated",
            "sensors": {
                "vibration": round(random.uniform(2.0, 12.0), 2),
                "temperature": round(random.uniform(25.0, 80.0), 2),
                "motor_current": round(random.uniform(150.0, 350.0), 2),
                "acoustic": round(random.uniform(40.0, 90.0), 2),
                "load": round(random.uniform(1500.0, 3000.0), 2),
                "em_signal": round(random.uniform(0.1, 0.9), 3),
            },
        }
        return reading

    def _store_reading(self, belt_id: str, reading: Dict):
        """Store a reading and notify callbacks."""
        with self._lock:
            if belt_id not in self._readings:
                self._readings[belt_id] = []
            self._readings[belt_id].append(reading)
            # Keep last 1000 readings per belt
            if len(self._readings[belt_id]) > 1000:
                self._readings[belt_id] = self._readings[belt_id][-1000:]

        self._stats["total_readings"] += 1
        self._stats["last_reading_time"] = datetime.utcnow().isoformat()

        # Notify callbacks
        for sensor_type, value in reading.get("sensors", {}).items():
            for cb in self._callbacks:
                try:
                    cb(belt_id, sensor_type, {"value": value, "timestamp": reading["timestamp"]})
                except Exception:
                    pass

    def start_continuous_collection(self, belt_id: str, interval: float = 5.0, command: str = "GET_SENSORS"):
        """Start continuous data collection for a belt."""
        def _collect_loop():
            while self._running and belt_id in self.devices:
                reading = self.collect_reading(belt_id, command)
                if reading:
                    self._store_reading(belt_id, reading)
                time.sleep(interval)

        self._running = True
        thread = threading.Thread(target=_collect_loop, daemon=True, name=f"telnet-{belt_id}")
        thread.start()
        self._threads[belt_id] = thread
        print(f"[TelnetCollector] Started continuous collection for {belt_id} (interval={interval}s)")

    def stop_collection(self, belt_id: Optional[str] = None):
        """Stop data collection."""
        self._running = False
        if belt_id:
            thread = self._threads.pop(belt_id, None)
            if thread:
                thread.join(timeout=2)
        else:
            for tid, thread in self._threads.items():
                thread.join(timeout=2)
            self._threads.clear()

    def get_latest(self, belt_id: str) -> Optional[Dict]:
        """Get latest reading for a belt."""
        readings = self._readings.get(belt_id, [])
        return readings[-1] if readings else None

    def get_history(self, belt_id: str, limit: int = 50) -> List[Dict]:
        """Get reading history for a belt."""
        return self._readings.get(belt_id, [])[-limit:]

    def get_all_latest(self) -> Dict[str, Dict]:
        """Get latest reading for all belts."""
        return {belt_id: readings[-1] for belt_id, readings in self._readings.items() if readings}

    def get_stats(self) -> Dict:
        """Get collection statistics."""
        return {
            **self._stats,
            "registered_devices": list(self.devices.keys()),
            "active_threads": list(self._threads.keys()),
            "readings_per_belt": {bid: len(r) for bid, r in self._readings.items()},
            "total_readings_stored": sum(len(r) for r in self._readings.values()),
        }


class TelnetSensorSimulator:
    """
    Simulates ESP32 sensor data via Telnet protocol.
    Useful for testing without real hardware.
    """

    def __init__(self, host: str = "0.0.0.0", port: int = 23):
        self.host = host
        self.port = port
        self.server_socket: Optional[socket.socket] = None
        self.running = False
        self._thread: Optional[threading.Thread] = None
        self._clients: List[socket.socket] = []

    def start(self):
        """Start the Telnet sensor simulator."""
        self.server_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        self.server_socket.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        self.server_socket.bind((self.host, self.port))
        self.server_socket.listen(5)
        self.running = True
        self._thread = threading.Thread(target=self._accept_loop, daemon=True)
        self._thread.start()
        print(f"[TelnetSimulator] Started on {self.host}:{self.port}")

    def _accept_loop(self):
        """Accept incoming connections."""
        while self.running:
            try:
                self.server_socket.settimeout(1.0)
                client, addr = self.server_socket.accept()
                print(f"[TelnetSimulator] Client connected from {addr}")
                threading.Thread(
                    target=self._handle_client, args=(client,), daemon=True
                ).start()
            except socket.timeout:
                continue
            except Exception as e:
                if self.running:
                    print(f"[TelnetSimulator] Accept error: {e}")

    def _handle_client(self, client: socket.socket):
        """Handle a connected sensor client."""
        import random
        try:
            # Send welcome banner
            client.sendall(b"NMDC-Belt-Sensor v2.0\r\nType GET_SENSORS for readings\r\n> ")

            while self.running:
                data = client.recv(1024).decode("utf-8", errors="ignore").strip()
                if not data:
                    break

                if "GET_SENSORS" in data.upper():
                    # Generate random sensor readings
                    import json
                    readings = {
                        "vibration": round(random.uniform(2.0, 12.0), 2),
                        "temperature": round(random.uniform(25.0, 80.0), 2),
                        "motor_current": round(random.uniform(150.0, 350.0), 2),
                        "acoustic": round(random.uniform(40.0, 90.0), 2),
                        "load": round(random.uniform(1500.0, 3000.0), 2),
                        "em_signal": round(random.uniform(0.1, 0.9), 3),
                        "timestamp": datetime.utcnow().isoformat(),
                    }
                    response = json.dumps(readings)
                    client.sendall((response + "\r\n> ").encode("utf-8"))

                elif "STATUS" in data.upper():
                    client.sendall(b"STATUS: OK\r\nUptime: 99.9%\r\n> ")

                elif "HELP" in data.upper():
                    client.sendall(
                        b"Commands:\r\n"
                        b"  GET_SENSORS - Get all sensor readings\r\n"
                        b"  STATUS      - Device status\r\n"
                        b"  HELP        - Show this help\r\n"
                        b"> "
                    )

                else:
                    client.sendall(b"Unknown command. Type HELP for commands.\r\n> ")

        except Exception as e:
            print(f"[TelnetSimulator] Client error: {e}")
        finally:
            client.close()

    def stop(self):
        """Stop the simulator."""
        self.running = False
        if self.server_socket:
            self.server_socket.close()


# Global instances
telnet_collector = TelnetSensorCollector()
telnet_simulator = TelnetSensorSimulator()
