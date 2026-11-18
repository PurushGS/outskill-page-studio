import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createTestApp, validLead, auth, FORM_URL, QUESTION_FLOW } from './helpers/testApp.js';

const TEMPLATE = 'outskill-ai-resources';

/** A studio draft: the template with a new campaign. Its slug is ignored; the server makes it from the campaign name. */
async function draftFrom(request, { format, name, id = 'campaign', formUrl = FORM_URL }) {
  const page = await (await request('GET', `/api/templates/${TEMPLATE}`)).json();
  return { ...page, slug: 'ignored-by-server', campaign: { format, name, id, formUrl } };
}

async function createPage(request, opts) {
  const res = await request('POST', '/api/pages', { body: await draftFrom(request, opts), headers: auth });
  return { res, body: await res.json() };
}

function submission(page, extra = {}) {
  return {
    slug: page.slug,
    formUrl: page.campaign.formUrl,
    lead: validLead,
    visitorId: 'visitor-1',
    attribution: {
      params: { utm_source: 'instagram', utm_medium: 'story', utm_campaign: 'ai-jobs-ig-nov', utm_content: 'story-nov-20', fbclid: 'abc123' },
      referrer: 'https://l.instagram.com/',
      landingUrl: `https://pages.test/${page.slug}?utm_source=instagram`,
      firstTouch: { params: { utm_source: 'youtube', utm_content: 'jobs-video-1' }, referrer: 'https://www.youtube.com/', at: '2026-11-10T10:00:00.000Z' },
    },
    honeypot: '',
    ...extra,
  };
}

test('renders the screenshot template by slug with every block, 404 for unknown slugs', async () => {
  const { request } = createTestApp();
  const res = await request('GET', `/${TEMPLATE}`);
  assert.equal(res.status, 200);
  const html = await res.text();
  for (const type of ['guide-hero', 'checklist', 'tool-strip', 'guide-library', 'top-videos', 'shorts-row', 'lead-form']) {
    assert.match(html, new RegExp(`data-block-type="${type}"`), `${type} missing`);
  }
  assert.match(html, /i\.ytimg\.com\/vi\/v_XdN5-ya9A\/hqdefault\.jpg/, 'YouTube thumbnails come from the image CDN');
  assert.ok(html.includes('data-form-url="https://applications.growthschool.io/PROGRAM_ID/FORM_ID/CAMPAIGN_ID" data-form-id=""'), 'a template with no real form link has no form id');
  assert.equal((await request('GET', '/no-such-page')).status, 404);
});

test('the page link is made from the campaign name and can be claimed once', async () => {
  const { request } = createTestApp();
  const ig = await createPage(request, { format: 'instagram', name: 'AI Jobs · IG', formUrl: 'https://applications.growthschool.io/5122/1042/2001' });
  assert.equal(ig.res.status, 201);
  assert.equal(ig.body.page.slug, 'ai-jobs-ig');
  assert.equal(ig.body.page.campaign.formUrl, 'https://applications.growthschool.io/5122/1042/2001', 'the form URL is the one typed in the studio');
  assert.equal(ig.body.page.campaign.id, 'ai-jobs-ig', 'the campaign ID follows the page link');
  assert.equal((await request('GET', '/ai-jobs-ig')).status, 200);

  const sameForm = await createPage(request, { format: 'instagram', name: 'AI Jobs · IG Dec', formUrl: 'https://applications.growthschool.io/5122/1042/2001' });
  assert.equal(sameForm.res.status, 201, 'several pages may share a form URL');

  const again = await createPage(request, { format: 'x', name: 'AI jobs IG!' });
  assert.equal(again.res.status, 409, 'a campaign name that makes an existing link is refused');
  assert.match(again.body.error, /different campaign name/);
  assert.equal((await createPage(request, { format: 'youtube', name: 'Outskill AI resources' })).res.status, 409, 'bundled template links are taken too');

  const { pages } = await (await request('GET', '/api/pages?format=instagram')).json();
  assert.deepEqual(pages.map((p) => p.slug).sort(), ['ai-jobs-ig', 'ai-jobs-ig-dec', 'ai-shorts-hindi']);
  assert.equal(pages.find((p) => p.slug === 'ai-jobs-ig').campaignName, 'AI Jobs · IG');
});

