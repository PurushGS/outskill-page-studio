import { htmlResponse, json, readJson } from '../http/responses.js';

/** Public page rendering plus the studio's endpoints for page JSON. */
export class PageController {
  constructor({ pages, pageService, renderer, auth }) {
    this.pages = pages;
    this.pageService = pageService;
    this.renderer = renderer;
    this.auth = auth;
  }

  renderPage = async (_request, { slug }) => {
    const page = await this.pages.find(slug);
    if (!page) return htmlResponse(notFoundHtml(slug), { status: 404, headers: { 'Cache-Control': 'no-store' } });
    // Short cache so studio edits show up within a minute, while traffic spikes from a video still hit the edge cache.
    return htmlResponse(this.renderer.render(page), { headers: { 'Cache-Control': 'public, max-age=60' } });
  };

  list = async (request) => {
    const format = new URL(request.url).searchParams.get('format');
    const pages = await this.pages.list();
    return json({ pages: format ? pages.filter((p) => p.format === format) : pages });
  };

  get = async (_request, { slug }) => json(await this.pages.get(slug));

  template = async (_request, { slug }) => json(this.pages.template(slug));

  create = async (request) => {
    this.auth.assert(request);
    const page = await this.pageService.create(await readJson(request));
    return json({ ok: true, url: `/${page.slug}`, page }, 201);
  };

  save = async (request, { slug }) => {
    this.auth.assert(request);
    const page = await this.pageService.update(slug, await readJson(request));
    return json({ ok: true, url: `/${slug}`, page });
  };
}

function notFoundHtml(slug) {
  const safe = slug.replace(/[^a-z0-9-]/gi, '');
  return `<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><title>Not found</title><body style="font-family:system-ui;padding:40px;text-align:center"><h1>Page not found</h1><p>No page called “${safe}”.</p></body>`;
}
