import { getWinDimensions, inIframe } from '../../src/utils.js';
import { getBoundingClientRect } from '../boundingClientRect/boundingClientRect.js';
import { PbPromise, delay } from '../../src/utils/promise.js';
import { startAuction } from '../../src/prebid.js';
import { getAdUnitElement } from '../../src/utils/adUnits.js';

/**
 * return the offset between the given window's viewport and the top window's.
 */
export function getViewportOffset(win = window) {
  let x = 0;
  let y = 0;
  try {
    while (win?.frameElement != null) {
      const rect = getBoundingClientRect(win.frameElement);
      x += rect.left;
      y += rect.top;
      win = win.parent;
    }
  } catch (e) {
    // offset cannot be calculated as some parents are cross-frame
    // fallback to 0,0
    x = 0;
    y = 0;
  }

  return { x, y };
}

function applySize(bbox, { w, h }) {
  let { width, height, left, top, right, bottom, x, y } = bbox;

  if ((width === 0 || height === 0) && w && h) {
    width = w;
    height = h;
    right = left + w;
    bottom = top + h;
  }

  return { width, height, left, top, right, bottom, x, y };
}

export function getBoundingBox(element, { w, h } = {}) {
  return applySize(getBoundingClientRect(element), { w, h });
}

function getIntersectionOfRects(rects) {
  const bbox = {
    left: rects[0].left, right: rects[0].right, top: rects[0].top, bottom: rects[0].bottom
  };

  for (let i = 1; i < rects.length; ++i) {
    bbox.left = Math.max(bbox.left, rects[i].left);
    bbox.right = Math.min(bbox.right, rects[i].right);

    if (bbox.left >= bbox.right) {
      return null;
    }

    bbox.top = Math.max(bbox.top, rects[i].top);
    bbox.bottom = Math.min(bbox.bottom, rects[i].bottom);

    if (bbox.top >= bbox.bottom) {
      return null;
    }
  }

  bbox.width = bbox.right - bbox.left;
  bbox.height = bbox.bottom - bbox.top;

  return bbox;
}

/**
 * Percentage of the given bounding box that lies within the top window's viewport,
 * and within each of `clipRects`.
 *
 * `elementBoundingBox` is taken relative to `win`'s viewport, and is modified in place.
 * `clipRects` are in top window coordinates.
 */
function percentInViewOfBox(elementBoundingBox, win, clipRects = []) {
  // when in an iframe, the bounding box is relative to the iframe's viewport
  // since we are intersecting it with the top window's viewport, attempt to
  // compensate for the offset between them

  const offset = getViewportOffset(win);
  elementBoundingBox.left += offset.x;
  elementBoundingBox.right += offset.x;
  elementBoundingBox.top += offset.y;
  elementBoundingBox.bottom += offset.y;

  const dims = getWinDimensions();

  // Obtain the intersection of the element, the viewport, and everything that clips the element
  const elementInViewBoundingBox = getIntersectionOfRects([{
    left: 0,
    top: 0,
    right: dims.document.documentElement.clientWidth,
    bottom: dims.document.documentElement.clientHeight
  }, elementBoundingBox, ...clipRects]);

  let elementInViewArea, elementTotalArea;

  if (elementInViewBoundingBox !== null) {
    // Some or all of the element is in view
    elementInViewArea = elementInViewBoundingBox.width * elementInViewBoundingBox.height;
    elementTotalArea = elementBoundingBox.width * elementBoundingBox.height;

    return ((elementInViewArea / elementTotalArea) * 100);
  }

  // No overlap between element and the viewport; therefore, the element
  // lies completely out of view
  return 0;
}

/**
 * Rectangles that clip the given element, in top window coordinates: the boxes of its
 * scrolling or overflow-hidden ancestors, and of every frame that contains it.
 *
 * Returns null if the element or one of its ancestors is styled so that nothing renders.
 *
 * Clipping is approximated: the boxes include the ancestors' borders rather than stopping
 * at their padding edge, an ancestor that clips only one axis is treated as clipping both,
 * and an out-of-flow element is treated as clipped by ancestors that are not in its
 * containing block chain (a fixed position element is clipped by no ancestor at all).
 */
function getClipRects(element) {
  const rects = [];
  let el = element;
  let win = element?.ownerDocument?.defaultView;
  try {
    while (el != null && win != null) {
      const { x, y } = getViewportOffset(win);
      let node = el;
      while (node != null) {
        const style = getComputedStyle(node);
        if (style.visibility === 'hidden' || style.opacity === '0') {
          return null;
        }
        if (node !== el && style.overflow !== 'visible') {
          const rect = getBoundingClientRect(node);
          rects.push({ left: rect.left + x, top: rect.top + y, right: rect.right + x, bottom: rect.bottom + y });
        }
        node = node.parentElement;
      }
      // nothing can render outside the frame that contains it
      const frame = win.frameElement;
      if (frame == null) break;
      win = frame.ownerDocument?.defaultView;
      const offset = getViewportOffset(win);
      const rect = getBoundingClientRect(frame);
      rects.push({ left: rect.left + offset.x, top: rect.top + offset.y, right: rect.right + offset.x, bottom: rect.bottom + offset.y });
      el = frame;
    }
  } catch (e) {
    // some ancestors are cross-frame and cannot be inspected; clip against those we could reach
  }
  return rects;
}

