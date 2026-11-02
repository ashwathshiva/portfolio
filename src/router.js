/**
 * ============================================================================
 * SAME-ORIGIN SOFT NAVIGATION ROUTER (PJAX ARCHITECTURE)
 * Ashwath Shiva P — AI Engineer & Developer Portfolio
 *
 * Guarantees seamless, 100% continuous ambient audio playback across:
 * - Home (index.html)
 * - Projects (projects.html)
 * - Certificates (certificates.html)
 * - Resume (resume.html)
 * - Project details / deep anchor links (e.g. projects.html#project-ktu)
 * - Browser Back & Forward history navigation (popstate)
 *
 * Architecture:
 * - Intercepts internal link clicks.
 * - Leaves persistent document shell and singleton #ambient-audio-widget intact.
 * - Swaps page content (<main>, <footer class="site-footer">) and updates <nav>.
 * - Synchronizes document.title, <meta> tags, and history via pushState.
 * - Re-initializes page-specific animations (Lucide icons, GSAP ScrollTriggers, ShapeGrid).
 * - Caches visited documents in memory for instant, zero-latency transitions.
 * ============================================================================
 */

// Memory cache for fetched HTML documents
const pageCache = new Map();

// Navigation tracking
let currentNavId = 0;
let onPageReadyCallback = null;
let activePagePath = normalizePath(typeof window !== 'undefined' ? window.location.pathname : '/index.html');

/**
 * Normalize pathnames so root '/', '/index.html', and 'index.html' match consistently
 */
