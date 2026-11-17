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
      el('div', { class: 'campaign-head' },
        el('span', { class: 'format-badge' }, `${format.label} page`),
        el('span', { class: 'form-id' }, 'Form ID ', el('code', {}, campaign.formId || 'given on first Publish')),
      ),
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

  /** In a draft, typing the campaign name also suggests the campaign ID and page link until those are edited by hand. */
  #campaignFields() {
    const { campaign, slug } = this.store.page;
    const draft = this.store.isDraft;
    const autoFill = { id: draft && !campaign.id, slug: draft && !slug };

    const idInput = el('input', { class: 'input input--code', value: campaign.id, placeholder: 'e.g. ai-jobs-nov-2026', oninput: (e) => { autoFill.id = false; this.store.set(['campaign', 'id'], e.target.value.toLowerCase()); } });
    const slugInput = el('input', { class: 'input input--code', value: slug, placeholder: 'e.g. ai-jobs', readonly: !draft, oninput: (e) => { autoFill.slug = false; this.store.set(['slug'], e.target.value.toLowerCase()); } });
    const nameInput = el('input', {
      class: 'input',
      value: campaign.name,
      placeholder: 'e.g. AI Jobs guide · Nov 2026',
      oninput: (e) => {
        const entries = [[['campaign', 'name'], e.target.value]];
        if (autoFill.id) entries.push([['campaign', 'id'], (idInput.value = slugify(e.target.value))]);
        if (autoFill.slug) entries.push([['slug'], (slugInput.value = slugify(e.target.value).slice(0, 40))]);
        this.store.setMany(entries);
      },
    });

    return [
      field('Campaign name', nameInput, 'Saved with every application, so you can filter by campaign later'),
      field('Campaign ID', idInput, 'Lowercase and dashes. Becomes utm_campaign in tracked links'),
      field('Page link', el('div', { class: 'prefixed' }, el('span', {}, `${location.host}/`), slugInput),
        draft ? 'Choose carefully: the link cannot change after publishing' : 'Fixed after publishing so shared links never break'),
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
