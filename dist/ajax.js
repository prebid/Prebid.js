"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.ajax = void 0;
exports.ajaxBuilder = ajaxBuilder;
exports.attachCallbacks = attachCallbacks;
exports.fetch = exports.dep = void 0;
exports.fetcherFactory = fetcherFactory;
exports.toFetchRequest = toFetchRequest;
var _config = require("./config.js");
var _utils = require("./utils.js");
const dep = exports.dep = {
  fetch: window.fetch.bind(window),
  makeRequest: (r, o) => new Request(r, o),
  timeout(timeout, resource) {
    const ctl = new AbortController();
    let cancelTimer = setTimeout(() => {
      ctl.abort();
      (0, _utils.logError)("Request timeout after ".concat(timeout, "ms"), resource);
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

/**
 * transform legacy `ajax` parameters into a fetch request.
 * @returns {Request}
 */
function toFetchRequest(url, data) {
  let options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
  const method = options.method || (data ? POST : GET);
  if (method === GET && data) {
    const urlInfo = (0, _utils.parseUrl)(url, options);
    Object.assign(urlInfo.search, data);
    url = (0, _utils.buildUrl)(urlInfo);
  }
  const headers = new Headers(options.customHeaders);
  headers.set(CTYPE, options.contentType || 'text/plain');
  const rqOpts = {
    method,
    headers
  };
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
  return dep.makeRequest(url, rqOpts);
}

/**
 * Return a version of `fetch` that automatically cancels requests after `timeout` milliseconds.
 *
 * If provided, `request` and `done` should be functions accepting a single argument.
 * `request` is invoked at the beginning of each request, and `done` at the end; both are passed its origin.
 *
 * @returns {function(*, {}?): Promise<Response>}
 */
function fetcherFactory() {
  let timeout = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 3000;
  let {
    request,
    done
  } = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  let fetcher = (resource, options) => {
    var _options, _to;
    let to;
    if (timeout != null && ((_options = options) === null || _options === void 0 ? void 0 : _options.signal) == null && !_config.config.getConfig('disableAjaxTimeout')) {
      to = dep.timeout(timeout, resource);
      options = Object.assign({
        signal: to.signal
      }, options);
    }
    let pm = dep.fetch(resource, options);
    if (((_to = to) === null || _to === void 0 ? void 0 : _to.done) != null) pm = pm.finally(to.done);
    return pm;
  };
  if (request != null || done != null) {
    fetcher = (fetch => function (resource, options) {
      const origin = new URL((resource === null || resource === void 0 ? void 0 : resource.url) == null ? resource : resource.url, document.location).origin;
      let req = fetch(resource, options);
      request && request(origin);
      if (done) req = req.finally(() => done(origin));
      return req;
    })(fetcher);
  }
  return fetcher;
}
function toXHR(_ref, responseText) {
  let {
    status,
    statusText = '',
    headers,
    url
  } = _ref;
  let xml = 0;
  function getXML(onError) {
    if (xml === 0) {
      try {
        var _headers$get;
        xml = new DOMParser().parseFromString(responseText, headers === null || headers === void 0 || (_headers$get = headers.get(CTYPE)) === null || _headers$get === void 0 || (_headers$get = _headers$get.split(';')) === null || _headers$get === void 0 ? void 0 : _headers$get[0]);
      } catch (e) {
        xml = null;
        onError && onError(e);
      }
    }
    return xml;
  }
  return {
    readyState: XMLHttpRequest.DONE,
    status,
    statusText,
    responseText,
    response: responseText,
    responseType: '',
    responseURL: url,
    get responseXML() {
      return getXML(_utils.logError);
    },
    getResponseHeader: header => headers !== null && headers !== void 0 && headers.has(header) ? headers.get(header) : null,
    toJSON() {
      return Object.assign({
        responseXML: getXML()
      }, this);
    },
    timedOut: false
  };
}

/**
 * attach legacy `ajax` callbacks to a fetch promise.
 */
function attachCallbacks(fetchPm, callback) {
  const {
    success,
    error
  } = typeof callback === 'object' && callback != null ? callback : {
    success: typeof callback === 'function' ? callback : () => null,
    error: (e, x) => (0, _utils.logError)('Network error', e, x)
  };
  fetchPm.then(response => response.text().then(responseText => [response, responseText])).then(_ref2 => {
    let [response, responseText] = _ref2;
    const xhr = toXHR(response, responseText);
    response.ok || response.status === 304 ? success(responseText, xhr) : error(response.statusText, xhr);
  }, reason => error('', Object.assign(toXHR({
    status: 0
  }, ''), {
    reason,
    timedOut: (reason === null || reason === void 0 ? void 0 : reason.name) === 'AbortError'
  })));
}
function ajaxBuilder() {
  let timeout = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 3000;
  let {
    request,
    done
  } = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  const fetcher = fetcherFactory(timeout, {
    request,
    done
  });
  return function (url, callback, data) {
    let options = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : {};
    attachCallbacks(fetcher(toFetchRequest(url, data, options)), callback);
  };
}
const ajax = exports.ajax = ajaxBuilder();
const fetch = exports.fetch = fetcherFactory();