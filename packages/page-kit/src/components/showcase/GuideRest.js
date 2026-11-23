import { html, safeUrl } from '../../core/html.js';
import { ShowcaseBlock, svg } from './ShowcaseBlock.js';
import { GuideSteps } from './GuideSteps.js';

/**
 * Every step after the open ones, blurred and locked, below the application
 * form. The steps are read from the page's Guide steps section, so the two
 * never disagree; each one links to the form.
 */
export class GuideRest extends ShowcaseBlock {
  static type = 'sc-guide-rest';
  static label = 'Showcase · Locked steps';
  static tone = 'light';
  static schema = [
    { key: 'label', label: 'Label on each locked step, e.g. Unlock to read', kind: 'text' },
    { key: 'href', label: 'Where locked steps link (usually the form, #join)', kind: 'url' },
  ];
  static defaults = { label: 'Unlock to read', href: '#join' };

  renderContent() {
    const source = (this.context.page?.blocks ?? []).find((b) => b.type === GuideSteps.type);
    const props = source ? { ...GuideSteps.defaults, ...source.props } : null;
    const from = props ? GuideSteps.openCount(props) : 0;
    const locked = props ? props.steps.slice(from) : [];
    if (!locked.length) return html`<div class="o-in"></div>`;
    return html`<div class="o-in"><div class="o-tbody"><div></div><div class="o-content o-locked">
      ${locked.map((s, i) => html`<a class="o-step o-lockstep" href="${safeUrl(this.props.href || '#join')}">
        <p class="o-lbl o-lock-tag">${svg('lock')}Step ${String(from + i + 1).padStart(2, '0')}${this.props.label ? html` · <span${this.editable('label')}>${this.props.label}</span>` : ''}</p>
        <div class="o-blurred" aria-hidden="true"><h2>${s.title}</h2><div class="o-fake"><i></i><i></i><i class="s"></i><i></i><b></b><i class="s"></i></div></div>
      </a>`)}
    </div></div></div>`;
  }
}
