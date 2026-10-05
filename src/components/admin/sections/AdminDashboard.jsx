import React, { useEffect, useState } from 'react';
import {
  fetchAdminProjects,
  fetchAdminExperiences,
  fetchAdminAchievements,
  fetchAdminResumes,
  fetchAdminSections,
} from '../../../api/client';

function StatCard({ label, value, icon }) {
  return (
    <div className="dash-stat-card">
      <span className="dash-stat-icon" aria-hidden="true">{icon}</span>
      <div className="dash-stat-body">
        <div className="dash-stat-value">{value ?? '—'}</div>
        <div className="dash-stat-label">{label}</div>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetchAdminProjects().catch(() => []),
      fetchAdminExperiences().catch(() => []),
      fetchAdminAchievements().catch(() => []),
      fetchAdminResumes().catch(() => []),
      fetchAdminSections().catch(() => []),
    ]).then(([projects, experiences, achievements, resumes, sections]) => {
      const activeResume = resumes.find((r) => r.is_active);
      setStats({
        projects: projects.length,
        experiences: experiences.length,
        achievements: achievements.length,
        resumes: resumes.length,
        sections: sections.filter((s) => s.is_visible).length,
        activeResume: activeResume ? activeResume.original_filename || activeResume.filename : null,
      });
      setLoading(false);
    });
  }, []);

  return (
    <div className="admin-panel">
      <div className="admin-panel-header">
        <h2 className="admin-panel-title">Dashboard</h2>
        <p className="admin-panel-subtitle">Overview of your portfolio content</p>
      </div>

      {loading ? (
        <div className="admin-loading">Loading stats…</div>
      ) : (
        <>
          <div className="dash-stats-grid">
            <StatCard label="Projects" value={stats.projects} icon="⬢" />
            <StatCard label="Experiences" value={stats.experiences} icon="⊡" />
            <StatCard label="Achievements" value={stats.achievements} icon="★" />
            <StatCard label="Visible Sections" value={stats.sections} icon="⊜" />
            <StatCard label="Resume Versions" value={stats.resumes} icon="⊞" />
          </div>

          <div className="dash-active-resume">
            <h3 className="dash-section-title">Active Resume</h3>
            {stats.activeResume ? (
              <div className="resume-status-card">
                <span className="resume-status-badge resume-status-badge--active">ACTIVE</span>
                <span className="resume-status-filename">{stats.activeResume}</span>
                <a
                  href="/api/resumes/active"
                  className="admin-btn admin-btn--sm"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Download
                </a>
              </div>
            ) : (
              <div className="resume-status-card resume-status-card--empty">
                <span>No active resume. Upload one from the Resume section.</span>
              </div>
            )}
          </div>

          <div className="dash-quick-actions">
            <h3 className="dash-section-title">Quick Links</h3>
            <p className="admin-help-text">
              Use the sidebar navigation to manage your portfolio content. All changes automatically reflect on the public site.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
