const LAYOUT_PROPERTIES = new Set([
  'offsetWidth', 'offsetHeight', 'offsetLeft', 'offsetTop',
  'clientWidth', 'clientHeight', 'clientLeft', 'clientTop',
  'scrollWidth', 'scrollHeight', 'scrollX', 'scrollY', 'scrollTop', 'scrollLeft',
  'innerHeight', 'innerWidth', 'visualViewport', 'getComputedStyle'
]);

const MESSAGE = 'Avoid synchronous layout reads; use the cached Prebid window/element dimension utilities instead.';
const UTILITIES = {
  getWinDimensions: /(?:^|\/)src\/utils(?:\/winDimensions)?\.js$/,
};

function propertyName(node) {
  const property = node.key ?? node.property;
  if (!node.computed && property?.type === 'Identifier') return property.name;
  if (property?.type === 'Literal') return property.value;
  if (property?.type === 'TemplateLiteral' && property.expressions.length === 0) return property.quasis[0].value.cooked;
}

module.exports = {
  meta: {
    docs: { description: 'Disallow uncached synchronous DOM layout reads in adapters' },
    type: 'problem',
    schema: []
  },
  create(context) {
    const sourceCode = context.sourceCode;

    function variableFor(node) {
      let scope = sourceCode.getScope(node);
      while (scope) {
        if (scope.set.has(node.name)) return scope.set.get(node.name);
        scope = scope.upper;
      }
    }

    function isUtility(callee) {
      const identifier = callee.type === 'MemberExpression' ? callee.object : callee;
      if (identifier.type !== 'Identifier') return false;
      const definition = variableFor(identifier)?.defs[0];
      if (definition?.type !== 'ImportBinding') return false;
      const imported = definition.node;
      const name = imported.type === 'ImportSpecifier' && callee.type === 'Identifier' ? imported.imported.name
        : imported.type === 'ImportNamespaceSpecifier' && callee.type === 'MemberExpression' ? propertyName(callee) : undefined;
      return UTILITIES[name]?.test(definition.parent.source.value) ?? false;
    }

    function isCached(node, seen = new Set()) {
      if (!node) return false;
      if (node.type === 'ChainExpression') return isCached(node.expression, seen);
      if (node.type === 'MemberExpression') return isCached(node.object, seen);
      if (node.type === 'CallExpression') return isUtility(node.callee);
      if (node.type !== 'Identifier') return false;
      const variable = variableFor(node);
      if (!variable || seen.has(variable)) return false;
      seen.add(variable);
      const definition = variable.defs[0];
      return definition?.type === 'Variable' &&
        variable.references.every(reference => !reference.isWrite() || reference.init) &&
        isCached(definition.node.init, seen);
    }

    function checkPattern(pattern, value) {
      if (pattern?.type === 'AssignmentPattern') return checkPattern(pattern.left, pattern.right);
      if (pattern?.type !== 'ObjectPattern' || isCached(value)) return;
      for (const property of pattern.properties) {
        if (property.type !== 'Property') continue;
        if (LAYOUT_PROPERTIES.has(propertyName(property))) {
          context.report({ node: property, message: MESSAGE });
        } else {
          checkPattern(property.value, null);
        }
      }
    }

    return {
      MemberExpression(node) {
        if (LAYOUT_PROPERTIES.has(propertyName(node)) && !isCached(node.object)) {
          // Setting a scroll offset does not read layout.
          if (node.parent.type === 'AssignmentExpression' && node.parent.left === node && node.parent.operator === '=') return;
          context.report({ node, message: MESSAGE });
        }
      },
      CallExpression(node) {
        if (node.callee.type === 'Identifier' && node.callee.name === 'getComputedStyle' && !variableFor(node.callee)?.defs.length) {
          context.report({ node, message: MESSAGE });
        }
      },
      VariableDeclarator(node) { checkPattern(node.id, node.init); },
      AssignmentExpression(node) { checkPattern(node.left, node.right); },
      FunctionDeclaration(node) { node.params.forEach(param => checkPattern(param, null)); },
      FunctionExpression(node) { node.params.forEach(param => checkPattern(param, null)); },
      ArrowFunctionExpression(node) { node.params.forEach(param => checkPattern(param, null)); }
    };
  }
};
