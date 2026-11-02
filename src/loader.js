/**
 * ============================================================================
 * CINEMATIC TYPOGRAPHY & VERMILION BEAM LOADING SYSTEM
 * Ashwath Shiva P — AI Engineer & Developer Portfolio
 * 
 * Art Direction:
 *   - Reference 1: Bold monumental uppercase editorial typography filling the screen.
 *   - Reference 2: Cinematic vermilion-red beam cutting diagonally through obsidian depth.
 * 
 * Performance & Robustness:
 *   - Genuine resource tracking (document.fonts, critical viewport images, DOM ready).
 *   - Short minimum presentation (~750ms) preventing flicker on instant cache.
 *   - Session-aware: internal page navigation bypasses full intro.
 *   - bfcache & pageshow support for instant back/forward navigation.
 *   - prefers-reduced-motion accessible fallback.
 *   - Hard safety timeout (2.4s) ensuring visitor is never trapped.
 * ============================================================================
 */

import { gsap } from 'gsap';

export function initCinematicLoader(options = {}) {
  const onComplete = options.onComplete || (() => {});
  const loaderEl = document.getElementById('cinematic-loader');

  // If no loader element on this page, invoke completion immediately
  if (!loaderEl) {
    onComplete();
    return;
  }

  // Check URL parameters for forced replay (?intro=1 or ?replay=1)
  let forceReplay = false;
  try {
    const params = new URLSearchParams(window.location.search);
    forceReplay = params.has('intro') || params.has('replay');
  } catch (err) {
    forceReplay = false;
  }

  // Session check: do not replay the full cinematic intro on internal navigation
  let alreadyLoaded = false;
  try {
    if (forceReplay) {
      sessionStorage.removeItem('ashwath_portfolio_loaded');
    } else {
      alreadyLoaded = sessionStorage.getItem('ashwath_portfolio_loaded') === 'true';
    }
  } catch (err) {
    alreadyLoaded = false;
  }

  // Function to dismiss loader immediately with zero animation
  function dismissInstantly() {
    try {
      loaderEl.style.display = 'none';
      loaderEl.setAttribute('aria-hidden', 'true');
      document.documentElement.classList.remove('loader-active');
      document.body.classList.remove('loader-active');
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    } catch (e) {
      // noop
    }
    onComplete();
  }

  // If session has already viewed the intro, bypass immediately
  if (alreadyLoaded) {
    dismissInstantly();
    return;
  }

  // Handle browser back/forward navigation (bfcache / pageshow)
  const onPageShow = (event) => {
    if (event.persisted || (window.performance && performance.getEntriesByType('navigation')[0]?.type === 'back_forward')) {
      dismissInstantly();
    }
  };
  window.addEventListener('pageshow', onPageShow, { once: true });

  // Lock scrolling while loader is active
  document.documentElement.classList.add('loader-active');
  document.body.classList.add('loader-active');
  document.body.style.overflow = 'hidden';
  document.documentElement.style.overflow = 'hidden';

  // Check for reduced motion preference
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Cache interactive loader elements
  const progressBar = document.getElementById('loader-progress-bar');
  const progressRail = document.getElementById('loader-progress-rail');
  const counterEl = document.getElementById('loader-counter');
  const statusEl = document.getElementById('loader-status-text');
  const tickerEl = document.getElementById('loader-ticker');
  const beamEl = loaderEl.querySelector('.loader-beam');
  const typeRows = loaderEl.querySelectorAll('.loader-type-row');
  const typeIllums = loaderEl.querySelectorAll('.type-illum');
  const ambientGlow = loaderEl.querySelector('.loader-ambient-glow');

  let isDismissed = false;
  const startTime = performance.now();
  const MIN_DISPLAY_TIME = prefersReduced ? 150 : 750; // Short presentation to avoid flash
  const MAX_SAFETY_TIMEOUT = 2400; // Hard fail-safe ceiling

  let targetProgress = 15;
  let currentProgress = 0;
  let progressAnimFrame = null;

  // Status message mappings
  function getStatusMessage(pct) {
    if (pct < 30) return 'INITIALIZING CORE RUNTIME';
    if (pct < 65) return 'HYDRATING ASSETS & TYPOGRAPHY';
    if (pct < 90) return 'CALIBRATING GRAPHICS ENGINE';
    return 'SYSTEM ONLINE // PORTFOLIO READY';
  }

  function getTickerText(pct) {
    if (pct < 30) return 'RUNTIME: ACTIVE // MEM: 64MB // RES: 1080P';
    if (pct < 65) return 'FONTS: MOUNTED // ASSETS: STREAMING';
    if (pct < 90) return 'SHAPES: COMPILED // SHADERS: OPTIMIZED';
    return 'LATENCY: 0.4MS // STATUS: 100% OPERATIONAL';
  }

  // Smooth progress loop
  function updateProgress() {
    if (isDismissed) return;

    // Smooth lerp toward target progress
    currentProgress += (targetProgress - currentProgress) * 0.14;
    if (Math.abs(targetProgress - currentProgress) < 0.3) {
      currentProgress = targetProgress;
    }

    const displayPct = Math.min(100, Math.round(currentProgress));

    if (progressBar) {
      progressBar.style.width = `${displayPct}%`;
    }
    if (progressRail) {
      progressRail.setAttribute('aria-valuenow', String(displayPct));
    }
    if (counterEl) {
      counterEl.textContent = `${displayPct < 10 ? '0' : ''}${displayPct}%`;
    }
    if (statusEl) {
      statusEl.textContent = getStatusMessage(displayPct);
    }
    if (tickerEl && tickerEl.textContent !== getTickerText(displayPct)) {
      tickerEl.textContent = getTickerText(displayPct);
    }

    if (currentProgress < 100 || targetProgress < 100) {
      progressAnimFrame = requestAnimationFrame(updateProgress);
    }
  }
  progressAnimFrame = requestAnimationFrame(updateProgress);

  // Safety timer to prevent any freeze/lock
  const safetyTimeout = setTimeout(() => {
    if (!isDismissed) {
      completeLoadingSequence();
    }
  }, MAX_SAFETY_TIMEOUT);

  // Measure genuine resources
  function monitorResources() {
    // 1. DOM Content Ready
    targetProgress = Math.max(targetProgress, 35);

    // 2. Critical Fonts
    const fontPromise = document.fonts ? document.fonts.ready : Promise.resolve();

    // 3. Critical Above-the-fold Images
    const images = Array.from(document.querySelectorAll('img')).slice(0, 5);
    const imagePromises = images.map(img => {
      if (img.complete && img.naturalWidth > 0) return Promise.resolve();
      return new Promise(resolve => {
        const onDone = () => resolve();
        img.addEventListener('load', onDone, { once: true });
        img.addEventListener('error', onDone, { once: true });
        setTimeout(onDone, 1200); // Per-image safety
      });
    });

    // 4. ShapeGrid or canvas initialization
    const canvasPromise = new Promise(resolve => {
      // Give canvas 100ms to mount first frame if on hero
      setTimeout(resolve, 100);
    });

    // Track font resolution
    fontPromise
      .then(() => {
        targetProgress = Math.max(targetProgress, 65);
      })
      .catch(() => {});

    // Track all critical dependencies
    Promise.all([fontPromise, Promise.all(imagePromises), canvasPromise])
      .then(() => {
        targetProgress = 100;
        const elapsed = performance.now() - startTime;
        const remainingTime = Math.max(0, MIN_DISPLAY_TIME - elapsed);

        setTimeout(() => {
          completeLoadingSequence();
        }, remainingTime);
      })
      .catch(() => {
        // Fallback on error
        targetProgress = 100;
        completeLoadingSequence();
      });
  }

  // Master GSAP animation sequence
  let loaderTl = null;

  function runEntranceAnimation() {
    if (prefersReduced) {
      // Simple fast opacity reveal for reduced motion
      gsap.to(typeRows, { opacity: 1, duration: 0.3, stagger: 0.05 });
      return;
    }

    loaderTl = gsap.timeline({
      defaults: {
        ease: 'expo.out'
      }
    });

    // 1. Reveal typography lines from behind clipping masks
    loaderTl.fromTo(
      loaderEl.querySelectorAll('.type-text.type-base'),
      {
        yPercent: 110,
        opacity: 0.1
      },
      {
        yPercent: 0,
        opacity: 1,
        duration: 0.85,
        stagger: 0.12,
        ease: 'cubic-bezier(0.16, 1, 0.3, 1)'
      },
      0.05
    );

    // 2. Cinematic beam initial sweep across typography
    if (beamEl) {
      loaderTl.fromTo(
        beamEl,
        {
          xPercent: -120,
          opacity: 0
        },
        {
          xPercent: 40,
          opacity: 1,
          duration: 1.1,
          ease: 'power2.inOut'
        },
        0.1
      );
    }

    // 3. Subtle reactive illumination on typography
    if (typeIllums.length > 0) {
      loaderTl.fromTo(
        typeIllums,
        {
          opacity: 0,
          filter: 'blur(4px)'
        },
        {
          opacity: 0.85,
          filter: 'blur(0px)',
          duration: 0.6,
          stagger: 0.15,
          yoyo: true,
          repeat: 1
        },
        0.3
      );
    }

    // 4. Subtle ambient glow pulse
    if (ambientGlow) {
      loaderTl.fromTo(
        ambientGlow,
        { opacity: 0.2, scale: 0.9 },
        { opacity: 0.65, scale: 1.1, duration: 1.4, ease: 'sine.inOut' },
        0
      );
    }
  }

  // Dismissal and reveal sequence
  function completeLoadingSequence() {
    if (isDismissed) return;
    isDismissed = true;

    clearTimeout(safetyTimeout);
    if (progressAnimFrame) {
      cancelAnimationFrame(progressAnimFrame);
    }

    // Set 100% visual state immediately
    if (progressBar) progressBar.style.width = '100%';
    if (counterEl) counterEl.textContent = '100%';
    if (statusEl) statusEl.textContent = 'SYSTEM ONLINE // LAUNCHING';

    try {
      sessionStorage.setItem('ashwath_portfolio_loaded', 'true');
    } catch (e) {
      // ignore in restricted private browsing
    }

    if (prefersReduced) {
      // Reduced motion: instantaneous clean fade
      gsap.to(loaderEl, {
        opacity: 0,
        duration: 0.25,
        ease: 'power2.out',
        onComplete: () => {
          dismissInstantly();
        }
      });
      return;
    }

    // Premium Cinematic Exit Sequence:
    // 1. Beam makes one final powerful high-speed sweep
    // 2. Overlay wipes away cleanly with editorial clip-path
    // 3. Trigger hero entrance naturally in sync
    const exitTl = gsap.timeline({
      onComplete: () => {
        dismissInstantly();
      }
    });

    if (beamEl) {
      exitTl.to(beamEl, {
        xPercent: 160,
        opacity: 1,
        duration: 0.55,
        ease: 'expo.in'
      }, 0);
    }

    // Typography accelerates slightly and scales with subtle elegance
    exitTl.to(
      loaderEl.querySelector('.loader-typography-stage'),
      {
        opacity: 0,
        scale: 0.97,
        y: -16,
        duration: 0.45,
        ease: 'power3.in'
      },
      0.15
    );

    // Meta bars glide out
    exitTl.to(
      [loaderEl.querySelector('.loader-meta-top'), loaderEl.querySelector('.loader-bottom-console')],
      {
        opacity: 0,
        duration: 0.35,
        ease: 'power2.in'
      },
      0.15
    );

    // Final theatrical curtain wipe: clip-path inset slides up to 100%
    exitTl.to(
      loaderEl,
      {
        clipPath: 'inset(0 0 100% 0)',
        duration: 0.6,
        ease: 'cubic-bezier(0.16, 1, 0.3, 1)'
      },
      0.22
    );

    // Trigger hero entrance naturally right as the curtain starts opening
    setTimeout(() => {
      onComplete();
    }, 280);
  }

  // Start sequence
  try {
    runEntranceAnimation();
    monitorResources();
  } catch (err) {
    console.warn('Loader animation encountered non-fatal error; proceeding to page', err);
    dismissInstantly();
  }
}
