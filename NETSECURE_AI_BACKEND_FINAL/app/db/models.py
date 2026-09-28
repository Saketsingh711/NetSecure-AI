from datetime import datetime, timezone
from sqlalchemy import Boolean, DateTime, Float, Integer, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column
from app.db.database import Base


def utcnow():
    return datetime.now(timezone.utc)


class AuditDB(Base):
    __tablename__ = "audits"
    audit_id: Mapped[str] = mapped_column(String(36), primary_key=True)
    filename: Mapped[str] = mapped_column(String(255))
    vendor: Mapped[str] = mapped_column(String(50))
    parser: Mapped[str] = mapped_column(String(100))
    hostname: Mapped[str | None] = mapped_column(String(255), nullable=True)
    normalized: Mapped[dict] = mapped_column(JSON)
    findings: Mapped[list] = mapped_column(JSON)
    review_items: Mapped[list] = mapped_column(JSON)
    summary: Mapped[dict] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class ReviewDB(Base):
    __tablename__ = "reviews"
    review_id: Mapped[str] = mapped_column(String(36), primary_key=True)
    audit_id: Mapped[str] = mapped_column(String(36), index=True)
    vendor: Mapped[str] = mapped_column(String(50))
    raw_line: Mapped[str] = mapped_column(Text)
    suggested_field: Mapped[str] = mapped_column(String(150))
    suggested_value: Mapped[object | None] = mapped_column(JSON, nullable=True)
    confidence: Mapped[float] = mapped_column(Float)
    explanation: Mapped[str] = mapped_column(Text, default="")
    status: Mapped[str] = mapped_column(String(20), default="PENDING")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class LearnedMappingDB(Base):
    __tablename__ = "learned_mappings"
    mapping_id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    vendor: Mapped[str] = mapped_column(String(50), index=True)
    raw_pattern: Mapped[str] = mapped_column(Text, index=True)
    normalized_field: Mapped[str] = mapped_column(String(150))
    normalized_value: Mapped[object | None] = mapped_column(JSON, nullable=True)
    confidence: Mapped[float] = mapped_column(Float, default=1.0)
    approved: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
