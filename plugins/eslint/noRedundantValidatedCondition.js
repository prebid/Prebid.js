const SCOPE_NODES = new Set([
  'FunctionDeclaration',
  'FunctionExpression',
  'ArrowFunctionExpression',
  'ClassDeclaration',
  'ClassExpression'
]);

function exits(node) {
  if (!node) return false;
  if (['ReturnStatement', 'ThrowStatement', 'ContinueStatement', 'BreakStatement'].includes(node.type)) return true;
  if (node.type === 'BlockStatement') return node.body.some(exits);
  return false;
}

function unwrap(node) {
  while (node && (node.type === 'ParenthesizedExpression' || node.type === 'ChainExpression')) {
    node = node.expression;
  }
  return node;
}

function collectFalsyImpliedTruthyIdentifiers(node, names = new Set()) {
  node = unwrap(node);
  if (!node) return names;
  if (node.type === 'UnaryExpression' && node.operator === '!') {
    const argument = unwrap(node.argument);
    if (argument?.type === 'Identifier') {
      names.add(argument.name);
    }
  } else if (node.type === 'LogicalExpression' && node.operator === '||') {
    collectFalsyImpliedTruthyIdentifiers(node.left, names);
    collectFalsyImpliedTruthyIdentifiers(node.right, names);
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
    const sourceCode = context.sourceCode || context.getSourceCode();

    function inspect(node, knownTruthy) {
      node = unwrap(node);
      if (!node || typeof node.type !== 'string' || SCOPE_NODES.has(node.type)) return;
      if (node.type === 'LogicalExpression' && node.left.type === 'Identifier' && knownTruthy.has(node.left.name)) {
        context.report({
          node: node.left,
          message: `Redundant conditional: '${node.left.name}' is already known to be truthy.`
        });
      }
      for (const key of sourceCode.visitorKeys[node.type] || []) {
        const child = node[key];
        if (Array.isArray(child)) child.forEach(child => inspect(child, knownTruthy));
        else inspect(child, knownTruthy);
      }
    }

    function checkStatements(statements) {
      const knownTruthy = new Set();

      for (const statement of statements) {
        inspect(statement, knownTruthy);

        if (statement.type === 'IfStatement' && exits(statement.consequent) && statement.alternate == null) {
          collectFalsyImpliedTruthyIdentifiers(statement.test).forEach(name => knownTruthy.add(name));
        }

        if (statement.type === 'BlockStatement') {
          checkStatements(statement.body);
        } else if (statement.type === 'IfStatement') {
          if (statement.consequent?.type === 'BlockStatement') checkStatements(statement.consequent.body);
          if (statement.alternate?.type === 'BlockStatement') checkStatements(statement.alternate.body);
        }
      }
    }

    function checkFunction(node) {
      if (node.body?.type === 'BlockStatement') {
        checkStatements(node.body.body);
      }
    }

    return {
      Program(node) {
        checkStatements(node.body);
      },
      FunctionDeclaration: checkFunction,
      FunctionExpression: checkFunction,
      ArrowFunctionExpression: checkFunction
    };
  }
};
