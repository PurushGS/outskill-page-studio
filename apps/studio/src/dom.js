/**
 * el('button', { class: 'btn', onclick: fn }, 'Save') → <button class="btn">Save</button>
 * Children can be strings, nodes, arrays or null. Text is always set as text,
 * never parsed as HTML.
 */
export function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value === null || value === undefined || value === false) continue;
    if (key.startsWith('on')) node.addEventListener(key.slice(2), value);
    else if (key === 'class') node.className = value;
    else if (key === 'html') node.innerHTML = value; // only for trusted SVG from IconLibrary
    else if (key === 'value') node.value = value; // a property: <textarea> ignores the value attribute
    else if (key in node && typeof value !== 'string') node[key] = value;
    else node.setAttribute(key, value === true ? '' : value);
  }
  node.append(...children.flat().filter((c) => c !== null && c !== undefined && c !== false));
  return node;
}

export function debounce(fn, ms) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}
