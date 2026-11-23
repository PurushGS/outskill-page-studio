import { parseFormUrl } from '../../attribution/src/formats.js';
import { LeadValidator } from './LeadValidator.js';
import { QuestionFlow } from './QuestionFlow.js';
import { QuestionPanel } from './QuestionPanel.js';
import { TrackingEvents } from './tracking/TrackingEvents.js';

/**
 * Brings a page-kit application form to life, the same way the LP
 * Management System's forms work:
 *
 *   1. the form's questions are loaded and shown under the contact fields
 *   2. as soon as name, email and phone are valid, the lead is created in
 *      the background; answers are then sent one by one as they are given
 *      (so a visitor who leaves half way is still captured)
 *   3. the last unanswered question's answer is held back; Submit sends it
 *      as "fully submitted" and completes the application, then shows the
 *      success panel, which counts down and then sends the visitor on: to
 *      the page's Redirect URL if it has one, else to its WhatsApp community
 *
 * Collaborators are injected (validator, tracker, transport, attribution)
 * so each can be replaced in tests or reused in another project's form.
 */
export class LeadFormController {
  /**
   * @param {object} deps
   * @param {HTMLFormElement} deps.form
   * @param {HTMLElement} deps.successPanel
   * @param {LeadTransport} deps.transport
   * @param {Tracker} deps.tracker
   * @param {{ collect(): object, visitorId(): string }} deps.attribution
   * @param {LeadValidator} [deps.validator]
   * @param {number} [deps.createDelayMs]  pause after typing before the lead is created
   * @param {(url: string) => void} [deps.redirect]  how to leave the page (replaced in tests; null = never redirect, e.g. preview)
   * @param {number} [deps.redirectSeconds]  countdown on the thank-you screen before the visitor is sent on
   * @param {string} [deps.basePath]  the public path pages live under ("" on outskill.live)
   * @param {(path: string) => void} [deps.showAddress]  how the address bar is changed after applying (null = never, e.g. preview)
   */
  constructor({ form, successPanel, transport, tracker, attribution, validator = new LeadValidator(), createDelayMs = 800, redirect = (url) => { window.location.href = url; }, redirectSeconds = 3, basePath = '', showAddress = (path) => { window.history.replaceState(window.history.state, '', path + window.location.search + window.location.hash); } }) {
    this.form = form;
    this.successPanel = successPanel;
    this.transport = transport;
    this.tracker = tracker;
    this.attribution = attribution;
    this.validator = validator;
    this.createDelayMs = createDelayMs;
    this.redirect = redirect;
    this.redirectSeconds = redirectSeconds;
    this.basePath = basePath;
    this.showAddress = showAddress;
    this.submitButton = form.querySelector('[type="submit"]');
    this.status = form.querySelector('.pk-form__status');
    const host = form.querySelector('[data-questions]');
    this.questions = host ? new QuestionPanel({ host, onAnswer: (answer) => this.#answered(answer) }) : null;

    this.lead = null; // { leadUUID, token } once created
    this.creating = null; // promise while the lead is being created
    this.queue = []; // answers waiting to be sent
    this.held = null; // the answer that completes the form: kept back until Submit
    this.submitted = new Set(); // questionIds already saved in the backend
    this.given = new Map(); // questionId → JSON of the last payload given for it
    this.application = {}; // ids the backend returns with the first answer
    this.flushing = null;
    this.timer = null;
  }

  start() {
    this.form.addEventListener('submit', (event) => {
      event.preventDefault();
      this.submit();
    });
    this.form.addEventListener('input', (event) => {
      // Clear a field's error as soon as the user starts fixing it.
      this.#showError(event.target.name, '');
      this.#scheduleCreate();
    });
    this.#loadQuestions();
    return this;
  }

  async submit() {
    const input = this.#readForm();
    // Validate here for instant feedback; the server validates the same raw input again.
    const { valid, errors, lead } = this.validator.validate(input);
    this.#showErrors(errors);
    if (!valid) {
      this.form.querySelector('[aria-invalid="true"]')?.focus();
      return;
    }

    this.#setBusy(true);
    try {
      await this.#ensureLead(input);
      this.#syncAnswers();
      if (!(await this.#flush())) throw new Error('We could not save your answers. Please try again.');

      // The held answer completes the form. If nothing was held (the form was not fully answered), the last answer is sent again as the completing one.
      const last = this.held ?? this.questions?.answers().at(-1);
      if (last) await this.#sendAnswer(last, true);

      // The visit's UTMs go along so the server can put them in the WebEngage event.
      const result = await this.transport.complete({ leadUUID: this.lead.leadUUID, userJwt: this.lead.token, attribution: this.attribution.collect() });
      this.#tellWebEngage(result.webengage, lead);
      this.tracker.identify(lead.email, { email: lead.email, name: lead.name, phone: lead.phone });
      this.tracker.track(TrackingEvents.LEAD_SUBMITTED, { leadId: this.lead.leadUUID, formUrl: this.form.dataset.formUrl });
      this.#showApplied();
      this.#showSuccess(result);
    } catch (err) {
      if (err.fieldErrors) this.#showErrors(err.fieldErrors);
      this.status.textContent = err.message || 'Something went wrong. Please try again.';
    } finally {
      this.#setBusy(false);
    }
  }

  /**
   * The WebEngage event (named by the server, e.g. "Lead Form Submitted"),
   * sent from here so it shows in the browser's Network tab. email is sent
   * top-level too, since the backend now uses it (not distinct_id) as the
   * WebEngage userId, so the event lands on the lead's real profile instead
   * of creating a new one per submission; distinct_id is still the leadUUID
   * (repeated in eventData as leadUUID); eventData is the server's part
   * (resource link, campaign, form ids, UTMs) plus what was filled in: name, email,
   * phone and answers.
   * Not awaited: the success screen never waits for it.
   */
  #tellWebEngage(webengage, lead) {
    if (!webengage?.url || !webengage.eventName) return;
    this.transport.webengageEvent(webengage.url, {
      eventName: webengage.eventName,
      distinct_id: this.lead.leadUUID,
      email: lead.email,
      eventTime: new Date().toISOString(),
      eventData: {
        ...webengage.eventData,
        leadUUID: this.lead.leadUUID,
        first_name: lead.name.split(/\s+/)[0],
        name: lead.name,
        email: lead.email,
        phone: lead.phone,
        ...this.questions?.fields(),
      },
    });
  }

  // ---------- questions ----------

  async #loadQuestions() {
    const formId = this.form.dataset.formId;
    if (!this.questions || !formId) return;
    try {
      this.questions.setFlow(new QuestionFlow(await this.transport.questionFlow(formId)));
    } catch {
      // The form still works without its questions: only the contact details are needed to apply.
    }
  }

  /**
   * An answer is held back when, with it, every shown question is answered:
   * that one is sent on Submit as the completing answer. Every other answer
   * goes to the backend as soon as it is given.
   */
  #answered(answer) {
    if (!answer) return;
    const id = answer.questionId;
    this.given.set(id, JSON.stringify(answer));

    const answeredElsewhere = new Set([...this.submitted, ...this.queue.map((a) => a.questionId), ...(this.held ? [this.held.questionId] : [])]);
    answeredElsewhere.delete(id);
    const ids = this.questions?.questionIds() ?? [];
    const isLast = ids.length > 0 && ids.every((qid) => qid === id || answeredElsewhere.has(qid));

    // A changed answer replaces the earlier one.
    this.queue = this.queue.filter((queued) => queued.questionId !== id);
    this.submitted.delete(id);

    if (isLast) {
      // Another answer was held before: release it to be sent normally.
      if (this.held && this.held.questionId !== id) this.queue.push(this.held);
      this.held = answer;
    } else {
      if (this.held?.questionId === id) this.held = null;
      this.queue.push(answer);
    }
    if (this.lead && this.queue.length) this.#flush();
  }

  /** Anything answered but not yet queued (e.g. a text box Enter was pressed in) joins the queue. */
  #syncAnswers() {
    for (const answer of this.questions?.answers() ?? []) {
      if (this.given.get(answer.questionId) !== JSON.stringify(answer)) this.#answered(answer);
    }
  }

