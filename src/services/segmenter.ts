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
