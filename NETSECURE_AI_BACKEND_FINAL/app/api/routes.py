from typing import Annotated
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import Response
from sqlalchemy.orm import Session
from app.config import settings
from app.db.database import get_db
from app.db.models import AuditDB, LearnedMappingDB, ReviewDB
from pydantic import BaseModel
from app.models import ReviewDecision
from app.reporting.pdf import build_audit_pdf, build_merged_pdf
from app.services import approve_review, create_audit

router = APIRouter(prefix="/api")


@router.get("/health")
def health(db: Session = Depends(get_db)):
    db.execute(__import__('sqlalchemy').text("SELECT 1"))
    return {"status": "ok", "service": settings.app_name, "version": settings.app_version, "database": "connected"}


@router.get("/stats")
def stats(db: Session = Depends(get_db)):
    audits = db.query(AuditDB).count()
    reviews = db.query(ReviewDB).count()
    mappings = db.query(LearnedMappingDB).count()
    passed = failed = review = 0
    for row in db.query(AuditDB).all():
        passed += row.summary.get("PASS", 0)
        failed += row.summary.get("FAIL", 0)
        review += row.summary.get("REVIEW", 0)
    return {"audits": audits, "reviews": reviews, "learned_mappings": mappings, "findings": {"PASS": passed, "FAIL": failed, "REVIEW": review}}


@router.post("/configurations/upload-batch")
async def upload_configurations_batch(files: Annotated[list[UploadFile], File()], db: Session = Depends(get_db)):
    """Accept up to 10 configuration files and return an array of audit results."""
    if len(files) > 10:
        raise HTTPException(400, "Maximum 10 files allowed per batch upload")
    allowed = {".txt", ".cfg", ".conf", ".log", ".set"}
    results = []
    errors = []
    for file in files:
        filename = file.filename or "configuration.txt"
        suffix = "." + filename.lower().split(".")[-1] if "." in filename else ""
        if suffix not in allowed:
            errors.append({"filename": filename, "error": f"Unsupported file type '{suffix}'. Use: {', '.join(sorted(allowed))}"})
            continue
        raw = await file.read()
        if len(raw) > settings.max_config_size_mb * 1024 * 1024:
            errors.append({"filename": filename, "error": f"File exceeds {settings.max_config_size_mb} MB limit"})
            continue
        try:
            result = create_audit(db, filename, raw.decode("utf-8", errors="replace"))
            results.append(result)
        except ValueError as exc:
            errors.append({"filename": filename, "error": str(exc)})
    return {"results": results, "errors": errors, "total": len(files), "succeeded": len(results), "failed": len(errors)}


@router.post("/configurations/upload")
async def upload_configuration(file: Annotated[UploadFile, File()], db: Session = Depends(get_db)):
    filename = file.filename or "configuration.txt"
    allowed = {".txt", ".cfg", ".conf", ".log", ".set"}
    suffix = "." + filename.lower().split(".")[-1] if "." in filename else ""
    if suffix not in allowed:
        raise HTTPException(400, f"Unsupported file type. Use: {', '.join(sorted(allowed))}")
    raw = await file.read()
    if len(raw) > settings.max_config_size_mb * 1024 * 1024:
        raise HTTPException(413, f"File exceeds {settings.max_config_size_mb} MB limit")
    try:
        return create_audit(db, filename, raw.decode("utf-8", errors="replace"))
    except ValueError as exc:
        raise HTTPException(422, str(exc)) from exc


@router.get("/audits")
def list_audits(db: Session = Depends(get_db)):
    rows = db.query(AuditDB).order_by(AuditDB.created_at.desc()).all()
    return [{"audit_id": r.audit_id, "filename": r.filename, "vendor": r.vendor, "hostname": r.hostname, "summary": r.summary, "created_at": r.created_at} for r in rows]


@router.get("/audits/{audit_id}")
def get_audit(audit_id: str, db: Session = Depends(get_db)):
    row = db.get(AuditDB, audit_id)
    if not row: raise HTTPException(404, "Audit not found")
    return {"audit_id": row.audit_id, "filename": row.filename, "vendor": row.vendor, "parser": row.parser, "normalized": row.normalized, "findings": row.findings, "review_items": row.review_items, "summary": row.summary, "created_at": row.created_at}


@router.get("/audits/{audit_id}/report.pdf")
def audit_pdf(audit_id: str, db: Session = Depends(get_db)):
    row = db.get(AuditDB, audit_id)
    if not row: raise HTTPException(404, "Audit not found")
    payload = {"audit_id": row.audit_id, "filename": row.filename, "vendor": row.vendor, "normalized": row.normalized, "findings": row.findings, "summary": row.summary}
    return Response(build_audit_pdf(payload), media_type="application/pdf", headers={"Content-Disposition": f'attachment; filename="netsecure_{audit_id}.pdf"'})


