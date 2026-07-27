function getFunctionNode(variable) {
  const def = variable && variable.defs && variable.defs[0];
  if (!def) {
    return null;
  }
  if (def.type === 'FunctionName') {
    return def.node;
  }
  if (def.type === 'Variable' && def.node.init && (
    def.node.init.type === 'FunctionExpression' ||
    def.node.init.type === 'ArrowFunctionExpression'
  )) {
    return def.node.init;
  }
  return null;
}

function getVariable(scope, name) {
  while (scope) {
    const variable = scope.set && scope.set.get(name);
    if (variable) {
      return variable;
    }
    scope = scope.upper;
  }
  return null;
}

function referencesArguments(functionNode) {
  let found = false;
  function traverse(node) {
    if (!node || found) {
      return;
    }
    if (node.type === 'FunctionExpression' || node.type === 'FunctionDeclaration') {
      return;
    }
    if (node.type === 'Identifier' && node.name === 'arguments') {
      found = true;
      return;
    }
    for (const key of Object.keys(node)) {
      const child = node[key];
      if (!child || key === 'parent') {
        continue;
      }
      if (Array.isArray(child)) {
        child.forEach(traverse);
      } else if (typeof child === 'object' && typeof child.type === 'string') {
        traverse(child);
      }
    }
  }
  traverse(functionNode.body);
  return found;
}

function getMaxArgs(functionNode) {
  return functionNode.params.some(param => param.type === 'RestElement') || referencesArguments(functionNode) ? null : functionNode.params.length;
}

function isReassigned(variable) {
  const def = variable && variable.defs && variable.defs[0];
  if (def && def.type === 'Variable' && def.parent && def.parent.kind !== 'const') {
    return true;
  }
  return variable.references.some(ref => ref.writeExpr && !(ref.init && ref.identifier.parent.type === 'VariableDeclarator'));
}

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'disallows passing arguments that exceed a locally declared function signature'
    },
    schema: []
  },
  create(context) {
    const sourceCode = context.sourceCode || context.getSourceCode();

    return {
      CallExpression(node) {
        if (node.callee.type !== 'Identifier') {
          return;
        }
        const variable = getVariable(sourceCode.getScope(node), node.callee.name);
        const functionNode = getFunctionNode(variable);
        if (!functionNode) {
          return;
        }
        if (isReassigned(variable)) {
          return;
        }
        const maxArgs = getMaxArgs(functionNode);
        if (maxArgs != null && node.arguments.length > maxArgs) {
          context.report({
            node,
            message: `Function '${node.callee.name}' expects at most ${maxArgs} argument${maxArgs === 1 ? '' : 's'}, but ${node.arguments.length} were provided.`
          });
        }
      }
    };
  }
};
