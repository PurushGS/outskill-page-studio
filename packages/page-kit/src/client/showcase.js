/**
 * Behaviour for the showcase blocks (loaded only on pages that use them):
 * the hero's feature cards taking turns, the "who it's for" chart, the
 * Shorts row arrows, Copy buttons on prompts and the sticky bottom bar.
 * Everything works from the markup alone, so the studio preview runs it too.
 */
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const GRADES = ['navy', 'amber', 'rose'];

for (const stage of document.querySelectorAll('[data-hero-stage]')) heroCards(stage);
for (const row of document.querySelectorAll('[data-reels]')) reelArrows(row);
popIn(document.querySelectorAll('[data-pop]'));
stickyBar();

document.addEventListener('click', (event) => {
  const stage = event.target.closest('.o-cc[data-stage]');
  if (stage) pickStage(stage);
  const copy = event.target.closest('[data-copy-text]');
  if (copy) copyPrompt(copy);
});
document.addEventListener('mouseover', (event) => {
  const stage = event.target.closest?.('.o-cc[data-stage]');
  if (stage) pickStage(stage);
});

/** One card shows at a time; arrows step through them, and they turn every 7 s unless the pointer is over them. */
function heroCards(stage) {
  const cards = [...stage.querySelectorAll('[data-hcard]')];
  if (cards.length < 2) return;
  const lights = stage.closest('.ox')?.querySelectorAll('.o-hl') ?? [];
  let at = 0;
  let hold = false;
  const show = (i) => {
    const next = (i + cards.length) % cards.length;
    if (next === at) return;
    cards[at].classList.add('swap');
    setTimeout(() => {
      cards[at].hidden = true;
      cards[at].classList.remove('swap');
      at = next;
      cards[at].hidden = false;
      stage.dataset.s = String(at % 3);
      const grade = GRADES[at % GRADES.length];
      for (const light of lights) light.classList.toggle('on', light.classList.contains(`g-${grade}`));
    }, 220);
  };
  stage.addEventListener('click', (event) => {
    const arrow = event.target.closest('[data-hs]');
    if (!arrow) return;
    event.preventDefault();
    show(at + Number(arrow.dataset.hs));
  });
  stage.addEventListener('pointerenter', () => { hold = true; });
  stage.addEventListener('pointerleave', () => { hold = false; });
  if (!reducedMotion) setInterval(() => { if (!hold && !document.hidden) show(at + 1); }, 7000);
}

function pickStage(button) {
  const chart = button.closest('[data-stages]');
  if (!chart) return;
  chart.dataset.on = button.dataset.stage;
  for (const b of chart.querySelectorAll('.o-cc')) b.classList.toggle('on', b === button);
}

function reelArrows(row) {
  const box = row.previousElementSibling?.querySelector('.o-arrows');
  if (!box) return;
  const prev = box.querySelector('[data-reel-scroll="-1"]');
  const next = box.querySelector('[data-reel-scroll="1"]');
  const update = () => {
    const over = row.scrollWidth > row.clientWidth + 4;
    box.hidden = !over;
    prev.disabled = row.scrollLeft <= 2;
    next.disabled = row.scrollLeft + row.clientWidth >= row.scrollWidth - 2;
  };
  box.addEventListener('click', (event) => {
    const arrow = event.target.closest('[data-reel-scroll]');
    if (arrow) row.scrollBy({ left: Number(arrow.dataset.reelScroll) * row.clientWidth * 0.8, behavior: 'smooth' });
  });
  row.addEventListener('scroll', update, { passive: true });
  addEventListener('resize', update);
  update();
}

async function copyPrompt(button) {
  const text = button.closest('.o-prompt')?.querySelector('pre')?.textContent ?? '';
  const label = button.lastChild;
  const original = label.textContent;
  try {
    await navigator.clipboard.writeText(text);
    label.textContent = 'Copied';
  } catch {
    label.textContent = 'Select and copy';
  }
  setTimeout(() => { label.textContent = original; }, 2000);
}

/** The guide's form card pops up once it scrolls into view (shown straight away without IntersectionObserver). */
function popIn(cards) {
  if (!cards.length) return;
  if (!('IntersectionObserver' in window)) return cards.forEach((c) => c.classList.add('is-in'));
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
  }, { threshold: 0.15 });
  cards.forEach((c) => io.observe(c));
}

/** The bar steps aside while the hero, the application form or the footer (each with its own button) is on screen. */
function stickyBar() {
  const dock = document.querySelector('[data-dock]');
  if (!dock || !('IntersectionObserver' in window)) return;
  const watched = [
    document.querySelector('.pk-sc-hero'),
    document.querySelector('[data-lead-form]')?.closest('.pk-block'),
    document.querySelector('.pk-sc-footer'),
  ].filter(Boolean);
  const seen = new Map();
  const io = new IntersectionObserver((entries) => {
    for (const entry of entries) seen.set(entry.target, entry.isIntersecting);
    dock.classList.toggle('away', [...seen.values()].some(Boolean));
  }, { threshold: [0, 0.15] });
  for (const el of watched) io.observe(el);
  if (!watched.length) dock.classList.remove('away');
}
