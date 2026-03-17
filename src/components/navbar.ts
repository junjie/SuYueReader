import { documentIcon, gearIcon, playIcon, pauseIcon, rewindIcon } from './icons.ts';
import type { SettingsStore } from '../state/settings.ts';
import type { ScriptVariant } from '../types/index.ts';
import { ttsStart, ttsPause, ttsResume, ttsStop, ttsGetState, ttsIsSupported, ttsSetVoice, ttsSetRate } from '../services/tts.ts';

export class Navbar {
  private nav: HTMLElement;
  private lastScroll = 0;
  private ticking = false;
  private lastToggleTime = 0;
  private scrollTarget: EventTarget = window;
  private boundScrollHandler: () => void;
  private store: SettingsStore;
  private scriptSeg: HTMLElement;

  constructor(
    onOpenClick: () => void,
    onSettingsClick: () => void,
    store: SettingsStore,
  ) {
    this.store = store;

    this.nav = document.createElement('nav');
    this.nav.className = 'navbar';
    this.nav.innerHTML = `
      <div class="navbar-inner">
        <div class="navbar-left">
          <button class="navbar-btn navbar-btn-icon" id="navbar-open" aria-label="Open">
            ${documentIcon()}
          </button>
        </div>
        <div class="navbar-script-seg">
          <button data-variant="original" class="nseg-btn">原</button>
          <button data-variant="simplified" class="nseg-btn">简</button>
          <button data-variant="traditional" class="nseg-btn">繁</button>
        </div>
        <div class="navbar-right">
          <div class="navbar-tts"${ttsIsSupported() ? '' : ' style="display:none"'}>
            <button class="navbar-btn navbar-btn-icon navbar-tts-rewind hidden" id="navbar-tts-rewind" aria-label="Rewind">
              ${rewindIcon()}
            </button>
            <button class="navbar-btn navbar-btn-icon" id="navbar-tts-play" aria-label="Play">
              ${playIcon()}
            </button>
          </div>
          <button class="navbar-btn navbar-btn-icon" id="navbar-settings" aria-label="Settings">
            ${gearIcon()}
          </button>
        </div>
      </div>
      <div class="navbar-progress">
        <div class="navbar-progress-bar"></div>
      </div>
    `;
    document.body.appendChild(this.nav);

    this.scriptSeg = this.nav.querySelector('.navbar-script-seg')!;
    this.syncScriptActive(store.get().scriptVariant);

    this.nav.querySelector('#navbar-open')!.addEventListener('click', onOpenClick);
    this.nav.querySelector('#navbar-settings')!.addEventListener('click', onSettingsClick);

    // TTS controls
    const ttsPlayBtn = this.nav.querySelector('#navbar-tts-play')!;
    const ttsRewindBtn = this.nav.querySelector('#navbar-tts-rewind')!;

    ttsPlayBtn.addEventListener('click', () => {
      const s = ttsGetState();
      if (s === 'stopped') {
        const settings = this.store.get();
        ttsSetVoice(settings.ttsVoice);
        ttsSetRate(settings.ttsRate);
        const els = Array.from(document.querySelectorAll<HTMLElement>('#reader [data-index]'));
        if (els.length) ttsStart(els);
      } else if (s === 'playing') {
        ttsPause();
      } else {
        ttsResume();
      }
    });

    ttsRewindBtn.addEventListener('click', () => ttsStop());

    document.addEventListener('tts-state-changed', (e) => {
      const { state } = (e as CustomEvent).detail;
      ttsPlayBtn.innerHTML = state === 'playing' ? pauseIcon() : playIcon();
      ttsPlayBtn.setAttribute('aria-label', state === 'playing' ? 'Pause' : 'Play');
      ttsRewindBtn.classList.toggle('hidden', state === 'stopped');
    });

    this.scriptSeg.addEventListener('click', (e) => {
      const btn = (e.target as HTMLElement).closest('[data-variant]') as HTMLElement | null;
      if (!btn) return;
      this.store.update({ scriptVariant: btn.dataset.variant as ScriptVariant });
    });

    // Set initial orientation
    if (store.get().writingMode === 'vertical') {
      this.nav.classList.add('navbar-vertical');
    }

    // Sheet coordination: close sheets on mutual exclusion (handled by sheets themselves)
    // Navbar stays visible when sheets are open

    // Scroll-aware hide/show
    this.boundScrollHandler = this.onScroll.bind(this);
    this.attachScrollListener();

    // Segmentation progress bar
    const progressBar = this.nav.querySelector('.navbar-progress-bar') as HTMLElement;
    const progressContainer = this.nav.querySelector('.navbar-progress') as HTMLElement;
    document.addEventListener('segmentation-progress', (e) => {
      const { progress } = (e as CustomEvent).detail;
      progressBar.style.transform = `scaleX(${progress})`;
      if (progress >= 1) {
        setTimeout(() => {
          progressContainer.classList.add('navbar-progress-done');
        }, 300);
      } else {
        progressContainer.classList.remove('navbar-progress-done');
      }
    });

    // Re-attach scroll listener on writing mode change + update script & orientation
    document.addEventListener('settings-changed', (e) => {
      this.attachScrollListener();
      const detail = (e as CustomEvent).detail;
      if (detail.scriptVariantChanged) {
        this.syncScriptActive(detail.settings.scriptVariant as ScriptVariant);
      }
      if (detail.writingModeChanged) {
        this.nav.classList.toggle('navbar-vertical', detail.settings.writingMode === 'vertical');
      }
      // Keep TTS voice/rate in sync so mid-session changes take effect
      ttsSetVoice(detail.settings.ttsVoice);
      ttsSetRate(detail.settings.ttsRate);
      // Pinyin toggle re-renders the DOM, invalidating TTS paragraph references
      if (detail.pinyinChanged) ttsStop();
    });
  }

