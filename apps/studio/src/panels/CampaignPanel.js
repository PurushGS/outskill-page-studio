import { el } from '../dom.js';
import { Panel, field } from './Panel.js';
import { FieldEditor } from './FieldEditor.js';
import { findFormat } from '../../../../packages/attribution/src/formats.js';
import { buildTrackedLink, slugify } from '../../../../packages/attribution/src/attribution.js';

const RESOURCE_SCHEMA = [{
  key: 'resources',
  label: 'Resource links (shown after someone applies)',
  kind: 'list',
  itemSchema: [
    { key: 'label', label: 'Button text, e.g. Open the full guide', kind: 'text' },
    { key: 'url', label: 'Link (Google Drive, Notion, any https:// link)', kind: 'url' },
  ],
}];

/**
 * Everything about a page that isn't design: which campaign it belongs to,
 * its link, the application form's ID, what people get after applying,
 * and tracked links to share.
 */
export class CampaignPanel extends Panel {
  /**
   * @param {PageStore} store
   * @param {object} deps
   * @param {(message: string, tone?: string, link?: string) => void} deps.onStatus
   */
  constructor(store, { onStatus }) {
    super(store);
    this.onStatus = onStatus;
    this.fields = new FieldEditor(store, null);
  }

  render() {
    const { campaign } = this.store.page;
    const format = findFormat(campaign.format);
    return [
      el('div', { class: 'campaign-head' }, el('span', { class: 'format-badge' }, `${format.label} page`)),
      el('h3', { class: 'panel__title' }, 'Campaign'),
      this.#campaignFields(),
      el('h3', { class: 'panel__title' }, 'After someone applies'),
      this.fields.render(RESOURCE_SCHEMA, ['integrations']),
      this.#input(['integrations', 'whatsappCommunityUrl'], 'WhatsApp community invite link', 'e.g. https://chat.whatsapp.com/… Leave empty to hide the button'),
      el('h3', { class: 'panel__title' }, 'Sharing & SEO'),
      this.#input(['meta', 'title'], 'Page title', 'Browser tab and link previews on WhatsApp, X, LinkedIn'),
      this.#input(['meta', 'description'], 'Description'),
      this.#input(['meta', 'image'], 'Preview image URL', 'Optional. 1200×630 works best'),
      this.store.isDraft ? null : this.#trackedLinks(format),
    ];
  }

  /**
   * The page link is made from the campaign name when the page is first
   * published, then stays fixed. In a draft, the name also suggests the
   * campaign ID until that is edited by hand.
   */
  #campaignFields() {
    const { campaign, slug } = this.store.page;
    const draft = this.store.isDraft;
    let autoFillId = draft && !campaign.id;

    const pageLink = el('code', { class: 'page-link' });
    const showLink = (value) => { pageLink.textContent = `${location.host}/${value || '…'}`; };
    showLink(slug);

    const idInput = el('input', { class: 'input input--code', value: campaign.id, placeholder: 'e.g. ai-jobs-nov-2026', oninput: (e) => { autoFillId = false; this.store.set(['campaign', 'id'], e.target.value.toLowerCase()); } });
    const formIdInput = el('input', { class: 'input input--code', value: campaign.formId, placeholder: 'ID from our application-form system', oninput: (e) => this.store.set(['campaign', 'formId'], e.target.value.trim()) });
    const nameInput = el('input', {
      class: 'input',
      value: campaign.name,
      placeholder: 'e.g. AI Jobs guide · Nov 2026',
      oninput: (e) => {
        const entries = [[['campaign', 'name'], e.target.value]];
        if (autoFillId) entries.push([['campaign', 'id'], (idInput.value = slugify(e.target.value))]);
        if (draft) {
          entries.push([['slug'], slugify(e.target.value)]);
          showLink(slugify(e.target.value));
        }
        this.store.setMany(entries);
      },
    });

    return [
      field('Campaign name', nameInput, draft
        ? 'Saved with every application. The page link is made from it, so choose carefully: the link cannot change after publishing'
        : 'Saved with every application. Renaming does not change the page link, so shared links keep working'),
      field('Page link', pageLink),
      field('Form ID', formIdInput, 'Required. Every application from this page is saved under this form ID'),
      field('Campaign ID', idInput, 'Lowercase and dashes. Becomes utm_campaign in tracked links'),
    ];
  }

  #trackedLinks(format) {
    const { slug, campaign } = this.store.page;
    const output = el('code', { class: 'tracked-link' });
    const update = (content) => {
      output.textContent = buildTrackedLink({ baseUrl: location.origin, slug, format, campaignId: campaign.id, content });
    };
    const content = el('input', { class: 'input', placeholder: 'e.g. jobs-video-1 or story-nov-20', oninput: (e) => update(e.target.value) });
    update('');
    return [
      el('h3', { class: 'panel__title' }, 'Tracked link to share'),
      field(`Which ${format.label} video or post is this for? (optional)`, content, 'Use a different name per post to see which one brought the applications'),
      output,
      el('button', { type: 'button', class: 'btn btn--ghost btn--sm', onclick: () => this.#copy(output.textContent) }, 'Copy tracked link'),
    ];
  }

  async #copy(text) {
    try {
      await navigator.clipboard.writeText(text);
      this.onStatus('Copied:', 'ok', text);
    } catch {
      this.onStatus('Copy this link:', '', text);
    }
  }

  #input(path, label, hint) {
    return field(label, el('input', {
      class: 'input',
      value: this.store.get(path) ?? '',
      oninput: (e) => {
        this.#ensureParent(path);
        this.store.set(path, e.target.value);
      },
    }), hint);
  }

  /** Older page JSON may not have e.g. meta.image yet. */
  #ensureParent(path) {
    let node = this.store.page;
    for (const key of path.slice(0, -1)) node = node[key] ??= {};
  }
}
