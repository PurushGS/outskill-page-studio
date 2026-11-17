import { html, safeUrl } from './html.js';
import { youtubeThumbnail } from './media.js';

/**
 * Small render helpers shared by several components. Keeping them here means
 * a button looks and behaves the same in the header, hero and footer.
 */

/** `attrs` must be SafeHtml (e.g. from Component.editable) or ''. */
export function button({ label, href, variant = 'primary', icon = null, attrs = '' }) {
  if (!label) return '';
  const external = /^https?:/i.test(href || '');
  return html`<a class="pk-btn pk-btn--${variant}" href="${safeUrl(href)}"${external ? html` target="_blank" rel="noopener noreferrer"` : ''}${attrs}>${label}${icon || ''}</a>`;
}

export function eyebrow(text, attrs = '') {
  return text ? html`<p class="pk-eyebrow"${attrs}>${text}</p>` : '';
}

/** Turns "Line one\nLine two" into "Line one<br>Line two" without trusting the text. */
export function multiline(text) {
  return String(text ?? '')
    .split('\n')
    .map((line, i) => (i === 0 ? html`${line}` : html`<br>${line}`));
}

/**
 * A YouTube thumbnail that links to the video, with a play label and
 * duration badge. Uses YouTube's image CDN instead of an embedded player.
 */
export function videoThumbnail({ url, duration = '', label = 'Watch', icon = '', className = '' }) {
  const src = youtubeThumbnail(url);
  return html`<a class="pk-thumb ${className}" href="${safeUrl(url)}" target="_blank" rel="noopener noreferrer">
    ${src ? html`<img src="${src}" alt="" loading="lazy" decoding="async">` : ''}
    ${label ? html`<span class="pk-thumb__play">${icon}${label}</span>` : ''}
    ${duration ? html`<span class="pk-thumb__time">${duration}</span>` : ''}
  </a>`;
}
