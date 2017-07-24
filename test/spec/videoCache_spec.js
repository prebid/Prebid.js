import 'mocha';
import chai from 'chai';
import { store } from 'src/videoCache';

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
    });

    afterEach(() => xhr.restore());

    it('should make the expected request when store() is called', () => {
      store([ { vastUrl: 'my-mock-url.com' } ], function() { });

      const request = requests[0];
      request.method.should.equal('POST');
      request.url.should.equal('https://prebid.adnxs.com/pbc/v1/cache');
      request.requestHeaders['Content-Type'].should.equal('text/plain;charset=utf-8');

      JSON.parse(request.requestBody).should.deep.equal({
        puts: [{
          type: 'xml',
          value: `<VAST version="3.0">
    <Ad>
      <Wrapper>
        <AdSystem>prebid.org wrapper</AdSystem>
        <VASTAdTagURI><![CDATA[my-mock-url.com]]></VASTAdTagURI>
        <Impression></Impression>
        <Creatives></Creatives>
      </Wrapper>
    </Ad>
  </VAST>`,
        }],
      });
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
      callback.firstCall.args[1].should.deep.equal([{ uuid: 'c488b101-af3e-4a99-b538-00423e5a3371' }]);
    });
  });
});
