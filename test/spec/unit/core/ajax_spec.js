import {attachCallbacks, dep, fetcherFactory, toFetchRequest} from '../../../../src/ajax.js';
import {config} from 'src/config.js';
import {server} from '../../../mocks/xhr.js';
import * as utils from 'src/utils.js';
import {logError} from 'src/utils.js';

const EXAMPLE_URL = 'https://www.example.com';

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
      config.setConfig({disableAjaxTimeout: true});
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
        const fetch = fetcherFactory(1000, {request});
        fetch(resource);
        sinon.assert.calledWith(request, expectedOrigin);
      });

      Object.entries({
        success: 'respond',
        error: 'error'
      }).forEach(([t, method]) => {
        it(`calls done on ${t}, passing origin`, () => {
          const done = sinon.stub();
          const fetch = fetcherFactory(1000, {done});
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
      data: {p1: 'v1', p2: 'v2'},
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
  }).forEach(([t, {url, data, options, expect: {request, text, headers}}]) => {
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

  describe('browsingTopics', () => {
    Object.entries({
      'browsingTopics = true': [{browsingTopics: true}, true],
      'browsingTopics = false': [{browsingTopics: false}, false],
      'browsingTopics is undef': [{}, false]
    }).forEach(([t, [opts, shouldBeSet]]) => {
      describe(`when options has ${t}`, () => {
        const sandbox = sinon.createSandbox();
        afterEach(() => {
          sandbox.restore();
        });

        it(`should ${!shouldBeSet ? 'not ' : ''}be set when in a secure context`, () => {
          sandbox.stub(window, 'isSecureContext').get(() => true);
          toFetchRequest(EXAMPLE_URL, null, opts);
          sinon.assert.calledWithMatch(dep.makeRequest, sinon.match.any, {browsingTopics: shouldBeSet ? true : undefined});
        });
        it(`should not be set when not in a secure context`, () => {
          sandbox.stub(window, 'isSecureContext').get(() => false);
          toFetchRequest(EXAMPLE_URL, null, opts);
          sinon.assert.calledWithMatch(dep.makeRequest, sinon.match.any, {browsingTopics: undefined});
        });
      })
    })
  })
});

describe('attachCallbacks', () => {
  const sampleHeaders = new Headers({
    'x-1': 'v1',
    'x-2': 'v2'
  });

  function responseFactory(body, props) {
    props = Object.assign({headers: sampleHeaders, url: EXAMPLE_URL}, props);
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
    attachCallbacks(fetch('/', {signal: ctl.signal}), {
      error(_, xhr) {
        expect(xhr.timedOut).to.be.true;
        done();
      }
    });
  })

  Object.entries({
    '2xx response': {
      success: true,
      makeResponse: responseFactory('body', {status: 200, statusText: 'OK'})
    },
    '2xx response with no body': {
      success: true,
      makeResponse: responseFactory(null, {status: 204, statusText: 'No content'})
    },
    '2xx response with XML': {
      success: true,
      xml: true,
      makeResponse: responseFactory('<?xml><root><tag /></root>', {
        status: 200,
        statusText: 'OK',
        headers: {'content-type': 'application/xml;charset=UTF8'}
      })
    },
    '2xx response with HTML': {
      success: true,
      xml: true,
      makeResponse: responseFactory('<html lang="en"><p></p></html>', {
        status: 200,
        statusText: 'OK',
        headers: {'content-type': 'text/html;charset=UTF-8'}
      })
    },
    '304 response': {
      success: true,
      makeResponse: responseFactory(null, {status: 304, statusText: 'Moved permanently'})
    },
    '4xx response': {
      success: false,
      makeResponse: responseFactory('body', {status: 400, statusText: 'Invalid request'})
    },
    '5xx response': {
      success: false,
      makeResponse: responseFactory('body', {status: 503, statusText: 'Gateway error'})
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
  }).forEach(([t, {success, makeResponse, xml}]) => {
    const cbType = success ? 'success' : 'error';

    describe(`for ${t}`, () => {
      let sandbox, response, body;
      beforeEach(() => {
        sandbox = sinon.sandbox.create();
        sandbox.spy(utils, 'logError');
        ({response, body} = makeResponse());
      });

      afterEach(() => {
        sandbox.restore();
      })

      function checkXHR(xhr) {
        utils.logError.resetHistory();
        const serialized = JSON.parse(JSON.stringify(xhr))
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
          })
        })
      }
    });
  });

  describe('callback exceptions', () => {
    Object.entries({
      success: responseFactory(null, {status: 204}),
      error: responseFactory('', {status: 400}),
    }).forEach(([cbType, makeResponse]) => {
      it(`do not choke ${cbType} callbacks`, () => {
        const {response} = makeResponse();
        return new Promise((resolve) => {
          const result = {success: false, error: false};
          attachCallbacks(Promise.resolve(response), {
            success() {
              result.success = true;
              throw new Error();
            },
            error() {
              result.error = true;
              throw new Error();
            }
          });
          setTimeout(() => resolve(result), 20);
        }).then(result => {
          Object.entries(result).forEach(([typ, ran]) => {
            expect(ran).to.be[typ === cbType ? 'true' : 'false']
          })
        });
      });
    });
  });
});
