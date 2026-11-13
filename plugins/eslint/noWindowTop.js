const MESSAGE = 'Use getWindowTop(), getWindowTopOf(), getParentWindow() or getFrameElement() from src/utils.js instead: tests keep them inside the spec\'s own frame.';
const FRAME_PROPS = new Set(['top', 'parent', 'frameElement']);
const GLOBAL_WINDOWS = new Set(['window', 'self', 'globalThis']);
const WINDOW_GETTERS = new Set(['getWindowSelf', 'getWindowTop']);
// Window references are recognized by name, so this also flags e.g. `frame.parent`; a non-window that trips it can
// be renamed or disabled inline.
const WINDOW_LIKE_NAME = /^(w|f|wnd)$|win|Win|frame|Frame/;

function isWindowLike(node) {
  switch (node.type) {
    case 'Identifier':
      return GLOBAL_WINDOWS.has(node.name) || WINDOW_LIKE_NAME.test(node.name);
    case 'MemberExpression':
      return !node.computed && node.property.type === 'Identifier' &&
        (node.property.name === 'window' || WINDOW_LIKE_NAME.test(node.property.name));
    case 'CallExpression': {
      const callee = node.callee.type === 'MemberExpression' ? node.callee.property : node.callee;
      return callee.type === 'Identifier' && WINDOW_GETTERS.has(callee.name);
    }
    case 'TSAsExpression':
    case 'TSNonNullExpression':
      return isWindowLike(node.expression);
    default:
      return false;
  }
}

module.exports = {
  meta: {
    docs: {
      description: 'disallows reaching other frames through window.top / parent / frameElement'
    },
    type: 'problem',
    schema: []
  },
  create(context) {
    return {
      MemberExpression(node) {
        if (node.computed || node.property.type !== 'Identifier' || !FRAME_PROPS.has(node.property.name)) return;
        if (isWindowLike(node.object)) context.report({ node, message: MESSAGE });
      },
      'Program:exit'(node) {
        const globalScope = context.sourceCode.getScope(node);
        // configured globals (e.g. `browser`) resolve to a global variable; undeclared ones stay in `through`
        [
          ...[...FRAME_PROPS].flatMap(name => globalScope.set.get(name)?.references ?? []),
          ...globalScope.through.filter(ref => FRAME_PROPS.has(ref.identifier.name)),
        ].forEach(ref => context.report({ node: ref.identifier, message: MESSAGE }));
      }
    };
  }
};
