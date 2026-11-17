import { LeadValidator } from './LeadValidator.js';
import { TrackingEvents } from './tracking/TrackingEvents.js';

/**
 * Brings a page-kit application form to life:
 *   validate → POST /api/leads (with form ID + attribution) → success panel
 *   with the page's resource links and WhatsApp community button.
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
   */
  constructor({ form, successPanel, transport, tracker, attribution, validator = new LeadValidator() }) {
    this.form = form;
    this.successPanel = successPanel;
    this.transport = transport;
    this.tracker = tracker;
    this.attribution = attribution;
    this.validator = validator;
    this.submitButton = form.querySelector('[type="submit"]');
    this.status = form.querySelector('.pk-form__status');
  }

  start() {
    this.form.addEventListener('submit', (event) => {
      event.preventDefault();
      this.submit();
    });
    // Clear a field's error as soon as the user starts fixing it.
    this.form.addEventListener('input', (event) => this.#showError(event.target.name, ''));
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
      const result = await this.transport.send({
        formId: this.form.dataset.formId,
        lead: input,
        attribution: this.attribution.collect(),
        visitorId: this.attribution.visitorId(),
        honeypot: new FormData(this.form).get('company_website') || '',
      });
      this.tracker.identify(lead.email, { email: lead.email, name: lead.name, phone: lead.phone });
      this.tracker.track(TrackingEvents.LEAD_SUBMITTED, { leadId: result.leadId, formId: this.form.dataset.formId });
      this.#showSuccess(result);
    } catch (err) {
      if (err.fieldErrors) this.#showErrors(err.fieldErrors);
      this.status.textContent = err.message || 'Something went wrong. Please try again.';
    } finally {
      this.#setBusy(false);
    }
  }

  #readForm() {
    const data = new FormData(this.form);
    return {
      name: data.get('name'),
      email: data.get('email'),
      country: data.get('country'),
      phone: data.get('phone'),
      role: data.get('role'),
      requireRole: Boolean(this.form.elements.role),
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

  /** @param {{ resources: Array<{label: string, url: string}>, whatsappUrl: string }} result */
  #showSuccess({ resources = [], whatsappUrl }) {
    const doc = this.form.ownerDocument;
    const links = this.successPanel.querySelector('[data-resource-links]');
    links.replaceChildren(...resources.map(({ label, url }, i) => {
      const a = doc.createElement('a');
      // The first resource is the main action; any others are quieter.
      a.className = `pk-btn pk-btn--${i === 0 ? 'primary' : 'outline'} pk-btn--block`;
      a.href = url;
      a.target = '_blank';
      a.rel = 'noopener';
      a.textContent = label || 'Open resource';
      a.addEventListener('click', () => this.tracker.track(TrackingEvents.MATERIAL_OPENED, { label }), { once: true });
      return a;
    }));

    const whatsapp = this.successPanel.querySelector('[data-whatsapp-link]');
    whatsapp.hidden = !whatsappUrl;
    whatsapp.href = whatsappUrl || '#';
    whatsapp.addEventListener('click', () => this.tracker.track(TrackingEvents.WHATSAPP_CLICKED, {}), { once: true });

    this.form.hidden = true;
    this.successPanel.hidden = false;
    this.successPanel.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}
