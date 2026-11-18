/**
 * Talks to the application-form backend (GrowthSchool "api-forms"). This is
 * the same backend the LP Management System uses, with the same calls:
 *
 *   GET   /forms/:formId/questionflow                      the form's questions
 *   POST  /leads?formId=                                   create the lead → { token }
 *   POST  /leads/form/responses?formId=&leadUUID=          one answer (last one: IsFullySubmitted: true)
 *   PATCH /leads/application/completed?leadUUID=           mark the application complete (returns no redirect URL)
 *
 * The address (FORM_API_URL) and the bearer token (FORMS_API_TOKEN) come from the
 * Worker's environment only; nothing is hardcoded or defaulted. They live only here, on the server.
 */
/** An answer from the backend that was not a success (or no answer at all). */
export class FormsApiError extends Error {
  constructor(message, status = 0) {
    super(message);
    this.status = status;
  }
}

export class FormsApiClient {
  constructor({ baseUrl = '', token = '', timeoutMs = 10000, fetchImpl = (...args) => fetch(...args) }) {
    this.baseUrl = String(baseUrl || '').trim().replace(/\/$/, '');
    this.token = token;
    this.timeoutMs = timeoutMs;
    this.fetch = fetchImpl;
  }

  /** Reading questions needs the address. */
  get canRead() {
    return Boolean(this.baseUrl);
  }

  /** Writing leads needs the address and the token. */
  get canWrite() {
    return Boolean(this.baseUrl && this.token);
  }

  questionFlow(formId) {
    return this.#call('GET', `/forms/${formId}/questionflow`);
  }

  /** @returns {Promise<{ token: string }>} the lead's own token, sent back with its answers */
  createLead(formId, lead) {
    return this.#call('POST', `/leads?formId=${formId}`, { body: lead, auth: true });
  }

  saveResponse(formId, leadUUID, userToken, answer) {
    return this.#call('POST', `/leads/form/responses?formId=${formId}&leadUUID=${encodeURIComponent(leadUUID)}`, { body: answer, auth: true, userToken });
  }

  completeApplication(leadUUID, userToken) {
    return this.#call('PATCH', `/leads/application/completed?leadUUID=${encodeURIComponent(leadUUID)}`, { auth: true, userToken });
  }

  async #call(method, path, { body, auth = false, userToken = '' } = {}) {
    let response;
    try {
      response = await this.fetch(`${this.baseUrl}${path}`, {
        method,
        headers: {
          // The backend sits behind Cloudflare, which answers 403 to requests with no User-Agent (Workers send none).
          'User-Agent': 'page-studio-worker',
          Accept: 'application/json',
          ...(body ? { 'Content-Type': 'application/json' } : {}),
          ...(auth ? { Authorization: `bearer ${this.token}` } : {}),
          ...(userToken ? { 'gs-forms-user-auth-token': userToken } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (err) {
      throw new FormsApiError(err.message || 'No answer from the forms backend');
    }
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new FormsApiError(data?.message || `Forms backend answered ${response.status}`, response.status);
    return data;
  }
}
