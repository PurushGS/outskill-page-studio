/**
 * Tiny, dependency-free HTML templating.
 *
 * Every interpolated value is escaped unless it is already a SafeHtml
 * (produced by `html` itself or explicitly via `raw`). Arrays are joined,
 * so `html`<ul>${items.map(i => html`<li>${i}</li>`)}</ul>`` just works.
 */

export class SafeHtml {
  constructor(value) {
    this.value = String(value);
  }

  toString() {
    return this.value;
  }
}

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (ch) => ESCAPES[ch]);
}

/** Marks a trusted string (e.g. an SVG from the icon library) as safe HTML. */
export function raw(value) {
  return new SafeHtml(value);
}

function stringify(value) {
  if (value === null || value === undefined || value === false) return '';
  if (value instanceof SafeHtml) return value.value;
  if (Array.isArray(value)) return value.map(stringify).join('');
  return escapeHtml(value);
}

export function html(strings, ...values) {
  let out = strings[0];
  for (let i = 0; i < values.length; i++) out += stringify(values[i]) + strings[i + 1];
  return new SafeHtml(out);
}

/** Only allow http(s), mailto, tel, relative and in-page links; anything else becomes '#'. */
export function safeUrl(url) {
  const value = String(url ?? '').trim();
  if (!value) return '#';
  if (/^(https?:|mailto:|tel:|\/|#|\?)/i.test(value)) return value;
  return '#';
}
