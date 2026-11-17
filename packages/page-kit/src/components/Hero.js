import { Component } from '../core/Component.js';
import { html } from '../core/html.js';
import { button, eyebrow, multiline } from '../core/ui.js';

export class Hero extends Component {
  static type = 'hero';
  static label = 'Hero';
  static schema = [
    { key: 'eyebrow', label: 'Small label above title', kind: 'text' },
    { key: 'title', label: 'Title', kind: 'textarea' },
    { key: 'subtitle', label: 'Subtitle', kind: 'textarea' },
    { key: 'ctaLabel', label: 'Button text', kind: 'text' },
    { key: 'ctaHref', label: 'Button link', kind: 'url' },
    {
      key: 'stats',
      label: 'Highlights',
      kind: 'list',
      itemSchema: [
        { key: 'value', label: 'Value', kind: 'text' },
        { key: 'label', label: 'Label', kind: 'text' },
      ],
    },
  ];
  static defaults = {
    eyebrow: 'Free',
    title: 'Your headline',
    subtitle: 'One line on what people get.',
    ctaLabel: 'Get started',
    ctaHref: '#join',
    stats: [],
  };

  renderContent() {
    const { title, subtitle, ctaLabel, ctaHref, stats } = this.props;
    return html`<div class="pk-container pk-hero__inner">
      ${eyebrow(this.props.eyebrow, this.editable('eyebrow'))}
      <h1 class="pk-hero__title"${this.editable('title')}>${multiline(title)}</h1>
      ${subtitle ? html`<p class="pk-lead"${this.editable('subtitle')}>${subtitle}</p>` : ''}
      <div class="pk-hero__actions">${button({ label: ctaLabel, href: ctaHref, icon: this.icon('arrowRight'), attrs: this.editable('ctaLabel') })}</div>
      ${stats.length
        ? html`<ul class="pk-hero__stats">${stats.map((s, i) => html`<li><b${this.editable(`stats.${i}.value`)}>${s.value}</b><span${this.editable(`stats.${i}.label`)}>${s.label}</span></li>`)}</ul>`
        : ''}
    </div>`;
  }
}
