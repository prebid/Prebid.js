const LAYOUT_PROPERTIES = new Set([
  'offsetWidth',
  'offsetHeight',
  'offsetLeft',
  'offsetTop',
  'clientWidth',
  'clientHeight',
  'scrollWidth',
  'scrollHeight',
  'scrollX',
  'scrollY'
]);

const MESSAGE = 'Avoid synchronous layout reads; use the Prebid viewport/bounding-client-rect utilities instead.';
const TRUSTED_UTILITY_CALLEES = new Set(['getWinDimensions', 'getViewportSize', 'getViewportCoordinates']);

function isTrustedUtilityResult(node) {
  let current = node;
  while (current?.type === 'MemberExpression') {
    current = current.object;
  }
  return current?.type === 'CallExpression' &&
    current.callee?.type === 'Identifier' &&
    TRUSTED_UTILITY_CALLEES.has(current.callee.name);
}

module.exports = {
  meta: {
    docs: {
      description: 'warns about synchronous DOM layout reads'
    },
    type: 'suggestion',
    schema: []
  },
  create(context) {
    return {
      MemberExpression(node) {
        if (node.computed || isTrustedUtilityResult(node)) return;
        const property = node.property;
        if (property?.type === 'Identifier' && LAYOUT_PROPERTIES.has(property.name)) {
          context.report({node, message: MESSAGE});
        }
      },
      CallExpression(node) {
        const callee = node.callee;
        if (callee?.type === 'Identifier' && callee.name === 'getComputedStyle') {
          context.report({node, message: 'Avoid synchronous layout reads from computed style in bidder/RTD/analytics modules.'});
        }
      }
    };
  }
};
