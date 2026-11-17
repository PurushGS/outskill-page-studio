import { DEFAULT_COUNTRY, findCountry } from './countries.js';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MAX_TEXT = 120;

/**
 * Validates and normalises a sign-up. The same class runs in the browser
 * (instant feedback) and in the Worker (the check that actually counts),
 * so the rules can never drift apart.
 */
export class LeadValidator {
  /**
   * @param {object} input  raw form values
   * @returns {{ valid: boolean, errors: Record<string,string>, lead: object|null }}
   */
  validate(input = {}) {
    const errors = {};
    const name = clean(input.name);
    const email = clean(input.email).toLowerCase();
    const country = findCountry(input.country) ?? findCountry(DEFAULT_COUNTRY);
    const nationalNumber = toNationalNumber(input.phone, country.dial);

    if (name.length < 2) errors.name = 'Please enter your name';
    if (!EMAIL.test(email)) errors.email = 'Please enter a valid email address';
    if (!country.pattern.test(nationalNumber)) errors.phone = `Please enter a valid ${country.name} WhatsApp number`;
    if (input.requireRole && !clean(input.role)) errors.role = 'Please pick one';

    if (Object.keys(errors).length) return { valid: false, errors, lead: null };

    return {
      valid: true,
      errors,
      lead: {
        name,
        email,
        country: country.code,
        phone: `${country.dial}${nationalNumber}`,
        role: clean(input.role),
        whatsappOptIn: input.whatsappOptIn === true || input.whatsappOptIn === 'on',
      },
    };
  }
}

/** Accepts "98765 43210", "098765...", or an already-normalised "+919876543210". */
function toNationalNumber(phone, dial) {
  const raw = String(phone ?? '').trim();
  const withoutDial = raw.startsWith(dial) ? raw.slice(dial.length) : raw;
  return withoutDial.replace(/\D/g, '').replace(/^0+/, '');
}

function clean(value) {
  return String(value ?? '').trim().slice(0, MAX_TEXT);
}


