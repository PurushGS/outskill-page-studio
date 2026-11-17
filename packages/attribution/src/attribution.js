import { FORMATS } from './formats.js';

/**
 * URL parameters worth keeping. utm_* are set by us (tracked links); the click
 * IDs are added automatically by ad platforms and tie a lead back to a
 * specific ad click if paid campaigns are run later.
 */
export const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
export const CLICK_ID_KEYS = ['gclid', 'fbclid', 'igshid', 'ttclid', 'twclid', 'li_fat_id', 'msclkid'];
const EXTRA_KEYS = ['src', 'ref'];
const MAX = 200;

/**
 * Cleans attribution data coming from the browser: keeps known keys only,
 * trims lengths, and works out a single `source` for reporting.
 *
 * @param {object} raw  { params, referrer, landingUrl, firstTouch }
 */
export function normalizeAttribution(raw = {}) {
  const params = pick(raw.params, [...UTM_KEYS, ...EXTRA_KEYS, ...CLICK_ID_KEYS]);
  const referrer = clip(raw.referrer);
  const touch = {
    ...params,
    referrer,
    landingUrl: clip(raw.landingUrl),
    source: resolveSource(params, referrer),
  };
  const first = raw.firstTouch && typeof raw.firstTouch === 'object' ? raw.firstTouch : null;
  const firstParams = pick(first?.params, [...UTM_KEYS, ...EXTRA_KEYS]);
  return {
    ...touch,
    clickId: CLICK_ID_KEYS.map((k) => params[k] && `${k}:${params[k]}`).find(Boolean) || '',
    firstTouch: first
      ? {
          ...firstParams,
          referrer: clip(first.referrer),
          source: resolveSource(firstParams, clip(first.referrer)),
          at: clip(first.at),
        }
      : null,
  };
}

/**
 * One answer to "where did this visitor come from?":
 *   utm_source (we tagged the link) → src → the referring site's channel → domain → "direct".
 */
export function resolveSource(params = {}, referrer = '') {
  if (params.utm_source) return params.utm_source.toLowerCase();
  if (params.src) return params.src.toLowerCase();
  const host = hostOf(referrer);
  if (!host) return 'direct';
  const format = FORMATS.find((f) => f.referrers.some((r) => host === r || host.endsWith(`.${r}`)));
  return format ? format.utmSource : host;
}

/**
 * The link to paste in a post or video description, pre-tagged so every
 * sign-up is attributed to this campaign and (optionally) this exact post.
 */
export function buildTrackedLink({ baseUrl, slug, format, campaignId, content = '' }) {
  const url = new URL(`/${slug}`, baseUrl);
  url.searchParams.set('utm_source', format.utmSource);
  url.searchParams.set('utm_medium', format.utmMedium);
  url.searchParams.set('utm_campaign', campaignId);
  if (content.trim()) url.searchParams.set('utm_content', slugify(content));
  return url.href;
}

export function slugify(text) {
  return String(text ?? '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

function pick(source, keys) {
  const out = {};
  for (const key of keys) if (source?.[key]) out[key] = clip(source[key]);
  return out;
}

function clip(value) {
  return String(value ?? '').trim().slice(0, MAX);
}

function hostOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}
