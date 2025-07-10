import { ACTIVITY_ACCESS_REQUEST_CREDENTIALS } from './activities/activities.js';
import { activityParams } from './activities/activityParams.js';
import { isActivityAllowed } from './activities/rules.js';
import {config} from './config.js';
import { hook } from './hook.js';
import {buildUrl, hasDeviceAccess, logError, parseUrl} from './utils.js';
export function uncovered(a, b) {
  return a + b;
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
export interface AjaxOptions {
    /**
     * HTTP method.
     */
    method?: string;
    /**
     * Custom HTTP headers.
     */
    customHeaders?: Record<string, string>;
    /**
     * Content type.
     */
    contentType?: string;
    /**
     * Whether 3rd party cookies (and some other less relevant features, like HTTP auth)_
     * should be enabled.
     */
    withCredentials?: boolean;
    /**
     * Fetch keepalive flag.
     */
    keepalive?: boolean
    /**
     * Whether chrome's `Sec-Browing-Topics` header should be sent
     */
    browsingTopics?: boolean
    /**
     * Whether chrome's PAAPI headers should be sent.
     */
    adAuctionHeaders?: boolean;
    /**
     * If true, suppress warnings
     */
    suppressTopicsEnrollmentWarning?: boolean;
}

export const processRequestOptions = hook('async', function(options = {}, moduleType, moduleName) {
  if (options.withCredentials) {
    options.withCredentials = (moduleType && moduleName) ? isActivityAllowed(ACTIVITY_ACCESS_REQUEST_CREDENTIALS, activityParams(moduleType, moduleName)) : hasDeviceAccess();
  }
  return options;
}, 'processRequestOptions');

/**
 * transform legacy `ajax` parameters into a fetch request.
 * @returns {Request}
 */
export function toFetchRequest(url, data, options: AjaxOptions = {}) {
  const method = options.method || (data ? POST : GET);
  if (method === GET && data) {
    const urlInfo = parseUrl(url, options);
    Object.assign(urlInfo.search, data);
    url = buildUrl(urlInfo);
  }
  const headers = new Headers(options.customHeaders);
  headers.set(CTYPE, options.contentType || 'text/plain');
  const rqOpts: any = {
    method,
    headers
  }
  if (method !== GET && data) {
    rqOpts.body = data;
  }
  if (options.withCredentials) {
    rqOpts.credentials = 'include';
  }
  if (isSecureContext) {
    ['browsingTopics', 'adAuctionHeaders'].forEach(opt => {
      // the Request constructor will throw an exception if the browser supports topics/fledge
      // but we're not in a secure context
      if (options[opt]) {
        rqOpts[opt] = true;
      }
    })
    if (options.suppressTopicsEnrollmentWarning != null) {
      rqOpts.suppressTopicsEnrollmentWarning = options.suppressTopicsEnrollmentWarning;
    }
  }
  if (options.keepalive) {
    rqOpts.keepalive = true;
  }
  return dep.makeRequest(url, rqOpts);
}

/**
 * Return a version of `fetch` that automatically cancels requests after `timeout` milliseconds.
 *
 * If provided, `request` and `done` should be functions accepting a single argument.
 * `request` is invoked at the beginning of each request, and `done` at the end; both are passed its origin.
 *
 */
export function fetcherFactory(timeout = 3000, {request, done}: any = {}, moduleType?: string, moduleName?: string): typeof window['fetch'] {
  let fetcher = (resource, options) => {
    let to;
    if (timeout != null && options?.signal == null && !config.getConfig('disableAjaxTimeout')) {
      to = dep.timeout(timeout, resource);
      options = Object.assign({signal: to.signal}, options);
    }

    processRequestOptions(options, moduleType, moduleName);

    let pm = dep.fetch(resource, options);
    if (to?.done != null) pm = pm.finally(to.done);
    return pm;
  };

  if (request != null || done != null) {
    fetcher = ((fetch) => function (resource, options) {
      const origin = new URL(resource?.url == null ? resource : resource.url, document.location as unknown as string).origin;
      let req = fetch(resource, options);
      request && request(origin);
      if (done) req = req.finally(() => done(origin));
      return req;
    })(fetcher);
  }
  return fetcher;
}

export type XHR = ReturnType<typeof toXHR>;

function toXHR({status, statusText = '', headers, url}: {
    status: number;
    statusText?: string;
    headers?: Response['headers'];
    url?: string;
}, responseText: string) {
  let xml: Document;
  function getXML(onError?) {
    if (xml === undefined) {
      try {
        xml = new DOMParser().parseFromString(responseText, headers?.get(CTYPE)?.split(';')?.[0] as any)
      } catch (e) {
        xml = null;
        onError && onError(e)
      }
    }
    return xml;
  }
  return {
    // eslint-disable-next-line no-restricted-globals
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
export function attachCallbacks(fetchPm: Promise<Response>, callback: AjaxCallback) {
  const {success, error} = typeof callback === 'object' && callback != null ? callback : {
    success: typeof callback === 'function' ? callback : () => null,
    error: (e, x) => logError('Network error', e, x)
  };
  return fetchPm.then(response => response
      .text()
      .then((responseText) => [response, responseText] as [Response, string]))
    .then(([response, responseText]) => {
      const xhr = toXHR(response, responseText);
      response.ok || response.status === 304 ? success(responseText, xhr) : error(response.statusText, xhr);
    }, (reason) => error('', Object.assign(
      toXHR({status: 0}, ''),
      {reason, timedOut: reason?.name === 'AbortError'}))
    );
}

export type AjaxSuccessCallback = (responseText: string, xhr: XHR) => void;
export type AjaxErrorCallback = (statusText: string, xhr: XHR) => void;
export type AjaxCallback = AjaxSuccessCallback | { success?: AjaxErrorCallback; error?: AjaxSuccessCallback };

export function ajaxBuilder(timeout = 3000, {request, done} = {} as any, moduleType?: string, moduleName?: string) {
  const fetcher = fetcherFactory(timeout, {request, done}, moduleType, moduleName);
  return function (url: string, callback?: AjaxCallback, data?: unknown, options: AjaxOptions = {}) {
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

export type Ajax = typeof ajax;
