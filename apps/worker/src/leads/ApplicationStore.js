/**
 * ┌──────────────────────────────────────────────────────────────────────┐
 * │  ENGINEERING HOOK: connect application submissions to our database. │
 * └──────────────────────────────────────────────────────────────────────┘
 *
 * Every valid application from every page arrives here as one Application
 * object (shape below). Saving it into the existing application-form table
 * is the only thing left to build.
 *
 * Two ways to connect:
 *   A. No code: expose an endpoint on our backend and set the Worker
 *      settings APPLICATIONS_ENDPOINT (+ secret APPLICATIONS_API_KEY).
 *      HttpApplicationStore then POSTs each Application to it as JSON.
 *   B. Write a class with the same save() method (e.g. talking to the DB
 *      through Hyperdrive) and return it from createApplicationStore() in app.js.
 *
 * Until either is done, NotConnectedApplicationStore is used: visitors still
 * see the success screen, but applications are NOT saved.
 *
 * save() rules:
 *   - resolve when the application is safely stored
 *   - throw if it wasn't: the visitor then sees "please try again", so nothing is lost silently
 *   - applicationId is unique per submission; use it to make retries idempotent
 *   - the same person can apply twice (refresh, second campaign): dedupe on
 *     applicant.email + form.id in our DB if needed
 *
 * @typedef {object} Application
 * @property {string} applicationId           UUID generated per submission
 * @property {string} submittedAt             ISO 8601, UTC
 * @property {object} form
 * @property {string} form.id                 e.g. "YT-7KQ2MD": unique per page, prefix = format code
 * @property {string} form.slug               page path, e.g. "ai-jobs-x"
 * @property {string} form.format             youtube | instagram | x | linkedin | facebook | whatsapp
 * @property {string} form.campaignId         e.g. "ai-jobs-nov-2026"
 * @property {string} form.campaignName       e.g. "AI Jobs guide · Nov 2026" (as set in the studio at submit time)
 * @property {object} applicant
 * @property {string} applicant.name
 * @property {string} applicant.email         lower-cased
 * @property {string} applicant.phone         E.164, e.g. "+919876543210"
 * @property {string} applicant.country       ISO code of the phone number, e.g. "IN"
 * @property {string} applicant.role          "" if the page doesn't ask
 * @property {boolean} applicant.whatsappOptIn
 * @property {object} attribution             the visit that converted (last touch)
 * @property {string} attribution.source      utm_source → src → referring channel → referring domain → "direct"
 * @property {string} [attribution.utmSource]
 * @property {string} [attribution.utmMedium]
 * @property {string} [attribution.utmCampaign]
 * @property {string} [attribution.utmContent]   which video / post / story
 * @property {string} [attribution.utmTerm]
 * @property {string} [attribution.src]
 * @property {string} [attribution.clickId]      e.g. "fbclid:abc", "gclid:xyz"
 * @property {string} [attribution.referrer]
 * @property {string} [attribution.landingUrl]
 * @property {object|null} attribution.firstTouch  first visit from this browser, possibly days earlier
 * @property {object} context
 * @property {string|null} context.visitorId  anonymous per-browser id
 * @property {string} context.device          mobile | tablet | desktop
 * @property {string} context.os              ios | android | windows | mac | linux | other
 * @property {string} context.geoCountry      from Cloudflare, not from the form
 * @property {string} context.geoRegion
 * @property {string} context.geoCity
 */
export class ApplicationStore {
  /** @param {Application} application */
  async save(application) { // eslint-disable-line no-unused-vars
    throw new Error(`${this.constructor.name} must implement save()`);
  }
}
