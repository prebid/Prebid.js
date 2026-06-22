function exits(node) {
  if (!node) return false;
  if (['ReturnStatement', 'ThrowStatement', 'ContinueStatement', 'BreakStatement'].includes(node.type)) return true;
  if (node.type === 'BlockStatement') return node.body.some(exits);
  return false;
}

function collectNegatedIdentifiers(node, names = new Set()) {
  if (!node) return names;
  if (node.type === 'UnaryExpression' && node.operator === '!' && node.argument.type === 'Identifier') {
    names.add(node.argument.name);
  } else if (node.type === 'LogicalExpression') {
    collectNegatedIdentifiers(node.left, names);
    collectNegatedIdentifiers(node.right, names);
  }
  return names;
}

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'disallow redundant conditionals on identifiers already validated by an exiting guard'
    },
    schema: []
  },
  create(context) {
    function checkStatements(statements) {
      const knownTruthy = new Set();

      for (const statement of statements) {
        if (statement.type === 'IfStatement' && exits(statement.consequent) && statement.alternate == null) {
          collectNegatedIdentifiers(statement.test).forEach(name => knownTruthy.add(name));
        }

        if (statement.type === 'BlockStatement') {
          checkStatements(statement.body);
        } else if (statement.type === 'IfStatement') {
          if (statement.consequent?.type === 'BlockStatement') checkStatements(statement.consequent.body);
          if (statement.alternate?.type === 'BlockStatement') checkStatements(statement.alternate.body);
        }

        const sourceCode = context.sourceCode || context.getSourceCode();
        const inspect = (node) => {
          if (!node || typeof node.type !== 'string') return;
          if (node.type === 'LogicalExpression' && node.left.type === 'Identifier' && knownTruthy.has(node.left.name)) {
            context.report({
              node: node.left,
              message: `Redundant conditional: '${node.left.name}' is already known to be truthy.`
            });
          }
          for (const key of sourceCode.visitorKeys[node.type] || []) {
            const child = node[key];
            if (Array.isArray(child)) child.forEach(inspect);
            else inspect(child);
          }
        };
        inspect(statement);
      }
    }

    return {
      Program(node) {
        checkStatements(node.body);
      },
      BlockStatement(node) {
        checkStatements(node.body);
      }
    };
  }
};
