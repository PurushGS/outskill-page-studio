import { el } from '../dom.js';

/**
 * A button showing the current icon; clicking it opens a searchable grid of
 * every icon in the IconLibrary.
 */
export class IconPicker {
  constructor(icons, value, onChange) {
    this.icons = icons;
    this.value = value;
    this.onChange = onChange;
  }

  render() {
    this.preview = el('span', { class: 'icon-picker__current', html: this.#svg(this.value) });
    this.label = el('span', {}, this.value || 'none');
    this.grid = el('div', { class: 'icon-picker__grid' });
    this.popover = el('div', { class: 'icon-picker__pop', hidden: true },
      el('input', { type: 'search', placeholder: 'Search icons', class: 'input', oninput: (e) => this.#fillGrid(e.target.value) }),
      this.grid,
    );
    const toggle = el('button', { type: 'button', class: 'icon-picker__btn', onclick: () => { this.popover.hidden = !this.popover.hidden; } }, this.preview, this.label);
    this.#fillGrid('');
    return el('div', { class: 'icon-picker' }, toggle, this.popover);
  }

  #pick(name) {
    this.value = name;
    this.preview.innerHTML = this.#svg(name);
    this.label.textContent = name;
    this.popover.hidden = true;
    this.#fillGrid('');
    this.onChange(name);
  }

  #fillGrid(query) {
    const q = query.trim().toLowerCase();
    const names = this.icons.names().filter((n) => n.toLowerCase().includes(q));
    this.grid.replaceChildren(...names.map((name) => el('button', {
      type: 'button',
      class: `icon-picker__item${name === this.value ? ' is-active' : ''}`,
      title: name,
      'aria-label': name,
      html: this.#svg(name),
      onclick: () => this.#pick(name),
    })));
  }

  #svg(name) {
    return this.icons.render(name, 'pk-icon').toString();
  }
}
