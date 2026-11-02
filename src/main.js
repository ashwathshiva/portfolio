import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
  createIcons,
  ArrowUpRight,
  ArrowRight,
  Download,
  FileText,
  Award,
  ExternalLink,
  Mail,
  Github,
  Linkedin,
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  Sparkles,
  Terminal,
  Code2,
  Cpu,
  Database,
  CheckCircle2,
  BookOpen,
  FolderGit2,
  Compass,
  MapPin
} from 'lucide';

import { initShapeGrid } from './shapeGrid.js';
import { initCinematicLoader } from './loader.js';
import { initAmbientAudio } from './audio.js';
import { initSoftNavigation } from './router.js';

gsap.registerPlugin(ScrollTrigger);

// Module-level shared state initialized safely before application boot
let heroEntranceRan = false;
let scrollChoreographyCtx = null;
let scrollLifecycleInitialized = false;
let navScrollListenersAttached = false;
let updateScrollStateFn = null;
let heroShapeGridInstance = null;

// Initialize Lucide icons
function initIcons() {
  createIcons({
    icons: {
      ArrowUpRight,
      ArrowRight,
      Download,
      FileText,
      Award,
      ExternalLink,
      Mail,
      Github,
      Linkedin,
      ArrowLeft,
      ArrowUp,
      ArrowDown,
      Sparkles,
      Terminal,
      Code2,
      Cpu,
      Database,
      CheckCircle2,
      BookOpen,
      FolderGit2,
      Compass,
      MapPin
    }
  });
}

