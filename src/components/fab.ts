import { documentIcon, gearIcon } from './icons.ts';

export class FABs {
  private container: HTMLElement;
  private docBtn: HTMLButtonElement;
  private gearBtn: HTMLButtonElement;

  constructor(
    private onDocumentClick: () => void,
    private onSettingsClick: () => void
  ) {
    this.container = document.createElement('div');
    this.container.className = 'fab-container';

    this.docBtn = document.createElement('button');
    this.docBtn.className = 'fab fab-left';
    this.docBtn.setAttribute('aria-label', 'Open text');
    this.docBtn.innerHTML = documentIcon();

    this.gearBtn = document.createElement('button');
    this.gearBtn.className = 'fab fab-right';
    this.gearBtn.setAttribute('aria-label', 'Settings');
    this.gearBtn.innerHTML = gearIcon();

    this.container.appendChild(this.docBtn);
    this.container.appendChild(this.gearBtn);
    document.body.appendChild(this.container);

    this.docBtn.addEventListener('click', () => this.onDocumentClick());
    this.gearBtn.addEventListener('click', () => this.onSettingsClick());

    document.addEventListener('sheet-opening', () => this.hide());
    document.addEventListener('sheet-closed', () => this.show());
  }

  private hide(): void {
    this.container.classList.add('hidden');
  }

  private show(): void {
    this.container.classList.remove('hidden');
  }
}
