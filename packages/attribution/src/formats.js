/**
 * The channels a campaign page can be made for. Each format has:
 *   code        prefix of every form ID made for it (YT-4K9Q2M)
 *   utmSource / utmMedium   defaults for the tracked links the studio builds
 *   referrers   hostnames that identify a visit from this channel when a link has no utm_source
 *
 * Adding a channel = adding one entry here; the studio, validator and reports pick it up.
 */
export const FORMATS = Object.freeze([
  { id: 'youtube', label: 'YouTube', code: 'YT', utmSource: 'youtube', utmMedium: 'video_description', referrers: ['youtube.com', 'youtu.be'] },
  { id: 'instagram', label: 'Instagram', code: 'IG', utmSource: 'instagram', utmMedium: 'bio_link', referrers: ['instagram.com', 'l.instagram.com'] },
  { id: 'x', label: 'X (Twitter)', code: 'X', utmSource: 'x', utmMedium: 'post', referrers: ['x.com', 'twitter.com', 't.co'] },
  { id: 'linkedin', label: 'LinkedIn', code: 'LI', utmSource: 'linkedin', utmMedium: 'post', referrers: ['linkedin.com', 'lnkd.in'] },
  { id: 'facebook', label: 'Facebook', code: 'FB', utmSource: 'facebook', utmMedium: 'post', referrers: ['facebook.com', 'm.facebook.com', 'l.facebook.com', 'fb.me'] },
  { id: 'whatsapp', label: 'WhatsApp', code: 'WA', utmSource: 'whatsapp', utmMedium: 'message', referrers: ['whatsapp.com', 'wa.me', 'web.whatsapp.com'] },
]);

export function findFormat(id) {
  return FORMATS.find((f) => f.id === id) ?? null;
}

/** "YT-4K9Q2M": format code + 6 characters without look-alikes (no 0/O, 1/I). */
export const FORM_ID_PATTERN = /^[A-Z]{1,3}-[A-HJ-NP-Z2-9]{6}$/;

export function generateFormId(format, random = (n) => crypto.getRandomValues(new Uint8Array(n))) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const suffix = [...random(6)].map((byte) => alphabet[byte % alphabet.length]).join('');
  return `${format.code}-${suffix}`;
}
