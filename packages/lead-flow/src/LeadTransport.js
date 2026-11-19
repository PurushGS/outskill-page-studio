/**
 * The browser's line to the Worker. Every call carries the page slug; the
 * Worker decides which form and campaign it belongs to.
 *
 *   questionFlow(formId)   → the form's questions
 *   createLead(...)        → { leadUUID, token }
 *   saveResponse(...)      → { formsApplicationId, formsApplicationMetadataId }
 *   complete(...)          → { resources, whatsappUrl, redirectUrl, webengage? }
 *   webengageEvent(url, e) → sends the WebEngage event straight to the backend (never throws)
 */
export class LeadTransport {
  async questionFlow(formId) {} // eslint-disable-line no-unused-vars
  async createLead(submission) {} // eslint-disable-line no-unused-vars
  async saveResponse(answer) {} // eslint-disable-line no-unused-vars
  async complete(lead) {} // eslint-disable-line no-unused-vars
  async webengageEvent(url, event) {} // eslint-disable-line no-unused-vars
}

/** Real transport: talks to the Worker. */
export class HttpLeadTransport extends LeadTransport {
  constructor({ apiBase = '', slug, fetchImpl = (...args) => fetch(...args) }) {
    super();
    this.apiBase = apiBase;
    this.slug = slug;
    this.fetch = fetchImpl;
  }

  questionFlow(formId) {
    return this.#request('GET', `/api/forms/${encodeURIComponent(formId)}/questionflow`);
  }

  createLead(submission) {
    return this.#request('POST', '/api/leads', submission);
  }

  saveResponse(answer) {
    return this.#request('POST', '/api/leads/response', answer);
  }

  complete(lead) {
    return this.#request('POST', '/api/leads/complete', lead);
  }

  /**
   * POST {backend}/leads/webengage/external, as the backend's guide describes
   * (so it shows in the browser's Network tab). If that fails or is blocked,
   * the same event goes to our Worker (/api/leads/notify), which forwards it
   * and retries. keepalive lets both finish even if the thank-you countdown
   * leaves the page. The application is already complete, so nothing here
   * ever throws. Resolves to how it was sent: 'direct', 'relay' or 'failed'.
   */
  async webengageEvent(url, event) {
    const send = async (to, body) => {
      try {
        const response = await this.fetch(to, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), keepalive: true });
        return response.ok;
      } catch {
        return false;
      }
    };
    if (await send(url, event)) return 'direct';
    if (await send(`${this.apiBase}/api/leads/notify`, { slug: this.slug, ...event })) return 'relay';
    console.warn('WebEngage event could not be sent');
    return 'failed';
  }

  async #request(method, path, body) {
    const response = await this.fetch(`${this.apiBase}${path}`, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify({ slug: this.slug, ...body }) : undefined,
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(data.error || 'Could not submit the form. Please try again.');
      error.fieldErrors = data.details;
      throw error;
    }
    return data;
  }
}

/** Studio preview: shows the real questions but never creates a lead, so editors can try the whole form safely. */
export class PreviewLeadTransport extends HttpLeadTransport {
  async createLead() {
    return { leadUUID: 'preview', token: 'preview' };
  }

  async saveResponse() {
    return {};
  }

  async complete() {
    return { resources: [{ label: 'Resource links appear here', url: '#' }], whatsappUrl: '#', redirectUrl: '' };
  }

  /** The preview never sends anything to WebEngage. */
  async webengageEvent() {}
}
