/**
 * documentProcessor.js
 * Extracts raw text from uploaded documents: PDF, DOCX, TXT.
 * Returns { rawText } — caller is responsible for summarisation.
 */

const pdfParse = require('pdf-parse');
const mammoth  = require('mammoth');

const MAX_RAW_CHARS = 15000; // safety cap before summarisation

// ── PDF helpers ───────────────────────────────────────────────────────────────

/**
 * Custom page renderer that gracefully skips broken content streams.
 * Called per-page by pdf-parse; returning '' on error lets other pages succeed.
 */
function tolerantPageRender(pageData) {
  return pageData
    .getTextContent({ normalizeWhitespace: true })
    .then((content) =>
      content.items
        .map((item) => (typeof item.str === 'string' ? item.str : ''))
        .join(' ')
    )
    .catch(() => '');
}

/**
 * Fallback: extract text directly from the raw PDF binary without PDF.js.
 * Works on uncompressed content streams only, but succeeds where PDF.js fails.
 *
 * Looks for BT...ET text blocks and extracts Tj / TJ operator strings.
 */
function rawBinaryExtract(buffer) {
  const str = buffer.toString('latin1');
  const texts = [];

  // Match BT…ET text objects
  const btEt = /BT([\s\S]*?)ET/g;
  let block;
  while ((block = btEt.exec(str)) !== null) {
    const content = block[1];

    // Single string: (Hello World) Tj
    const tjRe = /\(([^)\\]*(?:\\.[^)\\]*)*)\)\s*Tj/g;
    let m;
    while ((m = tjRe.exec(content)) !== null) {
      texts.push(m[1].replace(/\\[nrt\\()]/g, ' '));
    }

    // Array: [(Hello) -200 (World)] TJ
    const tjArrRe = /\[([\s\S]*?)\]\s*TJ/g;
    while ((m = tjArrRe.exec(content)) !== null) {
      const inner = m[1];
      const itemRe = /\(([^)\\]*(?:\\.[^)\\]*)*)\)/g;
      let item;
      while ((item = itemRe.exec(inner)) !== null) {
        texts.push(item[1]);
      }
    }
  }

  // Also try plain string objects outside BT/ET (e.g., metadata)
  const metaRe = /\/(?:Title|Subject|Author|Keywords|Description)\s*\(([^)]+)\)/g;
  let meta;
  while ((meta = metaRe.exec(str)) !== null) {
    texts.unshift(meta[1]); // prepend — metadata is high signal
  }

  return texts
    .map((t) => t.trim())
    .filter(Boolean)
    .join(' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/**
 * Try to extract text from a PDF buffer using progressive fallbacks.
 *
 * Attempt 1 – standard pdf-parse (fast, works for well-formed PDFs)
 * Attempt 2 – tolerant page renderer (skips malformed content streams)
 * Attempt 3 – parse only first page with tolerant renderer
 * Attempt 4 – raw binary extraction (bypasses PDF.js entirely)
 */
async function extractPdfText(buffer) {
  // Attempt 1: standard parse
  try {
    const result = await pdfParse(buffer);
    const text = (result.text || '').trim();
    if (text) return text;
  } catch (_) { /* fall through */ }

  // Attempt 2: tolerant custom renderer
  try {
    const result = await pdfParse(buffer, { pagerender: tolerantPageRender });
    const text = (result.text || '').trim();
    if (text) return text;
  } catch (_) { /* fall through */ }

  // Attempt 3: first page only, tolerant renderer
  try {
    const result = await pdfParse(buffer, { max: 1, pagerender: tolerantPageRender });
    const text = (result.text || '').trim();
    if (text) return `[Partial — first page only]\n\n${text}`;
  } catch (_) { /* fall through */ }

  // Attempt 4: raw binary extraction — bypasses PDF.js entirely
  try {
    const text = rawBinaryExtract(buffer);
    if (text && text.length > 20) {
      return `[Extracted via compatibility mode]\n\n${text}`;
    }
  } catch (_) { /* fall through */ }

  throw new Error(
    'Unable to extract text from this PDF. ' +
    'The file may use compressed streams or be image-only. ' +
    'Please try saving it as a .txt or .docx file instead.'
  );
}

// ── Main entry point ──────────────────────────────────────────────────────────

/**
 * @param {Buffer} buffer        - file data
 * @param {string} mimetype      - MIME type of the file
 * @param {string} originalname  - original filename (used for type detection fallback)
 * @returns {Promise<{ rawText: string }>}
 */
async function processDocument(buffer, mimetype, originalname = '') {
  const lower = originalname.toLowerCase();

  // ── PDF ──────────────────────────────────────────────────────────────────
  if (mimetype === 'application/pdf' || lower.endsWith('.pdf')) {
    const rawText = (await extractPdfText(buffer)).slice(0, MAX_RAW_CHARS);
    return { rawText };
  }

  // ── DOCX ─────────────────────────────────────────────────────────────────
  if (
    mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    lower.endsWith('.docx')
  ) {
    const result = await mammoth.extractRawText({ buffer });
    const rawText = (result.value || '').trim().slice(0, MAX_RAW_CHARS);
    if (!rawText) throw new Error('DOCX appears to be empty.');
    return { rawText };
  }

  // ── TXT / plain text ─────────────────────────────────────────────────────
  if (
    mimetype === 'text/plain' ||
    lower.endsWith('.txt') ||
    lower.endsWith('.md') ||
    lower.endsWith('.csv')
  ) {
    const rawText = buffer.toString('utf-8').trim().slice(0, MAX_RAW_CHARS);
    if (!rawText) throw new Error('Text file is empty.');
    return { rawText };
  }

  throw new Error(`Unsupported document type: ${mimetype || originalname}`);
}

module.exports = { processDocument };
