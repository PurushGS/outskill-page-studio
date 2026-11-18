/**
 * The browser's line to the Worker. Every call carries the page slug; the
 * Worker decides which form and campaign it belongs to.
 *
 *   questionFlow(formId)   → the form's questions
 *   createLead(...)        → { leadUUID, token }
 *   saveResponse(...)      → { formsApplicationId, formsApplicationMetadataId }
 *   complete(...)          → { resources, whatsappUrl, redirectUrl }
 */
export class LeadTransport {
  async questionFlow(formId) {} // eslint-disable-line no-unused-vars
  async createLead(submission) {} // eslint-disable-line no-unused-vars
  async saveResponse(answer) {} // eslint-disable-line no-unused-vars
  async complete(lead) {} // eslint-disable-line no-unused-vars
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
}
