import { LeadFormController } from './LeadFormController.js';
import { HttpLeadTransport, PreviewLeadTransport } from './LeadTransport.js';
import { NullTracker } from './tracking/Tracker.js';
import { TrackingEvents } from './tracking/TrackingEvents.js';
import { AttributionCollector } from '../../attribution/src/AttributionCollector.js';

/**
 * Entry point PageRenderer adds to every page.
 * @param {{ slug: string, mode: 'live'|'preview', endpoint: string }} config
 */
export function bootLeadFlow(config) {
  const isPreview = config.mode === 'preview';
  const tracker = createTracker(config);
  const attribution = new AttributionCollector();
  const transport = isPreview
    ? new PreviewLeadTransport()
    : new HttpLeadTransport({ endpoint: config.endpoint, slug: config.slug });

  tracker.track(TrackingEvents.PAGE_VIEWED, { slug: config.slug });

  for (const form of document.querySelectorAll('[data-lead-form]')) {
    new LeadFormController({
      form,
      successPanel: form.parentElement.querySelector('[data-lead-success]'),
      transport,
      tracker,
      attribution,
    }).start();
  }
  bindPageControls();
}

/** The one place to plug in an analytics tool (see tracking/Tracker.js). */
function createTracker(_config) {
  return new NullTracker();
}

/** Small page behaviours used by several blocks: Copy Link buttons and carousel arrows. */
function bindPageControls() {
  document.addEventListener('click', async (event) => {
    const copy = event.target.closest('[data-copy-link]');
    if (copy) {
      const label = copy.querySelector('span');
      const original = label?.textContent;
      try {
        await navigator.clipboard.writeText(location.href);
        if (label) label.textContent = 'Link copied';
      } catch {
        if (label) label.textContent = 'Copy from the address bar';
      }
      setTimeout(() => { if (label) label.textContent = original; }, 2000);
    }

    const arrow = event.target.closest('[data-scroll-row]');
    if (arrow) {
      const track = arrow.closest('.pk-block').querySelector('[data-scroll-track]');
      track.scrollBy({ left: Number(arrow.dataset.scrollRow) * track.clientWidth * 0.8, behavior: 'smooth' });
    }
  });
}
