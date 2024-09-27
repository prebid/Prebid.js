import {config} from './config.js';
import {buildUrl, logError, parseUrl} from './utils.js';
import { defer } from './utils/promise.js';

/**
 * A map holding number of active calls to particular origins
 * @type {Map<string, number>}
 */
export const activeOriginsCalls = new Map();

/**
 * An array holding calls that are postponed till the capacity is back
 */
export const queuedCalls = [];

// Function to safely increment number of active calls for a given origin
function addRequestForOrigin(key) {
  const currentValue = activeOriginsCalls.get(key);
  const newValue = (currentValue ?? 0) + 1;
  activeOriginsCalls.set(key, newValue);
}

// Function to safely decrement number of active calls for a given origin
function removeRequestForOrigin(key) {
  const currentValue = activeOriginsCalls.get(key);
  const newValue = (currentValue ?? 0) - 1;
  activeOriginsCalls.set(key, newValue);
}

export const dep = {
  fetch: window.fetch.bind(window),
  makeRequest: (r, o) => new Request(r, o),
  timeout(timeout, resource) {
    const ctl = new AbortController();
    let cancelTimer = setTimeout(() => {
      ctl.abort();
      logError(`Request timeout after ${timeout}ms`, resource);
      cancelTimer = null;
    }, timeout);
    return {
      signal: ctl.signal,
      done() {
        cancelTimer && clearTimeout(cancelTimer)
      }
    }
  }
}

const GET = 'GET';
const POST = 'POST';
const CTYPE = 'Content-Type';

/**
 * transform legacy `ajax` parameters into a fetch request.
 * @returns {Request}
 */
export function toFetchRequest(url, data, options = {}) {
  const method = options.method || (data ? POST : GET);
  if (method === GET && data) {
    const urlInfo = parseUrl(url, options);
    Object.assign(urlInfo.search, data);
    url = buildUrl(urlInfo);
  }
  const headers = new Headers(options.customHeaders);
  headers.set(CTYPE, options.contentType || 'text/plain');
  const rqOpts = {
    method,
    headers
  }
  if (method !== GET && data) {
    rqOpts.body = data;
  }
  if (options.withCredentials) {
    rqOpts.credentials = 'include';
  }
  if (options.browsingTopics && isSecureContext) {
    // the Request constructor will throw an exception if the browser supports topics
    // but we're not in a secure context
    rqOpts.browsingTopics = true;
  }
  if (options.keepalive) {
    rqOpts.keepalive = true;
  }
  return dep.makeRequest(url, rqOpts);
}

/**
 *  Returns origin for passed resource
 */
export function getOrigin(resource) {
  return new URL(resource?.url == null ? resource : resource.url, document.location).origin;
}

/**
 * Return a version of `fetch` that automatically cancels requests after `timeout` milliseconds.
 *
 * If provided, `request` and `done` should be functions accepting a single argument.
 * `request` is invoked at the beginning of each request, and `done` at the end; both are passed its origin.
 *
 * @returns {function(*, {}?): Promise<Response>}
 */
export function fetcherFactory(timeout = 3000, {request, done} = {}) {
  let fetcher = (resource, options) => {
    let to;
    if (timeout != null && options?.signal == null && !config.getConfig('disableAjaxTimeout')) {
      to = dep.timeout(timeout, resource);
      options = Object.assign({signal: to.signal}, options);
    }

    const pm = defer();
    const origin = getOrigin(resource);

    const invokeRequest = () => {
      request && request(origin);
      addRequestForOrigin(origin);
      dep.fetch(resource, options)
        .then(pm.resolve)
        .catch(pm.reject)
        .finally(() => {
          if (to?.done != null) to.done();
          removeRequestForOrigin(origin);
          const index = queuedCalls.findIndex((entry) => origin === entry.origin);
          if (index >= 0) {
            const entry = queuedCalls[index];
            entry.invokeRequest();
            queuedCalls.splice(index, 1);
          }
        })
    }

    const maxRequestsPerOrigin = config.getConfig('maxRequestsPerOrigin');

    if (maxRequestsPerOrigin && (maxRequestsPerOrigin === activeOriginsCalls.get(origin))) {
      queuedCalls.push({origin, invokeRequest});
    } else {
      invokeRequest();
    }

    return pm.promise;
  };

  if (done != null) {
    fetcher = ((fetch) => function (resource, options) {
      const origin = getOrigin(resource);
      let req = fetch(resource, options);
      if (done) req = req.finally(() => done(origin));
      return req;
    })(fetcher);
  }
  return fetcher;
}

function toXHR({status, statusText = '', headers, url}, responseText) {
  let xml = 0;
  function getXML(onError) {
    if (xml === 0) {
      try {
        xml = new DOMParser().parseFromString(responseText, headers?.get(CTYPE)?.split(';')?.[0])
      } catch (e) {
        xml = null;
        onError && onError(e)
      }
    }
    return xml;
  }
  return {
    // eslint-disable-next-line prebid/no-global
    readyState: XMLHttpRequest.DONE,
    status,
    statusText,
    responseText,
    response: responseText,
    responseType: '',
    responseURL: url,
    get responseXML() {
      return getXML(logError);
    },
    getResponseHeader: (header) => headers?.has(header) ? headers.get(header) : null,
    toJSON() {
      return Object.assign({responseXML: getXML()}, this)
    },
    timedOut: false
  }
}

/**
 * attach legacy `ajax` callbacks to a fetch promise.
 */
export function attachCallbacks(fetchPm, callback) {
  const {success, error} = typeof callback === 'object' && callback != null ? callback : {
    success: typeof callback === 'function' ? callback : () => null,
    error: (e, x) => logError('Network error', e, x)
  };
  return fetchPm.then(response => response.text().then((responseText) => [response, responseText]))
    .then(([response, responseText]) => {
      const xhr = toXHR(response, responseText);
      response.ok || response.status === 304 ? success(responseText, xhr) : error(response.statusText, xhr);
    }, (reason) => error('', Object.assign(
      toXHR({status: 0}, ''),
      {reason, timedOut: reason?.name === 'AbortError'}))
    );
}

export function ajaxBuilder(timeout = 3000, {request, done} = {}) {
  const fetcher = fetcherFactory(timeout, {request, done});
  return function (url, callback, data, options = {}) {
    attachCallbacks(fetcher(toFetchRequest(url, data, options)), callback);
  };
}

/**
 * simple wrapper around sendBeacon such that invocations of navigator.sendBeacon can be centrally maintained.
 * verifies that the navigator and sendBeacon are defined for maximum compatibility
 * @param {string} url The URL that will receive the data. Can be relative or absolute.
 * @param {*} data An ArrayBuffer, a TypedArray, a DataView, a Blob, a string literal or object, a FormData or a URLSearchParams object containing the data to send.
 * @returns {boolean} true if the user agent successfully queued the data for transfer. Otherwise, it returns false.
 */
export function sendBeacon(url, data) {
  if (!window.navigator || !window.navigator.sendBeacon) {
    return false;
  }
  return window.navigator.sendBeacon(url, data);
}

export const ajax = ajaxBuilder();
export const fetch = fetcherFactory();