  private syncScriptActive(variant: ScriptVariant): void {
    this.scriptSeg.querySelectorAll('.nseg-btn').forEach((btn) => {
      btn.classList.toggle('active', (btn as HTMLElement).dataset.variant === variant);
    });
  }

  private attachScrollListener(): void {
    // Detach from previous target
    this.scrollTarget.removeEventListener('scroll', this.boundScrollHandler);

    const isVertical = document.documentElement.style.getPropertyValue('--reader-writing-mode') === 'vertical-rl';
    if (isVertical) {
      const container = document.getElementById('reader-container');
      this.scrollTarget = container || window;
    } else {
      this.scrollTarget = window;
    }

    this.lastScroll = this.getScrollPosition();
    (this.scrollTarget as Element | Window).addEventListener('scroll', this.boundScrollHandler, { passive: true });
  }

  private getScrollPosition(): number {
    if (this.scrollTarget === window) {
      return window.scrollY;
    }
    // Vertical (RTL horizontal scroll): scrollLeft is negative in RTL
    const el = this.scrollTarget as HTMLElement;
    return -el.scrollLeft;
  }

  private isNearBottom(): boolean {
    if (this.scrollTarget === window) {
      return window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 50;
    }
    // Vertical mode (RTL horizontal scroll)
    const el = this.scrollTarget as HTMLElement;
    return el.scrollWidth + el.scrollLeft <= el.clientWidth + 50;
  }

  private onScroll(): void {
    if (this.ticking) return;
    this.ticking = true;
    requestAnimationFrame(() => {
      const current = this.getScrollPosition();
      const delta = current - this.lastScroll;
      const now = performance.now();

      if (current < 50 || this.isNearBottom()) {
        this.nav.classList.remove('navbar-scroll-hidden');
      } else if (delta > 5 && now - this.lastToggleTime > 300) {
        this.nav.classList.add('navbar-scroll-hidden');
        this.lastToggleTime = now;
      } else if (delta < -5 && now - this.lastToggleTime > 300) {
        this.nav.classList.remove('navbar-scroll-hidden');
        this.lastToggleTime = now;
      }

      this.lastScroll = current;
      this.ticking = false;
    });
  }
}
