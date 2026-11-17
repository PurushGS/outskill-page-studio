/**
 * Analytics interface used by the page. Nothing is tracked yet: NullTracker
 * is wired in by default.
 *
 * To add WebEngage (or any tool) later:
 *   1. class WebEngageTracker extends Tracker { identify(...) {...} track(...) {...} }
 *   2. return it from createTracker() in ../browser.js
 * No other file needs to change.
 */
export class Tracker {
  /** @param {string} userId  @param {object} attributes */
  identify(userId, attributes) {} // eslint-disable-line no-unused-vars

  /** @param {string} eventName  @param {object} data */
  track(eventName, data) {} // eslint-disable-line no-unused-vars
}

export class NullTracker extends Tracker {}
