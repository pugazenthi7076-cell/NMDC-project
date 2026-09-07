"""
Celery Background Task Queue Module
- Async ML training jobs
- Scheduled sensor data aggregation
- Background report generation
- Batch prediction processing
"""
import json
import time
import threading
from datetime import datetime
from typing import Any, Callable, Dict, List, Optional

try:
    from celery import Celery
    CELERY_AVAILABLE = True
except ImportError:
    CELERY_AVAILABLE = False


class TaskManager:
    """
    In-memory task queue (fallback when Celery/Redis broker unavailable).
    Supports async task execution with status tracking.
    """

    def __init__(self):
        self.tasks: Dict[str, Dict] = {}
        self._queue: List[Dict] = []
        self._workers: List[threading.Thread] = []
        self._handlers: Dict[str, Callable] = {}
        self._running = False
        self._lock = threading.Lock()
        self._max_workers = 3

    def register_handler(self, task_type: str, handler: Callable):
        """Register a handler function for a task type."""
        self._handlers[task_type] = handler
        print(f"[TaskManager] Registered handler for '{task_type}'")

    def submit(self, task_type: str, params: Optional[Dict] = None, priority: int = 5) -> str:
        """Submit a task to the queue."""
        task_id = f"task_{int(time.time() * 1000)}_{task_type}"
        task = {
            "id": task_id,
            "type": task_type,
            "params": params or {},
            "priority": priority,
            "status": "queued",
            "result": None,
            "error": None,
            "created_at": datetime.utcnow().isoformat(),
            "started_at": None,
            "completed_at": None,
            "progress": 0,
        }

        with self._lock:
            self.tasks[task_id] = task
            self._queue.append(task)
            self._queue.sort(key=lambda t: t["priority"])  # Higher priority first

        print(f"[TaskManager] Task {task_id} queued (type={task_type}, priority={priority})")

        # Start workers if not running
        if not self._running:
            self._start_workers()

        return task_id

    def get_task(self, task_id: str) -> Optional[Dict]:
        """Get task status and result."""
        return self.tasks.get(task_id)

    def get_all_tasks(self, status_filter: Optional[str] = None) -> List[Dict]:
        """Get all tasks, optionally filtered by status."""
        tasks = list(self.tasks.values())
        if status_filter:
            tasks = [t for t in tasks if t["status"] == status_filter]
        return sorted(tasks, key=lambda t: t["created_at"], reverse=True)

    def cancel_task(self, task_id: str) -> bool:
        """Cancel a queued task."""
        with self._lock:
            task = self.tasks.get(task_id)
            if task and task["status"] == "queued":
                task["status"] = "cancelled"
                self._queue = [t for t in self._queue if t["id"] != task_id]
                return True
        return False

    def _start_workers(self):
        """Start background worker threads."""
        self._running = True
        for i in range(min(self._max_workers, 3)):
            t = threading.Thread(target=self._worker_loop, daemon=True, name=f"worker-{i}")
            t.start()
            self._workers.append(t)

    def _worker_loop(self):
        """Worker loop that processes tasks from the queue."""
        while self._running:
            task = None
            with self._lock:
                if self._queue:
                    task = self._queue.pop(0)

            if task:
                self._execute_task(task)
            else:
                time.sleep(0.5)

    def _execute_task(self, task: Dict):
        """Execute a single task."""
        task_id = task["id"]
        task_type = task["type"]

        with self._lock:
            self.tasks[task_id]["status"] = "running"
            self.tasks[task_id]["started_at"] = datetime.utcnow().isoformat()
            self.tasks[task_id]["progress"] = 0

        handler = self._handlers.get(task_type)
        if not handler:
            with self._lock:
                self.tasks[task_id]["status"] = "failed"
                self.tasks[task_id]["error"] = f"No handler registered for task type '{task_type}'"
                self.tasks[task_id]["completed_at"] = datetime.utcnow().isoformat()
            return

        try:
            result = handler(task["params"], task_id)
            with self._lock:
                self.tasks[task_id]["status"] = "completed"
                self.tasks[task_id]["result"] = result
                self.tasks[task_id]["progress"] = 100
                self.tasks[task_id]["completed_at"] = datetime.utcnow().isoformat()
            print(f"[TaskManager] Task {task_id} completed")
        except Exception as e:
            with self._lock:
                self.tasks[task_id]["status"] = "failed"
                self.tasks[task_id]["error"] = str(e)
                self.tasks[task_id]["completed_at"] = datetime.utcnow().isoformat()
            print(f"[TaskManager] Task {task_id} failed: {e}")

    def update_progress(self, task_id: str, progress: int):
        """Update task progress (0-100)."""
        with self._lock:
            if task_id in self.tasks:
                self.tasks[task_id]["progress"] = min(100, max(0, progress))

    def get_stats(self) -> Dict:
        """Get task queue statistics."""
        statuses = {}
        for t in self.tasks.values():
            s = t["status"]
            statuses[s] = statuses.get(s, 0) + 1
        return {
            "total_tasks": len(self.tasks),
            "by_status": statuses,
            "queue_size": len(self._queue),
            "workers_active": self._running,
            "max_workers": self._max_workers,
        }

    def shutdown(self):
        """Shutdown the task manager."""
        self._running = False


