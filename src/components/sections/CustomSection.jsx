import React from 'react';
import ScrollReveal from '../ui/ScrollReveal';

// Renders any custom section created via /admin
export default function CustomSection({ section }) {
  return (
    <section
      className="section-custom"
      id={section.slug}
      aria-labelledby={`section-title-${section.slug}`}
    >
      <div className="section-container">
        {(section.heading || section.subheading) && (
          <ScrollReveal>
            <div className="section-label">{section.name}</div>
            {section.heading && (
              <h2 id={`section-title-${section.slug}`} className="section-heading">
                {section.heading}
              </h2>
            )}
            {section.subheading && (
              <p className="section-subheading">{section.subheading}</p>
            )}
          </ScrollReveal>
        )}

        {section.image && (
          <ScrollReveal delay={80}>
            <div className="custom-section-image-wrap">
              <img
                src={section.image}
                alt={section.heading || section.name}
                className="custom-section-image"
                loading="lazy"
              />
            </div>
          </ScrollReveal>
        )}

        {section.content && (
          <ScrollReveal delay={100}>
            <div className="custom-section-content">
              {section.content}
            </div>
          </ScrollReveal>
        )}

        {section.content_json && (() => {
          try {
            const parsed = typeof section.content_json === 'string'
              ? JSON.parse(section.content_json)
              : section.content_json;

            if (parsed.cards && Array.isArray(parsed.cards)) {
              return (
                <div className="custom-cards-grid">
                  {parsed.cards.map((card, i) => (
                    <ScrollReveal key={i} delay={i * 50}>
                      <div className="custom-card">
                        {card.title && <h3 className="custom-card-title">{card.title}</h3>}
                        {card.description && <p className="custom-card-desc">{card.description}</p>}
                        {card.link && (
                          <a href={card.link} target="_blank" rel="noopener noreferrer" className="project-link">
                            {card.link_label || 'View ↗'}
                          </a>
                        )}
                      </div>
                    </ScrollReveal>
                  ))}
                </div>
              );
            }

            if (parsed.items && Array.isArray(parsed.items)) {
              return (
                <ul className="custom-list">
                  {parsed.items.map((item, i) => (
                    <ScrollReveal key={i} delay={i * 40}>
                      <li className="custom-list-item">{typeof item === 'string' ? item : item.text}</li>
                    </ScrollReveal>
                  ))}
                </ul>
              );
            }

            return null;
          } catch {
            return null;
          }
        })()}
      </div>
    </section>
  );
}
