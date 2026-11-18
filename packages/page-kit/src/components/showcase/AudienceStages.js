import { html, raw } from '../../core/html.js';
import { ShowcaseBlock, TONE_FIELD } from './ShowcaseBlock.js';

/** "Who is the library for?": a rising curve split into stages; picking one lights its stretch. */
export class AudienceStages extends ShowcaseBlock {
  static type = 'sc-stages';
  static label = 'Showcase · Who it is for';
  static schema = [
    TONE_FIELD,
    { key: 'eyebrow', label: 'Small label above title', kind: 'text' },
    { key: 'title', label: 'Title', kind: 'text' },
    { key: 'selected', label: 'Stage lit when the page opens (1, 2, 3…)', kind: 'text' },
    {
      key: 'stages',
      label: 'Stages (left to right)',
      kind: 'list',
      itemSchema: [
        { key: 'name', label: 'Name, e.g. Beginner', kind: 'text' },
        { key: 'small', label: 'Under the name', kind: 'text' },
        { key: 'capTitle', label: 'Bottom: bold line', kind: 'text' },
        { key: 'capText', label: 'Bottom: text', kind: 'text' },
      ],
    },
  ];
  static defaults = {
    tone: 'dark',
    eyebrow: 'For every stage',
    title: 'Who is the library for?',
    selected: '2',
    stages: [
      { name: 'Beginner', small: 'New to AI tools', capTitle: 'Never built a workflow', capText: 'Run your first one, with every click written out.' },
      { name: 'Builder', small: 'Using AI every week', capTitle: 'Repeating the same work', capText: 'Automate the tasks you do every week.' },
      { name: 'Pro', small: 'Shipping with AI', capTitle: 'Ready to build products', capText: 'Ship AI tools, agents and products of your own.' },
    ],
  };

  renderContent() {
    const p = this.props;
    const n = Math.max(1, p.stages.length);
    const on = Math.min(n, Math.max(1, Number.parseInt(p.selected, 10) || 1)) - 1;
    return html`<div class="o-in">
      ${p.eyebrow ? html`<p class="o-lbl"${this.editable('eyebrow')}>${p.eyebrow}</p>` : ''}
      <h2 class="o-t2"${this.editable('title')}>${p.title}</h2>
      <div class="o-chart" data-on="${on}" data-stages>
        ${curve(this.id, n)}
        <div class="o-cols" role="group" aria-label="Pick your stage" style="grid-template-columns:repeat(${n},1fr)">
          ${p.stages.map((s, i) => html`<button type="button" class="o-cc${i === on ? ' on' : ''}" data-stage="${i}">
            <b${this.editable(`stages.${i}.name`)}>${s.name}</b><small${this.editable(`stages.${i}.small`)}>${s.small}</small>
            <span class="cap"><strong${this.editable(`stages.${i}.capTitle`)}>${s.capTitle}</strong>${s.capText}</span>
          </button>`)}
        </div>
      </div>
    </div>`;
  }
}

/** The design's curve, cut into one lit segment per stage (ids are prefixed by the block id so two charts never clash). */
function curve(blockId, n) {
  const id = String(blockId).replace(/[^\w-]/g, '');
  const d = 'M0 360 C 180 352, 300 330, 400 296 S 640 190, 800 150 S 1080 70, 1200 62';
  const w = 1200 / n;
  const clips = Array.from({ length: n }, (_, i) => `<clipPath id="${id}-c${i}"><rect x="${i * w}" y="0" width="${w}" height="420"/></clipPath>`).join('');
  const segs = Array.from({ length: n }, (_, i) => `<path class="seg s${i}" d="${d}" clip-path="url(#${id}-c${i})"/>`).join('');
  return raw(`<svg class="o-cv" viewBox="0 0 1200 420" preserveAspectRatio="none" aria-hidden="true"><defs>${clips}</defs><path class="base" d="${d}"/>${segs}</svg>`);
}
