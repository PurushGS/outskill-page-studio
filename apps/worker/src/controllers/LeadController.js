import { json, readJson, HttpError } from '../http/responses.js';
import { describeRequest } from '../http/requestContext.js';

/** HTTP edge of LeadService: parses the request, never contains business rules. */
export class LeadController {
  constructor({ leadService }) {
    this.leadService = leadService;
  }

  submit = async (request) => {
    const body = await readJson(request);
    if (!body.slug || !body.lead) throw new HttpError(400, 'Body must include slug and lead');
    return json(await this.leadService.submit(body.slug, body, describeRequest(request)), 201);
  };
}
