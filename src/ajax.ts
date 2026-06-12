import { ACTIVITY_ACCESS_REQUEST_CREDENTIALS } from './activities/activities.js';
import { activityParams } from './activities/activityParams.js';
import { isActivityAllowed } from './activities/rules.js';
import { config } from './config.js';
import { buildUrl, logError, logWarn, parseUrl } from './utils.js';
import type { ModuleType } from "./activities/modules.ts";

export const dep = {
  fetch: window.fetch.bind(window),
  makeRequest: (r, o?) => new Request(r, o),
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
        cancelTimer && clearTimeout(cancelTimer);
      }
    };
  }
};

const GET = 'GET';
const POST = 'POST';
const CTYPE = 'Content-Type';
const KEEPALIVE_MAX_BODY_SIZE = 64 * 1024;
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
   * If true, suppress warnings
   */
  suppressTopicsEnrollmentWarning?: boolean;
}

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
  };
  if (method !== GET && data) {
    rqOpts.body = data;
  }
  if (options.withCredentials) {
    rqOpts.credentials = 'include';
  }
  if (isSecureContext) {
    ['browsingTopics'].forEach(opt => {
      // the Request constructor will throw an exception if the browser supports topics
      // but we're not in a secure context
      if (options[opt]) {
        rqOpts[opt] = true;
      }
    });
    if (options.suppressTopicsEnrollmentWarning != null) {
      rqOpts.suppressTopicsEnrollmentWarning = options.suppressTopicsEnrollmentWarning;
    }
  }
  const request = dep.makeRequest(url, rqOpts);
  if (options.keepalive) {
    // do not set the "real" keepalive flag as Safari won't allow us to change it
    (request as any)._keepalive = true;
  }
  return request;
}

function callerContext(callers = []) {
  const stack = [callers];
  return {
    attach(fn, callers) {
      return function (...args) {
        stack.push(callers);
        try {
          return fn(...args);
        } finally {
          stack.pop();
        }
      };
    },
    getCallers() {
      return stack[stack.length - 1];
    }
  };
}

function fixedCallerContext(moduleType, moduleName) {
  return {
    attach: (fn) => fn,
    getCallers: () => [[moduleType, moduleName]]
  };
}

/**
 * Return a version of `fetch` that automatically cancels requests after `timeout` milliseconds.
 *
 * If provided, `request` and `done` should be functions accepting a single argument.
 * `request` is invoked at the beginning of each request, and `done` at the end; both are passed its origin.
 */
export function fetcherFactory(timeout = 3000, { request, done }: any = {}, moduleType?: string, moduleName?: string): typeof window['fetch'] {
  return fetcherFactoryImpl(callerContext(), timeout, { request, done }, moduleType, moduleName);
}
(fetcherFactory as any).withCallers = (callers) => {
  // this is not intended to be used directly; see plugins/callerContext.js
  return (...args) => {
    return fetcherFactoryImpl(callerContext(callers), ...args);
  };
};

