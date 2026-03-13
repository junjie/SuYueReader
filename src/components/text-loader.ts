type TextLoadCallback = (text: string, title?: string) => void;

interface ManifestEntry {
  id: string;
  title: string;
}

export class TextLoader {
  private onLoad: TextLoadCallback;
  private manifest: ManifestEntry[] = [];

  constructor(onLoad: TextLoadCallback) {
    this.onLoad = onLoad;
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
        this.onLoad(reader.result as string, file.name.replace(/\.txt$/, ''));
      };
      reader.readAsText(file);
      input.value = '';
    });
  }

  loadFromPaste(text: string): void {
    this.onLoad(text, 'Pasted Text');
  }
}
