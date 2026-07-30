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

const percentInViewStatic = (element, { w, h } = {}) => {
  const elementBoundingBox = getBoundingBox(element, { w, h });

  // when in an iframe, the bounding box is relative to the iframe's viewport
  // since we are intersecting it with the top window's viewport, attempt to
  // compensate for the offset between them

  const offset = getViewportOffset(element?.ownerDocument?.defaultView);
  elementBoundingBox.left += offset.x;
  elementBoundingBox.right += offset.x;
  elementBoundingBox.top += offset.y;
  elementBoundingBox.bottom += offset.y;

  const dims = getWinDimensions();

  // Obtain the intersection of the element and the viewport
  const elementInViewBoundingBox = getIntersectionOfRects([{
    left: 0,
    top: 0,
    right: dims.document.documentElement.clientWidth,
    bottom: dims.document.documentElement.clientHeight
  }, elementBoundingBox]);

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
      // use w/h override
      return percentInViewStatic(element, { w, h });
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
