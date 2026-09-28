import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import UploadSection from './components/UploadSection';
import MultiAuditView from './components/MultiAuditView';
import ReviewQueue from './components/ReviewQueue';
import LearnedMappingsView from './components/LearnedMappingsView';

export default function App() {
  const [activeTab, setActiveTab] = useState('audit'); // 'audit', 'reviews', 'mappings'
  const [backendStatus, setBackendStatus] = useState('disconnected');
  const [stats, setStats] = useState({ audits: 0, reviews: 0, learned_mappings: 0 });
  const [currentAudits, setCurrentAudits] = useState([]); // Array of audit results
  const [isAuditing, setIsAuditing] = useState(false);
  const [pendingReviewCount, setPendingReviewCount] = useState(0);

  const checkBackendStatus = async () => {
    try {
      const res = await fetch('http://127.0.0.1:8000/api/health');
      if (res.ok) {
        setBackendStatus('connected');
        fetchStats();
      } else {
        setBackendStatus('disconnected');
      }
    } catch {
      setBackendStatus('disconnected');
    }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch('http://127.0.0.1:8000/api/stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchPendingReviews = async () => {
    try {
      const res = await fetch('http://127.0.0.1:8000/api/reviews?status=PENDING');
      if (!res.ok) return;
      const pendingList = await res.json();
      setPendingReviewCount(pendingList.length);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    checkBackendStatus();
    fetchPendingReviews();
  }, []);

  // onUploadSuccess now receives an array of audit results
  const handleUploadSuccess = (auditResults) => {
    const results = Array.isArray(auditResults) ? auditResults : [auditResults];
    setCurrentAudits(results);
    fetchStats();
    fetchPendingReviews();
    const hasReviews = results.some(a => a.review_items && a.review_items.length > 0);
    if (hasReviews) {
      setActiveTab('reviews');
    } else {
      setActiveTab('audit');
    }
  };

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 20px 60px 20px' }}>
      
      {/* Top Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        backendStatus={backendStatus}
        stats={stats}
        pendingReviewCount={pendingReviewCount}
      />

      {/* Main Tab Content */}
      <main>
        {activeTab === 'audit' && (
          <div>
            <UploadSection
              onUploadSuccess={handleUploadSuccess}
              isAuditing={isAuditing}
              setIsAuditing={setIsAuditing}
            />
            {currentAudits.length > 0 ? (
              <MultiAuditView
                audits={currentAudits}
                onSelectReviewTab={() => setActiveTab('reviews')}
              />
            ) : (
              <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', background: 'rgba(0,0,0,0.2)' }}>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
                  No active audit loaded. Upload one or more configuration files above or select a preset from history.
                </p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'reviews' && (
          <ReviewQueue
            onReviewProcessed={() => {
              fetchStats();
              fetchPendingReviews();
            }}
          />
        )}

        {activeTab === 'mappings' && (
          <LearnedMappingsView />
        )}
      </main>

    </div>
  );
}
