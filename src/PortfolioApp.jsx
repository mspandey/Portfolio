import React, { useEffect, useRef, useState, useCallback } from 'react';
import characterVideoUrl from '../character-scrub.mp4?url';
import { fetchPublicData, downloadActiveResume } from './api/client.js';
import AboutSection from './components/sections/AboutSection.jsx';
import ExperienceSection from './components/sections/ExperienceSection.jsx';
import ProjectsSection from './components/sections/ProjectsSection.jsx';
import SkillsSection from './components/sections/SkillsSection.jsx';
import AchievementsSection from './components/sections/AchievementsSection.jsx';
import EducationSection from './components/sections/EducationSection.jsx';
import CertificationsSection from './components/sections/CertificationsSection.jsx';
import ContactSection from './components/sections/ContactSection.jsx';
import CustomSection from './components/sections/CustomSection.jsx';

import { useCanvasCharacter } from './components/hero/useCanvasCharacter.js';

function useMagneticCursor(dotRef, auraRef) {
  useEffect(() => {
    if (!window.matchMedia('(pointer: fine)').matches) return undefined;

    let x = window.innerWidth / 2;
    let y = window.innerHeight / 2;
    let targetX = x;
    let targetY = y;
    let animationFrame = 0;

    const onPointerMove = (event) => {
      targetX = event.clientX;
      targetY = event.clientY;
      if (dotRef.current) {
        dotRef.current.style.left = `${targetX}px`;
        dotRef.current.style.top = `${targetY}px`;
      }
      const isInteractive = event.target instanceof Element
        && Boolean(event.target.closest('a, button'));
      auraRef.current?.classList.toggle('is-hovering', isInteractive);
    };

    const followPointer = () => {
      x += (targetX - x) * 0.18;
      y += (targetY - y) * 0.18;
      if (auraRef.current) {
        auraRef.current.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
      }
      animationFrame = window.requestAnimationFrame(followPointer);
    };

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    animationFrame = window.requestAnimationFrame(followPointer);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener('pointermove', onPointerMove);
    };
  }, [auraRef, dotRef]);
}

// ─────────────────────────────────────────────────────────
// SCROLL REVEAL — IntersectionObserver based
// ─────────────────────────────────────────────────────────

function useScrollReveal() {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-revealed');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -60px 0px' }
    );

    const targets = document.querySelectorAll('.reveal');
    targets.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  });
}

// ─────────────────────────────────────────────────────────
// SECTION COMPONENT MAP
// ─────────────────────────────────────────────────────────

const BUILT_IN_SECTIONS = {
  about: AboutSection,
  experience: ExperienceSection,
  projects: ProjectsSection,
  skills: SkillsSection,
  achievements: AchievementsSection,
  education: EducationSection,
  certifications: CertificationsSection,
  contact: ContactSection,
};

// ─────────────────────────────────────────────────────────
// FOOTER
// ─────────────────────────────────────────────────────────

function Footer({ siteSettings }) {
  const year = new Date().getFullYear();
  const name = siteSettings?.name || siteSettings?.owner_name || 'Amisha Pandey';
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div className="footer-brand">{name}</div>
        <nav className="footer-nav" aria-label="Footer navigation">
          {siteSettings?.github && (
            <a href={siteSettings.github} target="_blank" rel="noopener noreferrer">GitHub</a>
          )}
          {siteSettings?.linkedin && (
            <a href={siteSettings.linkedin} target="_blank" rel="noopener noreferrer">LinkedIn</a>
          )}
          {siteSettings?.email && (
            <a href={`mailto:${siteSettings.email}`}>Email</a>
          )}
        </nav>
        <p className="footer-copy">© {year} {name}. All rights reserved.</p>
      </div>
    </footer>
  );
}

// ─────────────────────────────────────────────────────────
// MAIN PORTFOLIO APP
// ─────────────────────────────────────────────────────────

