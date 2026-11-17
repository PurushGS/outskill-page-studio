import { findFormat, generateFormId } from '../../../../packages/attribution/src/formats.js';
import { HttpError } from '../http/responses.js';

/**
 * Rules for creating and updating pages, kept out of the HTTP layer:
 *   - a slug can only be taken once
 *   - the server assigns the form ID; format + form ID never change after
 *     creation, so every stored lead keeps pointing at the right form
 *   - nothing invalid is ever saved
 */
export class PageService {
  constructor({ pages, validator, newFormId = generateFormId, now = () => new Date() }) {
    this.pages = pages;
    this.validator = validator;
    this.newFormId = newFormId;
    this.now = now;
  }

  /** @param {object} draft  full page JSON from the studio, campaign.formId not set yet */
  async create(draft) {
    const format = findFormat(draft.campaign?.format);
    if (!format) throw new HttpError(422, 'Page is not valid', [`Pick a format for this page`]);
    if (await this.pages.exists(draft.slug)) {
      throw new HttpError(409, `The link /${draft.slug} is already used by another page. Pick a different page slug.`);
    }

    const page = { ...draft, campaign: { ...draft.campaign, formId: await this.#uniqueFormId(format) } };
    return this.#validateAndSave(page, { createdAt: this.now().toISOString() });
  }

  async update(slug, incoming) {
    if (incoming.slug !== slug) throw new HttpError(400, `Slug in the URL ("${slug}") and body ("${incoming.slug}") differ`);
    const existing = await this.pages.get(slug);
    const page = {
      ...incoming,
      campaign: { ...incoming.campaign, format: existing.campaign?.format, formId: existing.campaign?.formId },
    };
    return this.#validateAndSave(page, { createdAt: existing.createdAt });
  }

  async #validateAndSave(page, { createdAt }) {
    const errors = this.validator.validate(page);
    if (errors.length) throw new HttpError(422, 'Page is not valid', errors);
    const saved = { ...page, createdAt: createdAt ?? this.now().toISOString(), updatedAt: this.now().toISOString() };
    await this.pages.save(saved);
    return saved;
  }

  async #uniqueFormId(format) {
    const taken = new Set((await this.pages.list()).map((p) => p.formId));
    for (let attempt = 0; attempt < 5; attempt++) {
      const id = this.newFormId(format);
      if (!taken.has(id)) return id;
    }
    throw new HttpError(500, 'Could not assign a unique form ID, please try again');
  }
}
