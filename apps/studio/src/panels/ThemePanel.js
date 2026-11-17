import { el } from '../dom.js';
import { Panel, field } from './Panel.js';
import { COLOR_TOKENS, FONT_CHOICES } from '../../../../packages/page-kit/src/index.js';

/** Colours, fonts and corner roundness. Also offers a few ready-made palettes. */
const PRESETS = {
  'Outskill dark': { background: '#0b0b0c', surface: '#151517', text: '#f5f5f4', muted: '#a1a1aa', accent: '#b8ef43', accentText: '#0b0b0c', border: '#26262a' },
  'Warm light': { background: '#fffaf3', surface: '#ffffff', text: '#1c1917', muted: '#57534e', accent: '#ea580c', accentText: '#ffffff', border: '#e7e1d8' },
  'Ocean': { background: '#06121f', surface: '#0d2136', text: '#e6f1ff', muted: '#8aa4c0', accent: '#38bdf8', accentText: '#04121f', border: '#1c3552' },
  'Clean white': { background: '#ffffff', surface: '#f6f7f9', text: '#0f172a', muted: '#475569', accent: '#4f46e5', accentText: '#ffffff', border: '#e2e8f0' },
};

export class ThemePanel extends Panel {
  render() {
    return [
      el('h3', { class: 'panel__title' }, 'Quick palettes'),
      el('div', { class: 'presets' }, Object.entries(PRESETS).map(([name, colors]) =>
        el('button', {
          type: 'button',
          class: 'preset',
          title: name,
          onclick: () => this.store.mutate((page) => { page.theme.colors = { ...colors }; }),
        }, el('span', { class: 'preset__swatch', style: `background:${colors.background};box-shadow:inset -14px 0 0 ${colors.accent}` }), name),
      )),
      el('h3', { class: 'panel__title' }, 'Colours'),
      Object.entries(COLOR_TOKENS).map(([token, label]) => this.#colorRow(token, label)),
      el('h3', { class: 'panel__title' }, 'Fonts'),
      this.#fontSelect('heading', 'Headings'),
      this.#fontSelect('body', 'Body text'),
      el('h3', { class: 'panel__title' }, 'Shape'),
      this.#radiusSlider(),
    ];
  }

  #colorRow(token, label) {
    const path = ['theme', 'colors', token];
    const value = this.store.get(path);
    const hex = el('input', { class: 'input input--mono', value, maxlength: 7, 'aria-label': `${label} hex value` });
    const picker = el('input', { type: 'color', class: 'color-swatch', value: expandHex(value), 'aria-label': label });

    picker.addEventListener('input', () => {
      hex.value = picker.value;
      this.store.set(path, picker.value);
    });
    hex.addEventListener('input', () => {
      const v = hex.value.trim();
      // Only commit complete hex values so a half-typed colour never breaks the preview.
      if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v)) {
        picker.value = expandHex(v);
        this.store.set(path, v);
      }
    });
    return el('div', { class: 'color-row' }, picker, el('span', { class: 'color-row__label' }, label), hex);
  }

  #fontSelect(role, label) {
    const path = ['theme', 'fonts', role];
    const current = this.store.get(path);
    return field(label, el('select', { class: 'input', onchange: (e) => this.store.set(path, e.target.value) },
      FONT_CHOICES.map((f) => el('option', { value: f, selected: f === current }, f)),
    ));
  }

  #radiusSlider() {
    const output = el('output', {}, `${this.store.get(['theme', 'radius'])}px`);
    return field(el('span', {}, 'Corner roundness ', output), el('input', {
      type: 'range', min: 0, max: 32, step: 1, value: this.store.get(['theme', 'radius']),
      oninput: (e) => {
        output.textContent = `${e.target.value}px`;
        this.store.set(['theme', 'radius'], Number(e.target.value));
      },
    }));
  }
}

function expandHex(value) {
  return /^#[0-9a-f]{3}$/i.test(value) ? `#${[...value.slice(1)].map((c) => c + c).join('')}` : value;
}