function bootApplication() {
  initIcons();
  setupNavigation();
  setupHeroGrid();
  setupScrollChoreography();
  setupPointerAccent();
  setupSmoothScroll();
  initScrollLifecycle();
  initAmbientAudio();

  // Initialize soft navigation router for continuous seamless audio across all internal pages
  initSoftNavigation((targetUrl) => {
    initIcons();
    setupNavigation();
    setupHeroGrid();
    setupScrollChoreography();
    setupSmoothScroll();
    bindPointerHoverTargets();

    requestAnimationFrame(() => {
      ScrollTrigger.refresh();
      ensureInViewVisible();
    });
  });

  initCinematicLoader({
    onComplete: () => {
      setupHeroEntrance();
    }
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootApplication);
} else {
  bootApplication();
}

/* ==========================================================================
   Hero Ambient Background — React Bits ShapeGrid (1:1 Vanilla Canvas Adaptation)
   ========================================================================== */
function setupHeroGrid() {
  const container = document.getElementById('hero-shape-grid');
  if (!container) {
    if (heroShapeGridInstance) {
      heroShapeGridInstance.destroy();
      heroShapeGridInstance = null;
    }
    return;
  }

  // If an instance is already active, cleanly destroy it before re-initialization
  if (heroShapeGridInstance) {
    heroShapeGridInstance.destroy();
    heroShapeGridInstance = null;
  }

  // Clean out any stale/dead canvas elements (e.g. from cached HTML restorations)
  const existingCanvas = container.querySelector('canvas');
  if (existingCanvas) {
    existingCanvas.remove();
  }

  heroShapeGridInstance = initShapeGrid(container, {
    shape: 'square',
    cellSize: 40,
    lineWidth: 1,
    direction: 'diagonal',
    speed: 0.35,
    lineColor: '#282523',
    hoverColor: '#FF4938',
    hoverFillColor: '#FF4938',
    fillOpacity: 0.12,
    rainbow: false,
    tiltX: 0,
    tiltY: 0,
    radius: 1.8,
    trail: 0.65,
    glow: 0.35,
    twinkle: 0.04,
    fade: 1,
    clickCascade: true,
    intro: true,
    opacity: 1,
    backgroundColor: 'transparent'
  });
}

/* ==========================================================================
   Navigation & Active Section Tracking (Robust Geometric Scrollspy)
   ========================================================================== */
function setupNavigation() {
  const navHeader = document.querySelector('.nav-header');
  const mobileToggle = document.querySelector('.mobile-nav-toggle');
  const mobileDrawer = document.querySelector('.mobile-nav-drawer');
  const mobileLinks = document.querySelectorAll('.mobile-nav-link');
  const desktopLinks = document.querySelectorAll('.nav-link-item a');
  const brandLink = document.getElementById('nav-brand');
  const sectionIds = ['hero', 'about', 'projects', 'skills', 'credentials', 'contact'];

  // Mobile drawer toggle (operable across all pages)
  if (mobileToggle && !mobileToggle.__hasDrawerBound) {
    mobileToggle.__hasDrawerBound = true;
    mobileToggle.addEventListener('click', () => {
      const isOpen = mobileDrawer?.classList.toggle('open');
      mobileToggle.classList.toggle('open');
      mobileToggle.setAttribute('aria-expanded', String(isOpen));
      document.body.style.overflow = isOpen ? 'hidden' : '';

      if (isOpen) {
        const firstLink = mobileDrawer?.querySelector('a');
        firstLink?.focus();
      } else {
        mobileToggle.focus();
      }
    });
  }

  // Identify sections available on the current page
  const sectionElements = sectionIds
    .map(id => ({ id, el: document.getElementById(id) }))
    .filter(item => item.el !== null);

  // If page doesn't have these sections (e.g., secondary standalone pages), preserve static links
  if (sectionElements.length === 0) return;

  let isClickScrolling = false;
  let clickTimeout = null;
  let currentActiveId = '';

  // Function to set active section class and aria-current across desktop & mobile
  function setActiveSection(targetId) {
    if (!targetId || currentActiveId === targetId) return;
    currentActiveId = targetId;

    desktopLinks.forEach(link => {
      const href = link.getAttribute('href') || '';
      const linkTarget = href.split('#')[1] || '';
      const isActive = linkTarget === targetId;

      if (isActive) {
        link.classList.add('active');
        link.setAttribute('aria-current', 'location');
      } else {
        link.classList.remove('active');
        link.removeAttribute('aria-current');
      }
    });

    mobileLinks.forEach(link => {
      const href = link.getAttribute('href') || '';
      const linkTarget = href.split('#')[1] || '';
      const isActive = linkTarget === targetId;

      if (isActive) {
        link.classList.add('active');
        link.setAttribute('aria-current', 'location');
      } else {
        link.classList.remove('active');
        link.removeAttribute('aria-current');
      }
    });
  }

  // Robust determination of currently active section regardless of height differences
  function determineActiveSection() {
    const scrollY = window.pageYOffset || document.documentElement.scrollTop;
    const windowHeight = window.innerHeight;
    const docHeight = document.documentElement.scrollHeight;

    // 1. Top boundary check: near top of page always highlights Home
    if (scrollY < 90) {
      return 'hero';
    }

    // 2. Bottom boundary check: reaching near end of page always highlights Contact
    if (scrollY + windowHeight >= docHeight - 70) {
      return 'contact';
    }

    // 3. Contact section proximity check: if contact is significantly in view
    const contactItem = sectionElements.find(item => item.id === 'contact');
    if (contactItem) {
      const contactRect = contactItem.el.getBoundingClientRect();
      if (contactRect.top <= windowHeight * 0.65) {
        return 'contact';
      }
    }

    // 4. Reading trigger line in viewport:
    // When scrolling, active section is the one intersecting the active reading zone
    // below the 68px sticky header
    const triggerOffset = Math.min(220, windowHeight * 0.32);

    let activeId = sectionElements[0].id;
    for (let i = 0; i < sectionElements.length; i++) {
      const { id, el } = sectionElements[i];
      const rect = el.getBoundingClientRect();
      if (rect.top <= triggerOffset) {
        activeId = id;
      } else {
        break;
      }
    }

    return activeId;
  }

  // Throttled scroll listener using requestAnimationFrame
  let ticking = false;
  function updateScrollState() {
    const scrollY = window.pageYOffset || document.documentElement.scrollTop;

    // Sticky nav header visual transition
    if (scrollY > 30) {
      navHeader?.classList.add('scrolled');
    } else {
      navHeader?.classList.remove('scrolled');
    }

    if (isClickScrolling) return;

    if (!ticking) {
      requestAnimationFrame(() => {
        const activeId = determineActiveSection();
        setActiveSection(activeId);
        ticking = false;
      });
      ticking = true;
    }
  }

  updateScrollStateFn = updateScrollState;

  if (!navScrollListenersAttached) {
    navScrollListenersAttached = true;
    window.addEventListener('scroll', () => updateScrollStateFn?.(), { passive: true });
    window.addEventListener('resize', () => updateScrollStateFn?.(), { passive: true });

    // Reset click-scroll lock on manual user interaction
    window.addEventListener('wheel', () => { isClickScrolling = false; }, { passive: true });
    window.addEventListener('touchmove', () => { isClickScrolling = false; }, { passive: true });

    // Close mobile drawer on Escape key
    window.addEventListener('keydown', (e) => {
      const drawer = document.querySelector('.mobile-nav-drawer');
      const toggle = document.querySelector('.mobile-nav-toggle');
      if (e.key === 'Escape' && drawer?.classList.contains('open')) {
        drawer.classList.remove('open');
        toggle?.classList.remove('open');
        toggle?.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
        toggle?.focus();
      }
    });
  }

  // Handle direct navigation link clicks smoothly
  function handleLinkClick(e, link) {
    const href = link.getAttribute('href') || '';
    const hashIndex = href.indexOf('#');
    
    if (hashIndex !== -1) {
      const targetId = href.substring(hashIndex + 1);
      const targetEl = document.getElementById(targetId);

      if (targetEl) {
        e.preventDefault();
        isClickScrolling = true;
        setActiveSection(targetId);

        clearTimeout(clickTimeout);
        clickTimeout = setTimeout(() => {
          isClickScrolling = false;
        }, 900);

        const headerOffset = 68;
        const targetPos = targetEl.getBoundingClientRect().top + window.pageYOffset - headerOffset;

        window.scrollTo({
          top: targetPos,
          behavior: 'smooth'
        });

        // Close mobile drawer if open
        if (mobileDrawer?.classList.contains('open')) {
          mobileDrawer.classList.remove('open');
          mobileToggle?.classList.remove('open');
          mobileToggle?.setAttribute('aria-expanded', 'false');
          document.body.style.overflow = '';
        }

        if (history.pushState) {
          history.pushState(null, '', `#${targetId}`);
        }
      }
    }
  }

  desktopLinks.forEach(link => {
    link.addEventListener('click', (e) => handleLinkClick(e, link));
  });

  mobileLinks.forEach(link => {
    link.addEventListener('click', (e) => handleLinkClick(e, link));
  });

  if (brandLink) {
    brandLink.addEventListener('click', (e) => {
      const href = brandLink.getAttribute('href') || '';
      if (href.includes('#hero')) {
        handleLinkClick(e, brandLink);
      }
    });
  }

  // Smooth scroll for in-page anchors outside nav (hero buttons, scroll cues)
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    if (!link.closest('.nav-links') && !link.closest('.mobile-nav-drawer') && link !== brandLink) {
      link.addEventListener('click', (e) => handleLinkClick(e, link));
    }
  });

  // Mobile drawer toggle
  mobileToggle?.addEventListener('click', () => {
    const isOpen = mobileDrawer?.classList.toggle('open');
    mobileToggle.classList.toggle('open');
    mobileToggle.setAttribute('aria-expanded', String(isOpen));
    document.body.style.overflow = isOpen ? 'hidden' : '';

    if (isOpen) {
      const firstLink = mobileDrawer?.querySelector('a');
      firstLink?.focus();
    } else {
      mobileToggle.focus();
    }
  });

  // Close mobile drawer on Escape key
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && mobileDrawer?.classList.contains('open')) {
      mobileDrawer.classList.remove('open');
      mobileToggle?.classList.remove('open');
      mobileToggle?.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
      mobileToggle?.focus();
    }
  });

  // Initial calculation on page load
  const initialHash = window.location.hash ? window.location.hash.substring(1) : '';
  const initialSection = sectionIds.includes(initialHash) ? initialHash : determineActiveSection();
  setActiveSection(initialSection || 'hero');
}

