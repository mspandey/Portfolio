import React, { useEffect, useRef } from 'react';
import characterVideoUrl from '../character-scrub.mp4?url';

import useCanvasCharacter from './components/hero/useCanvasCharacter.js';

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

function App() {
  const canvasRef = useRef(null);
  const cursorDotRef = useRef(null);
  const cursorAuraRef = useRef(null);

  useCanvasCharacter(canvasRef);
  useMagneticCursor(cursorDotRef, cursorAuraRef);

  return (
    <main className="hero" id="work">
      <div className="video-stage">
        <canvas
          ref={canvasRef}
          className="portrait-video portrait-canvas"
          aria-label="Character portrait canvas"
        />
      </div>

      <header className="site-header">
        <nav className="navigation" aria-label="Main navigation">
          <a href="#work">Work</a>
          <a href="#about">About</a>
          <a href="mailto:?subject=Hello%20Amisha">Contact</a>
        </nav>
      </header>

      <section className="intro" id="about" aria-labelledby="intro-title">
        <p className="greeting">Hi, I&apos;m</p>
        <h1 id="intro-title" className="name">Amisha Pandey</h1>
        <p className="biography">
          <strong>Where data meets intelligence.</strong><br />
          I work with databases, AI/ML &amp; systems that solve real problems.<br />
          <strong>Building things that think, learn, and work.</strong>
        </p>
        <div className="actions">
          <a
            className="action action-primary"
            href="mailto:?subject=Resume%20request%20for%20Amisha%20Pandey"
          >
            Resume <span className="action-icon" aria-hidden="true">↗</span>
          </a>
          <a className="action action-glass" href="mailto:?subject=Hello%20Amisha">
            Let&apos;s Talk <span className="action-icon" aria-hidden="true">↗</span>
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

export default App;