const _ = require('lodash');
const { flagErrors } = require('./validateImports.js');
const noGlobal = require('eslint/lib/rules/no-restricted-globals.js');

function getName(node) {
  return node.type === 'Literal' ? node.value : node.name;
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
        };
      }
    },
    'no-member': {
      meta: {
        schema: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              target: { type: 'string' },
              name: { type: 'string' },
              message: { type: 'string' }
            },
            required: ['name', 'message'],
            additionalProperties: false
          },
          uniqueItems: true,
          minItems: 1
        },

        messages: {
          noMember: "Unexpected use of '{{target}}.{{name}}'. {{message}}",
        }
      },

      create(context) {
        return {
          MemberExpression(node) {
            context.options.forEach(({name, target, message}) => {
              if (target === node.object.name && getName(node.property) === name) {
                context.report({
                  node,
                  messageId: 'noMember',
                  data: {
                    name,
                    target: target || '',
                    message
                  }
                });
              }
            });
          }
        }
      }
    },
    'no-global': Object.assign({}, noGlobal, {
      // no-restricted-global that also looks for `window.GLOBAL`
      create(context) {
        const globals = Object.fromEntries(
          context.options.map(option => typeof option === 'string' ? [option, null] : [option.name, option.message])
        )
        return Object.assign(noGlobal.create(context), {
          MemberExpression(node) {
            const name = getName(node.property);
            if (node.object.name === 'window' && globals.hasOwnProperty(name)) {
              const customMessage = globals[name];
              context.report({
                node,
                messageId: customMessage == null ? 'defaultMessage' : 'customMessage',
                data: {
                  name,
                  customMessage
                }
              })
            }
          }
        })
      }
    }),
  }
};
