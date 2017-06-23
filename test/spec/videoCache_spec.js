import 'mocha';
import chai from 'chai';
import { retrieve, store } from 'src/videoCache';

const should = chai.should();
const EMPTY_VAST_RESPONSE = '<VAST version="3.0"></VAST>'

describe('The video cache', () => {
  function assertError(callbackSpy) {
    callbackSpy.calledOnce.should.equal(true);
    callbackSpy.firstCall.args[0].should.be.an('error');
  }

  function assertSuccess(callbackSpy) {
    callbackSpy.calledOnce.should.equal(true);
    should.not.exist(callbackSpy.firstCall.args[0]);
  }

  describe('when the cache server is unreachable', () => {
    let xhr;
    let requests;

    beforeEach(() => {
      xhr = sinon.useFakeXMLHttpRequest();
      requests = [];
      xhr.onCreate = (request) => requests.push(request);
    });

    afterEach(() => xhr.restore());

    it('should execute the callback with an error when store() is called', () => {
      const callback = sinon.spy();
      store([ { vastUrl: 'my-mock-url.com' } ], callback);

      requests[0].respond(503, {
        'Content-Type': 'plain/text',
      }, 'The server could not save anything at the moment.');

      assertError(callback);
      callback.firstCall.args[1].should.deep.equal([]);
    });

    it('should execute the callback with an error when retrieve() is called, but the cache misses', () => {
      const callback = sinon.spy();
      retrieve('phony-uuid', callback);
      requests[0].respond(
        200,
        {
          'Content-Type': 'application/json',
        },
        '{ "error": "Content not found" }');

      assertError(callback);
      callback.firstCall.args[1].should.equal(EMPTY_VAST_RESPONSE);
    });

    it('should execute the callback with an error when retrieve() is called, but the server fails', () => {
      const callback = sinon.spy();
      retrieve('phony-uuid', callback);
      requests[0].respond(503, { }, 'some garbled response');

      assertError(callback);
      callback.firstCall.args[1].should.equal(EMPTY_VAST_RESPONSE);
    });
  });

  describe('when the cache server is available', () => {
    let xhr;
    let requests;

    beforeEach(() => {
      xhr = sinon.useFakeXMLHttpRequest();
      requests = [];
      xhr.onCreate = (request) => requests.push(request);
    });

    afterEach(() => xhr.restore());

    it('should make the expected request when store() is called', () => {
      store([ { vastUrl: 'my-mock-url.com' } ], function() { });

      const request = requests[0];
      request.method.should.equal('POST');
      request.url.should.equal('https://prebid.adnxs.com/pbc/v1/put');
      request.requestHeaders['Content-Type'].should.equal('text/plain;charset=utf-8');

      JSON.parse(request.requestBody).should.deep.equal({
        puts: [{
          value: '<VAST version="2.0"><Ad id=""><Wrapper><AdSystem>prebid.org wrapper</AdSystem>' +
          '<VASTAdTagURI><![CDATA[my-mock-url.com]]></VASTAdTagURI>' +
          '<Impression></Impression><Creatives></Creatives></Wrapper></Ad></VAST>',
        }],
      });
    });

    it('should make the expected request when retrieve() is called', () => {
      retrieve('phony-uuid', function() { });

      const request = requests[0];
      request.method.should.equal('GET');
      request.url.should.equal('https://prebid.adnxs.com/pbc/v1/get?uuid=phony-uuid');
    });

    it('should execute the callback with a successful result when store() is called', () => {
      const callback = sinon.spy();
      store([ { vastUrl: 'my-mock-url.com' } ], callback);
      requests[0].respond(
        200,
        {
          'Content-Type': 'application/json',
        },
        '{"responses":[{"uuid":"c488b101-af3e-4a99-b538-00423e5a3371"}]}');

      assertSuccess(callback);
      callback.firstCall.args[1].should.deep.equal([{ cacheId: 'c488b101-af3e-4a99-b538-00423e5a3371' }]);
    });

    it('should execute the callback with the response when retrieve() is called', () => {
      const callback = sinon.spy();
      retrieve('phony-uuid', callback);
      requests[0].respond(200, { }, 'Some VAST Content');

      assertSuccess(callback);
      callback.firstCall.args[1].should.equal('Some VAST Content');
    });

    it('should only make one server request, but return the right content, when retrieve() is called twice', () => {
      const callback = sinon.spy();
      retrieve('unique-id', callback);
      requests[0].respond(200, { }, 'Some VAST Content');
      retrieve('unique-id', callback);
      requests.length.should.equal(1);
      callback.firstCall.args[1].should.equal('Some VAST Content');
      callback.secondCall.args[1].should.equal('Some VAST Content');
    });
  });

  it('should call the callback with an error if retrieve() is given a non-string argument', () => {
    const callback = sinon.spy();
    retrieve(5, callback);
    assertError(callback);
    callback.firstCall.args[1].should.equal(EMPTY_VAST_RESPONSE);
  });
});
