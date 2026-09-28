from pydantic import BaseModel, Field

from app.config import settings


ALLOWED_FIELDS = [
    "management.telnet_enabled",
    "management.ssh_enabled",
    "management.http_enabled",
    "management.https_enabled",
    "authentication.aaa_enabled",
    "logging.enabled",
    "ntp.enabled",
    "network_security.snmp_v2_community",
    "management.management_acl",
]


class AIInterpretation(BaseModel):
    raw_line: str
    suggested_field: str
    suggested_value: str | bool | int | float | None = None
    confidence: float = Field(ge=0, le=1)
    explanation: str = ""


def heuristic_interpretation(raw_line: str) -> AIInterpretation:
    line = raw_line.lower().strip()

    checks = [
        ("telnet", "management.telnet_enabled", True, 0.78),
        ("ssh", "management.ssh_enabled", True, 0.78),
        ("http", "management.http_enabled", True, 0.72),
        ("snmp", "network_security.snmp_v2_community", True, 0.70),
        ("ntp", "ntp.enabled", True, 0.70),
        ("logging", "logging.enabled", True, 0.68),
        ("aaa", "authentication.aaa_enabled", True, 0.75),
    ]

    for keyword, field, value, confidence in checks:
        if keyword in line:
            return AIInterpretation(
                raw_line=raw_line,
                suggested_field=field,
                suggested_value=value,
                confidence=confidence,
                explanation=(
                    "Heuristic fallback used because Gemini is not configured."
                ),
            )

    return AIInterpretation(
        raw_line=raw_line,
        suggested_field="unknown",
        confidence=0.20,
        explanation=(
            "No supported normalized security field could be inferred safely."
        ),
    )


def interpret_unknown_line(raw_line: str, vendor: str) -> AIInterpretation:

    # Gemini not configured → use deterministic fallback
    if not settings.gemini_api_key:
        return heuristic_interpretation(raw_line)

    try:
        from google import genai
        from google.genai import types

        client = genai.Client(api_key=settings.gemini_api_key)

        prompt = f"""
You assist a network security configuration auditor.

Vendor: {vendor}

Interpret ONLY this unfamiliar configuration line:

{raw_line}

Map it to ONE allowed normalized security field:

{", ".join(ALLOWED_FIELDS)}

Do not decide compliance.

If the meaning is uncertain, return:
- suggested_field = "unknown"
- suggested_value = null
- low confidence

Return only the requested structured JSON.
"""

        import time

        model_name = settings.gemini_model or "gemini-flash-latest"
        response = None
        last_err = None

        for attempt in range(3):
            try:
                target_model = model_name if attempt == 0 else "gemini-flash-latest"
                response = client.models.generate_content(
                    model=target_model,
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        response_mime_type="application/json",
                        response_schema=AIInterpretation.model_json_schema(),
                        temperature=0,
                    ),
                )
                if response and response.text:
                    break
            except Exception as err:
                last_err = err
                time.sleep(2 * (attempt + 1))

        if not response or not response.text:
            raise last_err or RuntimeError("No response from Gemini API")

        result = AIInterpretation.model_validate_json(response.text)

        if (
            result.suggested_field not in ALLOWED_FIELDS
            and result.suggested_field != "unknown"
        ):
            result.suggested_field = "unknown"
            result.suggested_value = None
            result.confidence = min(result.confidence, 0.2)

        return result

    except Exception as exc:
        result = heuristic_interpretation(raw_line)
        err_str = str(exc)
        if "429" in err_str or "RESOURCE_EXHAUSTED" in err_str:
            reason = "Gemini Free Tier Rate Limit Exceeded (429 Quota)."
        elif "404" in err_str or "NOT_FOUND" in err_str:
            reason = f"Gemini Model Not Found (404)."
        else:
            reason = f"Gemini Error ({type(exc).__name__})."

        result.explanation = (
            f"Gemini API temporarily unavailable ({reason}) - Heuristic rule applied. "
            f"You can manually map or approve this field below."
        )

        return result