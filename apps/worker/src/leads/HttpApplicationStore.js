import { ApplicationStore } from './ApplicationStore.js';

/**
 * Option A from ApplicationStore.js: POST each Application as JSON to an
 * endpoint owned by our backend, which writes it to the application-form table.
 *
 *   POST {APPLICATIONS_ENDPOINT}
 *   Authorization: Bearer {APPLICATIONS_API_KEY}
 *   Idempotency-Key: {applicationId}
 *   Content-Type: application/json
 *   <Application>
 *
 * Any 2xx counts as saved; anything else (or no answer within the timeout)
 * makes the visitor see "please try again".
 */
export class HttpApplicationStore extends ApplicationStore {
  constructor({ endpoint, apiKey = '', timeoutMs = 8000, fetchImpl = (...args) => fetch(...args) }) {
    super();
    this.endpoint = endpoint;
    this.apiKey = apiKey;
    this.timeoutMs = timeoutMs;
    this.fetch = fetchImpl;
  }

  async save(application) {
    const response = await this.fetch(this.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': application.applicationId,
        ...(this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {}),
      },
      body: JSON.stringify(application),
      signal: AbortSignal.timeout(this.timeoutMs),
    });
    if (!response.ok) throw new Error(`Applications endpoint answered ${response.status}`);
  }
}
