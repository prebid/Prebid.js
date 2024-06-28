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
    },
    'no-cookie-or-localstorage': {
      meta: {
        docs: {
          description: 'Disallow use of document.cookie or localStorage in files matching *BidAdapter.js'
        },
        messages: {
          noCookie: 'Usage of document.cookie is not allowed in *BidAdapter.js files.',
          noLocalStorage: 'Usage of localStorage is not allowed in *BidAdapter.js files.',
        }
      },
      create: function(context) {
        const filename = context.getFilename();
        const isBidAdapterFile = /.*BidAdapter\.js$/.test(filename);

        if (!isBidAdapterFile) {
          return {};
        }

        return {
          MemberExpression(node) {
            if (
              (node.object.name === 'document' && node.property.name === 'cookie') ||
              (node.object.name === 'localStorage' &&
                (node.property.name === 'getItem' ||
                 node.property.name === 'setItem' ||
                 node.property.name === 'removeItem' ||
                 node.property.name === 'clear'))
            ) {
              context.report({
                node,
                messageId: node.object.name === 'document' ? 'noCookie' : 'noLocalStorage',
              });
            }
          }
        }
      }
    },
    'no-dom-manipulation': {
      meta: {
        docs: {
          description: 'Disallow use of methods to insert elements into the document in files matching *BidAdapter.js'
        },
        messages: {
          noInsertElement: 'Usage of insertElement is not allowed in *BidAdapter.js files.',
          noAppendChild: 'Usage of appendChild is not allowed in *BidAdapter.js files.',
          noDomManipulation: 'Direct DOM manipulation is not allowed in *BidAdapter.js files.'
        }
      },
      create: function(context) {
        const filename = context.getFilename();
        const isBidAdapterFile = /.*BidAdapter\.js$/.test(filename);

        if (!isBidAdapterFile) {
          return {};
        }

        return {
          CallExpression(node) {
            const calleeName = node.callee.name;
            if (calleeName === 'insertElement' || calleeName === 'appendChild' ||
                calleeName === 'insertBefore' || calleeName === 'replaceChild' ||
                calleeName === 'createElement' || calleeName === 'createElementNS' ||
                calleeName === 'createDocumentFragment' ||
                calleeName === 'innerHTML') {
              context.report({
                node,
                messageId: calleeName === 'insertElement' ? 'noInsertElement' :
                          calleeName === 'appendChild' ? 'noAppendChild' : 'noDomManipulation'
              });
            }
          },
          MemberExpression(node) {
            if (node.property && node.property.name === 'innerHTML') {
              context.report({
                node: node.property,
                messageId: 'noDomManipulation',
              });
            }
          }
        }
      }
    }
  }
};
