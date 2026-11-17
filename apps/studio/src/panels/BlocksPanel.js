import { el } from '../dom.js';
import { Panel } from './Panel.js';
import { FieldEditor } from './FieldEditor.js';

/** The inline application form: on every page, exactly once. */
const REQUIRED_BLOCK = 'lead-form';

/**
 * The list of blocks on the page (reorder, hide) and, below it, the fields
 * of whichever block is selected.
 */
export class BlocksPanel extends Panel {
  /**
   * @param {PageStore} store
   * @param {object} deps
   * @param {ComponentRegistry} deps.registry
   * @param {IconLibrary} deps.icons
   * @param {(blockId: string) => void} deps.onSelect
   */
  constructor(store, { registry, icons, onSelect }) {
    super(store);
    this.registry = registry;
    this.fieldEditor = new FieldEditor(store, icons);
    this.onSelect = onSelect;
    this.selectedId = null;
  }

  /**
   * @param {string} blockId
   * @param {string|null} [fieldPath]  e.g. "items.2.title": focus that exact control
   */
  select(blockId, fieldPath = null) {
    this.selectedId = blockId;
    this.refresh();
    this.onSelect(blockId);
    this.#reveal(fieldPath);
  }

  /** Brings the editor (or one field in it) into view, so a click in the preview visibly does something. */
  #reveal(fieldPath) {
    const index = this.store.page.blocks.findIndex((b) => b.id === this.selectedId);
    const target = (fieldPath && this.root.querySelector(`[data-path="${CSS.escape(`blocks.${index}.props.${fieldPath}`)}"]`))
      || this.root.querySelector('.block-editor');
    if (!target) return;
    target.scrollIntoView({ behavior: 'smooth', block: fieldPath ? 'center' : 'start' });
    target.classList.remove('is-flashing');
    void target.offsetWidth; // restart the animation if the same field is clicked twice
    target.classList.add('is-flashing');
    target.querySelector('input:not([type="search"]), textarea, select, button')?.focus({ preventScroll: true });
  }

  render() {
    const blocks = this.store.page.blocks;
    if (!blocks.some((b) => b.id === this.selectedId)) this.selectedId = blocks[0]?.id ?? null;
    const index = blocks.findIndex((b) => b.id === this.selectedId);

    return [
      el('h3', { class: 'panel__title' }, 'Sections on this page'),
      el('ol', { class: 'block-list' }, blocks.map((block, i) => this.#blockRow(block, i, blocks.length))),
      this.#addSection(),
      el('p', { class: 'hint' }, 'Tip: click any text or icon in the preview to jump to it here. Removed something by mistake? Press Undo (⌘Z).'),
      index >= 0 ? this.#editor(blocks[index], index) : null,
    ];
  }

  #blockRow(block, i, count) {
    const label = this.registry.get(block.type).label;
    const move = (to) => this.store.mutate((page) => page.blocks.splice(to, 0, ...page.blocks.splice(i, 1)));
    return el('li', { class: `block-list__item${block.id === this.selectedId ? ' is-selected' : ''}` },
      el('button', { type: 'button', class: 'block-list__name', onclick: () => this.select(block.id) },
        el('b', {}, label), el('small', {}, block.id)),
      el('button', { type: 'button', class: 'icon-btn', title: 'Move up', 'aria-label': `Move ${label} up`, disabled: i === 0, onclick: () => move(i - 1) }, '↑'),
      el('button', { type: 'button', class: 'icon-btn', title: 'Move down', 'aria-label': `Move ${label} down`, disabled: i === count - 1, onclick: () => move(i + 1) }, '↓'),
      this.#removeButton(block, i, label),
    );
  }

  /** Every page must keep its application form, so that one block can be moved but not removed. */
  #removeButton(block, i, label) {
    const required = block.type === REQUIRED_BLOCK;
    return el('button', {
      type: 'button',
      class: 'icon-btn icon-btn--danger',
      title: required ? 'Every page keeps its application form' : 'Remove section',
      'aria-label': required ? `${label} cannot be removed` : `Remove ${label}`,
      disabled: required,
      onclick: () => this.store.mutate((page) => page.blocks.splice(i, 1)),
    }, required ? '🔒' : '✕');
  }

  /** A picker of every registered block type; new sections start from the component's defaults. */
  #addSection() {
    // The application form is already on every page (one per page), so it is never offered here.
    const addable = this.registry.describe().filter((d) => d.type !== REQUIRED_BLOCK);
    const select = el('select', { class: 'input', 'aria-label': 'Section type to add' },
      addable.map(({ type, label }) => el('option', { value: type }, label)),
    );

    const add = () => {
      const { type, defaults } = addable.find((d) => d.type === select.value);
      const id = this.#uniqueId(type);
      const at = Math.max(this.store.page.blocks.findIndex((b) => b.id === this.selectedId) + 1, 0);
      this.store.mutate((page) => page.blocks.splice(at, 0, { id, type, props: structuredClone(defaults) }));
      this.select(id);
    };
    return el('div', { class: 'add-section' }, select, el('button', { type: 'button', class: 'btn btn--ghost', onclick: add }, '+ Add section'));
  }

  #uniqueId(type) {
    const taken = new Set(this.store.page.blocks.map((b) => b.id));
    let n = 1;
    while (taken.has(`${type}-${n}`)) n++;
    return `${type}-${n}`;
  }

  #editor(block, index) {
    const { label, schema } = this.registry.get(block.type);
    return el('div', { class: 'block-editor' },
      el('h3', { class: 'panel__title' }, `Editing: ${label}`),
      this.fieldEditor.render(schema, ['blocks', index, 'props']),
    );
  }
}
