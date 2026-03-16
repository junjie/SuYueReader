type PDFLib = typeof import('pdfjs-dist');

let mammothModule: { extractRawText: (opts: { arrayBuffer: ArrayBuffer }) => Promise<{ value: string }> } | null = null;
let pdfjsModule: PDFLib | null = null;

async function ensureMammoth() {
  if (!mammothModule) {
    mammothModule = await import('mammoth');
  }
  return mammothModule;
}

async function ensurePdfjs() {
  if (!pdfjsModule) {
    const pdfjs = await import('pdfjs-dist');
    pdfjs.GlobalWorkerOptions.workerSrc =
      'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.worker.min.mjs';
    pdfjsModule = pdfjs;
  }
  return pdfjsModule;
}

async function extractDocx(buffer: ArrayBuffer): Promise<string> {
  const mammoth = await ensureMammoth();
  const result = await mammoth.extractRawText({ arrayBuffer: buffer });
  return result.value;
}

async function extractPdf(buffer: ArrayBuffer): Promise<string> {
  const pdfjs = await ensurePdfjs();
  const doc = await pdfjs.getDocument({ data: buffer }).promise;
  const pages: string[] = [];

  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    let lastY: number | null = null;
    let line = '';

    for (const item of content.items) {
      if (!('str' in item)) continue;
      const y = item.transform[5];
      if (lastY !== null && Math.abs(y - lastY) > 2) {
        // Y changed — new line
        pages.push(line);
        line = '';
      }
      line += item.str;
      lastY = y;
    }
    if (line) pages.push(line);
    // Blank line between pages
    pages.push('');
  }

  const text = pages.join('\n').trim();
  if (text.length < 10) {
    throw new Error('This PDF appears to be scanned or image-based — no extractable text was found.');
  }
  return text;
}

/**
 * Extract plain text from .docx or .pdf files.
 * Returns null for unsupported extensions (caller should use existing flow).
 */
export async function extractText(file: File): Promise<string | null> {
  const name = file.name.toLowerCase();
  const buffer = await file.arrayBuffer();

  if (name.endsWith('.docx')) {
    return extractDocx(buffer);
  }
  if (name.endsWith('.pdf')) {
    return extractPdf(buffer);
  }
  return null;
}
