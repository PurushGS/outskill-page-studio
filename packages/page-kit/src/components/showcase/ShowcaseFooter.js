import { html, safeUrl } from '../../core/html.js';
import { ShowcaseBlock, svg } from './ShowcaseBlock.js';

const LINK = [{ key: 'label', label: 'Text', kind: 'text' }, { key: 'href', label: 'Link', kind: 'url' }];

/** Wordmark, a call to action, two link columns and a large faded wordmark. */
export class ShowcaseFooter extends ShowcaseBlock {
  static type = 'sc-footer';
  static label = 'Showcase · Footer';
  static schema = [
    { key: 'brand', label: 'Wordmark', kind: 'text' },
    { key: 'youtubeUrl', label: 'YouTube channel link (empty hides the icon)', kind: 'url' },
    { key: 'instagramUrl', label: 'Instagram link (empty hides the icon)', kind: 'url' },
    { key: 'ctaTitle', label: 'Call to action: title', kind: 'text' },
    { key: 'ctaText', label: 'Call to action: text', kind: 'text' },
    { key: 'ctaLabel', label: 'Call to action: button text', kind: 'text' },
    { key: 'ctaHref', label: 'Call to action: button link', kind: 'url' },
    { key: 'col1Title', label: 'First column title', kind: 'text' },
    { key: 'col1', label: 'First column links', kind: 'list', itemSchema: LINK },
    { key: 'col2Title', label: 'Second column title', kind: 'text' },
    { key: 'col2', label: 'Second column links', kind: 'list', itemSchema: LINK },
    { key: 'bottomLeft', label: 'Bottom line, left', kind: 'text' },
    { key: 'bottomRight', label: 'Bottom line, right', kind: 'text' },
    { key: 'bigWord', label: 'Large faded word (empty hides it)', kind: 'text' },
  ];
  static defaults = {
    brand: 'Outskill',
    youtubeUrl: 'https://www.youtube.com/channel/UCNssyoLJiA2oB5xM7XjxmJA?sub_confirmation=1',
    instagramUrl: '',
    ctaTitle: 'New resources every day',
    ctaText: 'Every Outskill breakdown, written out step by step. Free forever.',
    ctaLabel: 'Get free access',
    ctaHref: '#join',
    col1Title: 'Library',
    col1: [{ label: 'Workflows', href: '#library' }, { label: 'Top videos', href: '#videos' }, { label: 'AI tools directory', href: '#tools' }, { label: 'Questions', href: '#faq' }],
    col2Title: 'Outskill',
    col2: [{ label: 'outskill.com', href: 'https://www.outskill.com/' }, { label: 'YouTube channel', href: 'https://www.youtube.com/channel/UCNssyoLJiA2oB5xM7XjxmJA' }],
    bottomLeft: '© 2026 Outskill · Free AI workflow library',
    bottomRight: 'Stay ahead in the AI-first world',
    bigWord: 'Outskill',
  };

  renderContent() {
    const p = this.props;
    const col = (title, links, key) => (links.length ? html`<div><b${this.editable(`${key}Title`)}>${title}</b>${links.map((l, i) => html`<a href="${safeUrl(l.href)}"${/^https?:/i.test(l.href || '') ? html` target="_blank" rel="noopener"` : ''}${this.editable(`${key}.${i}.label`)}>${l.label}</a>`)}</div>` : '');
    return html`<footer class="o-foot"><div class="o-in">
      <div class="o-ftop">
        <div><a class="o-wm" href="#"${this.editable('brand')}>${p.brand}</a>
          <div class="o-soc">
            ${p.youtubeUrl ? html`<a href="${safeUrl(p.youtubeUrl)}" target="_blank" rel="noopener noreferrer" aria-label="YouTube">${svg('youtube')}</a>` : ''}
            ${p.instagramUrl ? html`<a href="${safeUrl(p.instagramUrl)}" target="_blank" rel="noopener noreferrer" aria-label="Instagram">${svg('instagram')}</a>` : ''}
          </div></div>
        ${p.ctaTitle || p.ctaLabel ? html`<div class="o-fcta"><b${this.editable('ctaTitle')}>${p.ctaTitle}</b>${p.ctaText ? html`<span${this.editable('ctaText')}>${p.ctaText}</span>` : ''}${this.button(p.ctaLabel, p.ctaHref, { attrs: this.editable('ctaLabel') })}</div>` : ''}
      </div>
      <div class="o-fcols">${col(p.col1Title, p.col1, 'col1')}${col(p.col2Title, p.col2, 'col2')}</div>
      <div class="o-fbot"><span${this.editable('bottomLeft')}>${p.bottomLeft}</span><span${this.editable('bottomRight')}>${p.bottomRight}</span></div>
      ${p.bigWord ? html`<div class="o-fbig" aria-hidden="true">${p.bigWord}</div>` : ''}
    </div></footer>`;
  }
}
