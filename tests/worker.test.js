import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createTestApp, validLead, auth, IPHONE_UA } from './helpers/testApp.js';

const TEMPLATE = 'outskill-ai-resources';

/** A studio draft: the template with a new slug and campaign, no form ID yet. */
async function draftFrom(request, { slug, format, name, id }) {
  const page = await (await request('GET', `/api/templates/${TEMPLATE}`)).json();
  return { ...page, slug, campaign: { format, name, id, formId: '' } };
}

async function createPage(request, opts) {
  const res = await request('POST', '/api/pages', { body: await draftFrom(request, opts), headers: auth });
  return { res, body: await res.json() };
}

function submission(page, extra = {}) {
  return {
    slug: page.slug,
    formId: page.campaign.formId,
    lead: validLead,
    visitorId: 'visitor-1',
    attribution: {
      params: { utm_source: 'instagram', utm_medium: 'story', utm_campaign: page.campaign.id, utm_content: 'story-nov-20', fbclid: 'abc123' },
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
  assert.match(html, /data-form-id="YT-7KQ2MD"/);
  assert.equal((await request('GET', '/no-such-page')).status, 404);
});

test('creating a page assigns a unique, format-prefixed form ID and claims the slug once', async () => {
  const { request } = createTestApp();
  const ig = await createPage(request, { slug: 'ai-jobs-ig', format: 'instagram', name: 'AI Jobs · IG', id: 'ai-jobs-ig' });
  assert.equal(ig.res.status, 201);
  assert.match(ig.body.page.campaign.formId, /^IG-[A-HJ-NP-Z2-9]{6}$/);

  const x = await createPage(request, { slug: 'ai-jobs-x', format: 'x', name: 'AI Jobs · X', id: 'ai-jobs-x' });
  assert.match(x.body.page.campaign.formId, /^X-/);
  assert.notEqual(x.body.page.campaign.formId, ig.body.page.campaign.formId);

  const again = await createPage(request, { slug: 'ai-jobs-ig', format: 'instagram', name: 'Other', id: 'other' });
  assert.equal(again.res.status, 409, 'slug can only be taken once');
  assert.equal((await createPage(request, { slug: TEMPLATE, format: 'youtube', name: 'x', id: 'x' })).res.status, 409, 'bundled template slugs are taken too');

  const { pages } = await (await request('GET', '/api/pages?format=instagram')).json();
  assert.deepEqual(pages.map((p) => p.slug).sort(), ['ai-jobs-ig', 'ai-shorts-hindi']);
  assert.equal(pages.find((p) => p.slug === 'ai-jobs-ig').campaignName, 'AI Jobs · IG');
});

test('creating needs the studio token and a valid campaign', async () => {
  const { request } = createTestApp();
  const draft = await draftFrom(request, { slug: 'new-page', format: 'linkedin', name: '', id: 'Bad ID' });
  assert.equal((await request('POST', '/api/pages', { body: draft })).status, 401);
  const res = await request('POST', '/api/pages', { body: draft, headers: auth });
  assert.equal(res.status, 422);
  const { details } = await res.json();
  assert.ok(details.some((d) => d.includes('Campaign name')));
  assert.ok(details.some((d) => d.includes('Campaign ID')));
});

test('every page must keep its application form', async () => {
  const { request } = createTestApp();
  const draft = await draftFrom(request, { slug: 'no-form', format: 'youtube', name: 'No form', id: 'no-form' });
  draft.blocks = draft.blocks.filter((b) => b.type !== 'lead-form');
  const res = await request('POST', '/api/pages', { body: draft, headers: auth });
  assert.equal(res.status, 422);
  assert.ok((await res.json()).details.includes('Every page needs the application form'));
});

test('saving keeps the format and form ID fixed, even if the body tries to change them', async () => {
  const { request } = createTestApp();
  const { body } = await createPage(request, { slug: 'fb-page', format: 'facebook', name: 'FB', id: 'fb' });
  const page = body.page;
  const edited = { ...page, campaign: { ...page.campaign, name: 'FB renamed', format: 'youtube', formId: 'YT-AAAAAA' } };
  const saved = await (await request('PUT', '/api/pages/fb-page', { body: edited, headers: auth })).json();
  assert.equal(saved.page.campaign.name, 'FB renamed');
  assert.equal(saved.page.campaign.format, 'facebook');
  assert.equal(saved.page.campaign.formId, page.campaign.formId);
});

test('end to end: create page → apply → one complete Application reaches the engineering hook', async () => {
  const { request, received } = createTestApp();
  const { body } = await createPage(request, { slug: 'ai-jobs-ig', format: 'instagram', name: 'AI Jobs · IG Nov', id: 'ai-jobs-ig-nov' });
  const page = body.page;
  page.integrations.resources = [{ label: 'Open the guide', url: 'https://example.com/guide' }];
  await request('PUT', `/api/pages/${page.slug}`, { body: page, headers: auth });

  // Live page renders with this page's form ID
  assert.match(await (await request('GET', `/${page.slug}`)).text(), new RegExp(`data-form-id="${page.campaign.formId}"`));

  // Visitor applies from an iPhone in India
  const res = await request('POST', '/api/leads', { body: submission(page), headers: { 'User-Agent': IPHONE_UA }, cf: { country: 'IN', region: 'Karnataka', city: 'Bengaluru' } });
  assert.equal(res.status, 201);
  const result = await res.json();
  assert.deepEqual(result.resources, [{ label: 'Open the guide', url: 'https://example.com/guide' }]);
  assert.match(result.whatsappUrl, /chat\.whatsapp\.com/);

  // Exactly one POST to our backend, authenticated and idempotent
  assert.equal(received.length, 1);
  const { url, headers, application } = received[0];
  assert.equal(url, 'https://backend.test/applications');
  assert.equal(headers.Authorization, 'Bearer backend-key');
  assert.equal(headers['Idempotency-Key'], result.leadId);

  assert.equal(application.applicationId, result.leadId);
  assert.match(application.submittedAt, /^\d{4}-\d\d-\d\dT/);
  assert.deepEqual(application.form, { id: page.campaign.formId, slug: 'ai-jobs-ig', format: 'instagram', campaignId: 'ai-jobs-ig-nov', campaignName: 'AI Jobs · IG Nov' });
  assert.deepEqual(application.applicant, { name: 'Priya Sharma', email: 'priya@example.com', country: 'IN', phone: '+919876543210', role: 'Student', whatsappOptIn: true });
  assert.equal(application.attribution.source, 'instagram');
  assert.equal(application.attribution.utmContent, 'story-nov-20');
  assert.equal(application.attribution.clickId, 'fbclid:abc123');
  assert.equal(application.attribution.firstTouch.source, 'youtube', 'first touch is kept');
  assert.equal(application.attribution.firstTouch.content, 'jobs-video-1');
  assert.deepEqual(application.context, { visitorId: 'visitor-1', device: 'mobile', os: 'ios', geoCountry: 'IN', geoRegion: 'Karnataka', geoCity: 'Bengaluru' });
});

test('if our backend fails, the visitor is asked to retry (nothing is lost silently)', async () => {
  const { request } = createTestApp({ backendStatus: 500 });
  const page = await (await request('GET', `/api/pages/${TEMPLATE}`)).json();
  const res = await request('POST', '/api/leads', { body: submission(page) });
  assert.equal(res.status, 503);
  assert.match((await res.json()).error, /try again/);
});

test('before engineering connects the hook, pages still work and the log has no personal data', async () => {
  const { request, received } = createTestApp({ endpoint: null });
  const warnings = [];
  const originalWarn = console.warn;
  console.warn = (...args) => warnings.push(JSON.stringify(args));
  try {
    const page = await (await request('GET', `/api/pages/${TEMPLATE}`)).json();
    assert.equal((await request('POST', '/api/leads', { body: submission(page) })).status, 201);
  } finally {
    console.warn = originalWarn;
  }
  assert.equal(received.length, 0);
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /NOT saved/);
  assert.match(warnings[0], /YT-7KQ2MD/);
  assert.ok(!/priya|9876543210/i.test(warnings[0]), 'no name, email or phone in logs');
});

