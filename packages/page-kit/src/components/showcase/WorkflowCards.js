import { html, safeUrl } from '../../core/html.js';
import { ShowcaseBlock, TONE_FIELD, WASH_FIELD, svg, videoThumb } from './ShowcaseBlock.js';

/**
 * "Watch the video. Build the workflow.": the library as colour-wash cards.
 * The first card is featured (story left; video, numbers and a copyable
 * line right), the second sits beside it with its video, the rest are small
 * cards with a peek at their first steps.
 */
export class WorkflowCards extends ShowcaseBlock {
  static type = 'sc-library';
  static label = 'Showcase · Workflow cards';
  static tone = 'light';
  static schema = [
    TONE_FIELD,
    { key: 'eyebrow', label: 'Small label above title', kind: 'text' },
    { key: 'title', label: 'Title', kind: 'text' },
    { key: 'text', label: 'Text', kind: 'textarea' },
    { key: 'buttonLabel', label: 'Button text', kind: 'text' },
    { key: 'buttonHref', label: 'Button link', kind: 'url' },
    { key: 'lockLabel', label: 'Note on each card, e.g. Free with sign-up', kind: 'text' },
    {
      key: 'cards',
      label: 'Cards (first is featured, second sits beside it)',
      kind: 'list',
      itemSchema: [
        WASH_FIELD,
        { key: 'icon', label: 'Icon', kind: 'icon' },
        { key: 'category', label: 'Category', kind: 'text' },
        { key: 'title', label: 'Title', kind: 'text' },
        { key: 'summary', label: 'Summary', kind: 'textarea' },
        { key: 'href', label: 'Link', kind: 'url' },
        { key: 'videoUrl', label: 'YouTube link (optional)', kind: 'url' },
        { key: 'duration', label: 'Video length, e.g. 16:12', kind: 'text' },
        { key: 'steps', label: 'Number of steps', kind: 'text' },
        { key: 'prompts', label: 'Number of prompts', kind: 'text' },
        { key: 'tools', label: 'Number of tools', kind: 'text' },
        { key: 'firstStep', label: 'First step (small cards)', kind: 'text' },
        { key: 'secondStep', label: 'Second step (small cards)', kind: 'text' },
        { key: 'codeLabel', label: 'Featured card: copyable line label', kind: 'text' },
        { key: 'code', label: 'Featured card: copyable line', kind: 'textarea' },
      ],
    },
  ];
  static defaults = {
    tone: 'light',
    eyebrow: 'The Library',
    title: 'Watch the video. Build the workflow.',
    text: 'Every guide comes from a real Outskill breakdown, with each step, prompt and tool you need to build it yourself.',
    buttonLabel: 'Browse the library',
    buttonHref: '#join',
    lockLabel: 'Free with sign-up',
    cards: [
      { color: 'crimson', icon: 'code', category: 'Vibe Coding', title: 'Reverse-Engineer Any App with REA', summary: 'REA is a free, open-source tool that runs locally and lets your coding agent study any app, break down how it works, and rebuild it.', href: '#join', videoUrl: 'https://www.youtube.com/watch?v=v_XdN5-ya9A', duration: '16:12', steps: '5', prompts: '5', tools: '2', firstStep: '', secondStep: '', codeLabel: 'Command (Mac): Install Claude Code', code: 'curl -fsSL https://claude.ai/install.sh | bash' },
      { color: 'violet', icon: 'bolt', category: 'AI Tools · 7 steps', title: 'Run Your Coding Tool on Free and Cheap AI with OmniRoute', summary: 'OmniRoute is a free local proxy that connects your coding tool to free and cheap AI models.', href: '#join', videoUrl: 'https://www.youtube.com/watch?v=HsgsYdV1XoQ', duration: '31:34', steps: '7', prompts: '', tools: '', firstStep: '', secondStep: '', codeLabel: '', code: '' },
      { color: 'green', icon: 'target', category: 'Career and Jobs · 6 steps', title: 'Apply to 100 Jobs in One Night with ChatGPT', summary: "ChatGPT's agent mode finds jobs on LinkedIn and Indeed, tailors your resume and applies for you.", href: '#join', videoUrl: '', duration: '', steps: '6', prompts: '', tools: '', firstStep: 'Load your resume and map roles', secondStep: 'Build your master resume', codeLabel: '', code: '' },
      { color: 'rose', icon: 'users', category: 'Marketing · 9 steps', title: 'Test Your Launch on an AI Crowd with MiroFish', summary: 'MiroFish builds a crowd of AI people, shows them your launch and tells you how they react.', href: '#join', videoUrl: '', duration: '', steps: '9', prompts: '', tools: '', firstStep: 'Install MiroFish', secondStep: 'Describe your audience', codeLabel: '', code: '' },
      { color: 'amber', icon: 'chart', category: 'Sales · 6 steps', title: 'Set Up a Free AI Sales Agent with Harvey', summary: 'Harvey is a free, open-source AI agent that finds leads, writes outreach and books calls.', href: '#join', videoUrl: '', duration: '', steps: '6', prompts: '', tools: '', firstStep: 'Install Harvey', secondStep: 'Connect your inbox', codeLabel: '', code: '' },
      { color: 'terracotta', icon: 'heart', category: 'Vibe Coding · 6 steps', title: 'Build a Hospital Booking Site That Calls Patients', summary: 'Build a hospital appointment website where every booking gets a confirmation call from an AI voice agent.', href: '#join', videoUrl: '', duration: '', steps: '6', prompts: '', tools: '', firstStep: 'Plan the booking flow', secondStep: 'Build the site', codeLabel: '', code: '' },
    ],
  };

