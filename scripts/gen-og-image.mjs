// Generate OG image SVG with 大學 text in vertical mode
import { writeFileSync } from 'fs';

const text = '大學之道，在明明德，在親民，在止於至善。知止而後有定，定而後能靜，靜而後能安，安而後能慮，慮而後能得。物有本末，事有終始，知所先後，則近道矣。古之欲明明德於天下者，先治其國；欲治其國者，先齊其家；欲齊其家者，先脩其身；欲脩其身者，先正其心；欲正其心者，先誠其意；欲誠其意者，先致其知，致知在格物。物格而後知至，知至而後意誠，意誠而後心正，心正而後身脩，身脩而後家齊，家齊而後國治，國治而後天下平。自天子以至於庶人，壹是皆以脩身為本。其本亂而末治者否矣，其所厚者薄，而其所薄者厚，未之有也！此謂知本，此謂知之至也。';

// Repeat text to ensure we fill the entire background
const allChars = [...text];
const isPunct = ch => '，。；！、？'.includes(ch);

// Highlight colors from the app
const HL = [
  { color: '#8b5cf6', bg: '#ede9fe' }, // purple
  { color: '#ec4899', bg: '#fce7f3' }, // pink
  { color: '#ea580c', bg: '#ffedd5' }, // orange
  { color: '#0d9488', bg: '#ccfbf1' }, // mint
  { color: '#2563eb', bg: '#dbeafe' }, // blue
];

const highlightDefs = [
  { word: '明明德', hl: HL[0], all: true },  // purple
  { word: '親民',   hl: HL[3], all: true },  // mint
  { word: '止於至善', hl: HL[2], all: true }, // orange
];

// Layout
const CHAR_SIZE = 38;
const CELL_H = 48;
const COL_W = 52;
const CHARS_PER_COL = 14;
const MARGIN_TOP = -10;
const MARGIN_RIGHT = 10 - COL_W / 2; // shift half a column left
const FONT = "'Noto Serif TC', serif";

// Calculate how many columns we need to fill the width
const NUM_COLS = Math.ceil((1200 + 60) / COL_W) + 1; // +1 to fill both edges
const TOTAL_CHARS = NUM_COLS * CHARS_PER_COL;

// Repeat chars to fill all columns, offset by one column to shift highlights right
const CHAR_OFFSET = allChars.length - CHARS_PER_COL * 2 + Math.round(CHARS_PER_COL / 2);
const repeatedChars = [];
for (let i = 0; i < TOTAL_CHARS; i++) {
  repeatedChars.push(allChars[(i + CHAR_OFFSET) % allChars.length]);
}

// Repeat text string for highlight matching
const repeatedText = repeatedChars.join('');

// Map global char index -> position
function charPos(globalIdx) {
  const colIdx = Math.floor(globalIdx / CHARS_PER_COL);
  const rowIdx = globalIdx % CHARS_PER_COL;
  const colX = 1200 - MARGIN_RIGHT - colIdx * COL_W - COL_W / 2;
  const cy = MARGIN_TOP + rowIdx * CELL_H + CHAR_SIZE;
  return { colX, cy };
}

// Center zone to avoid highlights
const CENTER = { x1: 300, x2: 900, y1: 100, y2: 470 };
function inCenter(colX, cy) {
  return colX > CENTER.x1 && colX < CENTER.x2 && cy > CENTER.y1 && cy < CENTER.y2;
}

// Build highlight map
const charHighlights = new Map();
for (const { word, hl, all } of highlightDefs) {
  let searchFrom = 0;
  while (true) {
    const idx = repeatedText.indexOf(word, searchFrom);
    if (idx < 0 || idx >= TOTAL_CHARS) break;
    const charIdx = [...repeatedText.slice(0, idx)].length;

    let anyInCenter = false;
    const wordLen = [...word].length;
    for (let i = 0; i < wordLen; i++) {
      const { colX, cy } = charPos(charIdx + i);
      if (inCenter(colX, cy)) { anyInCenter = true; break; }
    }

    if (!anyInCenter) {
      for (let i = 0; i < wordLen; i++) {
        charHighlights.set(charIdx + i, hl);
      }
    }

    searchFrom = idx + word.length;
    if (!all) break;
  }
}

// Generate columns
let bgNormal = '';
let bgHighlight = '';

