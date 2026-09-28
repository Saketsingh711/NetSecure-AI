from typing import Any, Literal
from pydantic import BaseModel, Field

Status = Literal["PASS", "FAIL", "REVIEW"]
Severity = Literal["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"]


class Finding(BaseModel):
    rule_id: str
    title: str
    status: Status
    severity: Severity
    framework: list[str] = Field(default_factory=list)
    field: str
    actual_value: Any = None
    expected_value: Any = None
    evidence: list[str] = Field(default_factory=list)
    remediation: str


class ReviewItem(BaseModel):
    review_id: str
    audit_id: str | None = None
    vendor: str
    raw_line: str
    suggested_field: str
    suggested_value: Any = None
    confidence: float = Field(ge=0, le=1)
    explanation: str = ""
    status: Literal["PENDING", "APPROVED", "CORRECTED", "REJECTED"] = "PENDING"


class NormalizedConfig(BaseModel):
    vendor: str
    hostname: str | None = None
    management: dict[str, Any] = Field(default_factory=dict)
    authentication: dict[str, Any] = Field(default_factory=dict)
    logging: dict[str, Any] = Field(default_factory=dict)
    ntp: dict[str, Any] = Field(default_factory=dict)
    network_security: dict[str, Any] = Field(default_factory=dict)
    extracted_evidence: dict[str, list[str]] = Field(default_factory=dict)


class AuditResponse(BaseModel):
    audit_id: str
    filename: str
    vendor: str
    parser: str
    normalized: NormalizedConfig
    findings: list[Finding]
    review_items: list[ReviewItem]
    summary: dict[str, int]


class ReviewDecision(BaseModel):
    corrected_field: str | None = None
    corrected_value: Any = None
    action: Literal["approve", "correct", "reject"] = "approve"
