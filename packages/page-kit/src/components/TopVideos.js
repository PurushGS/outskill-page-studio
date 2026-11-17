import { Component } from '../core/Component.js';
import { html, safeUrl } from '../core/html.js';
import { button, eyebrow, videoThumbnail } from '../core/ui.js';

/** "Top 5 Videos of the Week": the first video big, the rest as a numbered list. */
export class TopVideos extends Component {
  static type = 'top-videos';
  static label = 'Top videos';
  static schema = [
    { key: 'eyebrow', label: 'Small label above title', kind: 'text' },
    { key: 'title', label: 'Title', kind: 'text' },
    { key: 'subtitle', label: 'Subtitle', kind: 'textarea' },
    { key: 'subscribeLabel', label: 'Subscribe button text', kind: 'text' },
    { key: 'subscribeUrl', label: 'Subscribe button link', kind: 'url' },
    { key: 'badge', label: 'Badge on the first video', kind: 'text' },
    {
      key: 'videos',
      label: 'Videos (first one is featured)',
      kind: 'list',
      itemSchema: [
        { key: 'url', label: 'YouTube link', kind: 'url' },
        { key: 'title', label: 'Title', kind: 'text' },
        { key: 'duration', label: 'Length, e.g. 26:53', kind: 'text' },
        { key: 'views', label: 'Views note, e.g. 336K views this week', kind: 'text' },
        { key: 'note', label: 'Highlighted note, e.g. Guide inside', kind: 'text' },
      ],
    },
  ];
  static defaults = {
    eyebrow: 'This week · Most watched',
    title: 'Top 5 Videos of the Week',
    subtitle: 'The breakdowns everyone is watching this week.',
    subscribeLabel: 'Subscribe on YouTube',
    subscribeUrl: 'https://www.youtube.com/',
    badge: '#1 This Week',
    videos: [{ url: '', title: 'Video title', duration: '', views: '', note: 'Guide inside' }],
  };

  renderContent() {
    const p = this.props;
    const [featured, ...rest] = p.videos;
    return html`<div class="pk-container">
      <div class="pk-section-head">
        ${eyebrow(p.eyebrow, this.editable('eyebrow'))}
        <h2 class="pk-h2"${this.editable('title')}>${p.title}</h2>
        ${p.subtitle ? html`<p class="pk-lead"${this.editable('subtitle')}>${p.subtitle}</p>` : ''}
        ${p.subscribeLabel ? html`<div class="pk-section-head__action">${button({ label: p.subscribeLabel, href: p.subscribeUrl, variant: 'outline', icon: this.icon('video'), attrs: this.editable('subscribeLabel') })}</div>` : ''}
      </div>
      ${featured ? this.#featured(featured) : ''}
      <ol class="pk-top-list">${rest.map((video, i) => this.#row(video, i + 1))}</ol>
    </div>`;
  }

  #featured(video) {
    const at = (key) => this.editable(`videos.0.${key}`);
    return html`<article class="pk-top-featured">
      <div class="pk-top-featured__media"${at('url')}>
        ${this.props.badge ? html`<span class="pk-badge"${this.editable('badge')}>${this.props.badge}</span>` : ''}
        ${videoThumbnail({ url: video.url, duration: video.duration, label: 'Watch on YouTube', icon: this.icon('play') })}
      </div>
      <h3 class="pk-h3 pk-top-featured__title"${at('title')}>${video.title}</h3>
      ${this.#meta(video, 0)}
    </article>`;
  }

  #row(video, index) {
    const at = (key) => this.editable(`videos.${index}.${key}`);
    return html`<li class="pk-top-row">
      <span class="pk-top-row__rank">${String(index + 1).padStart(2, '0')}</span>
      <div${at('url')}>${videoThumbnail({ url: video.url, duration: video.duration, label: '', className: 'pk-thumb--small' })}</div>
      <div><a class="pk-top-row__title" href="${safeUrl(video.url)}" target="_blank" rel="noopener noreferrer"${at('title')}>${video.title}</a>${this.#meta(video, index)}</div>
    </li>`;
  }

  #meta(video, index) {
    if (!video.views && !video.note) return '';
    return html`<p class="pk-top-meta"><span${this.editable(`videos.${index}.views`)}>${video.views}</span>${video.views && video.note ? ' · ' : ''}<em${this.editable(`videos.${index}.note`)}>${video.note}</em></p>`;
  }
}
