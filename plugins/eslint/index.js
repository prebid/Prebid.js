const _ = require('lodash');
const { flagErrors } = require('./validateImports.js');
const { checkDeclarationFilename } = require('./filename.js');

const COMPARISON_OPERATORS = new Set(['<', '<=', '>', '>=']);

function isFunctionLike(node) {
  return node && (node.type === 'FunctionDeclaration' || node.type === 'FunctionExpression' || node.type === 'ArrowFunctionExpression');
}

function getVariable(context, node) {
  let scope = context.sourceCode.getScope(node);
  while (scope) {
    const variable = scope.set.get(node.name);
    if (variable) {
      return variable;
    }
    scope = scope.upper;
  }
}

function isUndefinedIdentifier(node) {
  return node?.type === 'Identifier' && node.name === 'undefined';
}

function isImplicitTemplateConversionReference(context, node) {
  if (node.type !== 'Identifier') {
    return false;
  }
  const variable = getVariable(context, node);
  return variable?.defs.some(def => {
    if (def.type === 'FunctionName') {
      return true;
    }
    return def.node?.type === 'VariableDeclarator' && (isFunctionLike(def.node.init) || isUndefinedIdentifier(def.node.init));
  });
}

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
    'no-implicit-operand-conversion': {
      meta: {
        docs: {
          description: 'disallows operands that are implicitly converted before comparisons or string interpolation'
        },
        schema: []
      },
      create: function(context) {
        return {
          BinaryExpression(node) {
            if (!COMPARISON_OPERATORS.has(node.operator)) {
              return;
            }
            if (node.left.type === 'UnaryExpression' && node.left.operator === '!') {
              context.report({
                node: node.left,
                message: 'Do not compare a negated value; compare the original operand explicitly instead.'
              });
            }
            if (node.right.type === 'UnaryExpression' && node.right.operator === '!') {
              context.report({
                node: node.right,
                message: 'Do not compare a negated value; compare the original operand explicitly instead.'
              });
            }
          },
          TemplateLiteral(node) {
            node.expressions.forEach(expression => {
              if (isImplicitTemplateConversionReference(context, expression)) {
                context.report({
                  node: expression,
                  message: 'Avoid interpolating values that require implicit string conversion.'
                });
              }
            });
          }
        };
      }
    },
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
