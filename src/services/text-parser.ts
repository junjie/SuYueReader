import type { Paragraph } from '../types/index.ts';

export function parseText(raw: string): Paragraph[] {
  const trimmed = raw.trim();
  if (!trimmed) return [];

  // Split by double newlines (paragraphs), fallback to single newlines
  let parts = trimmed.split(/\n\n+/);
  if (parts.length === 1) {
    parts = trimmed.split(/\n/);
  }

  return parts
    .map((text, i) => ({ index: i + 1, text: text.trim() }))
    .filter((p) => p.text.length > 0);
}
