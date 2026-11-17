import { LeadValidator } from '../../../../packages/lead-flow/src/LeadValidator.js';
import { normalizeAttribution } from '../../../../packages/attribution/src/attribution.js';
import { HttpError } from '../http/responses.js';

/**
 * Handles an application: validate → build one Application record with the
 * campaign + attribution → hand it to the ApplicationStore → tell the page
 * which resource links and WhatsApp group to show.
 */
export class LeadService {
  /**
   * @param {object} deps
   * @param {ApplicationStore} deps.store  where applications go (see ApplicationStore.js)
   * @param {PageRepository} deps.pages
   * @param {() => string} [deps.newId]
   * @param {() => Date} [deps.now]
   * @param {LeadValidator} [deps.validator]
   */
  constructor({ store, pages, newId = () => crypto.randomUUID(), now = () => new Date(), validator = new LeadValidator() }) {
    this.store = store;
    this.pages = pages;
    this.newId = newId;
    this.now = now;
    this.validator = validator;
  }

  /**
   * @param {string} slug
   * @param {{ formId: string, lead: object, attribution: object, visitorId: string, honeypot: string }} submission
   * @param {{ device, os, geoCountry, geoRegion, geoCity }} requestInfo  from describeRequest()
   */
  async submit(slug, submission, requestInfo) {
    const page = await this.pages.get(slug);
    const { campaign } = page;
    if (page.unpublished) throw new HttpError(410, 'This page is no longer accepting applications.');
    if (!campaign?.formId) throw new HttpError(409, 'This page is not set up for applications yet. Publish it from the studio first.');
    if (submission.formId !== campaign.formId) {
      // The page was republished with a different form since this visitor loaded it.
      throw new HttpError(409, 'This page was just updated. Please refresh and submit again.');
    }

    const response = {
      leadId: this.newId(),
      resources: (page.integrations?.resources || []).filter((r) => r.url),
      whatsappUrl: page.integrations?.whatsappCommunityUrl || '',
    };
    // Bots fill the hidden field; they get the normal answer but nothing is stored.
    if (submission.honeypot) return response;

    const { valid, errors, lead } = this.validator.validate(submission.lead);
    if (!valid) throw new HttpError(422, 'Please fix the highlighted fields', errors);

    try {
      await this.store.save(this.#toApplication(response.leadId, page, lead, submission, requestInfo));
    } catch (err) {
      console.error('Application store failed', response.leadId, err.message);
      throw new HttpError(503, 'We could not save your application just now. Please try again in a moment.');
    }
    return response;
  }

  /** @returns {Application} see ApplicationStore.js */
  #toApplication(applicationId, page, lead, submission, requestInfo) {
    const touch = normalizeAttribution(submission.attribution);
    return {
      applicationId,
      submittedAt: this.now().toISOString(),
      form: {
        id: page.campaign.formId,
        slug: page.slug,
        format: page.campaign.format,
        campaignId: page.campaign.id,
        campaignName: page.campaign.name,
      },
      applicant: lead,
      attribution: {
        source: touch.source,
        utmSource: touch.utm_source,
        utmMedium: touch.utm_medium,
        utmCampaign: touch.utm_campaign,
        utmContent: touch.utm_content,
        utmTerm: touch.utm_term,
        src: touch.src,
        clickId: touch.clickId || undefined,
        referrer: touch.referrer || undefined,
        landingUrl: touch.landingUrl || undefined,
        firstTouch: touch.firstTouch && {
          source: touch.firstTouch.source,
          campaign: touch.firstTouch.utm_campaign,
          content: touch.firstTouch.utm_content,
          referrer: touch.firstTouch.referrer || undefined,
          at: touch.firstTouch.at || undefined,
        },
      },
      context: {
        visitorId: String(submission.visitorId ?? '').slice(0, 64) || null,
        ...requestInfo,
      },
    };
  }
}
