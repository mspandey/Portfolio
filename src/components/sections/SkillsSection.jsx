import React from 'react';
import ScrollReveal from '../ui/ScrollReveal';

export default function SkillsSection({ data }) {
  const skills = data?.skills || [];

  const categories = [...new Set(skills.map((s) => s.category))];

  return (
    <section className="section-skills" id="skills" aria-labelledby="skills-title">
      <div className="section-container">
        <ScrollReveal>
          <div className="section-label">Skills</div>
          <h2 id="skills-title" className="section-heading">Technologies & Tools</h2>
        </ScrollReveal>

        {skills.length === 0 && (
          <p className="empty-state">No skills added yet. Add them from /admin → Skills.</p>
        )}

        {categories.map((cat) => (
          <div key={cat} className="skills-category-block">
            <ScrollReveal>
              <h3 className="skills-category-name">{cat}</h3>
            </ScrollReveal>
            <div className="skills-grid">
              {skills.filter((s) => s.category === cat).map((skill, i) => (
                <ScrollReveal key={skill.id} delay={i * 40}>
                  <div className="skill-chip">
                    {skill.icon && (
                      <img
                        src={skill.icon}
                        alt=""
                        className="skill-icon"
                        aria-hidden="true"
                        loading="lazy"
                      />
                    )}
                    <span className="skill-name">{skill.name}</span>
                    {skill.proficiency > 0 && (
                      <div
                        className="skill-level-dot"
                        title={`Proficiency: ${skill.proficiency}%`}
                        aria-label={`Proficiency ${skill.proficiency} percent`}
                        style={{ '--level': `${skill.proficiency}%` }}
                      />
                    )}
                  </div>
                </ScrollReveal>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
