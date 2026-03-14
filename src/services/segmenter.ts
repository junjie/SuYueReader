export interface Segment {
  text: string;
  isWordLike: boolean;
}

const CJK_RE = /[\u4e00-\u9fff\u3400-\u4dbf]/;

let segmenter: Intl.Segmenter | null = null;

function getSegmenter(): Intl.Segmenter | null {
  if (segmenter) return segmenter;
  if (typeof Intl !== 'undefined' && 'Segmenter' in Intl) {
    segmenter = new Intl.Segmenter('zh', { granularity: 'word' });
    return segmenter;
  }
  return null;
}

/** Fallback: wrap each CJK character individually, keep non-CJK runs together */
function fallbackSegment(text: string): Segment[] {
  const segments: Segment[] = [];
  let nonCjk = '';

  for (const char of text) {
    if (CJK_RE.test(char)) {
      if (nonCjk) {
        segments.push({ text: nonCjk, isWordLike: false });
        nonCjk = '';
      }
      segments.push({ text: char, isWordLike: true });
    } else {
      nonCjk += char;
    }
  }
  if (nonCjk) {
    segments.push({ text: nonCjk, isWordLike: false });
  }
  return segments;
}

export function segmentText(text: string): Segment[] {
  const seg = getSegmenter();
  if (!seg) return fallbackSegment(text);

  return Array.from(seg.segment(text), (s) => ({
    text: s.segment,
    isWordLike: s.isWordLike ?? false,
  }));
}

/**
 * Post-process segments: re-segment runs of adjacent word-like CJK segments
 * using forward maximum matching against the dictionary.
 *
 * This handles two cases:
 * 1. Over-segmented: 上傳 → 上 + 傳 (should be merged into 上傳)
 * 2. Under-segmented: 也可以 → no entry (should be split into 也 + 可以)
 *
 * Segments that already have a dictionary entry and are a single segment
 * in the run are kept as-is.
 */
export function refineSegments(
  segments: Segment[],
  hasEntry: (word: string) => boolean
): Segment[] {
  const result: Segment[] = [];
  let i = 0;

  while (i < segments.length) {
    const seg = segments[i];

    // Only process word-like segments containing CJK characters
    if (!seg.isWordLike || !CJK_RE.test(seg.text)) {
      result.push(seg);
      i++;
      continue;
    }

    // Collect a run of consecutive word-like CJK segments
    const runStart = i;
    const runChars: string[] = [];
    while (i < segments.length && segments[i].isWordLike && CJK_RE.test(segments[i].text)) {
      runChars.push(...[...segments[i].text]);
      i++;
    }

    // If the run is a single segment that already has an entry, keep it
    if (i - runStart === 1 && hasEntry(seg.text)) {
      result.push(seg);
      continue;
    }

    // If the run is a single segment of 1-2 chars, keep it (nothing to refine)
    if (i - runStart === 1 && runChars.length <= 2) {
      result.push(seg);
      continue;
    }

    // Apply forward maximum matching on the combined CJK characters
    let pos = 0;
    while (pos < runChars.length) {
      let matched = false;
      for (let len = Math.min(runChars.length - pos, 6); len >= 2; len--) {
        const candidate = runChars.slice(pos, pos + len).join('');
        if (hasEntry(candidate)) {
          result.push({ text: candidate, isWordLike: true });
          pos += len;
          matched = true;
          break;
        }
      }
      if (!matched) {
        result.push({ text: runChars[pos], isWordLike: true });
        pos++;
      }
    }
  }

  return result;
}
