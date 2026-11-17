/**
 * Minimal method + path router. Patterns use ":name" segments:
 *   router.get('/api/pages/:slug', handler)  → handler(request, { slug })
 */
export class Router {
  #routes = [];

  get(pattern, handler) { return this.#add('GET', pattern, handler); }
  post(pattern, handler) { return this.#add('POST', pattern, handler); }
  put(pattern, handler) { return this.#add('PUT', pattern, handler); }

  /** @returns {{ handler: Function, params: object } | null} */
  match(method, pathname) {
    for (const route of this.#routes) {
      if (route.method !== method) continue;
      const found = route.regex.exec(pathname);
      if (found) return { handler: route.handler, params: { ...found.groups } };
    }
    return null;
  }

  #add(method, pattern, handler) {
    const source = pattern.replace(/\/:(\w+)/g, '/(?<$1>[^/]+)');
    this.#routes.push({ method, regex: new RegExp(`^${source}/?$`), handler });
    return this;
  }
}
