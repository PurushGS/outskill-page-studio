import { HttpError } from '../http/responses.js';

/**
 * Where page definitions live.
 *
 *   1. KV (PAGES namespace): everything saved from the studio. Wins if present.
 *   2. Bundled templates (templates/<slug>/page.json): shipped with the code,
 *      used as starting points and as a fallback if KV is empty.
 *
 * Each KV entry also carries small metadata (format, campaign, form ID) so the
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

  async find(slug) {
    const saved = await this.kv.get(this.#key(slug), 'json');
    return saved ?? this.bundled[slug] ?? null;
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

  /** @returns {Promise<Array<{ slug, source: 'studio'|'template', format, campaignName, campaignId, formId }>>} */
  async list() {
    const all = new Map(Object.values(this.bundled).map((page) => [page.slug, { ...summarize(page), source: 'template' }]));
    let cursor;
    do {
      const batch = await this.kv.list({ prefix: 'page:', cursor });
      for (const { name, metadata } of batch.keys) {
        const slug = name.slice('page:'.length);
        all.set(slug, { slug, ...metadata, source: 'studio' });
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
    formId: page.campaign?.formId ?? '',
  };
}