/* ==========================================================================
   Hero Entrance Sequence (Samana Principle 01 & 02)
   Coordinated reveal with cubic-bezier(.16, 1, .3, 1) / expo.out
   ========================================================================== */
function setupHeroEntrance() {
  if (heroEntranceRan) return;
  const heroHeadline = document.querySelector('.hero-headline');
  if (!heroHeadline) return;
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReduced) return;
  heroEntranceRan = true;

  const heroTl = gsap.timeline({
    defaults: {
      ease: 'expo.out'
    }
  });

  // Display typography reveals cleanly without clipping
  heroTl.fromTo('.hero-headline', 
    { opacity: 0, y: 24 }, 
    { opacity: 1, y: 0, duration: 0.9 }, 
    '+=0.08'
  );

  heroTl.fromTo('.hero-subhead', 
    { opacity: 0, y: 16 }, 
    { opacity: 1, y: 0, duration: 0.7 }, 
    '-=0.5'
  );

  // 3. Supporting copy & actions
  heroTl.fromTo('.hero-description', 
    { opacity: 0, y: 12 }, 
    { opacity: 1, y: 0, duration: 0.6 }, 
    '-=0.4'
  );

  heroTl.fromTo('.hero-actions .btn', 
    { opacity: 0, y: 12 }, 
    { opacity: 1, y: 0, stagger: 0.08, duration: 0.5 }, 
    '-=0.4'
  );

  // 4. Cinematic visual reveal
  heroTl.fromTo('.hero-visual-frame', 
    { opacity: 0, scale: 0.98 }, 
    { opacity: 1, scale: 1, duration: 1 }, 
    '-=0.5'
  );

  // 6. Scroll cue
  heroTl.fromTo('.hero-bottom-cue', 
    { opacity: 0 }, 
    { opacity: 1, duration: 0.5 }, 
    '-=0.3'
  );

  // If user lands already scrolled down (e.g. back navigation or hash link), fast-forward hero entrance
  if ((window.pageYOffset || document.documentElement.scrollTop) > 100) {
    heroTl.progress(1);
  }
}

