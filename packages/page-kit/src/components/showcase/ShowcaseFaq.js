import { html, safeUrl } from '../../core/html.js';
import { multiline } from '../../core/ui.js';
import { ShowcaseBlock, TONE_FIELD, svg } from './ShowcaseBlock.js';

/** Questions as rows with a +, and a YouTube card under the heading. */
export class ShowcaseFaq extends ShowcaseBlock {
  static type = 'sc-faq';
  static label = 'Showcase · FAQ';
  static tone = 'light';
  static schema = [
    TONE_FIELD,
    { key: 'eyebrow', label: 'Small label above title', kind: 'text' },
    { key: 'title', label: 'Title', kind: 'textarea' },
    { key: 'cardLabel', label: 'Card: small label (empty hides the card)', kind: 'text' },
    { key: 'cardTitle', label: 'Card: title', kind: 'text' },
    { key: 'cardText', label: 'Card: text', kind: 'textarea' },
    { key: 'cardButton', label: 'Card: button text', kind: 'text' },
    { key: 'cardUrl', label: 'Card: link', kind: 'url' },
    { key: 'items', label: 'Questions', kind: 'list', itemSchema: [{ key: 'question', label: 'Question', kind: 'text' }, { key: 'answer', label: 'Answer', kind: 'textarea' }] },
  ];
  static defaults = {
    tone: 'light',
    eyebrow: 'Common questions',
    title: 'Everything you’re\nwondering about',
    cardLabel: 'On YouTube',
    cardTitle: 'See every workflow built, live on screen',
    cardText: 'Each guide starts as a full breakdown on the Outskill channel. Watch it, then follow along here.',
    cardButton: 'Watch on YouTube',
    cardUrl: 'https://www.youtube.com/channel/UCNssyoLJiA2oB5xM7XjxmJA?sub_confirmation=1',
    items: [
      { question: 'Is the library really free?', answer: 'Yes. Every guide, prompt and template is free. You sign up once so we can send you new workflows as they go live.' },
      { question: 'What do I get after signing up?', answer: 'Instant access to every workflow from Outskill’s videos, each written out step by step with copy-ready prompts, plus the directory of AI tools sorted by what they do and what they cost.' },
      { question: 'How often are new resources added?', answer: 'Every day. New guides, prompts and workflows go live daily, including one for every new Outskill breakdown on YouTube.' },
      { question: 'Do I need to know how to code?', answer: 'No. Most guides need no code at all, and the ones that do walk you through every command with a Copy button.' },
    ],
  };

  renderContent() {
    const p = this.props;
    return html`<div class="o-in o-fq">
      <div>
        ${p.eyebrow ? html`<p class="o-lbl"${this.editable('eyebrow')}>${p.eyebrow}</p>` : ''}
        <h2 class="o-t2"${this.editable('title')}>${multiline(p.title)}</h2>
        ${p.cardLabel ? html`<a class="o-fqcard" href="${safeUrl(p.cardUrl)}" target="_blank" rel="noopener noreferrer">
          <span class="o-lbl"${this.editable('cardLabel')}>${p.cardLabel}</span><b${this.editable('cardTitle')}>${p.cardTitle}</b>
          <span${this.editable('cardText')}>${p.cardText}</span>${p.cardButton ? html`<span class="o-fqbtn"${this.editable('cardButton')}>${svg('play')}${p.cardButton}</span>` : ''}
        </a>` : ''}
      </div>
      <div>${p.items.map((q, i) => html`<details class="o-q"><summary><span${this.editable(`items.${i}.question`)}>${q.question}</span><b aria-hidden="true">+</b></summary><p${this.editable(`items.${i}.answer`)}>${q.answer}</p></details>`)}</div>
    </div>`;
  }
}
