# ML Service Modules - All Backend Technologies
# ================================================
# Uses lazy imports to avoid slow startup when services are unavailable.

__all__ = [
    # Backend Technologies
    "redis_cache", "ws_server", "sensor_stream", "notifier",
    "influx_store", "task_manager", "celery_queue",
    "kafka_pipeline", "elasticsearch_search",
    "rabbitmq_queue", "postgresql_store",
    "grpc_server", "grpc_client", "stream_manager",
]

# Lazy imports - only load when accessed
def __getattr__(name):
    if name == "redis_cache":
        from .redis_cache import redis_cache
        return redis_cache
    elif name in ("ws_server", "sensor_stream", "notifier"):
        from .websocket_server import ws_server, sensor_stream, notifier
        return {"ws_server": ws_server, "sensor_stream": sensor_stream, "notifier": notifier}[name]
    elif name == "influx_store":
        from .influxdb_store import influx_store
        return influx_store
    elif name in ("task_manager", "celery_queue"):
        from .celery_tasks import task_manager, celery_queue
        return {"task_manager": task_manager, "celery_queue": celery_queue}[name]
    elif name == "kafka_pipeline":
        from .kafka_stream import kafka_pipeline
        return kafka_pipeline
    elif name == "elasticsearch_search":
        from .elasticsearch_search import elasticsearch_search
        return elasticsearch_search
    elif name == "rabbitmq_queue":
        from .rabbitmq_queue import rabbitmq_pipeline
        return rabbitmq_pipeline
    elif name == "postgresql_store":
        from .postgresql_store import postgresql_store
        return postgresql_store
    elif name in ("grpc_server", "grpc_client", "stream_manager"):
        from .grpc_service import grpc_server, grpc_client, stream_manager
        return {"grpc_server": grpc_server, "grpc_client": grpc_client, "stream_manager": stream_manager}[name]
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")
