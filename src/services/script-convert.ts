import type { ScriptVariant } from '../types/index.ts';

type Converter = (text: string) => string;

let toSimplified: Converter | null = null;
let toTraditional: Converter | null = null;

async function ensureConverters(): Promise<void> {
  if (toSimplified && toTraditional) return;
  const OpenCC = await import('opencc-js');
  toSimplified = OpenCC.Converter({ from: 'tw', to: 'cn' });
  toTraditional = OpenCC.Converter({ from: 'cn', to: 'tw' });
}

const PUNCT_TO_TRADITIONAL: [string, string][] = [
  ['\u201C', '\u300C'], // " → 「
  ['\u201D', '\u300D'], // " → 」
  ['\u2018', '\u300E'], // ' → 『
  ['\u2019', '\u300F'], // ' → 』
];

const PUNCT_TO_SIMPLIFIED: [string, string][] = [
  ['\u300C', '\u201C'], // 「 → "
  ['\u300D', '\u201D'], // 」 → "
  ['\u300E', '\u2018'], // 『 → '
  ['\u300F', '\u2019'], // 』 → '
];

function convertPunctuation(text: string, mappings: [string, string][]): string {
  for (const [from, to] of mappings) {
    text = text.split(from).join(to);
  }
  return text;
}

/** Sync conversion — returns text unchanged if converters haven't loaded yet. */
export function convertScriptSync(text: string, variant: ScriptVariant): string {
  if (variant === 'simplified' && toSimplified) {
    return convertPunctuation(toSimplified(text), PUNCT_TO_SIMPLIFIED);
  }
  if (variant === 'traditional' && toTraditional) {
    return convertPunctuation(toTraditional(text), PUNCT_TO_TRADITIONAL);
  }
  return text;
}

export async function convertScript(text: string, variant: ScriptVariant): Promise<string> {
  if (variant === 'original') return text;
  await ensureConverters();
  if (variant === 'simplified') {
    return convertPunctuation(toSimplified!(text), PUNCT_TO_SIMPLIFIED);
  }
  return convertPunctuation(toTraditional!(text), PUNCT_TO_TRADITIONAL);
}
