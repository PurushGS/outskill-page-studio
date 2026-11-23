import { Component } from '../core/Component.js';
import { html, raw } from '../core/html.js';
import { eyebrow, multiline } from '../core/ui.js';
import { COUNTRIES, DEFAULT_COUNTRY } from '../../../lead-flow/src/countries.js';
import { parseFormUrl } from '../../../attribution/src/formats.js';

const TICK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>';

/**
 * The sign-up form. It only renders markup; behaviour (validation, the
 * form's questions, submit, success state) lives in lead-flow's
 * LeadFormController, which finds the form through the data-lead-form
 * attribute and fills [data-questions] with the questions of the form
 * named by the page's Form URL.
 */
export class LeadForm extends Component {
  static type = 'lead-form';
  static label = 'Application form';
  static schema = [
    {
      key: 'layout',
      label: 'Look',
      kind: 'choice',
      options: [
        { value: 'classic', label: 'Classic (text beside the form)' },
        { value: 'showcase', label: 'Showcase (green panel + white form card, dark section)' },
        { value: 'guide', label: 'Guide (same card on white, under the guide steps; perks become ticks)' },
      ],
    },
    { key: 'eyebrow', label: 'Small label above title', kind: 'text' },
    { key: 'title', label: 'Title', kind: 'textarea' },
    { key: 'subtitle', label: 'Subtitle', kind: 'textarea' },
    {
      key: 'perks',
      label: 'Perks next to the form',
      kind: 'list',
      itemSchema: [
        { key: 'icon', label: 'Icon', kind: 'icon' },
        { key: 'text', label: 'Text', kind: 'text' },
      ],
    },
    {
      key: 'stats',
      label: 'Numbers under the text (Showcase look)',
      kind: 'list',
      itemSchema: [
        { key: 'value', label: 'Number, e.g. 763', kind: 'text' },
        { key: 'label', label: 'Label, e.g. AI Tools', kind: 'text' },
      ],
    },
    { key: 'formTitle', label: 'Form title', kind: 'text' },
    { key: 'submitLabel', label: 'Submit button text', kind: 'text' },
    { key: 'whatsappConsent', label: 'WhatsApp consent text', kind: 'text' },
    { key: 'privacyNote', label: 'Note under the button', kind: 'text' },
    { key: 'successTitle', label: 'Success title', kind: 'text' },
    { key: 'successText', label: 'Success message', kind: 'textarea' },
    { key: 'whatsappLabel', label: '"Join WhatsApp" button text', kind: 'text' },
  ];
  static defaults = {
    layout: 'classic',
    eyebrow: '',
    title: 'Get the free material',
    subtitle: '',
    perks: [],
    stats: [],
    formTitle: 'Unlock it now',
    submitLabel: 'Send me the material',
    whatsappConsent: 'Send updates to my WhatsApp',
    privacyNote: 'No spam. Unsubscribe any time.',
    successTitle: 'Thanks for signing up!',
    successText: 'We’ve sent this resource to your email and WhatsApp. You’re a valuable Outskill learner. We’re redirecting you to the world’s largest AI community now.',
    whatsappLabel: 'Join the WhatsApp community',
  };

  /** The Showcase and Guide looks use the showcase blocks' stylesheet (see PageRenderer). */
  get stylesheet() {
    return this.#showcase || this.#guide ? 'showcase' : null;
  }

