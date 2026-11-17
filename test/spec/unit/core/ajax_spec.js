import {
  ajax,
  ajaxBuilder,
  attachCallbacks,
  dep,
  fetch,
  fetcherFactory,
  toFetchRequest
} from '../../../../src/ajax.js';
import { config } from 'src/config.js';
import { server } from '../../../mocks/xhr.js';
import * as utils from 'src/utils.js';
import { registerActivityControl } from '../../../../src/activities/rules.js';
import { ACTIVITY_ACCESS_REQUEST_CREDENTIALS } from '../../../../src/activities/activities.js';
import { defer } from 'src/utils/promise.js';

const EXAMPLE_URL = 'https://www.example.com';

describe('ajax', () => {
  describe('fetcherFactory', () => {
    let clock;

    beforeEach(() => {
      clock = sinon.useFakeTimers();
      server.autoTimeout = true;
    });

    afterEach(() => {
      clock.runAll();
      clock.restore();
      config.resetConfig();
    });

    Object.entries({
      'URL': EXAMPLE_URL,
      'request object': new Request(EXAMPLE_URL)
    }).forEach(([t, resource]) => {
      it(`times out after timeout when fetching ${t}`, (done) => {
        const fetch = fetcherFactory(1000);
        const resp = fetch(resource);
        clock.tick(900);
        expect(server.requests[0].fetch.request.signal.aborted).to.be.false;
        clock.tick(100);
        expect(server.requests[0].fetch.request.signal.aborted).to.be.true;
        resp.catch(() => done());
      });
    });

    describe('credentials', () => {
      let resetRule, arqRule, denyCreds;
      beforeEach(() => {
        denyCreds = false;
        arqRule = sinon.stub().callsFake(() => {
          if (denyCreds) {
            return { allow: false };
          }
        });
        resetRule = registerActivityControl(ACTIVITY_ACCESS_REQUEST_CREDENTIALS, 'test', arqRule);
      });
      afterEach(() => {
        resetRule();
        config.resetConfig();
      });
      Object.entries({
        'URL': [EXAMPLE_URL, { credentials: 'include' }],
        'request object': [new Request(EXAMPLE_URL, { credentials: 'include' })],
      }).forEach(([t, args]) => {
        it('should be excluded when deviceAccess is false', () => {
          config.setConfig({ deviceAccess: false });
          fetcherFactory()(...args);
          expect(server.requests[0].fetch.request.credentials).to.eql('same-origin');
        });
        it('should be excluded when accessRequestCredentials is denied', () => {
          denyCreds = true;
          fetcherFactory(1000, undefined, 'prebid', 'test')(...args);
          sinon.assert.calledWith(arqRule, sinon.match({
            componentType: 'prebid',
            componentName: 'test'
          }));
          expect(server.requests[0].fetch.request.credentials).to.eql('same-origin');
        });
      });
    });

    it('does not timeout after it completes', () => {
      const fetch = fetcherFactory(1000);
      const resp = fetch(EXAMPLE_URL);
      server.requests[0].respond();
      return resp.then(() => {
        clock.tick(2000);
        expect(server.requests[0].fetch.request.signal.aborted).to.be.false;
      });
    });

    Object.entries({
      'disableAjaxTimeout is set'() {
        const fetcher = fetcherFactory(1000);
        config.setConfig({ disableAjaxTimeout: true });
        return fetcher;
      },
      'timeout is null'() {
        return fetcherFactory(null);
      },
    }).forEach(([t, mkFetcher]) => {
      it(`does not timeout if ${t}`, (done) => {
        const fetch = mkFetcher();
        const pm = fetch(EXAMPLE_URL);
        clock.tick(2000);
        server.requests[0].respond();
        pm.then(() => done());
      });
    });

    Object.entries({
      'local URL': ['/local.html', window.origin],
      'remote URL': [EXAMPLE_URL + '/remote.html', EXAMPLE_URL],
      'request with local URL': [new Request('/local.html'), window.origin],
      'request with remote URL': [new Request(EXAMPLE_URL + '/remote.html'), EXAMPLE_URL]
    }).forEach(([t, [resource, expectedOrigin]]) => {
      describe(`using ${t}`, () => {
        it('calls request, passing origin', () => {
          const request = sinon.stub();
          const fetch = fetcherFactory(1000, { request });
          fetch(resource);
          sinon.assert.calledWith(request, expectedOrigin);
        });

        Object.entries({
          success: 'respond',
          error: 'error'
        }).forEach(([t, method]) => {
          it(`calls done on ${t}, passing origin`, () => {
            const done = sinon.stub();
            const fetch = fetcherFactory(1000, { done });
            const req = fetch(resource).catch(() => null).then(() => {
              sinon.assert.calledWith(done, expectedOrigin);
            });
            server.requests[0][method]();
            return req;
          });
        });
      });
    });
  });

  describe('toFetchRequest', () => {
    Object.entries({
      'simple POST': {
        url: EXAMPLE_URL,
        data: 'data',
        expect: {
          request: {
            url: EXAMPLE_URL + '/',
            method: 'POST',
          },
          text: 'data',
          headers: {
            'content-type': 'text/plain'
          }
        }
      },
      'POST with headers': {
        url: EXAMPLE_URL,
        data: '{"json": "body"}',
        options: {
          contentType: 'application/json',
          customHeaders: {
            'x-custom': 'value'
          }
        },
        expect: {
          request: {
            url: EXAMPLE_URL + '/',
            method: 'POST',
          },
          text: '{"json": "body"}',
          headers: {
            'content-type': 'application/json',
            'X-Custom': 'value'
          }
        }
      },
      'simple GET': {
        url: EXAMPLE_URL,
        data: { p1: 'v1', p2: 'v2' },
        options: {
          method: 'GET',
        },
        expect: {
          request: {
            url: EXAMPLE_URL + '/?p1=v1&p2=v2',
            method: 'GET'
          },
          text: '',
          headers: {
            'content-type': 'text/plain'
          }
        }
      },
      'GET with credentials': {
        url: EXAMPLE_URL,
        data: null,
        options: {
          method: 'GET',
          withCredentials: true,
        },
        expect: {
          request: {
            url: EXAMPLE_URL + '/',
            method: 'GET',
            credentials: 'include'
          },
          text: '',
          headers: {
            'content-type': 'text/plain'
          }
        }
      }
    }).forEach(([t, { url, data, options, expect: { request, text, headers } }]) => {
      it(`can build ${t}`, () => {
        const req = toFetchRequest(url, data, options);
        return req.text().then(body => {
          Object.entries(request).forEach(([prop, val]) => {
            expect(req[prop]).to.eql(val);
          });
          const hdr = new Headers(headers);
          Array.from(req.headers.entries()).forEach(([name, val]) => {
            expect(hdr.get(name)).to.eql(val);
          });
          expect(body).to.eql(text);
        });
      });
    });
  });

  describe('credentials', () => {
    let resetRule, arqRule, denyCreds;
    beforeEach(() => {
      denyCreds = false;
      arqRule = sinon.stub().callsFake(() => {
        if (denyCreds) {
          return { allow: false };
        }
      });
      resetRule = registerActivityControl(ACTIVITY_ACCESS_REQUEST_CREDENTIALS, 'test', arqRule);
    });
    afterEach(() => {
      resetRule();
      config.resetConfig();
    });
    Object.entries({
      'fetch URL': {
        factory: fetcherFactory,
        fn: fetch,
        args: [EXAMPLE_URL, { credentials: 'include' }]
      },
      'fetch request object': {
        factory: fetcherFactory,
        fn: fetch,
        args: [new Request(EXAMPLE_URL, { credentials: 'include' })]
      },
      'ajax': {
        factory: ajaxBuilder,
        fn: ajax,
        args: [EXAMPLE_URL, null, null, { withCredentials: true }]
      }
    }).forEach(([t, { factory, fn, args }]) => {
      describe(t, () => {
        it('should be excluded when deviceAccess is false', () => {
          config.setConfig({ deviceAccess: false });
          factory(1000, {}, 'prebid', 'test')(...args);
          expect(server.requests[0].fetch.request.credentials).to.eql('same-origin');
        });
        it('should be excluded when accessRequestCredentials is denied', () => {
          denyCreds = true;
          factory(1000, {}, 'prebid', 'test')(...args);
          sinon.assert.calledWith(arqRule, sinon.match({
            componentType: 'prebid',
            componentName: 'test'
          }));
          expect(server.requests[0].fetch.request.credentials).to.eql('same-origin');
        });
        it('should be excluded when caller is not known', () => {
          fn(...args);
          expect(server.requests[0].fetch.request.credentials).to.eql('same-origin');
        });
        describe('should find moduleType/moduleName', () => {
          it('from fn.withCallers', () => {
            fn.withCallers([['prebid', 'test']])(...args);
            sinon.assert.calledWith(arqRule, sinon.match({
              component: 'prebid.test'
            }));
          });
          it('from factory.withCallers', () => {
            factory.withCallers([['prebid', 'test']])()(...args);
            sinon.assert.calledWith(arqRule, sinon.match({
              component: 'prebid.test'
            }));
          });
          it('factory should give precedence to explicit moduleType/moduleName', () => {
            factory.withCallers([['not', 'relevant']])(1000, {}, 'prebid', 'test')(...args);
            sinon.assert.calledWith(arqRule, sinon.match({
              component: 'prebid.test'
            }));
            sinon.assert.calledOnce(arqRule);
          });
          it('fn should give precedence to explicit moduleType/moduleName', () => {
            factory(1000, {}, 'prebid', 'test').withCallers([['not', 'relevant']])(...args);
            sinon.assert.calledWith(arqRule, sinon.match({
              component: 'prebid.test'
            }));
            sinon.assert.calledOnce(arqRule);
          });
        });
      });
    });
  });

  describe('keepalive', () => {
    let sandbox, request;
    before(() => {
      server.restore();
    });
    after(() => {
      server.enable();
    });
    beforeEach(() => {
      request = defer();
      sandbox = sinon.createSandbox();
      sandbox.stub(dep, 'makeRequest').callsFake((r, o) => {
        const req = new Request(r, o);
        sandbox.spy(req, 'clone');
        return req;
      });
      sandbox.stub(dep, 'fetch').callsFake(req => {
        request.resolve(req);
        return new Promise((resolve) => {});
      });
    });
    afterEach(() => {
      sandbox.restore();
    });
    Object.entries({
      'small payload': {
        body: 'x'.repeat(1024),
        keepalive: true
      },
      'maximum keepalive payload': {
        body: 'x'.repeat(65536),
        keepalive: true
      },
      'large payload': {
        body: 'x'.repeat(65537),
        keepalive: false
      },
    }).forEach(([t, { body, keepalive }]) => {
      describe(`POST with ${t}`, () => {
        Object.entries({
          ajax() {
            ajax(EXAMPLE_URL, () => {}, body, { method: 'POST', keepalive: true });
          },
          fetch() {
            fetch(EXAMPLE_URL, { method: 'POST', body, keepalive: true });
          },
          'fetch with a keepalive Request'() {
            fetch(new Request(EXAMPLE_URL, { method: 'POST', body, keepalive: true }));
          }
        }).forEach(([name, fn]) => {
          describe(name, () => {
            it(`should set keepalive = ${keepalive}`, () => {
              fn();
              return request.promise.then(req => {
                expect(req.keepalive).to.eql(keepalive);
              });
            });
            it('should not use the body', () => {
              fn();
              return request.promise.then(req => {
                expect(req.bodyUsed).to.be.false;
              });
            });
          });
        });
      });
    });
    ['Safari', 'Firefox'].forEach(browser => {
      describe(`with ${browser} Request behavior`, () => {
        beforeEach(() => {
          dep.makeRequest.callsFake((resource, options) => {
            if (browser === 'Safari' && resource instanceof Request && resource.keepalive && options?.keepalive === false) {
              throw new TypeError('Cannot clear keepalive on a Request');
            }
            const req = new Request(resource, browser === 'Firefox' ? { keepalive: false, ...options } : options);
            if (browser === 'Firefox') {
              // Firefox can expose no body stream even though blob() still reads the payload.
              Object.defineProperty(req, 'body', { value: null });
            }
            return req;
          });
        });

        it('should preserve the body and settings when falling back for an oversized Request', async () => {
          const body = 'x'.repeat(65537);
          const controller = new AbortController();
          const resource = new Request(EXAMPLE_URL, {
            method: 'POST',
            body,
            keepalive: true,
            headers: { 'x-test': 'value', 'content-type': 'text/plain' },
            credentials: 'same-origin',
            mode: 'same-origin',
            cache: 'no-store',
            redirect: 'error',
            referrer: EXAMPLE_URL + '/referrer',
            referrerPolicy: 'no-referrer',
            integrity: 'sha256-test',
            signal: controller.signal
          });
          fetcherFactory(null)(resource, { referrerPolicy: resource.referrerPolicy });
          const sent = await request.promise;
          expect(sent.keepalive).to.be.false;
          expect(sent.bodyUsed).to.be.false;
          expect(sent.credentials).to.equal('same-origin');
          ['url', 'method', 'mode', 'cache', 'redirect', 'referrer', 'referrerPolicy', 'integrity'].forEach(key => {
            expect(sent[key], key).to.equal(resource[key]);
          });
          expect(Array.from(sent.headers)).to.deep.equal(Array.from(resource.headers));
          expect(await sent.text()).to.equal(body);
          controller.abort();
          expect(sent.signal.aborted).to.be.true;
        });

        it('should use the overridden body and send synchronously when its size is known', async () => {
          const body = 'x'.repeat(65537);
          fetcherFactory(null)(new Request(EXAMPLE_URL, {
            method: 'POST', body: 'original', keepalive: true
          }), { body });
          sinon.assert.calledOnce(dep.fetch);
          const sent = await request.promise;
          expect(sent.keepalive).to.be.false;
          expect(await sent.text()).to.equal(body);
        });

        [
          { method: 'GET', body: null },
          { method: 'HEAD', body: null },
          { method: 'POST', body: null },
          { method: 'POST', body: '' },
          { method: 'POST', body: 'payload' },
          { method: 'PUT', body: 'payload' }
        ].forEach(({ method, body }) => {
          it(`should honor an explicit keepalive false for ${method} with body ${JSON.stringify(body)}`, async () => {
            fetcherFactory(null)(new Request(EXAMPLE_URL, {
              method, body, keepalive: true
            }), { keepalive: false });
            const sent = await request.promise;
            expect(sent.keepalive).to.be.false;
            expect(sent.bodyUsed).to.be.false;
            expect(await sent.text()).to.equal(body || '');
          });
        });

        it('should retain keepalive at the size limit after credentials are removed', async () => {
          const body = 'x'.repeat(65536);
          fetcherFactory(null)(new Request(EXAMPLE_URL, {
            method: 'POST', body, keepalive: true, credentials: 'include'
          }));
          const sent = await request.promise;
          expect(sent.keepalive).to.be.true;
          expect(sent.credentials).to.equal('same-origin');
          expect(await sent.text()).to.equal(body);
        });
      });
    });

    it('should let explicit keepalive false override the legacy keepalive marker', async () => {
      fetcherFactory(null)(toFetchRequest(EXAMPLE_URL, 'payload', { keepalive: true }), { keepalive: false });
      sinon.assert.calledOnce(dep.fetch);
      const sent = await request.promise;
      expect(sent.keepalive).to.be.false;
      expect(await sent.text()).to.equal('payload');
    });

    describe('when the body size is known', () => {
      Object.entries({
        'ajax POST': () => ajax(EXAMPLE_URL, () => {}, 'x'.repeat(1024), { method: 'POST', keepalive: true }),
        'ajax GET': () => ajax(EXAMPLE_URL, () => {}, null, { method: 'GET', keepalive: true }),
        'fetch with a string body': () => fetch(EXAMPLE_URL, { method: 'POST', body: 'x'.repeat(1024), keepalive: true }),
        'fetch without a body': () => fetch(EXAMPLE_URL, { keepalive: true }),
      }).forEach(([t, fn]) => {
        it(`${t} should start the request synchronously, with keepalive`, () => {
          fn();
          sinon.assert.calledOnce(dep.fetch);
          expect(dep.fetch.firstCall.args[0].keepalive).to.be.true;
        });
      });

      it('should not use keepalive for a large body', () => {
        ajax(EXAMPLE_URL, () => {}, 'x'.repeat(65537), { method: 'POST', keepalive: true });
        sinon.assert.calledOnce(dep.fetch);
        expect(dep.fetch.firstCall.args[0].keepalive).to.be.false;
      });
    });

    it('should not try to get body size for requests that do not ask for keepalive', () => {
      fetch(EXAMPLE_URL, { body: 'test', method: 'POST' });
      return request.promise.then(req => {
        sinon.assert.notCalled(req.clone);
      });
    });
  });

  describe('attachCallbacks', () => {
    const sampleHeaders = new Headers({
      'x-1': 'v1',
      'x-2': 'v2'
    });

    function responseFactory(body, props) {
      props = Object.assign({ headers: sampleHeaders, url: EXAMPLE_URL }, props);
      return function () {
        return {
          response: Object.defineProperties(new Response(body, props), {
            url: {
              get: () => props.url
            }
          }),
          body: body || ''
        };
      };
    }

    function expectNullXHR(response, reason) {
      return new Promise((resolve, reject) => {
        attachCallbacks(Promise.resolve(response), {
          success: () => {
            reject(new Error('should not succeed'));
          },
          error(statusText, xhr) {
            expect(statusText).to.eql('');
            sinon.assert.match(xhr, {
              readyState: XMLHttpRequest.DONE,
              status: 0,
              statusText: '',
              responseText: '',
              response: '',
              responseXML: null,
              reason
            });
            expect(xhr.getResponseHeader('any')).to.be.null;
            resolve();
          }
        });
      });
    }

    it('runs error callback on rejections', () => {
      const err = new Error();
      return expectNullXHR(Promise.reject(err), err);
    });

    it('sets timedOut = true on fetch timeout', (done) => {
      const ctl = new AbortController();
      ctl.abort();
      attachCallbacks(window.fetch('/', { signal: ctl.signal }), {
        error(_, xhr) {
          expect(xhr.timedOut).to.be.true;
          done();
        }
      });
    });

    Object.entries({
      '2xx response': {
        success: true,
        makeResponse: responseFactory('body', { status: 200, statusText: 'OK' })
      },
      '2xx response with no body': {
        success: true,
        makeResponse: responseFactory(null, { status: 204, statusText: 'No content' })
      },
      '2xx response with XML': {
        success: true,
        xml: true,
        makeResponse: responseFactory('<?xml><root><tag /></root>', {
          status: 200,
          statusText: 'OK',
          headers: { 'content-type': 'application/xml;charset=UTF8' }
        })
      },
      '2xx response with HTML': {
        success: true,
        xml: true,
        makeResponse: responseFactory('<html lang="en"><p></p></html>', {
          status: 200,
          statusText: 'OK',
          headers: { 'content-type': 'text/html;charset=UTF-8' }
        })
      },
      '304 response': {
        success: true,
        makeResponse: responseFactory(null, { status: 304, statusText: 'Moved permanently' })
      },
      '4xx response': {
        success: false,
        makeResponse: responseFactory('body', { status: 400, statusText: 'Invalid request' })
      },
      '5xx response': {
        success: false,
        makeResponse: responseFactory('body', { status: 503, statusText: 'Gateway error' })
      },
      '4xx response with XML': {
        success: false,
        xml: true,
        makeResponse: responseFactory('<?xml><root></root>', {
          status: 404,
          statusText: 'Not found',
          headers: {
            'content-type': 'application/xml'
          }
        })
      }
    }).forEach(([t, { success, makeResponse, xml }]) => {
      const cbType = success ? 'success' : 'error';

      describe(`for ${t}`, () => {
        let sandbox, response, body;
        beforeEach(() => {
          sandbox = sinon.createSandbox();
          sandbox.spy(utils, 'logError');
          ({ response, body } = makeResponse());
        });

        afterEach(() => {
          sandbox.restore();
        });

        function checkXHR(xhr) {
          utils.logError.resetHistory();
          const serialized = JSON.parse(JSON.stringify(xhr));
          // serialization of `responseXML` should not generate console messages
          sinon.assert.notCalled(utils.logError);

          sinon.assert.match(serialized, {
            readyState: XMLHttpRequest.DONE,
            status: response.status,
            statusText: response.statusText,
            responseType: '',
            responseURL: response.url,
            response: body,
            responseText: body,
          });
          if (xml) {
            expect(xhr.responseXML.querySelectorAll('*').length > 0).to.be.true;
          } else {
            expect(serialized.responseXML).to.not.exist;
          }
          Array.from(response.headers.entries()).forEach(([name, value]) => {
            expect(xhr.getResponseHeader(name)).to.eql(value);
          });
          expect(xhr.getResponseHeader('$$missing-header')).to.be.null;
        }

        it(`runs ${cbType} callback`, (done) => {
          attachCallbacks(Promise.resolve(response), {
            success(payload, xhr) {
              expect(success).to.be.true;
              expect(payload).to.eql(body);
              checkXHR(xhr);
              done();
            },
            error(statusText, xhr) {
              expect(success).to.be.false;
              expect(statusText).to.eql(response.statusText);
              checkXHR(xhr);
              done();
            }
          });
        });

        it(`runs error callback if body cannot be retrieved`, () => {
          const err = new Error();
          response.text = () => Promise.reject(err);
          return expectNullXHR(response, err);
        });

        if (success) {
          it('accepts a single function as success callback', (done) => {
            attachCallbacks(Promise.resolve(response), function (payload, xhr) {
              expect(payload).to.eql(body);
              checkXHR(xhr);
              done();
            });
          });
        }
      });
    });

    describe('callback exceptions', () => {
      Object.entries({
        success: responseFactory(null, { status: 204 }),
        error: responseFactory('', { status: 400 }),
      }).forEach(([cbType, makeResponse]) => {
        it(`do not choke ${cbType} callbacks`, () => {
          const { response } = makeResponse();
          const result = { success: false, error: false };
          return attachCallbacks(Promise.resolve(response), {
            success() {
              result.success = true;
              throw new Error();
            },
            error() {
              result.error = true;
              throw new Error();
            }
          }).catch(() => null)
            .then(() => {
              Object.entries(result).forEach(([typ, ran]) => {
                expect(ran).to.be[typ === cbType ? 'true' : 'false'];
              });
            });
        });
      });
    });
  });
});
