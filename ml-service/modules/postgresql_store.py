"""
PostgreSQL Relational Database Module
- User management with roles and permissions
- Maintenance history and audit logs
- Structured data alongside MongoDB
- ACID transactions for critical operations
"""
import json
import time
from datetime import datetime
from typing import Any, Dict, List, Optional

try:
    from sqlalchemy import (
        create_engine, Column, Integer, String, Float, Boolean,
        DateTime, Text, ForeignKey, Table, MetaData
    )
    from sqlalchemy.orm import declarative_base, sessionmaker, relationship
    from sqlalchemy.sql import func
    SQLALCHEMY_AVAILABLE = True
except ImportError:
    SQLALCHEMY_AVAILABLE = False

Base = declarative_base() if SQLALCHEMY_AVAILABLE else None

# --- SQLAlchemy Models ---

if SQLALCHEMY_AVAILABLE:
    class PGUser(Base):
        __tablename__ = "users"
        id = Column(Integer, primary_key=True, autoincrement=True)
        user_id = Column(String(50), unique=True, nullable=False, index=True)
        full_name = Column(String(100), nullable=False)
        email = Column(String(150), unique=True)
        mobile = Column(String(20), unique=True)
        password_hash = Column(String(255), nullable=False)
        role = Column(String(20), nullable=False, default="worker")
        department = Column(String(50))
        designation = Column(String(50))
        section_head = Column(String(100))
        is_active = Column(Boolean, default=True)
        created_at = Column(DateTime, default=func.now())
        updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
        last_login = Column(DateTime)
        login_count = Column(Integer, default=0)

        def to_dict(self):
            return {
                "id": self.id,
                "user_id": self.user_id,
                "full_name": self.full_name,
                "email": self.email,
                "mobile": self.mobile,
                "role": self.role,
                "department": self.department,
                "designation": self.designation,
                "section_head": self.section_head,
                "is_active": self.is_active,
                "created_at": self.created_at.isoformat() if self.created_at else None,
                "last_login": self.last_login.isoformat() if self.last_login else None,
                "login_count": self.login_count,
            }

    class PGMaintenanceRecord(Base):
        __tablename__ = "maintenance_records"
        id = Column(Integer, primary_key=True, autoincrement=True)
        belt_id = Column(String(50), nullable=False, index=True)
        maintenance_type = Column(String(50), nullable=False)
        description = Column(Text)
        performed_by = Column(String(50))
        technician_name = Column(String(100))
        status = Column(String(20), default="scheduled")
        priority = Column(String(20), default="medium")
        scheduled_date = Column(DateTime)
        completed_date = Column(DateTime)
        cost = Column(Float, default=0.0)
        parts_replaced = Column(Text)
        notes = Column(Text)
        created_at = Column(DateTime, default=func.now())

        def to_dict(self):
            return {
                "id": self.id,
                "belt_id": self.belt_id,
                "maintenance_type": self.maintenance_type,
                "description": self.description,
                "performed_by": self.performed_by,
                "technician_name": self.technician_name,
                "status": self.status,
                "priority": self.priority,
                "scheduled_date": self.scheduled_date.isoformat() if self.scheduled_date else None,
                "completed_date": self.completed_date.isoformat() if self.completed_date else None,
                "cost": self.cost,
                "parts_replaced": self.parts_replaced,
                "notes": self.notes,
                "created_at": self.created_at.isoformat() if self.created_at else None,
            }

    class PGBeltConfig(Base):
        __tablename__ = "belt_configs"
        id = Column(Integer, primary_key=True, autoincrement=True)
        belt_id = Column(String(50), unique=True, nullable=False, index=True)
        name = Column(String(100), nullable=False)
        location = Column(String(200))
        length_meters = Column(Float)
        width_meters = Column(Float)
        material = Column(String(50))
        max_speed = Column(Float)
        install_date = Column(DateTime)
        last_inspection = Column(DateTime)
        next_inspection = Column(DateTime)
        is_active = Column(Boolean, default=True)
        created_at = Column(DateTime, default=func.now())

        def to_dict(self):
            return {
                "id": self.id,
                "belt_id": self.belt_id,
                "name": self.name,
                "location": self.location,
                "length_meters": self.length_meters,
                "width_meters": self.width_meters,
                "material": self.material,
                "max_speed": self.max_speed,
                "install_date": self.install_date.isoformat() if self.install_date else None,
                "last_inspection": self.last_inspection.isoformat() if self.last_inspection else None,
                "next_inspection": self.next_inspection.isoformat() if self.next_inspection else None,
                "is_active": self.is_active,
            }

    class PGAuditLog(Base):
        __tablename__ = "audit_logs"
        id = Column(Integer, primary_key=True, autoincrement=True)
        user_id = Column(String(50), index=True)
        action = Column(String(50), nullable=False)
        resource = Column(String(100))
        details = Column(Text)
        ip_address = Column(String(45))
        timestamp = Column(DateTime, default=func.now())

        def to_dict(self):
            return {
                "id": self.id,
                "user_id": self.user_id,
                "action": self.action,
                "resource": self.resource,
                "details": self.details,
                "ip_address": self.ip_address,
                "timestamp": self.timestamp.isoformat() if self.timestamp else None,
            }


