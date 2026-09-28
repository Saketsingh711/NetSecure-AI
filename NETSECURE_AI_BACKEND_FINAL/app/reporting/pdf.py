from io import BytesIO
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)


def _safe(value) -> str:
    """Escape text before placing it inside a ReportLab Paragraph."""
    if value is None:
        return "N/A"

    return escape(str(value))


def _cell(text, style):
    """Create a wrapping table cell."""
    return Paragraph(_safe(text), style)


def _evidence_cell(values, style):
    """Create a wrapping evidence cell."""
    if not values:
        return Paragraph("None", style)

    content = "<br/>".join(
        _safe(value)
        for value in values
    )

    return Paragraph(
        content,
        style,
    )


def _footer(canvas, doc):
    """Add footer and page number."""

    canvas.saveState()

    canvas.setFont(
        "Helvetica",
        7,
    )

    canvas.setFillColor(
        colors.grey
    )

    canvas.drawString(
        18 * mm,
        10 * mm,
        "NETSECURE AI - Security Compliance Audit",
    )

    canvas.drawRightString(
        landscape(A4)[0] - 18 * mm,
        10 * mm,
        f"Page {doc.page}",
    )

    canvas.restoreState()


def build_audit_pdf(audit: dict) -> bytes:
    """
    Generate a readable A4 landscape audit report.

    Long rule titles, evidence, and remediation text are placed
    inside ReportLab Paragraphs so they wrap correctly instead
    of overlapping neighboring columns.
    """

    buffer = BytesIO()

    page_width, page_height = landscape(A4)

    doc = SimpleDocTemplate(
        buffer,
        pagesize=landscape(A4),

        rightMargin=18 * mm,
        leftMargin=18 * mm,
        topMargin=16 * mm,
        bottomMargin=18 * mm,

        title="NETSECURE AI - Security Compliance Audit",
        author="NETSECURE AI",
    )

    styles = getSampleStyleSheet()

    # ---------------------------------------------------------
    # TITLE
    # ---------------------------------------------------------

    title_style = ParagraphStyle(
        "AuditTitle",
        parent=styles["Title"],
        fontName="Helvetica-Bold",
        fontSize=18,
        leading=22,
        alignment=TA_LEFT,
        spaceAfter=8,
    )

    # ---------------------------------------------------------
    # NORMAL TEXT
    # ---------------------------------------------------------

    normal_style = ParagraphStyle(
        "AuditNormal",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9,
        leading=12,
        spaceAfter=2,
    )

    # ---------------------------------------------------------
    # FOOTNOTE / AI NOTE
    # ---------------------------------------------------------

    italic_style = ParagraphStyle(
        "AuditNote",
        parent=styles["Italic"],
        fontName="Helvetica-Oblique",
        fontSize=8.5,
        leading=11,
        textColor=colors.HexColor("#444444"),
    )

    # ---------------------------------------------------------
    # TABLE HEADER
    # ---------------------------------------------------------

    header_style = ParagraphStyle(
        "TableHeader",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=7.5,
        leading=9,
        alignment=TA_LEFT,
    )

    # ---------------------------------------------------------
    # TABLE CELL
    # ---------------------------------------------------------

    cell_style = ParagraphStyle(
        "TableCell",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=7.2,
        leading=9,
        alignment=TA_LEFT,
        spaceAfter=0,

        # Allows long configuration strings to wrap.
        splitLongWords=True,
    )

    # ---------------------------------------------------------
    # STATUS CELL
    # ---------------------------------------------------------

    status_style = ParagraphStyle(
        "StatusCell",
        parent=cell_style,
        alignment=TA_CENTER,
        fontName="Helvetica-Bold",
    )

    # ---------------------------------------------------------
    # REPORT HEADER
    # ---------------------------------------------------------

    normalized = audit.get(
        "normalized",
        {},
    )

    story = [
        Paragraph(
            "NETSECURE AI - Security Compliance Audit",
            title_style,
        ),

        Paragraph(
            f"File: {_safe(audit.get('filename'))}",
            normal_style,
        ),

        Paragraph(
            f"Vendor: {_safe(audit.get('vendor'))}",
            normal_style,
        ),

        Paragraph(
            f"Hostname: {_safe(normalized.get('hostname') or 'N/A')}",
            normal_style,
        ),

        Spacer(
            1,
            8,
        ),
    ]

    # ---------------------------------------------------------
    # SUMMARY
    # ---------------------------------------------------------

    summary = audit.get(
        "summary",
        {},
    )

    summary_table = Table(
        [
            [
                Paragraph(
                    "PASS",
                    header_style,
                ),

                Paragraph(
                    "FAIL",
                    header_style,
                ),

                Paragraph(
                    "REVIEW",
                    header_style,
                ),
            ],

            [
                Paragraph(
                    str(summary.get("PASS", 0)),
                    status_style,
                ),

                Paragraph(
                    str(summary.get("FAIL", 0)),
                    status_style,
                ),

                Paragraph(
                    str(summary.get("REVIEW", 0)),
                    status_style,
                ),
            ],
        ],

        colWidths=[
            25 * mm,
            25 * mm,
            28 * mm,
        ],

        hAlign="LEFT",
    )

    summary_table.setStyle(
        TableStyle(
            [
                (
                    "GRID",
                    (0, 0),
                    (-1, -1),
                    0.5,
                    colors.grey,
                ),

                (
                    "BACKGROUND",
                    (0, 0),
                    (-1, 0),
                    colors.lightgrey,
                ),

                (
                    "ALIGN",
                    (0, 0),
                    (-1, -1),
                    "CENTER",
                ),

                (
                    "VALIGN",
                    (0, 0),
                    (-1, -1),
                    "MIDDLE",
                ),

                (
                    "TOPPADDING",
                    (0, 0),
                    (-1, -1),
                    5,
                ),

                (
                    "BOTTOMPADDING",
                    (0, 0),
                    (-1, -1),
                    5,
                ),
            ]
        )
    )

    story.extend(
        [
            summary_table,
            Spacer(
                1,
                10,
            ),
        ]
    )

    # ---------------------------------------------------------
    # FINDINGS TABLE
    # ---------------------------------------------------------

    rows = [
        [
            Paragraph(
                "Rule",
                header_style,
            ),

            Paragraph(
                "Status",
                header_style,
            ),

            Paragraph(
                "Severity",
                header_style,
            ),

            Paragraph(
                "Evidence",
                header_style,
            ),

            Paragraph(
                "Remediation",
                header_style,
            ),
        ]
    ]

    for finding in audit.get(
        "findings",
        [],
    ):

        rule = (
            f"{finding.get('rule_id', '')}"
            f" - "
            f"{finding.get('title', '')}"
        )

        rows.append(
            [
                _cell(
                    rule,
                    cell_style,
                ),

                Paragraph(
                    _safe(
                        finding.get(
                            "status",
                            "",
                        )
                    ),
                    status_style,
                ),

                Paragraph(
                    _safe(
                        finding.get(
                            "severity",
                            "",
                        )
                    ),
                    status_style,
                ),

                _evidence_cell(
                    finding.get(
                        "evidence",
                        [],
                    ),
                    cell_style,
                ),

                _cell(
                    finding.get(
                        "remediation",
                        "",
                    ),
                    cell_style,
                ),
            ]
        )

    # ---------------------------------------------------------
    # COLUMN WIDTHS
    # ---------------------------------------------------------

    available_width = (
        page_width
        - doc.leftMargin
        - doc.rightMargin
    )

    col_widths = [
        available_width * 0.23,  # Rule
        available_width * 0.08,  # Status
        available_width * 0.09,  # Severity
        available_width * 0.25,  # Evidence
        available_width * 0.35,  # Remediation
    ]

    # ---------------------------------------------------------
    # FINDINGS TABLE
    # ---------------------------------------------------------

    findings_table = Table(
        rows,

        # Repeat header on every page.
        repeatRows=1,

        colWidths=col_widths,

        hAlign="LEFT",
    )

    findings_table.setStyle(
        TableStyle(
            [
                (
                    "GRID",
                    (0, 0),
                    (-1, -1),
                    0.35,
                    colors.grey,
                ),

                (
                    "BACKGROUND",
                    (0, 0),
                    (-1, 0),
                    colors.lightgrey,
                ),

                (
                    "VALIGN",
                    (0, 0),
                    (-1, -1),
                    "TOP",
                ),

                (
                    "LEFTPADDING",
                    (0, 0),
                    (-1, -1),
                    5,
                ),

                (
                    "RIGHTPADDING",
                    (0, 0),
                    (-1, -1),
                    5,
                ),

                (
                    "TOPPADDING",
                    (0, 0),
                    (-1, -1),
                    5,
                ),

                (
                    "BOTTOMPADDING",
                    (0, 0),
                    (-1, -1),
                    5,
                ),
            ]
        )
    )

    story.extend(
        [
            findings_table,

            Spacer(
                1,
                10,
            ),

            Paragraph(
                "AI interpretations are advisory. Final compliance "
                "status is determined by deterministic rules and "
                "administrator-approved mappings.",
                italic_style,
            ),
        ]
    )

    # ---------------------------------------------------------
    # BUILD PDF
    # ---------------------------------------------------------

    doc.build(
        story,
        onFirstPage=_footer,
        onLaterPages=_footer,
    )

    return buffer.getvalue()


