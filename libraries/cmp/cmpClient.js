import {GreedyPromise} from '../../src/utils/promise.js';

/**
 * @typedef {function} CMPClient
 *
 * @param {{}} params CMP parameters. Currently this is a subset of {command, callback, parameter, version}.
 * @param {bool} once if true, discard cross-frame event listeners once a reply message is received.
 * @returns {Promise<*>} a promise to the API's "result" - see the `mode` argument to `cmpClient` on how that's determined.
 * @property {boolean} isDirect true if the CMP is directly accessible (no postMessage required)
 * @property {() => void} close close the client; currently, this just stops listening for cross-frame messages.
 */

/**
 * Returns a client function that can interface with a CMP regardless of where it's located.
 *
 * @param apiName name of the CMP api, e.g. "__gpp"
 * @param apiVersion? CMP API version
 * @param apiArgs? names of the arguments taken by the api function, in order.
 * @param callbackArgs? names of the cross-frame response payload properties that should be passed as callback arguments, in order
 * @param mode? controls the callbacks passed to the underlying API, and how the promises returned by the client are resolved.
 *
 *  The client behaves differently when it's provided a `callback` argument vs when it's not - for short, let's name these
 *  cases "subscriptions" and "one-shot calls" respectively:
 *
 *  With `mode: MODE_MIXED` (the default), promises returned on subscriptions are resolved to undefined when the callback
 *  is first run (that is, the promise resolves when the CMP replies, but what it replies with is discarded and
 *  left for the callback to deal with). For one-shot calls, the returned promise is resolved to the API's
 *  return value when it's directly accessible, or with the result from the first (and, presumably, the only)
 *  cross-frame reply when it's not;
 *
 *  With `mode: MODE_RETURN`, the returned promise always resolves to the API's return value - which is taken to be undefined
 *  when cross-frame;
 *
 *  With `mode: MODE_CALLBACK`, the underlying API is expected to never directly return anything significant; instead,
 *  it should always accept a callback and - for one-shot calls - invoke it only once with the result. The client will
 *  automatically generate an appropriate callback for one-shot calls and use the result it's given to resolve
 *  the returned promise. Subscriptions are treated in the same way as MODE_MIXED.
 *
 * @param win
 * @returns {CMPClient} CMP invocation function (or null if no CMP was found).
 */

export const MODE_MIXED = 0;
export const MODE_RETURN = 1;
export const MODE_CALLBACK = 2;

export function cmpClient(
  {
    apiName,
    apiVersion,
    apiArgs = ['command', 'callback', 'parameter', 'version'],
    callbackArgs = ['returnValue', 'success'],
    mode = MODE_MIXED,
  },
  win = window
) {
  const cmpCallbacks = {};
  const callName = `${apiName}Call`;
  const cmpDataPkgName = `${apiName}Return`;

  function handleMessage(event) {
    const json = (typeof event.data === 'string' && event.data.includes(cmpDataPkgName)) ? JSON.parse(event.data) : event.data;
    if (json?.[cmpDataPkgName]?.callId) {
      const payload = json[cmpDataPkgName];

      if (cmpCallbacks.hasOwnProperty(payload.callId)) {
        cmpCallbacks[payload.callId](...callbackArgs.map(name => payload[name]));
      }
    }
  }

  function findCMP() {
    let f = win;
    let cmpFrame;
    let isDirect = false;
    while (f != null) {
      try {
        if (typeof f[apiName] === 'function') {
          cmpFrame = f;
          isDirect = true;
          break;
        }
      } catch (e) {
      }

      // need separate try/catch blocks due to the exception errors thrown when trying to check for a frame that doesn't exist in 3rd party env
      try {
        if (f.frames[`${apiName}Locator`]) {
          cmpFrame = f;
          break;
        }
      } catch (e) {
      }

      if (f === win.top) break;
      f = f.parent;
    }

    return [
      cmpFrame,
      isDirect
    ];
  }

  const [cmpFrame, isDirect] = findCMP();

  if (!cmpFrame) {
    return;
  }

  function resolveParams(params) {
    params = Object.assign({version: apiVersion}, params);
    return apiArgs.map(arg => [arg, params[arg]])
  }

  function wrapCallback(callback, resolve, reject, preamble) {
    const haveCb = typeof callback === 'function';

    return function (result, success) {
      preamble && preamble();
      if (mode !== MODE_RETURN) {
        const resolver = success == null || success ? resolve : reject;
        resolver(haveCb ? undefined : result);
      }
      haveCb && callback.apply(this, arguments);
    }
  }

  let client;

  if (isDirect) {
    client = function invokeCMPDirect(params = {}) {
      return new GreedyPromise((resolve, reject) => {
        const ret = cmpFrame[apiName](...resolveParams({
          ...params,
          callback: (params.callback || mode === MODE_CALLBACK) ? wrapCallback(params.callback, resolve, reject) : undefined,
        }).map(([_, val]) => val));
        if (mode === MODE_RETURN || (params.callback == null && mode === MODE_MIXED)) {
          resolve(ret);
        }
      });
    };
  } else {
    win.addEventListener('message', handleMessage, false);

    client = function invokeCMPFrame(params, once = false) {
      return new GreedyPromise((resolve, reject) => {
        // call CMP via postMessage
        const callId = Math.random().toString();
        const msg = {
          [callName]: {
            ...Object.fromEntries(resolveParams(params).filter(([param]) => param !== 'callback')),
            callId: callId
          }
        };

        cmpCallbacks[callId] = wrapCallback(params?.callback, resolve, reject, (once || params?.callback == null) && (() => { delete cmpCallbacks[callId] }));
        cmpFrame.postMessage(msg, '*');
        if (mode === MODE_RETURN) resolve();
      });
    };
  }
  return Object.assign(client, {
    isDirect,
    close() {
      !isDirect && win.removeEventListener('message', handleMessage);
    }
  })
}
