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
};

export function enable() {
  enabled = true;
}

export function disable() {
  enabled = false;
}

let frameRectEnabled = true;
const frameElement = window.frameElement;

if (frameElement != null) {
  // karma runs tests inside an iframe (context.html) that is offset from the top window, while the
  // debug page runs them in the top window. Report the top window's viewport as the containing
  // frame's box, so that viewability measurements do not depend on which of the two is in use.
  const original = frameElement.getBoundingClientRect;
  frameElement.getBoundingClientRect = function () {
    if (!frameRectEnabled) {
      return original.call(this);
    }
    const doc = window.top.document.documentElement;
    return {
      left: 0,
      top: 0,
      x: 0,
      y: 0,
      right: doc.clientWidth,
      bottom: doc.clientHeight,
      width: doc.clientWidth,
      height: doc.clientHeight
    };
  };
}

export function enableFrameRect() {
  frameRectEnabled = true;
}

/**
 * Report the real box of the frame containing the tests, for tests that need the frame's actual
 * position or size. Remember to `enableFrameRect()` afterwards.
 */
export function disableFrameRect() {
  frameRectEnabled = false;
}
