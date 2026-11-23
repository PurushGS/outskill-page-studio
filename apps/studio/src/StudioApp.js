import { el, debounce } from './dom.js';
import { FORMATS, findFormat } from '../../../packages/attribution/src/formats.js';
import { slugify } from '../../../packages/attribution/src/attribution.js';
import { ThemePanel } from './panels/ThemePanel.js';
import { BlocksPanel } from './panels/BlocksPanel.js';
import { CampaignPanel } from './panels/CampaignPanel.js';
import { PreviewFrame } from './PreviewFrame.js';

/** New pages in a format with no pages yet start from this bundled template. */
const BASE_TEMPLATE = 'guide-page';

/**
 * Wires the studio together: Format → Page → edit → Publish.
 * Each panel only knows the store; StudioApp is the only class that knows
 * about all of them.
 */
export class StudioApp {
  /**
   * @param {object} deps
   * @param {HTMLElement} deps.root
   * @param {PageStore} deps.store
   * @param {StudioApi} deps.api
   * @param {PageRenderer} deps.renderer
   * @param {ComponentRegistry} deps.registry
   * @param {IconLibrary} deps.icons
   * @param {string} deps.publicBaseUrl  where pages are shared, e.g. https://outskill.com/resources
   */
  constructor({ root, store, api, renderer, registry, icons, publicBaseUrl }) {
    this.root = root;
    this.store = store;
    this.api = api;
    this.publicBaseUrl = publicBaseUrl;
    this.pages = [];
    this.format = '';
    /** The open page was taken off the web; Publish brings it back. */
    this.isUnpublished = false;
    this.preview = new PreviewFrame(root.querySelector('#preview'), renderer, {
      onBlockClick: (id, fieldPath) => this.#selectBlock(id, fieldPath),
      onKeyDown: (event) => this.#handleShortcut(event),
    });
    this.panels = {
      content: new BlocksPanel(store, { registry, icons, onSelect: (id) => this.preview.highlight(id) }),
      style: new ThemePanel(store),
      campaign: new CampaignPanel(store, { api, publicBaseUrl, onStatus: (...args) => this.#setStatus(...args) }),
    };
    this.ui = {
      formatSelect: root.querySelector('#format-select'),
      pageSelect: root.querySelector('#page-select'),
      newPage: root.querySelector('#new-page'),
      duplicatePage: root.querySelector('#duplicate-page'),
      status: root.querySelector('#status'),
      save: root.querySelector('#save'),
      unpublish: root.querySelector('#unpublish'),
      undo: root.querySelector('#undo'),
      liveLink: root.querySelector('#live-link'),
      copyLink: root.querySelector('#copy-link'),
      panelHost: root.querySelector('#panel-host'),
      token: root.querySelector('#token'),
    };
  }

  async start() {
    this.#bindStore();
    this.#bindTopBar();
    this.#bindTabs();
    this.#bindKeyboard();
    this.api.adoptTokenFromLink();
    this.ui.token.value = this.api.token;
    // Editors who opened their studio link are already signed in; the password box only appears if needed.
    this.ui.token.hidden = Boolean(this.api.token);
    await this.#refreshPages();
    await this.#chooseFormat(FORMATS[0].id);
  }

  // ---------- formats & pages ----------

  async #refreshPages() {
    try {
      this.pages = await this.api.listPages();
    } catch (err) {
      this.#setStatus(`Could not load pages: ${err.message}`, 'error');
    }
    const count = (id) => this.pages.filter((p) => p.format === id).length;
    this.ui.formatSelect.replaceChildren(...FORMATS.map((f) =>
      el('option', { value: f.id, selected: f.id === this.format }, `${f.label} (${count(f.id)})`),
    ));
  }

  /** Picking a format shows its pages; a format without pages opens the template as a new draft. */
  async #chooseFormat(formatId, selectSlug) {
    if (!this.#canLeaveCurrentPage()) {
      this.ui.formatSelect.value = this.format;
      return;
    }
    this.format = formatId;
    this.ui.formatSelect.value = formatId;
    const inFormat = this.pages.filter((p) => p.format === formatId);
    this.#fillPageSelect(inFormat, selectSlug);
    if (inFormat.length) await this.#openPage(selectSlug || inFormat[0].slug, { confirmed: true });
    else await this.#startDraft(await this.api.getTemplate(BASE_TEMPLATE), { confirmed: true });
  }

