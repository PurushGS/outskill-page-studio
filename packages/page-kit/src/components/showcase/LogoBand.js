import { html } from '../../core/html.js';
import { ShowcaseBlock, TONE_FIELD, logo } from './ShowcaseBlock.js';

/** "Workflows for the tools you already use": a centred row of tool logos. */
export class LogoBand extends ShowcaseBlock {
  static type = 'sc-logos';
  static label = 'Showcase · Tool logos';
  static tone = 'light';
  static schema = [
    TONE_FIELD,
    { key: 'title', label: 'Title', kind: 'text' },
    { key: 'text', label: 'Text', kind: 'text' },
    { key: 'tools', label: 'Tools', kind: 'list', itemSchema: [{ key: 'name', label: 'Name', kind: 'text' }, { key: 'domain', label: 'Website, e.g. claude.ai', kind: 'text' }, { key: 'logo', label: 'Logo image link (optional)', kind: 'url' }] },
  ];
  static defaults = {
    tone: 'light',
    title: 'Workflows for the tools you already use',
    text: 'Step-by-step guides for every AI tool we cover, sorted by what they do.',
    tools: [
      { name: 'ChatGPT', domain: 'chatgpt.com', logo: '' },
      { name: 'Claude', domain: 'claude.ai', logo: '' },
      { name: 'Gemini', domain: 'gemini.google.com', logo: '' },
      { name: 'ElevenLabs', domain: 'elevenlabs.io', logo: '' },
      { name: 'Midjourney', domain: 'midjourney.com', logo: '' },
      { name: 'Runway', domain: 'runwayml.com', logo: '' },
      { name: 'Cursor', domain: 'cursor.com', logo: '' },
      { name: 'n8n', domain: 'n8n.io', logo: '' },
    ],
  };

  renderContent() {
    const p = this.props;
    return html`<div class="o-in o-net">
      <h2 class="o-net-t"${this.editable('title')}>${p.title}</h2>
      ${p.text ? html`<p class="o-net-p"${this.editable('text')}>${p.text}</p>` : ''}
      <div class="o-logos">${p.tools.map((t, i) => html`<div${this.editable(`tools.${i}.name`)}>${logo(t)}${t.name}</div>`)}</div>
    </div>`;
  }
}
