const path = require('path');
const resolveFrom = require('resolve-from');
const fs = require('fs');

const TEST_DIR = path.resolve(__dirname, '../../test');
const ROOT_DIR = path.resolve(__dirname, '../..');

const CODE_EXT = ['.ts', '.js', '.mjs']

function isInDirectory(filename, dir) {
  const rel = path.relative(dir, filename);
  return rel && !rel.startsWith('..') && !path.isAbsolute(rel);
}

module.exports = {
  interfaceVersion: 2,
  isInDirectory,
  CODE_EXT,
  resolve(source, file) {
    const {name, dir, ext} = path.parse(source);
    const fileDir = path.dirname(file);
    const isTest = isInDirectory(file, TEST_DIR);
    const fileNames = (!ext || CODE_EXT.includes(ext) ? [''].concat(CODE_EXT) : [ext])
      .map((ext) => path.format({name, dir, ext}))
    const candidates = fileNames.map(fn => [fileDir, fn]);
    if (isTest && !source.startsWith('.')) {
      // tests can do import like 'src/auction.js'
      candidates.push(...fileNames.map(fn => [ROOT_DIR, `./${fn}`]))
    }
    const matching = Object.keys(
      candidates.reduce((matches, [from, path]) => {
        let resolved;
        try {
          resolved = resolveFrom(from, path);
          matches[resolved] = true;
        } catch (e) {
        }
        return matches;
      }, {})
    );
    if (matching.length === 0) {
      return {
        found: false,
        message: `import ${source} cannot be resolved`
      }
    } else if (matching.length > 1) {
      return {
        found: false,
        message: `import ${source} is ambiguous, could refer to any of ${matching.join(', ')}`
      }
    }
    return {
      found: true,
      path: fs.existsSync(matching[0]) ? matching[0]: null,
    }
  }
}
