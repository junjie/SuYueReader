export type HighlightColor = 'purple' | 'pink' | 'orange' | 'mint' | 'blue';

export interface InlineFormat {
  start: number;  // code-point offset in clean text
  end: number;    // exclusive
  type: 'bold' | 'underline' | 'highlight';
  color?: HighlightColor;
}

export interface FootnoteRange {
  start: number;  // code-point offset in clean text
  end: number;    // exclusive
  key: string;    // footnote lookup key
}

export interface Paragraph {
  index: number;
  text: string;
  type?: 'heading2' | 'heading3' | 'list-bullet' | 'list-ordered';
  formatting?: InlineFormat[];
  footnoteRanges?: FootnoteRange[];
}

export interface ParseResult {
  paragraphs: Paragraph[];
  footnotes: Map<string, string>;
}

export interface CRDRFile {
  version: 1;
  title: string;
  text: string;
  segments?: Record<number, { t: string; w: boolean }[][]>;
  dictionary?: Record<string, { t: string; p: string; d: string[] }[]>;
}

export type WritingMode = 'horizontal' | 'vertical';
export type PinyinPosition = 'over' | 'under';
export type ThemeMode = 'light' | 'dark' | 'sepia';
export type ScriptVariant = 'original' | 'simplified' | 'traditional';

export interface Settings {
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  paragraphSpacing: number;
  verticalParagraphSpacing: number;
  marginH: number;
  marginV: number;
  verticalMarginV: number;
  writingMode: WritingMode;
  theme: ThemeMode;
  showPinyin: boolean;
  pinyinPosition: PinyinPosition;
  pinyinSize: number;
  showNumbering: boolean;
  scriptVariant: ScriptVariant;
  lineLength: number;
}
