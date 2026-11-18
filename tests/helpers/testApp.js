import { createApp } from '../../apps/worker/src/app.js';
import { FakeKv } from './FakeKv.js';
import { FakeR2 } from './FakeR2.js';

export const FORM_URL = 'https://applications.growthschool.io/5122/24542/19240';

/** A question flow shaped like the backend's: one standard question with follow-ups, plus an always-shown text question. */
export const QUESTION_FLOW = {
  defaultStandardQuestion: {
    id: 101, title: 'What describes you best?', formsQuestionIdentityId: 1, questionType: 'DEFAULT_STANDARD_QUESTION', questionCategory: 'ONE_OF_MANY',
    options: [{ optionId: 1, title: 'Professional' }, { optionId: 2, title: 'Student' }],
  },
  standardQuestionsFlow: [
    { optionId: 1, followUpQuestions: [{ id: 102, title: 'Years of experience', formsQuestionIdentityId: 2, questionType: 'CUSTOM_CONDITIONAL', questionCategory: 'DROPDOWN', options: [{ optionId: 11, title: '0-2' }, { optionId: 12, title: '3-5' }] }] },
    { optionId: 2, followUpQuestions: [{ id: 103, title: 'Your college', formsQuestionIdentityId: 3, questionType: 'CUSTOM_CONDITIONAL', questionCategory: 'TEXT' }] },
  ],
  unconditionalQuestions: [{ id: 104, title: 'Why do you want to join?', placeholderText: 'Tell us', formsQuestionIdentityId: 4, questionType: 'CUSTOM_UNCONDITIONAL', questionCategory: 'TEXT_AREA' }],
  scholarshipQuestions: [],
};

/**
 * Builds the real Worker app with in-memory KV and a fake forms backend that
 * records every call it receives (and can be told to fail). With `token: null`
 * the Worker has no FORMS_API_TOKEN, i.e. applications are not connected.
 * `env` adds or overrides Worker settings.
 */
export function createTestApp({ url = 'https://backend.test', token = 'backend-token', backendStatus = 200, completeBody = { leadUUID: 'x', easyInsights: {} }, webengageStatus = 200, env: extraEnv = {} } = {}) {
  const env = {
    PAGES: new FakeKv(),
    FILES: new FakeR2(),
    ASSETS: { fetch: async () => new Response('<html>studio</html>') },
    STUDIO_TOKEN: 'test-token',
    ...(url ? { FORM_API_URL: url } : {}),
    ...(token ? { FORMS_API_TOKEN: token } : {}),
    ...extraEnv,
  };
  const received = [];
  globalThis.fetch = async (url, init = {}) => {
    const { pathname, searchParams } = new URL(url);
    const call = { method: init.method, path: pathname, query: Object.fromEntries(searchParams), headers: init.headers, body: init.body ? JSON.parse(init.body) : undefined };
    received.push(call);
    if (pathname === '/leads/webengage/external') return new Response(JSON.stringify(webengageStatus === 200 ? { message: 'Event fired' } : { message: 'eventTime is missing' }), { status: webengageStatus });
    if (backendStatus !== 200) return new Response(JSON.stringify({ message: 'backend says no' }), { status: backendStatus });
    const reply = (data) => new Response(JSON.stringify(data), { status: 200 });
    if (pathname.endsWith('/questionflow')) return reply(QUESTION_FLOW);
    if (pathname === '/leads') return reply({ token: 'lead-jwt' });
    if (pathname === '/leads/form/responses') return reply({ formsApplicationId: 11, formsApplicationMetadataId: 22 });
    if (pathname === '/leads/application/completed') return reply(completeBody);
    return new Response('{}', { status: 404 });
  };

  const app = createApp(env);
  const request = (method, path, { body, rawBody, headers = {} } = {}) => app.handle(new Request(`https://pages.test${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...headers },
    body: rawBody ?? (body ? JSON.stringify(body) : undefined),
    redirect: 'manual',
  }));
  return { env, request, received };
}

export const auth = { Authorization: 'Bearer test-token' };

export const validLead = {
  name: 'Priya Sharma',
  email: 'Priya@Example.com',
  country: 'IN',
  phone: '98765 43210',
  whatsappOptIn: true,
};
