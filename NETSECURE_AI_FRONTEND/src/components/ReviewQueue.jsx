import React, { useState, useEffect } from 'react';
import { Sparkles, CheckCircle2, AlertCircle, ArrowRight, Save, ShieldAlert, Cpu, Trash2, RefreshCw } from 'lucide-react';

const ALLOWED_FIELDS = [
  "management.telnet_enabled",
  "management.ssh_enabled",
  "management.http_enabled",
  "management.https_enabled",
  "authentication.aaa_enabled",
  "logging.enabled",
  "ntp.enabled",
  "network_security.snmp_v2_community",
  "management.management_acl",
];

export default function ReviewQueue({ onReviewProcessed }) {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFields, setSelectedFields] = useState({});
  const [actionSuccess, setActionSuccess] = useState(null);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const res = await fetch('http://127.0.0.1:8000/api/reviews');
      if (!res.ok) return;
      const data = await res.json();
      setReviews(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, []);

  const handleDecision = async (reviewId, action, chosenField) => {
    try {
      const payload = {
        action: action,
        corrected_field: chosenField || null,
        corrected_value: chosenField ? true : null
      };

      const res = await fetch(`http://127.0.0.1:8000/api/reviews/${reviewId}/decision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        throw new Error('Failed to save decision');
      }

      setActionSuccess(`Review ${reviewId.slice(0, 8)} successfully updated and saved to Learned Mappings in PostgreSQL!`);
      setTimeout(() => setActionSuccess(null), 4000);
      
      fetchReviews();
      if (onReviewProcessed) onReviewProcessed();
    } catch (err) {
      alert(err.message);
    }
  };

  const deleteSingleReview = async (reviewId) => {
    if (!window.confirm('Delete this review item from PostgreSQL?')) return;
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/reviews/${reviewId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setActionSuccess(`Review item deleted.`);
        setTimeout(() => setActionSuccess(null), 3000);
        fetchReviews();
        if (onReviewProcessed) onReviewProcessed();
      }
    } catch (e) {
      alert(e.message);
    }
  };

  const clearAllReviews = async () => {
    if (!window.confirm('Are you sure you want to clear ALL review history from PostgreSQL?')) return;
    try {
      const res = await fetch('http://127.0.0.1:8000/api/reviews', {
        method: 'DELETE',
      });
      if (res.ok) {
        setActionSuccess('All review queue history cleared from PostgreSQL.');
        setTimeout(() => setActionSuccess(null), 3000);
        fetchReviews();
        if (onReviewProcessed) onReviewProcessed();
      }
    } catch (e) {
      alert(e.message);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Banner Card */}
      <div className="glass-panel" style={{ padding: '28px', background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.12) 0%, rgba(236, 72, 153, 0.12) 100%)', border: '1px solid rgba(168, 85, 247, 0.3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ padding: '12px', borderRadius: '12px', background: 'linear-gradient(135deg, #a855f7 0%, #ec4899 100%)', boxShadow: '0 0 20px rgba(168, 85, 247, 0.4)' }}>
            <Sparkles size={28} color="#fff" />
          </div>
          <div>
            <h2 className="gradient-text-ai" style={{ fontSize: '1.6rem', fontWeight: '800' }}>
              Gemini AI Unfamiliar Syntax & Human Review Queue
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '2px' }}>
              Review Gemini AI interpretations for unfamiliar vendor syntax. Your approvals and corrections are saved to PostgreSQL <code style={{ color: 'var(--accent-cyan)' }}>learned_mappings</code> for future reuse.
            </p>
          </div>
        </div>
      </div>

      {actionSuccess && (
        <div style={{ padding: '12px 16px', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '10px', color: '#34d399', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CheckCircle2 size={18} /> {actionSuccess}
        </div>
      )}

      {/* Reviews List */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: '700' }}>Unfamiliar CLI Syntax Queue</h3>
          
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={fetchReviews} className="btn-secondary" style={{ fontSize: '0.8rem', padding: '6px 12px' }}>
              <RefreshCw size={14} /> Refresh Queue
            </button>
            {reviews.length > 0 && (
              <button onClick={clearAllReviews} className="btn-secondary" style={{ fontSize: '0.8rem', padding: '6px 12px', borderColor: 'rgba(244,63,94,0.4)', color: '#fb7185' }}>
                <Trash2 size={14} /> Clear Review Queue
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <p style={{ color: 'var(--text-subtle)', fontSize: '0.875rem' }}>Loading review queue...</p>
        ) : reviews.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', background: 'rgba(0,0,0,0.2)', borderRadius: '12px', border: '1px dashed var(--border-color)' }}>
            <CheckCircle2 size={36} color="#34d399" style={{ margin: '0 auto 12px auto' }} />
            <h4 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '4px' }}>Queue is Empty!</h4>
            <p style={{ color: 'var(--text-subtle)', fontSize: '0.85rem' }}>
              No pending unfamiliar syntax items require review right now.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {reviews.map((item) => {
              const isPending = item.status === 'PENDING';
              const currentChosenField = selectedFields[item.review_id] || (item.suggested_field !== 'unknown' ? item.suggested_field : ALLOWED_FIELDS[1]);

              return (
                <div
                  key={item.review_id}
                  style={{
                    background: 'rgba(15, 23, 42, 0.7)',
                    border: isPending ? '1px solid rgba(168, 85, 247, 0.35)' : '1px solid var(--border-color)',
                    borderRadius: '14px', padding: '20px', transition: 'all 0.2s ease'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span className="badge badge-vendor" style={{ textTransform: 'uppercase' }}>
                        <Cpu size={12} /> {item.vendor}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-subtle)', fontFamily: 'monospace' }}>
                        ID: {item.review_id.slice(0, 8)}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span className={`badge badge-${isPending ? 'review' : 'pass'}`}>
                        {item.status}
                      </span>
                      <button
                        onClick={() => deleteSingleReview(item.review_id)}
                        title="Delete from PostgreSQL"
                        style={{ background: 'transparent', border: 'none', color: '#fb7185', cursor: 'pointer', padding: '2px' }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  {/* Unfamiliar Syntax Line */}
                  <div style={{ marginBottom: '14px' }}>
                    <label style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: '700', letterSpacing: '0.05em' }}>
                      Unfamiliar CLI Line
                    </label>
                    <div style={{ background: '#070a11', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-color)', fontFamily: 'monospace', fontSize: '0.9rem', color: '#f43f5e', marginTop: '4px' }}>
                      &gt; {item.raw_line}
                    </div>
                  </div>

                  {/* Gemini AI Card */}
                  <div style={{ background: 'rgba(168, 85, 247, 0.08)', padding: '14px', borderRadius: '10px', border: '1px solid rgba(168, 85, 247, 0.2)', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#d8b4fe', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Sparkles size={14} /> Gemini AI Suggested Field: <code style={{ color: '#fff', background: 'rgba(0,0,0,0.4)', padding: '2px 6px', borderRadius: '4px' }}>{item.suggested_field}</code>
                      </span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        Confidence: {(item.confidence * 100).toFixed(0)}%
                      </span>
                    </div>

                    <p style={{ fontSize: '0.825rem', color: '#e9d5ff' }}>
                      {item.explanation || 'No detailed explanation generated.'}
                    </p>
                  </div>

                  {/* Human Action Selector */}
                  {isPending && (
                    <div style={{ paddingTop: '14px', borderTop: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <label style={{ fontSize: '0.825rem', fontWeight: '600', color: 'var(--text-main)' }}>Map to Security Field:</label>
                        <select
                          value={currentChosenField}
                          onChange={(e) => setSelectedFields({ ...selectedFields, [item.review_id]: e.target.value })}
                          style={{
                            background: '#090d16', color: 'var(--accent-cyan)', border: '1px solid var(--border-glow)',
                            padding: '6px 12px', borderRadius: '8px', fontSize: '0.825rem', fontWeight: '600', outline: 'none'
                          }}
                        >
                          {ALLOWED_FIELDS.map(f => (
                            <option key={f} value={f}>{f}</option>
                          ))}
                        </select>
                      </div>

                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={() => handleDecision(item.review_id, 'correct', currentChosenField)}
                          className="btn-primary"
                          style={{ fontSize: '0.8rem', padding: '7px 14px' }}
                        >
                          <Save size={14} /> Approve & Save Mapping
                        </button>

                        <button
                          onClick={() => handleDecision(item.review_id, 'reject', null)}
                          className="btn-secondary"
                          style={{ fontSize: '0.8rem', padding: '7px 14px', borderColor: 'rgba(244,63,94,0.4)', color: '#fb7185' }}
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  )}

                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
