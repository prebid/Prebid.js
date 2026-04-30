import { dep } from 'libraries/percentInView/percentInView.js';

let enabled = true;
let orig = dep.getElement;

dep.getElement = (el) => {
  if (enabled) {
    // some tests mock elements with objects that do not work with IntersectionObserver.observe,
    // causing TypeError noise in the output.
    // Short out the .observe during tests - but only during tests, as the TypeError is legitimate
    // if it happens on a real page
    return el instanceof Element ? el : null;
  } else {
    return orig.call(dep, el);
  }
}

export function enable() {
  enabled = true;
}

export function disable() {
  enabled = false;
}
