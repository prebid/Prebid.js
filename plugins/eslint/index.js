const _ = require('lodash');
const { flagErrors } = require('./validateImports.js');

module.exports = {
  rules: {
    'no-outerText': {
      meta: {
        docs: {
          description: '.outerText property on DOM elements should not be used due to performance issues'
        },
        messages: {
          noInnerText: 'Use of `.outerText` is not allowed. Use `.textContent` instead.',
        }
      },
      create: function(context) {
        return {
          MemberExpression(node) {
            if (node.property && node.property.name === 'outerText') {
              context.report({
                node: node.property,
                messageId: 'noOuterText',
              });
            }
          }
        }
      }
    },
    'no-innerText': {
      meta: {
        docs: {
          description: '.innerText property on DOM elements should not be used due to performance issues'
        },
        messages: {
          noInnerText: 'Use of `.innerText` is not allowed. Use `.textContent` instead.',
        }
      },
      create: function(context) {
        return {
          MemberExpression(node) {
            if (node.property && node.property.name === 'innerText') {
              context.report({
                node: node.property,
                messageId: 'noInnerText',
              });
            }
          }
        }
      }
    },
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
