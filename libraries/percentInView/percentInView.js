import { getWinDimensions, inIframe } from '../../src/utils.js';
import { getBoundingClientRect } from '../boundingClientRect/boundingClientRect.js';

export function getBoundingBox(element, {w, h} = {}) {
  let {width, height, left, top, right, bottom, x, y} = getBoundingClientRect(element);

  if ((width === 0 || height === 0) && w && h) {
    width = w;
    height = h;
    right = left + w;
    bottom = top + h;
  }

  return {width, height, left, top, right, bottom, x, y};
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

export const percentInView = (element, {w, h} = {}) => {
  const elementBoundingBox = getBoundingBox(element, {w, h});

  const { innerHeight, innerWidth } = getWinDimensions();

  // Obtain the intersection of the element and the viewport
  const elementInViewBoundingBox = getIntersectionOfRects([{
    left: 0,
    top: 0,
    right: innerWidth,
    bottom: innerHeight
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
