import React from 'react';
import { ShieldCheck, Cpu, Database, CheckCircle2, AlertTriangle, FileText, Sparkles } from 'lucide-react';

export default function Header({ activeTab, setActiveTab, backendStatus, stats, pendingReviewCount }) {
  return (
    <header className="glass-panel" style={{ borderRadius: '0 0 20px 20px', borderTop: 'none', padding: '16px 32px', marginBottom: '32px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        
        {/* Brand & Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '48px', height: '48px', borderRadius: '12px',
            background: 'linear-gradient(135deg, #00e5ff 0%, #3b82f6 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 20px rgba(0, 229, 255, 0.4)'
          }}>
            <ShieldCheck size={28} color="#000" strokeWidth={2.5} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 className="gradient-text" style={{ fontSize: '1.5rem', fontWeight: '800', letterSpacing: '-0.02em' }}>
                NETSECURE AI
              </h1>
              <span className="badge badge-vendor" style={{ fontSize: '0.65rem' }}>SIH26155</span>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.825rem', marginTop: '2px' }}>
              Multi-Vendor Network Security Compliance Auditor
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(0,0,0,0.3)', padding: '6px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
          <button
            onClick={() => setActiveTab('audit')}
            style={{
              padding: '8px 16px', borderRadius: '8px', border: 'none',
              background: activeTab === 'audit' ? 'var(--accent-blue)' : 'transparent',
              color: activeTab === 'audit' ? '#fff' : 'var(--text-muted)',
              fontWeight: '600', fontSize: '0.875rem', cursor: 'pointer', transition: 'all 0.2s ease',
              display: 'flex', alignItems: 'center', gap: '6px'
            }}
          >
            <ShieldCheck size={16} /> Audit Dashboard
          </button>

          <button
            onClick={() => setActiveTab('reviews')}
            style={{
              padding: '8px 16px', borderRadius: '8px', border: 'none',
              background: activeTab === 'reviews' ? 'linear-gradient(135deg, #a855f7, #ec4899)' : 'transparent',
              color: activeTab === 'reviews' ? '#fff' : 'var(--text-muted)',
              fontWeight: '600', fontSize: '0.875rem', cursor: 'pointer', transition: 'all 0.2s ease',
              display: 'flex', alignItems: 'center', gap: '6px', position: 'relative'
            }}
          >
            <Sparkles size={16} /> AI Review Queue
            {pendingReviewCount > 0 && (
              <span style={{
                background: '#f43f5e', color: '#fff', fontSize: '0.7rem', fontWeight: '800',
                padding: '2px 7px', borderRadius: '999px', marginLeft: '4px'
              }}>
                {pendingReviewCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('mappings')}
            style={{
              padding: '8px 16px', borderRadius: '8px', border: 'none',
              background: activeTab === 'mappings' ? 'rgba(0, 229, 255, 0.2)' : 'transparent',
              color: activeTab === 'mappings' ? 'var(--accent-cyan)' : 'var(--text-muted)',
              border: activeTab === 'mappings' ? '1px solid var(--accent-cyan)' : 'none',
              fontWeight: '600', fontSize: '0.875rem', cursor: 'pointer', transition: 'all 0.2s ease',
              display: 'flex', alignItems: 'center', gap: '6px'
            }}
          >
            <Database size={16} /> Learned Mappings ({stats?.learned_mappings || 0})
          </button>
        </nav>

        {/* Backend Status Indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 14px', borderRadius: '999px', background: backendStatus === 'connected' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(244, 63, 94, 0.1)', border: `1px solid ${backendStatus === 'connected' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(244, 63, 94, 0.3)'}` }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: backendStatus === 'connected' ? '#10b981' : '#f43f5e', boxShadow: backendStatus === 'connected' ? '0 0 10px #10b981' : 'none' }}></span>
          <span style={{ fontSize: '0.785rem', fontWeight: '600', color: backendStatus === 'connected' ? '#34d399' : '#fb7185' }}>
            {backendStatus === 'connected' ? 'FastAPI + PostgreSQL Connected' : 'Connecting to Backend...'}
          </span>
        </div>

      </div>
    </header>
  );
}
