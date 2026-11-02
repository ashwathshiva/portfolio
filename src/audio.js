/**
 * ============================================================================
 * AMBIENT AUDIO CONTROLLER — CINEMATIC SOUNDSCAPE
 * Ashwath Shiva P — AI Engineer & Developer Portfolio
 *
 * Requirements & Architecture:
 * - OFF by default on initial entry; explicit user gesture required.
 * - Compact circular audio button (44px) in default state on desktop.
 * - Smooth hover expansion and automatic collapse when pointer leaves.
 * - Clicking play/pause or adjusting volume NEVER locks the expanded layout.
 * - Pointer presence on the entire widget governs hover expand/collapse.
 * - Keyboard navigation keeps slider accessible while focused via :focus-visible.
 * - Explicit toggle button on touch devices since hover is unavailable.
 * - Preserves playback position and session mute preference across internal pages.
 * - Pauses on visibilitychange (tab hidden) and resumes when visible.
 * ============================================================================
 */

// Primary local asset path expected by the portfolio
const AMBIENT_AUDIO_SRC = './assets/audio/ambient.mp3';

// Storage keys for cross-page and cross-session management
const STORAGE_SESSION_PLAYING = 'ashwath_ambient_playing';
const STORAGE_SESSION_TIME = 'ashwath_ambient_time';
const STORAGE_SESSION_TIMESTAMP = 'ashwath_ambient_timestamp';
const STORAGE_LOCAL_VOLUME = 'ashwath_ambient_volume';
const STORAGE_LOCAL_PREF = 'ashwath_ambient_user_preference';

// Default configuration
const DEFAULT_VOLUME = 0.28;
const FADE_DURATION_MS = 350;
const COLLAPSE_DELAY_MS = 180;

class AmbientAudioController {
  constructor() {
    this.audio = null;
    this.isPlaying = false;
    this.currentVolume = DEFAULT_VOLUME;
    this.previousVolume = DEFAULT_VOLUME;
    this.wasPlayingBeforeHidden = false;
    this.fadeInterval = null;
    this.noticeTimeout = null;
    this.collapseTimer = null;

    // Interaction state flags
    this.isPointerInside = false;
    this.isKeyboardNavigating = false;
    this.isTouchVolumeOpen = false;
    this.lastInteractionWasKey = false;
    this.isInitialized = false;

    // DOM references
    this.widgetEl = null;
    this.toggleBtn = null;
    this.volumeToggleBtn = null;
    this.waveContainer = null;
    this.volumePanel = null;
    this.volumeSlider = null;
    this.volumeFill = null;
    this.noticeEl = null;
    this.noticeText = null;

    this.onVisibilityChange = this.onVisibilityChange.bind(this);
    this.onPageHide = this.onPageHide.bind(this);
  }

  /**
   * Initialize audio subsystem and DOM bindings
   */
  init() {
    if (this.isInitialized) return;
    this.isInitialized = true;

    this.restoreStoredVolume();
    this.setupAudioElement();
    this.bindDOM();
    this.setupEventListeners();
    this.checkSessionPlayback();
  }

  /**
   * Load saved volume from localStorage if available
   */
  restoreStoredVolume() {
    try {
      const stored = localStorage.getItem(STORAGE_LOCAL_VOLUME);
      if (stored !== null) {
        const val = parseFloat(stored);
        if (!isNaN(val) && val >= 0 && val <= 1) {
          this.currentVolume = val;
          this.previousVolume = val > 0 ? val : DEFAULT_VOLUME;
        }
      }
    } catch (e) {
      this.currentVolume = DEFAULT_VOLUME;
    }
  }

  /**
   * Create HTML5 Audio instance with robust error listeners
   */
  setupAudioElement() {
    this.audio = new Audio();
    this.audio.preload = 'metadata';
    this.audio.loop = true;
    this.audio.volume = this.currentVolume;
    this.audio.src = AMBIENT_AUDIO_SRC;

    // Error event listener
    this.audio.addEventListener('error', () => {
      this.handlePlaybackFailure(
        'Ambient track not found. Place audio file at assets/audio/ambient.mp3'
      );
    });

    // Loop fallback safety
    this.audio.addEventListener('ended', () => {
      if (this.isPlaying) {
        this.audio.currentTime = 0;
        this.audio.play().catch(() => {});
      }
    });
  }

