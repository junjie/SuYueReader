type TTSState = 'stopped' | 'playing' | 'paused';

let state: TTSState = 'stopped';
let paragraphs: HTMLElement[] = [];
let currentIndex = 0;
let activeSpan: HTMLElement | null = null;
let voiceName = '';
let rate = 1.0;
let generation = 0;
let lastCharIndex = 0;

function setState(s: TTSState): void {
  state = s;
  document.dispatchEvent(new CustomEvent('tts-state-changed', { detail: { state: s } }));
}

function clearHighlight(): void {
  if (activeSpan) {
    activeSpan.classList.remove('tts-active');
    activeSpan = null;
  }
}

function clearAllHighlights(): void {
  document.querySelectorAll('.word.tts-active').forEach((el) => el.classList.remove('tts-active'));
  activeSpan = null;
}

const PREFERRED_VOICES = ['Tingting', 'Meijia', 'Sinji'];

function getChineseVoice(): SpeechSynthesisVoice | undefined {
  const voices = speechSynthesis.getVoices();
  if (voiceName) {
    const match = voices.find((v) => v.name === voiceName);
    if (match) return match;
  }
  const zhVoices = voices.filter((v) => v.lang.startsWith('zh'));
  for (const name of PREFERRED_VOICES) {
    const match = zhVoices.find((v) => v.name === name);
    if (match) return match;
  }
  return zhVoices[0];
}

function mapCharIndexToSpan(paragraph: HTMLElement, charIndex: number): HTMLElement | null {
  const walker = document.createTreeWalker(paragraph, NodeFilter.SHOW_TEXT);
  let offset = 0;
  let node: Text | null;
  while ((node = walker.nextNode() as Text | null)) {
    // Skip pinyin text inside <rt> elements
    if (node.parentElement?.closest('rt')) continue;
    const len = node.length;
    if (offset + len > charIndex) {
      let el: Node | null = node.parentElement;
      while (el && el !== paragraph) {
        if (el instanceof HTMLElement && el.classList.contains('word')) return el;
        el = el.parentElement;
      }
      return null;
    }
    offset += len;
  }
  return null;
}

/** Get text content excluding <rt> (pinyin) elements */
function getSpokenText(el: HTMLElement): string {
  let text = '';
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  let node: Text | null;
  while ((node = walker.nextNode() as Text | null)) {
    if (!node.parentElement?.closest('rt')) {
      text += node.textContent;
    }
  }
  return text;
}

function speakParagraph(index: number, gen: number, charOffset = 0): void {
  if (gen !== generation) return;
  if (index >= paragraphs.length) {
    ttsStop();
    return;
  }
  currentIndex = index;
  const para = paragraphs[index];
  const fullText = getSpokenText(para);
  if (!fullText.trim()) {
    speakParagraph(index + 1, gen);
    return;
  }

  const text = charOffset > 0 ? fullText.slice(charOffset) : fullText;
  if (!text.trim()) {
    speakParagraph(index + 1, gen);
    return;
  }

  const tag = para.tagName.toLowerCase();
  const isHeading = tag === 'h2' || tag === 'h3';

  const utterance = new SpeechSynthesisUtterance(text);

  const voice = getChineseVoice();
  if (voice) utterance.voice = voice;
  utterance.rate = rate;
  utterance.lang = 'zh-CN';

  utterance.onboundary = (e: SpeechSynthesisEvent) => {
    if (gen !== generation) return;
    if (e.name === 'word') {
      clearHighlight();
      // Map back to full paragraph charIndex
      const fullCharIndex = e.charIndex + charOffset;
      lastCharIndex = fullCharIndex;
      const span = mapCharIndexToSpan(para, fullCharIndex);
      if (span) {
        span.classList.add('tts-active');
        activeSpan = span;
      }
    }
  };

  utterance.onend = () => {
    clearHighlight();
    if (gen !== generation) return;
    if (state === 'playing') {
      // Advance position now so any mid-delay restart targets the next paragraph
      currentIndex = index + 1;
      lastCharIndex = 0;
      const next = paragraphs[index + 1];
      if (next) next.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Insert pauses at section boundaries, scaled by reading speed
      const nextIsHeading = next && (next.tagName.toLowerCase() === 'h2' || next.tagName.toLowerCase() === 'h3');
      const curIsHeading = isHeading;
      let delay = 0;
      if (nextIsHeading) delay = 700;       // body → heading: longest pause
      else if (curIsHeading) delay = 400;    // heading → body: shorter pause
      delay = Math.round(delay / rate);      // scale inversely with speed
      if (delay) {
        setTimeout(() => {
          if (gen !== generation) return;
          speakParagraph(index + 1, gen);
        }, delay);
      } else {
        speakParagraph(index + 1, gen);
      }
    }
  };

  utterance.onerror = (e) => {
    if (gen !== generation) return;
    if (e.error !== 'interrupted' && e.error !== 'canceled') {
      ttsStop();
    }
  };

  speechSynthesis.speak(utterance);
}

