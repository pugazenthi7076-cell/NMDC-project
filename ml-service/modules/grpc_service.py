"""
gRPC High-Performance Communication Module
- Fast inter-service communication between ML, Frontend, and IoT
- Protocol Buffer serialization
- Bidirectional streaming for real-time data
"""
import json
import time
import threading
from datetime import datetime
from typing import Any, Callable, Dict, List, Optional

try:
    import grpc
    from grpc import aio
    GRPC_AVAILABLE = True
except ImportError:
    GRPC_AVAILABLE = False


# --- Protocol Buffer-like Service Definitions ---

class GRPCMessage:
    """Simple message wrapper (Protocol Buffer-like)."""

    def __init__(self, service: str, method: str, data: Dict, request_id: Optional[str] = None):
        self.service = service
        self.method = method
        self.data = data
        self.request_id = request_id or f"req_{int(time.time() * 1000)}"
        self.timestamp = datetime.utcnow().isoformat()
        self.metadata = {}

    def to_dict(self) -> Dict:
        return {
            "service": self.service,
            "method": self.method,
            "data": self.data,
            "request_id": self.request_id,
            "timestamp": self.timestamp,
            "metadata": self.metadata,
        }

    def serialize(self) -> bytes:
        return json.dumps(self.to_dict(), default=str).encode("utf-8")

    @classmethod
    def deserialize(cls, data: bytes) -> "GRPCMessage":
        parsed = json.loads(data.decode("utf-8"))
        msg = cls(
            service=parsed["service"],
            method=parsed["method"],
            data=parsed["data"],
            request_id=parsed["request_id"],
        )
        msg.timestamp = parsed.get("timestamp", msg.timestamp)
        msg.metadata = parsed.get("metadata", {})
        return msg


# --- Service Definitions ---

class SensorServiceServicer:
    """gRPC service for sensor data exchange."""

    def __init__(self):
        self._handlers: Dict[str, Callable] = {}

    def register_handler(self, method: str, handler: Callable):
        self._handlers[method] = handler

    def handle(self, method: str, request: GRPCMessage) -> GRPCMessage:
        handler = self._handlers.get(method)
        if handler:
            result = handler(request.data)
            return GRPCMessage(
                service="SensorService",
                method=method,
                data=result,
                request_id=request.request_id,
            )
        return GRPCMessage(
            service="SensorService",
            method=method,
            data={"error": f"Unknown method: {method}"},
            request_id=request.request_id,
        )


class PredictionServiceServicer:
    """gRPC service for ML predictions."""

    def __init__(self):
        self._handlers: Dict[str, Callable] = {}

    def register_handler(self, method: str, handler: Callable):
        self._handlers[method] = handler

    def handle(self, method: str, request: GRPCMessage) -> GRPCMessage:
        handler = self._handlers.get(method)
        if handler:
            result = handler(request.data)
            return GRPCMessage(
                service="PredictionService",
                method=method,
                data=result,
                request_id=request.request_id,
            )
        return GRPCMessage(
            service="PredictionService",
            method=method,
            data={"error": f"Unknown method: {method}"},
            request_id=request.request_id,
        )


class AlertServiceServicer:
    """gRPC service for alert management."""

    def __init__(self):
        self._handlers: Dict[str, Callable] = {}

    def register_handler(self, method: str, handler: Callable):
        self._handlers[method] = handler

    def handle(self, method: str, request: GRPCMessage) -> GRPCMessage:
        handler = self._handlers.get(method)
        if handler:
            result = handler(request.data)
            return GRPCMessage(
                service="AlertService",
                method=method,
                data=result,
                request_id=request.request_id,
            )
        return GRPCMessage(
            service="AlertService",
            method=method,
            data={"error": f"Unknown method: {method}"},
            request_id=request.request_id,
        )


# --- gRPC Server ---

