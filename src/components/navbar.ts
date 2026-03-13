import { documentIcon, gearIcon } from './icons.ts';

export class Navbar {
  private nav: HTMLElement;
  private lastScroll = 0;
  private ticking = false;
  private scrollTarget: EventTarget = window;
  private boundScrollHandler: () => void;

  constructor(
    onOpenClick: () => void,
    onSettingsClick: () => void,
  ) {
    this.nav = document.createElement('nav');
    this.nav.className = 'navbar';
    this.nav.innerHTML = `
      <button class="navbar-btn navbar-btn-icon" id="navbar-open" aria-label="Open">
        ${documentIcon()}
      </button>
      <button class="navbar-btn navbar-btn-icon" id="navbar-settings" aria-label="Settings">
        ${gearIcon()}
      </button>
    `;
    document.body.appendChild(this.nav);

    this.nav.querySelector('#navbar-open')!.addEventListener('click', onOpenClick);
    this.nav.querySelector('#navbar-settings')!.addEventListener('click', onSettingsClick);

    // Sheet coordination
    document.addEventListener('sheet-opening', () => this.nav.classList.add('hidden'));
    document.addEventListener('sheet-closed', () => this.nav.classList.remove('hidden'));

    // Scroll-aware hide/show
    this.boundScrollHandler = this.onScroll.bind(this);
    this.attachScrollListener();

    // Re-attach scroll listener on writing mode change
    document.addEventListener('settings-changed', () => {
      this.attachScrollListener();
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

  private onScroll(): void {
    if (this.ticking) return;
    this.ticking = true;
    requestAnimationFrame(() => {
      const current = this.getScrollPosition();
      const delta = current - this.lastScroll;

      if (current < 50) {
        this.nav.classList.remove('navbar-scroll-hidden');
      } else if (delta > 5) {
        this.nav.classList.add('navbar-scroll-hidden');
      } else if (delta < -5) {
        this.nav.classList.remove('navbar-scroll-hidden');
      }

      this.lastScroll = current;
      this.ticking = false;
    });
  }
}
