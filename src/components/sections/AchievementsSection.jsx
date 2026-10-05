import React, { useState } from 'react';
import ScrollReveal from '../ui/ScrollReveal';
import { trackEvent } from '../../api/tracker.js';

export default function AchievementsSection({ data }) {
  const achievements = data?.achievements || [];
  const [expandedId, setExpandedId] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);

  const toggleExpand = (ach) => {
    const isOpening = expandedId !== ach.id;
    setExpandedId((prev) => (prev === ach.id ? null : ach.id));
    if (isOpening) {
      trackEvent('certificate_view', { achievement_id: ach.id, title: ach.title });
      trackEvent('achievement_expand', { achievement_id: ach.id, title: ach.title });
    }
  };

  const handleDownloadCertificate = async (ach) => {
    if (!ach?.certificate_url) return;
    trackEvent('certificate_download', { achievement_id: ach.id, title: ach.title });
    setDownloadingId(ach.id);

    const isPdf = ach.certificate_url.toLowerCase().includes('.pdf');
    const cleanTitle = (ach.title || 'Certificate').replace(/[^a-zA-Z0-9_-]/g, '_');
    const ext = isPdf ? '.pdf' : '.jpg';
    const filename = `${cleanTitle}_Certificate${ext}`;

    // 1. Try server proxy endpoint which sets Content-Disposition: attachment for true download
    try {
      const baseUrl = (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'))
        ? `http://localhost:3001/api/public/certificates/download`
        : `/api/public/certificates/download`;

      const downloadEndpoint = `${baseUrl}?id=${encodeURIComponent(ach.id)}&url=${encodeURIComponent(ach.certificate_url)}&filename=${encodeURIComponent(filename)}`;
      const res = await fetch(downloadEndpoint);
      if (res.ok) {
        const blob = await res.blob();
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
        setDownloadingId(null);
        return;
      }
    } catch (err) {
      console.warn('Proxy download fallback:', err);
    }

    // 2. Direct blob download fallback
    try {
      const res = await fetch(ach.certificate_url);
      if (res.ok) {
        const blob = await res.blob();
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
        setDownloadingId(null);
        return;
      }
    } catch (directErr) {
      console.warn('Direct blob fetch fallback:', directErr);
    }

    // 3. Fallback: Open in new tab
    window.open(ach.certificate_url, '_blank');
    setDownloadingId(null);
  };

  return (
    <section className="section-achievements" id="achievements" aria-labelledby="achievements-title">
      <div className="section-container">
        <ScrollReveal>
          <div className="section-label">Achievements</div>
          <h2 id="achievements-title" className="section-heading">Recognition & Awards</h2>
        </ScrollReveal>

        {achievements.length === 0 && (
          <p className="empty-state">No achievements available.</p>
        )}

        <div className="achievements-grid">
          {achievements.map((ach, i) => {
            const isExpanded = expandedId === ach.id;
            const hasCertificate = Boolean(ach.certificate_url);
            const hasExternal = Boolean(ach.external_url);
            const isPdf = (ach.certificate_url || '').toLowerCase().includes('.pdf');
            const isLinkedIn = (ach.external_url || '').toLowerCase().includes('linkedin');
            const extLabel = isLinkedIn ? 'View on LinkedIn ↗' : 'View Details ↗';

            return (
              <ScrollReveal key={ach.id} delay={i * 60}>
                <article className={`achievement-card ${isExpanded ? 'achievement-card--expanded' : ''}`}>
                  <div className="achievement-body" style={{ width: '100%' }}>
                    <div className="achievement-top-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                      {ach.rank_result && (
                        <span
                          className="achievement-badge"
                          style={{
                            background: 'rgba(141, 93, 72, 0.08)',
                            border: '1px solid rgba(141, 93, 72, 0.22)',
                            color: '#6d4231',
                            fontSize: '12px',
                            fontWeight: '600',
                            padding: '4px 12px',
                            borderRadius: '999px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                          }}
                        >
                          <span aria-hidden="true">🏆</span> {ach.rank_result}
                        </span>
                      )}

                      {ach.year && (
                        <span className="achievement-year" style={{ fontSize: '13px', fontWeight: '600', opacity: 0.7 }}>
                          {ach.year}
                        </span>
                      )}
                    </div>

                    <h3 className="achievement-title">{ach.title}</h3>

                    <div className="achievement-meta" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '8px', fontSize: '13px', opacity: 0.85 }}>
                      {ach.organization && <span className="achievement-org">{ach.organization}</span>}
                      {ach.participant_count && (
                        <span className="achievement-participants"> · {ach.participant_count} participants</span>
                      )}
                    </div>

                    {ach.description && <p className="achievement-desc">{ach.description}</p>}

                    {/* Action Buttons: Certificate Toggle & External/LinkedIn Link */}
                    {(hasCertificate || hasExternal) && (
                      <div className="achievement-actions">
                        {hasCertificate && (
                          <button
                            type="button"
                            className={`achievement-action-btn achievement-action-btn--cert ${isExpanded ? 'is-active' : ''}`}
                            onClick={() => toggleExpand(ach)}
                            aria-expanded={isExpanded}
                          >
                            {isExpanded ? 'Hide Certificate ▴' : 'View Certificate ▾'}
                          </button>
                        )}

                        {hasExternal && (
                          <a
                            href={ach.external_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="achievement-action-btn achievement-action-btn--ext"
                            onClick={() => {
                              if (isLinkedIn) {
                                trackEvent('linkedin_click', { url: ach.external_url, title: ach.title });
                              } else {
                                trackEvent('external_link_click', { url: ach.external_url, title: ach.title });
                              }
                            }}
                          >
                            {extLabel}
                          </a>
                        )}
                      </div>
                    )}

                    {/* Expandable Certificate Viewer (rendered only when expanded) */}
                    {isExpanded && hasCertificate && (
                      <div className="achievement-certificate-drawer">
                        <div className="achievement-cert-header">
                          <div className="achievement-cert-title-group">
                            <span className="achievement-cert-kicker">CERTIFICATE</span>
                            <span className="achievement-cert-filename">
                              {isPdf ? '📄 PDF Document' : '🖼️ Certificate Image'}
                            </span>
                          </div>

                          <div className="achievement-cert-controls">
                            <button
                              type="button"
                              className="achievement-btn-download"
                              onClick={() => handleDownloadCertificate(ach)}
                              disabled={downloadingId === ach.id}
                            >
                              {downloadingId === ach.id ? 'Downloading…' : '⬇ Download Certificate'}
                            </button>
                            <button
                              type="button"
                              className="achievement-btn-close"
                              onClick={() => toggleExpand(ach.id)}
                              aria-label="Collapse Certificate"
                            >
                              ✕ Close
                            </button>
                          </div>
                        </div>

                        <div className="achievement-cert-content">
                          {isPdf ? (
                            <div className="achievement-pdf-wrapper">
                              <iframe
                                src={ach.certificate_url}
                                title={`${ach.title} Certificate`}
                                className="achievement-pdf-frame"
                              />
                            </div>
                          ) : (
                            <div className="achievement-img-wrapper">
                              <img
                                src={ach.certificate_url}
                                alt={`${ach.title} Certificate`}
                                className="achievement-img-preview"
                                loading="lazy"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </article>
              </ScrollReveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
