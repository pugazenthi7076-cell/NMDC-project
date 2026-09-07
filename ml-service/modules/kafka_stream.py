"""
Apache Kafka Event Streaming Module
- High-throughput sensor data ingestion
- Event-driven architecture for IoT
- Real-time data pipeline between sensors and ML
"""
import json
import time
import threading
from datetime import datetime
from typing import Any, Callable, Dict, List, Optional

try:
    from confluent_kafka import Producer, Consumer, KafkaError, KafkaException
    KAFKA_AVAILABLE = True
except ImportError:
    KAFKA_AVAILABLE = False


class KafkaProducer:
    """Kafka producer for publishing sensor events."""

    def __init__(self, bootstrap_servers: str = "localhost:9092"):
        self.bootstrap_servers = bootstrap_servers
        self.producer = None
        self.connected = False
        self._topic_stats: Dict[str, int] = {}

        if KAFKA_AVAILABLE:
            try:
                self.producer = Producer({
                    "bootstrap.servers": bootstrap_servers,
                    "client.id": "nmdc-producer",
                    "acks": "all",
                    "retries": 3,
                    "linger.ms": 5,
                    "batch.size": 16384,
                })
                self.connected = True
                print(f"[Kafka] Producer connected to {bootstrap_servers}")
            except Exception as e:
                print(f"[Kafka] Producer connection failed: {e}")
        else:
            print("[Kafka] confluent-kafka not installed. Using in-memory queue.")

    def publish(self, topic: str, key: str, value: Dict) -> bool:
        """Publish a message to a Kafka topic."""
        try:
            serialized = json.dumps(value, default=str).encode("utf-8")
            key_bytes = key.encode("utf-8") if key else None

            if self.producer and self.connected:
                self.producer.produce(
                    topic=topic,
                    key=key_bytes,
                    value=serialized,
                    callback=self._delivery_callback
                )
                self.producer.poll(0)
            else:
                # Fallback: store in memory
                if topic not in self._topic_stats:
                    self._topic_stats[topic] = 0
                self._topic_stats[topic] += 1

            self._topic_stats[topic] = self._topic_stats.get(topic, 0) + 1
            return True
        except Exception as e:
            print(f"[Kafka] Publish error: {e}")
            return False

    def _delivery_callback(self, err, msg):
        """Callback for message delivery confirmation."""
        if err:
            print(f"[Kafka] Delivery failed: {err}")
        else:
            print(f"[Kafka] Message delivered to {msg.topic()} [{msg.partition()}]")

    def flush(self):
        """Flush pending messages."""
        if self.producer:
            self.producer.flush(timeout=10)

    def get_stats(self) -> Dict:
        """Get producer statistics."""
        return {
            "connected": self.connected,
            "bootstrap_servers": self.bootstrap_servers,
            "topics_published": self._topic_stats,
            "total_messages": sum(self._topic_stats.values()),
        }


class KafkaConsumer:
    """Kafka consumer for subscribing to sensor events."""

    def __init__(self, bootstrap_servers: str = "localhost:9092", group_id: str = "nmdc-consumer"):
        self.bootstrap_servers = bootstrap_servers
        self.group_id = group_id
        self.consumer = None
        self.connected = False
        self._handlers: Dict[str, Callable] = {}
        self._running = False
        self._thread = None
        self._consumed: Dict[str, int] = {}
        self._recent_messages: Dict[str, List[Dict]] = {}

        if KAFKA_AVAILABLE:
            try:
                self.consumer = Consumer({
                    "bootstrap.servers": bootstrap_servers,
                    "group.id": group_id,
                    "auto.offset.reset": "latest",
                    "enable.auto.commit": True,
                    "session.timeout.ms": 30000,
                })
                self.connected = True
                print(f"[Kafka] Consumer connected to {bootstrap_servers} (group={group_id})")
            except Exception as e:
                print(f"[Kafka] Consumer connection failed: {e}")
        else:
            print("[Kafka] confluent-kafka not installed. Using in-memory queue.")

    def subscribe(self, topics: List[str], handler: Optional[Callable] = None):
        """Subscribe to topics with optional handler."""
        if self.consumer and self.connected:
            self.consumer.subscribe(topics)
        if handler:
            for topic in topics:
                self._handlers[topic] = handler

    def start_consuming(self, topics: List[str]):
        """Start consuming messages in background thread."""
        self._running = True
        self.subscribe(topics)
        self._thread = threading.Thread(target=self._consume_loop, daemon=True)
        self._thread.start()
        print(f"[Kafka] Started consuming from {topics}")

    def _consume_loop(self):
        """Background consumer loop."""
        while self._running:
            if self.consumer and self.connected:
                try:
                    msg = self.consumer.poll(timeout=1.0)
                    if msg is None:
                        continue
                    if msg.error():
                        if msg.error().code() == KafkaError._PARTITION_EOF:
                            continue
                        print(f"[Kafka] Consumer error: {msg.error()}")
                        continue

                    topic = msg.topic()
                    key = msg.key().decode("utf-8") if msg.key() else None
                    value = json.loads(msg.value().decode("utf-8"))

                    self._consumed[topic] = self._consumed.get(topic, 0) + 1

                    # Store recent messages
                    if topic not in self._recent_messages:
                        self._recent_messages[topic] = []
                    self._recent_messages[topic].append({
                        "key": key,
                        "value": value,
                        "timestamp": datetime.utcnow().isoformat(),
                    })
                    if len(self._recent_messages[topic]) > 100:
                        self._recent_messages[topic] = self._recent_messages[topic][-100:]

                    # Call handler
                    handler = self._handlers.get(topic)
                    if handler:
                        handler(key, value)

                except KafkaException as e:
                    print(f"[Kafka] Consumption error: {e}")
            else:
                time.sleep(1)

    def get_recent_messages(self, topic: str, limit: int = 50) -> List[Dict]:
        """Get recent consumed messages."""
        return self._recent_messages.get(topic, [])[-limit:]

    def stop(self):
        """Stop consuming."""
        self._running = False
        if self.consumer:
            self.consumer.close()

    def get_stats(self) -> Dict:
        """Get consumer statistics."""
        return {
            "connected": self.connected,
            "group_id": self.group_id,
            "topics_subscribed": list(self._handlers.keys()),
            "messages_consumed": self._consumed,
            "total_consumed": sum(self._consumed.values()),
        }


