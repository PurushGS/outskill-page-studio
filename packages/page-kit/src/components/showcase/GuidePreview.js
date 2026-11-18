import { html } from '../../core/html.js';
import { ShowcaseBlock, TONE_FIELD, svg } from './ShowcaseBlock.js';

/**
 * "See exactly what you'll get": a real guide with its first steps open and
 * the next one blurred behind an unlock card that points at the form.
 */
export class GuidePreview extends ShowcaseBlock {
  static type = 'sc-guide';
  static label = 'Showcase · Guide preview';
  static tone = 'light';
  static schema = [
    TONE_FIELD,
    { key: 'eyebrow', label: 'Small label above title', kind: 'text' },
    { key: 'title', label: 'Title', kind: 'text' },
    { key: 'text', label: 'Text', kind: 'textarea' },
    { key: 'guideTitle', label: 'Guide name (left column)', kind: 'text' },
    { key: 'openSteps', label: 'How many steps are open (the next one is blurred)', kind: 'text' },
    {
      key: 'steps',
      label: 'Steps',
      kind: 'list',
      itemSchema: [
        { key: 'title', label: 'Step title', kind: 'text' },
        { key: 'body', label: 'Text (start lines with "- " for bullets or "1. " for numbers)', kind: 'textarea' },
        { key: 'promptLabel', label: 'Prompt label (optional)', kind: 'text' },
        { key: 'prompt', label: 'Prompt (optional)', kind: 'textarea' },
      ],
    },
    { key: 'unlockTitle', label: 'Unlock card: title', kind: 'text' },
    { key: 'unlockText', label: 'Unlock card: text', kind: 'text' },
    { key: 'unlockLabel', label: 'Unlock card: button text', kind: 'text' },
    { key: 'unlockHref', label: 'Unlock card: button link', kind: 'url' },
    { key: 'unlockNote', label: 'Unlock card: note under the button', kind: 'text' },
  ];
  static defaults = {
    tone: 'light',
    eyebrow: 'Inside every guide',
    title: 'See exactly what you’ll get',
    text: 'Here’s a real guide from the library. The first steps are open. Sign up free to unlock the rest, and every other guide.',
    guideTitle: 'Apply to 100 Jobs in One Night',
    openSteps: '2',
    steps: [
      { title: 'Before you start', body: '- A paid ChatGPT plan (Plus or higher). Agent mode isn’t on the free plan.\n- A LinkedIn account and an Indeed account, both logged in.\n- Your current resume as a file (PDF or Word).\n- 2 to 4 hours, since you stay nearby to clear CAPTCHAs.', promptLabel: '', prompt: '' },
      { title: 'Load your resume and map roles', body: 'This maps your resume to the job titles and keywords worth targeting.\n1. Open a new chat in ChatGPT.\n2. Upload your resume as an attachment.\n3. Paste the prompt below and press Enter.', promptLabel: 'Prompt 1: Recruiter map', prompt: 'Act as a senior recruiter. Read my resume and list the 10 job titles I am most likely to be hired for, with the keywords each one needs.' },
      { title: 'Build your master resume', body: 'Turn your resume into a master version that can be tailored for any role in seconds.', promptLabel: 'Prompt 2: Master resume', prompt: 'Turn my resume into a master version I can tailor for any role in seconds.' },
      { title: 'Turn on agent mode', body: '', promptLabel: '', prompt: '' },
      { title: 'Search and apply to jobs', body: '', promptLabel: '', prompt: '' },
      { title: 'Make the interviews more likely', body: '', promptLabel: '', prompt: '' },
    ],
    unlockTitle: 'Unlock the full guide, free',
    unlockText: '4 more steps, 3 more prompts, and every other workflow in the library.',
    unlockLabel: 'Get free access',
    unlockHref: '#join',
    unlockNote: 'Takes 30 seconds',
  };

  renderContent() {
    const p = this.props;
    const open = Math.max(0, Math.min(p.steps.length, Number.parseInt(p.openSteps, 10) || 0));
    const blurred = p.steps[open];
    return html`<div class="o-in">
      ${p.eyebrow ? html`<p class="o-lbl"${this.editable('eyebrow')}>${p.eyebrow}</p>` : ''}
      <h2 class="o-t2"${this.editable('title')}>${p.title}</h2>
      ${p.text ? html`<p class="o-p"${this.editable('text')}>${p.text}</p>` : ''}
      <div class="o-gwrap">
        <div class="o-gl"><div class="o-gh"${this.editable('guideTitle')}>${p.guideTitle}</div>
          ${p.steps.map((s, i) => html`<div class="o-it${i < open ? ' on' : ''}"${this.editable(`steps.${i}.title`)}><i>${String(i + 1).padStart(2, '0')}</i>${s.title}</div>`)}
        </div>
        <div class="o-gr">
          ${p.steps.slice(0, open).map((s, i) => this.#step(s, i, false))}
          ${blurred ? this.#step(blurred, open, true) : ''}
          ${blurred ? html`<div class="o-gate"><div class="o-gc"><span class="o-lk2">${svg('lock')}</span>
            <div class="o-t3"${this.editable('unlockTitle')}>${p.unlockTitle}</div>
            ${p.unlockText ? html`<p${this.editable('unlockText')}>${p.unlockText}</p>` : ''}
            ${this.button(p.unlockLabel, p.unlockHref, { attrs: this.editable('unlockLabel') })}
            ${p.unlockNote ? html`<small${this.editable('unlockNote')}>${p.unlockNote}</small>` : ''}
          </div></div>` : ''}
        </div>
      </div>
    </div>`;
  }

  #step(s, i, blur) {
    return html`<div class="o-gs${blur ? ' blur' : ''}"${blur ? html` aria-hidden="true"` : ''}>
      <p class="o-lbl">Step ${String(i + 1).padStart(2, '0')}</p>
      <h4${this.editable(`steps.${i}.title`)}>${s.title}</h4>
      <div class="o-body"${this.editable(`steps.${i}.body`)}>${richText(s.body)}</div>
      ${s.prompt ? html`<div class="o-prompt"><div class="o-prompt-h"><span${this.editable(`steps.${i}.promptLabel`)}>${s.promptLabel || 'Prompt'}</span><button type="button" class="o-copy" data-copy-text>${svg('copy')}Copy</button></div><pre${this.editable(`steps.${i}.prompt`)}>${s.prompt}</pre></div>` : ''}
    </div>`;
  }
}

/** Plain text to paragraphs and lists: "- " lines become bullets, "1. " lines a numbered list. */
function richText(text) {
  const out = [];
  let list = null;
  for (const line of String(text || '').split('\n').map((l) => l.trim()).filter(Boolean)) {
    const bullet = line.match(/^[-•]\s+(.*)$/);
    const number = line.match(/^\d+[.)]\s+(.*)$/);
    const kind = bullet ? 'ul' : number ? 'ol' : null;
    if (kind) {
      if (!list || list.kind !== kind) out.push(list = { kind, items: [] });
      list.items.push((bullet || number)[1]);
    } else {
      list = null;
      out.push(html`<p>${line}</p>`);
    }
  }
  return out.map((part) => (part.kind === 'ul' ? html`<ul>${part.items.map((t) => html`<li>${t}</li>`)}</ul>` : part.kind === 'ol' ? html`<ol>${part.items.map((t) => html`<li>${t}</li>`)}</ol>` : part));
}
