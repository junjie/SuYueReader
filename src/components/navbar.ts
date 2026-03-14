import { documentIcon, gearIcon } from './icons.ts';
import type { SettingsStore } from '../state/settings.ts';
import type { ScriptVariant } from '../types/index.ts';

export class Navbar {
  private nav: HTMLElement;
  private lastScroll = 0;
  private ticking = false;
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
        <button class="navbar-btn navbar-btn-icon" id="navbar-open" aria-label="Open">
          ${documentIcon()}
        </button>
        <div class="navbar-script-seg">
          <button data-variant="original" class="nseg-btn">原</button>
          <button data-variant="simplified" class="nseg-btn">简</button>
          <button data-variant="traditional" class="nseg-btn">繁</button>
        </div>
        <button class="navbar-btn navbar-btn-icon" id="navbar-settings" aria-label="Settings">
          ${gearIcon()}
        </button>
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

    this.scriptSeg.addEventListener('click', (e) => {
      const btn = (e.target as HTMLElement).closest('[data-variant]') as HTMLElement | null;
      if (!btn) return;
      this.store.update({ scriptVariant: btn.dataset.variant as ScriptVariant });
    });

    // Set initial orientation
    if (store.get().writingMode === 'vertical') {
      this.nav.classList.add('navbar-vertical');
    }

    // Sheet coordination
    document.addEventListener('sheet-opening', () => {
      this.nav.classList.add('hidden');
      this.setNavbarOffset(false);
    });
    document.addEventListener('sheet-closed', () => {
      this.nav.classList.remove('hidden');
      this.setNavbarOffset(true);
    });

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
    });
  }

  private syncScriptActive(variant: ScriptVariant): void {
    this.scriptSeg.querySelectorAll('.nseg-btn').forEach((btn) => {
      btn.classList.toggle('active', (btn as HTMLElement).dataset.variant === variant);
    });
  }

  private setNavbarOffset(visible: boolean): void {
    document.documentElement.style.setProperty('--navbar-offset', visible ? '48px' : '0px');
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

  private onScroll(): void {
    if (this.ticking) return;
    this.ticking = true;
    requestAnimationFrame(() => {
      const current = this.getScrollPosition();
      const delta = current - this.lastScroll;

      if (current < 50) {
        this.nav.classList.remove('navbar-scroll-hidden');
        this.setNavbarOffset(true);
      } else if (delta > 5) {
        this.nav.classList.add('navbar-scroll-hidden');
        this.setNavbarOffset(false);
      } else if (delta < -5) {
        this.nav.classList.remove('navbar-scroll-hidden');
        this.setNavbarOffset(true);
      }

      this.lastScroll = current;
      this.ticking = false;
    });
  }
}
