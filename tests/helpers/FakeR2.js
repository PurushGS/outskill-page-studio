/** In-memory stand-in for a Cloudflare R2 bucket (put/get with HTTP metadata). */
export class FakeR2 {
  #store = new Map();

  async put(key, value, { httpMetadata = {}, customMetadata = {} } = {}) {
    this.#store.set(key, { bytes: new Uint8Array(value), httpMetadata, customMetadata });
  }

  async get(key) {
    const entry = this.#store.get(key);
    if (!entry) return null;
    return { body: entry.bytes, httpMetadata: entry.httpMetadata, customMetadata: entry.customMetadata, httpEtag: `"${key.length}-${entry.bytes.length}"` };
  }

  keys() {
    return [...this.#store.keys()];
  }
}
