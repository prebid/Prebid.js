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

    describe('chrome options', () => {
      ['browsingTopics'].forEach(option => {
        Object.entries({
          [`${option} = true`]: [{ [option]: true }, true],
          [`${option} = false`]: [{ [option]: false }, false],
          [`${option} undef`]: [{}, false]
        }).forEach(([t, [opts, shouldBeSet]]) => {
          describe(`when options has ${t}`, () => {
            const sandbox = sinon.createSandbox();
            afterEach(() => {
              sandbox.restore();
            });

            it(`should ${!shouldBeSet ? 'not ' : ''}be set when in a secure context`, () => {
              sandbox.stub(window, 'isSecureContext').get(() => true);
              toFetchRequest(EXAMPLE_URL, null, opts);
              sinon.assert.calledWithMatch(dep.makeRequest, sinon.match.any, { [option]: shouldBeSet ? true : undefined });
            });
            it(`should not be set when not in a secure context`, () => {
              sandbox.stub(window, 'isSecureContext').get(() => false);
              toFetchRequest(EXAMPLE_URL, null, opts);
              sinon.assert.calledWithMatch(dep.makeRequest, sinon.match.any, { [option]: undefined });
            });
          });
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
