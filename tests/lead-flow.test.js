import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LeadValidator, QuestionFlow } from '../packages/lead-flow/src/index.js';
import { HttpLeadTransport } from '../packages/lead-flow/src/LeadTransport.js';
import { validLead, QUESTION_FLOW } from './helpers/testApp.js';

const validator = new LeadValidator();

test('a valid lead is normalised', () => {
  const { valid, lead } = validator.validate(validLead);
  assert.equal(valid, true);
  assert.equal(lead.email, 'priya@example.com');
  assert.equal(lead.phone, '+919876543210');
});

test('each bad field gets its own message', () => {
  const { valid, errors } = validator.validate({ name: 'A', email: 'nope', country: 'IN', phone: '12345' });
  assert.equal(valid, false);
  assert.deepEqual(Object.keys(errors).sort(), ['email', 'name', 'phone']);
  assert.match(errors.phone, /India/);
});

test('phone rules follow the chosen country; leading zero is tolerated', () => {
  assert.ok(validator.validate({ ...validLead, phone: '09876543210' }).valid);
  assert.ok(!validator.validate({ ...validLead, phone: '1234567890' }).valid, 'Indian mobiles start with 6-9');
  assert.ok(validator.validate({ ...validLead, country: 'AE', phone: '501234567' }).valid);
  assert.ok(!validator.validate({ ...validLead, country: 'AE', phone: '9876543210' }).valid);
});

test('validation is idempotent: a normalised lead validates again unchanged', () => {
  const first = validator.validate(validLead).lead;
  const second = validator.validate(first);
  assert.equal(second.valid, true);
  assert.deepEqual(second.lead, first);
});

test('the standard question comes first; its option decides the follow-ups; always-shown questions come last', () => {
  const flow = new QuestionFlow(QUESTION_FLOW);
  const ids = (option) => flow.visible(option).map((q) => q.id);
  assert.deepEqual(ids(null), [101, 104]);
  assert.deepEqual(ids(1), [101, 102, 104]);
  assert.deepEqual(ids('2'), [101, 103, 104], 'option ids compare as text, as select values are text');
  assert.equal(new QuestionFlow({}).isEmpty, true);
  assert.equal(new QuestionFlow(QUESTION_FLOW).isEmpty, false);
});

test('a question that is also a follow-up is shown once', () => {
  const dup = { ...QUESTION_FLOW, unconditionalQuestions: [...QUESTION_FLOW.unconditionalQuestions, QUESTION_FLOW.standardQuestionsFlow[0].followUpQuestions[0]] };
  assert.deepEqual(new QuestionFlow(dup).visible(1).map((q) => q.id), [101, 102, 104]);
});

test('answers are shaped the way the backend takes them', () => {
  const flow = new QuestionFlow(QUESTION_FLOW);
  const standard = flow.visible(1)[0];
  const text = flow.visible(2)[1]; // the college question, shown for students
  assert.deepEqual(QuestionFlow.answerFor(standard, '1'), { questionId: 101, formsQuestionIdentityId: 1, questionType: 'DEFAULT_STANDARD_QUESTION', questionCategory: 'ONE_OF_MANY', responses: ['Professional'], optionIds: [1] });
  assert.equal(QuestionFlow.answerFor(standard, ''), null, 'nothing picked, nothing to send');
  assert.equal(QuestionFlow.answerFor(standard, '999'), null, 'an option that does not exist is ignored');
  assert.deepEqual(QuestionFlow.answerFor(text, '  Delhi University '), { questionId: 103, formsQuestionIdentityId: 3, questionType: 'CUSTOM_CONDITIONAL', questionCategory: 'TEXT', responses: ['Delhi University'] });
  assert.equal(QuestionFlow.answerFor(text, '   '), null);
});

test('the studio lists every question once: standard, all follow-ups, then the always-shown ones; blanks and [[placeholders]] skipped', () => {
  const flow = new QuestionFlow({
    ...QUESTION_FLOW,
    scholarshipQuestions: [{ id: 105, title: '[[scholarship]]' }, { id: 106, title: 'Scholarship reason', questionCategory: 'TEXT' }, { id: 107, title: '' }],
  });
  assert.deepEqual(flow.all().map((q) => q.id), [101, 102, 103, 104, 106]);
  assert.deepEqual(new QuestionFlow({}).all(), []);
});

test('answers become readable fields for WebEngage: the question title as a key, the answer as text', () => {
  const flow = new QuestionFlow(QUESTION_FLOW);
  const [standard] = flow.visible(null);
  assert.deepEqual(QuestionFlow.fieldFor(standard, '1'), ['what_describes_you_best', 'Professional']);
  const text = flow.all().find((q) => q.id === 104);
  assert.deepEqual(QuestionFlow.fieldFor(text, '  I want to switch careers '), ['why_do_you_want_to_join', 'I want to switch careers']);
  assert.equal(QuestionFlow.fieldFor(text, '   '), null);
  assert.equal(QuestionFlow.fieldFor(standard, '99'), null, 'an option that does not exist is no answer');
});

test('the WebEngage event goes straight to the backend; if that is blocked or fails, it goes through our relay; it never throws', async () => {
  const event = { eventName: 'Lead Form Submitted', distinct_id: 'id', eventTime: 't', eventData: {} };
  const run = async (behaviour) => {
    const calls = [];
    const fetchImpl = async (url, init) => {
      calls.push({ url, body: JSON.parse(init.body), keepalive: init.keepalive });
      const outcome = behaviour(url);
      if (outcome === 'throw') throw new TypeError('Failed to fetch');
      return new Response('{}', { status: outcome });
    };
    const how = await new HttpLeadTransport({ apiBase: 'https://outskill.live', slug: 'p', fetchImpl }).webengageEvent('https://backend.test/leads/webengage/external', event);
    return { how, calls };
  };

  const direct = await run(() => 200);
  assert.equal(direct.how, 'direct');
  assert.equal(direct.calls.length, 1);
  assert.equal(direct.calls[0].keepalive, true);

  const blocked = await run((url) => (url.includes('backend.test') ? 'throw' : 200));
  assert.equal(blocked.how, 'relay');
  assert.equal(blocked.calls[1].url, 'https://outskill.live/api/leads/notify');
  assert.deepEqual(blocked.calls[1].body, { slug: 'p', ...event });

  assert.equal((await run((url) => (url.includes('backend.test') ? 500 : 200))).how, 'relay');
  assert.equal((await run(() => 'throw')).how, 'failed');
});