/* ==========================================================================
   Premium Scroll-Reveal Animations — Editorial & Cinematic Experience
   Inspired by Dribbble high-impact creative portfolio motion design:
   - Coordinated side-to-side and staggered text reveals
   - Cinematic image aperture reveals with scale & directional translation
   - Staggered card cascades with clear visual hierarchy
   - One-time triggers, GPU-accelerated transforms, zero layout shifts
   ========================================================================== */

function setupScrollChoreography() {
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReduced) return;

  // Clean up any prior context / ScrollTriggers to prevent duplicates
  if (scrollChoreographyCtx) {
    scrollChoreographyCtx.revert();
  }

  scrollChoreographyCtx = gsap.context(() => {
    const isMobile = window.innerWidth < 768;
    const ease = 'power3.out';
    const toggleActions = 'play complete none none';

    // 1. Gentle subtle parallax on hero image
    const heroImg = document.querySelector('.hero-visual-frame img');
    if (heroImg) {
      gsap.to(heroImg, {
        y: 28,
        ease: 'none',
        scrollTrigger: {
          trigger: '.hero-section',
          start: 'top top',
          end: 'bottom top',
          scrub: 1
        }
      });
    }

    // 2. Section Header Rows (Editorial Eyebrow, Display Heading, Section Lead)
    const headerRows = document.querySelectorAll('.section-header-row, .page-header-editorial');
    headerRows.forEach((row) => {
      const eyebrow = row.querySelector('.editorial-eyebrow');
      const heading = row.querySelector('.display-heading, .contact-display-heading, h1, h2');
      const lead = row.querySelector('.section-lead, .page-subtitle, .contact-lead-text');
      const action = row.querySelector('.btn, .page-back-link');

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: row,
          start: 'top 86%',
          toggleActions
        }
      });

      if (eyebrow) {
        tl.fromTo(
          eyebrow,
          { opacity: 0, x: isMobile ? -14 : -30 },
          { opacity: 1, x: 0, duration: 0.8, ease }
        );
      }
      if (heading) {
        tl.fromTo(
          heading,
          { opacity: 0, x: isMobile ? -10 : -22, y: 16 },
          { opacity: 1, x: 0, y: 0, duration: 0.9, ease },
          eyebrow ? '-=0.6' : '0'
        );
      }
      if (lead) {
        tl.fromTo(
          lead,
          { opacity: 0, y: 20 },
          { opacity: 1, y: 0, duration: 0.8, ease },
          '-=0.65'
        );
      }
      if (action) {
        tl.fromTo(
          action,
          { opacity: 0, y: 14 },
          { opacity: 1, y: 0, duration: 0.7, ease },
          '-=0.6'
        );
      }
    });

    // 3. About Section Content & Visual Workbench
    const aboutGrid = document.querySelector('.about-grid');
    if (aboutGrid) {
      const visualCard = aboutGrid.querySelector('.about-image-card');
      const visualImg = visualCard ? visualCard.querySelector('img') : null;
      const visualCaption = aboutGrid.querySelector('.about-visual-caption');
      const statement = aboutGrid.querySelector('.about-statement');
      const bodyTexts = aboutGrid.querySelectorAll('.about-body-text');
      const facts = aboutGrid.querySelectorAll('.about-fact-item');
      const actionBtns = aboutGrid.querySelectorAll('.about-content-column .btn');

      const aboutTl = gsap.timeline({
        scrollTrigger: {
          trigger: aboutGrid,
          start: 'top 82%',
          toggleActions
        }
      });

      // Left visual column: image slides in from left with subtle camera aperture zoom-settle
      if (visualCard) {
        aboutTl.fromTo(
          visualCard,
          { opacity: 0, x: isMobile ? -16 : -36 },
          { opacity: 1, x: 0, duration: 0.95, ease }
        );
        if (visualImg) {
          aboutTl.fromTo(
            visualImg,
            { scale: 1.05 },
            { scale: 1.0, duration: 1.15, ease },
            '<'
          );
        }
        if (visualCaption) {
          aboutTl.fromTo(
            visualCaption,
            { opacity: 0, y: 10 },
            { opacity: 1, y: 0, duration: 0.6, ease },
            '-=0.6'
          );
        }
      }

      // Right content column: statement and narrative slide in with stagger
      if (statement) {
        aboutTl.fromTo(
          statement,
          { opacity: 0, x: isMobile ? 14 : 26, y: 12 },
          { opacity: 1, x: 0, y: 0, duration: 0.85, ease },
          visualCard ? '-=0.75' : '0'
        );
      }

      if (bodyTexts.length) {
        aboutTl.fromTo(
          bodyTexts,
          { opacity: 0, y: 18 },
          { opacity: 1, y: 0, duration: 0.75, stagger: 0.1, ease },
          '-=0.6'
        );
      }

      if (facts.length) {
        aboutTl.fromTo(
          facts,
          { opacity: 0, y: 22 },
          { opacity: 1, y: 0, duration: 0.7, stagger: 0.08, ease },
          '-=0.55'
        );
      }

      if (actionBtns.length) {
        aboutTl.fromTo(
          actionBtns,
          { opacity: 0, y: 14 },
          { opacity: 1, y: 0, duration: 0.6, stagger: 0.08, ease },
          '-=0.5'
        );
      }
    }

    // 4. Featured Project Case Studies (Cinematic Alternating Direction Reveals)
    const caseStudies = document.querySelectorAll('.case-study');
    caseStudies.forEach((study, idx) => {
      const isEven = idx % 2 === 1; // Alternating cadence: 0=odd(left-to-right), 1=even(right-to-left)
      const topbar = study.querySelector('.case-study-topbar');
      const body = study.querySelector('.case-study-body');
      const visual = study.querySelector('.case-study-visual');
      const img = visual ? visual.querySelector('img') : null;
      const tags = study.querySelectorAll('.tech-tag');
      const actions = study.querySelector('.case-study-actions');

      const studyTl = gsap.timeline({
        scrollTrigger: {
          trigger: study,
          start: 'top 82%',
          toggleActions
        }
      });

      // Topbar header enters first
      if (topbar) {
        studyTl.fromTo(
          topbar,
          { opacity: 0, y: -14 },
          { opacity: 1, y: 0, duration: 0.6, ease }
        );
      }

      // Alternating horizontal reveal direction
      if (isEven) {
        // Even: Visual enters from left, Body enters from right
        if (visual) {
          studyTl.fromTo(
            visual,
            { opacity: 0, x: isMobile ? -16 : -34 },
            { opacity: 1, x: 0, duration: 0.95, ease },
            topbar ? '-=0.4' : '0'
          );
          if (img) {
            studyTl.fromTo(
              img,
              { scale: 1.05 },
              { scale: 1.0, duration: 1.15, ease },
              '<'
            );
          }
        }

        if (body) {
          studyTl.fromTo(
            body,
            { opacity: 0, x: isMobile ? 16 : 30 },
            { opacity: 1, x: 0, duration: 0.9, ease },
            visual ? '-=0.75' : '0'
          );
        }
      } else {
        // Odd: Body enters from left, Visual enters from right
        if (body) {
          studyTl.fromTo(
            body,
            { opacity: 0, x: isMobile ? -16 : -32 },
            { opacity: 1, x: 0, duration: 0.9, ease },
            topbar ? '-=0.4' : '0'
          );
        }

        if (visual) {
          studyTl.fromTo(
            visual,
            { opacity: 0, x: isMobile ? 16 : 34 },
            { opacity: 1, x: 0, duration: 0.95, ease },
            body ? '-=0.75' : '0'
          );
          if (img) {
            studyTl.fromTo(
              img,
              { scale: 1.05 },
              { scale: 1.0, duration: 1.15, ease },
              '<'
            );
          }
        }
      }

      if (tags.length) {
        studyTl.fromTo(
          tags,
          { opacity: 0, y: 10 },
          { opacity: 1, y: 0, duration: 0.5, stagger: 0.04, ease },
          '-=0.6'
        );
      }

      if (actions) {
        studyTl.fromTo(
          actions,
          { opacity: 0, y: 12 },
          { opacity: 1, y: 0, duration: 0.6, ease },
          '-=0.5'
        );
      }
    });

    // Projects CTA Box
    const projectsCta = document.querySelector('.projects-cta-box');
    if (projectsCta) {
      gsap.fromTo(
        projectsCta,
        { opacity: 0, y: 28 },
        {
          opacity: 1,
          y: 0,
          duration: 0.85,
          ease,
          scrollTrigger: {
            trigger: projectsCta,
            start: 'top 85%',
            toggleActions
          }
        }
      );
    }

    // 5. Technical Skills (Staggered Grid of 6 Category Cards)
    const skillsGrid = document.querySelector('.skills-grid');
    if (skillsGrid) {
      const skillCards = skillsGrid.querySelectorAll('.skill-category-card');
      if (skillCards.length) {
        gsap.fromTo(
          skillCards,
          { opacity: 0, y: 28 },
          {
            opacity: 1,
            y: 0,
            duration: 0.8,
            stagger: 0.09,
            ease,
            scrollTrigger: {
              trigger: skillsGrid,
              start: 'top 82%',
              toggleActions
            }
          }
        );
      }
    }

    // 6. Credentials & Experience (Split Container)
    const credsContainer = document.querySelector('.credentials-container-split');
    if (credsContainer) {
      const timelineBlock = credsContainer.querySelector('.cred-timeline-block');
      const credItems = credsContainer.querySelectorAll('.cred-item');
      const certsSummary = credsContainer.querySelector('.certs-summary-block');
      const summaryItems = certsSummary ? certsSummary.querySelectorAll('.summary-cert-item') : [];

      const credsTl = gsap.timeline({
        scrollTrigger: {
          trigger: credsContainer,
          start: 'top 82%',
          toggleActions
        }
      });

      if (timelineBlock) {
        const blockTitle = timelineBlock.querySelector('.cred-block-title');
        if (blockTitle) {
          credsTl.fromTo(
            blockTitle,
            { opacity: 0, x: isMobile ? -12 : -22 },
            { opacity: 1, x: 0, duration: 0.7, ease }
          );
        }
        if (credItems.length) {
          credsTl.fromTo(
            credItems,
            { opacity: 0, x: isMobile ? -14 : -26 },
            { opacity: 1, x: 0, duration: 0.75, stagger: 0.1, ease },
            blockTitle ? '-=0.5' : '0'
          );
        }
      }

      if (certsSummary) {
        credsTl.fromTo(
          certsSummary,
          { opacity: 0, x: isMobile ? 14 : 28 },
          { opacity: 1, x: 0, duration: 0.85, ease },
          timelineBlock ? '-=0.7' : '0'
        );
        if (summaryItems.length) {
          credsTl.fromTo(
            summaryItems,
            { opacity: 0, y: 14 },
            { opacity: 1, y: 0, duration: 0.6, stagger: 0.08, ease },
            '-=0.55'
          );
        }
      }
    }

    // 7. Contact Section (Editorial Collaboration Wrap & Channels)
    const contactWrap = document.querySelector('.contact-editorial-wrap');
    if (contactWrap) {
      const contactEyebrow = contactWrap.querySelector('.editorial-eyebrow');
      const contactHeading = contactWrap.querySelector('.contact-display-heading');
      const contactLead = contactWrap.querySelector('.contact-lead-text');
      const channelCards = contactWrap.querySelectorAll('.channel-card');

      const contactTl = gsap.timeline({
        scrollTrigger: {
          trigger: contactWrap,
          start: 'top 82%',
          toggleActions
        }
      });

      if (contactEyebrow) {
        contactTl.fromTo(
          contactEyebrow,
          { opacity: 0, x: isMobile ? -12 : -24 },
          { opacity: 1, x: 0, duration: 0.75, ease }
        );
      }

      if (contactHeading) {
        contactTl.fromTo(
          contactHeading,
          { opacity: 0, x: isMobile ? -10 : -20, y: 14 },
          { opacity: 1, x: 0, y: 0, duration: 0.85, ease },
          contactEyebrow ? '-=0.55' : '0'
        );
      }

      if (contactLead) {
        contactTl.fromTo(
          contactLead,
          { opacity: 0, y: 18 },
          { opacity: 1, y: 0, duration: 0.75, ease },
          '-=0.6'
        );
      }

      if (channelCards.length) {
        contactTl.fromTo(
          channelCards,
          { opacity: 0, y: 24 },
          { opacity: 1, y: 0, duration: 0.7, stagger: 0.09, ease },
          '-=0.5'
        );
      }
    }

    // 8. Dedicated Subpages Support (Projects Archive, Certificates, Resume)
    const archiveItems = document.querySelectorAll('.project-archive-item');
    archiveItems.forEach((item, idx) => {
      const isEven = idx % 2 === 1;
      const topbar = item.querySelector('.case-study-topbar');
      const body = item.querySelector('.case-study-body');
      const visual = item.querySelector('.project-blueprint-visual, .case-study-visual');
      const img = visual ? visual.querySelector('img') : null;

      const itemTl = gsap.timeline({
        scrollTrigger: {
          trigger: item,
          start: 'top 82%',
          toggleActions
        }
      });

      if (topbar) {
        itemTl.fromTo(topbar, { opacity: 0, y: -12 }, { opacity: 1, y: 0, duration: 0.6, ease });
      }

      if (isEven) {
        if (visual) {
          itemTl.fromTo(visual, { opacity: 0, x: isMobile ? -14 : -30 }, { opacity: 1, x: 0, duration: 0.9, ease }, topbar ? '-=0.4' : '0');
          if (img) itemTl.fromTo(img, { scale: 1.05 }, { scale: 1.0, duration: 1.1, ease }, '<');
        }
        if (body) {
          itemTl.fromTo(body, { opacity: 0, x: isMobile ? 14 : 28 }, { opacity: 1, x: 0, duration: 0.85, ease }, visual ? '-=0.7' : '0');
        }
      } else {
        if (body) {
          itemTl.fromTo(body, { opacity: 0, x: isMobile ? -14 : -30 }, { opacity: 1, x: 0, duration: 0.85, ease }, topbar ? '-=0.4' : '0');
        }
        if (visual) {
          itemTl.fromTo(visual, { opacity: 0, x: isMobile ? 14 : 30 }, { opacity: 1, x: 0, duration: 0.9, ease }, body ? '-=0.7' : '0');
          if (img) itemTl.fromTo(img, { scale: 1.05 }, { scale: 1.0, duration: 1.1, ease }, '<');
        }
      }
    });

    const certCards = document.querySelectorAll('.cert-card-editorial');
    if (certCards.length) {
      gsap.fromTo(
        certCards,
        { opacity: 0, y: 26 },
        {
          opacity: 1,
          y: 0,
          duration: 0.75,
          stagger: 0.08,
          ease,
          scrollTrigger: {
            trigger: certCards[0].parentElement || certCards[0],
            start: 'top 82%',
            toggleActions
          }
        }
      );
    }

    const resumeSections = document.querySelectorAll('.resume-section-editorial, .resume-sheet-editorial');
    resumeSections.forEach((sec) => {
      gsap.fromTo(
        sec,
        { opacity: 0, y: 24 },
        {
          opacity: 1,
          y: 0,
          duration: 0.8,
          ease,
          scrollTrigger: {
            trigger: sec,
            start: 'top 85%',
            toggleActions
          }
        }
      );
    });

    // Immediate viewport visibility check:
    // If the page is loaded/restored already scrolled (browser scroll restoration, anchor navigation, or back button),
    // ensure any element that has already reached or passed its trigger position is completed.
    ensureInViewVisible();
  });
}

