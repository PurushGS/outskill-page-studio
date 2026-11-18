import { HttpError } from '../http/responses.js';

export const MAX_PDF_BYTES = 25 * 1024 * 1024;
const KEY_PATTERN = /^pdfs\/[a-z0-9-]+\/\d{8}-\d{6}-[a-z0-9._-]+\.pdf$/;

/**
 * PDFs that pages send by email, kept in an R2 bucket. Every upload gets its
 * own key, so a stored file never changes and can be cached for good; Replace
 * stores a new file and the page points at that one instead.
 */
export class PdfStore {
  /** @param {R2Bucket | undefined} bucket  undefined until the bucket is bound in wrangler.jsonc */
  constructor(bucket, { now = () => new Date() } = {}) {
    this.bucket = bucket;
    this.now = now;
  }

  /** @returns {Promise<{ key: string, name: string, size: number, uploadedAt: string }>} */
  async save({ slug, name, body }) {
    if (!this.bucket) throw new HttpError(503, 'File storage is not set up yet (R2 bucket binding FILES)');
    const bytes = new Uint8Array(body);
    if (!bytes.length) throw new HttpError(400, 'The file is empty');
    if (bytes.length > MAX_PDF_BYTES) throw new HttpError(413, 'PDFs can be up to 25 MB');
    if (!isPdf(bytes)) throw new HttpError(415, 'Only PDF files can be uploaded');

    const fileName = cleanFileName(name);
    const now = this.now();
    const key = `pdfs/${cleanFolder(slug)}/${stamp(now)}-${fileName}`;
    await this.bucket.put(key, bytes, {
      httpMetadata: { contentType: 'application/pdf', contentDisposition: `attachment; filename="${fileName}"` },
      customMetadata: { name: fileName },
    });
    return { key, name: fileName, size: bytes.length, uploadedAt: now.toISOString() };
  }

  /** The stored object, or null for an unknown or malformed key. */
  async open(key) {
    if (!this.bucket || !KEY_PATTERN.test(key)) return null;
    return this.bucket.get(key);
  }
}

/** "%PDF-" near the start, as every PDF reader checks; the extension alone proves nothing. */
function isPdf(bytes) {
  const head = new TextDecoder('latin1').decode(bytes.subarray(0, 1024));
  return head.includes('%PDF-');
}

/** "AI Jobs Guide (Nov).PDF" → "ai-jobs-guide-nov.pdf": safe in a URL and in a download header. */
function cleanFileName(name) {
  const base = String(name || '')
    .replace(/\.pdf$/i, '')
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^[-.]+|[-.]+$/g, '')
    .slice(0, 80);
  return `${base || 'file'}.pdf`;
}

/** Drafts have no page link yet; their files are grouped under "draft". */
function cleanFolder(slug) {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug || '') ? slug : 'draft';
}

function stamp(date) {
  return date.toISOString().replace(/[-:]/g, '').replace('T', '-').slice(0, 15);
}
