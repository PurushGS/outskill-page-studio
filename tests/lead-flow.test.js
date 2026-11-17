import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LeadValidator } from '../packages/lead-flow/src/index.js';
import { validLead } from './helpers/testApp.js';

const validator = new LeadValidator();

test('a valid lead is normalised', () => {
  const { valid, lead } = validator.validate(validLead);
  assert.equal(valid, true);
  assert.equal(lead.email, 'priya@example.com');
  assert.equal(lead.phone, '+919876543210');
});

test('each bad field gets its own message', () => {
  const { valid, errors } = validator.validate({ name: 'A', email: 'nope', country: 'IN', phone: '12345', requireRole: true });
  assert.equal(valid, false);
  assert.deepEqual(Object.keys(errors).sort(), ['email', 'name', 'phone', 'role']);
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