test('campaign names that would take the site\'s own paths are refused', async () => {
  const { request } = createTestApp();
  for (const name of ['Studio', 'API', 'Apps!']) {
    const { res, body } = await createPage(request, { format: 'youtube', name });
    assert.equal(res.status, 409, name);
    assert.match(body.error, /more specific campaign name/);
  }
  assert.equal((await createPage(request, { format: 'youtube', name: 'Studio tips Dec' })).res.status, 201, 'names that only start with a reserved word are fine');
});

test('the studio learns the public address for links: PUBLIC_BASE_URL, else its own', async () => {
  assert.deepEqual(await (await createTestApp().request('GET', '/api/config')).json(), { publicBaseUrl: 'https://pages.test' });
  const { request } = createTestApp({ env: { PUBLIC_BASE_URL: 'https://outskill.com/resources/' } });
  assert.deepEqual(await (await request('GET', '/api/config')).json(), { publicBaseUrl: 'https://outskill.com/resources' });
});

test('under outskill.com/resources/: pages, their files, questions and applications work with or without the path', async () => {
  const { request, env, received } = createTestApp({ env: { PUBLIC_BASE_URL: 'https://outskill.com/resources' } });
  const assetPaths = [];
  env.ASSETS.fetch = async (url) => { assetPaths.push(new URL(url).pathname); return new Response('/* css */'); };
  const { body } = await createPage(request, { format: 'youtube', name: 'Resources test' });
  const page = body.page;

  for (const path of ['/resources/resources-test', '/resources-test']) {
    const res = await request('GET', path);
    assert.equal(res.status, 200, path);
    const html = await res.text();
    assert.match(html, /href="\/resources\/packages\/page-kit\/styles\/page-kit\.css"/, 'CSS is loaded under the path');
    assert.match(html, /"apiBase":"\/resources"/, 'the form calls the Worker under the path');
  }
  assert.equal((await request('GET', '/resources/packages/page-kit/styles/page-kit.css')).status, 200);
  assert.deepEqual(assetPaths, ['/packages/page-kit/styles/page-kit.css'], 'the path is removed before reading the file');
  assert.equal((await request('GET', '/resources/api/forms/24542/questionflow')).status, 200);
  assert.equal((await request('POST', '/resources/api/leads', { body: submission(page) })).status, 201);
  assert.ok(received.some((call) => call.path === '/leads'), 'the lead reached the forms backend');
  assert.equal((await request('GET', '/resourcesX')).status, 404, 'only the exact path prefix is removed');
});

test('creating needs the studio token, a campaign name and a form URL', async () => {
  const { request } = createTestApp();
  const draft = await draftFrom(request, { format: 'linkedin', name: '', formUrl: '' });
  assert.equal((await request('POST', '/api/pages', { body: draft })).status, 401);
  const res = await request('POST', '/api/pages', { body: draft, headers: auth });
  assert.equal(res.status, 422);
  const { details } = await res.json();
  assert.ok(details.some((d) => d.includes('Campaign name')));
  assert.ok(details.some((d) => d.includes('Form URL is required')));

  const hindiOnly = await createPage(request, { format: 'youtube', name: 'नमस्ते' });
  assert.equal(hindiOnly.res.status, 422, 'a name with no latin letters cannot make a link');
  const spaced = await createPage(request, { format: 'youtube', name: 'Short form link', formUrl: 'https://applications.growthschool.io/5122' });
  assert.ok(spaced.body.details.some((d) => d.includes('Form URL must look like')));
});

test('every page must keep its application form', async () => {
  const { request } = createTestApp();
  const draft = await draftFrom(request, { format: 'youtube', name: 'No form' });
  draft.blocks = draft.blocks.filter((b) => b.type !== 'lead-form');
  const res = await request('POST', '/api/pages', { body: draft, headers: auth });
  assert.equal(res.status, 422);
  assert.ok((await res.json()).details.includes('Every page needs the application form'));
});

test('saving keeps the format and link fixed, while the campaign name and form URL can be edited', async () => {
  const { request } = createTestApp();
  const { body } = await createPage(request, { format: 'facebook', name: 'FB page', formUrl: 'https://applications.growthschool.io/5122/301/2002' });
  const page = body.page;
  const edited = { ...page, campaign: { ...page.campaign, name: 'FB renamed', format: 'youtube', formUrl: 'https://applications.growthschool.io/5122/302/2002' } };
  const saved = await (await request('PUT', '/api/pages/fb-page', { body: edited, headers: auth })).json();
  assert.equal(saved.page.slug, 'fb-page');
  assert.equal(saved.page.campaign.name, 'FB renamed');
  assert.equal(saved.page.campaign.format, 'facebook');
  assert.equal(saved.page.campaign.formUrl, 'https://applications.growthschool.io/5122/302/2002');
});

