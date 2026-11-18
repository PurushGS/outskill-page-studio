import { el } from '../dom.js';
import { field } from './Panel.js';
import { IconPicker } from './IconPicker.js';

/**
 * Builds form controls from a component's static schema. Adding a new
 * component to page-kit therefore needs no studio changes at all.
 */
export class FieldEditor {
  /**
   * @param {PageStore} store
   * @param {IconLibrary} icons
   */
  constructor(store, icons) {
    this.store = store;
    this.icons = icons;
  }

  /** @param {Array} schema  @param {Array} basePath  e.g. ['blocks', 2, 'props'] */
  render(schema, basePath) {
    return schema.map((spec) => {
      const path = [...basePath, spec.key];
      const node = this.#control(spec, path);
      // Lets the studio find this control when its text is clicked in the preview.
      node.dataset.path = path.join('.');
      return node;
    });
  }

  #control(spec, path) {
    const value = this.store.get(path) ?? '';
    const set = (v) => this.store.set(path, v);

    switch (spec.kind) {
      case 'textarea':
        return field(spec.label, el('textarea', { class: 'input', rows: 3, value, oninput: (e) => set(e.target.value) }));
      case 'url':
        return field(spec.label, el('input', { class: 'input', type: 'text', inputmode: 'url', value, placeholder: 'https://… or #section', oninput: (e) => set(e.target.value) }));
      case 'icon':
        return field(spec.label, new IconPicker(this.icons, value, set).render());
      case 'choice':
        return field(spec.label, el('select', { class: 'input', onchange: (e) => set(e.target.value) },
          spec.options.map((o) => el('option', { value: o.value, selected: o.value === (value || spec.options[0].value) }, o.label))));
      case 'list':
        return this.#list(spec, path);
      default:
        return field(spec.label, el('input', { class: 'input', type: 'text', value, oninput: (e) => set(e.target.value) }));
    }
  }

  #list(spec, path) {
    const items = this.store.get(path) || [];
    // Structural edits go through mutate() so they are one undo step and redraw the panel.
    const editList = (fn) => this.store.mutate((page) => {
      const parent = path.slice(0, -1).reduce((node, key) => node[key], page);
      parent[path.at(-1)] ??= [];
      fn(parent[path.at(-1)]);
    });
    const move = (from, to) => editList((list) => list.splice(to, 0, ...list.splice(from, 1)));
    const blankItem = () => Object.fromEntries(spec.itemSchema.map((s) => [s.key, s.kind === 'icon' ? 'sparkles' : s.kind === 'choice' ? s.options[0].value : '']));

    return el('fieldset', { class: 'list-field' },
      el('legend', {}, `${spec.label} (${items.length})`),
      items.map((_, i) => el('div', { class: 'list-field__item' },
        el('div', { class: 'list-field__bar' },
          el('span', {}, `#${i + 1}`),
          el('button', { type: 'button', class: 'icon-btn', title: 'Move up', disabled: i === 0, onclick: () => move(i, i - 1) }, '↑'),
          el('button', { type: 'button', class: 'icon-btn', title: 'Move down', disabled: i === items.length - 1, onclick: () => move(i, i + 1) }, '↓'),
          el('button', { type: 'button', class: 'icon-btn icon-btn--danger', title: 'Remove', onclick: () => editList((list) => list.splice(i, 1)) }, '✕'),
        ),
        this.render(spec.itemSchema, [...path, i]),
      )),
      el('button', { type: 'button', class: 'btn btn--ghost btn--sm', onclick: () => editList((list) => list.push(blankItem())) }, '+ Add item'),
    );
  }
}
