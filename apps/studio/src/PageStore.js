/**
 * Holds the page being edited and its undo history.
 *
 * Events (listen with store.addEventListener):
 *   "change"     any edit, the preview re-renders
 *   "structure"  something panels must redraw for (page loaded, undo, block moved, list item added)
 *   "dirty"      unsaved-changes flag flipped
 */
export class PageStore extends EventTarget {
  #page = null;
  #history = [];
  #dirty = false;
  #savedJson = '';
  #isDraft = false;
  #lastEditedPath = null;
  static HISTORY_LIMIT = 100;

  get page() {
    return this.#page;
  }

  get isDirty() {
    return this.#dirty;
  }

  /** A new page that has never been published (no slug claimed, no form URL yet). */
  get isDraft() {
    return this.#isDraft;
  }

  get canUndo() {
    return this.#history.length > 0;
  }

  load(page, { draft = false } = {}) {
    this.#page = structuredClone(page);
    this.#history = [];
    this.#isDraft = draft;
    // A draft has never been published, so it counts as unsaved from the start.
    this.#savedJson = draft ? null : JSON.stringify(this.#page);
    this.#setDirty(draft);
    this.#emit('structure');
    this.#emit('change');
  }

  /** Read a nested value: get(['blocks', 0, 'props', 'title']) */
  get(path) {
    return path.reduce((node, key) => node?.[key], this.#page);
  }

  /**
   * Write a nested value. Typing in a text box fires this on every key, so
   * consecutive edits of the same field are merged into one undo step.
   */
  set(path, value, { structural = false } = {}) {
    const pathKey = path.join('.');
    if (this.#lastEditedPath !== pathKey || structural) this.#remember();
    this.#lastEditedPath = structural ? null : pathKey;
    const parent = path.slice(0, -1).reduce((node, key) => node[key], this.#page);
    parent[path.at(-1)] = value;
    this.#afterEdit(structural);
  }

  /**
   * Several values written as one edit, e.g. a campaign name that also fills
   * in the campaign ID and page slug. Repeated calls for the same set of
   * paths (typing) merge into one undo step, just like set().
   */
  setMany(entries) {
    const groupKey = entries.map(([path]) => path.join('.')).join('|');
    if (this.#lastEditedPath !== groupKey) this.#remember();
    this.#lastEditedPath = groupKey;
    for (const [path, value] of entries) {
      const parent = path.slice(0, -1).reduce((node, key) => node[key], this.#page);
      parent[path.at(-1)] = value;
    }
    this.#afterEdit(false);
  }

  /** Arbitrary change (move block, add list item...). Always one undo step and a panel redraw. */
  mutate(fn) {
    this.#remember();
    this.#lastEditedPath = null;
    fn(this.#page);
    this.#afterEdit(true);
  }

  undo() {
    if (!this.canUndo) return;
    this.#page = this.#history.pop();
    this.#lastEditedPath = null;
    this.#afterEdit(true);
  }

  markSaved() {
    this.#savedJson = JSON.stringify(this.#page);
    this.#setDirty(false);
  }

  #remember() {
    this.#history.push(structuredClone(this.#page));
    if (this.#history.length > PageStore.HISTORY_LIMIT) this.#history.shift();
  }

  #afterEdit(structural) {
    // "Unsaved" means different from what was last loaded or published, so undoing back to it clears the flag.
    this.#setDirty(JSON.stringify(this.#page) !== this.#savedJson);
    if (structural) this.#emit('structure');
    this.#emit('change');
  }

  #setDirty(value) {
    if (this.#dirty === value) return;
    this.#dirty = value;
    this.#emit('dirty');
  }

  #emit(type) {
    this.dispatchEvent(new Event(type));
  }
}
