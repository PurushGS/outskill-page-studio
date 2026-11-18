import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LeadValidator, QuestionFlow } from '../packages/lead-flow/src/index.js';
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
