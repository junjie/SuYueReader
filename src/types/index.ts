export interface Paragraph {
  index: number;
  text: string;
}

export type WritingMode = 'horizontal' | 'vertical';
export type PinyinPosition = 'over' | 'under';
export type ThemeMode = 'light' | 'dark' | 'sepia';

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
}
