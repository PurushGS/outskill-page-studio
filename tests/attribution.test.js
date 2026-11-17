import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FORMATS, findFormat, generateFormId, FORM_ID_PATTERN, normalizeAttribution, resolveSource, buildTrackedLink, slugify } from '../packages/attribution/src/index.js';
import { AttributionCollector } from '../packages/attribution/src/AttributionCollector.js';

test('six formats, each with a unique form ID prefix', () => {
  assert.equal(FORMATS.length, 6);
  assert.equal(new Set(FORMATS.map((f) => f.code)).size, 6);
  for (const format of FORMATS) assert.match(generateFormId(format), FORM_ID_PATTERN);
  assert.match(generateFormId(findFormat('youtube')), /^YT-/);
});

test('source: utm_source wins, then src, then the referring channel, then direct', () => {
  assert.equal(resolveSource({ utm_source: 'Newsletter', src: 'x' }, 'https://youtube.com'), 'newsletter');
  assert.equal(resolveSource({ src: 'Channel-A' }), 'channel-a');
  assert.equal(resolveSource({}, 'https://m.youtube.com/watch?v=1'), 'youtube');
  assert.equal(resolveSource({}, 'https://t.co/abc'), 'x');
  assert.equal(resolveSource({}, 'https://l.instagram.com/?u=x'), 'instagram');
  assert.equal(resolveSource({}, 'https://www.google.com/'), 'google.com');
  assert.equal(resolveSource({}, ''), 'direct');
});

test('normalize keeps known keys only, picks a click ID and keeps the first touch', () => {
  const touch = normalizeAttribution({
    params: { utm_source: 'youtube', gclid: 'G1', evil: '<script>' },
    referrer: 'https://youtube.com',
    firstTouch: { params: { utm_campaign: 'first' }, referrer: 'https://x.com', at: '2026-01-01' },
  });
  assert.equal(touch.evil, undefined);
  assert.equal(touch.clickId, 'gclid:G1');
  assert.equal(touch.firstTouch.source, 'x');
  assert.equal(touch.firstTouch.utm_campaign, 'first');
  assert.equal(normalizeAttribution().source, 'direct');
});

test('tracked links carry the format defaults, campaign and post', () => {
  const link = buildTrackedLink({ baseUrl: 'https://go.example', slug: 'ai-jobs', format: findFormat('instagram'), campaignId: 'ai-jobs-nov', content: 'Story Nov 20' });
  assert.equal(link, 'https://go.example/ai-jobs?utm_source=instagram&utm_medium=bio_link&utm_campaign=ai-jobs-nov&utm_content=story-nov-20');
  assert.equal(slugify('AI Jobs · Nov 2026!'), 'ai-jobs-nov-2026');
});

test('collector remembers the first touch and a stable visitor id', () => {
  const store = new Map();
  const storage = { get: (k) => store.get(k) ?? null, set: (k, v) => store.set(k, v) };
  const visit = (search, referrer) => new AttributionCollector({
    location: { search, origin: 'https://go.example', pathname: '/p' },
    documentRef: { referrer },
    storage,
  });
  const first = visit('?utm_source=youtube', 'https://youtube.com').collect();
  const second = visit('?utm_source=instagram', '');
  assert.equal(second.collect().params.utm_source, 'instagram');
  assert.equal(second.collect().firstTouch.params.utm_source, 'youtube');
  assert.equal(first.firstTouch.params.utm_source, 'youtube');
  assert.equal(second.visitorId(), second.visitorId());
});