def build_merged_pdf(audits: list[dict]) -> bytes:
    """
    Generate a single merged PDF covering multiple audits.
    Includes a combined summary, then per-audit sections with their findings.
    """
    from reportlab.platypus import HRFlowable, KeepTogether

    buffer = BytesIO()
    page_width, page_height = landscape(A4)

    doc = SimpleDocTemplate(
        buffer,
        pagesize=landscape(A4),
        rightMargin=18 * mm,
        leftMargin=18 * mm,
        topMargin=16 * mm,
        bottomMargin=18 * mm,
        title="NETSECURE AI - Merged Compliance Audit",
        author="NETSECURE AI",
    )

    styles = getSampleStyleSheet()

    title_style = ParagraphStyle("MTitle", parent=styles["Title"], fontName="Helvetica-Bold", fontSize=18, leading=22, alignment=TA_LEFT, spaceAfter=6)
    section_style = ParagraphStyle("MSection", parent=styles["Heading2"], fontName="Helvetica-Bold", fontSize=12, leading=15, spaceAfter=4, spaceBefore=14, textColor=colors.HexColor("#003366"))
    normal_style = ParagraphStyle("MNormal", parent=styles["Normal"], fontName="Helvetica", fontSize=9, leading=12, spaceAfter=2)
    italic_style = ParagraphStyle("MNote", parent=styles["Italic"], fontName="Helvetica-Oblique", fontSize=8.5, leading=11, textColor=colors.HexColor("#444444"))
    header_style = ParagraphStyle("MHeader", parent=styles["Normal"], fontName="Helvetica-Bold", fontSize=7.5, leading=9, alignment=TA_LEFT)
    cell_style = ParagraphStyle("MCell", parent=styles["Normal"], fontName="Helvetica", fontSize=7.0, leading=9, alignment=TA_LEFT, splitLongWords=True)
    status_style = ParagraphStyle("MStatus", parent=cell_style, alignment=TA_CENTER, fontName="Helvetica-Bold")
    source_style = ParagraphStyle("MSource", parent=cell_style, fontName="Helvetica-Oblique", fontSize=6.8, textColor=colors.HexColor("#1155aa"))

    available_width = page_width - doc.leftMargin - doc.rightMargin

    # ── Overall summary ──────────────────────────────────────────────────────────
    total_pass = sum(a.get("summary", {}).get("PASS", 0) for a in audits)
    total_fail = sum(a.get("summary", {}).get("FAIL", 0) for a in audits)
    total_review = sum(a.get("summary", {}).get("REVIEW", 0) for a in audits)
    total = total_pass + total_fail + total_review
    score_pct = round((total_pass / total) * 100) if total > 0 else 0
    vendors = ", ".join(sorted({a.get("vendor", "").upper() for a in audits}))
    files = ", ".join(a.get("filename", "") for a in audits)

    story = [
        Paragraph("NETSECURE AI — Merged Compliance Report", title_style),
        Paragraph(f"Sources ({len(audits)} files): {_safe(files)}", normal_style),
        Paragraph(f"Vendors: {_safe(vendors)}", normal_style),
        Paragraph(f"Overall Compliance Score: {score_pct}%  |  PASS: {total_pass}  FAIL: {total_fail}  REVIEW: {total_review}", normal_style),
        Spacer(1, 10),
        HRFlowable(width="100%", thickness=1, color=colors.HexColor("#003366")),
        Spacer(1, 8),
    ]

    # ── Per-audit sections ───────────────────────────────────────────────────────
    for idx, audit in enumerate(audits):
        normalized = audit.get("normalized", {})
        summary = audit.get("summary", {})
        vendor = audit.get("vendor", "unknown").upper()
        filename = audit.get("filename", "")
        hostname = normalized.get("hostname") or "N/A"
        a_pass = summary.get("PASS", 0)
        a_fail = summary.get("FAIL", 0)
        a_review = summary.get("REVIEW", 0)

        section_header = [
            Paragraph(f"[{idx + 1}] {vendor} — {_safe(filename)}", section_style),
            Paragraph(f"Hostname: {_safe(hostname)}  |  PASS: {a_pass}  FAIL: {a_fail}  REVIEW: {a_review}", normal_style),
            Spacer(1, 6),
        ]

        # Findings table for this audit
        rows = [[
            Paragraph("Rule", header_style),
            Paragraph("Status", header_style),
            Paragraph("Severity", header_style),
            Paragraph("Evidence", header_style),
            Paragraph("Remediation", header_style),
        ]]

        for finding in audit.get("findings", []):
            rule = f"{finding.get('rule_id', '')} - {finding.get('title', '')}"
            rows.append([
                _cell(rule, cell_style),
                Paragraph(_safe(finding.get("status", "")), status_style),
                Paragraph(_safe(finding.get("severity", "")), status_style),
                _evidence_cell(finding.get("evidence", []), cell_style),
                _cell(finding.get("remediation", ""), cell_style),
            ])

        col_widths = [
            available_width * 0.23,
            available_width * 0.08,
            available_width * 0.09,
            available_width * 0.25,
            available_width * 0.35,
        ]

        findings_table = Table(rows, repeatRows=1, colWidths=col_widths, hAlign="LEFT")
        findings_table.setStyle(TableStyle([
            ("GRID", (0, 0), (-1, -1), 0.35, colors.grey),
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#dce6f1")),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("LEFTPADDING", (0, 0), (-1, -1), 5),
            ("RIGHTPADDING", (0, 0), (-1, -1), 5),
            ("TOPPADDING", (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ]))

        story.extend(section_header)
        story.append(findings_table)
        story.append(Spacer(1, 6))
        if idx < len(audits) - 1:
            story.append(HRFlowable(width="100%", thickness=0.5, color=colors.lightgrey))
            story.append(Spacer(1, 4))

    story.extend([
        Spacer(1, 10),
        Paragraph(
            "AI interpretations are advisory. Final compliance status is determined by "
            "deterministic rules and administrator-approved mappings.",
            italic_style,
        ),
    ])

    doc.build(story, onFirstPage=_footer, onLaterPages=_footer)
    return buffer.getvalue()