import { findFormat } from '../../../../packages/attribution/src/formats.js';
import { slugify } from '../../../../packages/attribution/src/attribution.js';
import { HttpError } from '../http/responses.js';

/** Paths the app itself uses, so no campaign can take them as its page link. */
export const RESERVED_SLUGS = new Set(['studio', 'api', 'apps', 'packages', 'templates', 'admin', 'login', 'favicon-ico', 'robots-txt', 'r', 'files']);

/**
 * Rules for creating and updating pages, kept out of the HTTP layer:
 *   - the page link (slug) is made from the campaign name when the page is
 *     created; renaming the campaign can move the page to a new link, and the
 *     old link then points to the new one so shared links keep working
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
    const { name, slug } = this.#linkFor(draft);
    if (slug && await this.pages.exists(slug)) {
      throw new HttpError(409, `A page with the link /${slug} already exists. Use a different campaign name (e.g. add the month or channel).`);
    }
    return this.#validateAndSave({ ...draft, slug, campaign: { ...draft.campaign, id: slug } }, { createdAt: this.now().toISOString() });
  }

  /**
   * Publishes the page at the link made from its (new) campaign name. The old
   * link is kept as a pointer to the new one, so links already shared keep
   * working. A page may take back one of its own old links.
   */
  async rename(slug, incoming) {
    const existing = await this.#current(slug);
    const { name, slug: to } = this.#linkFor(incoming);
    if (!to) throw new HttpError(422, 'Page is not valid', ['Give the page a campaign name: the page link is made from it']);
    if (to === slug) return this.update(slug, { ...incoming, slug });
    const taken = await this.pages.findEntry(to) ?? await this.pages.find(to);
    const ownOldLink = taken?.movedTo && (await this.pages.findSaved(to))?.slug === slug;
    if (taken && !ownOldLink) {
      throw new HttpError(409, `A page with the link /${to} already exists, so "${name}" can't be used. Use a different campaign name (e.g. add the month or channel).`);
    }
    const { unpublished, ...page } = { ...incoming, slug: to, campaign: { ...incoming.campaign, format: existing.campaign?.format, id: to } };
    const saved = await this.#validateAndSave(page, { createdAt: existing.createdAt });
    await this.pages.save({ slug, movedTo: to, updatedAt: this.now().toISOString() });
    return saved;
  }

  /** Publishing always puts the page (back) on the web. */
  async update(slug, incoming) {
    if (incoming.slug !== slug) throw new HttpError(400, `Slug in the URL ("${slug}") and body ("${incoming.slug}") differ`);
    const existing = await this.#current(slug);
    const { unpublished, ...page } = { ...incoming, campaign: { ...incoming.campaign, format: existing.campaign?.format, id: existing.campaign?.id || slug } };
    return this.#validateAndSave(page, { createdAt: existing.createdAt });
  }

  /** Takes the saved page off the web without changing or deleting it. */
  async unpublish(slug) {
    const existing = await this.#current(slug);
    const page = { ...existing, unpublished: true, updatedAt: this.now().toISOString() };
    await this.pages.save(page);
    return page;
  }

  /** The page saved at this link; an old link of a renamed page is refused, so it is never overwritten. */
  async #current(slug) {
    const existing = await this.pages.get(slug);
    if (existing.slug !== slug) throw new HttpError(409, `This page has moved to /${existing.slug}. Reload the studio to edit it there.`);
    return existing;
  }

  /** The page link a campaign name makes, refusing names that make none or that take the site's own paths. */
  #linkFor(page) {
    const name = String(page.campaign?.name ?? '').trim();
    const slug = slugify(name);
    if (name && !slug) {
      throw new HttpError(422, 'Page is not valid', ['Campaign name needs some English letters or numbers: the page link is made from them']);
    }
    if (RESERVED_SLUGS.has(slug)) {
      throw new HttpError(409, `"${name}" would make the link /${slug}, which the site itself uses. Use a more specific campaign name.`);
    }
    return { name, slug };
  }

  async #validateAndSave(page, { createdAt }) {
    const errors = this.validator.validate(page);
    if (errors.length) throw new HttpError(422, 'Page is not valid', errors);
    const saved = { ...page, createdAt: createdAt ?? this.now().toISOString(), updatedAt: this.now().toISOString() };
    await this.pages.save(saved);
    return saved;
  }
}
