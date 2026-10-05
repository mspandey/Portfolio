import React from 'react';
import ScrollReveal from '../ui/ScrollReveal';
import { trackEvent } from '../../api/tracker.js';

export default function ProjectsSection({ section, data }) {
  const projects = data?.projects || [];
  const hasFeatured = projects.some((p) => p.is_featured);

  return (
    <section className="section-projects" id="projects" aria-labelledby="proj-heading">
      <div className="section-container">
        <ScrollReveal>
          <span className="section-label">Projects</span>
          <h2 className="section-heading" id="proj-heading">
            {section?.heading || "Things I've Built"}
          </h2>
        </ScrollReveal>

        {projects.length === 0 ? (
          <p className="empty-state">No projects published yet.</p>
        ) : (
          <div className={`projects-grid ${hasFeatured ? 'has-featured' : ''}`}>
            {projects.map((project, i) => {
              const techs = Array.isArray(project.technologies)
                ? project.technologies
                : (project.technologies_json ? JSON.parse(project.technologies_json) : []);

              const liveLink = project.demo_url || project.live_url;

              return (
                <ScrollReveal key={project.id} delay={i * 60}>
                  <article
                    className={`project-card ${project.is_featured ? 'project-card--featured' : ''}`}
                    onClick={() => {
                      trackEvent('project_view', {
                        projectId: project.id,
                        projectTitle: project.title,
                        projectSlug: project.slug,
                      });
                    }}
                  >
                    {project.image && (
                      <div className="project-image-wrap">
                        <img
                          className="project-image"
                          src={project.image}
                          alt={project.title}
                          loading="lazy"
                        />
                        <div className="project-image-overlay" aria-hidden="true" />
                      </div>
                    )}

                    <div className="project-body">
                      <div className="project-header">
                        {project.is_featured && (
                          <span className="project-badge">Featured</span>
                        )}
                        {Boolean(project.category && project.category.trim() && project.category !== 'No Category') && (
                          <span className="project-category">{project.category.trim()}</span>
                        )}
                        {project.project_date && (
                          <span className="project-year">{project.project_date}</span>
                        )}
                      </div>

                      <h3 className="project-title">{project.title}</h3>

                      <p className="project-description">
                        {project.short_description || project.description}
                      </p>

                      {project.achievement && (
                        <div className="project-achievement">
                          <span className="achievement-icon" aria-hidden="true">🏆</span>
                          {project.achievement}
                        </div>
                      )}

                      {techs.length > 0 && (
                        <div className="tech-tags">
                          {techs.slice(0, 6).map((t) => (
                            <span key={t} className="tech-tag">{t}</span>
                          ))}
                        </div>
                      )}

                      <div className="project-links">
                        {liveLink && (
                          <a
                            className="project-link project-link--primary"
                            href={liveLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => {
                              e.stopPropagation();
                              trackEvent('external_link_click', {
                                projectId: project.id,
                                projectTitle: project.title,
                                url: liveLink,
                              });
                              trackEvent('project_view', {
                                projectId: project.id,
                                projectTitle: project.title,
                              });
                            }}
                          >
                            Live Demo ↗
                          </a>
                        )}
                        {project.github_url && (
                          <a
                            className="project-link"
                            href={project.github_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => {
                              e.stopPropagation();
                              trackEvent('github_click', {
                                projectId: project.id,
                                projectTitle: project.title,
                                url: project.github_url,
                              });
                              trackEvent('project_view', {
                                projectId: project.id,
                                projectTitle: project.title,
                              });
                            }}
                          >
                            GitHub ↗
                          </a>
                        )}
                      </div>
                    </div>
                  </article>
                </ScrollReveal>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
