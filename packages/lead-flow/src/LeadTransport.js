/**
 * Sends a submission { formId, lead, attribution, visitorId, honeypot } and
 * returns what the success panel needs: { leadId, resources, whatsappUrl }.
 */
export class LeadTransport {
  async send(submission) {} // eslint-disable-line no-unused-vars
}

/** Real transport: POSTs to the Worker. */
export class HttpLeadTransport extends LeadTransport {
  constructor({ endpoint, slug, fetchImpl = (...args) => fetch(...args) }) {
    super();
    this.endpoint = endpoint;
    this.slug = slug;
    this.fetch = fetchImpl;
  }

  async send(submission) {
    const response = await this.fetch(this.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug: this.slug, ...submission }),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(body.error || 'Could not submit the form. Please try again.');
      error.fieldErrors = body.details;
      throw error;
    }
    return body;
  }
}

/** Studio preview: never touches the network, so editors can test the success state safely. */
export class PreviewLeadTransport extends LeadTransport {
  async send() {
    return { leadId: 'preview', resources: [{ label: 'Resource links appear here', url: '#' }], whatsappUrl: '#' };
  }
}
