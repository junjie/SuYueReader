import type { Paragraph, ParseResult, InlineFormat, FootnoteRange, HighlightColor } from '../types/index.ts';

const HIGHLIGHT_COLORS = new Set<string>(['purple', 'pink', 'orange', 'mint', 'blue']);

/**
 * Extract footnote definitions from the text.
 * Format: `[^key]: definition text` starts a footnote.
 * Continuation lines indented with 2+ spaces are appended.
 * Blank lines between indented lines become paragraph breaks (\n\n).
 */
function extractFootnotes(raw: string): { body: string; footnotes: Map<string, string> } {
  const footnotes = new Map<string, string>();
  const footnoteStartRe = /^\[\^(.+?)\]:\s*(.*)$/;
  const lines = raw.split('\n');
  const bodyLines: string[] = [];

  let currentKey: string | null = null;
  let currentParts: string[] = [];

  function flushFootnote() {
    if (currentKey !== null) {
      footnotes.set(currentKey, currentParts.join('\n'));
      currentKey = null;
      currentParts = [];
    }
  }

  for (const line of lines) {
    const startMatch = line.match(footnoteStartRe);
    if (startMatch) {
      // New footnote definition — flush any previous one
      flushFootnote();
      currentKey = startMatch[1];
      const firstLine = startMatch[2].trim();
      if (firstLine) currentParts.push(firstLine);
      continue;
    }

    // If we're inside a footnote, check for continuation (indented) or blank line
    if (currentKey !== null) {
      if (line.match(/^[ \t]{2,}/)) {
        // Indented continuation line
        currentParts.push(line.replace(/^[ \t]+/, ''));
        continue;
      }
      if (line.trim() === '') {
        // Blank line inside footnote — treat as paragraph break if more indented lines follow.
        // For now, keep it as a separator; it'll be flushed if next line isn't indented.
        currentParts.push('');
        continue;
      }
      // Non-indented, non-blank line — footnote is done
      // Remove trailing blank lines from the footnote
      while (currentParts.length > 0 && currentParts[currentParts.length - 1] === '') {
        currentParts.pop();
      }
      flushFootnote();
    }

    bodyLines.push(line);
  }

  // Flush last footnote
  while (currentParts.length > 0 && currentParts[currentParts.length - 1] === '') {
    currentParts.pop();
  }
  flushFootnote();

  return { body: bodyLines.join('\n'), footnotes };
}

/**
 * Parse inline formatting markers from text.
 * - `**text**` → bold
 * - `__text__` → underline
 * - `{color:text}` → color highlight (purple, pink, orange, mint, blue)
 * - `[^word]` → footnote reference (stripped to just "word")
 */
function parseInlineFormatting(text: string): { cleanText: string; formatting: InlineFormat[]; footnoteRanges: FootnoteRange[] } {
  const formatting: InlineFormat[] = [];
  const footnoteRanges: FootnoteRange[] = [];
  let clean = '';
  let charIndex = 0; // code-point position in clean text
  let i = 0;

  let boldStart: number | null = null;
  let underlineStart: number | null = null;
  // Stack of open highlight markers: { start, color }
  const highlightStack: { start: number; color: HighlightColor }[] = [];

  while (i < text.length) {
    // Check for ** (bold toggle)
    if (text[i] === '*' && i + 1 < text.length && text[i + 1] === '*') {
      if (boldStart !== null) {
        if (charIndex > boldStart) {
          formatting.push({ start: boldStart, end: charIndex, type: 'bold' });
        }
        boldStart = null;
      } else {
        boldStart = charIndex;
      }
      i += 2;
      continue;
    }

    // Check for __ (underline toggle)
    if (text[i] === '_' && i + 1 < text.length && text[i + 1] === '_') {
      if (underlineStart !== null) {
        if (charIndex > underlineStart) {
          formatting.push({ start: underlineStart, end: charIndex, type: 'underline' });
        }
        underlineStart = null;
      } else {
        underlineStart = charIndex;
      }
      i += 2;
      continue;
    }

    // Check for {color: (highlight open)
    if (text[i] === '{') {
      const colonIdx = text.indexOf(':', i + 1);
      if (colonIdx !== -1 && colonIdx - i - 1 <= 10) {
        const colorName = text.substring(i + 1, colonIdx);
        if (HIGHLIGHT_COLORS.has(colorName)) {
          highlightStack.push({ start: charIndex, color: colorName as HighlightColor });
          i = colonIdx + 1;
          continue;
        }
      }
    }

    // Check for } (highlight close)
    if (text[i] === '}' && highlightStack.length > 0) {
      const hl = highlightStack.pop()!;
      if (charIndex > hl.start) {
        formatting.push({ start: hl.start, end: charIndex, type: 'highlight', color: hl.color });
      }
      i++;
      continue;
    }

    // Check for [^word] (footnote reference → strip markers, keep word)
    if (text[i] === '[' && i + 1 < text.length && text[i + 1] === '^') {
      const closeIdx = text.indexOf(']', i + 2);
      if (closeIdx !== -1) {
        const ref = text.substring(i + 2, closeIdx);
        const refLen = [...ref].length;
        footnoteRanges.push({ start: charIndex, end: charIndex + refLen, key: ref });
        clean += ref;
        charIndex += refLen;
        i = closeIdx + 1;
        continue;
      }
    }

    // Regular character (handle surrogate pairs)
    const code = text.codePointAt(i)!;
    const char = String.fromCodePoint(code);
    clean += char;
    charIndex++;
    i += char.length;
  }

  return {
    cleanText: clean,
    formatting: formatting.length > 0 ? formatting : [],
    footnoteRanges: footnoteRanges.length > 0 ? footnoteRanges : [],
  };
}

