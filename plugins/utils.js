const path = require('path');
const fs = require('fs');
const PREBID_ROOT = path.resolve(__dirname, '..');
const TEST_DIR = path.resolve(__dirname, '../test');

function getModuleName(filename) {
  const modPath = path.parse(path.relative(PREBID_ROOT, filename));
  if (!['.ts', '.js'].includes(modPath.ext.toLowerCase())) {
    return null;
  }
  if (modPath.dir === 'modules') {
    // modules/moduleName.js -> moduleName
    return modPath.name;
  }
  if (modPath.name.toLowerCase() === 'index' && path.dirname(modPath.dir) === 'modules') {
    // modules/moduleName/index.js -> moduleName
    return path.basename(modPath.dir);
  }
  return null;
}

const getMetadata = (() => {
  const cache = {};
  return function(moduleName) {
    if (!moduleName) return null;
    if (!cache.hasOwnProperty(moduleName)) {
      const metadataFile = path.resolve(__dirname, `../metadata/modules/${moduleName}.json`);
      if (fs.existsSync(metadataFile)) {
        cache[moduleName] = JSON.parse(fs.readFileSync(metadataFile).toString())
      } else {
        cache[moduleName] = null;
      }
    }
    return cache[moduleName];
  }
})();

// on Windows, require paths are not filesystem paths
const SEP_PAT = new RegExp(path.sep.replace(/\\/g, '\\\\'), 'g')

function relPath(from, toRelToProjectRoot) {
  let result = path.relative(path.dirname(from), path.join(PREBID_ROOT, toRelToProjectRoot)).replace(SEP_PAT, '/');
  if (!result.startsWith('.')) {
    result = `./${result}`
  }
  return result;
}

function isInDirectory(filename, dir) {
  const rel = path.relative(dir, filename);
  return rel && !rel.startsWith('..') && !path.isAbsolute(rel);
}

function getFreeName(path, prefix = '__var') {
  let i = 0;
  let name;
  do {
    name = `${prefix}${i++}`;
  } while (path.scope.hasBinding(name));
  return name;
}

module.exports = {
  PREBID_ROOT,
  TEST_DIR,
  getModuleName,
  getMetadata,
  relPath,
  isInDirectory,
  getFreeName
};
