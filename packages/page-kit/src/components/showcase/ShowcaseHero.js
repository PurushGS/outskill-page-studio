import { html, safeUrl } from '../../core/html.js';
import { multiline } from '../../core/ui.js';
import { ShowcaseBlock, logo, svg } from './ShowcaseBlock.js';

const CARD_ICONS = [{ value: 'steps', label: 'Checklist' }, { value: 'copy', label: 'Copy' }, { value: 'tools', label: 'Tools grid' }];

/**
 * The top of the page: the header, the headline with its button, and a
 * framed "workflow guide" mock-up whose feature cards take turns (the
 * colour of the light and the lit part of the mock-up change with them).
 */
export class ShowcaseHero extends ShowcaseBlock {
  static type = 'sc-hero';
  static label = 'Showcase · Hero';
  static schema = [
    { key: 'brand', label: 'Wordmark', kind: 'text' },
    { key: 'navLinks', label: 'Menu links', kind: 'list', itemSchema: [{ key: 'label', label: 'Text', kind: 'text' }, { key: 'href', label: 'Link, e.g. #faq', kind: 'url' }] },
    { key: 'navCtaLabel', label: 'Header button text', kind: 'text' },
    { key: 'navCtaHref', label: 'Header button link', kind: 'url' },
    { key: 'title', label: 'Headline', kind: 'textarea' },
    { key: 'text', label: 'Text under the headline', kind: 'textarea' },
    { key: 'facts', label: 'Small facts next to the button', kind: 'list', itemSchema: [{ key: 'label', label: 'Label, e.g. Price', kind: 'text' }, { key: 'value', label: 'Value, e.g. Free forever', kind: 'text' }] },
    { key: 'ctaLabel', label: 'Button text', kind: 'text' },
    { key: 'ctaHref', label: 'Button link', kind: 'url' },
    { key: 'mockTitle', label: 'Mock-up: window title', kind: 'text' },
    { key: 'mockBadge', label: 'Mock-up: badge', kind: 'text' },
    { key: 'mockSteps', label: 'Mock-up: steps (first two show as done)', kind: 'list', itemSchema: [{ key: 'text', label: 'Step', kind: 'text' }] },
    { key: 'mockPromptLabel', label: 'Mock-up: prompt label', kind: 'text' },
    { key: 'mockTools', label: 'Mock-up: tool logos', kind: 'list', itemSchema: [{ key: 'name', label: 'Tool name', kind: 'text' }, { key: 'domain', label: 'Website, e.g. openai.com', kind: 'text' }, { key: 'logo', label: 'Logo image link (optional)', kind: 'url' }] },
    { key: 'chips', label: 'Floating labels', kind: 'list', itemSchema: [{ key: 'text', label: 'Text', kind: 'text' }] },
    {
      key: 'cards',
      label: 'Feature cards (take turns every 7 seconds)',
      kind: 'list',
      itemSchema: [
        { key: 'icon', label: 'Icon', kind: 'choice', options: CARD_ICONS },
        { key: 'label', label: 'Small label', kind: 'text' },
        { key: 'title', label: 'Title', kind: 'text' },
        { key: 'kicker', label: 'Right side: small label', kind: 'text' },
        { key: 'text', label: 'Right side: text', kind: 'textarea' },
        { key: 'href', label: 'Link, e.g. #guide', kind: 'url' },
      ],
    },
  ];
  static defaults = {
    brand: 'Outskill',
    navLinks: [{ label: 'Library', href: '#library' }, { label: 'Videos', href: '#videos' }, { label: 'AI Tools', href: '#tools' }, { label: 'FAQ', href: '#faq' }],
    navCtaLabel: 'Get free access',
    navCtaHref: '#join',
    title: 'Every workflow from our videos, step by step',
    text: 'The prompts, templates and setup guides behind every Outskill breakdown, written out so you can build it yourself.',
    facts: [{ label: 'Price', value: 'Free forever' }, { label: 'New resources', value: 'Every day' }],
    ctaLabel: 'Unlock the free library',
    ctaHref: '#join',
    mockTitle: 'Workflow guide',
    mockBadge: 'Free',
    mockSteps: [{ text: 'Watch the breakdown' }, { text: 'Set up your tools' }, { text: 'Run the first prompt' }, { text: 'Ship your workflow' }],
    mockPromptLabel: 'Prompt',
    mockTools: [{ name: 'ChatGPT', domain: 'chatgpt.com', logo: '' }, { name: 'Claude', domain: 'claude.ai', logo: '' }, { name: 'n8n', domain: 'n8n.io', logo: '' }],
    chips: [{ text: 'Step-by-step workflows' }, { text: '763 AI tools, priced' }, { text: 'New resources every day' }],
    cards: [
      { icon: 'steps', label: 'Step by step', title: 'Every workflow, written out', kicker: 'Inside every guide', text: 'Watch the breakdown, then follow each step to build it yourself.', href: '#guide' },
      { icon: 'copy', label: 'Copy and paste', title: 'Every prompt from the video', kicker: 'Ready to use', text: 'The exact prompts, commands and templates, one click to copy.', href: '#guide' },
      { icon: 'tools', label: 'Sorted and priced', title: 'The right AI tool for the job', kicker: 'AI tools directory', text: 'What each tool does best, and what it costs.', href: '#tools' },
    ],
  };

