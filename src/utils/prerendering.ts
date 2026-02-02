import {logInfo} from '../utils.js';
import type {AnyFunction} from "../types/functions.d.ts";
import type {UnwrapPromise, ToPromise} from "./promise.ts";

/**
 * Returns a wrapper around fn that delays execution until the page if activated, if it was prerendered and isDelayEnabled returns true.
 * https://developer.chrome.com/docs/web-platform/prerender-pages
 */
export function delayIfPrerendering<F extends AnyFunction>(isDelayEnabled: () => boolean, fn: F): (...args: Parameters<F>) => ToPromise<ReturnType<F>> {
  return (...args) => {
    if ((document as any).prerendering && isDelayEnabled()) {
      return new Promise<UnwrapPromise<ReturnType<F>>>((resolve) => {
        document.addEventListener('prerenderingchange', () => {
          logInfo(`Auctions were suspended while page was prerendering`)
          resolve(fn.apply(this, args))
        }, {once: true})
      })
    } else {
      return Promise.resolve<UnwrapPromise<ReturnType<F>>>(fn.apply(this, args));
    }
  }
}
