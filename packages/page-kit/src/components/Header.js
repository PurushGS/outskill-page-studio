import { Component } from '../core/Component.js';
import { html, safeUrl } from '../core/html.js';
import { button } from '../core/ui.js';

export class Header extends Component {
  static type = 'header';
  static label = 'Header';
  static schema = [
    { key: 'brand', label: 'Brand name', kind: 'text' },
    { key: 'brandIcon', label: 'Brand icon', kind: 'icon' },
    {
      key: 'links',
      label: 'Menu links',
      kind: 'list',
      itemSchema: [
        { key: 'label', label: 'Label', kind: 'text' },
        { key: 'href', label: 'Link', kind: 'url' },
      ],
    },
    { key: 'ctaLabel', label: 'Button text', kind: 'text' },
    { key: 'ctaHref', label: 'Button link', kind: 'url' },
  ];
  static defaults = { brand: 'Brand', brandIcon: 'sparkles', links: [], ctaLabel: 'Get access', ctaHref: '#join' };

  renderContent() {
    const { brand, brandIcon, links, ctaLabel, ctaHref } = this.props;
    return html`<div class="pk-container pk-header__bar">
      <a class="pk-header__brand" href="#"><span${this.editable('brandIcon')}>${this.icon(brandIcon, 'pk-icon pk-header__logo')}</span><span${this.editable('brand')}>${brand}</span></a>
      <nav class="pk-header__nav" aria-label="Main">${links.map((l, i) => html`<a href="${safeUrl(l.href)}"${this.editable(`links.${i}.label`)}>${l.label}</a>`)}</nav>
      ${button({ label: ctaLabel, href: ctaHref, variant: 'primary', attrs: this.editable('ctaLabel') })}
    </div>`;
  }
}
