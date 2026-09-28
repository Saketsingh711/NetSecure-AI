import React, { useState } from 'react';
import {
  CheckCircle2, XCircle, AlertTriangle, FileDown, ChevronDown, ChevronUp,
  Shield, Cpu, Terminal, Layers, FileText, GitMerge, LayoutGrid
} from 'lucide-react';

/* ─────────────────────────────────────────
   Small helper: score ring
───────────────────────────────────────── */
function ScoreRing({ pct, size = 72, inner = 58 }) {
  const color = pct >= 70 ? '#10b981' : pct >= 40 ? '#f59e0b' : '#f43f5e';
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: `conic-gradient(${color} ${pct}%, rgba(255,255,255,0.08) 0%)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      boxShadow: '0 0 20px rgba(0,0,0,0.5)'
    }}>
      <div style={{
        width: inner, height: inner, borderRadius: '50%', background: '#090d16',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
      }}>
        <span style={{ fontSize: inner > 48 ? '1.1rem' : '0.85rem', fontWeight: '800', color: '#fff' }}>{pct}%</span>
        <span style={{ fontSize: '0.55rem', color: 'var(--text-subtle)', textTransform: 'uppercase' }}>Score</span>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   Finding row (shared between views)
───────────────────────────────────────── */
function FindingRow({ finding, sourceLabel, sourceColor }) {
  const [open, setOpen] = useState(false);
  const isPass = finding.status === 'PASS';
  const isFail = finding.status === 'FAIL';

  return (
    <div style={{
      background: 'rgba(15, 23, 42, 0.6)',
      border: `1px solid ${isPass ? 'rgba(16,185,129,0.2)' : isFail ? 'rgba(244,63,94,0.25)' : 'rgba(245,158,11,0.25)'}`,
      borderRadius: '12px', overflow: 'hidden', transition: 'all 0.2s ease'
    }}>
      <div onClick={() => setOpen(p => !p)} style={{
        padding: '14px 18px', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', cursor: 'pointer', userSelect: 'none'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {isPass ? <CheckCircle2 size={20} color="#34d399" /> : isFail ? <XCircle size={20} color="#fb7185" /> : <AlertTriangle size={20} color="#fbbf24" />}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontWeight: '700', fontSize: '0.9rem', color: '#fff' }}>{finding.title}</span>
              <code style={{ fontSize: '0.7rem', color: 'var(--accent-cyan)', background: 'rgba(0,229,255,0.1)', padding: '1px 6px', borderRadius: '4px' }}>
                {finding.rule_id}
              </code>
              {sourceLabel && (
                <span style={{ fontSize: '0.65rem', padding: '2px 8px', borderRadius: '4px', background: `${sourceColor}22`, border: `1px solid ${sourceColor}55`, color: sourceColor, fontWeight: '700' }}>
                  {sourceLabel}
                </span>
              )}
              {(finding.framework || []).map(fw => (
                <span key={fw} style={{ fontSize: '0.62rem', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', padding: '1px 6px', borderRadius: '4px', color: 'var(--text-muted)' }}>{fw}</span>
              ))}
            </div>
            <div style={{ fontSize: '0.77rem', color: 'var(--text-subtle)', marginTop: '2px' }}>
              Field: <span style={{ color: 'var(--text-muted)' }}>{finding.field}</span>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span className={`badge badge-${finding.status.toLowerCase()}`}>{finding.status}</span>
          {open ? <ChevronUp size={16} color="var(--text-muted)" /> : <ChevronDown size={16} color="var(--text-muted)" />}
        </div>
      </div>

      {open && (
        <div style={{ padding: '14px 18px', background: 'rgba(0,0,0,0.3)', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div>
            <h5 style={{ fontSize: '0.77rem', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Terminal size={13} color="var(--accent-cyan)" /> Configuration Evidence Lines
            </h5>
            {finding.evidence && finding.evidence.length > 0 ? (
              <div style={{ background: '#070a11', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-color)', fontFamily: 'monospace', fontSize: '0.8rem', color: '#38bdf8' }}>
                {finding.evidence.map((ev, i) => <div key={i}>&gt; {ev}</div>)}
              </div>
            ) : (
              <p style={{ fontSize: '0.78rem', color: 'var(--text-subtle)' }}>No matching evidence line found (default disabled state).</p>
            )}
          </div>
          <div style={{ background: 'rgba(245,158,11,0.08)', padding: '10px 14px', borderRadius: '8px', border: '1px solid rgba(245,158,11,0.2)' }}>
            <h5 style={{ fontSize: '0.77rem', color: '#fbbf24', fontWeight: '700', marginBottom: '2px' }}>Remediation Recommendation</h5>
            <p style={{ fontSize: '0.8rem', color: '#fef3c7' }}>{finding.remediation}</p>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────
   Vendor colour palette (deterministic by index)
───────────────────────────────────────── */
const PALETTE = ['#00e5ff', '#a855f7', '#f59e0b', '#10b981', '#f43f5e', '#3b82f6', '#ec4899', '#14b8a6', '#fb923c', '#84cc16'];

/* ─────────────────────────────────────────
   MERGED VIEW
───────────────────────────────────────── */
function MergedView({ audits }) {
  const [filter, setFilter] = useState('ALL');
  const [pdfLoading, setPdfLoading] = useState(false);

  const handleDownloadMergedPDF = async () => {
    setPdfLoading(true);
    try {
      const res = await fetch('http://127.0.0.1:8000/api/audits/merged-report.pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audit_ids: audits.map(a => a.audit_id) }),
      });
      if (!res.ok) throw new Error('Failed to generate merged PDF');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `netsecure_merged_${audits.length}_audits.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(err.message);
    } finally {
      setPdfLoading(false);
    }
  };

  const allFindings = audits.flatMap((a, idx) =>
    a.findings.map(f => ({ ...f, _source: a.filename, _vendor: a.vendor, _color: PALETTE[idx % PALETTE.length] }))
  );
  const filtered = allFindings.filter(f => filter === 'ALL' || f.status === filter);
  const totalPass = allFindings.filter(f => f.status === 'PASS').length;
  const totalFail = allFindings.filter(f => f.status === 'FAIL').length;
  const totalReview = allFindings.filter(f => f.status === 'REVIEW').length;
  const total = allFindings.length;
  const pct = total > 0 ? Math.round((totalPass / total) * 100) : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div className="glass-panel" style={{ padding: '24px', background: 'linear-gradient(135deg, rgba(16,24,40,0.9) 0%, rgba(13,20,36,0.9) 100%)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <GitMerge size={18} color="var(--accent-cyan)" />
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Merged Audit — {audits.length} Sources
              </span>
            </div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#fff', marginBottom: '6px' }}>Combined Compliance Report</h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
              {audits.map((a, idx) => (
                <span key={a.audit_id} style={{
                  fontSize: '0.72rem', padding: '3px 10px', borderRadius: '20px',
                  background: `${PALETTE[idx % PALETTE.length]}18`,
                  border: `1px solid ${PALETTE[idx % PALETTE.length]}55`,
                  color: PALETTE[idx % PALETTE.length], fontWeight: '600', display: 'inline-flex', alignItems: 'center', gap: '4px'
                }}>
                  <Cpu size={10} />{a.vendor.toUpperCase()} · {a.filename}
                </span>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <ScoreRing pct={pct} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span className="badge badge-pass" style={{ fontSize: '0.75rem' }}><CheckCircle2 size={12} /> {totalPass} PASS</span>
              <span className="badge badge-fail" style={{ fontSize: '0.75rem' }}><XCircle size={12} /> {totalFail} FAIL</span>
              {totalReview > 0 && <span className="badge badge-review" style={{ fontSize: '0.75rem' }}><AlertTriangle size={12} /> {totalReview} REVIEW</span>}
            </div>
            <button
              onClick={handleDownloadMergedPDF}
              disabled={pdfLoading}
              className="btn-primary"
              style={{ padding: '10px 18px', opacity: pdfLoading ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <FileDown size={16} />
              {pdfLoading ? 'Generating...' : 'Export Merged PDF'}
            </button>
          </div>
        </div>
      </div>

      <div className="glass-panel" style={{ padding: '22px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px', flexWrap: 'wrap', gap: '12px' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: '700' }}>All Findings ({total})</h3>
          <div style={{ display: 'flex', gap: '6px', background: 'rgba(0,0,0,0.3)', padding: '4px', borderRadius: '8px' }}>
            {['ALL', 'FAIL', 'PASS', 'REVIEW'].map(st => (
              <button key={st} onClick={() => setFilter(st)} style={{
                padding: '6px 14px', borderRadius: '6px', border: 'none',
                background: filter === st ? 'rgba(255,255,255,0.12)' : 'transparent',
                color: filter === st ? '#fff' : 'var(--text-muted)',
                fontWeight: '600', fontSize: '0.78rem', cursor: 'pointer'
              }}>{st}</button>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {filtered.map((f, i) => (
            <FindingRow key={`${f._source}-${f.rule_id}-${i}`} finding={f} sourceLabel={`${f._vendor.toUpperCase()} · ${f._source}`} sourceColor={f._color} />
          ))}
          {filtered.length === 0 && (
            <p style={{ color: 'var(--text-subtle)', textAlign: 'center', padding: '24px' }}>No findings match the selected filter.</p>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   INDIVIDUAL VIEW (one tab per file)
───────────────────────────────────────── */
function IndividualView({ audits, onSelectReviewTab }) {
  const [activeIdx, setActiveIdx] = useState(0);
  const [filter, setFilter] = useState('ALL');

  const audit = audits[activeIdx];
  if (!audit) return null;

  const passCount = audit.summary?.PASS || 0;
  const failCount = audit.summary?.FAIL || 0;
  const reviewCount = audit.summary?.REVIEW || 0;
  const total = audit.findings.length;
  const pct = total > 0 ? Math.round((passCount / total) * 100) : 0;
  const filtered = audit.findings.filter(f => filter === 'ALL' || f.status === filter);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* File selector tabs */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {audits.map((a, idx) => {
          const c = PALETTE[idx % PALETTE.length];
          const isActive = idx === activeIdx;
          return (
            <button key={a.audit_id} onClick={() => { setActiveIdx(idx); setFilter('ALL'); }} style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '8px 16px', borderRadius: '10px', border: `1px solid ${isActive ? c : 'rgba(255,255,255,0.08)'}`,
              background: isActive ? `${c}18` : 'rgba(0,0,0,0.25)',
              color: isActive ? c : 'var(--text-muted)', fontWeight: '700', fontSize: '0.8rem',
              cursor: 'pointer', transition: 'all 0.2s ease'
            }}>
              <FileText size={14} />
              {a.filename}
              <span style={{ fontSize: '0.65rem', padding: '1px 6px', borderRadius: '4px', background: `${c}22`, color: c }}>
                {a.vendor.toUpperCase()}
              </span>
            </button>
          );
        })}
      </div>

      {/* Active audit banner */}
      <div className="glass-panel" style={{ padding: '24px', background: 'linear-gradient(135deg, rgba(16,24,40,0.9) 0%, rgba(13,20,36,0.9) 100%)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <span className="badge badge-vendor" style={{ fontSize: '0.8rem', padding: '4px 12px' }}>
                <Cpu size={14} /> {audit.vendor.toUpperCase()}
              </span>
              {audit.hostname && (
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: '600' }}>
                  Hostname: <code style={{ color: 'var(--accent-cyan)', background: 'rgba(0,0,0,0.4)', padding: '2px 8px', borderRadius: '4px' }}>{audit.hostname}</code>
                </span>
              )}
            </div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#fff', marginBottom: '4px' }}>Audit Report: {audit.filename}</h2>
            <p style={{ color: 'var(--text-subtle)', fontSize: '0.8rem' }}>
              Audit ID: <span style={{ fontFamily: 'monospace' }}>{audit.audit_id}</span>
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <ScoreRing pct={pct} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span className="badge badge-pass" style={{ fontSize: '0.75rem' }}><CheckCircle2 size={12} /> {passCount} PASS</span>
              <span className="badge badge-fail" style={{ fontSize: '0.75rem' }}><XCircle size={12} /> {failCount} FAIL</span>
              {reviewCount > 0 && <span className="badge badge-review" style={{ fontSize: '0.75rem' }}><AlertTriangle size={12} /> {reviewCount} REVIEW</span>}
            </div>
            <button onClick={() => window.open(`http://127.0.0.1:8000/api/audits/${audit.audit_id}/report.pdf`, '_blank')} className="btn-primary" style={{ padding: '10px 18px' }}>
              <FileDown size={16} /> Export PDF
            </button>
          </div>
        </div>
        {audit.review_items && audit.review_items.length > 0 && (
          <div style={{ marginTop: '18px', padding: '12px 18px', borderRadius: '12px', background: 'linear-gradient(135deg, rgba(168,85,247,0.15) 0%, rgba(236,72,153,0.15) 100%)', border: '1px solid rgba(168,85,247,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Shield size={18} color="#d8b4fe" />
              <span style={{ fontSize: '0.88rem', fontWeight: '700', color: '#f3e8ff' }}>
                Gemini AI detected {audit.review_items.length} unfamiliar syntax line(s)
              </span>
            </div>
            <button onClick={onSelectReviewTab} style={{ background: 'linear-gradient(135deg, #a855f7, #ec4899)', color: '#fff', border: 'none', padding: '7px 14px', borderRadius: '8px', fontWeight: '700', fontSize: '0.8rem', cursor: 'pointer' }}>
              Open AI Review Queue →
            </button>
          </div>
        )}
      </div>

      {/* Findings */}
      <div className="glass-panel" style={{ padding: '22px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px', flexWrap: 'wrap', gap: '12px' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: '700' }}>Compliance Findings ({audit.findings.length})</h3>
          <div style={{ display: 'flex', gap: '6px', background: 'rgba(0,0,0,0.3)', padding: '4px', borderRadius: '8px' }}>
            {['ALL', 'FAIL', 'PASS', 'REVIEW'].map(st => (
              <button key={st} onClick={() => setFilter(st)} style={{
                padding: '6px 14px', borderRadius: '6px', border: 'none',
                background: filter === st ? 'rgba(255,255,255,0.12)' : 'transparent',
                color: filter === st ? '#fff' : 'var(--text-muted)',
                fontWeight: '600', fontSize: '0.78rem', cursor: 'pointer'
              }}>{st}</button>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {filtered.map((f, i) => <FindingRow key={`${f.rule_id}-${i}`} finding={f} />)}
          {filtered.length === 0 && (
            <p style={{ color: 'var(--text-subtle)', textAlign: 'center', padding: '24px' }}>No findings match the selected filter.</p>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   ROOT EXPORT
───────────────────────────────────────── */
export default function MultiAuditView({ audits, onSelectReviewTab }) {
  const [viewMode, setViewMode] = useState('individual');

  if (!audits || audits.length === 0) return null;

  // Single audit — skip the switcher
  if (audits.length === 1) {
    return <IndividualView audits={audits} onSelectReviewTab={onSelectReviewTab} />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* View mode switcher header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Layers size={18} color="var(--accent-cyan)" />
          <span style={{ fontWeight: '700', fontSize: '1rem', color: '#fff' }}>
            {audits.length} Configuration Files Audited
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            — {audits.map(a => a.vendor.toUpperCase()).join(', ')}
          </span>
        </div>

        <div style={{ display: 'flex', background: 'rgba(0,0,0,0.35)', padding: '4px', borderRadius: '10px', gap: '4px' }}>
          <button onClick={() => setViewMode('merged')} style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '8px 18px', borderRadius: '8px', border: 'none',
            background: viewMode === 'merged' ? 'rgba(0,229,255,0.18)' : 'transparent',
            color: viewMode === 'merged' ? 'var(--accent-cyan)' : 'var(--text-muted)',
            fontWeight: '700', fontSize: '0.82rem', cursor: 'pointer', transition: 'all 0.2s'
          }}>
            <GitMerge size={15} /> Merged View
          </button>
          <button onClick={() => setViewMode('individual')} style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '8px 18px', borderRadius: '8px', border: 'none',
            background: viewMode === 'individual' ? 'rgba(0,229,255,0.18)' : 'transparent',
            color: viewMode === 'individual' ? 'var(--accent-cyan)' : 'var(--text-muted)',
            fontWeight: '700', fontSize: '0.82rem', cursor: 'pointer', transition: 'all 0.2s'
          }}>
            <LayoutGrid size={15} /> Individual View
          </button>
        </div>
      </div>

      {viewMode === 'merged'
        ? <MergedView audits={audits} />
        : <IndividualView audits={audits} onSelectReviewTab={onSelectReviewTab} />
      }
    </div>
  );
}
