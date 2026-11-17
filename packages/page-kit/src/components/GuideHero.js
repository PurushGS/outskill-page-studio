import { Component } from '../core/Component.js';
import { html } from '../core/html.js';
import { button } from '../core/ui.js';

/** The big card at the top of a guide page: category line, title, two buttons and a stats row. */
export class GuideHero extends Component {
  static type = 'guide-hero';
  static label = 'Guide hero';
  static schema = [
    { key: 'icon', label: 'Icon', kind: 'icon' },
    { key: 'category', label: 'Category', kind: 'text' },
    { key: 'title', label: 'Title', kind: 'textarea' },
    { key: 'description', label: 'Description', kind: 'textarea' },
    { key: 'ctaLabel', label: 'Main button text', kind: 'text' },
    { key: 'ctaHref', label: 'Main button link', kind: 'url' },
    { key: 'copyLabel', label: '"Copy link" button text (empty hides it)', kind: 'text' },
    {
      key: 'stats',
      label: 'Numbers (shown in the line above the title and in the boxes)',
      kind: 'list',
      itemSchema: [
        { key: 'value', label: 'Number', kind: 'text' },
        { key: 'label', label: 'Label', kind: 'text' },
      ],
    },
  ];
  static defaults = {
    icon: 'book',
    category: 'Career and Jobs',
    title: 'Your guide title',
    description: 'One or two lines on what this guide helps people do.',
    ctaLabel: 'Unlock the Full Guide',
    ctaHref: '#join',
    copyLabel: 'Copy Link',
    stats: [
      { value: '6', label: 'Steps' },
      { value: '4', label: 'Prompts' },
      { value: '3', label: 'Tools' },
    ],
  };

  renderContent() {
    const { icon, category, title, description, ctaLabel, ctaHref, copyLabel, stats } = this.props;
    const meta = [category, ...stats.map((s) => `${s.value} ${s.label}`)].filter(Boolean).join(' · ');
    return html`<div class="pk-container">
      <div class="pk-guide-hero__card">
        <span class="pk-tile"${this.editable('icon')}>${this.icon(icon)}</span>
        <p class="pk-eyebrow pk-guide-hero__meta"${this.editable('category')}>${meta}</p>
        <h1 class="pk-guide-hero__title"${this.editable('title')}>${title}</h1>
        <p class="pk-lead"${this.editable('description')}>${description}</p>
        <div class="pk-guide-hero__actions">
          ${button({ label: ctaLabel, href: ctaHref, attrs: this.editable('ctaLabel') })}
          ${copyLabel ? html`<button type="button" class="pk-btn pk-btn--outline" data-copy-link${this.editable('copyLabel')}>${this.icon('link')}<span>${copyLabel}</span></button>` : ''}
        </div>
        ${stats.length ? html`<ul class="pk-guide-hero__stats">${stats.map((s, i) => html`<li><b${this.editable(`stats.${i}.value`)}>${s.value}</b><span${this.editable(`stats.${i}.label`)}>${s.label}</span></li>`)}</ul>` : ''}
      </div>
    </div>`;
  }
}
