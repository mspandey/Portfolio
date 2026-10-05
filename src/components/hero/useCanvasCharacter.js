import { useEffect } from 'react';

const TOTAL_FRAMES = 64;

/**
 * Natural Continuous Gaze Tracking Hook
 *
 * Uses authentic, crisp high-resolution video frames (64 frames)
 * with continuous 2D inertia for natural, distortion-free gaze tracking.
 * Feeds both desktop mouse and mobile touch into the SAME target coordinate system
 * with ONE continuous animation loop.
 */
export function useCanvasCharacter(canvasRef, setSmiling) {
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return undefined;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let animationFrame = 0;

    // Continuous 2D Target & Current Gaze in normalized range [-1, 1]
    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;

    let isCurrentlySmiling = false;

    // Touch gesture tracking state
    let activeTouchId = null;
    let touchStartX = 0;
    let touchStartY = 0;
    let isScrollingIntent = false;

    // Frame cache
    const frames = [];
    const centerImage = new Image();
    let loadedCount = 0;
    let imagesLoaded = false;

    const drawSingleImage = (img) => {
      if (!canvas.width || !canvas.height) return;
      ctx.fillStyle = '#c0b2a6';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const imgWidth = 1920;
      const imgHeight = 1080;
      const scale = Math.max(canvas.width / imgWidth, canvas.height / imgHeight);
      const drawW = imgWidth * scale;
      const drawH = imgHeight * scale;
      const drawX = (canvas.width - drawW) / 2;
      const drawY = (canvas.height - drawH) / 2;

      ctx.globalAlpha = 1.0;
      ctx.drawImage(img, drawX, drawY, drawW, drawH);
    };

    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(rect.width * dpr);
      canvas.height = Math.floor(rect.height * dpr);

      if (prefersReducedMotion || !imagesLoaded) {
        if (centerImage.complete && centerImage.naturalWidth > 0) {
          drawSingleImage(centerImage);
        }
      }
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // If reduced motion is preferred: keep hero static, load only centerImage, no RAF loop
    if (prefersReducedMotion) {
      centerImage.src = '/frames/center.webp';
      centerImage.onload = () => {
        drawSingleImage(centerImage);
      };

      return () => {
        window.removeEventListener('resize', resizeCanvas);
      };
    }

    // --- Preload authentic video frames & center image ---
    const onImageLoad = () => {
      loadedCount++;
      if (loadedCount >= TOTAL_FRAMES + 1) {
        imagesLoaded = true;
      }
    };

    // Center Image: direct neutral eye contact
    centerImage.src = '/frames/center.webp';
    centerImage.onload = () => {
      drawSingleImage(centerImage);
      onImageLoad();
    };

    // Preload authentic 64 video frames
    for (let i = 0; i < TOTAL_FRAMES; i++) {
      const img = new Image();
      img.src = `/frames/frame_${i}.webp`;
      img.onload = onImageLoad;
      frames.push(img);
    }

    // Face / Eye Interaction Center (50% X, 35% Y of 1920x1080 source image)
    const getFaceCenter = () => {
      const rect = canvas.getBoundingClientRect();
      const scale = Math.max(rect.width / 1920, rect.height / 1080);
      const imgW = 1920 * scale;
      const imgH = 1080 * scale;
      const offsetX = (rect.width - imgW) / 2;
      const offsetY = (rect.height - imgH) / 2;
      return {
        x: rect.left + offsetX + 960 * scale,
        y: rect.top + offsetY + 378 * scale,
        scale,
        rect,
      };
    };

    const isInteractiveElement = (target) => {
      return target instanceof Element && Boolean(target.closest('a, button, input, select, textarea'));
    };

    // Bounded interaction region roughly corresponding to the face / eyes
    const isInsideFaceZone = (clientX, clientY) => {
      const { x: faceCenterX, y: faceCenterY, rect } = getFaceCenter();
      if (rect.bottom < 0 || rect.top > window.innerHeight) return false;

      const hRadius = Math.max(rect.width * 0.40, 120);
      const vRadius = Math.max(rect.height * 0.48, 100);

      const dx = clientX - faceCenterX;
      const dy = clientY - faceCenterY;

      return (dx * dx) / (hRadius * hRadius) + (dy * dy) / (vRadius * vRadius) <= 1.0;
    };

    // Normalizes touch coordinates relative to the face interaction zone
    const updateTouchGaze = (clientX, clientY) => {
      const { x: faceCenterX, y: faceCenterY, rect } = getFaceCenter();
      const hRadius = Math.max(rect.width * 0.40, 120);
      const vRadius = Math.max(rect.height * 0.48, 100);

      const dx = clientX - faceCenterX;
      const dy = clientY - faceCenterY;

      targetX = Math.max(-1, Math.min(1, dx / hRadius));
      targetY = Math.max(-1, Math.min(1, dy / vRadius));

      const rawDist = Math.hypot(dx, dy);
      const deadZoneRadius = Math.min(rect.width, rect.height) * 0.10;
      const smilingNow = rawDist < deadZoneRadius;
      if (smilingNow !== isCurrentlySmiling) {
        isCurrentlySmiling = smilingNow;
        if (setSmiling) setSmiling(smilingNow);
      }
    };

    // --- Single Continuous Render Loop with 2D physical inertia ---
    const render = () => {
      if (canvas.width && canvas.height) {
        if (imagesLoaded) {
          // Physical inertia in 2D space: fluid momentum
          currentX += (targetX - currentX) * 0.10;
          currentY += (targetY - currentY) * 0.10;

          ctx.fillStyle = '#c0b2a6';
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          const imgWidth = 1920;
          const imgHeight = 1080;
          const scale = Math.max(canvas.width / imgWidth, canvas.height / imgHeight);
          const drawW = imgWidth * scale;
          const drawH = imgHeight * scale;
          const drawX = (canvas.width - drawW) / 2;
          const drawY = (canvas.height - drawH) / 2;

          const dist = Math.hypot(currentX, currentY);

          let chosenFrameImg = centerImage;

          if (dist < 0.10) {
            // Direct eye contact (neutral)
            chosenFrameImg = centerImage;
          } else {
            // Continuous clockwise angle from UP (-PI/2)
            const angle = Math.atan2(currentY, currentX);
            let alpha = (angle + Math.PI / 2.0) % (Math.PI * 2.0);
            if (alpha < 0) alpha += Math.PI * 2.0;

            // Continuous float position in 64 authentic video frames
            const floatIdx = (alpha / (Math.PI * 2.0)) * TOTAL_FRAMES;
            const frameIdx = Math.round(floatIdx) % TOTAL_FRAMES;

            chosenFrameImg = frames[frameIdx] || centerImage;
          }

          // Render crisp single frame with 100% opacity (ZERO ghosting / NO double glasses)
          ctx.globalAlpha = 1.0;
          ctx.drawImage(chosenFrameImg, drawX, drawY, drawW, drawH);
        } else if (centerImage.complete && centerImage.naturalWidth > 0) {
          drawSingleImage(centerImage);
        }
      }

      animationFrame = requestAnimationFrame(render);
    };

    // Start single continuous animation loop immediately on all devices
    animationFrame = requestAnimationFrame(render);

    // --- Touch Event Handlers ---
    const onPointerDown = (event) => {
      if (event.pointerType === 'touch') {
        if (isInteractiveElement(event.target)) {
          return;
        }

        if (!isInsideFaceZone(event.clientX, event.clientY)) {
          return;
        }

        activeTouchId = event.pointerId;
        touchStartX = event.clientX;
        touchStartY = event.clientY;
        isScrollingIntent = false;

        updateTouchGaze(event.clientX, event.clientY);
      }
    };

    const onPointerMove = (event) => {
      // Desktop Fine Pointer Gaze Tracking (EXACT ORIGINAL LOGIC)
      if (event.pointerType === 'mouse' || event.pointerType === 'pen') {
        const { x: faceCenterX, y: faceCenterY, rect } = getFaceCenter();

        const dx = event.clientX - faceCenterX;
        const dy = event.clientY - faceCenterY;

        const horizontalRange = Math.max(rect.width * 0.45, window.innerWidth * 0.35, 280);
        const verticalRange = Math.max(rect.height * 0.45, window.innerHeight * 0.35, 240);

        targetX = Math.max(-1, Math.min(1, dx / horizontalRange));
        targetY = Math.max(-1, Math.min(1, dy / verticalRange));

        const rawDist = Math.hypot(dx, dy);
        const deadZoneRadius = Math.min(rect.width, rect.height) * 0.10;
        const smilingNow = rawDist < deadZoneRadius;
        if (smilingNow !== isCurrentlySmiling) {
          isCurrentlySmiling = smilingNow;
          if (setSmiling) setSmiling(smilingNow);
        }
        return;
      }

      // Mobile Touch Handling with Gesture Intent Detection
      if (event.pointerType === 'touch') {
        if (activeTouchId === null || event.pointerId !== activeTouchId || isScrollingIntent) {
          return;
        }

        const moveX = event.clientX - touchStartX;
        const moveY = event.clientY - touchStartY;
        const absX = Math.abs(moveX);
        const absY = Math.abs(moveY);

        // Gesture intent detection:
        // A normal vertical page swipe: abs(dy) > abs(dx) and movement exceeds reasonable threshold (28px)
        if (absY > 28 && absY > absX * 1.25) {
          isScrollingIntent = true;
          activeTouchId = null;
          targetX = 0;
          targetY = 0;
          if (isCurrentlySmiling) {
            isCurrentlySmiling = false;
            if (setSmiling) setSmiling(false);
          }
          return;
        }

        updateTouchGaze(event.clientX, event.clientY);
      }
    };

    const onPointerUp = (event) => {
      if (event.pointerType === 'touch') {
        if (activeTouchId !== null && event.pointerId === activeTouchId) {
          activeTouchId = null;
          isScrollingIntent = false;
          targetX = 0;
          targetY = 0;
          if (isCurrentlySmiling) {
            isCurrentlySmiling = false;
            if (setSmiling) setSmiling(false);
          }
        }
      }
    };

    const onPointerCancel = (event) => {
      if (event.pointerType === 'touch') {
        if (activeTouchId !== null && event.pointerId === activeTouchId) {
          activeTouchId = null;
          isScrollingIntent = false;
          targetX = 0;
          targetY = 0;
          if (isCurrentlySmiling) {
            isCurrentlySmiling = false;
            if (setSmiling) setSmiling(false);
          }
        }
      }
    };

    const onMouseLeave = () => {
      targetX = 0;
      targetY = 0;
      if (isCurrentlySmiling) {
        isCurrentlySmiling = false;
        if (setSmiling) setSmiling(false);
      }
    };

    window.addEventListener('pointerdown', onPointerDown, { passive: true });
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerup', onPointerUp, { passive: true });
    window.addEventListener('pointercancel', onPointerCancel, { passive: true });
    document.documentElement.addEventListener('mouseleave', onMouseLeave);

    return () => {
      cancelAnimationFrame(animationFrame);
      window.removeEventListener('resize', resizeCanvas);
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerCancel);
      document.documentElement.removeEventListener('mouseleave', onMouseLeave);
    };
  }, [canvasRef, setSmiling]);
}

export default useCanvasCharacter;