export default function PortfolioApp() {
  const canvasRef = useRef(null);
  const cursorDotRef = useRef(null);
  const cursorAuraRef = useRef(null);
  const [isSmiling, setSmiling] = useState(false);
  const [portfolioData, setPortfolioData] = useState(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [isMobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Hero interactions
  useCanvasCharacter(canvasRef, setSmiling);
  useMagneticCursor(cursorDotRef, cursorAuraRef);
  useScrollReveal();

  // Fetch all portfolio data from DB once
  useEffect(() => {
    fetchPublicData()
      .then(setPortfolioData)
      .catch((err) => console.error('Portfolio data fetch failed:', err))
      .finally(() => setDataLoading(false));
  }, []);

  // Lock body scroll and listen for Escape key when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
      const handleKeyDown = (e) => {
        if (e.key === 'Escape') setMobileMenuOpen(false);
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        document.body.style.overflow = '';
        window.removeEventListener('keydown', handleKeyDown);
      };
    } else {
      document.body.style.overflow = '';
    }
  }, [isMobileMenuOpen]);

  const data = portfolioData || {};
  const rawSections = data.sections || [];
  const siteSettings = data.siteSettings || {};
  const heroSettings = data.heroSettings || {};
  const activeResume = data.activeResume;

  // Single Source of Truth: Visible sections in database display_order
  // Filter out hero since Hero is fixed at top of the page
  const visibleSections = rawSections.filter(
    (s) => s.slug !== 'hero' && (s.is_visible === 1 || s.is_visible === true || s.is_visible === undefined)
  );

  // Public navigation is 100% dynamically derived from visibleSections
  const navSections = visibleSections.map((s) => ({
    slug: s.slug,
    name: (s.name || s.slug).toUpperCase(),
  }));

  const handleResumeClick = async (e) => {
    e.preventDefault();
    try {
      await downloadActiveResume();
    } catch (err) {
      alert(err.message || 'No active resume is available.');
    }
  };

  const greeting = heroSettings.greeting || "Hi, I'm";
  const heroName = heroSettings.name || 'Amisha Pandey';
  const tagline = heroSettings.tagline || 'Where data meets intelligence.';
  const description = heroSettings.description || 'I work with databases, AI/ML & systems that solve real problems. Building things that think, learn, and work.';
  const resumeLabel = heroSettings.resume_button_label || 'Resume';
  const talkLabel = heroSettings.talk_button_label || "Let's Talk";
  const talkUrl = heroSettings.talk_button_url || '#contact';
  const showResume = heroSettings.resume_button_visible !== 0;

  const handleNavClick = (slug) => {
    setMobileMenuOpen(false);
    const target = document.getElementById(slug);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth' });
    } else {
      window.location.hash = `#${slug}`;
    }
  };

  return (
    <div className="portfolio-app">
      {/* Global Public Custom Cursor — mounted at root, visible across all portfolio sections */}
      <div className="custom-cursor" aria-hidden="true">
        <span className="cursor-aura" ref={cursorAuraRef} />
        <span className="cursor-dot" ref={cursorDotRef} />
      </div>

      {/* ═══════════════════════════════════════════════ */}
      {/* HERO — ORIGINAL DESIGN, PRESERVED EXACTLY      */}
      {/* ═══════════════════════════════════════════════ */}
      <main className="hero" id="hero">
        {/* Portrait Canvas — Ultra-smooth continuous 60 FPS dense gaze renderer on desktop, static on mobile */}
        <div className={`video-stage${isSmiling ? ' face-smiling' : ''}`}>
          <canvas
            ref={canvasRef}
            className="portrait-video portrait-canvas"
            aria-label="Portrait of Amisha Pandey"
          />
        </div>

        {/* Navigation — Desktop Pill (>768px) & Mobile Responsive Header Bar (<=768px) */}
        <header className="site-header">
          {/* Desktop Navigation (Exact original design) */}
          <nav className="navigation desktop-navigation" aria-label="Main navigation">
            {navSections.map((sec) => (
              <a key={sec.slug} href={`#${sec.slug}`}>{sec.name}</a>
            ))}
          </nav>

          {/* Mobile Header Bar */}
          <div className="mobile-header-bar">
            <a
              href="#hero"
              className="mobile-brand"
              onClick={(e) => {
                e.preventDefault();
                setMobileMenuOpen(false);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            >
              {heroName}
            </a>

            <button
              type="button"
              className={`mobile-menu-toggle${isMobileMenuOpen ? ' is-open' : ''}`}
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={isMobileMenuOpen}
              aria-controls="mobile-nav-drawer"
            >
              <span className="hamburger-line" />
              <span className="hamburger-line" />
              <span className="hamburger-line" />
            </button>
          </div>

          {/* Mobile Navigation Backdrop Overlay */}
          {isMobileMenuOpen && (
            <div
              className="mobile-nav-overlay"
              onClick={() => setMobileMenuOpen(false)}
              aria-hidden="true"
            />
          )}

          {/* Mobile Navigation Drawer */}
          <div
            id="mobile-nav-drawer"
            className={`mobile-nav-drawer${isMobileMenuOpen ? ' is-open' : ''}`}
            aria-hidden={!isMobileMenuOpen}
          >
            <div className="mobile-nav-header">
              <span className="mobile-nav-title">Navigation</span>
              <button
                type="button"
                className="mobile-nav-close"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Close menu"
              >
                ✕
              </button>
            </div>
            <nav className="mobile-nav-list" aria-label="Mobile navigation">
              {navSections.map((sec) => (
                <a
                  key={sec.slug}
                  href={`#${sec.slug}`}
                  className="mobile-nav-link"
                  onClick={(e) => {
                    e.preventDefault();
                    handleNavClick(sec.slug);
                  }}
                >
                  {sec.name}
                </a>
              ))}
            </nav>
          </div>
        </header>

        {/* Intro text — text-shadow only for readability, no background panel */}
        <section className="intro" aria-labelledby="intro-name">
          <p className="greeting">{greeting}</p>
          <h1 id="intro-name" className="name">{heroName}</h1>
          <p className="biography">
            <strong>{tagline}</strong>
            <br />
            {description}
          </p>
          <div className="actions">
            {showResume && (
              <a
                className="action action-primary"
                href="/api/public/resume/download"
                onClick={handleResumeClick}
                title="Download resume PDF"
              >
                {resumeLabel} <span className="action-icon" aria-hidden="true">↗</span>
              </a>
            )}
            <a
              className="action action-glass"
              href="#contact"
              onClick={(e) => {
                e.preventDefault();
                const contactEl = document.getElementById('contact');
                if (contactEl) {
                  contactEl.scrollIntoView({ behavior: 'smooth' });
                } else {
                  window.location.hash = '#contact';
                }
              }}
            >
              {talkLabel} <span className="action-icon" aria-hidden="true">↗</span>
            </a>
          </div>
        </section>
      </main>

      {/* ═══════════════════════════════════════════════ */}
      {/* PORTFOLIO SECTIONS — built dynamically from DB */}
      {/* ═══════════════════════════════════════════════ */}
      <div className="portfolio-body">
        {visibleSections.map((section) => {
          const Component = BUILT_IN_SECTIONS[section.type] || BUILT_IN_SECTIONS[section.slug];
          if (Component) {
            return <Component key={section.id || section.slug} section={section} data={data} />;
          }
          return <CustomSection key={section.id || section.slug} section={section} />;
        })}

        <Footer siteSettings={siteSettings} />
      </div>
    </div>
  );
}