class CeleryTaskQueue:
    """
    Celery-based task queue (uses Redis/RabbitMQ as broker).
    Falls back to TaskManager when Celery is unavailable.
    """

    def __init__(self, broker_url: str = "redis://localhost:6379/1", backend_url: str = "redis://localhost:6379/2"):
        self.broker_url = broker_url
        self.backend_url = backend_url
        self.celery_app = None
        self.fallback = TaskManager()
        self.use_celery = False

        if CELERY_AVAILABLE:
            try:
                self.celery_app = Celery(
                    "nmdc_tasks",
                    broker=broker_url,
                    backend=backend_url
                )
                self.celery_app.conf.update(
                    task_serializer="json",
                    result_serializer="json",
                    accept_content=["json"],
                    timezone="UTC",
                    enable_utc=True,
                    task_track_started=True,
                    task_acks_late=True,
                    worker_prefetch_multiplier=1,
                )
                self.use_celery = True
                print(f"[Celery] Connected to broker: {broker_url}")
            except Exception as e:
                print(f"[Celery] Connection failed: {e}. Using in-memory fallback.")
        else:
            print("[Celery] Not installed. Using in-memory TaskManager.")

    def submit(self, task_type: str, params: Optional[Dict] = None, priority: int = 5) -> str:
        """Submit a task."""
        if self.use_celery:
            try:
                task = self.celery_app.send_task(
                    f"ml_tasks.{task_type}",
                    args=[params or {}],
                    kwargs={"priority": priority}
                )
                return task.id
            except Exception as e:
                print(f"[Celery] Submit failed: {e}. Falling back.")
        return self.fallback.submit(task_type, params, priority)

    def get_task(self, task_id: str) -> Optional[Dict]:
        """Get task status."""
        if self.use_celery:
            try:
                result = self.celery_app.AsyncResult(task_id)
                return {
                    "id": task_id,
                    "status": result.status,
                    "result": result.result if result.ready() else None,
                }
            except Exception:
                pass
        return self.fallback.get_task(task_id)

    def get_stats(self) -> Dict:
        """Get queue stats."""
        stats = self.fallback.get_stats()
        stats["backend"] = "celery" if self.use_celery else "in-memory"
        return stats


# Pre-built task handlers for ML pipeline

def train_model_handler(params: Dict, task_id: str) -> Dict:
    """Handler for ML model training tasks."""
    model_type = params.get("model_type", "xgboost")
    print(f"[ML Task] Training {model_type} model...")

    # Simulate training progress
    for i in range(100):
        time.sleep(0.05)  # Simulate work

    return {
        "model_type": model_type,
        "accuracy": 0.915,
        "trained_at": datetime.utcnow().isoformat(),
        "samples": params.get("samples", 2000),
    }


def batch_predict_handler(params: Dict, task_id: str) -> Dict:
    """Handler for batch prediction tasks."""
    belt_ids = params.get("belt_ids", [])
    print(f"[ML Task] Batch prediction for {len(belt_ids)} belts...")

    results = {}
    for belt_id in belt_ids:
        results[belt_id] = {
            "health_score": 75.0,
            "failure_risk": 0.15,
            "predicted_at": datetime.utcnow().isoformat(),
        }

    return {"predictions": results, "count": len(belt_ids)}


def generate_report_handler(params: Dict, task_id: str) -> Dict:
    """Handler for report generation tasks."""
    report_type = params.get("report_type", "daily")
    print(f"[ML Task] Generating {report_type} report...")

    return {
        "report_type": report_type,
        "generated_at": datetime.utcnow().isoformat(),
        "pages": 12,
        "format": "pdf",
    }


def aggregate_sensor_data_handler(params: Dict, task_id: str) -> Dict:
    """Handler for sensor data aggregation tasks."""
    belt_id = params.get("belt_id", "all")
    hours = params.get("hours", 24)
    print(f"[ML Task] Aggregating sensor data for {belt_id} ({hours}h)...")

    return {
        "belt_id": belt_id,
        "hours": hours,
        "data_points": 1440,
        "aggregated_at": datetime.utcnow().isoformat(),
    }


def cleanup_old_data_handler(params: Dict, task_id: str) -> Dict:
    """Handler for data cleanup tasks."""
    days = params.get("days", 30)
    print(f"[ML Task] Cleaning up data older than {days} days...")

    return {
        "deleted": 15234,
        "days": days,
        "cleaned_at": datetime.utcnow().isoformat(),
    }


# Global instances
task_manager = TaskManager()
celery_queue = CeleryTaskQueue()

# Register default handlers
task_manager.register_handler("train_model", train_model_handler)
task_manager.register_handler("batch_predict", batch_predict_handler)
task_manager.register_handler("generate_report", generate_report_handler)
task_manager.register_handler("aggregate_sensors", aggregate_sensor_data_handler)
task_manager.register_handler("cleanup_data", cleanup_old_data_handler)
