import { json, readJson, HttpError } from '../http/responses.js';

/** HTTP edge of LeadService: parses the request, never contains business rules. */
export class LeadController {
  constructor({ leadService }) {
    this.leadService = leadService;
  }

  questionFlow = async (_request, { formId }) => {
    const flow = await this.leadService.questionFlow(formId);
    return json(flow, 200, { 'Cache-Control': 'public, max-age=60' });
  };

  create = async (request) => {
    const body = await this.#body(request);
    if (!body.lead) throw new HttpError(400, 'Body must include slug and lead');
    return json(await this.leadService.createLead(body.slug, body), 201);
  };

  saveResponse = async (request) => json(await this.leadService.saveResponse(...await this.#slugAnd(request)));

  // The request's own address is the fallback for links sent to WebEngage when PUBLIC_BASE_URL is not set.
  complete = async (request) => json(await this.leadService.complete(...await this.#slugAnd(request), new URL(request.url).origin));

  async #slugAnd(request) {
    const body = await this.#body(request);
    return [body.slug, body];
  }

  async #body(request) {
    const body = await readJson(request);
    if (!body || typeof body !== 'object' || !body.slug) throw new HttpError(400, 'Body must include slug');
    return body;
  }
}
