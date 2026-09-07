"""
WebSocket Module for Real-Time Sensor Streaming
- Live sensor data push to dashboard
- Real-time alert notifications
- Belt status updates
"""
import json
import time
import threading
from datetime import datetime
from typing import Any, Callable, Dict, List, Optional, Set

try:
    import websocket
    WEBSOCKET_CLIENT_AVAILABLE = True
except ImportError:
    WEBSOCKET_CLIENT_AVAILABLE = False


class WebSocketServer:
    """
    Simple WebSocket server for real-time sensor streaming.
    Uses threading to handle multiple connections.
    """

    def __init__(self, host: str = "localhost", port: int = 8765):
        self.host = host
        self.port = port
        self.clients: Set[Any] = set()
        self.channels: Dict[str, Set[Any]] = {}
        self.message_handlers: Dict[str, Callable] = {}
        self.running = False
        self._lock = threading.Lock()
        self._message_queue: List[Dict] = []
        self._history: Dict[str, List[Dict]] = {}
        self._max_history = 1000

    def register_handler(self, event_type: str, handler: Callable):
        """Register a handler for a specific event type."""
        self.message_handlers[event_type] = handler

    def subscribe(self, client_id: str, channel: str):
        """Subscribe a client to a channel."""
        with self._lock:
            if channel not in self.channels:
                self.channels[channel] = set()
            self.channels[channel].add(client_id)
            print(f"[WebSocket] Client {client_id} subscribed to {channel}")

    def unsubscribe(self, client_id: str, channel: str):
        """Unsubscribe a client from a channel."""
        with self._lock:
            if channel in self.channels:
                self.channels[channel].discard(client_id)

    def broadcast(self, channel: str, message: Dict) -> int:
        """Broadcast a message to all subscribers of a channel."""
        with self._lock:
            subscribers = self.channels.get(channel, set()).copy()

        if not subscribers:
            return 0

        message["_channel"] = channel
        message["_timestamp"] = datetime.utcnow().isoformat()

        # Store in history
        if channel not in self._history:
            self._history[channel] = []
        self._history[channel].append(message)
        if len(self._history[channel]) > self._max_history:
            self._history[channel] = self._history[channel][-self._max_history:]

        # Queue for delivery
        self._message_queue.append(message)

        return len(subscribers)

    def broadcast_all(self, message: Dict) -> int:
        """Broadcast to all connected clients."""
        count = 0
        for channel in list(self.channels.keys()):
            count += self.broadcast(channel, message)
        return count

    def get_history(self, channel: str, limit: int = 50) -> List[Dict]:
        """Get message history for a channel."""
        return self._history.get(channel, [])[-limit:]

    def get_stats(self) -> Dict:
        """Get WebSocket server statistics."""
        return {
            "host": self.host,
            "port": self.port,
            "total_subscribers": sum(len(s) for s in self.channels.values()),
            "channels": {ch: len(subs) for ch, subs in self.channels.items()},
            "messages_queued": len(self._message_queue),
            "total_messages_sent": sum(len(h) for h in self._history.values()),
        }


class SensorStreamManager:
    """
    Manages real-time sensor data streaming via WebSocket.
    Simulates ESP32 sensor data push.
    """

    def __init__(self):
        self.ws_server = WebSocketServer()
        self._streaming = False
        self._stream_thread = None
        self._sensor_data: Dict[str, Dict] = {}
        self._subscribers: Dict[str, List[Callable]] = {}
        self._callbacks: List[Callable] = []

    def register_callback(self, callback: Callable):
        """Register a callback for new sensor data."""
        self._callbacks.append(callback)

    def update_sensor(self, belt_id: str, sensor_type: str, data: Dict):
        """Update sensor data and notify subscribers."""
        key = f"{belt_id}:{sensor_type}"
        data["belt_id"] = belt_id
        data["sensor_type"] = sensor_type
        data["updated_at"] = datetime.utcnow().isoformat()
        self._sensor_data[key] = data

        # Broadcast to WebSocket
        self.ws_server.broadcast(f"sensors:{belt_id}", {
            "type": "sensor_update",
            "belt_id": belt_id,
            "sensor_type": sensor_type,
            "data": data
        })

        # Broadcast to global sensor channel
        self.ws_server.broadcast("sensors:all", {
            "type": "sensor_update",
            "belt_id": belt_id,
            "sensor_type": sensor_type,
            "data": data
        })

        # Notify callbacks
        for cb in self._callbacks:
            try:
                cb(belt_id, sensor_type, data)
            except Exception:
                pass

    def get_latest(self, belt_id: Optional[str] = None, sensor_type: Optional[str] = None) -> Dict:
        """Get latest sensor data, optionally filtered."""
        if belt_id and sensor_type:
            return self._sensor_data.get(f"{belt_id}:{sensor_type}", {})
        elif belt_id:
            return {k.split(":")[1]: v for k, v in self._sensor_data.items() if k.startswith(f"{belt_id}:")}
        else:
            return self._sensor_data.copy()

    def send_alert(self, belt_id: str, alert: Dict):
        """Send a real-time alert notification."""
        self.ws_server.broadcast("alerts:all", {
            "type": "alert",
            "belt_id": belt_id,
            "alert": alert,
            "timestamp": datetime.utcnow().isoformat()
        })

    def send_prediction(self, belt_id: str, prediction: Dict):
        """Send ML prediction update."""
        self.ws_server.broadcast("predictions:all", {
            "type": "prediction",
            "belt_id": belt_id,
            "prediction": prediction,
            "timestamp": datetime.utcnow().isoformat()
        })

    def get_stream_stats(self) -> Dict:
        """Get streaming statistics."""
        return {
            **self.ws_server.get_stats(),
            "active_sensors": len(self._sensor_data),
            "belt_ids": list(set(k.split(":")[0] for k in self._sensor_data.keys())),
            "sensor_types": list(set(k.split(":")[1] for k in self._sensor_data.keys())),
        }


class RealTimeNotifier:
    """Handles real-time notifications to the dashboard."""

    def __init__(self):
        self._notifications: List[Dict] = []
        self._max_notifications = 500

    def notify(self, event_type: str, title: str, message: str, data: Optional[Dict] = None):
        """Add a new notification."""
        notification = {
            "id": f"notif_{int(time.time() * 1000)}",
            "type": event_type,
            "title": title,
            "message": message,
            "data": data or {},
            "timestamp": datetime.utcnow().isoformat(),
            "read": False,
        }
        self._notifications.append(notification)
        if len(self._notifications) > self._max_notifications:
            self._notifications = self._notifications[-self._max_notifications:]
        return notification

    def get_notifications(self, limit: int = 50, unread_only: bool = False) -> List[Dict]:
        """Get recent notifications."""
        notifs = self._notifications
        if unread_only:
            notifs = [n for n in notifs if not n["read"]]
        return notifs[-limit:]

    def mark_read(self, notification_id: str) -> bool:
        """Mark a notification as read."""
        for n in self._notifications:
            if n["id"] == notification_id:
                n["read"] = True
                return True
        return False

    def clear_all(self):
        """Clear all notifications."""
        self._notifications.clear()


# Global instances
ws_server = WebSocketServer()
sensor_stream = SensorStreamManager()
notifier = RealTimeNotifier()
