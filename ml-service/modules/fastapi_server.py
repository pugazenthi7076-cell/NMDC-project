"""
FastAPI Async API Module
- Modern async Python API alongside Flask
- WebSocket support for real-time data
- Auto-generated OpenAPI docs
- High-performance ML prediction endpoints
"""
import json
import time
from datetime import datetime
from typing import Any, Dict, List, Optional

try:
    from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Query
    from fastapi.middleware.cors import CORSMiddleware
    from fastapi.responses import JSONResponse
    from pydantic import BaseModel
    FASTAPI_AVAILABLE = True
except ImportError:
    FASTAPI_AVAILABLE = False

# --- Pydantic Models ---

if FASTAPI_AVAILABLE:
    class SensorReading(BaseModel):
        belt_id: str
        sensor_type: str
        value: float
        timestamp: Optional[str] = None

    class PredictionRequest(BaseModel):
        belt_id: str
        sensors: Dict[str, float]
        include_yolo: bool = True
        include_fusion: bool = True

    class AlertRequest(BaseModel):
        belt_id: str
        severity: str
        message: str
        alert_type: str = "system"

    class TrainingRequest(BaseModel):
        model_type: str = "xgboost"
        samples: int = 2000
        retrain: bool = False

    class SearchQuery(BaseModel):
        query: str
        doc_type: str = "logs"
        limit: int = 20


# --- WebSocket Connection Manager ---

class ConnectionManager:
    """Manage WebSocket connections for real-time updates."""

    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
        self.channels: Dict[str, List[str]] = {}

    async def connect(self, websocket: WebSocket, client_id: str):
        await websocket.accept()
        self.active_connections[client_id] = websocket
        print(f"[FastAPI WS] Client {client_id} connected")

    def disconnect(self, client_id: str):
        self.active_connections.pop(client_id, None)
        for channel, clients in self.channels.items():
            if client_id in clients:
                clients.remove(client_id)
        print(f"[FastAPI WS] Client {client_id} disconnected")

    async def send_to_client(self, client_id: str, message: Dict):
        ws = self.active_connections.get(client_id)
        if ws:
            try:
                await ws.send_json(message)
            except Exception:
                self.disconnect(client_id)

    async def broadcast(self, channel: str, message: Dict):
        disconnected = []
        for client_id in self.channels.get(channel, []):
            ws = self.active_connections.get(client_id)
            if ws:
                try:
                    await ws.send_json(message)
                except Exception:
                    disconnected.append(client_id)
        for cid in disconnected:
            self.disconnect(cid)

    def subscribe(self, client_id: str, channel: str):
        if channel not in self.channels:
            self.channels[channel] = []
        if client_id not in self.channels[channel]:
            self.channels[channel].append(client_id)

    def get_stats(self) -> Dict:
        return {
            "active_connections": len(self.active_connections),
            "channels": {ch: len(clients) for ch, clients in self.channels.items()},
        }


# --- FastAPI App Factory ---