  #fillPageSelect(inFormat, selected) {
    this.ui.pageSelect.replaceChildren(...inFormat.map((p) =>
      el('option', { value: p.slug, selected: p.slug === selected }, `${p.campaignName || p.slug} · /${p.slug}${p.unpublished ? ' (unpublished)' : ''}`),
    ));
    if (!inFormat.length) this.ui.pageSelect.append(el('option', { value: '' }, `No ${findFormat(this.format).label} pages yet`));
  }

  async #openPage(slug, { confirmed = false } = {}) {
    if (!slug || (!confirmed && !this.#canLeaveCurrentPage())) {
      this.ui.pageSelect.value = this.store.page?.slug ?? '';
      return;
    }
    this.#setStatus('Loading…');
    const page = await this.api.getPage(slug);
    this.isUnpublished = Boolean(page.unpublished);
    this.store.load(page);
    this.#setStatus(this.isUnpublished ? 'This page is unpublished: visitors see "no longer available". Press Publish again to bring it back.' : '');
  }

  /**
   * A draft is a copy of a design with a blank campaign: nothing is claimed
   * on the server until the first Publish, which makes the page link from the campaign name.
   */
  async #startDraft(design, { confirmed = false } = {}) {
    if (!confirmed && !this.#canLeaveCurrentPage()) return;
    const draft = structuredClone(design);
    draft.slug = '';
    draft.campaign = { format: this.format, name: '', id: '', formUrl: '' };
    delete draft.createdAt;
    delete draft.updatedAt;
    delete draft.unpublished;
    this.isUnpublished = false;
    this.store.load(draft, { draft: true });
    this.ui.pageSelect.prepend(el('option', { value: '', selected: true }, '✎ New page (not published yet)'));
    this.root.querySelector('[data-tab="campaign"]').click();
    this.#setStatus(`New ${findFormat(this.format).label} page: give it a campaign name and form URL on the Campaign tab, edit the design, then Publish.`);
  }

  /**
   * Like + New page, but the copy keeps everything: application form,
   * redirect, resource PDF and links, WhatsApp link. Only the campaign name
   * (and so the page link) is new: "<name> (copy)", to be renamed before publishing.
   */
  #duplicatePage() {
    if (!this.#canLeaveCurrentPage()) return;
    const page = this.store.page;
    const copy = structuredClone(page);
    const name = `${page.campaign?.name || 'Untitled'} (copy)`;
    copy.slug = slugify(name);
    copy.campaign = { ...page.campaign, name, id: slugify(name) };
    delete copy.createdAt;
    delete copy.updatedAt;
    delete copy.unpublished;
    this.isUnpublished = false;
    this.store.load(copy, { draft: true });
    this.ui.pageSelect.prepend(el('option', { value: '', selected: true }, `✎ Copy of ${page.campaign?.name || 'page'} (not published yet)`));
    this.root.querySelector('[data-tab="campaign"]').click();
    this.#setStatus('Duplicated: everything is copied, including the application form and PDF. Rename the campaign (that makes the new page link), then Publish.');
  }

  // ---------- publishing ----------

  async #save() {
    if (!this.store.isDirty && !this.isUnpublished) return;
    this.api.token = this.ui.token.value.trim() || this.api.token;
    this.#setStatus('Publishing…');
    this.ui.save.disabled = true;
    try {
      const wasDraft = this.store.isDraft;
      const wasUnpublished = this.isUnpublished;
      const { page } = wasDraft ? await this.api.createPage(this.store.page) : await this.api.savePage(this.store.page);
      this.isUnpublished = false;
      // A new page comes back with its final page link, so load it; an update keeps its undo history.
      if (wasDraft) this.store.load(page);
      else this.store.markSaved();
      this.#updatePublishControls();
      if (wasDraft || wasUnpublished) {
        await this.#refreshPages();
        this.#fillPageSelect(this.pages.filter((p) => p.format === this.format), page.slug);
      }
      const link = this.#pageLink(page.slug);
      const done = wasDraft ? 'New page is live' : wasUnpublished ? 'Page is live again' : 'Published';
      this.#setStatus(`${done}! Page link:`, 'ok', link);
    } catch (err) {
      if (err.status === 401) this.ui.token.hidden = false;
      this.#setStatus(this.#describeError(err), 'error');
    } finally {
      this.ui.save.disabled = false;
    }
  }

  /** Keeps the page and its edits in the studio; only the public page and its form go offline. */
  async #unpublish() {
    const { slug } = this.store.page;
    const ok = window.confirm(`Take /${slug} off the web?\n\nVisitors will see "This page is no longer available" and the form stops taking applications. The page stays here in the studio: press Publish again any time to bring it back at the same link.`);
    if (!ok) return;
    this.ui.unpublish.disabled = true;
    try {
      await this.api.unpublishPage(slug);
      this.isUnpublished = true;
      this.#updatePublishControls();
      await this.#refreshPages();
      this.#fillPageSelect(this.pages.filter((p) => p.format === this.format), slug);
      this.#setStatus(`Unpublished: /${slug} is off the web (it can take up to a minute everywhere). Press Publish again to bring it back.`, 'ok');
    } catch (err) {
      if (err.status === 401) this.ui.token.hidden = false;
      this.#setStatus(this.#describeError(err).replace('Publishing', 'Unpublishing'), 'error');
    } finally {
      this.ui.unpublish.disabled = false;
    }
  }

  #updatePublishControls() {
    const { isDraft, isDirty } = this.store;
    this.ui.save.textContent = isDraft ? 'Publish new page' : this.isUnpublished ? 'Publish again' : isDirty ? 'Publish changes' : 'Published';
    this.ui.save.classList.toggle('is-dirty', isDirty || this.isUnpublished);
    this.ui.unpublish.hidden = isDraft || this.isUnpublished;
  }

  // ---------- wiring ----------

  #bindStore() {
    const rerender = debounce(() => this.preview.render(this.#previewPage()), 120);
    this.store.addEventListener('change', rerender);
    this.store.addEventListener('change', () => { this.ui.undo.disabled = !this.store.canUndo; });
    this.store.addEventListener('dirty', () => this.#updatePublishControls());
    this.store.addEventListener('structure', () => {
      const { slug } = this.store.page;
      this.ui.liveLink.href = this.#pageLink(slug);
      this.ui.liveLink.toggleAttribute('aria-disabled', this.store.isDraft);
      this.ui.copyLink.disabled = this.store.isDraft;
      this.#updatePublishControls();
    });
  }

  /** Drafts have no slug yet; give the preview a placeholder so the form markup still renders. */
  #previewPage() {
    const page = this.store.page;
    return page.slug ? page : { ...page, slug: 'new-page' };
  }

  #bindTopBar() {
    this.ui.formatSelect.addEventListener('change', (e) => this.#chooseFormat(e.target.value));
    this.ui.pageSelect.addEventListener('change', (e) => this.#openPage(e.target.value));
    this.ui.newPage.addEventListener('click', () => this.#startDraft(this.store.page));
    this.ui.duplicatePage.addEventListener('click', () => this.#duplicatePage());
    this.ui.save.addEventListener('click', () => this.#save());
    this.ui.unpublish.addEventListener('click', () => this.#unpublish());
    this.ui.undo.addEventListener('click', () => this.store.undo());
    this.ui.copyLink.addEventListener('click', () => this.#copyPageLink());
    this.ui.token.addEventListener('change', () => { this.api.token = this.ui.token.value.trim(); });
    this.root.querySelectorAll('[data-device]').forEach((btn) => btn.addEventListener('click', () => {
      this.root.querySelectorAll('[data-device]').forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
      this.preview.setDevice(btn.dataset.device);
    }));
    window.addEventListener('beforeunload', (e) => { if (this.store.isDirty) e.preventDefault(); });
  }

  #bindTabs() {
    const tabs = this.root.querySelectorAll('[role="tab"]');
    const show = (name) => {
      tabs.forEach((t) => t.setAttribute('aria-selected', String(t.dataset.tab === name)));
      this.ui.panelHost.replaceChildren(this.panels[name].root);
      this.panels[name].refresh();
    };
    tabs.forEach((t) => t.addEventListener('click', () => show(t.dataset.tab)));
    show('content');
  }

  #bindKeyboard() {
    document.addEventListener('keydown', (e) => this.#handleShortcut(e));
  }

  /**
   * ⌘S publishes. ⌘Z is always the studio's undo, even inside a text box:
   * one shortcut with one meaning is easier than the browser's per-field undo,
   * and PageStore already groups each field's typing into a single step.
   */
  #handleShortcut(e) {
    const mod = e.metaKey || e.ctrlKey;
    const key = e.key.toLowerCase();
    if (mod && key === 's') {
      e.preventDefault();
      this.#save();
    }
    if (mod && key === 'z' && !e.shiftKey) {
      e.preventDefault();
      this.store.undo();
    }
  }

  /** The plain public page address, no UTMs. */
  #pageLink(slug) {
    return `${this.publicBaseUrl}/${slug}`;
  }

  async #copyPageLink() {
    const link = this.#pageLink(this.store.page.slug);
    try {
      await navigator.clipboard.writeText(link);
      this.#setStatus(`Copied${this.store.isDirty ? ' (publish your changes first so visitors see them)' : ''}:`, 'ok', link);
    } catch {
      this.#setStatus('Copy this link:', '', link);
    }
  }

  #selectBlock(blockId, fieldPath) {
    this.root.querySelector('[data-tab="content"]').click();
    this.panels.content.select(blockId, fieldPath);
  }

  #canLeaveCurrentPage() {
    return !this.store.isDirty || window.confirm('You have unpublished changes. Discard them?');
  }

  /** Turns API errors into sentences a non-engineer can act on. */
  #describeError(err) {
    if (err.status === 401) return 'Publishing needs your studio link. Open the studio from the link you were sent (it signs you in), then try again.';
    if (err.status === 409) return err.message;
    if (err.status === 422 && Array.isArray(err.details)) return `Can't publish yet: ${err.details.join('; ')}`;
    if (!navigator.onLine) return 'You seem to be offline. Your changes are kept here; press Publish again when you are back online.';
    return `Publishing failed: ${err.message}. Your changes are kept here; try again in a moment.`;
  }

  /** Shows a message; with `link`, also the link itself and a Copy button for it. */
  #setStatus(message, tone = '', link = null) {
    this.ui.status.dataset.tone = tone;
    if (!link) {
      this.ui.status.textContent = message;
      return;
    }
    const copy = el('button', { type: 'button', class: 'btn btn--sm', onclick: async () => {
      try {
        await navigator.clipboard.writeText(link);
        copy.textContent = 'Copied!';
      } catch {
        copy.textContent = 'Select the link to copy';
      }
    } }, 'Copy link');
    this.ui.status.replaceChildren(
      `${message} `,
      el('a', { href: link, target: '_blank', rel: 'noopener', class: 'status__link' }, link),
      ' ',
      copy,
    );
  }
}
