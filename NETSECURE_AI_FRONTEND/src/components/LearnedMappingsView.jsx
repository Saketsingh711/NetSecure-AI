import React, { useState, useEffect } from 'react';
import { Database, CheckCircle2, Cpu, RefreshCw, Trash2, AlertTriangle } from 'lucide-react';

export default function LearnedMappingsView() {
  const [mappings, setMappings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState(null);

  const fetchMappings = async () => {
    try {
      setLoading(true);
      const res = await fetch('http://127.0.0.1:8000/api/mappings');
      if (res.ok) {
        const data = await res.json();
        setMappings(data.mappings || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMappings();
  }, []);

  const deleteSingleMapping = async (mappingId) => {
    if (!window.confirm('Delete this learned mapping from PostgreSQL?')) return;
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/mappings/${mappingId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setMsg(`Mapping #${mappingId} deleted successfully.`);
        setTimeout(() => setMsg(null), 3000);
        fetchMappings();
      }
    } catch (e) {
      alert('Failed to delete mapping: ' + e.message);
    }
  };

  const clearAll = async () => {
    if (!window.confirm('Are you sure you want to clear ALL learned mappings from PostgreSQL?')) return;
    try {
      const res = await fetch('http://127.0.0.1:8000/api/mappings', {
        method: 'DELETE',
      });
      if (res.ok) {
        setMsg('All learned mappings cleared from PostgreSQL.');
        setTimeout(() => setMsg(null), 3000);
        fetchMappings();
      }
    } catch (e) {
      alert('Failed to clear mappings: ' + e.message);
    }
  };

  return (
    <div className="glass-panel" style={{ padding: '28px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Database size={22} color="var(--accent-cyan)" /> Learned Syntax Mappings Registry
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '2px' }}>
            Mappings saved in PostgreSQL database that are automatically applied to future configuration audits.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={fetchMappings} className="btn-secondary" style={{ fontSize: '0.8rem', padding: '6px 12px' }}>
            <RefreshCw size={14} /> Refresh
          </button>
          {mappings.length > 0 && (
            <button onClick={clearAll} className="btn-secondary" style={{ fontSize: '0.8rem', padding: '6px 12px', borderColor: 'rgba(244,63,94,0.4)', color: '#fb7185' }}>
              <Trash2 size={14} /> Clear All Mappings
            </button>
          )}
        </div>
      </div>

      {msg && (
        <div style={{ marginBottom: '16px', padding: '10px 14px', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '8px', color: '#34d399', fontSize: '0.825rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <CheckCircle2 size={16} /> {msg}
        </div>
      )}

      {loading ? (
        <p style={{ color: 'var(--text-subtle)', fontSize: '0.875rem' }}>Loading learned mappings from PostgreSQL...</p>
      ) : mappings.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 20px', background: 'rgba(0,0,0,0.2)', borderRadius: '12px', border: '1px dashed var(--border-color)' }}>
          <Database size={36} color="var(--text-subtle)" style={{ margin: '0 auto 12px auto' }} />
          <h4 style={{ fontSize: '1.05rem', fontWeight: '700', marginBottom: '4px' }}>No Learned Mappings Yet</h4>
          <p style={{ color: 'var(--text-subtle)', fontSize: '0.85rem' }}>
            When you approve or correct unfamiliar CLI syntax in the AI Review Queue, the learned mapping will appear here.
          </p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em' }}>
                <th style={{ padding: '12px 16px' }}>Vendor</th>
                <th style={{ padding: '12px 16px' }}>Unfamiliar Raw Pattern</th>
                <th style={{ padding: '12px 16px' }}>Normalized Security Field</th>
                <th style={{ padding: '12px 16px' }}>Value</th>
                <th style={{ padding: '12px 16px' }}>Status</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {mappings.map((m) => (
                <tr key={m.mapping_id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(0,0,0,0.15)' }}>
                  <td style={{ padding: '14px 16px' }}>
                    <span className="badge badge-vendor" style={{ fontSize: '0.7rem' }}>
                      <Cpu size={10} /> {m.vendor}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px', fontFamily: 'monospace', color: '#f43f5e' }}>
                    &gt; {m.raw_pattern}
                  </td>
                  <td style={{ padding: '14px 16px', fontFamily: 'monospace', color: 'var(--accent-cyan)', fontWeight: '600' }}>
                    {m.normalized_field}
                  </td>
                  <td style={{ padding: '14px 16px', color: '#fff' }}>
                    {String(m.normalized_value)}
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <span className="badge badge-pass" style={{ fontSize: '0.7rem' }}>
                      <CheckCircle2 size={12} /> Approved
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                    <button
                      onClick={() => deleteSingleMapping(m.mapping_id)}
                      title="Delete mapping from PostgreSQL"
                      style={{ background: 'transparent', border: 'none', color: '#fb7185', cursor: 'pointer', padding: '4px' }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
