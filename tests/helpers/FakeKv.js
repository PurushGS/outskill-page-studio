/** In-memory stand-in for a Cloudflare KV namespace (get/put/list with metadata). */
export class FakeKv {
  #store = new Map();

  async get(key, type) {
    const entry = this.#store.get(key);
    if (!entry) return null;
    return type === 'json' ? JSON.parse(entry.value) : entry.value;
  }

  async put(key, value, { metadata } = {}) {
    this.#store.set(key, { value, metadata });
  }

  async list({ prefix = '' } = {}) {
    const keys = [...this.#store]
      .filter(([name]) => name.startsWith(prefix))
      .map(([name, { metadata }]) => ({ name, metadata }));
    return { keys, list_complete: true };
  }
}
