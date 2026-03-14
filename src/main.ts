import { SettingsStore } from './state/settings.ts';
import { Reader } from './components/reader.ts';
import { TextLoader } from './components/text-loader.ts';
import { Navbar } from './components/navbar.ts';
import { OpenSheet } from './components/open-sheet.ts';
import { SettingsSheet } from './components/settings-sheet.ts';
import { parseText } from './services/text-parser.ts';
import { setFootnotes } from './services/dictionary.ts';
import { preloadDefaultFont } from './services/fonts.ts';
import type { CRDRFile } from './types/index.ts';
import './styles/main.css';
import './styles/themes.css';
import './styles/navbar.css';
import './styles/reader.css';
import './styles/settings.css';
import './styles/popup.css';

preloadDefaultFont();

const store = new SettingsStore();

const readerEl = document.getElementById('reader')!;
const reader = new Reader(readerEl, store);

const textLoader = new TextLoader(
  (text, title) => {
    const { paragraphs, footnotes } = parseText(text);
    setFootnotes(footnotes);

    reader.setParagraphs(paragraphs, text, title);
  },
  (bundle: CRDRFile) => {
    const { paragraphs, footnotes } = parseText(bundle.text);
    setFootnotes(footnotes);

    reader.loadBundle(paragraphs, bundle);
  }
);

function handleExport(): void {
  const crdr = reader.exportCRDR();
  if (!crdr.text) return;

  const json = JSON.stringify(crdr);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${crdr.title || 'text'}.crdr`;
  a.click();
  URL.revokeObjectURL(url);
}

const openSheet = new OpenSheet(textLoader, handleExport);
const settingsSheet = new SettingsSheet(store);
new Navbar(() => openSheet.toggle(), () => settingsSheet.toggle(), store);

// Allow definition popup to open the dictionaries settings page
document.addEventListener('open-dict-settings', () => settingsSheet.openDictionaries());

// Load text: URL param or default intro document
const params = new URLSearchParams(window.location.search);
const textParam = params.get('text');
const defaultTextId = textParam || '000';
textLoader.loadManifest().then(() => textLoader.loadBuiltIn(defaultTextId));
