import { LeadValidator } from '../../../../packages/lead-flow/src/LeadValidator.js';
import { normalizeAttribution } from '../../../../packages/attribution/src/attribution.js';
import { parseFormUrl } from '../../../../packages/attribution/src/formats.js';
import { HttpError } from '../http/responses.js';

const UTM_FIELDS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
/** The WebEngage event sent when an application completes; WebEngage journeys (e.g. the PDF email) trigger on this name. */
export const APPLICATION_EVENT = 'Lead Form Submitted';
const ANSWER_TEXT_MAX = 1000;

/**
 * An application is three steps against the forms backend, the same as the
 * LP Management System:
 *
 *   createLead    name + email + phone + campaign + UTMs      → lead token
 *   saveResponse  one question's answer (the last one is sent with IsFullySubmitted)
 *   complete      marks the application done                  → what the success screen shows
 *                 then tells WebEngage (event APPLICATION_EVENT, matched by leadUUID) with the
 *                 page's resource link, campaign and UTMs, for the follow-up email
 *
 * The page's Form URL decides which form and campaign everything goes to.
 * The browser never chooses the form: it is always read from the saved page.
 */
export class LeadService {
  /**
   * @param {object} deps
   * @param {FormsApiClient} deps.api
   * @param {PageRepository} deps.pages
   * @param {() => string} [deps.newId]
   * @param {LeadValidator} [deps.validator]
   * @param {string} [deps.publicBaseUrl]  where pages are shared (PUBLIC_BASE_URL); else the request's own address
   * @param {(work: Promise) => Promise|void} [deps.later]  runs work after the response is sent (ctx.waitUntil); default: wait for it
   * @param {() => Date} [deps.now]
   */
  constructor({ api, pages, newId = () => crypto.randomUUID(), validator = new LeadValidator(), publicBaseUrl = '', later = (work) => work, now = () => new Date() }) {
    this.api = api;
    this.pages = pages;
    this.newId = newId;
    this.validator = validator;
    this.publicBaseUrl = String(publicBaseUrl || '').replace(/\/+$/, '');
    this.later = later;
    this.now = now;
  }

  /** The form's questions. Public and read-only, so the page can show them before anyone applies. */
  async questionFlow(formId) {
    const id = Number(formId);
    if (!Number.isInteger(id) || id <= 0) throw new HttpError(400, 'Invalid form id');
    if (!this.api.canRead) throw new HttpError(503, 'Form questions are not connected yet: FORM_API_URL is not set on the server');
    return this.#backend(() => this.api.questionFlow(id), 'Could not load the form questions');
  }

