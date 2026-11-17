import * as utils from 'src/utils.js';

// The real window.top is the page Vitest reuses for every spec file it runs there; state put on it would leak
// into the next file. Specs that need an iframe stub inIframe() or getWindowTop().
const { getWindowTop, getParentWindow, getFrameElement } = utils;

/* eslint-disable no-import-assign -- the namespace is a stubbable facade (test/vitest/stubs.mjs) */
utils.getWindowTop = function (win = window) {
  const top = getWindowTop(win);
  return top === getWindowTop(window) ? window.self : top;
};
// Keeps a spec that stubs getWindowTop() from climbing out of its own frame.
utils.getParentWindow = (win) => win === window.self ? win : getParentWindow(win);
utils.getFrameElement = (win) => win === window.self ? null : getFrameElement(win);
/* eslint-enable no-import-assign */
