import { SettingsStore } from './state/settings.ts';
import { Reader } from './components/reader.ts';
import { TextLoader } from './components/text-loader.ts';
import { Navbar } from './components/navbar.ts';
import { OpenSheet } from './components/open-sheet.ts';
import { SettingsSheet } from './components/settings-sheet.ts';
import { parseText } from './services/text-parser.ts';
import { preloadDefaultFont } from './services/fonts.ts';
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

const textLoader = new TextLoader((text, _title) => {
  const paragraphs = parseText(text);
  reader.setParagraphs(paragraphs);
});

const openSheet = new OpenSheet(textLoader);
const settingsSheet = new SettingsSheet(store);
new Navbar(() => openSheet.toggle(), () => settingsSheet.toggle(), store);

// Load text: URL param or default intro document
const params = new URLSearchParams(window.location.search);
const textParam = params.get('text');
const defaultTextId = textParam || '000';
textLoader.loadManifest().then(() => textLoader.loadBuiltIn(defaultTextId));