test('unpublish takes a page and its form offline; Publish brings it back unchanged at the same link', async () => {
  const { request, received } = createTestApp();
  const { body } = await createPage(request, { format: 'x', name: 'X thread Dec', formUrl: 'https://applications.growthschool.io/5122/77/2003' });
  const page = body.page;

  assert.equal((await request('POST', `/api/pages/${page.slug}/unpublish`)).status, 401, 'needs the studio token');
  const res = await request('POST', `/api/pages/${page.slug}/unpublish`, { headers: auth });
  assert.equal(res.status, 200);
  assert.equal((await request('POST', '/api/pages/no-such-page/unpublish', { headers: auth })).status, 404);

  const offline = await request('GET', `/${page.slug}`);
  assert.equal(offline.status, 404);
  assert.match(await offline.text(), /no longer available/);
  assert.equal(offline.headers.get('Cache-Control'), 'no-store');
  assert.equal((await request('POST', '/api/leads', { body: submission(page) })).status, 410, 'no applications while unpublished');
  assert.equal(received.length, 0);

  const { pages } = await (await request('GET', '/api/pages?format=x')).json();
  assert.equal(pages.find((p) => p.slug === page.slug).unpublished, true, 'the studio list shows it as unpublished');
  const kept = await (await request('GET', `/api/pages/${page.slug}`)).json();
  assert.equal(kept.campaign.formUrl, 'https://applications.growthschool.io/5122/77/2003', 'the page itself is kept');

  // Publish again sends the page as the studio holds it, flag included; the server puts it back live.
  const republished = await request('PUT', `/api/pages/${page.slug}`, { body: kept, headers: auth });
  assert.equal((await republished.json()).page.unpublished, undefined);
  assert.equal((await request('GET', `/${page.slug}`)).status, 200);
  assert.equal((await request('POST', '/api/leads', { body: submission(page) })).status, 201);
});

/** A published page whose Form URL points at program 5122, form 24542, campaign 19240. */
async function publishedPage(request, redirectUrl) {
  const { body } = await createPage(request, { format: 'instagram', name: 'AI Jobs · IG Nov' });
  const page = body.page;
  if (redirectUrl) page.campaign.redirectUrl = redirectUrl;
  page.integrations.resources = [{ label: 'Open the guide', url: 'https://example.com/guide' }];
  await request('PUT', `/api/pages/${page.slug}`, { body: page, headers: auth });
  return page;
}

const answer101 = { questionId: 101, responses: ['Professional'], optionIds: [1], formsQuestionIdentityId: 1, questionType: 'DEFAULT_STANDARD_QUESTION', questionCategory: 'ONE_OF_MANY' };

