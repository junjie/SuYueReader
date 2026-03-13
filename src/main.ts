import { SettingsStore } from './state/settings.ts';
import { Reader } from './components/reader.ts';
import { TextLoader } from './components/text-loader.ts';
import { FABs } from './components/fab.ts';
import { ActionSheet } from './components/action-sheet.ts';
import { SettingsSheet } from './components/settings-sheet.ts';
import { parseText } from './services/text-parser.ts';
import { preloadDefaultFont } from './services/fonts.ts';
import './styles/main.css';
import './styles/themes.css';
import './styles/fab.css';
import './styles/reader.css';
import './styles/settings.css';

preloadDefaultFont();

const store = new SettingsStore();

const readerEl = document.getElementById('reader')!;
const reader = new Reader(readerEl, store);

const textLoader = new TextLoader((text, _title) => {
  const paragraphs = parseText(text);
  reader.setParagraphs(paragraphs);
});

const actionSheet = new ActionSheet(textLoader);
const settingsSheet = new SettingsSheet(store);

new FABs(
  () => actionSheet.open(),
  () => settingsSheet.toggle()
);

// Handle ?text= URL param
const params = new URLSearchParams(window.location.search);
const textParam = params.get('text');
if (textParam) {
  textLoader.loadManifest().then(() => textLoader.loadBuiltIn(textParam));
}
