import type { SYFile } from '../types/index.ts';

type TextLoadCallback = (text: string, title?: string) => void;
type BundleLoadCallback = (bundle: SYFile) => void;

interface ManifestEntry {
  id: string;
  title: string;
}

export class TextLoader {
  private onLoad: TextLoadCallback;
  private onLoadBundle: BundleLoadCallback | null;
  private manifest: ManifestEntry[] = [];

  constructor(onLoad: TextLoadCallback, onLoadBundle?: BundleLoadCallback) {
    this.onLoad = onLoad;
    this.onLoadBundle = onLoadBundle || null;
  }

  async loadManifest(): Promise<ManifestEntry[]> {
    try {
      const base = import.meta.env.BASE_URL;
      const res = await fetch(`${base}texts/manifest.json`);
      const data: Record<string, string> = await res.json();
      this.manifest = Object.entries(data).map(([id, title]) => ({ id, title }));
    } catch {
      this.manifest = [];
    }
    return this.manifest;
  }

  getManifest(): ManifestEntry[] {
    return this.manifest;
  }

  async loadBuiltIn(id: string): Promise<void> {
    const entry = this.manifest.find((e) => e.id === id);
    if (!entry) return;
    const base = import.meta.env.BASE_URL;
    const res = await fetch(`${base}texts/${id}-${entry.title}.txt`);
    const text = await res.text();
    this.onLoad(text, entry.title);
  }

  setupFileInput(input: HTMLInputElement): void {
    input.addEventListener('change', () => {
      const file = input.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const content = reader.result as string;
        const name = file.name;

        // Detect .sy files
        if (name.endsWith('.sy')) {
          this.handleSY(content, name);
        } else {
          this.onLoad(content, name.replace(/\.txt$/, ''));
        }
      };
      reader.readAsText(file);
      input.value = '';
    });
  }

  loadFromPaste(text: string): void {
    // Build title from first non-empty line, strip markdown heading prefix
    const firstLine = text.split('\n').find((l) => l.trim())?.trim() || '';
    const title = firstLine.replace(/^#+\s*/, '').slice(0, 30) || '粘贴文本';
    this.onLoad(text, title);
  }

  private handleSY(content: string, filename: string): void {
    try {
      const bundle: SYFile = JSON.parse(content);
      if (bundle.version !== 1 || !bundle.text) {
        // Invalid format, try loading as plain text
        this.onLoad(content, filename.replace(/\.sy$/, ''));
        return;
      }
      if (this.onLoadBundle) {
        this.onLoadBundle(bundle);
      } else {
        // Fallback: load the text content
        this.onLoad(bundle.text, bundle.title || filename.replace(/\.sy$/, ''));
      }
    } catch {
      // Not valid JSON, treat as plain text
      this.onLoad(content, filename.replace(/\.sy$/, ''));
    }
  }
}
