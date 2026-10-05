import React from 'react';
import ScrollReveal from '../ui/ScrollReveal';

export default function AboutSection({ data }) {
  const about = data?.aboutSettings || {};

  const cleanText = (val) => {
    if (!val || val === 'null' || val === 'undefined') return '';
    return typeof val === 'string' ? val.trim() : String(val);
  };

  const heading = cleanText(about.heading) || 'About Me';
  const intro = cleanText(about.introduction) || 'Passionate about engineering systems that merge machine intelligence with robust backend architectures.';
  const bio = cleanText(about.biography);
  const summary = cleanText(about.professional_summary);
  const profileImg = cleanText(about.profile_image);

  let stats = [];
  try {
    if (about.stats_json && about.stats_json !== 'null' && about.stats_json !== 'undefined') {
      stats = typeof about.stats_json === 'string' ? JSON.parse(about.stats_json) : about.stats_json;
      if (!Array.isArray(stats)) stats = [];
    }
  } catch {
    stats = [];
  }

  return (
    <section className="section-about" id="about" aria-labelledby="about-title">
      <div className="section-container">
        <ScrollReveal>
          <div className="about-grid">
            <div className="about-content">
              <div className="section-label">About</div>
              <h2 id="about-title" className="section-heading">{heading}</h2>
              {intro && <p className="about-intro">{intro}</p>}
              <div className="about-bio">
                {bio && <p>{bio}</p>}
                {summary && <p className="about-summary">{summary}</p>}
              </div>
              {stats.length > 0 && (
                <div className="about-stats">
                  {stats.map((stat, i) => (
                    <div key={i} className="about-stat">
                      <span className="stat-value">{stat.value}</span>
                      <span className="stat-label">{stat.label}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {profileImg && (
              <div className="about-image-wrap">
                <img
                  src={profileImg}
                  alt={heading || 'Profile'}
                  className="about-profile-img"
                  loading="lazy"
                />
              </div>
            )}
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
