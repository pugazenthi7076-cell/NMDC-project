"""
MinIO Object Storage Module for Industrial Belt Monitoring
Stores belt images, detection screenshots, analysis reports, and logs.

Buckets:
  nmdc-belt-images    - Raw belt camera images
  nmdc-detections     - YOLO/OpenCV detection screenshots with bounding boxes
  nmdc-reports        - PDF analysis reports
  nmdc-logs           - System and alert logs
"""

import os
import json
import io
import base64
from typing import Dict, List, Optional, BinaryIO
from datetime import datetime

try:
    from minio import Minio
    from minio.error import S3Error
    MINIO_AVAILABLE = True
except ImportError:
    MINIO_AVAILABLE = False


# Bucket names
BUCKET_IMAGES = "nmdc-belt-images"
BUCKET_DETECTIONS = "nmdc-detections"
BUCKET_REPORTS = "nmdc-reports"
BUCKET_LOGS = "nmdc-logs"
ALL_BUCKETS = [BUCKET_IMAGES, BUCKET_DETECTIONS, BUCKET_REPORTS, BUCKET_LOGS]


class MinIOStorage:
    """Manages MinIO object storage for belt monitoring data."""

    def __init__(self, endpoint: str = "localhost:9000",
                 access_key: str = "minioadmin",
                 secret_key: str = "minioadmin",
                 secure: bool = False):
        self.endpoint = endpoint
        self.access_key = access_key
        self.secret_key = secret_key
        self.secure = secure
        self.client = None
        self.connected = False

    def connect(self) -> bool:
        """Connect to MinIO server."""
        if not MINIO_AVAILABLE:
            print("  [WARN] minio package not installed")
            return False

        try:
            self.client = Minio(
                self.endpoint,
                access_key=self.access_key,
                secret_key=self.secret_key,
                secure=self.secure,
            )

            # Create buckets if they don't exist
            for bucket_name in ALL_BUCKETS:
                if not self.client.bucket_exists(bucket_name):
                    self.client.make_bucket(bucket_name)
                    print(f"  [MinIO] Created bucket: {bucket_name}")
                else:
                    print(f"  [MinIO] Bucket exists: {bucket_name}")

            self.connected = True
            return True
        except Exception as e:
            print(f"  [WARN] MinIO connection failed: {e}")
            return False

    def upload_image(self, belt_id: str, image_data: bytes,
                     filename: Optional[str] = None,
                     content_type: str = "image/jpeg") -> str:
        """Upload a belt image to MinIO."""
        if not self.connected:
            return ""

        if filename is None:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"{belt_id}/{timestamp}.jpg"

        data_stream = io.BytesIO(image_data)
        self.client.put_object(
            BUCKET_IMAGES, filename, data_stream,
            length=len(image_data),
            content_type=content_type,
        )
        return filename

    def upload_detection(self, belt_id: str, image_data: bytes,
                         detections: Dict, filename: Optional[str] = None) -> str:
        """Upload a detection screenshot with metadata."""
        if not self.connected:
            return ""

        if filename is None:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"{belt_id}/{timestamp}.jpg"

        # Upload image
        data_stream = io.BytesIO(image_data)
        self.client.put_object(
            BUCKET_DETECTIONS, filename, data_stream,
            length=len(image_data),
            content_type="image/jpeg",
        )

        # Upload metadata JSON
        meta_filename = filename.replace(".jpg", "_meta.json")
        meta_json = json.dumps({
            "belt_id": belt_id,
            "filename": filename,
            "detections": detections,
            "uploaded_at": datetime.now().isoformat(),
        }).encode()
        meta_stream = io.BytesIO(meta_json)
        self.client.put_object(
            BUCKET_DETECTIONS, meta_filename, meta_stream,
            length=len(meta_json),
            content_type="application/json",
        )

        return filename

    def upload_report(self, belt_id: str, report_html: str,
                      filename: Optional[str] = None) -> str:
        """Upload a PDF/HTML analysis report."""
        if not self.connected:
            return ""

        if filename is None:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"{belt_id}/{timestamp}_report.html"

        data = report_html.encode()
        data_stream = io.BytesIO(data)
        self.client.put_object(
            BUCKET_REPORTS, filename, data_stream,
            length=len(data),
            content_type="text/html",
        )
        return filename

    def upload_log(self, log_data: str, filename: Optional[str] = None) -> str:
        """Upload system/alert logs."""
        if not self.connected:
            return ""

        if filename is None:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"{timestamp}.log"

        data = log_data.encode()
        data_stream = io.BytesIO(data)
        self.client.put_object(
            BUCKET_LOGS, filename, data_stream,
            length=len(data),
            content_type="text/plain",
        )
        return filename

    def download_file(self, bucket: str, filename: str) -> Optional[bytes]:
        """Download a file from MinIO."""
        if not self.connected:
            return None

        try:
            response = self.client.get_object(bucket, filename)
            data = response.read()
            response.close()
            response.release_conn()
            return data
        except S3Error:
            return None

    def list_files(self, bucket: str, prefix: str = "", limit: int = 50) -> List[Dict]:
        """List files in a bucket."""
        if not self.connected:
            return []

        files = []
        objects = self.client.list_objects(bucket, prefix=prefix)
        for i, obj in enumerate(objects):
            if i >= limit:
                break
            files.append({
                "name": obj.object_name,
                "size": obj.size,
                "last_modified": obj.last_modified.isoformat() if obj.last_modified else None,
                "etag": obj.etag,
            })
        return files

    def list_belt_images(self, belt_id: str) -> List[Dict]:
        """List all images for a specific belt."""
        return self.list_files(BUCKET_IMAGES, prefix=f"{belt_id}/")

    def list_detections(self, belt_id: str) -> List[Dict]:
        """List all detections for a specific belt."""
        return self.list_files(BUCKET_DETECTIONS, prefix=f"{belt_id}/")

    def list_reports(self, belt_id: str) -> List[Dict]:
        """List all reports for a specific belt."""
        return self.list_files(BUCKET_REPORTS, prefix=f"{belt_id}/")

    def get_file_url(self, bucket: str, filename: str) -> str:
        """Get a presigned URL for downloading a file."""
        if not self.connected:
            return ""
        try:
            url = self.client.presigned_get_object(bucket, filename, expires=3600)
            return url
        except S3Error:
            return ""

    def delete_file(self, bucket: str, filename: str) -> bool:
        """Delete a file from MinIO."""
        if not self.connected:
            return False
        try:
            self.client.remove_object(bucket, filename)
            return True
        except S3Error:
            return False

    def get_storage_stats(self) -> Dict:
        """Get storage statistics across all buckets."""
        if not self.connected:
            return {"connected": False}

        stats = {}
        for bucket_name in ALL_BUCKETS:
            try:
                objects = list(self.client.list_objects(bucket_name))
                total_size = sum(obj.size or 0 for obj in objects)
                stats[bucket_name] = {
                    "files": len(objects),
                    "size_bytes": total_size,
                    "size_mb": round(total_size / (1024 * 1024), 2),
                }
            except Exception:
                stats[bucket_name] = {"files": 0, "size_bytes": 0, "size_mb": 0}

        total_files = sum(s["files"] for s in stats.values())
        total_size = sum(s["size_bytes"] for s in stats.values())

        return {
            "connected": True,
            "endpoint": self.endpoint,
            "buckets": stats,
            "total_files": total_files,
            "total_size_mb": round(total_size / (1024 * 1024), 2),
        }


# Singleton
minio_storage = MinIOStorage(
    endpoint=os.getenv("MINIO_ENDPOINT", "localhost:9000"),
    access_key=os.getenv("MINIO_ACCESS_KEY", "minioadmin"),
    secret_key=os.getenv("MINIO_SECRET_KEY", "minioadmin"),
)
