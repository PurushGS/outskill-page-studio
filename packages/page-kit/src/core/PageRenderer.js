import { html, raw } from './html.js';
import { Theme } from '../theme/Theme.js';

/**
 * Turns a page definition (plain JSON) into a complete HTML document.
 *
 * Runs unchanged in the Cloudflare Worker (live pages) and in the browser
 * (studio preview), which is what keeps "what you edit" and "what ships"
 * identical.
 */
export class PageRenderer {
  /**
   * @param {object} deps
   * @param {ComponentRegistry} deps.registry
   * @param {IconLibrary} deps.icons
   * @param {string} [deps.assetBase]  origin prefix for /packages/... URLs ('' = same origin)
   */
  constructor({ registry, icons, assetBase = '' }) {
    this.registry = registry;
    this.icons = icons;
    this.assetBase = assetBase;
  }

  /**
   * @param {object} page
   * @param {object} [options]
   * @param {'live'|'preview'} [options.mode]  preview never sends real leads
   */
  render(page, { mode = 'live' } = {}) {
    const theme = new Theme(page.theme);
    const context = { icons: this.icons, page, mode };
    const blocks = page.blocks.map((block) => this.registry.create(block, context).render());

    return `<!doctype html>${html`<html lang="${page.meta.lang || 'en'}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${page.meta.title}</title>
<meta name="description" content="${page.meta.description || ''}">
<meta property="og:title" content="${page.meta.title}">
<meta property="og:description" content="${page.meta.description || ''}">
${page.meta.image ? html`<meta property="og:image" content="${page.meta.image}">` : ''}
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="${theme.fontStylesheetUrl()}">
<link rel="stylesheet" href="${this.assetBase}/packages/page-kit/styles/page-kit.css">
<style>${raw(theme.toCss())}</style>
</head>
<body>
${blocks}
${this.#bootScript(page, mode)}
</body>
</html>`}`;
  }

  #bootScript(page, mode) {
    const config = {
      slug: page.slug,
      mode,
      endpoint: `${this.assetBase}/api/leads`,
    };
    // "<" is escaped so page text can never close the script tag early.
    const json = JSON.stringify(config).replace(/</g, '\\u003c');
    return raw(`<script type="module">import { bootLeadFlow } from '${this.assetBase}/packages/lead-flow/src/browser.js'; bootLeadFlow(${json});</script>`);
  }
}
