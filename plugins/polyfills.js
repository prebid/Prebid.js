const corejs3Polyfills = require('babel-plugin-polyfill-corejs3');
const fs = require('node:fs/promises');
const path = require('node:path');

/**
 * This plugins generates a JSON summary of core-js polyfills that would be injected with usage: 'global".
*/
module.exports = function (api, options, dirname) {
  const outputFile = options.output;
  const polyfills = {
    global: new Set(),
    files: {}
  };
  const files = [];
  let dirty = true;
  const polyfillInjector = corejs3Polyfills.default(api, {
    method: 'usage-global',
    version: require('../node_modules/core-js/package.json').version,
    proposals: false,
    shouldInjectPolyfill(name, toBeInjected) {
      if (toBeInjected) {
        const currentFile = files[files.length - 1];
        if (!polyfills.files.hasOwnProperty(currentFile)) {
          polyfills.files[currentFile] = new Set();
        }
        if (!polyfills.files[currentFile].has(name)) {
          polyfills.files[currentFile].add(name);
          dirty = true;
        }
        if (!polyfills.global.has(name)) {
          polyfills.global.add(name);
          dirty = true;
        }
      }
      return false;
    }
  }, dirname);

  const writeSummary = (() => {
    let handle;
    return function () {
      if (handle != null) {
        clearTimeout(handle);
      }
      handle = setTimeout(async () => {
        handle = null;
        try {
          await fs.mkdir(path.dirname(outputFile), { recursive: true });
          await fs.writeFile(outputFile, JSON.stringify({
            global: Array.from(polyfills.global).toSorted(),
            files: Object.fromEntries(
              Object.entries(polyfills.files).map(([file, polys]) => [file, Array.from(polys).toSorted()])
            )
          }, null, 2));
        } catch (e) {
          console.error('Could not write polyfill summary', e);
        }
      }, 500);
    };
  })();
  polyfillInjector.pre = ((orig) => {
    return function (file, ...args) {
      files.push(file.opts.sourceFileName);
      return orig.call(this, file, ...args);
    };
  })(polyfillInjector.pre);
  polyfillInjector.post = ((orig) => {
    return async function (...args) {
      const result = orig.apply(this, args);
      files.pop();
      if (dirty) {
        writeSummary();
        dirty = false;
      }
      return result;
    };
  })(polyfillInjector.post);
  return polyfillInjector;
};
