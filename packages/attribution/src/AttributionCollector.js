/**
 * Browser side: gathers where this visit came from and remembers the very
 * first visit (first touch), so a person who found us on YouTube and signs
 * up days later from Instagram is credited to both.
 */
export class AttributionCollector {
  static VISITOR_KEY = 'pk.visitor';
  static FIRST_TOUCH_KEY = 'pk.firstTouch';

  constructor({ location = window.location, documentRef = document, storage = safeStorage() } = {}) {
    this.location = location;
    this.document = documentRef;
    this.storage = storage;
  }

  /** Anonymous, random, per-browser id. Lets reports count unique visitors without personal data. */
  visitorId() {
    let id = this.storage.get(AttributionCollector.VISITOR_KEY);
    if (!id) {
      id = crypto.randomUUID();
      this.storage.set(AttributionCollector.VISITOR_KEY, id);
    }
    return id;
  }

  /** Current visit, plus the stored first visit (recorded now if this is it). */
  collect() {
    const current = {
      params: Object.fromEntries(new URLSearchParams(this.location.search)),
      referrer: this.document.referrer,
      landingUrl: this.location.origin + this.location.pathname + this.location.search,
    };
    let firstTouch = this.#readFirstTouch();
    if (!firstTouch) {
      firstTouch = { params: current.params, referrer: current.referrer, at: new Date().toISOString() };
      this.storage.set(AttributionCollector.FIRST_TOUCH_KEY, JSON.stringify(firstTouch));
    }
    return { ...current, firstTouch };
  }

  #readFirstTouch() {
    try {
      return JSON.parse(this.storage.get(AttributionCollector.FIRST_TOUCH_KEY) || 'null');
    } catch {
      return null;
    }
  }
}

/** localStorage can be blocked (private mode, strict settings); fall back to memory for this page view. */
function safeStorage() {
  const memory = new Map();
  return {
    get(key) {
      try { return localStorage.getItem(key); } catch { return memory.get(key) ?? null; }
    },
    set(key, value) {
      try { localStorage.setItem(key, value); } catch { memory.set(key, value); }
    },
  };
}
