import { el } from '../dom.js';

/**
 * Base for the sidebar panels. A panel owns one root element and redraws
 * itself from the store whenever the page structure changes. Plain text
 * edits do not redraw panels, so the field being typed in keeps focus.
 */
export class Panel {
  constructor(store) {
    this.store = store;
    this.root = el('div', { class: 'panel' });
    store.addEventListener('structure', () => this.refresh());
  }

  refresh() {
    if (!this.store.page) return;
    this.root.replaceChildren(...[this.render()].flat(Infinity).filter(Boolean));
  }

  /** @returns {Node | Node[]} */
  render() {
    throw new Error(`${this.constructor.name} must implement render()`);
  }
}

/** A labelled form row used by every panel. */
export function field(label, control, hint) {
  return el('label', { class: 'field' }, el('span', { class: 'field__label' }, label), control, hint ? el('small', { class: 'field__hint' }, hint) : null);
}
