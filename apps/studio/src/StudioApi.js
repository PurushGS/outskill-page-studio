/** Talks to the Worker. The studio token is kept in this browser only. */
export class StudioApi {
  static TOKEN_KEY = 'studio.token';

  get token() {
    try {
      return localStorage.getItem(StudioApi.TOKEN_KEY) || '';
    } catch {
      return '';
    }
  }

  set token(value) {
    try {
      localStorage.setItem(StudioApi.TOKEN_KEY, value);
    } catch {
      /* private mode: token lives for this tab only */
    }
    this.sessionToken = value;
  }

  /**
   * The studio link handed to editors looks like /studio#token=abc. Opening it
   * once stores the token in this browser and removes it from the address bar,
   * so the editor never has to deal with a password. The part after # is never
   * sent to the server or written to its logs.
   */
  adoptTokenFromLink() {
    const token = new URLSearchParams(location.hash.slice(1)).get('token');
    if (!token) return;
    this.token = token;
    history.replaceState(null, '', location.pathname + location.search);
  }

  listPages() {
    return this.#request('GET', '/api/pages').then((body) => body.pages);
  }

  getPage(slug) {
    return this.#request('GET', `/api/pages/${slug}`);
  }

  getTemplate(slug) {
    return this.#request('GET', `/api/templates/${slug}`);
  }

  /** First publish of a draft: the server makes the page link from the campaign name and claims it. */
  createPage(page) {
    return this.#request('POST', '/api/pages', page);
  }

  savePage(page) {
    return this.#request('PUT', `/api/pages/${page.slug}`, page);
  }

  async #request(method, path, body) {
    const response = await fetch(path, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.sessionToken || this.token}`,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(data.error || `Request failed (${response.status})`);
      error.details = data.details;
      error.status = response.status;
      throw error;
    }
    return data;
  }
}
