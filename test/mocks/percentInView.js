import { dep } from 'libraries/percentInView/percentInView.js';

let stub;

export function enable() {
  if (stub != null) return;
  stub = sinon.stub(dep, 'getElement').callsFake((el) => {
    // some tests mock elements with objects that do not work with IntersectionObserver.observe,
    // causing TypeError noise in the output.
    // Short out the .observe during tests - but only during tests, as the TypeError is legitimate
    // if it happens on a real page
    const ElementCtor = el?.ownerDocument?.defaultView?.Element;
    return (typeof ElementCtor === 'function' && el instanceof ElementCtor) ? el : null;
  });
}

export function disable() {
  if (stub == null) return;
  stub.restore();
  stub = null;
}

before(() => {
  enable();
});
