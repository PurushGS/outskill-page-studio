/**
 * Countries offered in the phone field. `pattern` validates the national
 * number (without the dial code). Add a country by adding a row.
 */
export const COUNTRIES = [
  { code: 'IN', name: 'India', dial: '+91', pattern: /^[6-9]\d{9}$/ },
  { code: 'US', name: 'United States', dial: '+1', pattern: /^[2-9]\d{9}$/ },
  { code: 'GB', name: 'United Kingdom', dial: '+44', pattern: /^7\d{9}$/ },
  { code: 'AE', name: 'United Arab Emirates', dial: '+971', pattern: /^5\d{8}$/ },
  { code: 'SG', name: 'Singapore', dial: '+65', pattern: /^[89]\d{7}$/ },
  { code: 'CA', name: 'Canada', dial: '+1', pattern: /^[2-9]\d{9}$/ },
  { code: 'AU', name: 'Australia', dial: '+61', pattern: /^4\d{8}$/ },
];

export const DEFAULT_COUNTRY = 'IN';

export function findCountry(code) {
  return COUNTRIES.find((c) => c.code === code);
}
