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
        if (node.computed) return;
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
