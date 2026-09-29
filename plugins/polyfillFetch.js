const definePolyfillProvider = require('@babel/helper-define-polyfill-provider').default;
const path = require('path');

/**
 * A babel polyfill provider for the Fetch standard, built on the same
 * `@babel/helper-define-polyfill-provider` machinery as
 * babel-plugin-polyfill-corejs3.
 *
 * core-js deliberately does not cover the fetch family, so `useBuiltIns` cannot
 * supply it. This fills that hole with the same three properties the corejs
 * provider gives us:
 *
 *  - target driven: nothing is injected for browsers that support the API
 *    natively, because `shouldInjectPolyfill` runs the compat data below through
 *    babel's own target resolution. Raise the target list and the ponyfill (and
 *    whatwg-fetch with it) disappears from the bundle.
 *  - `usage-pure`: references are rewritten to local imports, so `window.fetch`
 *    and friends are left alone. Prebid is a guest on someone else's page.
 *  - usage driven: only the APIs actually referenced are pulled in.
 *
 * The whole family shares AbortController's support data on purpose. Mixing a
 * ponyfilled `Headers`/`signal` with the *native* `fetch` does not work - native
 * fetch reads those through internal slots, so a foreign `Headers` is rejected
 * or silently emptied and a foreign `signal` is silently ignored. So either all
 * of it is native, or all of it comes from the ponyfill. AbortController is the
 * newest of the group, and therefore decides for the rest.
 */

// Oldest version of each browser that supports AbortController, i.e. the point
// at which the native fetch stack is complete enough for prebid's use.
// Sources: caniuse `abortcontroller`.
const FETCH_STACK_SUPPORT = {
  chrome: '66',
  edge: '16',
  firefox: '57',
  safari: '12.1',
  ios: '12.2',
  opera: '53',
  samsung: '9.0',
  node: '15.0'
};

// Names this provider is willing to supply.
const PROVIDES = ['fetch', 'Headers', 'Request', 'Response', 'AbortController', 'AbortSignal'];

// Where to import them from. This runs inside webpack, over precompiled sources,
// so callers pass the precompiled location of libraries/fetchPonyfill; the source
// path is only a fallback for using this plugin directly (e.g. in tests).
const SOURCE_PONYFILL = path.resolve(__dirname, '../libraries/fetchPonyfill/index.js');

// The globals that a member expression may be rooted at - `window.fetch` has to
// be caught as well as a bare `fetch`, since src/ajax.ts uses the former.
const GLOBAL_OBJECTS = ['window', 'globalThis', 'self', 'global'];

module.exports = definePolyfillProvider(({ shouldInjectPolyfill, method, debug }, { ponyfill }) => {
  if (method !== 'usage-pure') {
    throw new Error(`polyfillFetch only supports method: 'usage-pure' (got '${method}'). ` +
      `The point of this provider is to avoid touching globals.`);
  }
  const source = ponyfill || SOURCE_PONYFILL;

  function inject(name, utils, path) {
    if (!PROVIDES.includes(name)) return false;
    if (!shouldInjectPolyfill(name)) return false;
    debug(name);
    path.replaceWith(utils.injectNamedImport(source, name, `_${name}`));
    return true;
  }

  return {
    name: 'fetch-ponyfill',

    // every name shares the same support data - see the note above
    polyfills: Object.fromEntries(PROVIDES.map((name) => [name, FETCH_STACK_SUPPORT])),

    usagePure(meta, utils, path) {
      // bare reference: `new Headers(..)`, `new AbortController()`, `fetch(..)`
      if (meta.kind === 'global') {
        return inject(meta.name, utils, path);
      }
      // member reference: `window.fetch`, `globalThis.Request`, ..
      if (meta.kind === 'property' && GLOBAL_OBJECTS.includes(meta.object)) {
        return inject(meta.key, utils, path);
      }
      return false;
    }
  };
});
