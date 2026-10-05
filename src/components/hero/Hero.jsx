import React, { useEffect, useRef, useState } from 'react';
import characterVideoUrl from '../../../character-scrub.mp4?url';
import useCanvasCharacter from './useCanvasCharacter.js';
import { downloadActiveResume } from '../../api/client.js';

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

export default function Hero({ heroSettings, sections = [], activeResume }) {
  const canvasRef = useRef(null);
  const cursorDotRef = useRef(null);
  const cursorAuraRef = useRef(null);

  const [isSmiling, setIsSmiling] = useState(false);
  useCanvasCharacter(canvasRef, setIsSmiling);
  useMagneticCursor(cursorDotRef, cursorAuraRef);

  const greeting = heroSettings?.greeting || "Hi, I'm";
  const name = heroSettings?.name || "Amisha Pandey";
  const tagline = heroSettings?.tagline || "Where data meets intelligence.";
  const description = heroSettings?.description || "I work with databases, AI/ML & systems that solve real problems. Building things that think, learn, and work.";
  const resumeBtnLabel = heroSettings?.resume_button_label || "Resume ↗";
  const talkBtnLabel = heroSettings?.talk_button_label || "Let's Talk ↗";
  const talkBtnUrl = heroSettings?.talk_button_url || "#contact";

  const handleResumeClick = async (e) => {
    e.preventDefault();
    try {
      await downloadActiveResume();
    } catch (err) {
      alert(err.message || 'No active resume is available.');
    }
  };

  const navSections = (sections || [])
    .filter((s) => s.slug !== 'hero' && (s.is_visible === 1 || s.is_visible === true || s.is_visible === undefined))
    .map((s) => ({
      slug: s.slug,
      name: (s.name || s.slug).toUpperCase(),
    }));

  return (
    <main className="hero" id="hero">
      <div className={`video-stage ${isSmiling ? 'face-smiling' : ''}`}>
        <canvas
          ref={canvasRef}
          className="portrait-video portrait-canvas"
          aria-label="Character portrait canvas"
        />
        {isSmiling && <div className="gaze-smile-glow" aria-hidden="true" />}
      </div>

      <header className="site-header">
        <nav className="navigation" aria-label="Main navigation">
          {navSections.map((sec) => (
            <a key={sec.slug} href={`#${sec.slug}`}>
              {sec.name}
            </a>
          ))}
        </nav>
      </header>

      <section className="intro" id="about-intro" aria-labelledby="intro-title">
        <p className="greeting">{greeting}</p>
        <h1 id="intro-title" className="name">{name}</h1>
        <p className="biography">
          <strong>{tagline}</strong><br />
          {description}
        </p>
        <div className="actions">
          {heroSettings?.resume_button_visible !== 0 && (
            <a
              className="action action-primary"
              href="/api/public/resume/download"
              onClick={handleResumeClick}
              title="Download active PDF resume"
            >
              {resumeBtnLabel}
            </a>
          )}
          <a className="action action-glass" href={talkBtnUrl}>
            {talkBtnLabel}
          </a>
        </div>
      </section>

      <div className="custom-cursor" aria-hidden="true">
        <span className="cursor-aura" ref={cursorAuraRef} />
        <span className="cursor-dot" ref={cursorDotRef} />
      </div>
    </main>
  );
}
