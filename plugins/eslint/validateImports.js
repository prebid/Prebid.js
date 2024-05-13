
const path = require('path');
const _ = require('lodash');
const resolveFrom = require('resolve-from');
const MODULES_PATH = path.resolve(__dirname, '../../modules');
const CREATIVE_PATH = path.resolve(__dirname, '../../creative');

function isInDirectory(filename, dir) {
  const rel = path.relative(dir, filename);
  return rel && !rel.startsWith('..') && !path.isAbsolute(rel);
}

function flagErrors(context, node, importPath) {
  let absFileDir = path.dirname(context.getFilename());
  let absImportPath = importPath.startsWith('.') ? path.resolve(absFileDir, importPath) : require.resolve(importPath);

  try {
    resolveFrom(absFileDir, importPath);
  } catch (e) {
    return context.report(node, `import "${importPath}" cannot be resolved`);
  }

  if (
    Array.isArray(_.get(context, ['options', 0])) &&
    importPath.match(/^\w+/) &&
    !context.options[0].some(name => importPath.startsWith(name))
  ) {
    context.report(node, `import "${importPath}" not in import whitelist`);
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
    if (isInDirectory(absFileDir, CREATIVE_PATH) && !isInDirectory(absImportPath, CREATIVE_PATH) && absImportPath !== CREATIVE_PATH) {
      context.report(node, `import "${importPath}": importing from outside creative is not allowed`);
    }

    // don't allow extension-less local imports
    if (
      !importPath.match(/^\w+/) &&
      !['.js', '.json'].includes(path.extname(absImportPath))
    ) {
      context.report(node, `import "${importPath}" should include extension as .js or .json`);
    }
  }
}

module.exports = {
  rules: {
    'validate-imports': {
      meta: {
        docs: {
          description: 'validates module imports can be found without custom webpack resolvers, are in module whitelist, and not module entry points'
        }
      },
      create: function(context) {
        return {
          "CallExpression[callee.name='require']"(node) {
            let importPath = _.get(node, ['arguments', 0, 'value']);
            if (importPath) {
              flagErrors(context, node, importPath);
            }
          },
          ImportDeclaration(node) {
            let importPath = node.source.value.trim();
            flagErrors(context, node, importPath);
          },
          'ExportNamedDeclaration[source]'(node) {
            let importPath = node.source.value.trim();
            flagErrors(context, node, importPath);
          }
        }
      }
    }
  }
};
