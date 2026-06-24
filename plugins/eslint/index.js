const _ = require('lodash');
const { flagErrors } = require('./validateImports.js');
const { checkDeclarationFilename } = require('./filename.js');
const noRedundantValidatedCondition = require('./noRedundantValidatedCondition.js');
const noExtraFunctionArgs = require('./noExtraFunctionArgs.js');

module.exports = {
  rules: {
    'declaration-filename': {
      meta: {
        docs: {
          description: 'enforces consistent names for .d.ts files'
        }
      },
      create: function(context) {
        return {
          Program(node) {
            checkDeclarationFilename(context, node);
          }
        };
      }
    },
    'no-redundant-validated-condition': noRedundantValidatedCondition,
    'no-extra-function-args': noExtraFunctionArgs,
    'validate-imports': {
      meta: {
        docs: {
          description: 'validates module imports can be found without custom webpack resolvers, are in module whitelist, and not module entry points'
        },
        schema: {
          type: 'array'
        }
      },
      create: function (context) {
        return {
          "CallExpression[callee.name='require']"(node) {
            let importPath = _.get(node, ['arguments', 0, 'value']);
            if (importPath) {
              flagErrors(context, node, importPath);
            }
          },
          ImportDeclaration(node) {
            let importPath = node.source.value.trim();
            if (node.importKind !== 'type') {
              flagErrors(context, node, importPath);
            }
          },
          'ExportNamedDeclaration[source]'(node) {
            let importPath = node.source.value.trim();
            flagErrors(context, node, importPath);
          }
        };
      }
    },
  }
};
