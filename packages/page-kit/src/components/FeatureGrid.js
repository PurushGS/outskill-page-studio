import { Component } from '../core/Component.js';
import { html } from '../core/html.js';
import { eyebrow } from '../core/ui.js';

export class FeatureGrid extends Component {
  static type = 'feature-grid';
  static label = 'Feature cards';
  static schema = [
    { key: 'eyebrow', label: 'Small label above title', kind: 'text' },
    { key: 'title', label: 'Title', kind: 'text' },
    { key: 'subtitle', label: 'Subtitle', kind: 'textarea' },
    {
      key: 'items',
      label: 'Cards',
      kind: 'list',
      itemSchema: [
        { key: 'icon', label: 'Icon', kind: 'icon' },
        { key: 'title', label: 'Title', kind: 'text' },
        { key: 'text', label: 'Description', kind: 'textarea' },
      ],
    },
  ];
  static defaults = {
    eyebrow: '',
    title: 'What you get',
    subtitle: '',
    items: [
      { icon: 'book', title: 'Step-by-step guide', text: 'Everything from the video, written out.' },
      { icon: 'code', title: 'Copy-ready prompts', text: 'Paste straight into your AI tool.' },
      { icon: 'whatsapp', title: 'Community', text: 'Learn with others on WhatsApp.' },
    ],
  };

  renderContent() {
    const { title, subtitle, items } = this.props;
    return html`<div class="pk-container">
      <div class="pk-section-head">${eyebrow(this.props.eyebrow, this.editable('eyebrow'))}<h2 class="pk-h2"${this.editable('title')}>${title}</h2>${subtitle ? html`<p class="pk-lead"${this.editable('subtitle')}>${subtitle}</p>` : ''}</div>
      <div class="pk-grid">${items.map(
        (item, i) => html`<article class="pk-card">
          <span class="pk-card__icon"${this.editable(`items.${i}.icon`)}>${this.icon(item.icon)}</span>
          <h3 class="pk-h3"${this.editable(`items.${i}.title`)}>${item.title}</h3>
          <p class="pk-muted"${this.editable(`items.${i}.text`)}>${item.text}</p>
        </article>`,
      )}</div>
    </div>`;
  }
}
