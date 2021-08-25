
let path = require('path');
let _ = require('lodash');
let resolveFrom = require('resolve-from');

function flagErrors(context, node, importPath) {
  let absFileDir = path.dirname(context.getFilename());
  let absImportPath = path.resolve(absFileDir, importPath);

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
    let absModulePath = path.resolve(__dirname, '../../modules');

    // don't allow import of any files directly within modules folder or index.js files within modules' sub-folders
    if (
      path.dirname(absImportPath) === absModulePath || (
        absImportPath.startsWith(absModulePath) &&
        path.basename(absImportPath) === 'index.js'
      )
    ) {
      context.report(node, `import "${importPath}" cannot require module entry point`);
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
