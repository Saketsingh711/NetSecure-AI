from sqlalchemy.orm import Session
from app.db.models import AuditDB, LearnedMappingDB, ReviewDB


def mapping_for(db: Session, vendor: str, raw_line: str):
    return (
        db.query(LearnedMappingDB)
        .filter(
            LearnedMappingDB.vendor == vendor,
            LearnedMappingDB.raw_pattern == raw_line,
            LearnedMappingDB.approved.is_(True),
        )
        .order_by(LearnedMappingDB.mapping_id.desc())
        .first()
    )


def save_audit(db: Session, result: dict):
    obj = AuditDB(
        audit_id=result["audit_id"], filename=result["filename"], vendor=result["vendor"],
        parser=result["parser"], hostname=result["normalized"].get("hostname"),
        normalized=result["normalized"], findings=result["findings"],
        review_items=result["review_items"], summary=result["summary"],
    )
    db.add(obj)
    db.commit()
    return obj


def save_review(db: Session, review: dict):
    obj = ReviewDB(**review)
    db.add(obj)
    db.commit()
    return obj


def save_mapping(db: Session, data: dict):
    existing = mapping_for(db, data["vendor"], data["raw_pattern"])
    if existing:
        existing.normalized_field = data["normalized_field"]
        existing.normalized_value = data.get("normalized_value")
        existing.confidence = data.get("confidence", 1.0)
        existing.approved = True
        db.commit()
        return existing
    obj = LearnedMappingDB(**data)
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


def delete_mapping(db: Session, mapping_id: int):
    obj = db.get(LearnedMappingDB, mapping_id)
    if obj:
        db.delete(obj)
        db.commit()
        return True
    return False


def clear_all_mappings(db: Session):
    db.query(LearnedMappingDB).delete()
    db.commit()
    return True


def delete_review(db: Session, review_id: str):
    obj = db.get(ReviewDB, review_id)
    if obj:
        db.delete(obj)
        db.commit()
        return True
    return False


def clear_all_reviews(db: Session):
    db.query(ReviewDB).delete()
    db.commit()
    return True

