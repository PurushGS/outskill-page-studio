import { htmlResponse, json, messageHtml, readJson } from '../http/responses.js';

/** Public page rendering plus the studio's endpoints for page JSON. */
export class PageController {
  constructor({ pages, pageService, renderer, auth }) {
    this.pages = pages;
    this.pageService = pageService;
    this.renderer = renderer;
    this.auth = auth;
  }

  renderPage = async (_request, { slug }) => {
    // Templates open in the studio as starting designs; only published pages are on the web.
    const page = await this.pages.findSaved(slug);
    if (!page) return htmlResponse(messageHtml('Page not found', `No page called “${cleanSlug(slug)}”.`), { status: 404, headers: { 'Cache-Control': 'no-store' } });
    if (page.unpublished) {
      return htmlResponse(messageHtml('This page is no longer available', 'The campaign has ended. Check the latest video or post for a new link.'), { status: 404, headers: { 'Cache-Control': 'no-store' } });
    }
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

  unpublish = async (request, { slug }) => {
    this.auth.assert(request);
    const page = await this.pageService.unpublish(slug);
    return json({ ok: true, page });
  };
}

function cleanSlug(slug) {
  return slug.replace(/[^a-z0-9-]/gi, '');
}
