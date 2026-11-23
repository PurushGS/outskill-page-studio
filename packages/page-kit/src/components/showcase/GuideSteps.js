import { html, safeUrl } from '../../core/html.js';
import { ShowcaseBlock, logo, richText, svg } from './ShowcaseBlock.js';

/**
 * The reading area of a guide page: a sticky sidebar ("In this guide" with
 * the later steps locked, and "Tools used") and the open steps (the first two
 * by default) with their prompts and notes. The application form (Look: Guide)
 * follows, then "Locked steps" shows every other step blurred.
 */
export class GuideSteps extends ShowcaseBlock {
  static type = 'sc-guide-steps';
  static label = 'Showcase · Guide steps';
  static tone = 'light';
  static schema = [
    { key: 'indexLabel', label: 'Sidebar: steps heading', kind: 'text' },
    { key: 'openSteps', label: 'How many steps are open (the rest are locked)', kind: 'text' },
    {
      key: 'steps',
      label: 'Steps',
      kind: 'list',
      itemSchema: [
        { key: 'title', label: 'Step title', kind: 'text' },
        { key: 'body', label: 'Text (start lines with "- " for bullets or "1. " for numbers)', kind: 'textarea' },
        { key: 'promptLabel', label: 'Prompt label (optional)', kind: 'text' },
        { key: 'prompt', label: 'Prompt (optional, gets a Copy button)', kind: 'textarea' },
        { key: 'note', label: 'Tip under the step (optional)', kind: 'textarea' },
      ],
    },
    { key: 'toolsLabel', label: 'Sidebar: tools heading (empty hides the tools)', kind: 'text' },
    { key: 'tools', label: 'Tools used', kind: 'list', itemSchema: [{ key: 'name', label: 'Name', kind: 'text' }, { key: 'url', label: 'Link', kind: 'url' }, { key: 'logo', label: 'Logo image link (optional)', kind: 'url' }] },
  ];
  static defaults = {
    indexLabel: 'In this guide',
    openSteps: '2',
    steps: [
      { title: 'Before You Start', body: '- A paid ChatGPT plan (Plus or higher). Agent mode isn’t on the free plan.\n- A LinkedIn account and an Indeed account, both logged in.\n- Your current resume as a file (PDF or Word).\n- 2 to 4 hours, since you stay nearby to clear CAPTCHAs.', promptLabel: '', prompt: '', note: '' },
      { title: 'Load Your Resume and Map Roles', body: 'This maps your resume to the job titles and keywords worth targeting.\n1. Open a new chat in ChatGPT.\n2. Upload your resume as an attachment.\n3. Paste the prompt below and press Enter.', promptLabel: 'Prompt 1: Recruiter map', prompt: 'Act as a senior recruiter. Based on my resume, list the 20 job titles I’m most qualified for and the exact keywords ATS systems scan for in each one.', note: 'If most jobs later come back with a match score of 0, your titles were too broad. Re-run this prompt and ask it to be more specific.' },
      { title: 'Build Your Master Resume', body: '', promptLabel: '', prompt: '', note: '' },
      { title: 'Turn on Agent Mode', body: '', promptLabel: '', prompt: '', note: '' },
      { title: 'Search and Apply to Jobs', body: '', promptLabel: '', prompt: '', note: '' },
      { title: 'Make the Interviews More Likely', body: '', promptLabel: '', prompt: '', note: '' },
    ],
    toolsLabel: 'Tools used',
    tools: [
      { name: 'ChatGPT', url: 'https://chatgpt.com', logo: '' },
      { name: 'LinkedIn', url: 'https://linkedin.com', logo: '' },
      { name: 'Indeed', url: 'https://indeed.com', logo: '' },
    ],
  };

  /** Shared with "Locked steps", so both always agree on which steps are open. */
  static openCount(props) {
    return Math.max(0, Math.min(props.steps.length, Number.parseInt(props.openSteps, 10) || 0));
  }

  renderContent() {
    const p = this.props;
    const open = GuideSteps.openCount(p);
    const two = (n) => String(n).padStart(2, '0');
    return html`<div class="o-in"><div class="o-tbody">
      <aside class="o-idx">
        ${p.steps.length ? html`<p class="o-lbl"${this.editable('indexLabel')}>${p.indexLabel}</p>
          <div class="o-prog"><b style="width:${Math.round((open / p.steps.length) * 100)}%"></b></div>
          <div class="o-its">${p.steps.map((s, i) => {
            const locked = i >= open;
            return html`<a class="o-it${locked ? ' lk' : ''}" href="${locked ? '#join' : `#${this.id}-step-${i + 1}`}"${this.editable(`steps.${i}.title`)}><i>${two(i + 1)}</i><span>${s.title}</span>${locked ? svg('lock') : ''}</a>`;
          })}</div>` : ''}
        ${p.toolsLabel && p.tools.length ? html`<p class="o-lbl o-gap"${this.editable('toolsLabel')}>${p.toolsLabel}</p>
          ${p.tools.map((t, i) => html`<a class="o-tool" href="${safeUrl(t.url || '#')}" target="_blank" rel="noopener noreferrer"${this.editable(`tools.${i}.name`)}>
            <span class="tl">${logo({ ...t, domain: hostOf(t.url) })}</span><span class="tn">${t.name}<small>${hostOf(t.url)}</small></span>${svg('out')}
          </a>`)}` : ''}
      </aside>
      <div class="o-content">
        ${p.steps.slice(0, open).map((s, i) => this.#step(s, i))}
      </div>
    </div></div>`;
  }

  #step(s, i) {
    return html`<section class="o-step" id="${this.id}-step-${i + 1}">
      <p class="o-lbl">Step ${String(i + 1).padStart(2, '0')}</p>
      <h2${this.editable(`steps.${i}.title`)}>${s.title}</h2>
      ${s.body ? html`<div class="o-body"${this.editable(`steps.${i}.body`)}>${richText(s.body)}</div>` : ''}
      ${s.prompt ? html`<div class="o-prompt"><div class="o-prompt-h"><span${this.editable(`steps.${i}.promptLabel`)}>${s.promptLabel || 'Prompt'}</span><button type="button" class="o-copy" data-copy-text>${svg('copy')}Copy</button></div><pre${this.editable(`steps.${i}.prompt`)}>${s.prompt}</pre></div>` : ''}
      ${s.note ? html`<p class="o-note"${this.editable(`steps.${i}.note`)}>${s.note}</p>` : ''}
    </section>`;
  }
}

/** "chatgpt.com" from "https://www.chatgpt.com/…" */
function hostOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}
