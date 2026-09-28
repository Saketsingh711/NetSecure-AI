from pathlib import Path
from typing import Any
import yaml
from app.models import Finding, NormalizedConfig

RULES_PATH = Path(__file__).with_name("rules.yaml")
RULES = yaml.safe_load(RULES_PATH.read_text(encoding="utf-8"))


def get_field(obj: Any, dotted: str) -> Any:
    current = obj
    for part in dotted.split("."):
        if hasattr(current, part): current = getattr(current, part)
        elif isinstance(current, dict): current = current.get(part)
        else: return None
    return current


def evaluate(actual: Any, operator: str, expected: Any) -> bool | None:
    if actual is None:
        return None
    if operator == "equals": return actual == expected
    if operator == "not_equals": return actual != expected
    if operator == "contains": return expected in actual
    if operator == "not_contains": return expected not in actual
    return None


def run_compliance(config: NormalizedConfig) -> list[Finding]:
    findings = []
    for rule in RULES:
        actual = get_field(config, rule["field"])
        result = evaluate(actual, rule["operator"], rule["expected"])
        status = "REVIEW" if result is None else ("PASS" if result else "FAIL")
        findings.append(Finding(
            rule_id=rule["rule_id"], title=rule["title"], status=status,
            severity=rule["severity"], framework=rule.get("framework", []), field=rule["field"],
            actual_value=actual, expected_value=rule["expected"],
            evidence=config.extracted_evidence.get(rule["field"], []),
            remediation=rule["remediation"].get(config.vendor, rule["remediation"]["default"]),
        ))
    return findings
