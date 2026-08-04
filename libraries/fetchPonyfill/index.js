/**
 * A ponyfill (not a polyfill) for the parts of the Fetch standard that prebid uses
 * but the oldest supported browsers do not provide.
 *
 * This module is never imported directly. `plugins/polyfillFetch.js` rewrites
 * references to `fetch`, `Headers`, `Request`, `Response` and `AbortController`
 * to named imports from here, and only for build targets that lack them - so
 * raising the target list removes both the rewrites and this module from the
 * output. Nothing here touches `window`.
 *
 * Why the whole family has to move together: a JS-implemented `Headers` or
 * `AbortSignal` cannot be handed to the *native* `fetch`. Native `fetch` reads
 * them through internal slots, so a foreign `Headers` is either rejected
 * ("Failed to construct 'Request': Invalid value" on Chrome 50) or silently
 * emptied (Safari 10), and a foreign `signal` is silently discarded - `signal`
 * was not a member of `RequestInit` before Chrome 66 / Safari 12.1, so it is
 * dropped as an unknown dictionary key with no error at all. Replacing `fetch`
 * along with them keeps the stack self-consistent.
 *
 * whatwg-fetch is XHR-backed, so `signal` support maps onto `XMLHttpRequest`'s
 * `abort()` - real cancellation, which native fetch simply could not do on
 * these browsers.
 */
export { fetch, Headers, Request, Response } from 'whatwg-fetch';

/**
 * whatwg-fetch consumes a signal by duck typing - it calls
 * `signal.addEventListener('abort', ..)` and checks nothing else - so a plain
 * object is enough. This is deliberately minimal rather than pulling in a full
 * EventTarget shim: prebid only ever constructs one, reads `.signal`, and calls
 * `.abort()` (see `dep.timeout` in src/ajax.ts).
 */
class PonyAbortSignal {
  constructor() {
    this.aborted = false;
    this.reason = undefined;
    this.onabort = null;
    this._listeners = [];
  }

  addEventListener(type, listener) {
    if (type === 'abort' && typeof listener === 'function') {
      this._listeners.push(listener);
    }
  }

  removeEventListener(type, listener) {
    if (type !== 'abort') return;
    const i = this._listeners.indexOf(listener);
    if (i >= 0) this._listeners.splice(i, 1);
  }

  throwIfAborted() {
    if (this.aborted) throw this.reason;
  }

  _dispatch() {
    const event = { type: 'abort', target: this };
    if (typeof this.onabort === 'function') this.onabort(event);
    // copy: a listener may remove itself while we iterate
    this._listeners.slice().forEach((listener) => listener(event));
  }
}

export class AbortController {
  constructor() {
    this.signal = new PonyAbortSignal();
  }

  abort(reason) {
    const { signal } = this;
    if (signal.aborted) return;
    signal.aborted = true;
    signal.reason = reason !== undefined ? reason : new Error('AbortError');
    signal._dispatch();
  }
}

export const AbortSignal = PonyAbortSignal;
