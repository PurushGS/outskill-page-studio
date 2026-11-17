import { html, raw, escapeHtml } from './html.js';

/**
 * Base class for every page block.
 *
 * A subclass declares:
 *   static type     unique id used in page JSON ("hero", "lead-form", ...)
 *   static label    human name shown in the studio
 *   static schema   list of editable fields; the studio builds its forms from this
 *   static defaults starting props for a freshly added block
 * and implements renderContent().
 *
 * Schema field kinds: text | textarea | url | icon | list (list has `itemSchema`).
 */
export class Component {
  static type = 'component';
  static label = 'Component';
  static schema = [];
  static defaults = {};

  /**
   * @param {object} block    { id, type, props } from the page JSON
   * @param {object} context  shared render context: { icons, page, mode }
   */
  constructor(block, context) {
    this.id = block.id;
    this.props = { ...this.constructor.defaults, ...(block.props || {}) };
    this.context = context;
  }

  /** Shortcut for icons so subclasses can write this.icon('sparkles'). */
  icon(name, className = 'pk-icon') {
    return this.context.icons.render(name, className);
  }

  /**
   * Marks an element as the visible output of a schema field, e.g.
   * html`<h2${this.editable('title')}>` or this.editable(`items.${i}.text`).
   * In the studio preview, clicking that element jumps to the matching
   * field. Live pages get nothing, so their HTML stays clean.
   */
  editable(path) {
    return this.context.mode === 'preview' ? raw(` data-field="${escapeHtml(path)}"`) : '';
  }

  /** Wraps the block in a section that the studio can target by id. */
  render() {
    const type = this.constructor.type;
    return html`<section class="pk-block pk-${type}" id="${this.id}" data-block-id="${this.id}" data-block-type="${type}">${this.renderContent()}</section>`;
  }

  renderContent() {
    throw new Error(`${this.constructor.name} must implement renderContent()`);
  }
}
