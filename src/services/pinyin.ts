let pinyinModule: typeof import('pinyin-pro') | null = null;

async function loadPinyinPro() {
  if (!pinyinModule) {
    pinyinModule = await import('pinyin-pro');
  }
  return pinyinModule;
}

// CJK Unified Ideographs range
const CJK_RE = /[\u4e00-\u9fff\u3400-\u4dbf]/;

export async function annotateWithPinyin(text: string): Promise<string> {
  const mod = await loadPinyinPro();

  // Get pinyin for the full text, returns space-separated pinyin
  const pinyinArr = mod.pinyin(text, { type: 'array' });

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
