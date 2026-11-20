/**
 * The channels a campaign page can be made for. Each format has:
 *   utmSource / utmMedium   defaults for the tracked links the studio builds
 *   referrers   hostnames that identify a visit from this channel when a link has no utm_source
 *
 * Adding a channel = adding one entry here; the studio and validator pick it up.
 */
export const FORMATS = Object.freeze([
  { id: 'youtube', label: 'YouTube', utmSource: 'youtube', utmMedium: 'video_description', referrers: ['youtube.com', 'youtu.be'] },
  { id: 'instagram', label: 'Instagram', utmSource: 'instagram', utmMedium: 'bio_link', referrers: ['instagram.com', 'l.instagram.com'] },
  { id: 'x', label: 'X (Twitter)', utmSource: 'x', utmMedium: 'post', referrers: ['x.com', 'twitter.com', 't.co'] },
  { id: 'linkedin', label: 'LinkedIn', utmSource: 'linkedin', utmMedium: 'post', referrers: ['linkedin.com', 'lnkd.in'] },
  { id: 'facebook', label: 'Facebook', utmSource: 'facebook', utmMedium: 'post', referrers: ['facebook.com', 'm.facebook.com', 'l.facebook.com', 'fb.me'] },
  { id: 'whatsapp', label: 'WhatsApp', utmSource: 'whatsapp', utmMedium: 'message', referrers: ['whatsapp.com', 'wa.me', 'web.whatsapp.com'] },
]);

export function findFormat(id) {
  return FORMATS.find((f) => f.id === id) ?? null;
}

export const FORM_URL_EXAMPLE = 'https://applications.growthschool.io/1426/24774';

/**
 * The application form's link, pasted in the studio. Any host works
 * (applications.growthschool.io, applications.outskill.com, …); the path is:
 *   /<programId>/<formId>/<campaignId>     or, without a campaign,    /<programId>/<formId>
 * Returns the IDs (campaignId is null when the link has none), or null if the
 * link doesn't have that shape. Several pages may share one form URL.
 *
 * @returns {{ programId: number, formId: number, campaignId: number | null } | null}
 */
export function parseFormUrl(value) {
  let url;
  try {
    url = new URL(String(value ?? '').trim());
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
  const parts = url.pathname.split('/').filter(Boolean);
  if (parts.length < 2 || parts.length > 3 || !parts.every((part) => /^[1-9]\d{0,9}$/.test(part))) return null;
  const [programId, formId, campaignId = null] = parts.map(Number);
  return { programId, formId, campaignId };
}
