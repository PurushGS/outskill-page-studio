import { Component } from '../core/Component.js';
import { html, safeUrl } from '../core/html.js';

/**
 * A row of AI tool names with logos. Logo is any image link; leave it empty
 * and the tool's first letter is shown instead, so a page never shows a
 * broken image.
 */
export class ToolStrip extends Component {
  static type = 'tool-strip';
  static label = 'Tool logos';
  static schema = [
    { key: 'caption', label: 'Caption above the logos', kind: 'text' },
    {
      key: 'tools',
      label: 'Tools',
      kind: 'list',
      itemSchema: [
        { key: 'name', label: 'Name', kind: 'text' },
        { key: 'logoUrl', label: 'Logo image link (optional)', kind: 'url' },
      ],
    },
  ];
  static defaults = {
    caption: 'Step-by-step guides for the AI tools you already use.',
    tools: [{ name: 'ChatGPT', logoUrl: '' }, { name: 'Claude', logoUrl: '' }, { name: 'Gemini', logoUrl: '' }],
  };

  renderContent() {
    const { caption, tools } = this.props;
    return html`<div class="pk-container">
      ${caption ? html`<p class="pk-muted pk-tool-strip__caption"${this.editable('caption')}>${caption}</p>` : ''}
      <ul class="pk-tool-strip">${tools.map((tool, i) => html`<li>
        ${tool.logoUrl
          ? html`<img src="${safeUrl(tool.logoUrl)}" alt="" width="24" height="24" loading="lazy"${this.editable(`tools.${i}.logoUrl`)}>`
          : html`<span class="pk-tool-strip__mono" aria-hidden="true">${String(tool.name || '?').charAt(0)}</span>`}
        <span${this.editable(`tools.${i}.name`)}>${tool.name}</span>
      </li>`)}</ul>
    </div>`;
  }
}
