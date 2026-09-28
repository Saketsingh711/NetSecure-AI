# NETSECURE AI Backend

Final backend for **SIH26155: AI-Driven Multi-Vendor Network Security Compliance Auditor**.

## What is included

1. Cisco, Fortinet and Juniper configuration parsing.
2. Vendor-neutral normalized security model.
3. Deterministic compliance engine with CIS/NIST-oriented controls and selected security checks.
4. AI-assisted interpretation of unfamiliar syntax using Gemini structured JSON output.
5. Human review and correction workflow.
6. Learned mapping storage and automatic reuse on later audits.
7. PostgreSQL support through SQLAlchemy + Docker Compose.
8. SQLite fallback for easy local development.
9. Persistent audits, reviews and learned mappings.
10. PDF audit report generation.
11. Dashboard-ready statistics API.
12. Swagger/OpenAPI documentation.
13. Automated backend tests.

## Architecture

Upload configuration -> Vendor detection -> Vendor parser -> Known syntax mapping / Learned mapping lookup -> AI-assisted parsing for unknown syntax -> Human approval -> Normalized security model -> Deterministic compliance engine -> Findings -> PostgreSQL -> Dashboard/PDF API.

AI is advisory. It does not decide PASS/FAIL. Compliance status comes from deterministic rules and administrator-approved mappings.

## Quick start with SQLite

PowerShell:

```powershell
py -3.13 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
Copy-Item .env.example .env
python -m uvicorn app.main:app --reload
```

Open `http://127.0.0.1:8000/docs`.

## PostgreSQL mode

Install Docker Desktop, then from the project root:

```powershell
docker compose up -d
```

Set `.env`:

```env
DATABASE_URL=postgresql+psycopg://netsecure:netsecure@localhost:5432/netsecure_ai
GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.5-flash
```

Restart the backend.

## Gemini

Gemini is optional. Without a key, the backend uses a safe heuristic fallback and flags uncertain syntax for human review.

With Gemini, put the key in `.env` and restart Uvicorn.

## Main endpoints

- `GET /api/health`
- `GET /api/stats`
- `POST /api/configurations/upload`
- `GET /api/audits`
- `GET /api/audits/{audit_id}`
- `GET /api/audits/{audit_id}/report.pdf`
- `GET /api/reviews/{review_id}`
- `POST /api/reviews/{review_id}/decision`
- `POST /api/reviews/{review_id}/approve`
- `GET /api/mappings`

## Learned mapping behavior

First time:

Unknown line -> AI suggestion -> human approval/correction -> mapping saved.

Later:

Same vendor + same raw line -> approved mapping found -> mapping reused -> no new AI review.

Mappings are persisted in PostgreSQL when PostgreSQL mode is enabled.

## Test

From the project root:

```powershell
pytest -q
```

The tests cover health, Juniper review, learned mapping reuse, and PDF report generation.

## MVP scope

This backend intentionally accepts uploaded configuration files. Live device connections and Netmiko are not included in the MVP.
