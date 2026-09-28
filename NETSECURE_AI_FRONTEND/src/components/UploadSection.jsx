import React, { useState, useEffect, useRef } from 'react';
import { UploadCloud, FileText, AlertCircle, X, Plus, Send, CheckCircle2, Loader2 } from 'lucide-react';

const VENDOR_COLORS = {
  cisco: '#3b82f6',
  fortinet: '#f59e0b',
  juniper: '#10b981',
  unknown: '#9ca3af',
};

function detectVendorFromFilename(name) {
  const lower = name.toLowerCase();
  if (lower.endsWith('.cfg') || lower.includes('cisco')) return 'cisco';
  if (lower.endsWith('.conf') || lower.includes('fortinet') || lower.includes('forti')) return 'fortinet';
  if (lower.endsWith('.set') || lower.includes('juniper')) return 'juniper';
  return 'unknown';
}

export default function UploadSection({ onUploadSuccess, isAuditing, setIsAuditing }) {
  const [dragActive, setDragActive] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [pastAudits, setPastAudits] = useState([]);
  const [queue, setQueue] = useState([]); // Array of { id, file, vendor, status: 'pending'|'done'|'error', error }
  const fileInputRef = useRef(null);

  const fetchPastAudits = async () => {
    try {
      const res = await fetch('http://127.0.0.1:8000/api/audits');
      if (res.ok) setPastAudits(await res.json());
    } catch (e) { console.error(e); }
  };

  useEffect(() => { fetchPastAudits(); }, [isAuditing]);

  const addFilesToQueue = (files) => {
    const newItems = Array.from(files).map(f => ({
      id: `${f.name}-${Date.now()}-${Math.random()}`,
      file: f,
      vendor: detectVendorFromFilename(f.name),
      status: 'pending',
      error: null,
    }));
    setQueue(prev => [...prev, ...newItems]);
    setErrorMsg(null);
  };

  const removeFromQueue = (id) => setQueue(prev => prev.filter(q => q.id !== id));

  const clearQueue = () => setQueue([]);

  const handleSubmitAll = async () => {
    const pending = queue.filter(q => q.status === 'pending');
    if (pending.length === 0) return;

    setIsAuditing(true);
    setErrorMsg(null);

    if (pending.length === 1) {
      // Single file — use original endpoint
      const item = pending[0];
      setQueue(prev => prev.map(q => q.id === item.id ? { ...q, status: 'loading' } : q));
      const formData = new FormData();
      formData.append('file', item.file);
      try {
        const res = await fetch('http://127.0.0.1:8000/api/configurations/upload', { method: 'POST', body: formData });
        if (!res.ok) { const e = await res.json(); throw new Error(e.detail || 'Upload failed'); }
        const result = await res.json();
        setQueue(prev => prev.map(q => q.id === item.id ? { ...q, status: 'done' } : q));
        onUploadSuccess([result]);
      } catch (err) {
        setQueue(prev => prev.map(q => q.id === item.id ? { ...q, status: 'error', error: err.message } : q));
        setErrorMsg(err.message);
      } finally {
        setIsAuditing(false);
        fetchPastAudits();
      }
    } else {
      // Multiple files — use batch endpoint
      setQueue(prev => prev.map(q => q.status === 'pending' ? { ...q, status: 'loading' } : q));
      const formData = new FormData();
      pending.forEach(item => formData.append('files', item.file));
      try {
        const res = await fetch('http://127.0.0.1:8000/api/configurations/upload-batch', { method: 'POST', body: formData });
        if (!res.ok) { const e = await res.json(); throw new Error(e.detail || 'Batch upload failed'); }
        const batch = await res.json();

        // Mark statuses
        const resultNames = new Set(batch.results.map(r => r.filename));
        const errorNames = {};
        batch.errors.forEach(e => { errorNames[e.filename] = e.error; });

        setQueue(prev => prev.map(q => {
          if (q.status !== 'loading') return q;
          if (resultNames.has(q.file.name)) return { ...q, status: 'done' };
          if (errorNames[q.file.name]) return { ...q, status: 'error', error: errorNames[q.file.name] };
          return q;
        }));

        if (batch.errors.length > 0 && batch.results.length === 0) {
          setErrorMsg(`All ${batch.errors.length} file(s) failed to process.`);
        } else if (batch.errors.length > 0) {
          setErrorMsg(`${batch.errors.length} file(s) had errors; ${batch.results.length} succeeded.`);
        }

        if (batch.results.length > 0) {
          onUploadSuccess(batch.results);
        }
      } catch (err) {
        setQueue(prev => prev.map(q => q.status === 'loading' ? { ...q, status: 'error', error: err.message } : q));
        setErrorMsg(err.message);
      } finally {
        setIsAuditing(false);
        fetchPastAudits();
      }
    }
  };

  const loadPastAudit = async (auditId) => {
    try {
      setIsAuditing(true);
      const res = await fetch(`http://127.0.0.1:8000/api/audits/${auditId}`);
      if (!res.ok) throw new Error('Failed to fetch audit details');
      const data = await res.json();
      onUploadSuccess([data]);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setIsAuditing(false);
    }
  };

  const vendorColor = (v) => VENDOR_COLORS[v] || VENDOR_COLORS.unknown;

  return (
    <div className="glass-panel" style={{ padding: '32px', marginBottom: '32px' }}>
      <div style={{ textAlign: 'center', maxWidth: '600px', margin: '0 auto 24px auto' }}>
        <h2 style={{ fontSize: '1.75rem', fontWeight: '700', marginBottom: '8px' }}>
          Upload Vendor Configuration Files
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          Upload <span style={{ color: 'var(--accent-cyan)', fontWeight: '600' }}>Cisco (.cfg)</span>,{' '}
          <span style={{ color: 'var(--accent-cyan)', fontWeight: '600' }}>Fortinet (.conf)</span>, or{' '}
          <span style={{ color: 'var(--accent-cyan)', fontWeight: '600' }}>Juniper (.set)</span> configuration files.
          You can upload <strong style={{ color: '#fff' }}>multiple files from different vendors</strong> at once.
        </p>
      </div>

      {/* Drag and Drop Zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
        onDragLeave={() => setDragActive(false)}
        onDrop={(e) => { e.preventDefault(); setDragActive(false); if (e.dataTransfer.files?.length) addFilesToQueue(e.dataTransfer.files); }}
        onClick={() => fileInputRef.current?.click()}
        style={{
          border: `2px dashed ${dragActive ? 'var(--accent-cyan)' : queue.length > 0 ? 'rgba(0,229,255,0.3)' : 'rgba(255, 255, 255, 0.15)'}`,
          background: dragActive ? 'rgba(0, 229, 255, 0.05)' : 'rgba(0, 0, 0, 0.25)',
          borderRadius: '16px', padding: '32px 24px', textAlign: 'center',
          transition: 'all 0.3s ease', cursor: 'pointer', position: 'relative'
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".cfg,.conf,.set,.txt,.log"
          onChange={(e) => { if (e.target.files?.length) { addFilesToQueue(e.target.files); e.target.value = ''; } }}
          style={{ display: 'none' }}
        />
        <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(0, 229, 255, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px auto', border: '1px solid rgba(0, 229, 255, 0.3)' }}>
          {queue.length > 0 ? <Plus size={28} color="var(--accent-cyan)" /> : <UploadCloud size={28} color="var(--accent-cyan)" />}
        </div>
        <h4 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '4px' }}>
          {queue.length > 0 ? 'Click or drop to add more files' : 'Drop configuration files here, or click to browse'}
        </h4>
        <p style={{ color: 'var(--text-subtle)', fontSize: '0.8rem' }}>
          Supports .set, .cfg, .conf, .txt · Up to 10 files · 5 MB each
        </p>
      </div>

      {/* File Queue */}
      {queue.length > 0 && (
        <div style={{ marginTop: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-subtle)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Upload Queue ({queue.length} file{queue.length > 1 ? 's' : ''})
            </span>
            <button onClick={(e) => { e.stopPropagation(); clearQueue(); }} style={{ fontSize: '0.75rem', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 8px' }}>
              Clear all
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {queue.map((item) => {
              const vc = vendorColor(item.vendor);
              return (
                <div key={item.id} style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  background: 'rgba(0,0,0,0.3)', border: `1px solid ${item.status === 'error' ? 'rgba(244,63,94,0.3)' : item.status === 'done' ? 'rgba(16,185,129,0.25)' : `${vc}30`}`,
                  borderRadius: '10px', padding: '10px 14px',
                  transition: 'all 0.25s ease'
                }}>
                  <FileText size={18} color={vc} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.84rem', fontWeight: '700', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.file.name}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-subtle)' }}>
                      <span style={{ color: vc, fontWeight: '600' }}>{item.vendor.toUpperCase()}</span>
                      {' · '}{(item.file.size / 1024).toFixed(1)} KB
                      {item.error && <span style={{ color: '#fb7185', marginLeft: '6px' }}>— {item.error}</span>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {item.status === 'loading' && <Loader2 size={16} color="var(--accent-cyan)" style={{ animation: 'spin 1s linear infinite' }} />}
                    {item.status === 'done' && <CheckCircle2 size={16} color="#34d399" />}
                    {item.status === 'error' && <AlertCircle size={16} color="#fb7185" />}
                    {item.status === 'pending' && (
                      <button onClick={(e) => { e.stopPropagation(); removeFromQueue(item.id); }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', color: 'var(--text-subtle)', display: 'flex', alignItems: 'center' }}>
                        <X size={15} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Submit button */}
          {queue.some(q => q.status === 'pending') && (
            <button
              onClick={handleSubmitAll}
              disabled={isAuditing}
              className="btn-primary"
              style={{ marginTop: '16px', width: '100%', padding: '13px', fontSize: '0.95rem', justifyContent: 'center', opacity: isAuditing ? 0.7 : 1 }}
            >
              {isAuditing ? (
                <><Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> Analyzing {queue.filter(q => q.status === 'pending').length} file{queue.filter(q => q.status === 'pending').length > 1 ? 's' : ''}...</>
              ) : (
                <><Send size={18} /> Analyze {queue.filter(q => q.status === 'pending').length} File{queue.filter(q => q.status === 'pending').length > 1 ? 's' : ''}</>
              )}
            </button>
          )}
        </div>
      )}

      {errorMsg && (
        <div style={{ marginTop: '16px', padding: '12px 16px', background: 'rgba(244, 63, 94, 0.15)', border: '1px solid rgba(244, 63, 94, 0.3)', borderRadius: '10px', color: '#fb7185', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertCircle size={18} /> {errorMsg}
        </div>
      )}

      {/* Past Audits History */}
      {pastAudits.length > 0 && (
        <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px dashed var(--border-color)' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-subtle)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>
            Past Audits History (Saved in PostgreSQL Database)
          </div>
          <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '6px' }}>
            {pastAudits.map((a) => (
              <div
                key={a.audit_id}
                onClick={() => loadPastAudit(a.audit_id)}
                style={{
                  background: 'rgba(0, 0, 0, 0.3)', border: '1px solid var(--border-color)',
                  borderRadius: '10px', padding: '10px 14px', cursor: 'pointer', flexShrink: 0,
                  transition: 'all 0.2s ease', display: 'flex', alignItems: 'center', gap: '10px'
                }}
              >
                <FileText size={18} color="var(--accent-cyan)" />
                <div>
                  <div style={{ fontSize: '0.825rem', fontWeight: '700', color: '#fff' }}>{a.filename}</div>
                  <div style={{ fontSize: '0.725rem', color: 'var(--text-subtle)' }}>
                    Vendor: {a.vendor.toUpperCase()} &bull; Pass: {a.summary?.PASS || 0} / Fail: {a.summary?.FAIL || 0}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

