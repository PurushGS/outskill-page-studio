import { HttpError } from '../http/responses.js';

/**
 * Where page definitions live.
 *
 *   1. KV (PAGES namespace): everything saved from the studio. Wins if present.
 *   2. Bundled templates (templates/<slug>/page.json): shipped with the code,
 *      used as starting points and as a fallback if KV is empty.
 *
 * Each KV entry also carries small metadata (format, campaign, form URL) so the
 * page list can be filtered by format without reading every page.
 */
export class PageRepository {
  /**
   * @param {KVNamespace} kv
   * @param {Record<string, object>} bundledTemplates
   */
  constructor(kv, bundledTemplates) {
    this.kv = kv;
    this.bundled = bundledTemplates;
  }

  /** A renamed page is found by its old link too: the old entry only points to the new one. */
  async find(slug) {
    const saved = await this.findSaved(slug);
    return saved ?? this.bundled[slug] ?? null;
  }

  /** Only pages saved from the studio, following old links to the page's current one. Bundled templates are starting designs, never public pages. */
  async findSaved(slug) {
    let page = await this.findEntry(slug);
    // A few renames at most; the limit only guards against a loop.
    for (let hops = 0; page?.movedTo && hops < 10; hops += 1) page = await this.findEntry(page.movedTo);
    return page?.movedTo ? null : page;
  }

  /** The KV entry itself: a page, or { slug, movedTo } left behind when a page was renamed. */
  async findEntry(slug) {
    return this.kv.get(this.#key(slug), 'json');
  }

  async get(slug) {
    const page = await this.find(slug);
    if (!page) throw new HttpError(404, `No page with slug "${slug}"`);
    return page;
  }

  async exists(slug) {
    return (await this.find(slug)) !== null;
  }

  template(slug) {
    const template = this.bundled[slug];
    if (!template) throw new HttpError(404, `No template called "${slug}"`);
    return structuredClone(template);
  }

  async save(page) {
    await this.kv.put(this.#key(page.slug), JSON.stringify(page), { metadata: summarize(page) });
  }

  /** @returns {Promise<Array<{ slug, source: 'studio'|'template', format, campaignName, campaignId, formUrl, unpublished }>>} */
  async list() {
    const all = new Map(Object.values(this.bundled).map((page) => [page.slug, { ...summarize(page), source: 'template' }]));
    let cursor;
    do {
      const batch = await this.kv.list({ prefix: 'page:', cursor });
      for (const { name, metadata } of batch.keys) {
        const slug = name.slice('page:'.length);
        if (!metadata?.movedTo) all.set(slug, { slug, ...metadata, source: 'studio' });
      }
      cursor = batch.list_complete ? undefined : batch.cursor;
    } while (cursor);
    return [...all.values()].sort((a, b) => a.slug.localeCompare(b.slug));
  }

  #key(slug) {
    return `page:${slug}`;
  }
}

function summarize(page) {
  return {
    slug: page.slug,
    format: page.campaign?.format ?? '',
    campaignName: page.campaign?.name ?? '',
    campaignId: page.campaign?.id ?? '',
    formUrl: page.campaign?.formUrl ?? '',
    unpublished: Boolean(page.unpublished),
    ...(page.movedTo ? { movedTo: page.movedTo } : {}),
  };
}
