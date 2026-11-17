/**
 * Maps block types to Component classes. Pages are pure data; the registry
 * is what turns `{ type: "hero" }` into a Hero instance.
 *
 * Other projects can create their own registry with a different set of
 * components, or extend the default one with `register()`.
 */
export class ComponentRegistry {
  #components = new Map();

  register(ComponentClass) {
    const { type } = ComponentClass;
    if (!type || type === 'component') throw new Error(`${ComponentClass.name} needs a static type`);
    if (this.#components.has(type)) throw new Error(`Component type "${type}" is already registered`);
    this.#components.set(type, ComponentClass);
    return this;
  }

  has(type) {
    return this.#components.has(type);
  }

  get(type) {
    const ComponentClass = this.#components.get(type);
    if (!ComponentClass) throw new Error(`Unknown component type "${type}"`);
    return ComponentClass;
  }

  create(block, context) {
    const ComponentClass = this.get(block.type);
    return new ComponentClass(block, context);
  }

  /** Metadata for editors: [{ type, label, schema, defaults }] */
  describe() {
    return [...this.#components.values()].map((C) => ({
      type: C.type,
      label: C.label,
      schema: C.schema,
      defaults: C.defaults,
    }));
  }
}
