import os
os.environ["DATABASE_URL"] = "sqlite:///./test_netsecure.db"

from fastapi.testclient import TestClient
from app.main import app
from app.db.database import init_db, engine
from app.db.database import Base

Base.metadata.drop_all(bind=engine)
init_db()

client = TestClient(app)


def test_health():
    r = client.get("/api/health")
    assert r.status_code == 200
    assert r.json()["database"] == "connected"


def test_juniper_review_and_mapping_reuse():
    with open("sample_configs/juniper_bad.set", "rb") as f:
        first = client.post("/api/configurations/upload", files={"file": ("juniper_bad.set", f, "text/plain")})
    assert first.status_code == 200
    data = first.json()
    assert data["vendor"] == "juniper"
    assert data["review_items"]
    review = data["review_items"][0]
    review_id = review["review_id"]

    decision = client.post(f"/api/reviews/{review_id}/decision", json={"action":"correct", "corrected_field":"management.ssh_enabled", "corrected_value":True})
    assert decision.status_code == 200
    assert decision.json()["status"] == "CORRECTED"

    mappings = client.get("/api/mappings").json()
    assert mappings["count"] == 1

    with open("sample_configs/juniper_bad.set", "rb") as f:
        second = client.post("/api/configurations/upload", files={"file": ("juniper_bad.set", f, "text/plain")})
    assert second.status_code == 200
    assert second.json()["review_items"] == []


def test_pdf_report():
    with open("sample_configs/cisco_bad.cfg", "rb") as f:
        r = client.post("/api/configurations/upload", files={"file": ("cisco_bad.cfg", f, "text/plain")})
    assert r.status_code == 200
    audit_id = r.json()["audit_id"]
    pdf = client.get(f"/api/audits/{audit_id}/report.pdf")
    assert pdf.status_code == 200
    assert pdf.headers["content-type"].startswith("application/pdf")