  /**
   * Bind to existing DOM elements or inject markup if absent
   */
  bindDOM() {
    this.widgetEl = document.getElementById('ambient-audio-widget');
    if (!this.widgetEl) {
      this.injectWidgetDOM();
    }

    this.toggleBtn = document.getElementById('ambient-audio-toggle');
    this.volumeToggleBtn = document.getElementById('ambient-volume-toggle');
    this.waveContainer = document.getElementById('ambient-audio-wave');
    this.volumePanel = document.getElementById('ambient-volume-panel');
    this.volumeSlider = document.getElementById('ambient-volume-slider');
    this.volumeFill = document.getElementById('ambient-slider-fill');
    this.noticeEl = document.getElementById('ambient-audio-notice');
    this.noticeText = document.getElementById('ambient-notice-text');

    this.syncVolumeUI();
    this.updateUIState(false);
  }

  /**
   * Dynamically build and inject widget DOM if not in static HTML
   */
  injectWidgetDOM() {
    const wrapper = document.createElement('aside');
    wrapper.id = 'ambient-audio-widget';
    wrapper.className = 'ambient-audio-widget';
    wrapper.setAttribute('role', 'region');
    wrapper.setAttribute('aria-label', 'Ambient Soundscape Controller');

    wrapper.innerHTML = `
      <div class="ambient-audio-inner">
        <!-- Collapsible Volume Slider Track -->
        <div class="ambient-volume-panel" id="ambient-volume-panel" aria-label="Ambient volume controls" aria-hidden="true">
          <div class="ambient-slider-track-wrap">
            <input 
              type="range" 
              id="ambient-volume-slider" 
              class="ambient-volume-slider"
              min="0" 
              max="1" 
              step="0.01" 
              value="0.28" 
              aria-label="Ambient music volume level"
            />
            <div class="ambient-slider-fill" id="ambient-slider-fill" style="width: 28%;"></div>
          </div>
        </div>

        <!-- Explicit Volume Panel Toggle Button -->
        <button 
          type="button" 
          class="ambient-volume-toggle-btn" 
          id="ambient-volume-toggle" 
          aria-label="Toggle volume slider"
          aria-expanded="false"
          title="Volume controls"
        >
          <svg class="vol-icon" id="ambient-vol-svg" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
            <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
            <path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>
          </svg>
        </button>

        <!-- Compact Circular Audio Toggle Button (44px) -->
        <button 
          type="button" 
          class="ambient-audio-btn" 
          id="ambient-audio-toggle"
          aria-label="Play ambient music"
          aria-pressed="false"
          title="Ambient music: Off (Click to play)"
        >
          <span class="ambient-wave" id="ambient-audio-wave" aria-hidden="true">
            <span class="wave-bar bar-1"></span>
            <span class="wave-bar bar-2"></span>
            <span class="wave-bar bar-3"></span>
            <span class="wave-bar bar-4"></span>
          </span>
        </button>

        <!-- Floating Notice / Status Tooltip -->
        <div class="ambient-notice-tooltip" id="ambient-audio-notice" role="status" aria-live="polite" aria-hidden="true">
          <span class="notice-dot" aria-hidden="true"></span>
          <span class="notice-text" id="ambient-notice-text"></span>
        </div>
      </div>
    `;

    document.body.appendChild(wrapper);
    this.widgetEl = wrapper;
  }

