import React from 'react';
import ScrollReveal from '../ui/ScrollReveal';

export default function ExperienceSection({ data }) {
  const experiences = data?.experiences || [];

  return (
    <section className="section-experience" id="experience" aria-labelledby="experience-title">
      <div className="section-container">
        <ScrollReveal>
          <div className="section-label">Experience</div>
          <h2 id="experience-title" className="section-heading">Where I've Worked</h2>
        </ScrollReveal>

        <div className="timeline">
          {experiences.length === 0 && (
            <p className="empty-state">No experience entries available.</p>
          )}
          {experiences.map((exp, i) => {
            const reportLink = exp.report_url || exp.report_path;

            return (
              <ScrollReveal key={exp.id} delay={i * 80}>
                <article className="timeline-item">
                  <div className="timeline-marker" aria-hidden="true" />
                  <div className="timeline-content">
                    <div className="timeline-header">
                      <div className="timeline-meta">
                        <h3 className="timeline-role">{exp.role}</h3>
                        <div className="timeline-company">
                          {exp.company_url ? (
                            <a
                              href={exp.company_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="company-link"
                              style={{ color: 'inherit', fontWeight: '600', textDecoration: 'underline' }}
                            >
                              {exp.company} ↗
                            </a>
                          ) : (
                            <span>{exp.company}</span>
                          )}
                          {exp.location && <span className="timeline-location"> · {exp.location}</span>}
                        </div>
                      </div>
                      <time className="timeline-period">
                        {exp.start_date}
                        {' — '}
                        {exp.is_current ? 'Present' : (exp.end_date || 'Present')}
                      </time>
                    </div>

                    {exp.description && <p className="timeline-description">{exp.description}</p>}

                    {exp.responsibilities?.length > 0 && (
                      <ul className="timeline-responsibilities">
                        {exp.responsibilities.map((r, idx) => (
                          <li key={idx}>{r}</li>
                        ))}
                      </ul>
                    )}

                    {exp.technologies?.length > 0 && (
                      <div className="tech-tags">
                        {exp.technologies.map((tech) => (
                          <span key={tech} className="tech-tag">{tech}</span>
                        ))}
                      </div>
                    )}

                    {reportLink && (
                      <div className="timeline-report" style={{ marginTop: '16px' }}>
                        <a
                          href={reportLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="action action-glass"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '6px 16px',
                            fontSize: '12px',
                            fontWeight: '600',
                            borderRadius: '999px',
                            textDecoration: 'none',
                          }}
                        >
                          📄 View Internship Report ↗
                        </a>
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
