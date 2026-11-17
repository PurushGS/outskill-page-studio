import { Theme } from '../theme/Theme.js';
import { findFormat, FORM_ID_PATTERN } from '../../../attribution/src/formats.js';

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Checks a page definition before it is saved or rendered.
 * Returns a list of human-readable problems (empty list = valid), so the
 * studio can show them to a non-engineer instead of throwing.
 */
export class PageValidator {
  constructor(registry) {
    this.registry = registry;
  }

  validate(page) {
    const errors = [];
    if (!page || typeof page !== 'object') return ['Page must be an object'];

    if (!SLUG_PATTERN.test(page.slug || '')) {
      errors.push('Slug must be lowercase letters, numbers and dashes, e.g. "ai-tools-hindi"');
    }
    if (!page.meta?.title) errors.push('Page needs a meta.title (shown in the browser tab and on WhatsApp previews)');
    errors.push(...this.#campaignErrors(page.campaign));
    errors.push(...this.#resourceErrors(page.integrations?.resources));

    try {
      new Theme(page.theme);
    } catch (err) {
      errors.push(err.message);
    }

    if (!Array.isArray(page.blocks) || page.blocks.length === 0) {
      errors.push('Page needs at least one block');
      return errors;
    }

    const seen = new Set();
    for (const block of page.blocks) {
      if (!block.id) errors.push(`A "${block.type}" block is missing an id`);
      else if (seen.has(block.id)) errors.push(`Block id "${block.id}" is used twice`);
      seen.add(block.id);
      if (!this.registry.has(block.type)) errors.push(`Unknown block type "${block.type}"`);
    }

    const forms = page.blocks.filter((b) => b.type === 'lead-form').length;
    if (forms === 0) errors.push('Every page needs the application form');
    if (forms > 1) errors.push('Only one application form per page is supported');
    return errors;
  }

  #campaignErrors(campaign) {
    if (!campaign) return ['Page needs campaign details (format, campaign name, campaign ID)'];
    const errors = [];
    if (!findFormat(campaign.format)) errors.push(`Unknown format "${campaign.format}"`);
    if (!String(campaign.name || '').trim()) errors.push('Campaign name is required');
    if (!SLUG_PATTERN.test(campaign.id || '')) errors.push('Campaign ID must be lowercase letters, numbers and dashes, e.g. "nov-ai-jobs"');
    if (!FORM_ID_PATTERN.test(campaign.formId || '')) errors.push('Form ID is missing or malformed (it is assigned automatically when a page is created)');
    return errors;
  }

  #resourceErrors(resources = []) {
    if (!Array.isArray(resources)) return ['Resource links must be a list'];
    return resources
      .filter((r) => r.url && !/^https?:\/\//i.test(r.url))
      .map((r) => `Resource link "${r.label || r.url}" must start with https://`);
  }
}
