import { parseFormUrl } from './formats.js';

/**
 * The application forms pages can use. Every page's Form URL is
 * FORM_HOST/PROGRAM_ID/<formId>; only the form changes, so the studio offers
 * this list instead of a link to type. Change the forms here (or the program
 * and host above them) and the studio's dropdown follows.
 */
export const FORM_HOST = 'https://applications.growthschool.io';
export const PROGRAM_ID = 1426; // Outskill.Live

export const APPLICATION_FORMS = Object.freeze([
  { channel: 'YouTube', region: 'IND', formId: 24774 },
  { channel: 'YouTube', region: 'INTL', formId: 24775 },
  { channel: 'Instagram', region: 'IND', formId: 24777 },
  { channel: 'Instagram', region: 'INTL', formId: 24778 },
  { channel: 'LinkedIn', region: 'IND', formId: 24779 },
  { channel: 'LinkedIn', region: 'INTL', formId: 24780 },
  { channel: 'X', region: 'IND', formId: 24781 },
  { channel: 'X', region: 'INTL', formId: 24782 },
  { channel: 'YouTube IPs', region: 'IND', formId: 24783 },
  { channel: 'YouTube IPs', region: 'INTL', formId: 24784 },
  { channel: 'Instagram IPs', region: 'IND', formId: 24785 },
  { channel: 'Instagram IPs', region: 'INTL', formId: 24786 },
]);

/** "https://applications.growthschool.io/1426/24774" */
export function formUrlFor(formId) {
  return `${FORM_HOST}/${PROGRAM_ID}/${formId}`;
}

/** The list entry a Form URL points at (same program and form), or null for any other link. */
export function findApplicationForm(formUrl) {
  const ids = parseFormUrl(formUrl);
  if (!ids || ids.programId !== PROGRAM_ID) return null;
  return APPLICATION_FORMS.find((form) => form.formId === ids.formId) ?? null;
}

/** "YouTube · IND (24774)" */
export function formLabel(form) {
  return `${form.channel} · ${form.region} (${form.formId})`;
}