  /** @param {{ formUrl: string, lead: object, attribution: object, honeypot: string }} submission */
  async createLead(slug, submission) {
    const { page, ids } = await this.#livePage(slug);
    if (submission.formUrl !== page.campaign.formUrl) {
      // The page was republished with a different form since this visitor loaded it.
      throw new HttpError(409, 'This page was just updated. Please refresh and submit again.');
    }
    const leadUUID = this.newId();
    // Bots fill the hidden field; they get the normal-looking answer but nothing is created.
    if (submission.honeypot) return { leadUUID, token: '' };

    const { valid, errors, lead } = this.validator.validate(submission.lead);
    if (!valid) throw new HttpError(422, 'Please fix the highlighted fields', errors);
    this.#assertWritable();

    const utm = this.#utm(submission.attribution, page.slug);
    const created = await this.#backend(() => this.api.createLead(ids.formId, {
      name: lead.name,
      email: lead.email,
      phone: lead.phone,
      leadUUID,
      ...(ids.campaignId ? { campaign_id: ids.campaignId } : {}),
      ...utm,
    }), 'We could not save your application just now. Please try again in a moment.');
    if (!created.token) {
      console.error('Forms backend created a lead without a token', ids.formId);
      throw new HttpError(503, 'We could not save your application just now. Please try again in a moment.');
    }
    return { leadUUID, token: created.token };
  }

  /** One answer. `body` is the browser's answer payload; only known fields are forwarded. */
  async saveResponse(slug, body) {
    const { ids } = await this.#livePage(slug);
    if (!body.userJwt) return {}; // the bots' empty token: nothing was created, so nothing to save
    this.#assertWritable();
    const answer = cleanAnswer(body);
    if (!body.leadUUID || answer.questionId == null) throw new HttpError(400, 'Answer needs leadUUID and questionId');
    const data = await this.#backend(() => this.api.saveResponse(ids.formId, body.leadUUID, body.userJwt, answer), 'We could not save your answer. Please try again.');
    return { formsApplicationId: data.formsApplicationId ?? null, formsApplicationMetadataId: data.formsApplicationMetadataId ?? null };
  }

  /** Marks the application complete and returns what the success screen shows (the page's links and redirect). */
  async complete(slug, body, origin = '') {
    const { page, ids } = await this.#livePage(slug);
    // The redirect URL is set in the studio (Campaign tab); the backend's answer has none.
    const result = { resources: (page.integrations?.resources || []).filter((r) => r.url), whatsappUrl: realLink(page.integrations?.whatsappCommunityUrl), redirectUrl: page.campaign.redirectUrl || '' };
    if (!body.userJwt) return result;
    this.#assertWritable();
    if (!body.leadUUID) throw new HttpError(400, 'Body must include leadUUID');
    await this.#backend(() => this.api.completeApplication(body.leadUUID, body.userJwt), 'We could not finish your application. Please try again.');
    await this.later(this.#tellWebEngage(page, ids, body, origin));
    return result;
  }

  /**
   * The event WebEngage journeys use for follow-up comms. The application is
   * already complete, so a failure here is logged and never shown to the visitor.
   */
  async #tellWebEngage(page, ids, body, origin) {
    const base = this.publicBaseUrl || String(origin).replace(/\/+$/, '');
    const pdf = page.integrations?.emailPdf;
    const firstResource = (page.integrations?.resources || []).find((r) => r.url);
    const eventData = {
      // The emailed PDF's short link: it always opens the page's current PDF.
      resource_url: pdf?.key ? `${base}/r/${page.slug}` : firstResource?.url || '',
      resource_name: pdf?.name || firstResource?.label || '',
      page_url: `${base}/${page.slug}`,
      campaign: page.slug,
      campaign_name: page.campaign.name || '',
      format: page.campaign.format || '',
      program_id: ids.programId,
      form_id: ids.formId,
      ...(ids.campaignId ? { campaign_id: ids.campaignId } : {}),
      whatsapp_url: realLink(page.integrations?.whatsappCommunityUrl),
      ...this.#utm(body.attribution, page.slug),
    };
    try {
      await this.api.webengageEvent({ eventName: APPLICATION_EVENT, distinct_id: body.leadUUID, eventTime: this.now().toISOString(), eventData });
    } catch (err) {
      console.error('WebEngage event failed', err.status ?? '', err.message);
    }
  }

  async #livePage(slug) {
    const page = await this.pages.get(slug);
    if (page.unpublished) throw new HttpError(410, 'This page is no longer accepting applications.');
    const ids = parseFormUrl(page.campaign?.formUrl);
    if (!ids) throw new HttpError(409, 'This page is not set up for applications yet. Publish it from the studio first.');
    return { page, ids };
  }

  #assertWritable() {
    if (!this.api.canWrite) throw new HttpError(503, 'Applications are not connected yet: FORM_API_URL and FORMS_API_TOKEN must be set on the server');
  }

  /**
   * The visit that converted, as the snake_case fields the backend knows.
   * utm_campaign always starts with the page's slug. If the visitor's link also
   * had a utm_campaign of its own, it follows after a slash: "slug/example".
   * (Our own tracked links carry the slug itself, which is sent once.)
   */
  #utm(attribution, slug) {
    const touch = normalizeAttribution(attribution);
    const utm = Object.fromEntries(UTM_FIELDS.filter((key) => touch[key]).map((key) => [key, touch[key]]));
    const own = String(touch.utm_campaign ?? '').trim();
    return { ...utm, utm_campaign: own && own.toLowerCase() !== slug ? `${slug}/${own}` : slug };
  }

  async #backend(call, friendlyMessage) {
    try {
      return await call();
    } catch (err) {
      console.error('Forms backend failed', err.status ?? '', err.message);
      throw new HttpError(503, friendlyMessage);
    }
  }
}

/** Only the fields the backend's response API takes, with sane sizes. */
function cleanAnswer(body) {
  const text = (value) => String(value ?? '').slice(0, ANSWER_TEXT_MAX);
  return {
    questionId: body.questionId,
    formsQuestionIdentityId: body.formsQuestionIdentityId,
    questionType: body.questionType,
    questionCategory: body.questionCategory,
    responses: (Array.isArray(body.responses) ? body.responses : []).slice(0, 20).map(text),
    ...(Array.isArray(body.optionIds) ? { optionIds: body.optionIds.slice(0, 20) } : {}),
    ...(body.formsApplicationId != null ? { formsApplicationId: body.formsApplicationId } : {}),
    ...(body.formsApplicationMetadataId != null ? { formsApplicationMetadataId: body.formsApplicationMetadataId } : {}),
    IsFullySubmitted: body.IsFullySubmitted === true,
  };
}

/**
 * Templates ship with "…REPLACE_WITH_COMMUNITY_INVITE" until the editor pastes
 * the real invite. Such a link is treated as not set: no button, and the
 * thank-you screen does not send people to a broken invite.
 */
function realLink(url) {
  return url && !/REPLACE_WITH/i.test(url) ? url : '';
}