test('bots filling the hidden field get a normal answer but nothing is sent', async () => {
  const { request, received } = createTestApp();
  const page = await (await request('GET', `/api/pages/${TEMPLATE}`)).json();
  const res = await request('POST', '/api/leads', { body: submission(page, { honeypot: 'http://spam.example' }) });
  assert.equal(res.status, 201);
  assert.equal(received.length, 0);
});

test('a submission with a stale form ID asks the visitor to refresh', async () => {
  const { request } = createTestApp();
  const page = await (await request('GET', `/api/pages/${TEMPLATE}`)).json();
  assert.equal((await request('POST', '/api/leads', { body: submission(page, { formId: 'YT-ZZZZZZ' }) })).status, 409);
});

test('invalid applications get per-field errors and are not sent', async () => {
  const { request, received } = createTestApp();
  const page = await (await request('GET', `/api/pages/${TEMPLATE}`)).json();
  const res = await request('POST', '/api/leads', { body: submission(page, { lead: { ...validLead, email: 'x' } }) });
  assert.equal(res.status, 422);
  assert.ok((await res.json()).details.email);
  assert.equal(received.length, 0);
});

test('unknown routes and bad JSON get clean errors', async () => {
  const { request } = createTestApp();
  assert.equal((await request('DELETE', '/api/pages/x')).status, 404);
  assert.equal((await request('POST', '/api/leads', { rawBody: '{not json' })).status, 400);
});
