import 'mocha';
import chai from 'chai';
import { getCacheUrl, store } from 'src/videoCache';
import { config } from 'src/config';

const should = chai.should();

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
  });

  describe('when the cache server is available', () => {
    let xhr;
    let requests;

    beforeEach(() => {
      xhr = sinon.useFakeXMLHttpRequest();
      requests = [];
      xhr.onCreate = (request) => requests.push(request);
      config.setConfig({
        cache: {
          url: 'https://prebid.adnxs.com/pbc/v1/cache'
        }
      })
    });

    afterEach(() => {
      xhr.restore();
      config.resetConfig();
    });

    it('should execute the callback with a successful result when store() is called', () => {
      const uuid = 'c488b101-af3e-4a99-b538-00423e5a3371';
      const callback = fakeServerCall(
        { vastUrl: 'my-mock-url.com' },
        `{"responses":[{"uuid":"${uuid}"}]}`);

      assertSuccess(callback);
      callback.firstCall.args[1].should.deep.equal([{ uuid: uuid }]);
    });

    it('should execute the callback with an error if the cache server response has no responses property', () => {
      const callback = fakeServerCall(
        { vastUrl: 'my-mock-url.com' },
        '{"broken":[{"uuid":"c488b101-af3e-4a99-b538-00423e5a3371"}]}');
      assertError(callback);
      callback.firstCall.args[1].should.deep.equal([]);
    });

    it('should execute the callback with an error if the cache server responds with malformed JSON', () => {
      const callback = fakeServerCall(
        { vastUrl: 'my-mock-url.com' },
        'Not JSON here');
      assertError(callback);
      callback.firstCall.args[1].should.deep.equal([]);
    });

    it('should make the expected request when store() is called on an ad with a vastUrl', () => {
      const expectedValue = `<VAST version="3.0">
    <Ad>
      <Wrapper>
        <AdSystem>prebid.org wrapper</AdSystem>
        <VASTAdTagURI><![CDATA[my-mock-url.com]]></VASTAdTagURI>
        <Impression></Impression>
        <Creatives></Creatives>
      </Wrapper>
    </Ad>
  </VAST>`;
      assertRequestMade({ vastUrl: 'my-mock-url.com' }, expectedValue)
    });

    it('should make the expected request when store() is called on an ad with a vastUrl and a vastImpUrl', () => {
      const expectedValue = `<VAST version="3.0">
    <Ad>
      <Wrapper>
        <AdSystem>prebid.org wrapper</AdSystem>
        <VASTAdTagURI><![CDATA[my-mock-url.com]]></VASTAdTagURI>
        <Impression><![CDATA[imptracker.com]]></Impression>
        <Creatives></Creatives>
      </Wrapper>
    </Ad>
  </VAST>`;
      assertRequestMade({ vastUrl: 'my-mock-url.com', vastImpUrl: 'imptracker.com' }, expectedValue)
    });

    it('should make the expected request when store() is called on an ad with vastXml', () => {
      const vastXml = '<VAST version="3.0"></VAST>';
      assertRequestMade({ vastXml: vastXml }, vastXml);
    });

    function assertRequestMade(bid, expectedValue) {
      store([bid], function() { });

      const request = requests[0];
      request.method.should.equal('POST');
      request.url.should.equal('https://prebid.adnxs.com/pbc/v1/cache');
      request.requestHeaders['Content-Type'].should.equal('text/plain;charset=utf-8');

      JSON.parse(request.requestBody).should.deep.equal({
        puts: [{
          type: 'xml',
          value: expectedValue,
        }],
      });
    }

    function fakeServerCall(bid, responseBody) {
      const callback = sinon.spy();
      store([ bid ], callback);
      requests[0].respond(
        200,
        {
          'Content-Type': 'application/json',
        },
        responseBody);
      return callback;
    }
  });
});

describe('The getCache function', () => {
  beforeEach(() => {
    config.setConfig({
      cache: {
        url: 'https://prebid.adnxs.com/pbc/v1/cache'
      }
    })
  });

  afterEach(() => {
    config.resetConfig();
  });

  it('should return the expected URL', () => {
    const uuid = 'c488b101-af3e-4a99-b538-00423e5a3371';
    const url = getCacheUrl(uuid);
    url.should.equal(`https://prebid.adnxs.com/pbc/v1/cache?uuid=${uuid}`);
  });
})
