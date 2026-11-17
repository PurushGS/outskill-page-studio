import { Component } from '../core/Component.js';
import { html } from '../core/html.js';
import { eyebrow } from '../core/ui.js';

/** "Step 01 · Before You Start": a short bullet list of what people need first. */
export class Checklist extends Component {
  static type = 'checklist';
  static label = 'Checklist';
  static schema = [
    { key: 'eyebrow', label: 'Small label above title', kind: 'text' },
    { key: 'title', label: 'Title', kind: 'text' },
    { key: 'items', label: 'Points', kind: 'list', itemSchema: [{ key: 'text', label: 'Point', kind: 'textarea' }] },
  ];
  static defaults = {
    eyebrow: 'Step 01',
    title: 'Before You Start',
    items: [{ text: 'A free account on the tool used in the video.' }, { text: 'About 20 minutes.' }],
  };

  renderContent() {
    const { title, items } = this.props;
    return html`<div class="pk-container pk-narrow">
      ${eyebrow(this.props.eyebrow, this.editable('eyebrow'))}
      <h2 class="pk-h2"${this.editable('title')}>${title}</h2>
      <ul class="pk-checklist">${items.map((item, i) => html`<li${this.editable(`items.${i}.text`)}>${item.text}</li>`)}</ul>
    </div>`;
  }
}