class MergedReportRequest(BaseModel):
    audit_ids: list[str]


@router.post("/audits/merged-report.pdf")
def merged_audit_pdf(request: MergedReportRequest, db: Session = Depends(get_db)):
    """Generate and download a single merged PDF for multiple audit IDs."""
    if not request.audit_ids:
        raise HTTPException(400, "No audit_ids provided")
    payloads = []
    for audit_id in request.audit_ids:
        row = db.get(AuditDB, audit_id)
        if not row:
            raise HTTPException(404, f"Audit not found: {audit_id}")
        payloads.append({
            "audit_id": row.audit_id, "filename": row.filename, "vendor": row.vendor,
            "normalized": row.normalized, "findings": row.findings, "summary": row.summary,
        })
    pdf_bytes = build_merged_pdf(payloads)
    filename = f"netsecure_merged_{len(payloads)}_audits.pdf"
    return Response(pdf_bytes, media_type="application/pdf", headers={"Content-Disposition": f'attachment; filename="{filename}"'})


@router.get("/reviews")
def list_reviews(status: str | None = None, db: Session = Depends(get_db)):
    query = db.query(ReviewDB)
    if status:
        query = query.filter(ReviewDB.status == status)
    rows = query.order_by(ReviewDB.created_at.desc()).all()
    return [{"review_id": r.review_id, "audit_id": r.audit_id, "vendor": r.vendor, "raw_line": r.raw_line, "suggested_field": r.suggested_field, "suggested_value": r.suggested_value, "confidence": r.confidence, "explanation": r.explanation, "status": r.status, "created_at": r.created_at} for r in rows]


@router.get("/reviews/{review_id}")
def get_review(review_id: str, db: Session = Depends(get_db)):
    row = db.get(ReviewDB, review_id)
    if not row: raise HTTPException(404, "Review not found")
    return {"review_id": row.review_id, "audit_id": row.audit_id, "vendor": row.vendor, "raw_line": row.raw_line, "suggested_field": row.suggested_field, "suggested_value": row.suggested_value, "confidence": row.confidence, "explanation": row.explanation, "status": row.status}


@router.post("/reviews/{review_id}/decision")
def review_decision(review_id: str, decision: ReviewDecision, db: Session = Depends(get_db)):
    try:
        row = approve_review(db, review_id, decision.action, decision.corrected_field, decision.corrected_value)
        return {"review_id": row.review_id, "status": row.status, "normalized_field": row.suggested_field, "normalized_value": row.suggested_value}
    except KeyError:
        raise HTTPException(404, "Review not found")
    except ValueError as exc:
        raise HTTPException(422, str(exc))


@router.post("/reviews/{review_id}/approve")
def approve(review_id: str, decision: ReviewDecision | None = None, db: Session = Depends(get_db)):
    decision = decision or ReviewDecision()
    decision.action = "correct" if decision.corrected_field else "approve"
    return review_decision(review_id, decision, db)


@router.delete("/reviews/{review_id}")
def delete_review_route(review_id: str, db: Session = Depends(get_db)):
    from app.storage.repository import delete_review
    success = delete_review(db, review_id)
    if not success:
        raise HTTPException(404, "Review not found")
    return {"status": "deleted", "review_id": review_id}


@router.delete("/reviews")
def clear_reviews_route(db: Session = Depends(get_db)):
    from app.storage.repository import clear_all_reviews
    clear_all_reviews(db)
    return {"status": "all_reviews_deleted"}



@router.get("/mappings")
def mappings(db: Session = Depends(get_db)):
    rows = db.query(LearnedMappingDB).order_by(LearnedMappingDB.mapping_id.desc()).all()
    return {"count": len(rows), "mappings": [{"mapping_id": r.mapping_id, "vendor": r.vendor, "raw_pattern": r.raw_pattern, "normalized_field": r.normalized_field, "normalized_value": r.normalized_value, "confidence": r.confidence, "approved": r.approved, "created_at": r.created_at} for r in rows]}


@router.delete("/mappings/{mapping_id}")
def delete_mapping_route(mapping_id: int, db: Session = Depends(get_db)):
    from app.storage.repository import delete_mapping
    success = delete_mapping(db, mapping_id)
    if not success:
        raise HTTPException(404, "Mapping not found")
    return {"status": "deleted", "mapping_id": mapping_id}


@router.delete("/mappings")
def clear_mappings_route(db: Session = Depends(get_db)):
    from app.storage.repository import clear_all_mappings
    clear_all_mappings(db)
    return {"status": "all_mappings_deleted"}

