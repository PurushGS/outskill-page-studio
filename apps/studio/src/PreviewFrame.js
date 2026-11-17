/**
 * Live preview: renders the page with the same PageRenderer the Worker uses,
 * into a same-origin iframe. Clicking a block in the preview selects it.
 */
export class PreviewFrame {
  /**
   * @param {HTMLIFrameElement} iframe
   * @param {PageRenderer} renderer
   * @param {object} handlers
   * @param {(blockId: string, fieldPath: string|null) => void} handlers.onBlockClick
   * @param {(event: KeyboardEvent) => void} handlers.onKeyDown  keys pressed while the preview has focus
   */
  constructor(iframe, renderer, { onBlockClick, onKeyDown }) {
    this.iframe = iframe;
    this.renderer = renderer;
    this.onBlockClick = onBlockClick;
    this.onKeyDown = onKeyDown;
    this.selectedId = null;
  }

  render(page) {
    let documentHtml;
    try {
      documentHtml = this.renderer.render(page, { mode: 'preview' });
    } catch (err) {
      documentHtml = `<body style="font-family:system-ui;padding:24px;color:#b91c1c">Preview error: ${String(err.message).replace(/</g, '&lt;')}</body>`;
    }
    const scrollY = this.iframe.contentWindow?.scrollY ?? 0;
    this.iframe.addEventListener('load', () => this.#afterLoad(scrollY), { once: true });
    this.iframe.srcdoc = documentHtml;
  }

  setDevice(device) {
    this.iframe.parentElement.dataset.device = device;
  }

  highlight(blockId) {
    this.selectedId = blockId;
    const doc = this.iframe.contentDocument;
    if (!doc) return;
    doc.querySelectorAll('[data-studio-selected]').forEach((n) => n.removeAttribute('data-studio-selected'));
    const node = doc.querySelector(`[data-block-id="${CSS.escape(blockId)}"]`);
    if (node) {
      node.setAttribute('data-studio-selected', '');
      node.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  #afterLoad(scrollY) {
    const doc = this.iframe.contentDocument;
    const style = doc.createElement('style');
    style.textContent = `[data-block-id]{cursor:pointer;outline-offset:-2px}
      [data-block-id]:hover{outline:2px dashed rgba(99,102,241,.55)}
      [data-field]{cursor:text;border-radius:4px}
      [data-field]:hover{box-shadow:0 0 0 2px rgba(99,102,241,.6)}
      [data-studio-selected]{outline:2px solid #6366f1 !important}
      html{scroll-behavior:auto}`;
    doc.head.append(style);
    this.iframe.contentWindow.scrollTo(0, scrollY);
    doc.addEventListener('click', (event) => {
      const block = event.target.closest('[data-block-id]');
      // Links inside the preview should not navigate the iframe away.
      if (event.target.closest('a')) event.preventDefault();
      if (block) this.onBlockClick(block.dataset.blockId, event.target.closest('[data-field]')?.dataset.field ?? null);
    });
    // Keyboard focus moves into the iframe after a click; forward keys so ⌘Z / ⌘S keep working.
    doc.addEventListener('keydown', (event) => this.onKeyDown(event));
    if (this.selectedId) this.highlight(this.selectedId);
  }
}
