/**
 * Moments on the page worth sending to an analytics tool. LeadFormController
 * and browser.js call tracker.track() with these names; plug a real tool in
 * by writing a Tracker subclass (see Tracker.js).
 */
export const TrackingEvents = Object.freeze({
  PAGE_VIEWED: 'Landing Page Viewed',
  LEAD_SUBMITTED: 'Lead Form Submitted',
  MATERIAL_OPENED: 'Material Link Opened',
  WHATSAPP_CLICKED: 'WhatsApp Community Clicked',
});
