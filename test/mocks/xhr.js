import {getUniqueIdentifierStr} from '../../src/utils.js';
import {GreedyPromise} from '../../src/utils/promise.js';
import {fakeXhr} from 'nise';
import {dep} from 'src/ajax.js';

export const xhr = sinon.useFakeXMLHttpRequest();
export const server = mockFetchServer();

/**
 * An (incomplete) replica of nise's fakeServer, but backing fetch used in ajax.js (rather than XHR).
 */
function mockFetchServer() {
  const sandbox = sinon.createSandbox();
  const bodies = new WeakMap();
  const requests = [];
  const {DONE, UNSENT} = XMLHttpRequest;

  function makeRequest(resource, options) {
    const requestBody = options?.body || bodies.get(resource);
    const request = new Request(resource, options);
    bodies.set(request, requestBody);
    return request;
  }

  function mockXHR(resource, options) {
    let resolve, reject;
    const promise = new GreedyPromise((res, rej) => {
      resolve = res;
      reject = rej;
    });

    function error(reason = new TypeError('Failed to fetch')) {
      mockReq.status = 0;
      reject(reason);
    }

    const request = makeRequest(resource, options);
    request.signal.onabort = () => error(new DOMException('The user aborted a request'));
    let responseHeaders;

    const mockReq = {
      fetch: {
        request,
        requestBody: bodies.get(request),
        promise,
      },
      readyState: UNSENT,
      url: request.url,
      method: request.method,
      requestBody: bodies.get(request),
      status: 0,
      statusText: '',
      requestHeaders: new Proxy(request.headers, {
        get(target, prop) {
          return typeof prop === 'string' && target.has(prop) ? target.get(prop) : {}[prop];
        },
        has(target, prop) {
          return typeof prop === 'string' && target.has(prop);
        },
        ownKeys(target) {
          return Array.from(target.keys());
        },
        getOwnPropertyDescriptor(target, prop) {
          if (typeof prop === 'string' && target.has(prop)) {
            return {
              enumerable: true,
              configurable: true,
              writable: false,
              value: target.get(prop)
            }
          }
        }
      }),
      withCredentials: request.credentials === 'include',
      setStatus(status) {
        // nise replaces invalid status with 200
        status = typeof status === 'number' ? status : 200;
        mockReq.status = status;
        mockReq.statusText = fakeXhr.FakeXMLHttpRequest.statusCodes[status] || '';
      },
      setResponseHeaders(headers) {
        responseHeaders = headers;
      },
      setResponseBody(body) {
        if (mockReq.status === 0) {
          error();
          return;
        }
        const resp = Object.defineProperties(new Response(body, {
          status: mockReq.status,
          statusText: mockReq.statusText,
          headers: responseHeaders || {},
        }), {
          url: {
            get: () => mockReq.fetch.request.url,
          }
        });
        mockReq.readyState = DONE;
        // tests expect respond() to run everything immediately,
        // so make body available syncronously
        resp.text = () => GreedyPromise.resolve(body || '');
        Object.assign(mockReq.fetch, {
          response: resp,
          responseBody: body || ''
        })
        resolve(resp);
      },
      respond(status = 200, headers, body) {
        mockReq.setStatus(status);
        mockReq.setResponseHeaders(headers);
        mockReq.setResponseBody(body);
      },
      error
    };
    return mockReq;
  }

  let enabled = false;
  let timeoutsEnabled = false;

  function enable() {
    if (!enabled) {
      sandbox.stub(dep, 'fetch').callsFake((resource, options) => {
        const req = mockXHR(resource, options);
        requests.push(req);
        return req.fetch.promise;
      });
      sandbox.stub(dep, 'makeRequest').callsFake(makeRequest);
      const timeout = dep.timeout;
      sandbox.stub(dep, 'timeout').callsFake(function () {
        if (timeoutsEnabled) {
          return timeout.apply(null, arguments);
        } else {
          return {};
        }
      });
      enabled = true;
    }
  }

  enable();

  const responders = [];

  function respondWith() {
    let response, urlMatcher, methodMatcher;
    urlMatcher = methodMatcher = () => true;
    switch (arguments.length) {
      case 1:
        ([response] = arguments);
        break;
      case 2:
        ([urlMatcher, response] = arguments);
        break;
      case 3:
        ([methodMatcher, urlMatcher, response] = arguments);
        methodMatcher = ((toMatch) => (method) => method === toMatch)(methodMatcher);
        break;
      default:
        throw new Error('Invalid respondWith invocation');
    }
    if (typeof urlMatcher.exec === 'function') {
      urlMatcher = ((rx) => (url) => rx.exec(url)?.slice(1))(urlMatcher);
    } else if (typeof urlMatcher === 'string') {
      urlMatcher = ((toMatch) => (url) => url === toMatch)(urlMatcher);
    }
    responders.push((req) => {
      if (req.readyState !== DONE && methodMatcher(req.method)) {
        const arg = urlMatcher(req.url);
        if (arg) {
          if (typeof response === 'function') {
            response(req, ...(Array.isArray(arg) ? arg : []));
          } else if (typeof response === 'string') {
            req.respond(200, null, response);
          } else {
            req.respond.apply(req, response);
          }
        }
      }
    });
  }

  function resetState() {
    requests.length = 0;
    responders.length = 0;
    timeoutsEnabled = false;
  }

  return {
    requests,
    enable,
    restore() {
      resetState();
      sandbox.restore();
      enabled = false;
    },
    reset() {
      sandbox.resetHistory();
      resetState();
    },
    respondWith,
    respond() {
      if (arguments.length > 0) {
        respondWith.apply(null, arguments);
      }
      requests.forEach(req => {
        for (let i = responders.length - 1; i >= 0; i--) {
          responders[i](req);
          if (req.readyState === DONE) break;
        }
        if (req.readyState !== DONE) {
          req.respond(404, {}, '');
        }
      });
    },
    /**
     * the timeout mechanism is quite different between XHR and fetch
     * by default, mocked fetch does not time out - to reflect fakeServer XHRs
     * note that many tests will fire requests without caring or waiting for their response -
     * if they are timed out later, during unrelated tests, the log messages might interfere with their
     * assertions
     */
    get autoTimeout() {
      return timeoutsEnabled;
    },
    set autoTimeout(val) {
      timeoutsEnabled = !!val;
    }
  };
}