test('end to end: create page → questions → lead → answers → complete, all against the right form and campaign', async () => {
  const { request, received } = createTestApp();
  const page = await publishedPage(request, 'https://next.example.com/thanks');
  assert.equal(page.campaign.formUrl, FORM_URL);

  // The live page knows its form id so the browser can fetch the questions
  const html = await (await request('GET', `/${page.slug}`)).text();
  assert.ok(html.includes('data-form-id="24542"'));
  assert.ok(html.includes('data-questions'));

  // 1. questions come from the backend's form 24542 (no token needed to read them)
  const flow = await (await request('GET', '/api/forms/24542/questionflow')).json();
  assert.equal(flow.defaultStandardQuestion.id, 101);
  assert.equal(received.at(-1).path, '/forms/24542/questionflow');
  assert.equal(received.at(-1).headers.Authorization, undefined);

  // 2. the lead is created under form 24542 and campaign 19240, with the visit's UTMs
  const created = await request('POST', '/api/leads', { body: submission(page) });
  assert.equal(created.status, 201);
  const lead = await created.json();
  assert.equal(lead.token, 'lead-jwt');
  assert.match(lead.leadUUID, /^[0-9a-f-]{36}$/);
  const createCall = received.at(-1);
  assert.equal(createCall.path, '/leads');
  assert.equal(createCall.query.formId, '24542');
  assert.equal(createCall.headers.Authorization, 'bearer backend-token');
  assert.deepEqual(createCall.body, {
    name: 'Priya Sharma', email: 'priya@example.com', phone: '+919876543210', leadUUID: lead.leadUUID, campaign_id: 19240,
    utm_source: 'instagram', utm_medium: 'story', utm_campaign: 'ai-jobs-ig-nov', utm_content: 'story-nov-20',
  });

  // 3. an answer goes to the form's responses, carrying the lead's own token
  const saved = await request('POST', '/api/leads/response', { body: { slug: page.slug, leadUUID: lead.leadUUID, userJwt: lead.token, IsFullySubmitted: false, ...answer101, evil: 'dropped' } });
  assert.deepEqual(await saved.json(), { formsApplicationId: 11, formsApplicationMetadataId: 22 });
  const responseCall = received.at(-1);
  assert.equal(responseCall.path, '/leads/form/responses');
  assert.deepEqual(responseCall.query, { formId: '24542', leadUUID: lead.leadUUID });
  assert.equal(responseCall.headers['gs-forms-user-auth-token'], 'lead-jwt');
  assert.equal(responseCall.body.evil, undefined, 'only known answer fields are forwarded');
  assert.equal(responseCall.body.IsFullySubmitted, false);

  // 4. completing marks it done and returns the success screen content
  const done = await (await request('POST', '/api/leads/complete', { body: { slug: page.slug, leadUUID: lead.leadUUID, userJwt: lead.token } })).json();
  assert.equal(received.at(-1).path, '/leads/application/completed');
  assert.equal(received.at(-1).method, 'PATCH');
  assert.deepEqual(done.resources, [{ label: 'Open the guide', url: 'https://example.com/guide' }]);
  assert.match(done.whatsappUrl, /chat\.whatsapp\.com/);
  assert.equal(done.redirectUrl, 'https://next.example.com/thanks', 'the redirect is the one set on the Campaign tab, not the backend\'s');
});

test('a form URL without a campaign ID creates the lead without campaign_id', async () => {
  const { request, received } = createTestApp();
  const { body } = await createPage(request, { format: 'youtube', name: 'No campaign id', formUrl: 'https://applications.outskill.com/1426/17216' });
  const lead = await request('POST', '/api/leads', { body: submission(body.page) });
  assert.equal(lead.status, 201);
  const call = received.at(-1);
  assert.equal(call.query.formId, '17216');
  assert.equal('campaign_id' in call.body, false);
});

test('utm_campaign is the page slug, followed by the link\'s own utm_campaign if it has one', async () => {
  const { request, received } = createTestApp();
  const page = await publishedPage(request);
  const withParams = (params) => submission(page, { attribution: { params, referrer: '', landingUrl: '' } });
  const sentCampaign = async (params) => {
    await request('POST', '/api/leads', { body: withParams(params) });
    return received.at(-1).body;
  };

  assert.equal((await sentCampaign({ utm_campaign: 'diwali-ads' })).utm_campaign, `${page.slug}/diwali-ads`, 'both: slug / the link\'s campaign');
  assert.equal((await sentCampaign({})).utm_campaign, page.slug, 'no utm_campaign in the link: just the slug');
  assert.equal((await sentCampaign({ utm_campaign: page.slug })).utm_campaign, page.slug, 'a tracked link carries the slug itself: sent once');
  assert.equal((await sentCampaign({ utm_campaign: page.slug.toUpperCase() })).utm_campaign, page.slug, 'compared ignoring case');
  const body = await sentCampaign({ utm_campaign: 'diwali-ads', utm_source: 'x' });
  assert.equal(body.utm_source, 'x', 'the other UTMs still come from the link');
  assert.equal('utm_source' in (await sentCampaign({})), false);
});

test('the browser cannot pick the form: it is always read from the saved page', async () => {
  const { request, received } = createTestApp();
  const page = await publishedPage(request);
  const lead = await (await request('POST', '/api/leads', { body: submission(page) })).json();
  await request('POST', '/api/leads/response', { body: { slug: page.slug, leadUUID: lead.leadUUID, userJwt: lead.token, formId: 999, ...answer101 } });
  assert.equal(received.at(-1).query.formId, '24542');
  assert.equal((await request('GET', '/api/forms/abc/questionflow')).status, 400);
});

