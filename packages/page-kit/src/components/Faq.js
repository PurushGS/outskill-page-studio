import { Component } from '../core/Component.js';
import { html } from '../core/html.js';
import { eyebrow } from '../core/ui.js';

export class Faq extends Component {
  static type = 'faq';
  static label = 'FAQ';
  static schema = [
    { key: 'eyebrow', label: 'Small label above title', kind: 'text' },
    { key: 'title', label: 'Title', kind: 'text' },
    {
      key: 'items',
      label: 'Questions',
      kind: 'list',
      itemSchema: [
        { key: 'question', label: 'Question', kind: 'text' },
        { key: 'answer', label: 'Answer', kind: 'textarea' },
      ],
    },
  ];
  static defaults = {
    eyebrow: 'Common questions',
    title: 'Questions',
    items: [
      { question: 'Is it really free?', answer: 'Yes. Sign up once and everything is yours.' },
      { question: 'How do I get the material?', answer: 'Right after you sign up, on this page and on your email.' },
    ],
  };

  renderContent() {
    const { title, items } = this.props;
    return html`<div class="pk-container pk-faq__layout">
      <div>${eyebrow(this.props.eyebrow, this.editable('eyebrow'))}<h2 class="pk-h2"${this.editable('title')}>${title}</h2></div>
      <div class="pk-faq__list">${items.map(
        (item, i) => html`<details class="pk-faq__item"><summary><span${this.editable(`items.${i}.question`)}>${item.question}</span><span class="pk-faq__toggle" aria-hidden="true">+</span></summary><p class="pk-muted"${this.editable(`items.${i}.answer`)}>${item.answer}</p></details>`,
      )}</div>
    </div>`;
  }
}