  /** Sends queued answers one at a time, in order. Resolves false if one could not be sent. */
  #flush() {
    if (!this.flushing) {
      const run = (async () => {
        try {
          while (this.queue.length) {
            const item = this.queue[0];
            await this.#sendAnswer(item, false);
            this.submitted.add(item.questionId);
            // By identity: the person may have changed this answer while it was being sent.
            this.queue = this.queue.filter((queued) => queued !== item);
          }
          return true;
        } catch {
          return false;
        }
      })();
      this.flushing = run.finally(() => { this.flushing = null; });
    }
    return this.flushing;
  }

  async #sendAnswer(answer, isFullySubmitted) {
    const data = await this.transport.saveResponse({
      leadUUID: this.lead.leadUUID,
      userJwt: this.lead.token,
      ...this.application,
      IsFullySubmitted: isFullySubmitted,
      ...answer,
    });
    if (data.formsApplicationId != null) {
      this.application = { formsApplicationId: data.formsApplicationId, ...(data.formsApplicationMetadataId != null ? { formsApplicationMetadataId: data.formsApplicationMetadataId } : {}) };
    }
  }

  // ---------- the lead ----------

  #scheduleCreate() {
    if (this.lead || this.creating) return;
    clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      const input = this.#readForm();
      if (this.validator.validate(input).valid) this.#ensureLead(input).catch(() => {});
    }, this.createDelayMs);
  }

  /** Creates the lead once; later calls reuse it. */
  async #ensureLead(input) {
    if (this.lead) return this.lead;
    this.creating ??= this.transport.createLead({
      formUrl: this.form.dataset.formUrl,
      lead: input,
      attribution: this.attribution.collect(),
      visitorId: this.attribution.visitorId(),
      honeypot: new FormData(this.form).get('company_website') || '',
    }).then((lead) => {
      this.lead = lead;
      if (this.queue.length) this.#flush();
      return lead;
    }).finally(() => { this.creating = null; });
    return this.creating;
  }

  #readForm() {
    const data = new FormData(this.form);
    return {
      name: data.get('name'),
      email: data.get('email'),
      country: data.get('country'),
      phone: data.get('phone'),
      whatsappOptIn: data.get('whatsappOptIn') === 'on',
    };
  }

  #showErrors(errors) {
    for (const el of this.form.querySelectorAll('[data-error-for]')) this.#showError(el.dataset.errorFor, errors[el.dataset.errorFor] || '');
  }

  #showError(field, message) {
    const slot = this.form.querySelector(`[data-error-for="${field}"]`);
    const input = this.form.elements[field];
    if (slot) slot.textContent = message;
    if (input?.setAttribute) input.setAttribute('aria-invalid', message ? 'true' : 'false');
  }

  #setBusy(busy) {
    this.submitButton.setAttribute('aria-busy', String(busy));
    this.status.textContent = '';
  }

  /**
   * The address becomes /<campaign>/<programId>/<formId>/<campaignId?>, like
   * the LP Management System's pages, keeping the UTM tags. That link opens the same page.
   */
  #showApplied() {
    const ids = parseFormUrl(this.form.dataset.formUrl);
    if (!ids || !this.showAddress) return;
    const parts = [this.form.dataset.slug, ids.programId, ids.formId, ids.campaignId].filter((part) => part != null && part !== '');
    try {
      this.showAddress(`${this.basePath}/${parts.join('/')}`);
    } catch {
      // Changing the address is a nicety; the application is already in.
    }
  }

  /** @param {{ resources: Array<{label: string, url: string}>, whatsappUrl: string, redirectUrl?: string }} result */
  #showSuccess({ resources = [], whatsappUrl, redirectUrl = '' }) {
    const doc = this.form.ownerDocument;
    const links = this.successPanel.querySelector('[data-resource-links]');
    const goesOn = /^https?:\/\//i.test(redirectUrl);
    // With a Redirect URL the visitor is on their way: just the thank-you and a way to go now.
    const buttons = goesOn ? [{ label: 'Continue', url: redirectUrl }] : resources;
    links.replaceChildren(...buttons.map(({ label, url }, i) => {
      const a = doc.createElement('a');
      // The first link is the main action; any others are quieter.
      a.className = `pk-btn pk-btn--${i === 0 ? 'primary' : 'outline'} pk-btn--block`;
      a.href = url;
      if (!goesOn) a.target = '_blank';
      a.rel = 'noopener';
      a.textContent = label || 'Open resource';
      a.addEventListener('click', () => this.tracker.track(TrackingEvents.MATERIAL_OPENED, { label }), { once: true });
      return a;
    }));

    const whatsapp = this.successPanel.querySelector('[data-whatsapp-link]');
    whatsapp.hidden = goesOn || !whatsappUrl;
    whatsapp.href = whatsappUrl || '#';
    whatsapp.addEventListener('click', () => this.tracker.track(TrackingEvents.WHATSAPP_CLICKED, {}), { once: true });

    this.form.hidden = true;
    this.successPanel.hidden = false;
    this.successPanel.scrollIntoView({ behavior: 'smooth', block: 'center' });

    if (goesOn) this.#countdown(redirectUrl, 'Taking you to the next step');
    else if (/^https?:\/\//i.test(whatsappUrl || '')) this.#countdown(whatsappUrl, 'Redirecting you to the WhatsApp community');
  }

  /**
   * A big 3, 2, 1 under "Redirecting you to …", then leaves the page. "Stay on this page", or
   * clicking any button on the thank-you screen, stops it. The studio preview
   * (redirect = null) shows the countdown but never leaves.
   */
  #countdown(url, message) {
    const note = this.successPanel.querySelector('[data-redirect-note]');
    let left = this.redirectSeconds;
    let timer = null;
    const stay = () => {
      clearInterval(timer);
      if (note) note.hidden = true;
    };
    const show = () => {
      if (!note) return;
      const doc = note.ownerDocument;
      const count = doc.createElement('b');
      count.className = 'pk-count';
      count.textContent = String(left);
      const text = doc.createElement('span');
      text.textContent = `${message} in`;
      const button = doc.createElement('button');
      button.type = 'button';
      button.textContent = 'Stay on this page';
      button.addEventListener('click', stay);
      note.replaceChildren(text, count, button);
      note.hidden = false;
    };
    show();
    for (const link of this.successPanel.querySelectorAll('a')) link.addEventListener('click', stay, { once: true });
    timer = setInterval(() => {
      left -= 1;
      if (left > 0) return show();
      clearInterval(timer);
      if (note) note.textContent = `${message}…`;
      this.redirect?.(url);
    }, 1000);
  }
}
