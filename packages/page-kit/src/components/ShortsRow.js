import { Component } from '../core/Component.js';
import { html } from '../core/html.js';
import { videoThumbnail } from '../core/ui.js';

/** "The 60-Second Versions": a sideways-scrolling row of Shorts / reels with arrow buttons. */
export class ShortsRow extends Component {
  static type = 'shorts-row';
  static label = 'Shorts row';
  static schema = [
    { key: 'title', label: 'Title', kind: 'text' },
    { key: 'subtitle', label: 'Subtitle', kind: 'textarea' },
    {
      key: 'shorts',
      label: 'Shorts',
      kind: 'list',
      itemSchema: [
        { key: 'url', label: 'YouTube Shorts or reel link', kind: 'url' },
        { key: 'title', label: 'Title', kind: 'text' },
      ],
    },
  ];
  static defaults = {
    title: 'The 60-Second Versions',
    subtitle: 'Latest Shorts and reels, for when you only have a minute.',
    shorts: [{ url: '', title: 'Short title' }],
  };

  renderContent() {
    const { title, subtitle, shorts } = this.props;
    return html`<div class="pk-container">
      <div class="pk-shorts__head">
        <div>
          <h2 class="pk-h2"${this.editable('title')}>${title}</h2>
          ${subtitle ? html`<p class="pk-muted"${this.editable('subtitle')}>${subtitle}</p>` : ''}
        </div>
        <div class="pk-shorts__arrows">
          <button type="button" class="pk-arrow" data-scroll-row="-1" aria-label="Previous">${this.icon('arrowRight', 'pk-icon pk-flip')}</button>
          <button type="button" class="pk-arrow" data-scroll-row="1" aria-label="Next">${this.icon('arrowRight')}</button>
        </div>
      </div>
      <ul class="pk-shorts" data-scroll-track>${shorts.map((s, i) => html`<li class="pk-shorts__item">
        <div${this.editable(`shorts.${i}.url`)}>${videoThumbnail({ url: s.url, label: '', className: 'pk-thumb--tall', icon: this.icon('play') })}</div>
        <p${this.editable(`shorts.${i}.title`)}>${s.title}</p>
      </li>`)}</ul>
    </div>`;
  }
}