const percentInViewStatic = (element, { w, h } = {}) => {
  const clipRects = getClipRects(element);
  return clipRects == null ? 0 : percentInViewOfBox(
    getBoundingBox(element, { w, h }),
    element?.ownerDocument?.defaultView,
    clipRects
  );
};

export const dep = {
  // for stubbing in tests, see test/mocks/percentInView.js
  getElement: (element) => element
};

/**
 * A wrapper around an IntersectionObserver that keeps track of the latest IntersectionEntry that was observed
 * for each observed element.
 *
 * @param mkObserver
 */
export function intersections(mkObserver) {
  const intersections = new WeakMap();
  // resolvers waiting on the first entry for an element, keyed by that element.
  // only elements that someone is actually waiting on appear here; they are dropped
  // as soon as they are woken, so a page that is merely scrolling allocates nothing.
  const waiting = new WeakMap();

  function observerCallback(entries) {
    entries.forEach(entry => {
      if ((intersections.get(entry.target)?.time ?? -1) < entry.time) {
        intersections.set(entry.target, entry);
        const resolvers = waiting.get(entry.target);
        if (resolvers != null) {
          waiting.delete(entry.target);
          resolvers.forEach(resolve => resolve(entry));
        }
      }
    });
  }

  let obs = null;
  try {
    obs = mkObserver(observerCallback);
  } catch (e) {
    // IntersectionObserver not supported
  }

  function waitFor(element) {
    return new PbPromise(resolve => {
      const resolvers = waiting.get(element);
      if (resolvers == null) {
        waiting.set(element, [resolve]);
      } else {
        resolvers.push(resolve);
      }
    });
  }
  /**
   * Observe the given element; returns a promise to the first available intersection observed for it.
   */
  async function observe(element) {
    element = dep.getElement(element);
    if (element != null && obs != null && !intersections.has(element)) {
      obs.observe(element);
      intersections.set(element, null);
      return waitFor(element);
    } else {
      return PbPromise.resolve(getIntersection(element));
    }
  }

  /**
   * Return the latest intersection that was observed for the given element.
   */
  function getIntersection(element) {
    return intersections.get(element);
  }

  return {
    observe,
    getIntersection,
  };
}

export const viewportIntersections = intersections((callback) => new IntersectionObserver(callback, {
  // update percentInView when visibility varies by 1%
  threshold: Array.from({ length: 101 }, (e, i) => i / 100)
}));

export function mkIntersectionHook(intersections = viewportIntersections) {
  return function (next, request) {
    PbPromise.race([
      PbPromise.allSettled((request.adUnits ?? []).map(adUnit =>
        intersections.observe(getAdUnitElement(adUnit))
      )),
      // according to MDN, with threshold 0 "the callback will be run as soon as the target element intersects or touches the boundary of the root, even if no pixels are yet visible"
      // https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API
      // However, browsers appear to run it even when the element is outside the DOM
      // just to be sure, cap the amount of time we wait for intersections
      delay(20)
    ]).then(() => next.call(this, request));
  };
}

startAuction.before(mkIntersectionHook());

export function percentInView(element, { w, h } = {}) {
  const intersection = viewportIntersections.getIntersection(element);
  if (intersection == null) {
    viewportIntersections.observe(element);
    return percentInViewStatic(element, { w, h });
  } else {
    const bbox = intersection.boundingClientRect;
    const adjusted = applySize(bbox, { w, h });
    if (adjusted.width !== bbox.width || adjusted.height !== bbox.height) {
      // the element has collapsed, so the observer's ratio describes a rect of no area;
      // recompute from the w/h override, reusing the position the observer already
      // reported to avoid forcing a layout for a rect we have on hand
      return percentInViewOfBox(adjusted, element?.ownerDocument?.defaultView);
    }
    if (bbox.width === 0 || bbox.height === 0) {
      // an element with no area renders nothing, but intersection observers report a ratio
      // of 1 for a zero-area target that touches the viewport, which would read as fully in view
      return 0;
    }
    return intersection.isIntersecting ? intersection.intersectionRatio * 100 : 0;
  }
}

/**
 * Checks if viewability can be measured for an element
 * @param {HTMLElement} element - DOM element to check
 * @returns {boolean} True if viewability is measurable
 */
export function isViewabilityMeasurable(element) {
  return !inIframe() && element !== null;
}

/**
 * Gets the viewability percentage of an element
 * @param {HTMLElement} element - DOM element to measure
 * @param {Window} topWin - Top window object
 * @param {Object} size - Size object with width and height
 * @returns {number|string} Viewability percentage or 0 if not visible
 */
export function getViewability(element, topWin, size) {
  return topWin.document.visibilityState === 'visible'
    ? percentInView(element, size)
    : 0;
}