  renderContent() {
    const p = this.props;
    return html`<div class="o-hbg" aria-hidden="true"><div class="o-hl g-navy on"></div><div class="o-hl g-amber"></div><div class="o-hl g-rose"></div></div>
    <div class="o-in">
      <header class="o-head">
        <a class="o-wm" href="#"${this.editable('brand')}>${p.brand}</a>
        <nav class="o-nav" aria-label="Main">${p.navLinks.map((l, i) => html`<a href="${safeUrl(l.href)}"${this.editable(`navLinks.${i}.label`)}>${l.label}</a>`)}</nav>
        ${this.button(p.navCtaLabel, p.navCtaHref, { variant: 'ghost o-navcta', attrs: this.editable('navCtaLabel') })}
      </header>
      <div class="o-hgrid">
        <div class="o-hc">
          <h1 class="o-t1"${this.editable('title')}>${multiline(p.title)}</h1>
          ${p.text ? html`<p class="o-p"${this.editable('text')}>${p.text}</p>` : ''}
          <div class="o-row">
            ${p.facts.map((f, i) => html`<div class="o-mt"><small${this.editable(`facts.${i}.label`)}>${f.label}</small><b${this.editable(`facts.${i}.value`)}>${f.value}</b></div>`)}
            ${this.button(p.ctaLabel, p.ctaHref, { size: 'lg', attrs: this.editable('ctaLabel') })}
          </div>
        </div>
        ${this.#stage()}
      </div>
    </div>`;
  }

  #stage() {
    const p = this.props;
    const cards = p.cards.length ? p.cards : [];
    return html`<div class="o-stage" data-s="0" data-hero-stage>
      <div class="o-frame" aria-hidden="true"></div>
      <div class="o-mock" aria-hidden="true">
        <div class="o-mk-bar"><i></i><i></i><i></i><span${this.editable('mockTitle')}>${p.mockTitle}</span>${p.mockBadge ? html`<b${this.editable('mockBadge')}>${p.mockBadge}</b>` : ''}</div>
        <div class="o-mk-b">
          <div class="o-mk-steps">${p.mockSteps.map((s, i) => {
            const state = i < 2 ? 'd' : i === 2 ? 'a' : '';
            return html`<p class="${state}"${this.editable(`mockSteps.${i}.text`)}><em>${state === 'd' ? svg('check') : String(i + 1).padStart(2, '0')}</em>${s.text}</p>`;
          })}</div>
          <div class="o-mk-pr"><div><span${this.editable('mockPromptLabel')}>${p.mockPromptLabel}</span><b>Copy</b></div><p><i style="width:92%"></i><i style="width:78%"></i><i style="width:58%"></i></p></div>
          ${p.mockTools.length ? html`<div class="o-mk-tools">${p.mockTools.map((t, i) => html`${i ? html`<i></i>` : ''}<span>${logo(t)}</span>`)}<em>${svg('check')}</em></div>` : ''}
        </div>
      </div>
      ${p.chips.slice(0, 3).map((c, i) => html`<span class="o-chip c${i + 1}"${this.editable(`chips.${i}.text`)}>${svg('check')}${c.text}</span>`)}
      ${cards.length > 1 ? html`<button type="button" class="o-arr prev" data-hs="-1" aria-label="Previous">${svg('prev')}</button><button type="button" class="o-arr next" data-hs="1" aria-label="Next">${svg('next')}</button>` : ''}
      ${cards.map((c, i) => html`<a class="o-hcard${i ? '' : ' on'}" href="${safeUrl(c.href || '#')}" data-hcard="${i}"${i ? html` hidden` : ''}>
        <span class="l"><span class="o-hk"><span class="o-hki">${svg(c.icon || 'steps')}</span><small${this.editable(`cards.${i}.label`)}>${c.label}</small></span><b${this.editable(`cards.${i}.title`)}>${c.title}</b></span>
        <span class="r"><em${this.editable(`cards.${i}.kicker`)}>${c.kicker}</em><span${this.editable(`cards.${i}.text`)}>${c.text}</span></span>
      </a>`)}
    </div>`;
  }
}
