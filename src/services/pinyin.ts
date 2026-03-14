let pinyinModule: typeof import('pinyin-pro') | null = null;

async function loadPinyinPro() {
  if (!pinyinModule) {
    pinyinModule = await import('pinyin-pro');
  }
  return pinyinModule;
}

// CJK Unified Ideographs range
const CJK_RE = /[\u4e00-\u9fff\u3400-\u4dbf]/;

/** Get pinyin array for full text (context-aware polyphone resolution) */
export async function getPinyinArray(text: string): Promise<string[]> {
  const mod = await loadPinyinPro();
  return mod.pinyin(text, { type: 'array' });
}

export async function annotateWithPinyin(text: string): Promise<string> {
  const pinyinArr = await getPinyinArray(text);

  let result = '';
  let pIdx = 0;

  for (const char of text) {
    if (CJK_RE.test(char)) {
      const py = pinyinArr[pIdx] || '';
      result += `<ruby>${char}<rp>(</rp><rt>${py}</rt><rp>)</rp></ruby>`;
    } else {
      result += char;
    }
    pIdx++;
  }

  return result;
}
