const {MESSAGES, checkAugmentation, isMarkedOptional} = require('../augmentationReachable.js');

const MODULE_STATEMENTS = new Set([
  'ImportDeclaration',
  'ExportNamedDeclaration',
  'ExportAllDeclaration',
  'ExportDefaultDeclaration',
]);

module.exports = {
  meta: {
    docs: {
      description: 'disallows augmenting a module that cannot be part of a consumer\'s program'
    },
    messages: MESSAGES,
    schema: [{
      type: 'object',
      properties: {
        coreEntry: {type: 'string'},
        ignore: {type: 'array', items: {type: 'string'}},
        project: {type: 'string'}
      },
      additionalProperties: false
    }]
  },
  create(context) {
    const options = context.options[0] ?? {};
    const filename = context.filename ?? context.getFilename();
    const cwd = context.cwd ?? process.cwd();
    const sourceCode = context.sourceCode ?? context.getSourceCode();
    // in a file that is not itself a module, `declare module` declares an ambient module rather
    // than augmenting an existing one, and needs no import
    const isModule = sourceCode.ast.body.some(statement => MODULE_STATEMENTS.has(statement.type));

    return {
      'TSModuleDeclaration[id.type="Literal"]': function (node) {
        if (!isModule) return;
        const jsdoc = sourceCode.getCommentsBefore(node)
          .filter(comment => comment.type === 'Block' && comment.value.startsWith('*'))
          .map(comment => comment.value);
        if (isMarkedOptional(jsdoc)) return;
        const problem = checkAugmentation(node.id.value, filename, options, cwd);
        if (problem != null) {
          context.report({node: node.id, ...problem});
        }
      }
    };
  }
};
