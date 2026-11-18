import { findFormat } from '../../../../packages/attribution/src/formats.js';
import { slugify } from '../../../../packages/attribution/src/attribution.js';
import { HttpError } from '../http/responses.js';

/**
 * Rules for creating and updating pages, kept out of the HTTP layer:
 *   - the page link (slug) is made from the campaign name when the page is
 *     created, and never changes afterwards so shared links keep working
 *   - the format never changes after creation; the campaign ID is always the page link; the form URL is whatever the
 *     editor typed and may be edited later
 *   - unpublishing keeps the page but takes it off the web; publishing again brings it back
 *   - nothing invalid is ever saved
 */
export class PageService {
  constructor({ pages, validator, now = () => new Date() }) {
    this.pages = pages;
    this.validator = validator;
    this.now = now;
  }

  /** @param {object} draft  full page JSON from the studio; its slug is ignored */
  async create(draft) {
    if (!findFormat(draft.campaign?.format)) throw new HttpError(422, 'Page is not valid', ['Pick a format for this page']);
    const name = String(draft.campaign?.name ?? '').trim();
    const slug = slugify(name);
    if (name && !slug) {
      throw new HttpError(422, 'Page is not valid', ['Campaign name needs some English letters or numbers: the page link is made from them']);
    }
    if (slug && await this.pages.exists(slug)) {
      throw new HttpError(409, `A page with the link /${slug} already exists. Use a different campaign name (e.g. add the month or channel).`);
    }
    return this.#validateAndSave({ ...draft, slug, campaign: { ...draft.campaign, id: slug } }, { createdAt: this.now().toISOString() });
  }

  /** Publishing always puts the page (back) on the web. */
  async update(slug, incoming) {
    if (incoming.slug !== slug) throw new HttpError(400, `Slug in the URL ("${slug}") and body ("${incoming.slug}") differ`);
    const existing = await this.pages.get(slug);
    const { unpublished, ...page } = { ...incoming, campaign: { ...incoming.campaign, format: existing.campaign?.format, id: existing.campaign?.id || slug } };
    return this.#validateAndSave(page, { createdAt: existing.createdAt });
  }

  /** Takes the saved page off the web without changing or deleting it. */
  async unpublish(slug) {
    const existing = await this.pages.get(slug);
    const page = { ...existing, unpublished: true, updatedAt: this.now().toISOString() };
    await this.pages.save(page);
    return page;
  }

  async #validateAndSave(page, { createdAt }) {
    const errors = this.validator.validate(page);
    if (errors.length) throw new HttpError(422, 'Page is not valid', errors);
    const saved = { ...page, createdAt: createdAt ?? this.now().toISOString(), updatedAt: this.now().toISOString() };
    await this.pages.save(saved);
    return saved;
  }
}
