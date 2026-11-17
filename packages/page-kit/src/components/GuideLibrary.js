import { Component } from '../core/Component.js';
import { html, safeUrl } from '../core/html.js';
import { button, eyebrow, videoThumbnail } from '../core/ui.js';

/**
 * "Watch the Video. Build the Workflow.": a stack of guide cards. A card with
 * a YouTube link shows the video thumbnail; without one it shows an icon
 * tile and an arrow link.
 */
export class GuideLibrary extends Component {
  static type = 'guide-library';
  static label = 'Guide library';
  static schema = [
    { key: 'eyebrow', label: 'Small label above title', kind: 'text' },
    { key: 'title', label: 'Title', kind: 'textarea' },
    { key: 'subtitle', label: 'Subtitle', kind: 'textarea' },
    { key: 'buttonLabel', label: 'Button text', kind: 'text' },
    { key: 'buttonHref', label: 'Button link', kind: 'url' },
    {
      key: 'items',
      label: 'Guides',
      kind: 'list',
      itemSchema: [
        { key: 'icon', label: 'Icon', kind: 'icon' },
        { key: 'videoUrl', label: 'YouTube link (optional, shows the thumbnail)', kind: 'url' },
        { key: 'duration', label: 'Video length, e.g. 16:12', kind: 'text' },
        { key: 'category', label: 'Category', kind: 'text' },
        { key: 'steps', label: 'Steps, e.g. 6 steps', kind: 'text' },
        { key: 'title', label: 'Title', kind: 'text' },
        { key: 'text', label: 'Description', kind: 'textarea' },
        { key: 'href', label: 'Card link', kind: 'url' },
        { key: 'badge', label: 'Footer note, e.g. Free with sign-up', kind: 'text' },
      ],
    },
  ];
  static defaults = {
    eyebrow: 'The Library',
    title: 'Watch the Video. Build the Workflow.',
    subtitle: 'Every guide comes from a real video, with each step, prompt and tool you need.',
    buttonLabel: 'Browse All',
    buttonHref: '#join',
    items: [
      { icon: 'rocket', videoUrl: '', duration: '', category: 'AI Tools', steps: '5 steps', title: 'Guide title', text: 'What this guide helps you build.', href: '#join', badge: 'Free with sign-up' },
    ],
  };

  renderContent() {
    const p = this.props;
    return html`<div class="pk-container">
      <div class="pk-section-head">
        ${eyebrow(p.eyebrow, this.editable('eyebrow'))}
        <h2 class="pk-h2"${this.editable('title')}>${p.title}</h2>
        ${p.subtitle ? html`<p class="pk-lead"${this.editable('subtitle')}>${p.subtitle}</p>` : ''}
        ${p.buttonLabel ? html`<div class="pk-section-head__action">${button({ label: p.buttonLabel, href: p.buttonHref, variant: 'outline', icon: this.icon('arrowRight'), attrs: this.editable('buttonLabel') })}</div>` : ''}
      </div>
      <div class="pk-library">${p.items.map((item, i) => this.#card(item, i))}</div>
    </div>`;
  }

  #card(item, i) {
    const at = (key) => this.editable(`items.${i}.${key}`);
    const meta = [item.category, item.steps].filter(Boolean).join(' · ');
    return html`<article class="pk-card pk-library__card">
      <div class="pk-library__top">
        <span class="pk-tile"${at('icon')}>${this.icon(item.icon)}</span>
        ${item.videoUrl
          ? html`<span class="pk-chip">${this.icon('play')}Video</span>`
          : html`<a class="pk-chip pk-chip--square" href="${safeUrl(item.href)}" aria-label="Open guide">${this.icon('arrowRight')}</a>`}
      </div>
      ${item.videoUrl ? html`<div${at('videoUrl')}>${videoThumbnail({ url: item.videoUrl, duration: item.duration, icon: this.icon('play') })}</div>` : ''}
      ${meta ? html`<p class="pk-library__meta"${at('category')}>${meta}</p>` : ''}
      <h3 class="pk-h3"><a href="${safeUrl(item.href)}"${at('title')}>${item.title}</a></h3>
      ${item.text ? html`<p class="pk-muted pk-clamp"${at('text')}>${item.text}</p>` : ''}
      ${item.badge ? html`<p class="pk-library__badge"${at('badge')}>${this.icon('shield')}${item.badge}</p>` : ''}
    </article>`;
  }
}
