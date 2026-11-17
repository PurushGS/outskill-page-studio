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

/**
 * Form IDs come from our application-form table and are typed in the studio,
 * so any ID that system uses fits: letters, numbers, dot, dash, underscore.
 * Several pages may share one form ID.
 */
export const FORM_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;
