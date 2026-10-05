import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import AdminDashboard from './sections/AdminDashboard';
import AdminHero from './sections/AdminHero';
import AdminAbout from './sections/AdminAbout';
import AdminProjects from './sections/AdminProjects';
import AdminExperience from './sections/AdminExperience';
import AdminSkills from './sections/AdminSkills';
import AdminAchievements from './sections/AdminAchievements';
import AdminEducation from './sections/AdminEducation';
import AdminCertifications from './sections/AdminCertifications';
import AdminResume from './sections/AdminResume';
import AdminMedia from './sections/AdminMedia';
import AdminSections from './sections/AdminSections';
import AdminSettings from './sections/AdminSettings';
import AdminMessages from './sections/AdminMessages';

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: '◈' },
  { id: 'messages', label: 'Messages', icon: '✉' },
  { id: 'hero', label: 'Hero', icon: '⬡' },
  { id: 'about', label: 'About', icon: '◐' },
  { id: 'projects', label: 'Projects', icon: '⬢' },
  { id: 'experience', label: 'Experience', icon: '⊡' },
  { id: 'skills', label: 'Skills', icon: '◯' },
  { id: 'achievements', label: 'Achievements', icon: '★' },
  { id: 'education', label: 'Education', icon: '⬙' },
  { id: 'certifications', label: 'Certifications', icon: '⊠' },
  { id: 'resume', label: 'Resume', icon: '⊞' },
  { id: 'media', label: 'Media', icon: '⊟' },
  { id: 'sections', label: 'Sections', icon: '⊜' },
  { id: 'settings', label: 'Settings', icon: '⊕' },
];

const PANEL_MAP = {
  dashboard: AdminDashboard,
  messages: AdminMessages,
  hero: AdminHero,
  about: AdminAbout,
  projects: AdminProjects,
  experience: AdminExperience,
  skills: AdminSkills,
  achievements: AdminAchievements,
  education: AdminEducation,
  certifications: AdminCertifications,
  resume: AdminResume,
  media: AdminMedia,
  sections: AdminSections,
  settings: AdminSettings,
};

export default function AdminDashboardLayout() {
  const { user, logout } = useAuth();
  const [activePanel, setActivePanel] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const ActiveComponent = PANEL_MAP[activePanel] || AdminDashboard;

  const handleNavClick = (id) => {
    setActivePanel(id);
    setSidebarOpen(false);
  };

  return (
    <div className="admin-layout">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="admin-sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside className={`admin-sidebar ${sidebarOpen ? 'is-open' : ''}`} aria-label="Admin navigation">
        <div className="admin-sidebar-brand">
          <span className="admin-brand-logo">AP</span>
          <span className="admin-brand-name">Portfolio CMS</span>
        </div>
        <nav className="admin-nav">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              className={`admin-nav-item ${activePanel === item.id ? 'is-active' : ''}`}
              onClick={() => handleNavClick(item.id)}
              aria-current={activePanel === item.id ? 'page' : undefined}
            >
              <span className="admin-nav-icon" aria-hidden="true">{item.icon}</span>
              <span className="admin-nav-label">{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="admin-sidebar-footer">
          <div className="admin-user-info">
            <span className="admin-avatar" aria-hidden="true">
              {user?.username?.[0]?.toUpperCase() || 'A'}
            </span>
            <span className="admin-username">{user?.username || 'Admin'}</span>
          </div>
          <button className="admin-logout-btn" onClick={logout} title="Sign out">
            ↩
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="admin-main">
        <header className="admin-topbar">
          <button
            className="admin-menu-btn"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label="Toggle sidebar"
            aria-expanded={sidebarOpen}
          >
            ≡
          </button>
          <div className="admin-topbar-title">
            {NAV_ITEMS.find((n) => n.id === activePanel)?.label || 'Dashboard'}
          </div>
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="admin-view-site-btn"
            title="View public website"
          >
            View Site ↗
          </a>
        </header>

        <div className="admin-content">
          <ActiveComponent />
        </div>
      </div>
    </div>
  );
}
