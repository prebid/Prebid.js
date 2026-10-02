const {relPath, isInDirectory, TEST_DIR, getFreeName, getModuleName, getMetadata, PREBID_ROOT } = require('./utils.js');
const t = require('@babel/core').types;
const osPath = require('path');

const NAMES = {
  'src/ajax.js': {
    names: ['ajax', 'ajaxBuilder', 'fetch', 'fetcherFactory'],
    message: 'Request credentials may be unexpectedly denied. Consider using one of the "qualified" or "noCreds" variants of ajax / fetch instead.'
  }
}

const getCallers = (() => {
  const cache = {};
  return function (filename, message) {
    if (!cache.hasOwnProperty(filename)) {
      const moduleName = getModuleName(osPath.resolve(PREBID_ROOT, filename));
      const metadata = getMetadata(moduleName);
      if (moduleName != null && metadata != null) {
        const callers = metadata.components.reduce((summary, {gvlid, componentName, componentType}) => {
          summary.gvlids.add(gvlid)
          summary.callers.push([componentType, componentName])
          return summary;
        }, {gvlids: new Set(), callers: []});
        if (!callers.callers.length) {
          throw new Error(`Unexpected empty component list from metadata for '${moduleName}'`);
        }
        if (callers.gvlids.size > 1) {
          console.warn(`WARNING: more than one GVL ID is associated with '${filename}'. ${message}`)
        }
        cache[filename] = callers.callers;
      } else {
        console.warn(`WARNING: cannot determine moduleType/moduleName to associate with '${filename}'. If this is a new adapter it may need metadata to be updated.  ${message}`)
        cache[filename] = [];
      }
    }
    return cache[filename];
  }
})();

module.exports = function (api, options) {
  return {
    visitor: {
      ImportDeclaration(path, state) {
        /**
         * This replaces imports like:
         *
         * import {ajax} from 'src/ajax.js';
         *
         * With:
         *
         * import {ajax as __ajax0} from 'src/ajax.js';
         * const ajax = __ajax0.withCallers([['bidder', 'example']]);
         *
         * Using the importer's filename and the 'metadata' folder to decide the argument passed to `withCallers`.
         */

        if (isInDirectory(state.filename, TEST_DIR)) return;
        const relFilename = osPath.relative(PREBID_ROOT, state.filename);
        if (path.node.source?.value?.endsWith('.ts')) {
          throw new Error('callerContext must run after pbjsGlobals');
        }
        if (path.node.source?.value) {
          Object.entries(NAMES).forEach(([file, {names, message}]) => {
            if (path.node.source.value === relPath(state.filename, file)) {
              path.node.specifiers.forEach((specifier) => {
                if (t.isImportNamespaceSpecifier(specifier)) {
                  console.warn(`WARNING: File '${relFilename}' imports * from '${file}. ${message}`)
                  return;
                }
                if (t.isImportSpecifier(specifier) && names.includes(specifier.imported.name)) {
                  const callers = getCallers(relFilename, message);
                  if (callers != null) {
                    const repl = getFreeName(path, `__${specifier.imported.name}`);
                    const node = api.parse(`const ${specifier.local.name} = ${repl}.withCallers(${JSON.stringify(callers)})`).program.body[0];
                    path.insertAfter(node);
                    specifier.local.name = repl;
                  }
                }
              })
            }
          })
        }
      }
    }
  };
};