  /**
   * Set up DOM, hover, keyboard, touch, and lifecycle listeners
   */
  setupEventListeners() {
    // Track key navigation to differentiate keyboard focus from mouse-click focus
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Tab' || e.key.startsWith('Arrow')) {
        this.lastInteractionWasKey = true;
      }
    }, { capture: true, passive: true });

    window.addEventListener('pointerdown', () => {
      this.lastInteractionWasKey = false;
    }, { capture: true, passive: true });

    // 1. Play / Pause click toggle (strictly audio playback, separated from layout state)
    if (this.toggleBtn) {
      this.toggleBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.togglePlayback();
      });

      this.toggleBtn.addEventListener('keydown', (e) => {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          this.togglePlayback();
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault();
          this.openVolumePanel();
          this.volumeSlider?.focus();
        }
      });
    }

    // 2. Explicit Volume Toggle button (for touch devices & optional quick mute/toggle)
    if (this.volumeToggleBtn) {
      this.volumeToggleBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const isTouch = window.matchMedia('(hover: none), (pointer: coarse)').matches || e.pointerType === 'touch';
        if (isTouch) {
          this.toggleTouchVolume();
        } else {
          this.toggleMute();
        }
      });
    }

    // 3. Pointer events on the entire widget container (including button and slider)
    if (this.widgetEl) {
      this.widgetEl.addEventListener('pointerenter', (e) => {
        if (e.pointerType === 'touch') return;
        this.isPointerInside = true;
        clearTimeout(this.collapseTimer);
        this.openVolumePanel();
      });

      this.widgetEl.addEventListener('pointerleave', (e) => {
        if (e.pointerType === 'touch') return;
        this.isPointerInside = false;
        this.scheduleCollapse();
      });

      // 4. Keyboard focus handling: only expand on actual keyboard focus (:focus-visible)
      this.widgetEl.addEventListener('focusin', (e) => {
        const isFocusVisible = e.target.matches(':focus-visible') || this.lastInteractionWasKey;
        if (isFocusVisible) {
          this.isKeyboardNavigating = true;
          clearTimeout(this.collapseTimer);
          this.openVolumePanel();
        }
      });

      this.widgetEl.addEventListener('focusout', () => {
        setTimeout(() => {
          if (!this.widgetEl.contains(document.activeElement)) {
            this.isKeyboardNavigating = false;
            this.scheduleCollapse();
          }
        }, 0);
      });

      this.widgetEl.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          this.isKeyboardNavigating = false;
          this.closeVolumePanel();
          this.toggleBtn?.focus();
        }
      });
    }

    // 5. Volume Slider adjustment immediately
    if (this.volumeSlider) {
      this.volumeSlider.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        this.setVolume(val);
      });
    }

    // 6. Page Visibility API
    document.addEventListener('visibilitychange', this.onVisibilityChange);

    // 7. Navigation persistence and cleanup
    window.addEventListener('pagehide', this.onPageHide);
    window.addEventListener('beforeunload', this.onPageHide);
  }

  /**
   * Schedule automatic collapse when pointer leaves or focus exits
   */
  scheduleCollapse() {
    clearTimeout(this.collapseTimer);
    this.collapseTimer = setTimeout(() => {
      // Do not collapse if pointer is inside, keyboard is navigating, or touch is explicitly open
      if (this.isPointerInside || this.isKeyboardNavigating || this.isTouchVolumeOpen) {
        return;
      }

      this.closeVolumePanel();

      // If a child element had focus from a mouse click (not keyboard :focus-visible), blur it
      if (this.widgetEl && this.widgetEl.contains(document.activeElement)) {
        if (!document.activeElement.matches(':focus-visible')) {
          document.activeElement.blur();
        }
      }
    }, COLLAPSE_DELAY_MS);
  }

  /**
   * Reveal the volume panel beside the circular button
   */
  openVolumePanel() {
    if (!this.widgetEl) return;
    this.widgetEl.classList.add('volume-open');
    if (this.volumePanel) {
      this.volumePanel.setAttribute('aria-hidden', 'false');
    }
    if (this.volumeToggleBtn) {
      this.volumeToggleBtn.setAttribute('aria-expanded', 'true');
    }
  }

  /**
   * Hide the volume panel
   */
  closeVolumePanel() {
    if (!this.widgetEl) return;
    this.isTouchVolumeOpen = false;
    this.widgetEl.classList.remove('volume-open');
    if (this.volumePanel) {
      this.volumePanel.setAttribute('aria-hidden', 'true');
    }
    if (this.volumeToggleBtn) {
      this.volumeToggleBtn.setAttribute('aria-expanded', 'false');
    }
  }

  /**
   * Toggle volume panel on touch devices via explicit toggle button
   */
  toggleTouchVolume() {
    if (this.isTouchVolumeOpen || this.widgetEl?.classList.contains('volume-open')) {
      this.isTouchVolumeOpen = false;
      this.closeVolumePanel();
    } else {
      this.isTouchVolumeOpen = true;
      this.openVolumePanel();
    }
  }

  /**
   * Handle internal page navigation check:
   * If music was playing before navigating to this page in the active tab session,
   * continue playback from where it left off.
   */
  checkSessionPlayback() {
    try {
      const isSessionPlaying = sessionStorage.getItem(STORAGE_SESSION_PLAYING) === 'true';
      const savedTime = parseFloat(sessionStorage.getItem(STORAGE_SESSION_TIME) || '0');
      const timestamp = parseInt(sessionStorage.getItem(STORAGE_SESSION_TIMESTAMP) || '0', 10);
      const isRecent = Date.now() - timestamp < 20000; // Within 20 seconds of page change

      if (isSessionPlaying && isRecent && !isNaN(savedTime)) {
        if (this.audio) {
          this.audio.currentTime = Math.max(0, savedTime);
          const playPromise = this.audio.play();

          if (playPromise !== undefined) {
            playPromise
              .then(() => {
                this.isPlaying = true;
                this.updateUIState(true);
                this.fadeIn(this.currentVolume);
              })
              .catch(() => {
                this.isPlaying = false;
                this.updateUIState(false);
              });
          }
        }
      }
    } catch (e) {
      this.isPlaying = false;
      this.updateUIState(false);
    }
  }

  /**
   * Toggle between play and pause
   */
  togglePlayback() {
    if (this.isPlaying) {
      this.pause(true);
    } else {
      this.play();
    }
  }

  /**
   * Start playback with explicit user gesture and smooth fade-in
   */
  play() {
    if (!this.audio) return;

    this.audio.volume = 0;
    const playPromise = this.audio.play();

    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          this.isPlaying = true;
          this.updateUIState(true);
          this.fadeIn(this.currentVolume);
          this.persistSessionState(true);
          try {
            localStorage.setItem(STORAGE_LOCAL_PREF, 'unmuted');
          } catch (e) {}
        })
        .catch(() => {
          this.isPlaying = false;
          this.updateUIState(false);
          this.handlePlaybackFailure(
            'Ambient track not found. Place ambient.mp3 in assets/audio/'
          );
        });
    }
  }

  /**
   * Pause playback with gentle fade-out
   */
  pause(byUser = true) {
    if (!this.audio) return;

    this.fadeOut(() => {
      if (this.audio) {
        this.audio.pause();
      }
      this.isPlaying = false;
      this.updateUIState(false);

      if (byUser) {
        this.persistSessionState(false);
        try {
          localStorage.setItem(STORAGE_LOCAL_PREF, 'muted');
        } catch (e) {}
      }
    });
  }

  /**
   * Smooth volume fade-in
   */
  fadeIn(targetVolume) {
    clearInterval(this.fadeInterval);
    if (!this.audio) return;

    const start = this.audio.volume;
    const diff = targetVolume - start;
    const steps = 15;
    const stepTime = FADE_DURATION_MS / steps;
    let step = 0;

    this.fadeInterval = setInterval(() => {
      step++;
      const progress = step / steps;
      if (this.audio) {
        this.audio.volume = Math.min(1, Math.max(0, start + diff * progress));
      }
      if (step >= steps) {
        clearInterval(this.fadeInterval);
        if (this.audio) {
          this.audio.volume = targetVolume;
        }
      }
    }, stepTime);
  }

  /**
   * Smooth volume fade-out
   */
  fadeOut(onComplete) {
    clearInterval(this.fadeInterval);
    if (!this.audio) {
      if (onComplete) onComplete();
      return;
    }

    const start = this.audio.volume;
    const steps = 12;
    const stepTime = (FADE_DURATION_MS * 0.75) / steps;
    let step = 0;

    this.fadeInterval = setInterval(() => {
      step++;
      const progress = step / steps;
      if (this.audio) {
        this.audio.volume = Math.max(0, start * (1 - progress));
      }
      if (step >= steps) {
        clearInterval(this.fadeInterval);
        if (this.audio) {
          this.audio.volume = 0;
        }
        if (onComplete) onComplete();
      }
    }, stepTime);
  }

  /**
   * Set volume level immediately (0.0 to 1.0)
   */
  setVolume(val) {
    const clamped = Math.min(1, Math.max(0, val));
    this.currentVolume = clamped;
    if (clamped > 0) {
      this.previousVolume = clamped;
    }
    if (this.audio && this.isPlaying) {
      this.audio.volume = clamped;
    }

    try {
      localStorage.setItem(STORAGE_LOCAL_VOLUME, clamped.toString());
    } catch (e) {}

    this.syncVolumeUI();
  }

  /**
   * Toggle mute without stopping track position
   */
  toggleMute() {
    if (this.currentVolume > 0) {
      this.previousVolume = this.currentVolume;
      this.setVolume(0);
    } else {
      this.setVolume(this.previousVolume || DEFAULT_VOLUME);
    }
  }

  /**
   * Synchronize slider track and fill bar
   */
  syncVolumeUI() {
    const percent = Math.round(this.currentVolume * 100);

    if (this.volumeSlider) {
      this.volumeSlider.value = this.currentVolume.toString();
    }
    if (this.volumeFill) {
      this.volumeFill.style.width = `${percent}%`;
    }
    if (this.volumeToggleBtn) {
      const isMuted = this.currentVolume === 0;
      this.volumeToggleBtn.setAttribute(
        'title',
        isMuted ? 'Restore volume' : 'Volume level'
      );
    }
  }

  /**
   * Update visual states across button, wave equalizer, and aria tags
   */
  updateUIState(active) {
    if (!this.widgetEl || !this.toggleBtn) return;

    if (active) {
      this.widgetEl.classList.add('playing');
      this.toggleBtn.setAttribute('aria-pressed', 'true');
      this.toggleBtn.setAttribute('aria-label', 'Mute ambient music');
      this.toggleBtn.setAttribute('title', 'Ambient music: Playing (Click to mute)');
    } else {
      this.widgetEl.classList.remove('playing');
      this.toggleBtn.setAttribute('aria-pressed', 'false');
      this.toggleBtn.setAttribute('aria-label', 'Play ambient music');
      this.toggleBtn.setAttribute('title', 'Ambient music: Off (Click to play)');
    }
  }

  /**
   * Page Visibility change handler
   */
  onVisibilityChange() {
    if (document.hidden) {
      if (this.isPlaying) {
        this.wasPlayingBeforeHidden = true;
        if (this.audio) {
          this.audio.pause();
        }
        this.updateUIState(false);
      }
    } else {
      if (this.wasPlayingBeforeHidden) {
        this.wasPlayingBeforeHidden = false;
        if (this.audio) {
          this.audio.volume = 0;
          this.audio
            .play()
            .then(() => {
              this.isPlaying = true;
              this.updateUIState(true);
              this.fadeIn(this.currentVolume);
            })
            .catch(() => {
              this.isPlaying = false;
              this.updateUIState(false);
            });
        }
      }
    }
  }

  /**
   * Persist playback state to sessionStorage for seamless page transition
   */
  persistSessionState(playing) {
    try {
      sessionStorage.setItem(STORAGE_SESSION_PLAYING, playing ? 'true' : 'false');
      if (this.audio && !isNaN(this.audio.currentTime)) {
        sessionStorage.setItem(STORAGE_SESSION_TIME, this.audio.currentTime.toString());
      }
      sessionStorage.setItem(STORAGE_SESSION_TIMESTAMP, Date.now().toString());
    } catch (e) {}
  }

  /**
   * Clean up on page navigation and store timestamp
   */
  onPageHide() {
    this.persistSessionState(this.isPlaying);
    if (this.audio) {
      this.audio.pause();
    }
  }

  /**
   * Graceful failure notification
   */
  handlePlaybackFailure(message) {
    console.warn(`[AmbientAudio] ${message}`);

    if (this.noticeEl && this.noticeText) {
      clearTimeout(this.noticeTimeout);
      this.noticeText.textContent = message;
      this.noticeEl.classList.add('visible');
      this.noticeEl.setAttribute('aria-hidden', 'false');

      this.noticeTimeout = setTimeout(() => {
        this.noticeEl.classList.remove('visible');
        this.noticeEl.setAttribute('aria-hidden', 'true');
      }, 4500);
    }
  }
}

// Global Singleton Instance
let ambientAudioInstance = null;

export function initAmbientAudio() {
  if (typeof window === 'undefined') return null;

  if (window.__ASHWATH_AUDIO_INSTANCE__) {
    return window.__ASHWATH_AUDIO_INSTANCE__;
  }

  ambientAudioInstance = new AmbientAudioController();
  window.__ASHWATH_AUDIO_INSTANCE__ = ambientAudioInstance;

  ambientAudioInstance.init();
  return ambientAudioInstance;
}