/**
 * Ensures any ScrollTrigger-controlled element that is currently within or above the viewport
 * is immediately brought to its completed visual state (preventing stuck opacity: 0 / invisible sections).
 */
function ensureInViewVisible() {
  const vh = window.innerHeight || document.documentElement.clientHeight;
  ScrollTrigger.getAll().forEach((st) => {
    if (st.trigger && st.animation) {
      const rect = st.trigger.getBoundingClientRect();
      if (rect.top <= vh * 0.88) {
        st.animation.totalProgress(1);
      }
    }
  });
}

/**
 * Robust scroll animation lifecycle manager.
 * Handles Back/Forward navigation, bfcache restoration, asset load, and popstate.
 */
function initScrollLifecycle() {
  if (scrollLifecycleInitialized) return;
  scrollLifecycleInitialized = true;

  function refreshAndSync() {
    ScrollTrigger.refresh();
    ensureInViewVisible();
  }

  // Recalculate offsets after all assets, stylesheets, and images load
  window.addEventListener('load', refreshAndSync);

  // Handle browser Back/Forward navigation and Back-Forward Cache (bfcache)
  window.addEventListener('pageshow', () => {
    requestAnimationFrame(() => {
      refreshAndSync();
    });
  });

  // Handle in-page history navigation (popstate)
  window.addEventListener('popstate', () => {
    requestAnimationFrame(() => {
      refreshAndSync();
    });
  });

  // Recalculate once web fonts finish loading (as font metrics shift section offsets)
  if (document.fonts?.ready) {
    document.fonts.ready.then(() => {
      refreshAndSync();
    });
  }
}

