import { html, safeUrl } from '../../core/html.js';
import { ShowcaseBlock, svg, videoThumb } from './ShowcaseBlock.js';

const GRADES = [{ value: 'navy', label: 'Navy' }, { value: 'amber', label: 'Amber' }, { value: 'rose', label: 'Rose' }];

/**
 * The top of a guide page: a bar with the Outskill logo and a sign-up button,
 * then a dark glass card: the guide's icon, category, title and buttons on one
 * side, the video thumbnail and a details table on the other.
 */
export class GuideCard extends ShowcaseBlock {
  static type = 'sc-guide-card';
  static label = 'Showcase · Guide card';
  static schema = [
    { key: 'brand', label: 'Top bar: logo text', kind: 'text' },
    { key: 'brandLogo', label: 'Top bar: logo image link (optional, replaces the text)', kind: 'url' },
    { key: 'brandHref', label: 'Top bar: logo link', kind: 'url' },
    { key: 'barCtaLabel', label: 'Top bar: button text', kind: 'text' },
    { key: 'barCtaHref', label: 'Top bar: button link', kind: 'url' },
    { key: 'grade', label: 'Background colour', kind: 'choice', options: GRADES },
    { key: 'icon', label: 'Icon', kind: 'icon' },
    { key: 'category', label: 'Category', kind: 'text' },
    { key: 'title', label: 'Title', kind: 'textarea' },
    { key: 'description', label: 'Description', kind: 'textarea' },
    { key: 'ctaLabel', label: 'Main button text', kind: 'text' },
    { key: 'ctaHref', label: 'Main button link', kind: 'url' },
    { key: 'videoUrl', label: 'YouTube link (shows the thumbnail beside the title, and a "Watch the video" button)', kind: 'url' },
    { key: 'videoLabel', label: 'Video button text', kind: 'text' },
    { key: 'copyLabel', label: '"Copy link" button text (empty hides it)', kind: 'text' },
    { key: 'details', label: 'Details table', kind: 'list', itemSchema: [{ key: 'label', label: 'Label, e.g. Steps', kind: 'text' }, { key: 'value', label: 'Value, e.g. 6', kind: 'text' }] },
  ];
  static defaults = {
    brand: 'Outskill',
    brandLogo: '',
    brandHref: 'https://www.outskill.com/',
    barCtaLabel: 'Get free access',
    barCtaHref: '#join',
    grade: 'amber',
    icon: 'target',
    category: 'Career and Jobs',
    title: 'Apply to 100 Jobs in One Night with ChatGPT',
    description: 'ChatGPT’s agent mode finds jobs on LinkedIn and Indeed, tailors your resume for each role, and applies for you while you watch the browser work.',
    ctaLabel: 'Unlock the full guide',
    ctaHref: '#join',
    videoUrl: '',
    videoLabel: 'Watch the video',
    copyLabel: 'Copy link',
    details: [
      { label: 'Category', value: 'Career and Jobs' },
      { label: 'Steps', value: '6' },
      { label: 'Prompts', value: '4' },
      { label: 'Tools', value: 'ChatGPT, LinkedIn, Indeed' },
      { label: 'Format', value: 'Written guide' },
      { label: 'Price', value: 'Free with sign-up' },
    ],
  };

  renderContent() {
    const p = this.props;
    return html`<div class="o-tp-glow" data-grade="${p.grade || 'navy'}" aria-hidden="true"></div>
    <div class="o-in">
      <div class="o-tp-bar">
        <a class="o-wm o-brand" href="${safeUrl(p.brandHref || '#')}"${this.editable('brand')}>${p.brandLogo ? html`<img src="${safeUrl(p.brandLogo)}" alt="${p.brand || 'Logo'}">` : p.brand}</a>
        ${this.button(p.barCtaLabel, p.barCtaHref, { variant: 'lime o-bar-cta', attrs: this.editable('barCtaLabel') })}
      </div>
      <div class="o-tg">
        <div class="o-tg-l">
          <div class="o-tg-k"><span class="o-icn"${this.editable('icon')}>${this.icon(p.icon || 'book')}</span><p class="o-lbl"${this.editable('category')}>${p.category}</p></div>
          <h1${this.editable('title')}>${p.title}</h1>
          ${p.description ? html`<p class="o-p"${this.editable('description')}>${p.description}</p>` : ''}
          <div class="o-row">
            ${this.button(p.ctaLabel, p.ctaHref, { attrs: this.editable('ctaLabel') })}
            ${p.videoUrl ? this.button(p.videoLabel || 'Watch the video', p.videoUrl, { variant: 'dark', icon: 'youtube', attrs: this.editable('videoLabel') }) : ''}
            ${p.copyLabel ? html`<button type="button" class="o-btn dark" data-copy-link${this.editable('copyLabel')}>${svg('copy')}<span>${p.copyLabel}</span></button>` : ''}
          </div>
        </div>
        <div class="o-tg-r">
          ${p.videoUrl ? html`<a class="o-tg-v" href="${safeUrl(p.videoUrl)}" target="_blank" rel="noopener noreferrer"${this.editable('videoUrl')}>${videoThumb(p.videoUrl)}</a>` : ''}
          <dl class="o-dt">${p.details.map((d, i) => html`<div><dt${this.editable(`details.${i}.label`)}>${d.label}</dt><dd${this.editable(`details.${i}.value`)}>${d.value}</dd></div>`)}</dl>
        </div>
      </div>
    </div>`;
  }
}
