
const path = require('path');
const _ = require('lodash');
const { CODE_EXT, isInDirectory } = require('./resolver.js');

const MODULES_PATH = path.resolve(__dirname, '../../modules');
const CREATIVE_PATH = path.resolve(__dirname, '../../creative');



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
    !CODE_EXT.includes(parsedImportPath.ext)
  ) {
    context.report(node, `import "${importPath}" should include extension, one of ${CODE_EXT.join(', ')}`);
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
