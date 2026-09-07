"""
InfluxDB Time-Series Module
- Stores sensor readings as time-series data
- Fast queries for trends, aggregations, and historical analysis
- Better than MongoDB for high-frequency sensor data
"""
import json
import time
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

try:
    from influxdb_client import InfluxDBClient, Point, WritePrecision
    from influxdb_client.client.write_api import SYNCHRONOUS
    INFLUX_AVAILABLE = True
except ImportError:
    INFLUX_AVAILABLE = False


class InfluxDBStore:
    """InfluxDB time-series database for sensor data."""

    def __init__(self, url: str = "http://localhost:8086", token: str = "", org: str = "nmdc", bucket: str = "nmdc-sensors"):
        self.url = url
        self.token = token
        self.org = org
        self.bucket = bucket
        self.client = None
        self.write_api = None
        self.query_api = None
        self.connected = False
        self._fallback_store: Dict[str, List[Dict]] = {}
        self._connect()

    def _connect(self):
        """Connect to InfluxDB."""
        if not INFLUX_AVAILABLE:
            print("[InfluxDB] influxdb_client not installed. Using in-memory fallback.")
            return

        try:
            self.client = InfluxDBClient(url=self.url, token=self.token, org=self.org)
            self.write_api = self.client.write_api(write_options=SYNCHRONOUS)
            self.query_api = self.client.query_api()
            self.connected = True
            print(f"[InfluxDB] Connected to {self.url}")
        except Exception as e:
            print(f"[InfluxDB] Connection failed: {e}. Using in-memory fallback.")

    def write_sensor(self, belt_id: str, sensor_type: str, value: float, tags: Optional[Dict] = None):
        """Write a single sensor reading."""
        point = (
            Point("sensor_reading")
            .tag("belt_id", belt_id)
            .tag("sensor_type", sensor_type)
            .field("value", float(value))
            .time(datetime.utcnow(), WritePrecision.S)
        )

        if tags:
            for k, v in tags.items():
                point = point.tag(k, str(v))

        if self.connected:
            try:
                self.write_api.write(bucket=self.bucket, org=self.org, record=point)
            except Exception as e:
                print(f"[InfluxDB] Write error: {e}")
                self._fallback_write(belt_id, sensor_type, value, tags)
        else:
            self._fallback_write(belt_id, sensor_type, value, tags)

    def _fallback_write(self, belt_id: str, sensor_type: str, value: float, tags: Optional[Dict]):
        """In-memory fallback for writes."""
        key = f"{belt_id}:{sensor_type}"
        if key not in self._fallback_store:
            self._fallback_store[key] = []
        self._fallback_store[key].append({
            "time": datetime.utcnow().isoformat(),
            "value": value,
            "tags": tags or {},
        })
        # Keep last 10000 points
        if len(self._fallback_store[key]) > 10000:
            self._fallback_store[key] = self._fallback_store[key][-10000:]

    def write_batch(self, readings: List[Dict]):
        """Write multiple sensor readings at once."""
        points = []
        for r in readings:
            point = (
                Point("sensor_reading")
                .tag("belt_id", r["belt_id"])
                .tag("sensor_type", r["sensor_type"])
                .field("value", float(r["value"]))
                .time(r.get("time", datetime.utcnow()), WritePrecision.S)
            )
            if "tags" in r:
                for k, v in r["tags"].items():
                    point = point.tag(k, str(v))
            points.append(point)

        if self.connected and points:
            try:
                self.write_api.write(bucket=self.bucket, org=self.org, record=points)
            except Exception as e:
                print(f"[InfluxDB] Batch write error: {e}")

    def query_latest(self, belt_id: str, sensor_type: str) -> Optional[Dict]:
        """Query the latest reading for a sensor."""
        if self.connected:
            try:
                query = f'''
                from(bucket: "{self.bucket}")
                    |> range(start: -24h)
                    |> filter(fn: (r) => r["belt_id"] == "{belt_id}")
                    |> filter(fn: (r) => r["sensor_type"] == "{sensor_type}")
                    |> last()
                '''
                tables = self.query_api.query(query, org=self.org)
                for table in tables:
                    for record in table.records:
                        return {
                            "time": record.get_time().isoformat(),
                            "value": record.get_value(),
                            "sensor_type": sensor_type,
                            "belt_id": belt_id,
                        }
            except Exception as e:
                print(f"[InfluxDB] Query error: {e}")

        # Fallback to in-memory
        key = f"{belt_id}:{sensor_type}"
        readings = self._fallback_store.get(key, [])
        if readings:
            latest = readings[-1]
            return {
                "time": latest["time"],
                "value": latest["value"],
                "sensor_type": sensor_type,
                "belt_id": belt_id,
            }
        return None

    def query_range(self, belt_id: str, sensor_type: str, hours: int = 24) -> List[Dict]:
        """Query readings over a time range."""
        if self.connected:
            try:
                query = f'''
                from(bucket: "{self.bucket}")
                    |> range(start: -{hours}h)
                    |> filter(fn: (r) => r["belt_id"] == "{belt_id}")
                    |> filter(fn: (r) => r["sensor_type"] == "{sensor_type}")
                    |> aggregateWindow(every: 5m, fn: mean, createEmpty: false)
                    |> yield(name: "mean")
                '''
                tables = self.query_api.query(query, org=self.org)
                results = []
                for table in tables:
                    for record in table.records:
                        results.append({
                            "time": record.get_time().isoformat(),
                            "value": record.get_value(),
                        })
                return results
            except Exception as e:
                print(f"[InfluxDB] Range query error: {e}")

        # Fallback
        key = f"{belt_id}:{sensor_type}"
        return self._fallback_store.get(key, [])[-288:]  # Last 24h at 5min intervals

    def query_statistics(self, belt_id: str, sensor_type: str, hours: int = 24) -> Dict:
        """Query statistics (min, max, mean, std) for a sensor."""
        readings = self.query_range(belt_id, sensor_type, hours)
        if not readings:
            return {"min": 0, "max": 0, "mean": 0, "count": 0}

        values = [r["value"] for r in readings]
        return {
            "min": min(values),
            "max": max(values),
            "mean": sum(values) / len(values),
            "count": len(values),
            "std": (sum((v - sum(values)/len(values))**2 for v in values) / len(values)) ** 0.5,
        }

    def query_all_sensors(self, belt_id: str, hours: int = 1) -> Dict[str, List[Dict]]:
        """Query all sensor types for a belt."""
        sensor_types = ["vibration", "temperature", "motor_current", "acoustic", "load", "em_signal"]
        result = {}
        for st in sensor_types:
            readings = self.query_range(belt_id, st, hours)
            if readings:
                result[st] = readings
        return result

    def delete_old_data(self, days: int = 30):
        """Delete data older than N days."""
        if self.connected:
            try:
                start = datetime.utcnow() - timedelta(days=days)
                stop = datetime.utcnow()
                self.delete_api = self.client.delete_api()
                self.delete_api.delete(
                    start=start,
                    stop=stop,
                    predicate=f'_measurement="sensor_reading"',
                    bucket=self.bucket,
                    org=self.org
                )
                print(f"[InfluxDB] Deleted data older than {days} days")
            except Exception as e:
                print(f"[InfluxDB] Delete error: {e}")
        else:
            cutoff = (datetime.utcnow() - timedelta(days=days)).isoformat()
            for key in self._fallback_store:
                self._fallback_store[key] = [
                    r for r in self._fallback_store[key]
                    if r["time"] > cutoff
                ]

    def get_stats(self) -> Dict:
        """Get InfluxDB statistics."""
        total_points = sum(len(v) for v in self._fallback_store.values())
        return {
            "connected": self.connected,
            "url": self.url,
            "org": self.org,
            "bucket": self.bucket,
            "total_points_stored": total_points,
            "sensors_tracked": len(self._fallback_store),
        }


# Global instance
influx_store = InfluxDBStore()
