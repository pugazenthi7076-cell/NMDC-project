"""
RabbitMQ Message Queue Module
- Message queuing for async ML processing
- Decoupled communication between IoT, ML, and Dashboard
- Reliable message delivery with acknowledgments
"""
import json
import time
import threading
from datetime import datetime
from typing import Any, Callable, Dict, List, Optional

try:
    import pika
    RABBITMQ_AVAILABLE = True
except ImportError:
    RABBITMQ_AVAILABLE = False


class RabbitMQProducer:
    """RabbitMQ producer for publishing messages."""

    def __init__(self, host: str = "localhost", port: int = 5672, virtual_host: str = "/"):
        self.host = host
        self.port = port
        self.virtual_host = virtual_host
        self.connection = None
        self.channel = None
        self.connected = False
        self._published_count = 0

        if RABBITMQ_AVAILABLE:
            try:
                credentials = pika.PlainCredentials("guest", "guest")
                parameters = pika.ConnectionParameters(
                    host=host, port=port, virtual_host=virtual_host,
                    credentials=credentials, connection_attempts=3,
                    retry_delay=2, socket_timeout=5
                )
                self.connection = pika.BlockingConnection(parameters)
                self.channel = self.connection.channel()
                self.connected = True
                print(f"[RabbitMQ] Producer connected to {host}:{port}")
            except Exception as e:
                print(f"[RabbitMQ] Connection failed: {e}. Using in-memory queue.")
        else:
            print("[RabbitMQ] pika not installed. Using in-memory queue.")

    def declare_queue(self, queue_name: str, durable: bool = True):
        """Declare a queue."""
        if self.channel:
            try:
                self.channel.queue_declare(queue=queue_name, durable=durable)
            except Exception as e:
                print(f"[RabbitMQ] Declare queue error: {e}")

    def publish(self, queue_name: str, message: Dict, priority: int = 0) -> bool:
        """Publish a message to a queue."""
        try:
            body = json.dumps(message, default=str)
            properties = pika.BasicProperties(
                delivery_mode=2,  # Persistent
                priority=min(9, priority),
                content_type="application/json",
                timestamp=int(time.time()),
            )

            if self.channel and self.connected:
                self.channel.basic_publish(
                    exchange="",
                    routing_key=queue_name,
                    body=body,
                    properties=properties,
                )
            else:
                # In-memory fallback
                if not hasattr(self, "_memory_queue"):
                    self._memory_queue: Dict[str, List] = {}
                if queue_name not in self._memory_queue:
                    self._memory_queue[queue_name] = []
                self._memory_queue[queue_name].append({
                    "body": message,
                    "priority": priority,
                    "timestamp": datetime.utcnow().isoformat(),
                })

            self._published_count += 1
            return True
        except Exception as e:
            print(f"[RabbitMQ] Publish error: {e}")
            return False

    def get_stats(self) -> Dict:
        """Get producer stats."""
        return {
            "connected": self.connected,
            "host": self.host,
            "port": self.port,
            "published": self._published_count,
        }


class RabbitMQConsumer:
    """RabbitMQ consumer for processing messages."""

    def __init__(self, host: str = "localhost", port: int = 5672, virtual_host: str = "/"):
        self.host = host
        self.port = port
        self.virtual_host = virtual_host
        self.connection = None
        self.channel = None
        self.connected = False
        self._handlers: Dict[str, Callable] = {}
        self._running = False
        self._consumed_count = 0
        self._thread = None

        if RABBITMQ_AVAILABLE:
            try:
                credentials = pika.PlainCredentials("guest", "guest")
                parameters = pika.ConnectionParameters(
                    host=host, port=port, virtual_host=virtual_host,
                    credentials=credentials, connection_attempts=3,
                    retry_delay=2, socket_timeout=5
                )
                self.connection = pika.BlockingConnection(parameters)
                self.channel = self.connection.channel()
                self.connected = True
                print(f"[RabbitMQ] Consumer connected to {host}:{port}")
            except Exception as e:
                print(f"[RabbitMQ] Consumer connection failed: {e}")
        else:
            print("[RabbitMQ] pika not installed. Using in-memory queue.")

    def subscribe(self, queue_name: str, handler: Callable, prefetch_count: int = 1):
        """Subscribe to a queue with a message handler."""
        if self.channel and self.connected:
            self.channel.basic_qos(prefetch_count=prefetch_count)
            self._handlers[queue_name] = handler

            def callback(ch, method, properties, body):
                try:
                    message = json.loads(body.decode("utf-8"))
                    handler(message, properties)
                    ch.basic_ack(delivery_tag=method.delivery_tag)
                    self._consumed_count += 1
                except Exception as e:
                    print(f"[RabbitMQ] Processing error: {e}")
                    ch.basic_nack(delivery_tag=method.delivery_tag, requeue=True)

            self.channel.basic_consume(queue=queue_name, on_message_callback=callback)
        else:
            self._handlers[queue_name] = handler

    def start_consuming(self):
        """Start consuming messages (blocking)."""
        if self.channel and self.connected:
            self._running = True
            print("[RabbitMQ] Starting to consume...")
            try:
                self.channel.start_consuming()
            except Exception as e:
                print(f"[RabbitMQ] Consuming error: {e}")

    def start_consuming_background(self):
        """Start consuming in a background thread."""
        self._thread = threading.Thread(target=self.start_consuming, daemon=True)
        self._thread.start()

    def stop(self):
        """Stop consuming."""
        self._running = False
        if self.channel and self.connected:
            self.channel.stop_consuming()

    def get_stats(self) -> Dict:
        return {
            "connected": self.connected,
            "queues": list(self._handlers.keys()),
            "consumed": self._consumed_count,
            "running": self._running,
        }