class PostgreSQLStore:
    """PostgreSQL database operations."""

    def __init__(self, connection_string: str = "postgresql://nmdc:nmdc123@localhost:5432/nmdc_analytics"):
        self.connection_string = connection_string
        self.engine = None
        self.SessionLocal = None
        self.connected = False
        self._fallback_store: Dict[str, List[Dict]] = {}

        if SQLALCHEMY_AVAILABLE:
            try:
                self.engine = create_engine(
                    connection_string,
                    pool_size=5,
                    max_overflow=10,
                    pool_pre_ping=True,
                    echo=False,
                )
                # Test connection
                with self.engine.connect() as conn:
                    conn.execute(func.now())
                self.SessionLocal = sessionmaker(bind=self.engine)
                self.connected = True
                print(f"[PostgreSQL] Connected to {connection_string.split('@')[-1]}")
            except Exception as e:
                print(f"[PostgreSQL] Connection failed: {e}. Using in-memory fallback.")
        else:
            print("[PostgreSQL] SQLAlchemy not installed. Using in-memory fallback.")

    def create_tables(self):
        """Create all tables."""
        if self.connected and Base:
            Base.metadata.create_all(self.engine)
            print("[PostgreSQL] Tables created")

    def _get_session(self):
        """Get a database session."""
        if self.SessionLocal:
            return self.SessionLocal()
        return None

    # --- User Operations ---

    def create_user(self, user_data: Dict) -> Dict:
        """Create a new user."""
        if self.connected:
            session = self._get_session()
            try:
                user = PGUser(**user_data)
                session.add(user)
                session.commit()
                result = user.to_dict()
                session.close()
                return result
            except Exception as e:
                session.rollback()
                print(f"[PostgreSQL] Create user error: {e}")
                return {"error": str(e)}

        # Fallback
        if "users" not in self._fallback_store:
            self._fallback_store["users"] = []
        user_data["id"] = len(self._fallback_store["users"]) + 1
        user_data["created_at"] = datetime.utcnow().isoformat()
        self._fallback_store["users"].append(user_data)
        return user_data

    def get_user(self, user_id: str) -> Optional[Dict]:
        """Get user by user_id."""
        if self.connected:
            session = self._get_session()
            try:
                user = session.query(PGUser).filter(PGUser.user_id == user_id).first()
                result = user.to_dict() if user else None
                session.close()
                return result
            except Exception as e:
                print(f"[PostgreSQL] Get user error: {e}")
                return None

        for u in self._fallback_store.get("users", []):
            if u.get("user_id") == user_id:
                return u
        return None

    def get_user_by_email(self, email: str) -> Optional[Dict]:
        """Get user by email."""
        if self.connected:
            session = self._get_session()
            try:
                user = session.query(PGUser).filter(PGUser.email == email).first()
                result = user.to_dict() if user else None
                session.close()
                return result
            except Exception:
                return None

        for u in self._fallback_store.get("users", []):
            if u.get("email") == email:
                return u
        return None

    def update_user(self, user_id: str, updates: Dict) -> bool:
        """Update user fields."""
        if self.connected:
            session = self._get_session()
            try:
                session.query(PGUser).filter(PGUser.user_id == user_id).update(updates)
                session.commit()
                session.close()
                return True
            except Exception:
                session.rollback()
                return False

        for u in self._fallback_store.get("users", []):
            if u.get("user_id") == user_id:
                u.update(updates)
                return True
        return False

    def get_all_users(self) -> List[Dict]:
        """Get all users."""
        if self.connected:
            session = self._get_session()
            try:
                users = session.query(PGUser).all()
                result = [u.to_dict() for u in users]
                session.close()
                return result
            except Exception:
                return []

        return self._fallback_store.get("users", [])

    # --- Maintenance Operations ---

    def create_maintenance(self, data: Dict) -> Dict:
        """Create maintenance record."""
        if self.connected:
            session = self._get_session()
            try:
                record = PGMaintenanceRecord(**data)
                session.add(record)
                session.commit()
                result = record.to_dict()
                session.close()
                return result
            except Exception as e:
                session.rollback()
                return {"error": str(e)}

        if "maintenance" not in self._fallback_store:
            self._fallback_store["maintenance"] = []
        data["id"] = len(self._fallback_store["maintenance"]) + 1
        self._fallback_store["maintenance"].append(data)
        return data

    def get_maintenance(self, belt_id: Optional[str] = None, limit: int = 50) -> List[Dict]:
        """Get maintenance records."""
        if self.connected:
            session = self._get_session()
            try:
                query = session.query(PGMaintenanceRecord)
                if belt_id:
                    query = query.filter(PGMaintenanceRecord.belt_id == belt_id)
                records = query.order_by(PGMaintenanceRecord.created_at.desc()).limit(limit).all()
                result = [r.to_dict() for r in records]
                session.close()
                return result
            except Exception:
                return []

        records = self._fallback_store.get("maintenance", [])
        if belt_id:
            records = [r for r in records if r.get("belt_id") == belt_id]
        return records[-limit:]

    # --- Belt Config Operations ---

    def create_belt_config(self, data: Dict) -> Dict:
        """Create belt configuration."""
        if self.connected:
            session = self._get_session()
            try:
                config = PGBeltConfig(**data)
                session.add(config)
                session.commit()
                result = config.to_dict()
                session.close()
                return result
            except Exception as e:
                session.rollback()
                return {"error": str(e)}

        if "belt_configs" not in self._fallback_store:
            self._fallback_store["belt_configs"] = []
        data["id"] = len(self._fallback_store["belt_configs"]) + 1
        self._fallback_store["belt_configs"].append(data)
        return data

    # --- Audit Log ---

    def log_audit(self, user_id: str, action: str, resource: str, details: str = "", ip: str = ""):
        """Log an audit event."""
        if self.connected:
            session = self._get_session()
            try:
                log = PGAuditLog(
                    user_id=user_id, action=action,
                    resource=resource, details=details,
                    ip_address=ip
                )
                session.add(log)
                session.commit()
                session.close()
            except Exception:
                session.rollback()
        else:
            if "audit" not in self._fallback_store:
                self._fallback_store["audit"] = []
            self._fallback_store["audit"].append({
                "user_id": user_id, "action": action,
                "resource": resource, "details": details,
                "ip_address": ip,
                "timestamp": datetime.utcnow().isoformat(),
            })

    def get_audit_logs(self, user_id: Optional[str] = None, limit: int = 100) -> List[Dict]:
        """Get audit logs."""
        if self.connected:
            session = self._get_session()
            try:
                query = session.query(PGAuditLog)
                if user_id:
                    query = query.filter(PGAuditLog.user_id == user_id)
                logs = query.order_by(PGAuditLog.timestamp.desc()).limit(limit).all()
                result = [l.to_dict() for l in logs]
                session.close()
                return result
            except Exception:
                return []

        logs = self._fallback_store.get("audit", [])
        if user_id:
            logs = [l for l in logs if l.get("user_id") == user_id]
        return logs[-limit:]

    # --- Stats ---

    def get_stats(self) -> Dict:
        """Get database statistics."""
        stats = {
            "connected": self.connected,
            "tables": {},
        }
        if self.connected:
            session = self._get_session()
            try:
                stats["tables"]["users"] = session.query(PGUser).count()
                stats["tables"]["maintenance"] = session.query(PGMaintenanceRecord).count()
                stats["tables"]["belt_configs"] = session.query(PGBeltConfig).count()
                stats["tables"]["audit_logs"] = session.query(PGAuditLog).count()
                session.close()
            except Exception:
                pass
        else:
            for table, rows in self._fallback_store.items():
                stats["tables"][table] = len(rows)
        return stats


# Global instance
postgresql_store = PostgreSQLStore()
