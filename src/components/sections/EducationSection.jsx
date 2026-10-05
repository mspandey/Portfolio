import React, { useState } from 'react';
import ScrollReveal from '../ui/ScrollReveal';

export default function EducationSection({ data }) {
  const educationList = data?.education || [];
  const [expandedId, setExpandedId] = useState(null);

  const toggleExpand = (id) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <section className="section-education" id="education" aria-labelledby="education-title">
      <div className="section-container">
        <ScrollReveal>
          <div className="section-label">Education</div>
          <h2 id="education-title" className="section-heading">Academic Background</h2>
        </ScrollReveal>

        {educationList.length === 0 && (
          <p className="empty-state">No education entries available.</p>
        )}

        <div className="education-list">
          {educationList.map((edu, i) => {
            const isExpanded = expandedId === edu.id;
            const logoSrc = edu.logo_url || edu.logo;
            const websiteUrl = edu.institution_url || edu.url;
            const startDate = edu.start_date || edu.start_year;
            const endDate = edu.end_date || edu.end_year;
            const shortDesc = edu.short_description;
            const detailedDesc = edu.description;

            return (
              <ScrollReveal key={edu.id} delay={i * 80}>
                <article
                  className={`education-card ${isExpanded ? 'education-card--expanded' : ''}`}
                  onClick={() => toggleExpand(edu.id)}
                  style={{ cursor: 'pointer', transition: 'all 0.3s ease' }}
                >
                  <div className="edu-card-top" style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                    {logoSrc ? (
                      <div className="edu-logo-wrap" style={{ flexShrink: 0 }}>
                        <img
                          src={logoSrc}
                          alt={`${edu.institution} Logo`}
                          className="edu-logo"
                          loading="lazy"
                          style={{ width: '54px', height: '54px', objectFit: 'contain', borderRadius: '8px', background: '#fff', padding: '4px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
                        />
                      </div>
                    ) : (
                      <div className="edu-logo-placeholder" style={{ width: '54px', height: '54px', borderRadius: '8px', background: 'rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', flexShrink: 0 }}>
                        🎓
                      </div>
                    )}

                    <div className="edu-body" style={{ flex: 1 }}>
                      <div className="edu-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap' }}>
                        <div>
                          <h3 className="edu-institution" style={{ margin: 0, fontSize: '18px', fontWeight: '700' }}>
                            {edu.institution}
                          </h3>
                          <p className="edu-degree" style={{ margin: '4px 0 0', fontWeight: '600', opacity: 0.9 }}>
                            {edu.degree}
                            {edu.field ? ` — ${edu.field}` : ''}
                          </p>
                        </div>
                        <time className="edu-period" style={{ fontSize: '13px', fontWeight: '600', opacity: 0.75, whiteSpace: 'nowrap' }}>
                          {startDate}
                          {endDate || edu.is_current ? ` — ${edu.is_current ? 'Present' : endDate}` : ''}
                        </time>
                      </div>

                      {shortDesc && (
                        <p className="edu-short-desc" style={{ margin: '10px 0 0', fontSize: '14px', lineHeight: '1.5', opacity: 0.85 }}>
                          {shortDesc}
                        </p>
                      )}

                      {/* Expand / Collapse Indicator */}
                      <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                        <button
                          type="button"
                          className="edu-toggle-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleExpand(edu.id);
                          }}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'inherit',
                            fontWeight: '600',
                            fontSize: '12px',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: 0,
                            opacity: 0.8,
                          }}
                        >
                          {isExpanded ? 'Hide Details ▲' : 'View Details & Description ▼'}
                        </button>

                        {websiteUrl && (
                          <a
                            href={websiteUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="edu-website-link"
                            onClick={(e) => e.stopPropagation()}
                            style={{
                              fontSize: '12px',
                              fontWeight: '600',
                              color: 'inherit',
                              textDecoration: 'underline',
                              opacity: 0.9,
                            }}
                          >
                            Visit Website ↗
                          </a>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Detail View */}
                  {isExpanded && (
                    <div
                      className="edu-expanded-details"
                      style={{
                        marginTop: '16px',
                        paddingTop: '16px',
                        borderTop: '1px solid rgba(0, 0, 0, 0.08)',
                        animation: 'fadeIn 0.3s ease-in-out',
                      }}
                    >
                      {detailedDesc && (
                        <div className="edu-full-description" style={{ fontSize: '14px', lineHeight: '1.6', marginBottom: '12px' }}>
                          <strong>Overview & Key Focus:</strong>
                          <p style={{ margin: '6px 0 0', whiteSpace: 'pre-line' }}>{detailedDesc}</p>
                        </div>
                      )}

                      {edu.achievements && edu.achievements.length > 0 && (
                        <div className="edu-achievements-wrap" style={{ marginTop: '12px' }}>
                          <strong style={{ fontSize: '13px' }}>Honors & Achievements:</strong>
                          <ul className="edu-achievements" style={{ margin: '6px 0 0', paddingLeft: '20px', fontSize: '13px' }}>
                            {edu.achievements.map((ach, idx) => (
                              <li key={idx} style={{ marginBottom: '4px' }}>{ach}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {websiteUrl && (
                        <div style={{ marginTop: '14px' }}>
                          <a
                            href={websiteUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="action action-glass"
                            onClick={(e) => e.stopPropagation()}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '6px 14px',
                              fontSize: '12px',
                              fontWeight: '600',
                              borderRadius: '999px',
                            }}
                          >
                            Visit Official {edu.institution} Website ↗
                          </a>
                        </div>
                      )}
                    </div>
                  )}
                </article>
              </ScrollReveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
