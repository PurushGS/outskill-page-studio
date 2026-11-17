import { createApp } from '../../apps/worker/src/app.js';
import { FakeKv } from './FakeKv.js';

/**
 * Builds the real Worker app with in-memory KV. With `endpoint`, the
 * engineering hook is "connected" to a fake backend that records every
 * application it receives (and can be told to fail).
 */
export function createTestApp({ endpoint = 'https://backend.test/applications', backendStatus = 201 } = {}) {
  const env = {
    PAGES: new FakeKv(),
    ASSETS: { fetch: async () => new Response('<html>studio</html>') },
    STUDIO_TOKEN: 'test-token',
    ...(endpoint ? { APPLICATIONS_ENDPOINT: endpoint, APPLICATIONS_API_KEY: 'backend-key' } : {}),
  };
  const received = [];
  globalThis.fetch = async (url, init) => {
    received.push({ url, headers: init.headers, application: JSON.parse(init.body) });
    return new Response(null, { status: backendStatus });
  };

  const app = createApp(env);
  const request = (method, path, { body, rawBody, headers = {}, cf } = {}) => {
    const req = new Request(`https://pages.test${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', ...headers },
      body: rawBody ?? (body ? JSON.stringify(body) : undefined),
      redirect: 'manual',
    });
    // Cloudflare adds request.cf at the edge; simulate it for geo tests.
    if (cf) Object.defineProperty(req, 'cf', { value: cf });
    return app.handle(req);
  };
  return { env, request, received };
}

export const auth = { Authorization: 'Bearer test-token' };

export const validLead = {
  name: 'Priya Sharma',
  email: 'Priya@Example.com',
  country: 'IN',
  phone: '98765 43210',
  role: 'Student',
  whatsappOptIn: true,
};

export const IPHONE_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148';