class RabbitMQPipeline:
    """
    Complete RabbitMQ pipeline for the NMDC system.
    Defines queues for each processing stage.
    """

    # Queue definitions
    QUEUES = {
        "sensor.raw": {"durable": True, "description": "Raw sensor readings from ESP32"},
        "sensor.processed": {"durable": True, "description": "Processed/validated sensor data"},
        "ml.predict": {"durable": True, "description": "ML prediction requests"},
        "ml.result": {"durable": True, "description": "ML prediction results"},
        "ml.train": {"durable": True, "description": "Model training jobs"},
        "alerts.critical": {"durable": True, "description": "Critical alerts"},
        "alerts.warning": {"durable": True, "description": "Warning alerts"},
        "detections.camera": {"durable": True, "description": "Camera detection events"},
        "reports.generate": {"durable": True, "description": "Report generation jobs"},
        "notifications.email": {"durable": True, "description": "Email notifications"},
        "notifications.sms": {"durable": True, "description": "SMS notifications"},
    }

    def __init__(self, host: str = "localhost", port: int = 5672):
        self.producer = RabbitMQProducer(host, port)
        self.consumer = RabbitMQConsumer(host, port)
        self._message_handlers: Dict[str, Callable] = {}
        self._stats = {"produced": 0, "consumed": 0}

    def setup_queues(self):
        """Declare all queues."""
        for queue_name, config in self.QUEUES.items():
            self.producer.declare_queue(queue_name, durable=config["durable"])
        print(f"[RabbitMQ] Declared {len(self.QUEUES)} queues")

    def publish_sensor(self, belt_id: str, sensor_type: str, data: Dict):
        """Publish raw sensor data."""
        message = {
            "belt_id": belt_id,
            "sensor_type": sensor_type,
            "data": data,
            "timestamp": datetime.utcnow().isoformat(),
        }
        self.producer.publish("sensor.raw", message, priority=7)
        self._stats["produced"] += 1

    def publish_prediction_request(self, belt_id: str, sensors: Dict):
        """Request ML prediction."""
        message = {
            "belt_id": belt_id,
            "sensors": sensors,
            "timestamp": datetime.utcnow().isoformat(),
        }
        self.producer.publish("ml.predict", message, priority=5)
        self._stats["produced"] += 1

    def publish_alert(self, belt_id: str, severity: str, alert: Dict):
        """Publish an alert."""
        queue = "alerts.critical" if severity == "critical" else "alerts.warning"
        message = {
            "belt_id": belt_id,
            "severity": severity,
            "alert": alert,
            "timestamp": datetime.utcnow().isoformat(),
        }
        self.producer.publish(queue, message, priority=9 if severity == "critical" else 5)
        self._stats["produced"] += 1

    def publish_detection(self, belt_id: str, detection: Dict):
        """Publish camera detection."""
        message = {
            "belt_id": belt_id,
            "detection": detection,
            "timestamp": datetime.utcnow().isoformat(),
        }
        self.producer.publish("detections.camera", message, priority=6)
        self._stats["produced"] += 1

    def publish_training_job(self, model_type: str, params: Dict):
        """Submit ML training job."""
        message = {
            "model_type": model_type,
            "params": params,
            "timestamp": datetime.utcnow().isoformat(),
        }
        self.producer.publish("ml.train", message, priority=3)
        self._stats["produced"] += 1

    def get_stats(self) -> Dict:
        """Get pipeline statistics."""
        return {
            "producer": self.producer.get_stats(),
            "consumer": self.consumer.get_stats(),
            "queues": list(self.QUEUES.keys()),
            "total_produced": self._stats["produced"],
            "total_consumed": self._stats["consumed"],
        }


# Global instance
rabbitmq_pipeline = RabbitMQPipeline()