/* ==========================================================================
   Restrained Pointer Accent (Samana Principle 06)
   ========================================================================== */
export function resetPointerAccent() {
  const dot = document.querySelector('.cursor-ambient-dot');
  if (dot) {
    dot.classList.remove('hovered');
  }
}

function setupPointerAccent() {
  const isFinePointer = window.matchMedia('(pointer: fine)').matches;
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!isFinePointer || prefersReduced) return;
  if (document.querySelector('.cursor-ambient-dot')) return;

  const dot = document.createElement('div');
  dot.className = 'cursor-ambient-dot';
  document.body.appendChild(dot);

  let currentX = -100;
  let currentY = -100;
  let targetX = -100;
  let targetY = -100;
  let isVisible = false;

  window.addEventListener('pointermove', (e) => {
    targetX = e.clientX;
    targetY = e.clientY;
    if (!isVisible) {
      dot.style.opacity = '1';
      isVisible = true;
    }
  }, { passive: true });

  window.addEventListener('pointerleave', () => {
    dot.style.opacity = '0';
    isVisible = false;
    dot.classList.remove('hovered');
  });

  window.addEventListener('blur', () => {
    dot.classList.remove('hovered');
  });

  bindPointerHoverTargets();

  function renderCursor() {
    currentX += (targetX - currentX) * 0.18;
    currentY += (targetY - currentY) * 0.18;
    dot.style.transform = `translate3d(${currentX - (dot.offsetWidth / 2)}px, ${currentY - (dot.offsetHeight / 2)}px, 0)`;
    requestAnimationFrame(renderCursor);
  }
  renderCursor();
}

/* ==========================================================================
   Smooth Anchor Scrolling
   ========================================================================== */
function setupSmoothScroll() {
  // Back to top link
  const backToTopLink = document.querySelector('.footer-back-to-top');
  backToTopLink?.addEventListener('click', (e) => {
    e.preventDefault();
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  });
}

export function bindPointerHoverTargets() {
  const dot = document.querySelector('.cursor-ambient-dot');
  if (!dot) return;

  // Reset any stale hover state across page transitions
  dot.classList.remove('hovered');

  const interactiveEls = document.querySelectorAll('a, button, [role="button"], input, textarea');
  interactiveEls.forEach(el => {
    if (!el.__hasHoverBound) {
      el.__hasHoverBound = true;
      el.addEventListener('pointerenter', () => dot.classList.add('hovered'), { passive: true });
      el.addEventListener('pointerleave', () => dot.classList.remove('hovered'), { passive: true });
      el.addEventListener('click', () => dot.classList.remove('hovered'), { passive: true });
    }
  });
}

