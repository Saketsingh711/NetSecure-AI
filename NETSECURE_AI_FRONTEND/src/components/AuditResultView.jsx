import React, { useState } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, FileDown, ChevronDown, ChevronUp, Shield, Cpu, ExternalLink, Terminal } from 'lucide-react';

export default function AuditResultView({ audit, onSelectReviewTab }) {
  const [filter, setFilter] = useState('ALL');
  const [expandedRules, setExpandedRules] = useState({});

  if (!audit) return null;

  const toggleExpand = (ruleId) => {
    setExpandedRules(prev => ({ ...prev, [ruleId]: !prev[ruleId] }));
  };

  const filteredFindings = audit.findings.filter(f => {
    if (filter === 'ALL') return true;
    return f.status === filter;
  });

  const total = audit.findings.length;
  const passCount = audit.summary?.PASS || 0;
  const failCount = audit.summary?.FAIL || 0;
  const reviewCount = audit.summary?.REVIEW || 0;
  const passPercentage = total > 0 ? Math.round((passCount / total) * 100) : 0;

  const handleDownloadPDF = () => {
    window.open(`http://127.0.0.1:8000/api/audits/${audit.audit_id}/report.pdf`, '_blank');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Top Banner Card */}
      <div className="glass-panel" style={{ padding: '28px', background: 'linear-gradient(135deg, rgba(16, 24, 40, 0.9) 0%, rgba(13, 20, 36, 0.9) 100%)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
          
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <span className="badge badge-vendor" style={{ fontSize: '0.8rem', padding: '4px 12px' }}>
                <Cpu size={14} /> {audit.vendor.toUpperCase()}
              </span>
              {audit.hostname && (
                <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)', fontWeight: '600' }}>
                  Hostname: <code style={{ color: 'var(--accent-cyan)', background: 'rgba(0,0,0,0.4)', padding: '2px 8px', borderRadius: '4px' }}>{audit.hostname}</code>
                </span>
              )}
            </div>

            <h2 style={{ fontSize: '1.6rem', fontWeight: '700', color: '#fff', marginBottom: '4px' }}>
              Audit Report: {audit.filename}
            </h2>
            <p style={{ color: 'var(--text-subtle)', fontSize: '0.825rem' }}>
              Audit ID: <span style={{ fontFamily: 'monospace' }}>{audit.audit_id}</span>
            </p>
          </div>

          {/* Pass Percentage Circle Gauge & PDF Button */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{
                width: '72px', height: '72px', borderRadius: '50%',
                background: `conic-gradient(${passPercentage >= 70 ? '#10b981' : passPercentage >= 40 ? '#f59e0b' : '#f43f5e'} ${passPercentage}%, rgba(255,255,255,0.1) 0%)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 0 20px rgba(0,0,0,0.5)'
              }}>
                <div style={{ width: '58px', height: '58px', borderRadius: '50%', background: '#090d16', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: '1.1rem', fontWeight: '800', color: '#fff' }}>{passPercentage}%</span>
                  <span style={{ fontSize: '0.6rem', color: 'var(--text-subtle)', textTransform: 'uppercase' }}>Score</span>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span className="badge badge-pass" style={{ fontSize: '0.75rem' }}>
                  <CheckCircle2 size={12} /> {passCount} PASS
                </span>
                <span className="badge badge-fail" style={{ fontSize: '0.75rem' }}>
                  <XCircle size={12} /> {failCount} FAIL
                </span>
                {reviewCount > 0 && (
                  <span className="badge badge-review" style={{ fontSize: '0.75rem' }}>
                    <AlertTriangle size={12} /> {reviewCount} REVIEW
                  </span>
                )}
              </div>
            </div>

            <button onClick={handleDownloadPDF} className="btn-primary" style={{ padding: '12px 20px' }}>
              <FileDown size={18} /> Export PDF Report
            </button>
          </div>
        </div>

        {/* AI Review Banner Notification if there are pending items */}
        {audit.review_items && audit.review_items.length > 0 && (
          <div style={{
            marginTop: '20px', padding: '14px 20px', borderRadius: '12px',
            background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.15) 0%, rgba(236, 72, 153, 0.15) 100%)',
            border: '1px solid rgba(168, 85, 247, 0.4)', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ padding: '8px', borderRadius: '8px', background: 'rgba(168, 85, 247, 0.2)' }}>
                <Shield size={20} color="#d8b4fe" />
              </div>
              <div>
                <h4 style={{ fontSize: '0.95rem', fontWeight: '700', color: '#f3e8ff' }}>
                  Gemini AI detected {audit.review_items.length} unfamiliar configuration syntax line(s)
                </h4>
                <p style={{ fontSize: '0.8rem', color: '#e9d5ff' }}>
                  Review Gemini AI suggestions and approve/correct mappings to refine your compliance database.
                </p>
              </div>
            </div>

            <button
              onClick={onSelectReviewTab}
              style={{
                background: 'linear-gradient(135deg, #a855f7, #ec4899)', color: '#fff',
                border: 'none', padding: '8px 16px', borderRadius: '8px', fontWeight: '700',
                fontSize: '0.825rem', cursor: 'pointer', boxShadow: '0 4px 12px rgba(168, 85, 247, 0.3)'
              }}
            >
              Open AI Review Queue &rarr;
            </button>
          </div>
        )}
      </div>

      {/* Filter Tabs & Findings Table */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: '700' }}>Compliance Engine Rules & Findings</h3>

          <div style={{ display: 'flex', gap: '6px', background: 'rgba(0,0,0,0.3)', padding: '4px', borderRadius: '8px' }}>
            {['ALL', 'FAIL', 'PASS', 'REVIEW'].map((st) => (
              <button
                key={st}
                onClick={() => setFilter(st)}
                style={{
                  padding: '6px 14px', borderRadius: '6px', border: 'none',
                  background: filter === st ? 'rgba(255, 255, 255, 0.12)' : 'transparent',
                  color: filter === st ? '#fff' : 'var(--text-muted)',
                  fontWeight: '600', fontSize: '0.785rem', cursor: 'pointer'
                }}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {/* Findings List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filteredFindings.map((finding) => {
            const isExpanded = expandedRules[finding.rule_id];
            const isPass = finding.status === 'PASS';
            const isFail = finding.status === 'FAIL';

            return (
              <div
                key={finding.rule_id}
                style={{
                  background: 'rgba(15, 23, 42, 0.6)',
                  border: `1px solid ${isPass ? 'rgba(16, 185, 129, 0.2)' : isFail ? 'rgba(244, 63, 94, 0.25)' : 'rgba(245, 158, 11, 0.25)'}`,
                  borderRadius: '12px', overflow: 'hidden', transition: 'all 0.2s ease'
                }}
              >
                <div
                  onClick={() => toggleExpand(finding.rule_id)}
                  style={{
                    padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    cursor: 'pointer', userSelect: 'none'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    {isPass ? (
                      <CheckCircle2 size={22} color="#34d399" />
                    ) : isFail ? (
                      <XCircle size={22} color="#fb7185" />
                    ) : (
                      <AlertTriangle size={22} color="#fbbf24" />
                    )}

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: '700', fontSize: '0.95rem', color: '#fff' }}>{finding.title}</span>
                        <code style={{ fontSize: '0.725rem', color: 'var(--accent-cyan)', background: 'rgba(0,229,255,0.1)', padding: '1px 6px', borderRadius: '4px' }}>
                          {finding.rule_id}
                        </code>
                        {finding.framework.map(fw => (
                          <span key={fw} style={{ fontSize: '0.65rem', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', padding: '1px 6px', borderRadius: '4px', color: 'var(--text-muted)' }}>
                            {fw}
                          </span>
                        ))}
                      </div>

                      <div style={{ fontSize: '0.8rem', color: 'var(--text-subtle)', marginTop: '2px' }}>
                        Field: <span style={{ color: 'var(--text-muted)' }}>{finding.field}</span>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span className={`badge badge-${finding.status.toLowerCase()}`}>
                      {finding.status}
                    </span>
                    {isExpanded ? <ChevronUp size={18} color="var(--text-muted)" /> : <ChevronDown size={18} color="var(--text-muted)" />}
                  </div>
                </div>

                {/* Expanded Details & Evidence Inspector */}
                {isExpanded && (
                  <div style={{ padding: '16px 20px', background: 'rgba(0, 0, 0, 0.3)', borderTop: '1px solid rgba(255, 255, 255, 0.06)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    
                    {/* Evidence Extracted */}
                    <div>
                      <h5 style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Terminal size={14} color="var(--accent-cyan)" /> Configuration Evidence Lines
                      </h5>
                      {finding.evidence && finding.evidence.length > 0 ? (
                        <div style={{ background: '#070a11', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-color)', fontFamily: 'monospace', fontSize: '0.825rem', color: '#38bdf8' }}>
                          {finding.evidence.map((ev, i) => (
                            <div key={i}>&gt; {ev}</div>
                          ))}
                        </div>
                      ) : (
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-subtle)', italic: 'true' }}>No matching evidence line found in configuration (default disabled state).</p>
                      )}
                    </div>

                    {/* Remediation Guidance */}
                    <div style={{ background: 'rgba(245, 158, 11, 0.08)', padding: '10px 14px', borderRadius: '8px', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
                      <h5 style={{ fontSize: '0.8rem', color: '#fbbf24', fontWeight: '700', marginBottom: '2px' }}>Remediation Recommendation</h5>
                      <p style={{ fontSize: '0.825rem', color: '#fef3c7' }}>{finding.remediation}</p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