for (let colIdx = 0; colIdx < NUM_COLS; colIdx++) {
  const colX = 1200 - MARGIN_RIGHT - colIdx * COL_W - COL_W / 2;

  for (let rowIdx = 0; rowIdx < CHARS_PER_COL; rowIdx++) {
    const globalIdx = colIdx * CHARS_PER_COL + rowIdx;
    const ch = repeatedChars[globalIdx];
    const cy = MARGIN_TOP + rowIdx * CELL_H + CHAR_SIZE;
    const hl = charHighlights.get(globalIdx);

    let el = '';
    if (hl) {
      const pad = 5;
      const w = CHAR_SIZE + pad * 2;
      const h = CHAR_SIZE + pad * 2;
      const rx = 8;
      el += `    <rect x="${colX - w/2}" y="${cy - CHAR_SIZE - pad + 6}" width="${w}" height="${h}" rx="${rx}" fill="${hl.bg}"/>\n`;
      el += `    <text x="${colX}" y="${cy}" font-family="${FONT}" font-size="${CHAR_SIZE}" fill="${hl.color}" text-anchor="middle">${ch}</text>\n`;
      bgHighlight += el;
    } else {
      el += `    <text x="${colX}" y="${cy}" font-family="${FONT}" font-size="${CHAR_SIZE}" fill="#1a1a1a" text-anchor="middle">${ch}</text>\n`;
      bgNormal += el;
    }
  }
}

// Title positioning
const TITLE_Y = 315;
const PINYIN_Y = TITLE_Y - 176 - 6;
const titleChars = [
  { py: 'sù',  cx: 600 - 105 },
  { py: 'yuè', cx: 600 + 105 },
];

let pinyinEls = '';
for (const { py, cx } of titleChars) {
  pinyinEls += `  <text x="${cx}" y="${PINYIN_Y}" font-family="system-ui, sans-serif" font-size="39" fill="#777" text-anchor="middle">${py}</text>\n`;
}

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <!-- Background -->
  <rect width="1200" height="630" fill="#faf8f5"/>

  <!-- Subtle top accent line -->
  <rect x="0" y="0" width="1200" height="4" fill="#2563eb" opacity="0.6"/>

  <!-- Background text (faint, no pinyin) -->
  <g opacity="0.09">
${bgNormal}  </g>

  <!-- Highlighted words (spread across edges) -->
  <g opacity="0.4">
${bgHighlight}  </g>

  <!-- Pinyin above title (ruby-style) -->
${pinyinEls}
  <!-- App name -->
  <text x="600" y="${TITLE_Y}" font-family="'Noto Serif SC', serif" font-weight="700" font-size="176" fill="#1a1a1a" text-anchor="middle" letter-spacing="0.12em">素阅</text>

  <!-- Tagline Chinese (静心 highlighted in blue pills) -->
  ${(() => {
    const y = TITLE_Y + 99;
    const fs = 56;
    // "静心读中文" 5 chars centered at 600
    const totalW = fs * 5;
    const textLeft = 600 - totalW / 2;
    const pad = 5;
    const cw = fs + pad * 2;
    const ch = fs + pad * 2;
    const rx = 8;
    // 静 = char 0, 心 = char 1
    const jingX = textLeft + fs * 0 + fs / 2;
    const xinX = textLeft + fs * 1 + fs / 2;
    return `<rect x="${jingX - cw/2}" y="${y - fs - pad + 6}" width="${cw}" height="${ch}" rx="${rx}" fill="#dbeafe"/>
  <rect x="${xinX - cw/2}" y="${y - fs - pad + 6}" width="${cw}" height="${ch}" rx="${rx}" fill="#dbeafe"/>
  <text x="600" y="${y}" font-family="'Noto Serif SC', serif" font-size="${fs}" fill="#333" text-anchor="middle"><tspan fill="#2563eb">静心</tspan>读中文</text>`;
  })()}

  <!-- Tagline English (better highlighted in blue pill) -->
  ${(() => {
    const y = TITLE_Y + 152;
    // "A better way to read Chinese." at 35px system font
    const totalW = 508;
    const textLeft = 600 - totalW / 2;
    const aWidth = 54;
    const betterW = 96;
    const hlX = textLeft + aWidth;
    const hlH = 40;
    const hlY = y - 29;
    const rx = 8;
    return `<rect x="${hlX}" y="${hlY}" width="${betterW}" height="${hlH}" rx="${rx}" fill="#dbeafe"/>
  <text x="600" y="${y}" font-family="system-ui, sans-serif" font-size="35" fill="#666" text-anchor="middle">A <tspan fill="#2563eb">better</tspan> way to read Chinese.</text>`;
  })()}

  <!-- Bottom border accent (5 colors) -->
  <rect x="0" y="622" width="240" height="8" fill="#8b5cf6"/>
  <rect x="240" y="622" width="240" height="8" fill="#ec4899"/>
  <rect x="480" y="622" width="240" height="8" fill="#ea580c"/>
  <rect x="720" y="622" width="240" height="8" fill="#0d9488"/>
  <rect x="960" y="622" width="240" height="8" fill="#2563eb"/>
</svg>`;

writeFileSync('public/og-image.svg', svg);
console.log('Generated public/og-image.svg');