  get #showcase() {
    return this.props.layout === 'showcase';
  }

  get #guide() {
    return this.props.layout === 'guide';
  }

  render() {
    if (!this.#showcase && !this.#guide) return super.render();
    const look = this.#guide ? 'ox--light o-guideform' : 'ox--dark o-signup';
    return html`<section class="pk-block ox ${look} pk-${LeadForm.type}" id="${this.id}" data-block-id="${this.id}" data-block-type="${LeadForm.type}">${this.renderContent()}</section>`;
  }

  renderContent() {
    const p = this.props;
    if (this.#guide) {
      // Lines up with the guide steps' reading column (an empty sidebar column on the left).
      return html`<div class="o-in"><div class="o-tbody"><div></div><div class="o-content"><div class="o-unlock o-pop" data-pop>
        <div class="o-ul-l">
          ${p.eyebrow ? html`<p class="o-lbl lime"${this.editable('eyebrow')}>${p.eyebrow}</p>` : ''}
          <h2${this.editable('title')}>${multiline(p.title)}</h2>
          ${p.subtitle ? html`<p${this.editable('subtitle')}>${p.subtitle}</p>` : ''}
          ${p.perks.length ? html`<ul>${p.perks.map((perk, i) => html`<li>${raw(TICK)}<span${this.editable(`perks.${i}.text`)}>${perk.text}</span></li>`)}</ul>` : ''}
        </div>
        <div class="o-join" id="join">${this.#panel()}</div>
      </div></div></div></div>`;
    }
    if (this.#showcase) {
      return html`<div class="o-in"><div class="o-ctab">
        <div class="o-csum">
          ${p.eyebrow ? html`<p class="o-lbl lime"${this.editable('eyebrow')}>${p.eyebrow}</p>` : ''}
          <h2 class="o-t2"${this.editable('title')}>${multiline(p.title)}</h2>
          ${p.subtitle ? html`<p class="o-p"${this.editable('subtitle')}>${p.subtitle}</p>` : ''}
          ${p.stats.length ? html`<ul class="o-stats">${p.stats.map((s, i) => html`<li><b${this.editable(`stats.${i}.value`)}>${s.value}</b><span${this.editable(`stats.${i}.label`)}>${s.label}</span></li>`)}</ul>` : ''}
        </div>
        <div class="o-join" id="join">${this.#panel()}</div>
      </div></div>`;
    }
    return html`<div class="pk-container pk-lead-form__layout" id="join">
      <div class="pk-lead-form__copy">
        ${eyebrow(p.eyebrow, this.editable('eyebrow'))}
        <h2 class="pk-h2"${this.editable('title')}>${multiline(p.title)}</h2>
        ${p.subtitle ? html`<p class="pk-lead"${this.editable('subtitle')}>${p.subtitle}</p>` : ''}
        ${p.perks.length ? html`<ul class="pk-perks">${p.perks.map((perk, i) => html`<li><span${this.editable(`perks.${i}.icon`)}>${this.icon(perk.icon)}</span><span${this.editable(`perks.${i}.text`)}>${perk.text}</span></li>`)}</ul>` : ''}
      </div>
      ${this.#panel()}
    </div>`;
  }

  /** The form and its success state; the same markup in both looks, so LeadFormController works unchanged. */
  #panel() {
    const p = this.props;
    const { slug, campaign = {} } = this.context.page;
    const form = parseFormUrl(campaign.formUrl);
    return html`<div class="pk-panel">
        <form class="pk-form" id="application-form" data-lead-form data-slug="${slug}" data-form-url="${campaign.formUrl || ''}" data-form-id="${form?.formId ?? ''}" novalidate>
          ${p.formTitle ? html`<h3 class="pk-h3"${this.editable('formTitle')}>${p.formTitle}</h3>` : ''}
          ${this.#field('name', html`<input id="${this.id}-name" name="name" autocomplete="name" placeholder="Full name">`, 'Full name')}
          ${this.#field('email', html`<input id="${this.id}-email" name="email" type="email" inputmode="email" autocomplete="email" autocapitalize="off" spellcheck="false" placeholder="Email address">`, 'Email address')}
          <div class="pk-field">
            <label class="pk-sr-only" for="${this.id}-phone">WhatsApp number</label>
            <div class="pk-phone">
              <select name="country" aria-label="Country code">${COUNTRIES.map((c) => html`<option value="${c.code}"${c.code === DEFAULT_COUNTRY ? html` selected` : ''}>${c.code} ${c.dial}</option>`)}</select>
              <input id="${this.id}-phone" name="phone" type="tel" inputmode="tel" autocomplete="tel-national" placeholder="WhatsApp number">
            </div>
            <p class="pk-error" data-error-for="phone"></p>
          </div>
          <div class="pk-questions" data-questions></div>
          ${this.#honeypot()}
          <label class="pk-check"><input type="checkbox" name="whatsappOptIn" checked><span${this.editable('whatsappConsent')}>${p.whatsappConsent}</span></label>
          <button class="pk-btn pk-btn--primary pk-btn--block" type="submit"${this.editable('submitLabel')}>${p.submitLabel}</button>
          <p class="pk-form__status" role="status" aria-live="polite"></p>
          <small class="pk-muted pk-center"${this.editable('privacyNote')}>${p.privacyNote}</small>
        </form>
        <div class="pk-success" data-lead-success hidden>
          <span class="pk-success__icon">${this.icon('check')}</span>
          <h3 class="pk-h3"${this.editable('successTitle')}>${p.successTitle}</h3>
          <p class="pk-muted"${this.editable('successText')}>${p.successText}</p>
          <div class="pk-success__links" data-resource-links></div>
          <a class="pk-btn pk-btn--whatsapp pk-btn--block" data-whatsapp-link href="#" target="_blank" rel="noopener">${this.icon('whatsapp')}${p.whatsappLabel}</a>
          <p class="pk-muted pk-redirect-note" data-redirect-note aria-live="polite" hidden></p>
        </div>
      </div>`;
  }

  #field(name, input, label) {
    return html`<div class="pk-field"><label class="pk-sr-only" for="${this.id}-${name}">${label}</label>${input}<p class="pk-error" data-error-for="${name}"></p></div>`;
  }

  /**
   * Invisible to people, tempting to bots: anything typed here marks the
   * submission as spam. Cheaper and friendlier than a CAPTCHA.
   */
  #honeypot() {
    return html`<div class="pk-hp" aria-hidden="true"><label>Company website<input name="company_website" tabindex="-1" autocomplete="off"></label></div>`;
  }
}
