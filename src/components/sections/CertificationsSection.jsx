import React from 'react';
import ScrollReveal from '../ui/ScrollReveal';

export default function CertificationsSection({ data }) {
  const certs = data?.certifications || [];

  return (
    <section className="section-certifications" id="certifications" aria-labelledby="certs-title">
      <div className="section-container">
        <ScrollReveal>
          <div className="section-label">Certifications</div>
          <h2 id="certs-title" className="section-heading">Credentials & Learning</h2>
        </ScrollReveal>

        {certs.length === 0 && (
          <p className="empty-state">No certifications yet. Add them from /admin → Certifications.</p>
        )}

        <div className="certs-grid">
          {certs.map((cert, i) => (
            <ScrollReveal key={cert.id} delay={i * 50}>
              <article className="cert-card">
                {cert.logo && (
                  <div className="cert-logo-wrap">
                    <img src={cert.logo} alt={cert.organization} className="cert-logo" loading="lazy" />
                  </div>
                )}
                <div className="cert-body">
                  <h3 className="cert-name">{cert.name}</h3>
                  <p className="cert-org">{cert.organization}</p>
                  <div className="cert-meta">
                    {cert.issue_date && <span className="cert-date">Issued: {cert.issue_date}</span>}
                    {cert.expiry_date && <span className="cert-expiry">Expires: {cert.expiry_date}</span>}
                    {cert.credential_id && <span className="cert-id">ID: {cert.credential_id}</span>}
                  </div>
                  {(cert.certificate_file || cert.credential_url) && (
                    <a
                      href={cert.certificate_file || cert.credential_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="cert-verify-link"
                    >
                      {cert.certificate_file ? 'View Certificate ↗' : 'Verify Credential ↗'}
                    </a>
                  )}
                </div>
              </article>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
