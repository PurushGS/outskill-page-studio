import { html } from '../../core/html.js';
import { ShowcaseBlock } from './ShowcaseBlock.js';

/**
 * A bar fixed to the bottom of the screen with the main button. It steps
 * aside while the hero, the application form or the footer is on screen,
 * since each has its own button. Its place in the block list doesn't matter.
 */
export class StickyBar extends ShowcaseBlock {
  static type = 'sc-dock';
  static label = 'Showcase · Sticky bottom bar';
  static schema = [
    { key: 'title', label: 'Title', kind: 'text' },
    { key: 'text', label: 'Text', kind: 'text' },
    { key: 'buttonLabel', label: 'Button text', kind: 'text' },
    { key: 'buttonHref', label: 'Button link', kind: 'url' },
    { key: 'note', label: 'Note next to the button (hidden on phones)', kind: 'text' },
  ];
  static defaults = {
    title: 'The Outskill AI Library',
    text: 'New resources every day · 763 AI tools',
    buttonLabel: 'Get free access',
    buttonHref: '#join',
    note: 'Free forever',
  };

  renderContent() {
    const p = this.props;
    return html`<div class="o-dock away" data-dock><div class="o-in">
      <div class="o-dk-t"><b${this.editable('title')}>${p.title}</b>${p.text ? html`<span${this.editable('text')}>${p.text}</span>` : ''}</div>
      <div class="o-dk-r">${this.button(p.buttonLabel, p.buttonHref, { attrs: this.editable('buttonLabel') })}${p.note ? html`<span class="o-dk-p"${this.editable('note')}>${p.note}</span>` : ''}</div>
    </div></div>`;
  }
}