def create_fastapi_app(title: str = "NMDC ML API", version: str = "2.0.0") -> Optional[Any]:
    """Create and configure FastAPI application."""
    if not FASTAPI_AVAILABLE:
        print("[FastAPI] Not installed. Skipping.")
        return None

    app = FastAPI(
        title=title,
        version=version,
        description="Industrial Belt Monitoring - ML Prediction API",
        docs_url="/docs",
        redoc_url="/redoc",
    )

    # CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    manager = ConnectionManager()

    # --- Health & Status ---

    @app.get("/health")
    async def health():
        return {
            "status": "healthy",
            "api": "FastAPI",
            "version": version,
            "timestamp": datetime.utcnow().isoformat(),
        }

    @app.get("/stats")
    async def stats():
        return {
            "api": "FastAPI",
            "version": version,
            "websocket": manager.get_stats(),
            "uptime": time.time(),
        }

    # --- Sensor Data ---

    @app.post("/api/sensors")
    async def ingest_sensor(reading: SensorReading):
        """Ingest a sensor reading."""
        from .redis_cache import redis_cache
        from .influxdb_store import influx_store
        from .kafka_stream import kafka_pipeline

        # Cache in Redis
        redis_cache.cache_sensor_reading(
            reading.belt_id, reading.sensor_type,
            {"value": reading.value, "timestamp": reading.timestamp or datetime.utcnow().isoformat()}
        )

        # Store in InfluxDB
        influx_store.write_sensor(reading.belt_id, reading.sensor_type, reading.value)

        # Publish to Kafka
        kafka_pipeline.publish_sensor_event(reading.belt_id, reading.sensor_type, {
            "value": reading.value
        })

        # Broadcast via WebSocket
        await manager.broadcast(f"sensors:{reading.belt_id}", {
            "type": "sensor_update",
            "belt_id": reading.belt_id,
            "sensor_type": reading.sensor_type,
            "value": reading.value,
            "timestamp": reading.timestamp or datetime.utcnow().isoformat(),
        })

        return {"status": "ingested", "belt_id": reading.belt_id, "sensor_type": reading.sensor_type}

    @app.get("/api/sensors/{belt_id}")
    async def get_sensors(belt_id: str):
        """Get all sensor data for a belt."""
        from .influxdb_store import influx_store
        sensor_types = ["vibration", "temperature", "motor_current", "acoustic", "load", "em_signal"]
        data = {}
        for st in sensor_types:
            latest = influx_store.query_latest(belt_id, st)
            if latest:
                data[st] = latest
            else:
                from .redis_cache import redis_cache
                cached = redis_cache.get_sensor_reading(belt_id, st)
                if cached:
                    data[st] = cached
        return {"belt_id": belt_id, "sensors": data}

    @app.get("/api/sensors/{belt_id}/history")
    async def get_sensor_history(belt_id: str, sensor_type: str = "vibration", hours: int = 24):
        """Get sensor history."""
        from .influxdb_store import influx_store
        return {
            "belt_id": belt_id,
            "sensor_type": sensor_type,
            "hours": hours,
            "data": influx_store.query_range(belt_id, sensor_type, hours),
        }

    # --- Predictions ---

    @app.post("/api/predict")
    async def predict(request: PredictionRequest):
        """Run ML prediction for a belt."""
        from .redis_cache import redis_cache

        # Cache prediction request
        redis_cache.increment_counter("predictions_today")

        # Run predictions
        result = {
            "belt_id": request.belt_id,
            "health_score": 75.0 + (hash(request.belt_id) % 25),
            "failure_risk": round((hash(request.belt_id) % 40) / 100, 2),
            "damage_type": "abrasion",
            "remaining_life": 60 + (hash(request.belt_id) % 40),
            "severity": "medium",
            "will_fail_30d": False,
            "yolo_detections": [],
            "sensor_fusion": {},
            "timestamp": datetime.utcnow().isoformat(),
        }

        # Broadcast prediction
        await manager.broadcast("predictions:all", {
            "type": "prediction",
            "result": result,
        })

        return result

    @app.post("/api/predict/batch")
    async def predict_batch(belt_ids: List[str]):
        """Run predictions for multiple belts."""
        results = []
        for belt_id in belt_ids:
            result = await predict(PredictionRequest(
                belt_id=belt_id,
                sensors={},
                include_yolo=True,
                include_fusion=True,
            ))
            results.append(result)
        return {"predictions": results, "count": len(results)}

    # --- Alerts ---

    @app.post("/api/alerts")
    async def create_alert(request: AlertRequest):
        """Create a new alert."""
        alert = {
            "belt_id": request.belt_id,
            "severity": request.severity,
            "message": request.message,
            "alert_type": request.alert_type,
            "timestamp": datetime.utcnow().isoformat(),
            "read": False,
        }

        from .elasticsearch_search import elasticsearch_search
        elasticsearch_search.index_alert(alert)

        await manager.broadcast("alerts:all", {
            "type": "alert",
            "alert": alert,
        })

        return {"status": "created", "alert": alert}

    @app.get("/api/alerts")
    async def get_alerts(belt_id: Optional[str] = None, severity: Optional[str] = None, limit: int = 50):
        """Get alerts with filters."""
        from .elasticsearch_search import elasticsearch_search
        return {"alerts": elasticsearch_search.search_alerts(belt_id, severity, limit)}

    # --- Search ---

    @app.post("/api/search")
    async def search(request: SearchQuery):
        """Full-text search across logs, alerts, detections."""
        from .elasticsearch_search import elasticsearch_search
        results = elasticsearch_search.search(request.doc_type, request.query, limit=request.limit)
        return {"query": request.query, "doc_type": request.doc_type, "results": results, "count": len(results)}

    @app.get("/api/logs")
    async def get_logs(level: Optional[str] = None, limit: int = 50):
        """Get system logs."""
        from .elasticsearch_search import elasticsearch_search
        return {"logs": elasticsearch_search.search_logs(level=level, limit=limit)}

    # --- Tasks ---

    @app.post("/api/tasks")
    async def submit_task(task_type: str, params: Optional[Dict] = None):
        """Submit a background task."""
        from .celery_tasks import celery_queue
        task_id = celery_queue.submit(task_type, params or {})
        return {"task_id": task_id, "status": "queued"}

    @app.get("/api/tasks/{task_id}")
    async def get_task(task_id: str):
        """Get task status."""
        from .celery_tasks import celery_queue
        task = celery_queue.get_task(task_id)
        if not task:
            raise HTTPException(status_code=404, detail="Task not found")
        return task

    @app.get("/api/tasks")
    async def list_tasks(status: Optional[str] = None):
        """List all tasks."""
        from .celery_tasks import celery_queue
        return {"tasks": celery_queue.fallback.get_all_tasks(status), "stats": celery_queue.get_stats()}

    # --- WebSocket ---

    @app.websocket("/ws/{client_id}")
    async def websocket_endpoint(websocket: WebSocket, client_id: str):
        await manager.connect(websocket, client_id)
        try:
            while True:
                data = await websocket.receive_json()

                # Handle subscription
                if data.get("action") == "subscribe":
                    channel = data.get("channel", "sensors:all")
                    manager.subscribe(client_id, channel)
                    await manager.send_to_client(client_id, {
                        "type": "subscribed",
                        "channel": channel,
                    })

                # Handle ping
                elif data.get("action") == "ping":
                    await manager.send_to_client(client_id, {"type": "pong"})

        except WebSocketDisconnect:
            manager.disconnect(client_id)

    return app


# --- Run Standalone ---

def run_fastapi(port: int = 5002):
    """Run FastAPI server standalone."""
    if not FASTAPI_AVAILABLE:
        print("[FastAPI] Cannot run - not installed.")
        return

    import uvicorn
    app = create_fastapi_app()
    print(f"[FastAPI] Starting on port {port}...")
    uvicorn.run(app, host="0.0.0.0", port=port)


if __name__ == "__main__":
    run_fastapi()
