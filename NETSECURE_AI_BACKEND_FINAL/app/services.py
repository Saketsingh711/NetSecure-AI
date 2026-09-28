import uuid
from collections import Counter
from sqlalchemy.orm import Session
from app.ai.parser import interpret_unknown_line
from app.compliance.engine import run_compliance
from app.models import AuditResponse, ReviewItem
from app.parsers.registry import PARSERS
from app.parsers.vendor_detector import detect_vendor
from app.storage.repository import mapping_for, save_audit, save_mapping, save_review

ALLOWED_FIELDS = {
    "management.telnet_enabled", "management.ssh_enabled", "management.http_enabled", "management.https_enabled",
    "authentication.aaa_enabled", "logging.enabled", "ntp.enabled", "network_security.snmp_v2_community", "management.management_acl",
}


def set_nested(config, dotted: str, value, evidence_line: str):
    parts = dotted.split(".")
    if len(parts) != 2 or dotted not in ALLOWED_FIELDS:
        return False
    section, key = parts
    if not hasattr(config, section):
        return False
    container = getattr(config, section)
    if not isinstance(container, dict):
        return False
    container[key] = value
    config.extracted_evidence.setdefault(dotted, []).append(evidence_line)
    return True


def create_audit(db: Session, filename: str, config_text: str) -> AuditResponse:
    vendor = detect_vendor(config_text, filename)
    if vendor not in PARSERS:
        raise ValueError("Unsupported or unknown vendor. Supported vendors: Cisco, Fortinet, Juniper.")

    parsed = PARSERS[vendor].parse(config_text)
    review_items: list[ReviewItem] = []
    unknown_for_review = []

    for raw_line in parsed.unknown_lines[:20]:
        learned = mapping_for(db, vendor, raw_line)
        if learned:
            set_nested(parsed.normalized, learned.normalized_field, learned.normalized_value, raw_line)
            continue
        unknown_for_review.append(raw_line)

    audit_id = str(uuid.uuid4())
    for raw_line in unknown_for_review:
        interpretation = interpret_unknown_line(raw_line, vendor)
        review_id = str(uuid.uuid4())
        item = ReviewItem(
            review_id=review_id, audit_id=audit_id, vendor=vendor, raw_line=raw_line,
            suggested_field=interpretation.suggested_field, suggested_value=interpretation.suggested_value,
            confidence=interpretation.confidence, explanation=interpretation.explanation, status="PENDING",
        )
        review_items.append(item)
        save_review(db, item.model_dump())

    findings = run_compliance(parsed.normalized)
    counts = Counter(f.status for f in findings)
    summary = {"PASS": counts.get("PASS", 0), "FAIL": counts.get("FAIL", 0), "REVIEW": counts.get("REVIEW", 0)}

    response = AuditResponse(
        audit_id=audit_id, filename=filename, vendor=vendor, parser=parsed.parser_name,
        normalized=parsed.normalized, findings=findings, review_items=review_items, summary=summary,
    )
    save_audit(db, response.model_dump())
    return response


def get_review(db: Session, review_id: str):
    from app.db.models import ReviewDB
    return db.query(ReviewDB).filter(ReviewDB.review_id == review_id).first()


def approve_review(db: Session, review_id: str, action: str = "approve", corrected_field: str | None = None, corrected_value=None):
    review = get_review(db, review_id)
    if not review:
        raise KeyError(review_id)
    if action == "reject":
        review.status = "REJECTED"
        db.commit()
        return review

    field = corrected_field or review.suggested_field
    value = corrected_value if corrected_field else review.suggested_value
    if field not in ALLOWED_FIELDS:
        raise ValueError("The normalized field is not allowed.")

    review.suggested_field = field
    review.suggested_value = value
    review.status = "CORRECTED" if corrected_field else "APPROVED"
    save_mapping(db, {
        "vendor": review.vendor,
        "raw_pattern": review.raw_line,
        "normalized_field": field,
        "normalized_value": value,
        "confidence": review.confidence,
        "approved": True,
    })
    db.commit()
    return review
