import { el } from '../dom.js';
import { Panel, field } from './Panel.js';
import { FieldEditor } from './FieldEditor.js';
import { findFormat, FORM_URL_EXAMPLE, parseFormUrl } from '../../../../packages/attribution/src/formats.js';
import { buildTrackedLink, slugify } from '../../../../packages/attribution/src/attribution.js';
import { QuestionFlow } from '../../../../packages/lead-flow/src/QuestionFlow.js';

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
 * its link, the application form's URL, what people get after applying,
 * and tracked links to share.
 */
export class CampaignPanel extends Panel {
  /**
   * @param {PageStore} store
   * @param {object} deps
   * @param {StudioApi} deps.api
   * @param {(message: string, tone?: string, link?: string) => void} deps.onStatus
   */
  constructor(store, { api, onStatus }) {
    super(store);
    this.api = api;
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
   * published, then stays fixed. The campaign ID (utm_campaign in tracked
   * links) is the page link, so there is nothing extra to type.
   */
  #campaignFields() {
    const { campaign, slug } = this.store.page;
    const draft = this.store.isDraft;

    const pageLink = el('code', { class: 'page-link' });
    const showLink = (value) => { pageLink.textContent = `${location.host}/${value || '…'}`; };
    showLink(slug);

    const formIds = el('small', { class: 'hint' });
    const showFormIds = (value) => {
      const ids = parseFormUrl(value);
      formIds.textContent = ids
        ? `Program ${ids.programId} · Form ${ids.formId} · ${ids.campaignId ? `Campaign ${ids.campaignId}` : 'no campaign'}. The form's questions show on the page`
        : value ? `Not a valid form link. It looks like ${FORM_URL_EXAMPLE}` : '';
    };
    showFormIds(campaign.formUrl);
    const questions = this.#questionList();
    questions.show(campaign.formUrl);
    const formUrlInput = el('input', { class: 'input input--code', type: 'url', value: campaign.formUrl ?? '', placeholder: FORM_URL_EXAMPLE, oninput: (e) => { showFormIds(e.target.value.trim()); questions.show(e.target.value.trim()); this.store.set(['campaign', 'formUrl'], e.target.value.trim()); } });
    const redirectInput = el('input', { class: 'input input--code', type: 'url', value: campaign.redirectUrl ?? '', placeholder: 'https://…', oninput: (e) => this.store.set(['campaign', 'redirectUrl'], e.target.value.trim()) });
    const nameInput = el('input', {
      class: 'input',
      value: campaign.name,
      placeholder: 'e.g. AI Jobs guide · Nov 2026',
      oninput: (e) => {
        const entries = [[['campaign', 'name'], e.target.value]];
        if (draft) {
          entries.push([['slug'], slugify(e.target.value)], [['campaign', 'id'], slugify(e.target.value)]);
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
      field('Redirect URL', redirectInput, 'Optional. After someone applies, they see a thank-you message and are sent to this link after a few seconds'),
      field('Form URL', [formUrlInput, formIds, questions.root], 'Required. The application form link: program ID / form ID / campaign ID (campaign is optional). Applications from this page go to that form'),
    ];
  }

  /**
   * "Questions on this form", like the LP admin: fetched from the form named by
   * the Form URL (after a short pause in typing) and listed in the order the page shows them.
   */
  #questionList() {
    const root = el('div', { class: 'q-preview', hidden: true });
    let timer;
    let latest = 0;
    const note = (text, tone = '') => root.replaceChildren(el('p', { class: `hint${tone ? ` hint--${tone}` : ''}` }, text));

    const load = async (formId) => {
      const mine = ++latest;
      note('Fetching questions…');
      try {
        const questions = new QuestionFlow(await this.api.getQuestionFlow(formId)).all();
        if (mine !== latest) return;
        if (!questions.length) return note('No dynamic questions found for this form.');
        root.replaceChildren(
          el('p', { class: 'q-preview__title' }, 'Questions on this form'),
          ...questions.map((q, i) => el('div', { class: 'q-preview__item' },
            el('span', { class: 'q-preview__num' }, String(i + 1)),
            el('div', {},
              el('p', { class: 'q-preview__q' }, q.title, q.isRequired ? el('span', { class: 'q-preview__req' }, '*') : null),
              el('p', { class: 'q-preview__meta' }, `${q.questionCategory}${q.options?.length ? ` · ${q.options.length} options` : ''}`),
            ))),
        );
      } catch {
        if (mine === latest) note('Could not fetch questions. Check the URL.', 'error');
      }
    };

    return {
      root,
      show(formUrl) {
        clearTimeout(timer);
        latest++;
        const ids = parseFormUrl(formUrl);
        root.hidden = !ids;
        if (ids) timer = setTimeout(() => load(ids.formId), 600);
      },
    };
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
