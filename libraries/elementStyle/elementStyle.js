import { onLayoutEpochEnd, startLayoutEpoch } from '../../src/utils/layoutEpoch.js';

let cache = new WeakMap();
onLayoutEpochEnd(() => { cache = new WeakMap(); });

// Copy the properties used for visibility checks: CSSStyleDeclaration itself is live.
export function getElementStyle(element, win = element.ownerDocument?.defaultView || window) {
  let elements = cache.get(win);
  if (!elements) {
    elements = new WeakMap();
    cache.set(win, elements);
  }
  if (!elements.has(element)) {
    startLayoutEpoch();
    const { display, visibility, position } = win.getComputedStyle(element);
    elements.set(element, { display, visibility, position });
  }
  return elements.get(element);
}
