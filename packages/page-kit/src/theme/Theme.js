/**
 * A page theme: colours, fonts and corner radius, turned into CSS custom
 * properties. Components only ever reference the variables (var(--pk-accent)),
 * so changing a theme never requires touching component code.
 */

/** Google Fonts the studio offers. Keep the list short so pages stay fast. */
export const FONT_CHOICES = [
  'Fira Sans',
  'Inter',
  'Poppins',
  'Manrope',
  'DM Sans',
  'Space Grotesk',
  'Plus Jakarta Sans',
  'Outfit',
  'Sora',
  'Noto Sans',
];

/** Each colour token, with the label the studio shows next to its picker. */
export const COLOR_TOKENS = {
  background: 'Page background',
  surface: 'Cards & panels',
  text: 'Main text',
  muted: 'Secondary text',
  accent: 'Buttons & highlights',
  accentText: 'Text on buttons',
  border: 'Borders',
};

export const DEFAULT_THEME = Object.freeze({
  colors: {
    background: '#0b0b0c',
    surface: '#151517',
    text: '#f5f5f4',
    muted: '#a1a1aa',
    accent: '#b8ef43',
    accentText: '#0b0b0c',
    border: '#2a2a2e',
  },
  fonts: { heading: 'Fira Sans', body: 'Fira Sans' },
  radius: 14,
});

const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

export class Theme {
  constructor({ colors = {}, fonts = {}, radius } = {}) {
    this.colors = { ...DEFAULT_THEME.colors, ...colors };
    this.fonts = { ...DEFAULT_THEME.fonts, ...fonts };
    this.radius = Number.isFinite(Number(radius)) ? Number(radius) : DEFAULT_THEME.radius;
    this.#validate();
  }

  #validate() {
    for (const [token, value] of Object.entries(this.colors)) {
      if (!HEX.test(value)) throw new Error(`Theme colour "${token}" must be a hex value, got "${value}"`);
    }
    for (const [role, family] of Object.entries(this.fonts)) {
      if (!FONT_CHOICES.includes(family)) throw new Error(`Font "${family}" for ${role} is not in FONT_CHOICES`);
    }
  }

  /** `:root{--pk-background:#0b0b0c;...}` */
  toCss() {
    const vars = Object.entries(this.colors).map(([token, value]) => `--pk-${kebab(token)}:${value}`);
    vars.push(`--pk-font-heading:'${this.fonts.heading}',system-ui,sans-serif`);
    vars.push(`--pk-font-body:'${this.fonts.body}',system-ui,sans-serif`);
    vars.push(`--pk-radius:${this.radius}px`);
    return `:root{${vars.join(';')}}`;
  }

  /** One Google Fonts request covering both heading and body families. */
  fontStylesheetUrl() {
    const families = [...new Set(Object.values(this.fonts))];
    const query = families.map((f) => `family=${encodeURIComponent(f).replace(/%20/g, '+')}:wght@400;500;600;700;800`);
    return `https://fonts.googleapis.com/css2?${query.join('&')}&display=swap`;
  }

  toJSON() {
    return { colors: { ...this.colors }, fonts: { ...this.fonts }, radius: this.radius };
  }
}

function kebab(value) {
  return value.replace(/[A-Z]/g, (ch) => `-${ch.toLowerCase()}`);
}
