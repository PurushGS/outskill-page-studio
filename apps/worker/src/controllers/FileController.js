import { HttpError, htmlResponse, json, messageHtml } from '../http/responses.js';
import { MAX_PDF_BYTES } from '../files/PdfStore.js';

/**
 * The PDF a page sends by email: uploaded from the studio, downloaded from
 * /files/…, and reached through the page's short link /r/<campaign>, which
 * always opens the page's current PDF (emails use it, so Replace reaches
 * people who open an old email too).
 */
export class FileController {
  /**
   * @param {object} deps
   * @param {PdfStore} deps.files
   * @param {PageRepository} deps.pages
   * @param {StudioAuth} deps.auth
   * @param {string} deps.basePath  public path pages live under ("" on a bare domain)
   */
  constructor({ files, pages, auth, basePath }) {
    this.files = files;
    this.pages = pages;
    this.auth = auth;
    this.basePath = basePath;
  }

  /** POST /api/files?slug=&name= with the PDF as the body. */
  upload = async (request) => {
    this.auth.assert(request);
    // Refuse oversized uploads before reading them into memory.
    if (Number(request.headers.get('Content-Length') || 0) > MAX_PDF_BYTES) throw new HttpError(413, 'PDFs can be up to 25 MB');
    const params = new URL(request.url).searchParams;
    const file = await this.files.save({ slug: params.get('slug'), name: params.get('name'), body: await request.arrayBuffer() });
    return json({ ok: true, file }, 201);
  };

  download = async (_request, { key }) => {
    const object = await this.files.open(key);
    if (!object) return notFound('File not found', 'This file does not exist.');
    return new Response(object.body, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': object.httpMetadata?.contentDisposition || 'attachment',
        // Keys never change content, so browsers and the edge may keep the file for a year.
        'Cache-Control': 'public, max-age=31536000, immutable',
        'X-Content-Type-Options': 'nosniff',
        ...(object.httpEtag ? { ETag: object.httpEtag } : {}),
      },
    });
  };

  shortLink = async (request, { slug }) => {
    const page = await this.pages.find(slug);
    const key = page?.integrations?.emailPdf?.key;
    if (!page || page.unpublished || !key) return notFound('Download not available', 'This download link has no file. Check the latest email or page.');
    const location = new URL(`${this.basePath}/files/${key}`, request.url).toString();
    // Not cached, so a replaced PDF is what the next click gets.
    return new Response(null, { status: 302, headers: { Location: location, 'Cache-Control': 'no-store' } });
  };
}

function notFound(title, text) {
  return htmlResponse(messageHtml(title, text), { status: 404, headers: { 'Cache-Control': 'no-store' } });
}
