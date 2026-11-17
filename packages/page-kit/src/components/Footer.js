import { Component } from '../core/Component.js';
import { html, safeUrl } from '../core/html.js';

export class Footer extends Component {
  static type = 'footer';
  static label = 'Footer';
  static schema = [
    { key: 'brand', label: 'Brand name', kind: 'text' },
    { key: 'note', label: 'Small print', kind: 'text' },
    {
      key: 'links',
      label: 'Links',
      kind: 'list',
      itemSchema: [
        { key: 'label', label: 'Label', kind: 'text' },
        { key: 'href', label: 'Link', kind: 'url' },
      ],
    },
  ];
  static defaults = { brand: 'Brand', note: '', links: [] };

  renderContent() {
    const { brand, note, links } = this.props;
    return html`<div class="pk-container pk-footer__bar">
      <strong class="pk-footer__brand"${this.editable('brand')}>${brand}</strong>
      <nav class="pk-footer__links">${links.map((l, i) => html`<a href="${safeUrl(l.href)}"${this.editable(`links.${i}.label`)}>${l.label}</a>`)}</nav>
      ${note ? html`<small class="pk-muted"${this.editable('note')}>${note}</small>` : ''}
    </div>`;
  }
}
