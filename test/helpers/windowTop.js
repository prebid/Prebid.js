import * as utils from 'src/utils.js';

// The real window.top is the page Vitest reuses for every spec file it runs there; state put on it would leak
// into the next file. Specs that need an iframe stub inIframe() or getWindowTop().
function getWindowTop() {
  return window.self;
}

// eslint-disable-next-line no-import-assign -- the namespace is a stubbable facade (test/vitest/stubs.mjs)
utils.getWindowTop = getWindowTop;
