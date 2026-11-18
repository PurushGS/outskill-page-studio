import { html, safeUrl } from '../../core/html.js';
import { ShowcaseBlock, TONE_FIELD, logo, svg } from './ShowcaseBlock.js';

/** "763 AI tools, sorted and priced": dark tiles lit in each tool's brand colour, with its logo. */
export class ToolTiles extends ShowcaseBlock {
  static type = 'sc-tools';
  static label = 'Showcase · AI tool tiles';
  static tone = 'light';
  static schema = [
    TONE_FIELD,
    { key: 'eyebrow', label: 'Small label above title', kind: 'text' },
    { key: 'title', label: 'Title', kind: 'text' },
    { key: 'text', label: 'Text', kind: 'textarea' },
    { key: 'buttonLabel', label: 'Button text', kind: 'text' },
    { key: 'buttonHref', label: 'Button link', kind: 'url' },
    {
      key: 'tools',
      label: 'Tools',
      kind: 'list',
      itemSchema: [
        { key: 'name', label: 'Name', kind: 'text' },
        { key: 'tag', label: 'What it does, e.g. AI code editor', kind: 'text' },
        { key: 'price', label: 'Price label, e.g. Free plan', kind: 'text' },
        { key: 'url', label: 'Link', kind: 'url' },
        { key: 'domain', label: 'Website for the logo, e.g. cursor.com', kind: 'text' },
        { key: 'logo', label: 'Logo image link (optional)', kind: 'url' },
        { key: 'glow', label: 'Glow colour, e.g. #10a37f (optional)', kind: 'text' },
      ],
    },
  ];
  static defaults = {
    tone: 'light',
    eyebrow: 'AI tools directory',
    title: '763 AI tools, sorted and priced',
    text: 'Find the right tool for any job, with what it does and what it costs.',
    buttonLabel: 'Open the directory',
    buttonHref: '#join',
    tools: [
      { name: 'ChatGPT', tag: 'AI assistant', price: 'Free plan', url: 'https://chatgpt.com', domain: 'chatgpt.com', logo: '', glow: '#10a37f' },
      { name: 'Claude', tag: 'AI assistant', price: 'Free plan', url: 'https://claude.ai', domain: 'claude.ai', logo: '', glow: '#da7958' },
      { name: 'Midjourney', tag: 'Images from prompts', price: 'Paid', url: 'https://midjourney.com', domain: 'midjourney.com', logo: '', glow: '' },
      { name: 'ElevenLabs', tag: 'AI voices', price: 'Free plan', url: 'https://elevenlabs.io', domain: 'elevenlabs.io', logo: '', glow: '' },
      { name: 'Runway', tag: 'AI video', price: 'Free plan', url: 'https://runwayml.com', domain: 'runwayml.com', logo: '', glow: '' },
      { name: 'Cursor', tag: 'AI code editor', price: 'Free plan', url: 'https://cursor.com', domain: 'cursor.com', logo: '', glow: '' },
      { name: 'Perplexity', tag: 'Search with sources', price: 'Free plan', url: 'https://perplexity.ai', domain: 'perplexity.ai', logo: '', glow: '#22bdd2' },
      { name: 'n8n', tag: 'Workflow automation', price: 'Free plan', url: 'https://n8n.io', domain: 'n8n.io', logo: '', glow: '#f04d75' },
      { name: 'HeyGen', tag: 'AI avatars', price: 'Free plan', url: 'https://heygen.com', domain: 'heygen.com', logo: '', glow: '#33d7bc' },
      { name: 'Suno', tag: 'Songs from prompts', price: 'Free plan', url: 'https://suno.com', domain: 'suno.com', logo: '', glow: '' },
    ],
  };

  renderContent() {
    const p = this.props;
    return html`<div class="o-in">
      <div class="o-shead"><div>
        ${p.eyebrow ? html`<p class="o-lbl"${this.editable('eyebrow')}>${p.eyebrow}</p>` : ''}
        <h2 class="o-t2"${this.editable('title')}>${p.title}</h2>
        ${p.text ? html`<p class="o-p"${this.editable('text')}>${p.text}</p>` : ''}
      </div>${this.button(p.buttonLabel, p.buttonHref, { variant: 'outline', attrs: this.editable('buttonLabel') })}</div>
      <div class="o-tgrid">${p.tools.map((t, i) => {
        const glow = /^#[0-9a-f]{3,8}$/i.test(t.glow || '') ? t.glow : '#c9ccd3';
        return html`<a class="o-tc o-tc2" style="--g:${glow}" href="${safeUrl(t.url || '#')}" target="_blank" rel="noopener noreferrer">
          <span class="tl">${logo(t)}</span>${t.price ? html`<em>${t.price}</em>` : ''}
          <b${this.editable(`tools.${i}.name`)}>${t.name}</b><span${this.editable(`tools.${i}.tag`)}>${t.tag}</span>
          <i class="o-tgo" aria-hidden="true">Visit${svg('out')}</i>
        </a>`;
      })}</div>
    </div>`;
  }
}
