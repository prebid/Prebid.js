import {GreedyPromise} from '../../src/utils/promise.js';

/**
 * @typedef {function} CMPClient
 *
 * @param {{}} params CMP parameters. Currently this is a subset of {command, callback, parameter, version}.
 * @returns {Promise<*>} a promise that:
 *    - if a `callback` param was provided, resolves (with no result) just before the first time it's run;
 *    - if `callback` was *not* provided, resolves to the return value of the CMP command
 * @property {boolean} isDirect true if the CMP is directly accessible (no postMessage required)
 */

/**
 * Returns a function that can interface with a CMP regardless of where it's located.
 *
 * @param apiName name of the CMP api, e.g. "__gpp"
 * @param apiVersion? CMP API version
 * @param apiArgs? names of the arguments taken by the api function, in order.
 * @param callbackArgs? names of the cross-frame response payload properties that should be passed as callback arguments, in order
 * @param win
 * @returns {CMPClient} CMP invocation function (or null if no CMP was found).
 */
export function cmpClient(
  {
    apiName,
    apiVersion,
    apiArgs = ['command', 'callback', 'parameter', 'version'],
    callbackArgs = ['returnValue', 'success'],
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
    return function (result, success) {
      preamble && preamble();
      const resolver = success == null || success ? resolve : reject;
      if (typeof callback === 'function') {
        resolver();
        return callback.apply(this, arguments);
      } else {
        resolver(result);
      }
    }
  }

  let client;

  if (isDirect) {
    client = function invokeCMPDirect(params = {}) {
      return new GreedyPromise((resolve, reject) => {
        const ret = cmpFrame[apiName](...resolveParams({
          ...params,
          callback: params.callback && wrapCallback(params.callback, resolve, reject)
        }).map(([_, val]) => val));
        if (params.callback == null) {
          resolve(ret);
        }
      });
    };
  } else {
    win.addEventListener('message', handleMessage, false);

    client = function invokeCMPFrame(params) {
      return new GreedyPromise((resolve, reject) => {
        // call CMP via postMessage
        const callId = Math.random().toString();
        const msg = {
          [callName]: {
            ...Object.fromEntries(resolveParams(params).filter(([param]) => param !== 'callback')),
            callId: callId
          }
        };

        cmpCallbacks[callId] = wrapCallback(params?.callback, resolve, reject, params?.callback == null && (() => { delete cmpCallbacks[callId] }));
        cmpFrame.postMessage(msg, '*');
      });
    };
  }
  client.isDirect = isDirect;
  return client;
}