beforeEach(function () {
  server.reset();
});

const bid = getUniqueIdentifierStr().substring(4);
let fid = 0;

/* eslint-disable */
afterEach(function () {
  if (this?.currentTest?.state === 'failed') {
    const prepend = (() => {
      const preamble = `[Failure ${bid}-${fid++}]`;
      return (s) => s.split('\n').map(s => `${preamble} ${s}`).join('\n');
    })();

    function format(obj, body = null) {
      if (obj == null) return obj;
      const fmt = {};
      let node = obj;
      while (node != null) {
        Object.keys(node).forEach((k) => {
          const val = obj[k];
          if (typeof val !== 'function' && !fmt.hasOwnProperty(k)) {
            fmt[k] = val;
          }
        });
        node = Object.getPrototypeOf(node);
      }
      if (obj.headers != null) {
        fmt.headers = Object.fromEntries(obj.headers.entries())
      }
      fmt.body = body;
      return fmt;
    }


    console.log(prepend(`XHR mock state after failure (for test '${this.currentTest.fullTitle()}'): ${server.requests.length} requests`));
    server.requests.forEach((req, i) => {
      console.log(prepend(`Request #${i}:`));
      console.log(prepend(JSON.stringify({
        request: format(req.fetch.request, req.fetch.requestBody),
        response: format(req.fetch.response, req.fetch.responseBody)
      }, null, 2)));
    });
  }
});
/* eslint-enable */
