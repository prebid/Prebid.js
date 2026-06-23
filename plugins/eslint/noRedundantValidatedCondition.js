const SCOPE_NODES = new Set([
  'BlockStatement',
  'CatchClause',
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

function collectPatternIdentifiers(node, names) {
  node = unwrap(node);
  if (!node) return;
  if (node.type === 'Identifier') {
    names.add(node.name);
  } else if (node.type === 'RestElement') {
    collectPatternIdentifiers(node.argument, names);
  } else if (node.type === 'AssignmentPattern') {
    collectPatternIdentifiers(node.left, names);
  } else if (node.type === 'ArrayPattern') {
    node.elements.forEach(element => collectPatternIdentifiers(element, names));
  } else if (node.type === 'ObjectPattern') {
    node.properties.forEach((property) => {
      if (property.type === 'Property') collectPatternIdentifiers(property.value, names);
      else collectPatternIdentifiers(property.argument, names);
    });
  }
}

function collectInvalidatedIdentifiers(node, names = new Set()) {
  node = unwrap(node);
  if (!node || typeof node.type !== 'string' || SCOPE_NODES.has(node.type)) return names;

  if (node.type === 'AssignmentExpression') {
    collectPatternIdentifiers(node.left, names);
  } else if (node.type === 'UpdateExpression') {
    collectPatternIdentifiers(node.argument, names);
  } else if (node.type === 'VariableDeclarator') {
    collectPatternIdentifiers(node.id, names);
  }

  for (const key of collectInvalidatedIdentifiers.visitorKeys[node.type] || []) {
    const child = node[key];
    if (Array.isArray(child)) child.forEach(child => collectInvalidatedIdentifiers(child, names));
    else collectInvalidatedIdentifiers(child, names);
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
    collectInvalidatedIdentifiers.visitorKeys = sourceCode.visitorKeys;

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
        collectInvalidatedIdentifiers(statement).forEach(name => knownTruthy.delete(name));
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