export function parseText(raw: string): ParseResult {
  const trimmed = raw.trim();
  if (!trimmed) return { paragraphs: [], footnotes: new Map() };

  // 1. Extract footnote definitions
  const { body, footnotes } = extractFootnotes(trimmed);

  // 2. Split by double newlines (paragraph breaks).
  // If no double newlines exist, fall back to treating each single newline as a paragraph break.
  let parts = body.split(/\n\n+/);
  if (parts.length === 1) {
    parts = body.split(/\n/);
  }

  // 3. Process each paragraph
  const paragraphs: Paragraph[] = [];
  let index = 1;

  for (const part of parts) {
    const text = part.trim();
    if (!text) continue;

    // Only single-line text can be a heading
    if (!text.includes('\n')) {
      // ## Subheading → heading3 (check before # to avoid false match)
      const h3Match = text.match(/^##\s+(.+)$/);
      if (h3Match) {
        const { cleanText, formatting, footnoteRanges } = parseInlineFormatting(h3Match[1]);
        paragraphs.push({
          index: index++,
          text: cleanText,
          type: 'heading3',
          formatting: formatting.length > 0 ? formatting : undefined,
          footnoteRanges: footnoteRanges.length > 0 ? footnoteRanges : undefined,
        });
        continue;
      }

      // # Heading → heading2
      const h2Match = text.match(/^#\s+(.+)$/);
      if (h2Match) {
        const { cleanText, formatting, footnoteRanges } = parseInlineFormatting(h2Match[1]);
        paragraphs.push({
          index: index++,
          text: cleanText,
          type: 'heading2',
          formatting: formatting.length > 0 ? formatting : undefined,
          footnoteRanges: footnoteRanges.length > 0 ? footnoteRanges : undefined,
        });
        continue;
      }
    }

    // Check if block contains list items (each line starts with - or * or 1.)
    // Lines may have trailing whitespace (e.g. markdown `  \n` line breaks)
    {
      const lines = text.split('\n').map(l => l.trimEnd());
      const allBullets = lines.every(l => /^[-*]\s+/.test(l));
      const allOrdered = lines.every(l => /^\d+[.)]\s+/.test(l));
      if (allBullets || allOrdered) {
        const listType = allBullets ? 'list-bullet' : 'list-ordered';
        const re = allBullets ? /^[-*]\s+(.+)$/ : /^\d+[.)]\s+(.+)$/;
        const groupIndex = index++;
        for (const line of lines) {
          const m = line.match(re);
          if (m) {
            const { cleanText, formatting, footnoteRanges } = parseInlineFormatting(m[1]);
            paragraphs.push({
              index: groupIndex,
              text: cleanText,
              type: listType,
              formatting: formatting.length > 0 ? formatting : undefined,
              footnoteRanges: footnoteRanges.length > 0 ? footnoteRanges : undefined,
            });
          }
        }
        continue;
      }
    }

    // Regular paragraph
    const { cleanText, formatting, footnoteRanges } = parseInlineFormatting(text);
    paragraphs.push({
      index: index++,
      text: cleanText,
      formatting: formatting.length > 0 ? formatting : undefined,
      footnoteRanges: footnoteRanges.length > 0 ? footnoteRanges : undefined,
    });
  }

  return { paragraphs, footnotes };
}
