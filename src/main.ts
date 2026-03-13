import { SettingsStore } from './state/settings.ts';
import { Reader } from './components/reader.ts';
import { TextLoader } from './components/text-loader.ts';
import { Toolbar } from './components/toolbar.ts';
import { SettingsPanel } from './components/settings-panel.ts';
import { parseText } from './services/text-parser.ts';
import { preloadDefaultFont } from './services/fonts.ts';
import './styles/main.css';
import './styles/themes.css';
import './styles/toolbar.css';
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

const settingsPanelEl = document.getElementById('settings-panel')!;
const settingsPanel = new SettingsPanel(settingsPanelEl, store);

const toolbarEl = document.getElementById('toolbar')!;
new Toolbar(toolbarEl, textLoader, () => settingsPanel.toggle());

// Handle ?text= URL param
const params = new URLSearchParams(window.location.search);
const textParam = params.get('text');
if (textParam) {
  textLoader.loadManifest().then(() => textLoader.loadBuiltIn(textParam));
}