function restartCurrent(): void {
  if (state === 'stopped') return;
  const wasPlaying = state === 'playing';
  generation++;
  speechSynthesis.cancel();
  clearHighlight();
  if (wasPlaying) {
    speakParagraph(currentIndex, generation, lastCharIndex);
  }
  // If paused, the new settings will apply on next resume via restartOnResume
}

// Track whether a restart is needed on resume (settings changed while paused)
let restartOnResume = false;

function findFirstVisibleParagraph(): number {
  for (let i = 0; i < paragraphs.length; i++) {
    const rect = paragraphs[i].getBoundingClientRect();
    if (rect.bottom > 0 && rect.top < window.innerHeight) return i;
  }
  return 0;
}

export function ttsStart(els: HTMLElement[]): void {
  generation++;
  speechSynthesis.cancel();
  clearAllHighlights();
  paragraphs = els;
  lastCharIndex = 0;
  restartOnResume = false;
  setState('playing');
  const startIdx = findFirstVisibleParagraph();
  speakParagraph(startIdx, generation);
}

export function ttsPause(): void {
  speechSynthesis.pause();
  setState('paused');
}

export function ttsResume(): void {
  if (restartOnResume) {
    restartOnResume = false;
    generation++;
    speechSynthesis.cancel();
    setState('playing');
    speakParagraph(currentIndex, generation, lastCharIndex);
  } else {
    speechSynthesis.resume();
    setState('playing');
  }
}

export function ttsStop(): void {
  generation++;
  restartOnResume = false;
  speechSynthesis.cancel();
  clearAllHighlights();
  paragraphs = [];
  lastCharIndex = 0;
  setState('stopped');
}

export function ttsIsSupported(): boolean {
  return 'speechSynthesis' in window;
}

export function ttsGetVoices(): SpeechSynthesisVoice[] {
  const zh = speechSynthesis.getVoices().filter((v) => v.lang.startsWith('zh'));
  const byName = new Map<string, SpeechSynthesisVoice>();
  for (const v of zh) byName.set(v.name, v);
  const voices = [...byName.values()];
  const preferredSet = new Set(PREFERRED_VOICES);
  voices.sort((a, b) => {
    const ap = preferredSet.has(a.name) ? 0 : 1;
    const bp = preferredSet.has(b.name) ? 0 : 1;
    return ap - bp;
  });
  return voices;
}

export function ttsSetVoice(name: string): void {
  const changed = voiceName !== name;
  voiceName = name;
  if (changed && state === 'playing') {
    restartCurrent();
  } else if (changed && state === 'paused') {
    restartOnResume = true;
  }
}

export function ttsSetRate(r: number): void {
  const changed = rate !== r;
  rate = r;
  if (changed && state === 'playing') {
    restartCurrent();
  } else if (changed && state === 'paused') {
    restartOnResume = true;
  }
}

export function ttsPreview(name: string): void {
  // Don't interrupt an active reading session
  if (state !== 'stopped') return;
  speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance('你好，欢迎使用');
  const saved = voiceName;
  voiceName = name;
  const voice = getChineseVoice();
  voiceName = saved;
  if (voice) utterance.voice = voice;
  utterance.lang = 'zh-CN';
  utterance.rate = rate;
  speechSynthesis.speak(utterance);
}

export function ttsJumpTo(wordSpan: HTMLElement): void {
  if (state === 'stopped') return;
  // Find which paragraph contains this span
  const parent = wordSpan.closest('[data-index]') as HTMLElement | null;
  if (!parent) return;
  const paraIdx = paragraphs.indexOf(parent);
  if (paraIdx === -1) return;

  // Calculate char offset of this span within the paragraph (excluding pinyin)
  const walker = document.createTreeWalker(parent, NodeFilter.SHOW_TEXT);
  let offset = 0;
  let node: Text | null;
  let found = false;
  while ((node = walker.nextNode() as Text | null)) {
    if (node.parentElement?.closest('rt')) continue;
    if (wordSpan.contains(node)) {
      found = true;
      break;
    }
    offset += node.length;
  }
  if (!found) return;

  const wasPaused = state === 'paused';
  generation++;
  speechSynthesis.cancel();
  clearHighlight();
  restartOnResume = false;
  currentIndex = paraIdx;
  lastCharIndex = offset;

  if (wasPaused) {
    // Speak only the tapped word, then pause at that position
    const wordText = wordSpan.textContent || '';
    const utterance = new SpeechSynthesisUtterance(wordText);
    const voice = getChineseVoice();
    if (voice) utterance.voice = voice;
    utterance.rate = rate;
    utterance.lang = 'zh-CN';
    const gen = generation;
    utterance.onstart = () => {
      if (gen !== generation) return;
      clearHighlight();
      wordSpan.classList.add('tts-active');
      activeSpan = wordSpan;
    };
    utterance.onend = () => {
      if (gen !== generation) return;
      // Stay paused at this word; flag so play creates a fresh utterance
      restartOnResume = true;
      setState('paused');
    };
    utterance.onerror = () => {
      if (gen !== generation) return;
      restartOnResume = true;
      setState('paused');
    };
    setState('playing');
    speechSynthesis.speak(utterance);
  } else {
    setState('playing');
    speakParagraph(paraIdx, generation, offset);
  }
}

export function ttsGetState(): TTSState {
  return state;
}