class GRPCServer:
    """
    Custom gRPC-like server using TCP sockets.
    Provides high-performance RPC between services.
    """

    def __init__(self, host: str = "localhost", port: int = 50051):
        self.host = host
        self.port = port
        self.services: Dict[str, Any] = {}
        self._running = False
        self._server_socket = None
        self._thread = None
        self._request_count = 0
        self._error_count = 0

    def register_service(self, name: str, servicer: Any):
        """Register a service."""
        self.services[name] = servicer
        print(f"[gRPC] Registered service: {name}")

    def _handle_request(self, data: bytes) -> bytes:
        """Handle an incoming request."""
        try:
            request = GRPCMessage.deserialize(data)
            service = self.services.get(request.service)
            if not service:
                response = GRPCMessage(
                    service=request.service,
                    method=request.method,
                    data={"error": f"Service '{request.service}' not found"},
                    request_id=request.request_id,
                )
            else:
                response = service.handle(request.method, request)
            self._request_count += 1
            return response.serialize()
        except Exception as e:
            self._error_count += 1
            return json.dumps({"error": str(e)}).encode("utf-8")

    def start(self):
        """Start the gRPC server."""
        import socket
        self._server_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        self._server_socket.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        self._server_socket.bind((self.host, self.port))
        self._server_socket.listen(5)
        self._running = True
        self._thread = threading.Thread(target=self._accept_loop, daemon=True)
        self._thread.start()
        print(f"[gRPC] Server started on {self.host}:{self.port}")

    def _accept_loop(self):
        """Accept incoming connections."""
        import socket
        while self._running:
            try:
                self._server_socket.settimeout(1.0)
                client_socket, address = self._server_socket.accept()
                threading.Thread(
                    target=self._handle_client,
                    args=(client_socket,),
                    daemon=True
                ).start()
            except socket.timeout:
                continue
            except Exception as e:
                if self._running:
                    print(f"[gRPC] Accept error: {e}")

    def _handle_client(self, client_socket):
        """Handle a single client connection."""
        try:
            data = client_socket.recv(65536)
            if data:
                response = self._handle_request(data)
                client_socket.sendall(response)
        except Exception as e:
            print(f"[gRPC] Client handler error: {e}")
        finally:
            client_socket.close()

    def stop(self):
        """Stop the server."""
        self._running = False
        if self._server_socket:
            self._server_socket.close()

    def get_stats(self) -> Dict:
        return {
            "host": self.host,
            "port": self.port,
            "services": list(self.services.keys()),
            "requests_handled": self._request_count,
            "errors": self._error_count,
            "running": self._running,
        }


# --- gRPC Client ---

class GRPCClient:
    """gRPC client for calling remote services."""

    def __init__(self, host: str = "localhost", port: int = 50051):
        self.host = host
        self.port = port
        self._request_count = 0
        self._error_count = 0

    def call(self, service: str, method: str, data: Dict, timeout: float = 10.0) -> Dict:
        """Make an RPC call."""
        import socket
        request = GRPCMessage(service=service, method=method, data=data)

        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(timeout)
            sock.connect((self.host, self.port))
            sock.sendall(request.serialize())

            response_data = sock.recv(65536)
            sock.close()

            response = GRPCMessage.deserialize(response_data)
            self._request_count += 1
            return response.data
        except Exception as e:
            self._error_count += 1
            return {"error": str(e)}

    def predict(self, belt_id: str, sensors: Dict) -> Dict:
        """Call prediction service."""
        return self.call("PredictionService", "predict", {
            "belt_id": belt_id,
            "sensors": sensors,
        })

    def ingest_sensor(self, belt_id: str, sensor_type: str, value: float) -> Dict:
        """Call sensor ingestion service."""
        return self.call("SensorService", "ingest", {
            "belt_id": belt_id,
            "sensor_type": sensor_type,
            "value": value,
        })

    def send_alert(self, belt_id: str, severity: str, message: str) -> Dict:
        """Call alert service."""
        return self.call("AlertService", "send", {
            "belt_id": belt_id,
            "severity": severity,
            "message": message,
        })

    def get_stats(self) -> Dict:
        return {
            "host": self.host,
            "port": self.port,
            "requests_made": self._request_count,
            "errors": self._error_count,
        }


# --- Streaming Service ---

class GRPCStreamManager:
    """Bidirectional streaming for real-time sensor data."""

    def __init__(self):
        self._streams: Dict[str, List[Dict]] = {}
        self._subscribers: Dict[str, List[Callable]] = {}
        self._lock = threading.Lock()

    def publish(self, stream_name: str, data: Dict):
        """Publish data to a stream."""
        with self._lock:
            if stream_name not in self._streams:
                self._streams[stream_name] = []
            data["_stream"] = stream_name
            data["_timestamp"] = datetime.utcnow().isoformat()
            self._streams[stream_name].append(data)
            if len(self._streams[stream_name]) > 10000:
                self._streams[stream_name] = self._streams[stream_name][-10000:]

        # Notify subscribers
        for callback in self._subscribers.get(stream_name, []):
            try:
                callback(data)
            except Exception:
                pass

    def subscribe(self, stream_name: str, callback: Callable):
        """Subscribe to a stream."""
        with self._lock:
            if stream_name not in self._subscribers:
                self._subscribers[stream_name] = []
            self._subscribers[stream_name].append(callback)

    def get_recent(self, stream_name: str, limit: int = 100) -> List[Dict]:
        """Get recent stream data."""
        return self._streams.get(stream_name, [])[-limit:]

    def get_stats(self) -> Dict:
        return {
            "streams": {name: len(data) for name, data in self._streams.items()},
            "subscribers": {name: len(subs) for name, subs in self._subscribers.items()},
        }


# --- Global Instances ---

grpc_server = GRPCServer()
grpc_client = GRPCClient()
stream_manager = GRPCStreamManager()

# Register default services
sensor_service = SensorServiceServicer()
prediction_service = PredictionServiceServicer()
alert_service = AlertServiceServicer()

grpc_server.register_service("SensorService", sensor_service)
grpc_server.register_service("PredictionService", prediction_service)
grpc_server.register_service("AlertService", alert_service)
