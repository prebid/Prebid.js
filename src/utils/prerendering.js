import {logInfo} from '../utils.js';

/**
 * Returns a wrapper around fn that delays execution until the page if activated, if it was prerendered and isDelayEnabled returns true.
 * https://developer.chrome.com/docs/web-platform/prerender-pages
 */
export function delayIfPrerendering(isDelayEnabled, fn) {
  return function () {
    if (document.prerendering && isDelayEnabled()) {
      const that = this;
      const args = Array.from(arguments);
      return new Promise((resolve) => {
        document.addEventListener('prerenderingchange', () => {
          logInfo(`Auctions were suspended while page was prerendering`)
          resolve(fn.apply(that, args))
        }, {once: true})
      })
    } else {
      return Promise.resolve(fn.apply(this, arguments));
    }
  }
}
