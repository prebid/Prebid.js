const SCOPE_NODES = new Set([
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

function collectBlockScopedIdentifiers(statements) {
  const names = new Set();
  statements.forEach((statement) => {
    if (statement.type === 'VariableDeclaration' && statement.kind !== 'var') {
      statement.declarations.forEach(declarator => collectPatternIdentifiers(declarator.id, names));
    } else if (statement.type === 'FunctionDeclaration' || statement.type === 'ClassDeclaration') {
      if (statement.id) names.add(statement.id.name);
    }
  });
  return names;
}

function collectInvalidatedIdentifiers(node, names = new Set(), shadowed = new Set()) {
  node = unwrap(node);
  if (!node || typeof node.type !== 'string' || SCOPE_NODES.has(node.type)) return names;

  if (node.type === 'BlockStatement') {
    const blockShadowed = new Set([...shadowed, ...collectBlockScopedIdentifiers(node.body)]);
    node.body.forEach(statement => collectInvalidatedIdentifiers(statement, names, blockShadowed));
    return names;
  }

  if (node.type === 'AssignmentExpression') {
    const assigned = new Set();
    collectPatternIdentifiers(node.left, assigned);
    assigned.forEach((name) => {
      if (!shadowed.has(name)) names.add(name);
    });
  } else if (node.type === 'UpdateExpression') {
    const assigned = new Set();
    collectPatternIdentifiers(node.argument, assigned);
    assigned.forEach((name) => {
      if (!shadowed.has(name)) names.add(name);
    });
  } else if (node.type === 'VariableDeclarator') {
    if (node.init) collectInvalidatedIdentifiers(node.init, names, shadowed);
    return names;
  }

  for (const key of collectInvalidatedIdentifiers.visitorKeys[node.type] || []) {
    const child = node[key];
    if (Array.isArray(child)) child.forEach(child => collectInvalidatedIdentifiers(child, names, shadowed));
    else collectInvalidatedIdentifiers(child, names, shadowed);
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

    function inspect(node, knownTruthy, shadowed = new Set()) {
      node = unwrap(node);
      if (!node || typeof node.type !== 'string' || SCOPE_NODES.has(node.type)) return;
      if (node.type === 'BlockStatement') {
        const blockShadowed = new Set([...shadowed, ...collectBlockScopedIdentifiers(node.body)]);
        node.body.forEach(statement => inspect(statement, knownTruthy, blockShadowed));
        return;
      }
      if (node.type === 'LogicalExpression' && node.left.type === 'Identifier' && knownTruthy.has(node.left.name) && !shadowed.has(node.left.name)) {
        context.report({
          node: node.left,
          message: `Redundant conditional: '${node.left.name}' is already known to be truthy.`
        });
      }
      for (const key of sourceCode.visitorKeys[node.type] || []) {
        const child = node[key];
        if (Array.isArray(child)) child.forEach(child => inspect(child, knownTruthy, shadowed));
        else inspect(child, knownTruthy, shadowed);
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