  renderContent() {
    const p = this.props;
    const [first, second, ...rest] = p.cards;
    return html`<div class="o-in">
      <div class="o-shead"><div>
        ${p.eyebrow ? html`<p class="o-lbl"${this.editable('eyebrow')}>${p.eyebrow}</p>` : ''}
        <h2 class="o-t2"${this.editable('title')}>${p.title}</h2>
        ${p.text ? html`<p class="o-p"${this.editable('text')}>${p.text}</p>` : ''}
      </div>${this.button(p.buttonLabel, p.buttonHref, { variant: 'dark', icon: '', attrs: this.editable('buttonLabel') })}</div>
      ${first ? html`<div class="o-bento${second ? '' : ' o-bento--one'}">${this.#big(first)}${second ? this.#mid(second, 1) : ''}</div>` : ''}
      ${rest.length ? html`<div class="o-bento2">${rest.map((c, i) => this.#small(c, i + 2))}</div>` : ''}
    </div>`;
  }

  #at(i, key) {
    return this.editable(`cards.${i}.${key}`);
  }

  #icon(c, i) {
    return html`<span class="o-icn"${this.#at(i, 'icon')}>${this.icon(c.icon || 'book')}</span>`;
  }

  #text(c, i) {
    return html`<div class="o-meta"${this.#at(i, 'category')}>${c.category}</div><h3${this.#at(i, 'title')}>${c.title}</h3>${c.summary ? html`<p${this.#at(i, 'summary')}>${c.summary}</p>` : ''}`;
  }

  #lock() {
    return this.props.lockLabel ? html`<span class="o-lock">${svg('lock')}${this.props.lockLabel}</span>` : '';
  }

  #stats(c) {
    const cells = [[c.steps, 'Steps'], [c.prompts, 'Prompts'], [c.tools, 'Tools']].filter(([n]) => n);
    return cells.length ? html`<div class="o-bstats">${cells.map(([n, l]) => html`<span><b>${n}</b>${Number(n) === 1 ? l.slice(0, -1) : l}</span>`)}</div>` : '';
  }

  #mini(c) {
    if (!c.firstStep) return '';
    return html`<div class="o-mini" aria-hidden="true"><div class="o-mini-h"><span>${c.steps ? `${c.steps} steps` : 'Steps'}</span></div>
      <p class="d"><i>${svg('check')}</i><span>${c.firstStep}</span></p>
      ${c.secondStep ? html`<p class="a"><i>02</i><span>${c.secondStep}</span></p>` : ''}
      <p class="l"><i>03</i><span></span></p></div>`;
  }

  #big(c) {
    return html`<a class="o-card big o-cg-${c.color || 'crimson'}" href="${safeUrl(c.href || '#')}">
      <div class="o-bl"><div class="o-ct">${this.#icon(c, 0)}</div><div class="o-cb">${this.#text(c, 0)}</div><div class="o-bf">${this.#lock()}</div></div>
      <div class="o-br">
        ${c.videoUrl ? html`<div class="o-bv"${this.#at(0, 'videoUrl')}>${videoThumb(c.videoUrl, c.duration, html`<span class="o-tag o-tag--watch">${svg('play')}Watch</span>`)}</div>` : this.#mini(c)}
        ${this.#stats(c)}
        ${c.code ? html`<div class="o-peek"><div class="pk"><span${this.#at(0, 'codeLabel')}>${c.codeLabel}</span><span class="o-cpy">${svg('lock')}Copy</span></div><pre${this.#at(0, 'code')}>${c.code}</pre></div>` : ''}
      </div></a>`;
  }

  #mid(c, i) {
    return html`<a class="o-card mid o-cg-${c.color || 'violet'}" href="${safeUrl(c.href || '#')}">
      <div class="o-ct">${this.#icon(c, i)}${c.videoUrl ? html`<span class="o-tag">${svg('play')}Video</span>` : ''}</div>
      ${c.videoUrl ? html`<div class="o-mv"${this.#at(i, 'videoUrl')}>${videoThumb(c.videoUrl, c.duration, html`<span class="o-tag o-tag--watch">${svg('play')}Watch</span>`)}</div>` : this.#mini(c)}
      <div class="o-cb">${this.#text(c, i)}</div></a>`;
  }

  #small(c, i) {
    return html`<a class="o-card sm o-cg-${c.color || 'green'}" href="${safeUrl(c.href || '#')}">
      <div class="o-ct">${this.#icon(c, i)}<span class="o-ex">${svg('out')}</span></div>
      ${this.#mini(c)}
      <div class="o-cb">${this.#text(c, i)}</div>
      <div class="o-cf">${this.#lock()}${c.videoUrl ? html`<span class="o-tag">${svg('play')}Video</span>` : ''}</div></a>`;
  }
}
