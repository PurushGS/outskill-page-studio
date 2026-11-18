import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  html, raw, safeUrl, Theme, IconLibrary, ComponentRegistry, Component,
  createDefaultRegistry, PageRenderer, PageValidator, youtubeId, youtubeThumbnail,
} from '../packages/page-kit/src/index.js';
import { templates } from '../templates/index.js';

const registry = createDefaultRegistry();
const icons = new IconLibrary();
const renderer = new PageRenderer({ registry, icons });
const context = { icons, page: { slug: 'test-page' }, mode: 'live' };

test('html escapes interpolated text but keeps nested html and raw()', () => {
  const name = '<img src=x onerror=alert(1)>';
  const out = html`<p>${name}</p>${html`<b>ok</b>`}${raw('<i>trusted</i>')}`.toString();
  assert.equal(out, '<p>&lt;img src=x onerror=alert(1)&gt;</p><b>ok</b><i>trusted</i>');
});

test('safeUrl blocks javascript: and data: links', () => {
  assert.equal(safeUrl('javascript:alert(1)'), '#');
  assert.equal(safeUrl(' data:text/html,hi'), '#');
  assert.equal(safeUrl('https://chat.whatsapp.com/x'), 'https://chat.whatsapp.com/x');
  assert.equal(safeUrl('#join'), '#join');
});

test('Theme turns tokens into CSS variables and rejects bad values', () => {
  const css = new Theme({ colors: { accentText: '#fff' } }).toCss();
  assert.match(css, /--pk-accent-text:#fff/);
  assert.match(css, /--pk-font-heading:'Fira Sans'/);
  assert.throws(() => new Theme({ colors: { accent: 'red;}body{display:none' } }), /hex/);
  assert.throws(() => new Theme({ fonts: { body: 'Comic Sans' } }), /FONT_CHOICES/);
});

test('Theme builds one Google Fonts URL for both families', () => {
  const url = new Theme({ fonts: { heading: 'Plus Jakarta Sans', body: 'Inter' } }).fontStylesheetUrl();
  assert.match(url, /family=Plus\+Jakarta\+Sans:wght/);
  assert.match(url, /family=Inter:wght/);
});

test('IconLibrary falls back instead of breaking on an unknown icon', () => {
  assert.match(icons.render('does-not-exist').toString(), /^<svg/);
  assert.ok(icons.extend({ custom: '<circle r="1"/>' }).has('custom'));
  assert.ok(!icons.has('custom'), 'extend() must not mutate the original library');
});

test('registry rejects duplicates and unknown types', () => {
  class Dummy extends Component { static type = 'dummy'; renderContent() { return 'x'; } }
  const r = new ComponentRegistry().register(Dummy);
  assert.throws(() => r.register(Dummy), /already registered/);
  assert.throws(() => r.get('nope'), /Unknown component/);
  assert.equal(r.describe()[0].type, 'dummy');
});

// Block-by-block: every registered component renders with its defaults and escapes user text.
for (const { type, defaults, schema } of registry.describe()) {
  test(`block "${type}" renders defaults and escapes every text field`, () => {
    const props = structuredClone(defaults);
    for (const spec of schema) {
      if (spec.kind === 'text' || spec.kind === 'textarea') props[spec.key] = '<script>x</script>';
      if (spec.kind === 'list') props[spec.key] = [Object.fromEntries(spec.itemSchema.map((s) => [s.key, s.kind === 'icon' ? 'star' : '<script>y</script>']))];
    }
    const out = registry.create({ id: `${type}-1`, type, props }, context).render().toString();
    assert.match(out, new RegExp(`data-block-id="${type}-1"`));
    assert.ok(!out.includes('<script>'), `${type} leaked raw HTML`);
  });
}

test('every bundled template is valid and renders a full document', () => {
  const validator = new PageValidator(registry);
  for (const [slug, template] of Object.entries(templates)) {
    // Templates ship with a placeholder Form URL, so Publish stays blocked until a real one is pasted.
    assert.ok(validator.validate(template).some((e) => e.includes('Form URL must look like')), `${slug} needs a real form URL`);
    const page = { ...template, campaign: { ...template.campaign, formUrl: 'https://applications.growthschool.io/5122/24542/19240' } };
    assert.deepEqual(validator.validate(page), [], `${slug} should be valid`);
    const doc = renderer.render(page);
    assert.match(doc, /^<!doctype html>/);
    assert.match(doc, /name="viewport"/);
    assert.match(doc, /data-lead-form/);
    assert.match(doc, /bootLeadFlow\(\{"slug":"/);
  }
});

test('preview mode is passed to the browser script so no real leads are sent', () => {
  const doc = renderer.render(templates['outskill-ai-resources'], { mode: 'preview' });
  assert.match(doc, /"mode":"preview"/);
});

test('page text cannot break out of the boot script', () => {
  const page = structuredClone(templates['outskill-ai-resources']);
  page.slug = '</script><script>alert(1)</script>';
  const doc = renderer.render(page);
  assert.ok(!doc.includes('</script><script>alert(1)'));
});

test('validator explains problems in plain language', () => {
  const page = structuredClone(templates['outskill-ai-resources']);
  page.slug = 'Bad Slug';
  page.blocks.push({ ...page.blocks[0] });
  page.blocks.push({ id: 'x', type: 'carousel' });
  page.blocks.push({ id: 'form-2', type: 'lead-form' });
  page.campaign = { format: 'myspace', name: '', id: 'Nope', formUrl: 'not a link' };
  page.integrations.resources = [{ label: 'Guide', url: 'javascript:alert(1)' }];
  const errors = new PageValidator(registry).validate(page);
  for (const expected of ['Page link', 'used twice', 'Unknown block type "carousel"', 'Only one application form', 'Unknown format', 'Campaign name', 'Campaign ID', 'Form URL', 'must start with https://']) {
    assert.ok(errors.some((e) => e.includes(expected)), `expected an error mentioning "${expected}"`);
  }
});

test('youtubeId understands every link shape people paste', () => {
  for (const url of ['https://www.youtube.com/watch?v=v_XdN5-ya9A&t=3', 'https://youtu.be/v_XdN5-ya9A', 'https://youtube.com/shorts/v_XdN5-ya9A', 'https://m.youtube.com/watch?v=v_XdN5-ya9A', 'https://www.youtube.com/embed/v_XdN5-ya9A']) {
    assert.equal(youtubeId(url), 'v_XdN5-ya9A', url);
  }
  assert.equal(youtubeId('https://evil.com/watch?v=v_XdN5-ya9A'), '');
  assert.equal(youtubeId('not a url'), '');
  assert.equal(youtubeThumbnail('https://youtu.be/v_XdN5-ya9A'), 'https://i.ytimg.com/vi/v_XdN5-ya9A/hqdefault.jpg');
});

test('click-to-edit markers are added in the studio preview only', () => {
  const page = templates['outskill-ai-resources'];
  const preview = renderer.render(page, { mode: 'preview' });
  assert.match(preview, /data-field="title"/);
  assert.match(preview, /data-field="items\.2\.title"/);
  assert.ok(!renderer.render(page).includes('data-field='), 'live pages stay clean');
});
