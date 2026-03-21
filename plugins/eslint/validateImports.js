
const path = require('path');
const _ = require('lodash');
const resolveFrom = require('resolve-from');
const MODULES_PATH = path.resolve(__dirname, '../../modules');
const CREATIVE_PATH = path.resolve(__dirname, '../../creative');

const CODE_EXT = ['.js', '.ts'];
const IMPORT_EXT = CODE_EXT.join(CODE_EXT);

function isInDirectory(filename, dir) {
  const rel = path.relative(dir, filename);
  return rel && !rel.startsWith('..') && !path.isAbsolute(rel);
}


function flagErrors(context, node, importPath) {
  let absFileDir = path.dirname(context.getFilename());
  let absImportPath;
  try {
    absImportPath = importPath.startsWith('.') ? path.resolve(absFileDir, importPath) : require.resolve(importPath);
  } catch (e) {
    context.report(node, e.message)
    return;
  }
  const parsedImportPath = path.parse(importPath);

  // don't allow extension-less local imports
  if (
    !importPath.match(/^\w+/) &&
    !IMPORT_EXT.includes(parsedImportPath.ext)
  ) {
    context.report(node, `import "${importPath}" should include extension, one of ${CODE_EXT.join(', ')}`);
  }

  const matching = (CODE_EXT.includes(parsedImportPath.ext) ? CODE_EXT : [parsedImportPath.ext])
    .filter((ext) => {
      try {
        resolveFrom(absFileDir, path.format({
          name: parsedImportPath.name,
          dir: parsedImportPath.dir,
          ext
        }));
      } catch (e) {
        return false;
      }
      return true;
    }).length;

  if (matching === 0) {
    return context.report(node, `import "${importPath}" cannot be resolved`);
  } else if (matching > 1) {
    return context.report(node, `import "${importPath}" is ambiguous, both .js and .ts files exists`);
  }

  if (
    Array.isArray(_.get(context, ['options', 0])) &&
    importPath.match(/^\w+/) &&
    !context.options[0].some(name => importPath.startsWith(name))
  ) {
    context.report(node, `import "${importPath}" not in import whitelist`);
  } else if (
    context?.options?.[0].some(val => val === false) &&
    path.relative(absFileDir, absImportPath).startsWith('..')
  ) {
    context.report(node, `non-local imports are not allowed`)
  } else {
    // do not allow cross-module imports
    if (isInDirectory(absImportPath, MODULES_PATH) && (!isInDirectory(absImportPath, absFileDir) || absFileDir === MODULES_PATH)) {
      context.report(node, `import "${importPath}": importing from modules is not allowed`);
    }

    // do not allow imports into `creative`
    if (isInDirectory(absImportPath, CREATIVE_PATH) && !isInDirectory(absFileDir, CREATIVE_PATH) && absFileDir !== CREATIVE_PATH) {
      context.report(node, `import "${importPath}": importing from creative is not allowed`);
    }

    // do not allow imports outside `creative`
    if ((isInDirectory(absFileDir, CREATIVE_PATH) || absFileDir === CREATIVE_PATH) && !isInDirectory(absImportPath, CREATIVE_PATH) && absImportPath !== CREATIVE_PATH) {
      context.report(node, `import "${importPath}": importing from outside creative is not allowed`);
    }
  }
}

module.exports = {
  flagErrors
}
