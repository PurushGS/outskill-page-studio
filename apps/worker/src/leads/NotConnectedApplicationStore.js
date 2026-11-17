import { ApplicationStore } from './ApplicationStore.js';

/**
 * Used until engineering connects the real store (see ApplicationStore.js).
 * Keeps pages working, but saves nothing. It logs a warning with the form and
 * campaign only, never the applicant's personal details, so it's visible in
 * Worker logs that applications are arriving and not being stored.
 */
export class NotConnectedApplicationStore extends ApplicationStore {
  constructor(log = console) {
    super();
    this.log = log;
  }

  async save(application) {
    this.log.warn('Application NOT saved: no ApplicationStore connected', {
      applicationId: application.applicationId,
      formId: application.form.id,
      campaignId: application.form.campaignId,
      source: application.attribution.source,
    });
  }
}