export function normalizePath(pathname) {
  if (!pathname) return '/index.html';
  let clean = pathname.replace(/^\.\//, '/');
  if (clean.endsWith('/')) {
    clean += 'index.html';
  }
  return clean.startsWith('/') ? clean : '/' + clean;
}

/**
 * Check if a link should be handled by soft navigation
 */
function isInternalLink(a) {
  if (!a || !a.href) return false;

  // Respect target="_blank" and other non-self targets
  if (a.target && a.target !== '_self') return false;

  // Respect download attributes (e.g. Resume PDF)
  if (a.hasAttribute('download')) return false;

  // Respect rel="external"
  if (a.getAttribute('rel')?.includes('external')) return false;

  // Respect non-http protocols (mailto:, tel:, javascript:)
  try {
    const url = new URL(a.href, window.location.href);
    if (url.origin !== window.location.origin) return false;
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return false;

    // Do not intercept audio files or raw document downloads
    if (url.pathname.endsWith('.pdf') || url.pathname.endsWith('.mp3')) return false;

    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Smoothly scroll to a section on the current page accounting for sticky header
 */
function scrollToAnchor(targetId, smooth = true) {
  const el = document.getElementById(targetId);
  if (!el) return false;

  const headerOffset = 68;
  const targetPos = el.getBoundingClientRect().top + window.pageYOffset - headerOffset;

  window.scrollTo({
    top: Math.max(0, targetPos),
    behavior: smooth ? 'smooth' : 'instant'
  });
  return true;
}

/**
 * Close mobile navigation drawer if open
 */
function closeMobileDrawer() {
  const mobileDrawer = document.querySelector('.mobile-nav-drawer');
  const mobileToggle = document.querySelector('.mobile-nav-toggle');
  if (mobileDrawer?.classList.contains('open')) {
    mobileDrawer.classList.remove('open');
    mobileToggle?.classList.remove('open');
    mobileToggle?.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  }
}

/**
 * Navigate to a new internal page via soft navigation without interrupting audio
 */
export async function navigateTo(targetHref, options = { pushState: true, smoothAnchor: true }) {
  const targetUrl = new URL(targetHref, window.location.href);
  const currentUrl = new URL(window.location.href);

  const targetPath = normalizePath(targetUrl.pathname);
  const isSamePage = targetPath === activePagePath;

  closeMobileDrawer();
  document.querySelector('.cursor-ambient-dot')?.classList.remove('hovered');

  // If navigating within the same page
  if (isSamePage) {
    if (targetUrl.hash) {
      const anchorId = targetUrl.hash.slice(1);
      const scrolled = scrollToAnchor(anchorId, options.smoothAnchor);
      if (scrolled && options.pushState) {
        history.pushState({ path: targetUrl.pathname + targetUrl.hash }, '', targetUrl.pathname + targetUrl.hash);
      }
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      if (options.pushState) {
        history.pushState({ path: targetUrl.pathname }, '', targetUrl.pathname);
      }
    }
    return;
  }

  // Cross-page navigation: fetch target document
  const navId = ++currentNavId;

  try {
    let html = pageCache.get(targetPath);
    if (!html) {
      const res = await fetch(targetUrl.href);
      if (!res.ok) {
        // Fallback to normal navigation if fetch fails
        window.location.href = targetUrl.href;
        return;
      }
      html = await res.text();
      pageCache.set(targetPath, html);
    }

    // Guard against race conditions if user clicked another link in between
    if (navId !== currentNavId) return;

    const parser = new DOMParser();
    const newDoc = parser.parseFromString(html, 'text/html');

    // 1. Update Title and Meta Tags
    document.title = newDoc.title || document.title;
    const newMetaDesc = newDoc.querySelector('meta[name="description"]');
    const curMetaDesc = document.querySelector('meta[name="description"]');
    if (newMetaDesc && curMetaDesc) {
      curMetaDesc.setAttribute('content', newMetaDesc.getAttribute('content'));
    }

    // 2. Update Browser History
    if (options.pushState) {
      history.pushState(
        { path: targetUrl.pathname + targetUrl.hash },
        '',
        targetUrl.pathname + targetUrl.search + targetUrl.hash
      );
    }

    // 3. Swap <main> content
    const currentMain = document.querySelector('main');
    const newMain = newDoc.querySelector('main');
    if (currentMain && newMain) {
      currentMain.replaceWith(newMain);
    }

    // 4. Swap site footer (maintains page-specific back-to-top and download links)
    const currentFooter = document.querySelector('.site-footer');
    const newFooter = newDoc.querySelector('.site-footer');
    if (currentFooter && newFooter) {
      currentFooter.replaceWith(newFooter);
    }

    // 5. Update header navigation and mobile drawer
    const currentNav = document.querySelector('.nav-header');
    const newNav = newDoc.querySelector('.nav-header');
    if (currentNav && newNav) {
      currentNav.replaceWith(newNav);
    }

    const currentDrawer = document.querySelector('.mobile-nav-drawer');
    const newDrawer = newDoc.querySelector('.mobile-nav-drawer');
    if (currentDrawer && newDrawer) {
      currentDrawer.replaceWith(newDrawer);
    }

    // NOTE: #ambient-audio-widget is NEVER touched, keeping audio continuously playing!

    // 6. Scroll position handling
    if (targetUrl.hash) {
      const targetId = targetUrl.hash.slice(1);
      // Small tick to ensure DOM is painted
      requestAnimationFrame(() => {
        scrollToAnchor(targetId, false);
      });
    } else {
      window.scrollTo({ top: 0, behavior: 'instant' });
    }

    // 7. Update active rendered page path and invoke page initialization callback
    activePagePath = targetPath;
    document.querySelector('.cursor-ambient-dot')?.classList.remove('hovered');
    if (typeof onPageReadyCallback === 'function') {
      onPageReadyCallback(targetUrl);
    }
  } catch (err) {
    console.warn('[SoftRouter] Soft navigation failed, falling back to standard navigation:', err);
    window.location.href = targetUrl.href;
  }
}

/**
 * Initialize soft navigation router
 */
export function initSoftNavigation(onPageReady) {
  onPageReadyCallback = onPageReady;

  // Cache initial page HTML by fetching pristine source (prevents caching runtime DOM mutations like dead canvases)
  try {
    const currentPath = normalizePath(window.location.pathname);
    if (window.location.protocol === 'http:' || window.location.protocol === 'https:') {
      fetch(window.location.href)
        .then((res) => res.text())
        .then((html) => pageCache.set(currentPath, html))
        .catch(() => {});
    }
  } catch (e) {}

  // Global click interception on internal links
  document.addEventListener('click', (e) => {
    // Only handle primary click without modifier keys
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (e.defaultPrevented) return;

    const link = e.target.closest('a');
    if (!link || !isInternalLink(link)) return;

    e.preventDefault();
    navigateTo(link.href, { pushState: true, smoothAnchor: true });
  });

  // Handle browser Back / Forward buttons
  window.addEventListener('popstate', () => {
    document.querySelector('.cursor-ambient-dot')?.classList.remove('hovered');
    navigateTo(window.location.href, { pushState: false, smoothAnchor: false });
  });

  // Prefetch other internal pages during idle time for instant, zero-latency transitions
  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(() => {
      const pages = ['/index.html', '/projects.html', '/certificates.html', '/resume.html'];
      const current = normalizePath(window.location.pathname);
      pages.forEach((page) => {
        if (page !== current && !pageCache.has(page)) {
          fetch(page)
            .then((r) => r.text())
            .then((html) => pageCache.set(page, html))
            .catch(() => {});
        }
      });
    });
  }
}
