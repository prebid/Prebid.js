/**
 * Calculates the Time to First Byte (TTFB) for the given window object.
 *
 * This function attempts to use the Navigation Timing Level 2 API first, and falls back to
 * the Navigation Timing Level 1 API if the former is not available.
 *
 * @param {Window} win - The window object from which to retrieve performance timing information.
 * @returns {string} The TTFB in milliseconds as a string, or an empty string if the TTFB cannot be determined.
 */
export function getTimeToFirstByte(win) {
  const performance = win.performance || win.webkitPerformance || win.msPerformance || win.mozPerformance;

  const ttfbWithTimingV2 = performance &&
        typeof performance.getEntriesByType === 'function' &&
        Object.prototype.toString.call(performance.getEntriesByType) === '[object Function]' &&
        performance.getEntriesByType('navigation')[0] &&
        performance.getEntriesByType('navigation')[0].responseStart &&
        performance.getEntriesByType('navigation')[0].requestStart &&
        performance.getEntriesByType('navigation')[0].responseStart > 0 &&
        performance.getEntriesByType('navigation')[0].requestStart > 0 &&
        Math.round(
          performance.getEntriesByType('navigation')[0].responseStart - performance.getEntriesByType('navigation')[0].requestStart
        );

  if (ttfbWithTimingV2) {
    return ttfbWithTimingV2.toString();
  }

  const ttfbWithTimingV1 = performance &&
        performance.timing.responseStart &&
        performance.timing.requestStart &&
        performance.timing.responseStart > 0 &&
        performance.timing.requestStart > 0 &&
        performance.timing.responseStart - performance.timing.requestStart;

  return ttfbWithTimingV1 ? ttfbWithTimingV1.toString() : '';
}