class KafkaEventPipeline:
    """
    Complete Kafka event pipeline for sensor data.
    Handles ingestion, processing, and output.
    """

    def __init__(self, bootstrap_servers: str = "localhost:9092"):
        self.producer = KafkaProducer(bootstrap_servers)
        self.consumer = KafkaConsumer(bootstrap_servers)
        self._event_handlers: Dict[str, Callable] = {}
        self._events_processed = 0

    def publish_sensor_event(self, belt_id: str, sensor_type: str, data: Dict):
        """Publish a sensor reading event."""
        topic = f"nmdc.sensors.{sensor_type}"
        key = belt_id
        event = {
            "belt_id": belt_id,
            "sensor_type": sensor_type,
            "reading": data,
            "event_type": "sensor_reading",
            "timestamp": datetime.utcnow().isoformat(),
        }
        self.producer.publish(topic, key, event)

    def publish_alert_event(self, belt_id: str, alert: Dict):
        """Publish an alert event."""
        topic = "nmdc.alerts"
        key = belt_id
        event = {
            "belt_id": belt_id,
            "alert": alert,
            "event_type": "alert",
            "timestamp": datetime.utcnow().isoformat(),
        }
        self.producer.publish(topic, key, event)

    def publish_prediction_event(self, belt_id: str, prediction: Dict):
        """Publish an ML prediction event."""
        topic = "nmdc.predictions"
        key = belt_id
        event = {
            "belt_id": belt_id,
            "prediction": prediction,
            "event_type": "ml_prediction",
            "timestamp": datetime.utcnow().isoformat(),
        }
        self.producer.publish(topic, key, event)

    def publish_detection_event(self, belt_id: str, detection: Dict):
        """Publish a camera detection event."""
        topic = "nmdc.detections"
        key = belt_id
        event = {
            "belt_id": belt_id,
            "detection": detection,
            "event_type": "camera_detection",
            "timestamp": datetime.utcnow().isoformat(),
        }
        self.producer.publish(topic, key, event)

    def start_pipeline(self, topics: Optional[List[str]] = None):
        """Start the event pipeline."""
        default_topics = [
            "nmdc.sensors.vibration",
            "nmdc.sensors.temperature",
            "nmdc.sensors.motor_current",
            "nmdc.sensors.acoustic",
            "nmdc.sensors.load",
            "nmdc.sensors.em_signal",
            "nmdc.alerts",
            "nmdc.predictions",
            "nmdc.detections",
        ]
        topics = topics or default_topics

        def event_handler(key, value):
            self._events_processed += 1
            event_type = value.get("event_type", "unknown")
            if event_type in self._event_handlers:
                self._event_handlers[event_type](key, value)

        self.consumer.start_consuming(topics)

    def register_handler(self, event_type: str, handler: Callable):
        """Register handler for an event type."""
        self._event_handlers[event_type] = handler

    def get_stats(self) -> Dict:
        """Get pipeline statistics."""
        return {
            "producer": self.producer.get_stats(),
            "consumer": self.consumer.get_stats(),
            "events_processed": self._events_processed,
        }


# Global instance
kafka_pipeline = KafkaEventPipeline()
