import { Component } from '../../core/Component.js';
import { html, raw, safeUrl } from '../../core/html.js';
import { youtubeThumbnail } from '../../core/media.js';

/**
 * Base for the "showcase" blocks: the Outskill library look (alternating
 * near-black and white sections, colour-wash cards, lime buttons). They share
 * styles/showcase.css and src/client/showcase.js, which pages load only when
 * they use one of these blocks.
 */
export class ShowcaseBlock extends Component {
  static stylesheet = 'showcase';
  static script = 'showcase';
  /** 'dark' | 'light' when the block has no tone setting of its own. */
  static tone = 'dark';

  get tone() {
    return this.props.tone || this.constructor.tone;
  }

  render() {
    const type = this.constructor.type;
    return html`<section class="pk-block ox ox--${this.tone} pk-${type}" id="${this.id}" data-block-id="${this.id}" data-block-type="${type}">${this.renderContent()}</section>`;
  }

  /** A lime / dark / outline button in the showcase style. */
  button(label, href, { variant = 'lime', size = '', icon = '', attrs = '' } = {}) {
    if (!label) return '';
    const external = /^https?:/i.test(href || '');
    return html`<a class="o-btn ${variant}${size ? ` ${size}` : ''}" href="${safeUrl(href)}"${external ? html` target="_blank" rel="noopener noreferrer"` : ''}${attrs}>${icon ? svg(icon) : ''}${label}</a>`;
  }
}

export const TONE_FIELD = {
  key: 'tone',
  label: 'Section colour',
  kind: 'choice',
  options: [{ value: 'dark', label: 'Dark' }, { value: 'light', label: 'Light' }],
};

/** Colour washes for cards, as in the design. */
export const WASHES = ['crimson', 'violet', 'rose', 'blue', 'amber', 'teal', 'green', 'terracotta', 'ink'];
export const WASH_FIELD = { key: 'color', label: 'Card colour', kind: 'choice', options: WASHES.map((w) => ({ value: w, label: w[0].toUpperCase() + w.slice(1) })) };

/** Line icons from the design (stroke-based, drawn at 24×24). */
const ICONS = {
  check: '<path d="M20 6 9 17l-5-5"/>',
  arrow: '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
  back: '<path d="M19 12H5"/><path d="m12 19-7-7 7-7"/>',
  prev: '<path d="m15 18-6-6 6-6"/>',
  next: '<path d="m9 18 6-6-6-6"/>',
  out: '<path d="M7 17 17 7M8 7h9v9"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  play: '<path d="M8 5v14l11-7z" fill="currentColor" stroke="none"/>',
  youtube: '<path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17"/><path d="m10 15 5-3-5-3z"/>',
  instagram: '<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor"/>',
  copy: '<rect x="8" y="8" width="13" height="13" rx="2"/><path d="M4 16V5a1 1 0 0 1 1-1h11"/>',
  steps: '<path d="m3 7 2 2 4-4"/><path d="m3 17 2 2 4-4"/><path d="M13 6h8M13 12h8M13 18h8"/>',
  tools: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
};

export function svg(name) {
  return raw(`<svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[name] || ''}</svg>`);
}

/** A tool's logo: the image link if given, else the logo service for its website. */
export function logoSrc({ logo, domain }) {
  if (logo) return logo;
  const host = String(domain || '').replace(/^https?:\/\//, '').replace(/\/.*$/, '');
  return host ? `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=128` : '';
}

/** A logo image, or the tool's first letter when there is none. */
export function logo(tool) {
  const src = logoSrc(tool);
  return src ? html`<img src="${src}" alt="" loading="lazy">` : html`<b>${String(tool.name || '?').charAt(0)}</b>`;
}

/** A 16:9 YouTube thumbnail with a play button and duration, in the design's muted style. */
export function videoThumb(url, duration = '', extra = '') {
  const src = youtubeThumbnail(url);
  return html`<span class="o-vthumb">${src ? html`<img src="${src}" alt="" loading="lazy" decoding="async">` : ''}${extra}<span class="o-pbtn">${svg('play')}</span>${duration ? html`<span class="o-dur">${duration}</span>` : ''}</span>`;
}