function fetcherFactoryImpl(context, timeout = 3000, { request, done }: any = {}, moduleType?: string, moduleName?: string): typeof window.fetch {
  if (moduleName && moduleType) {
    context = fixedCallerContext(moduleType, moduleName);
  }
  let fetcher = (resource, options) => {
    // special treatment for keepalive - because of inconsistent browser behavior,
    // we must start with keepalive: false and flip it as a last step
    // Updating request options with new Request(oldRequest, newOptions):
    //  on Firefox, will default newOptions.keepalive = false
    //  on Safari, will not allow keepalive = true to become = false
    const keepalive = resource?._keepalive ?? options?.keepalive ?? resource?.keepalive;
    let to;
    if (timeout != null && options?.signal == null && !config.getConfig('disableAjaxTimeout')) {
      to = dep.timeout(timeout, resource);
      options = Object.assign({ signal: to.signal }, options);
    }
    let request = dep.makeRequest(resource, {
      ...options,
      keepalive: false
    });

    if (
      request.credentials === 'include' && (
        context.getCallers().length === 0 ||
        context.getCallers().some(([moduleType, moduleName]) => !isActivityAllowed(ACTIVITY_ACCESS_REQUEST_CREDENTIALS, activityParams(moduleType, moduleName)))
      )
    ) {
      request = dep.makeRequest(request, {
        credentials: 'same-origin'
      });
    }
    let pm;
    if (keepalive) {
      // requests can be "used" only once - and blob() counts as usage, so clone the request
      pm = request.clone().blob().then(blob => {
        if (blob.size > KEEPALIVE_MAX_BODY_SIZE) {
          logWarn(`Ignoring keepalive: request body exceeds ${KEEPALIVE_MAX_BODY_SIZE} bytes`, request);
        } else {
          request = dep.makeRequest(request, {
            keepalive: true
          });
        }
        return dep.fetch(request);
      });
    } else {
      pm = dep.fetch(request);
    }
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
  (fetcher as any).withCallers = (callers) => context.attach(fetcher, callers);
  return fetcher;
}

export type XHR = ReturnType<typeof toXHR>;

function toXHR({ status, statusText = '', headers, url }: {
  status: number;
  statusText?: string;
  headers?: Response['headers'];
  url?: string;
}, responseText: string) {
  let xml: Document;
  function getXML(onError?) {
    if (xml === undefined) {
      try {
        xml = new DOMParser().parseFromString(responseText, headers?.get(CTYPE)?.split(';')?.[0] as any);
      } catch (e) {
        xml = null;
        onError && onError(e);
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
      return Object.assign({ responseXML: getXML() }, this);
    },
    timedOut: false
  };
}

/**
 * attach legacy `ajax` callbacks to a fetch promise.
 */
export function attachCallbacks(fetchPm: Promise<Response>, callback: AjaxCallback) {
  const { success, error } = typeof callback === 'object' && callback != null ? callback : {
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
      toXHR({ status: 0 }, ''),
      { reason, timedOut: reason?.name === 'AbortError' }))
    );
}

export type AjaxSuccessCallback = (responseText: string, xhr: XHR) => void;
export type AjaxErrorCallback = (statusText: string, xhr: XHR) => void;
export type AjaxCallback = AjaxSuccessCallback | { success?: AjaxErrorCallback; error?: AjaxSuccessCallback };

export function ajaxBuilder(timeout = 3000, { request, done } = {} as any, moduleType?: string, moduleName?: string) {
  return ajaxBuilderImpl(callerContext(), timeout, { request, done }, moduleType, moduleName);
}
(ajaxBuilder as any).withCallers = (callers) => {
  // this is not intended to be used directly; see plugins/callerContext.js
  return (...args) => {
    return ajaxBuilderImpl(callerContext(callers), ...args);
  };
};

function ajaxBuilderImpl(context, timeout = 3000, { request, done } = {} as any, moduleType?: string, moduleName?: string) {
  const fetcher = fetcherFactoryImpl(context, timeout, { request, done }, moduleType, moduleName);
  function ajax(url: string, callback?: AjaxCallback, data?: unknown, options: AjaxOptions = {}) {
    attachCallbacks(fetcher(toFetchRequest(url, data, options)), callback);
  }
  (ajax as any).withCallers = (callers) => context.attach(ajax, callers);
  return ajax;
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

function requireNames<T extends typeof ajaxBuilder | typeof fetcherFactory>(fn: T) {
  return function (moduleType: ModuleType, moduleName: string, timeout?: number, requestCallbacks?): ReturnType<T> {
    if (!moduleType || !moduleName) {
      throw new Error('moduleType and moduleName are required');
    }
    return (fn as any)(timeout, requestCallbacks, moduleType, moduleName);
  };
}

/**
 * A version of ajaxBuilder that requires an explicit moduleType and moduleName.
 */
export const qualifiedAjaxBuilder = requireNames(ajaxBuilder);
/**
 * A version of fetcherFactory that requires an explicit moduleType and moduleName.
 */
export const qualifiedFetcherFactory = requireNames(fetcherFactory);

export const ajax = ajaxBuilder();
export const fetch = fetcherFactory();

// the difference between 'noCredsAjax'/'noCredsFetch' and 'ajax'/'fetch' is that the latter two (together with
// ajaxBuilder and fetcherFactory) are automatically decorated with moduleType/moduleName at build time -
// see plugins/callerContext.js

/**
 * A version of `ajax` that will never include request credentials (withCredentials = false).
 */
export const noCredsAjax = ajax;
/**
 * A version of `fetch` that will  never include request credentials (credentials = 'same-origin').
 */
export const noCredsFetch = fetch;

export type Ajax = typeof ajax;
