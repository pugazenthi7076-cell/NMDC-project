"""
Elasticsearch Module
- Full-text search for logs, alerts, and detection history
- Structured queries for sensor data analysis
- Log aggregation and analytics
"""
import json
import time
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

try:
    from elasticsearch import Elasticsearch
    ELASTIC_AVAILABLE = True
except ImportError:
    ELASTIC_AVAILABLE = False


class ElasticsearchSearch:
    """Elasticsearch search engine for logs, alerts, and detection history."""

    def __init__(self, hosts: str = "http://localhost:9200", index_prefix: str = "nmdc"):
        self.hosts = hosts
        self.index_prefix = index_prefix
        self.client = None
        self.connected = False
        self._fallback_store: Dict[str, List[Dict]] = {}
        self._connect()

    def _connect(self):
        """Connect to Elasticsearch."""
        if not ELASTIC_AVAILABLE:
            print("[Elasticsearch] elasticsearch-py not installed. Using in-memory fallback.")
            return

        try:
            self.client = Elasticsearch(hosts=[self.hosts], timeout=5, max_retries=1)
            if self.client.ping():
                self.connected = True
                print(f"[Elasticsearch] Connected to {self.hosts}")
            else:
                print("[Elasticsearch] Ping failed. Using in-memory fallback.")
        except Exception as e:
            print(f"[Elasticsearch] Connection failed: {e}. Using in-memory fallback.")

    def _get_index(self, doc_type: str) -> str:
        """Get full index name."""
        return f"{self.index_prefix}-{doc_type}"

    def index_document(self, doc_type: str, doc: Dict, doc_id: Optional[str] = None) -> str:
        """Index a document."""
        doc["indexed_at"] = datetime.utcnow().isoformat()

        if self.connected:
            try:
                index = self._get_index(doc_type)
                result = self.client.index(
                    index=index,
                    body=doc,
                    id=doc_id,
                    refresh="wait_for"
                )
                return result.get("_id", doc_id or "unknown")
            except Exception as e:
                print(f"[Elasticsearch] Index error: {e}")

        # Fallback
        if doc_type not in self._fallback_store:
            self._fallback_store[doc_type] = []
        doc["_id"] = doc_id or f"doc_{int(time.time() * 1000)}"
        self._fallback_store[doc_type].append(doc)
        return doc["_id"]

    def search(self, doc_type: str, query: str, fields: Optional[List[str]] = None, limit: int = 20) -> List[Dict]:
        """Full-text search across document fields."""
        if self.connected:
            try:
                index = self._get_index(doc_type)
                search_fields = fields or ["*"]
                body = {
                    "query": {
                        "multi_match": {
                            "query": query,
                            "fields": search_fields,
                            "type": "best_fields",
                            "fuzziness": "AUTO"
                        }
                    },
                    "size": limit,
                    "sort": [{"_score": "desc"}]
                }
                result = self.client.search(index=index, body=body)
                return [hit["_source"] for hit in result["hits"]["hits"]]
            except Exception as e:
                print(f"[Elasticsearch] Search error: {e}")

        # Fallback: simple text matching
        results = []
        docs = self._fallback_store.get(doc_type, [])
        query_lower = query.lower()
        for doc in docs:
            doc_text = json.dumps(doc, default=str).lower()
            if query_lower in doc_text:
                results.append(doc)
                if len(results) >= limit:
                    break
        return results

    def index_log(self, level: str, message: str, source: str = "ml-service", extra: Optional[Dict] = None):
        """Index a log entry."""
        doc = {
            "level": level,
            "message": message,
            "source": source,
            "timestamp": datetime.utcnow().isoformat(),
        }
        if extra:
            doc.update(extra)
        return self.index_document("logs", doc)

    def search_logs(self, query: str = "", level: Optional[str] = None, limit: int = 50) -> List[Dict]:
        """Search logs with optional level filter."""
        if self.connected:
            try:
                index = self._get_index("logs")
                must = []
                if query:
                    must.append({"match": {"message": query}})
                if level:
                    must.append({"term": {"level": level}})

                body = {
                    "query": {"bool": {"must": must or [{"match_all": {}}]}},
                    "size": limit,
                    "sort": [{"timestamp": "desc"}]
                }
                result = self.client.search(index=index, body=body)
                return [hit["_source"] for hit in result["hits"]["hits"]]
            except Exception as e:
                print(f"[Elasticsearch] Log search error: {e}")

        # Fallback
        logs = self._fallback_store.get("logs", [])
        if level:
            logs = [l for l in logs if l.get("level") == level]
        if query:
            logs = [l for l in logs if query.lower() in l.get("message", "").lower()]
        return logs[-limit:]

    def index_alert(self, alert: Dict):
        """Index an alert document."""
        return self.index_document("alerts", alert)

    def search_alerts(self, belt_id: Optional[str] = None, severity: Optional[str] = None, limit: int = 50) -> List[Dict]:
        """Search alerts with filters."""
        if self.connected:
            try:
                index = self._get_index("alerts")
                must = []
                if belt_id:
                    must.append({"term": {"belt_id": belt_id}})
                if severity:
                    must.append({"term": {"severity": severity}})

                body = {
                    "query": {"bool": {"must": must or [{"match_all": {}}]}},
                    "size": limit,
                    "sort": [{"timestamp": "desc"}]
                }
                result = self.client.search(index=index, body=body)
                return [hit["_source"] for hit in result["hits"]["hits"]]
            except Exception as e:
                print(f"[Elasticsearch] Alert search error: {e}")

        # Fallback
        alerts = self._fallback_store.get("alerts", [])
        if belt_id:
            alerts = [a for a in alerts if a.get("belt_id") == belt_id]
        if severity:
            alerts = [a for a in alerts if a.get("severity") == severity]
        return alerts[-limit:]

    def index_detection(self, detection: Dict):
        """Index a camera detection document."""
        return self.index_document("detections", detection)

    def search_detections(self, defect_type: Optional[str] = None, belt_id: Optional[str] = None, limit: int = 50) -> List[Dict]:
        """Search detections."""
        if self.connected:
            try:
                index = self._get_index("detections")
                must = []
                if defect_type:
                    must.append({"term": {"defect_type": defect_type}})
                if belt_id:
                    must.append({"term": {"belt_id": belt_id}})

                body = {
                    "query": {"bool": {"must": must or [{"match_all": {}}]}},
                    "size": limit,
                    "sort": [{"timestamp": "desc"}]
                }
                result = self.client.search(index=index, body=body)
                return [hit["_source"] for hit in result["hits"]["hits"]]
            except Exception as e:
                print(f"[Elasticsearch] Detection search error: {e}")

        # Fallback
        detections = self._fallback_store.get("detections", [])
        if defect_type:
            detections = [d for d in detections if d.get("defect_type") == defect_type]
        if belt_id:
            detections = [d for d in detections if d.get("belt_id") == belt_id]
        return detections[-limit:]

    def get_analytics(self, doc_type: str, hours: int = 24) -> Dict:
        """Get analytics/aggregation for a document type."""
        if self.connected:
            try:
                index = self._get_index(doc_type)
                body = {
                    "query": {
                        "range": {
                            "timestamp": {
                                "gte": f"now-{hours}h"
                            }
                        }
                    },
                    "aggs": {
                        "by_source": {
                            "terms": {"field": "source.keyword"}
                        }
                    },
                    "size": 0
                }
                result = self.client.search(index=index, body=body)
                return {
                    "total": result["hits"]["total"]["value"],
                    "aggregations": result.get("aggregations", {}),
                }
            except Exception as e:
                print(f"[Elasticsearch] Analytics error: {e}")

        # Fallback
        docs = self._fallback_store.get(doc_type, [])
        cutoff = (datetime.utcnow() - timedelta(hours=hours)).isoformat()
        recent = [d for d in docs if d.get("indexed_at", d.get("timestamp", "")) >= cutoff]
        return {"total": len(recent), "aggregations": {}}

    def get_stats(self) -> Dict:
        """Get Elasticsearch statistics."""
        stats = {
            "connected": self.connected,
            "hosts": self.hosts,
            "indices": {},
        }
        if self.connected:
            try:
                cat_indices = self.client.cat.indices(format="json")
                for idx in cat_indices:
                    stats["indices"][idx["index"]] = {
                        "docs": idx.get("docs.count", 0),
                        "size": idx.get("store.size", "0b"),
                    }
            except Exception:
                pass
        else:
            for doc_type, docs in self._fallback_store.items():
                stats["indices"][doc_type] = {"docs": len(docs), "size": "in-memory"}
        return stats


# Global instance
elasticsearch_search = ElasticsearchSearch()