test('if the forms backend fails, the visitor is asked to retry (nothing is lost silently)', async () => {
  const { request } = createTestApp();
  const page = await publishedPage(request);
  const failing = createTestApp({ backendStatus: 500 });
  // same page data, new app instance with a failing backend
  const draft = await draftFrom(failing.request, { format: 'youtube', name: 'Retry page' });
  const created = await (await failing.request('POST', '/api/pages', { body: draft, headers: auth })).json();
  const res = await failing.request('POST', '/api/leads', { body: submission(created.page) });
  assert.equal(res.status, 503);
  assert.match((await res.json()).error, /try again/);
  assert.equal((await failing.request('GET', '/api/forms/24542/questionflow')).status, 503);
  assert.ok(page);
});

test('without FORMS_API_TOKEN, nothing is sent and the visitor is told applications are not connected', async () => {
  const { request, received } = createTestApp({ token: null });
  const page = await publishedPage(request);
  const res = await request('POST', '/api/leads', { body: submission(page) });
  assert.equal(res.status, 503);
  assert.match((await res.json()).error, /not connected/);
  assert.equal(received.length, 0);
});

test('without FORM_API_URL there is no default address: questions and applications are refused', async () => {
  const { request, received } = createTestApp({ url: null });
  const page = await publishedPage(request);
  const flow = await request('GET', '/api/forms/24542/questionflow');
  assert.equal(flow.status, 503);
  assert.match((await flow.json()).error, /FORM_API_URL/);
  assert.equal((await request('POST', '/api/leads', { body: submission(page) })).status, 503);
  assert.equal(received.length, 0, 'nothing is sent anywhere');
});

test('a page whose Form URL is not a real form link takes no applications', async () => {
  const { request, received } = createTestApp();
  const page = await (await request('GET', `/api/pages/${TEMPLATE}`)).json();
  assert.equal((await request('POST', '/api/leads', { body: submission(page) })).status, 409);
  assert.equal(received.length, 0);
});

test('bots filling the hidden field get a normal-looking answer but nothing is sent', async () => {
  const { request, received } = createTestApp();
  const page = await publishedPage(request);
  const res = await request('POST', '/api/leads', { body: submission(page, { honeypot: 'http://spam.example' }) });
  assert.equal(res.status, 201);
  const lead = await res.json();
  assert.equal(lead.token, '');
  await request('POST', '/api/leads/response', { body: { slug: page.slug, leadUUID: lead.leadUUID, userJwt: lead.token, ...answer101 } });
  const done = await request('POST', '/api/leads/complete', { body: { slug: page.slug, leadUUID: lead.leadUUID, userJwt: lead.token } });
  assert.equal(done.status, 200);
  assert.equal(received.length, 0);
});

test('a submission with a stale form URL asks the visitor to refresh', async () => {
  const { request } = createTestApp();
  const page = await publishedPage(request);
  assert.equal((await request('POST', '/api/leads', { body: submission(page, { formUrl: 'https://applications.growthschool.io/5122/99999/19240' }) })).status, 409);
});

test('invalid applications get per-field errors and are not sent', async () => {
  const { request, received } = createTestApp();
  const page = await publishedPage(request);
  const res = await request('POST', '/api/leads', { body: submission(page, { lead: { ...validLead, email: 'x' } }) });
  assert.equal(res.status, 422);
  assert.ok((await res.json()).details.email);
  assert.equal(received.length, 0);
});

test('no redirect unless the editor set one, and it must be a web link', async () => {
  const { request } = createTestApp();
  const page = await publishedPage(request);
  const lead = await (await request('POST', '/api/leads', { body: submission(page) })).json();
  const done = await (await request('POST', '/api/leads/complete', { body: { slug: page.slug, leadUUID: lead.leadUUID, userJwt: lead.token } })).json();
  assert.equal(done.redirectUrl, '');

  page.campaign.redirectUrl = 'javascript:alert(1)';
  const res = await request('PUT', `/api/pages/${page.slug}`, { body: page, headers: auth });
  assert.equal(res.status, 422);
  assert.ok((await res.json()).details.some((d) => d.includes('Redirect URL')));
});

test('unknown routes and bad JSON get clean errors', async () => {
  const { request } = createTestApp();
  assert.equal((await request('DELETE', '/api/pages/x')).status, 404);
  assert.equal((await request('POST', '/api/leads', { rawBody: '{not json' })).status, 400);
});
