import chai from 'chai';
import { getCacheUrl, store } from 'src/videoCache.js';
import { config } from 'src/config.js';
import { server } from 'test/mocks/xhr.js';
import {auctionManager} from '../../src/auctionManager.js';
import {AuctionIndex} from '../../src/auctionIndex.js';
import { batchingCache } from '../../src/auction.js';

const should = chai.should();

function getMockBid(bidder, auctionId, bidderRequestId) {
  return {
    'bidder': bidder,
    'params': {
      'placementId': '10433394',
      'member': 123,
      'keywords': {
        'foo': ['bar', 'baz'],
        'fizz': ['buzz']
      }
    },
    'bid_id': '12345abc',
    'adUnitCode': 'div-gpt-ad-1460505748561-0',
    'mediaTypes': {
      'banner': {
        'sizes': [[300, 250]]
      }
    },
    'transactionId': '4ef956ad-fd83-406d-bd35-e4bb786ab86c',
    'sizes': [300, 250],
    'bidId': '123',
    'bidderRequestId': bidderRequestId,
    'auctionId': auctionId
  };
}

describe('The video cache', function () {
  function assertError(callbackSpy) {
    callbackSpy.calledOnce.should.equal(true);
    callbackSpy.firstCall.args[0].should.be.an('error');
  }

  function assertSuccess(callbackSpy) {
    callbackSpy.calledOnce.should.equal(true);
    should.not.exist(callbackSpy.firstCall.args[0]);
  }

  describe('when the cache server is unreachable', function () {
    it('should execute the callback with an error when store() is called', function () {
      const callback = sinon.spy();
      store([{ vastUrl: 'my-mock-url.com' }], callback);

      server.requests[0].respond(503, {
        'Content-Type': 'plain/text',
      }, 'The server could not save anything at the moment.');

      assertError(callback);
      callback.firstCall.args[1].should.deep.equal([]);
    });
  });

  describe('when the cache server is available', function () {
    beforeEach(function () {
      config.setConfig({
        cache: {
          url: 'https://prebid.adnxs.com/pbc/v1/cache'
        }
      })
    });

    afterEach(function () {
      config.resetConfig();
    });

    it('should execute the callback with a successful result when store() is called', function () {
      const uuid = 'c488b101-af3e-4a99-b538-00423e5a3371';
      const callback = fakeServerCall(
        { vastUrl: 'my-mock-url.com' },
        `{"responses":[{"uuid":"${uuid}"}]}`);

      assertSuccess(callback);
      callback.firstCall.args[1].should.deep.equal([{ uuid: uuid }]);
    });

    it('should execute the callback with an error if the cache server response has no responses property', function () {
      const callback = fakeServerCall(
        { vastUrl: 'my-mock-url.com' },
        '{"broken":[{"uuid":"c488b101-af3e-4a99-b538-00423e5a3371"}]}');
      assertError(callback);
      callback.firstCall.args[1].should.deep.equal([]);
    });

    it('should execute the callback with an error if the cache server responds with malformed JSON', function () {
      const callback = fakeServerCall(
        { vastUrl: 'my-mock-url.com' },
        'Not JSON here');
      assertError(callback);
      callback.firstCall.args[1].should.deep.equal([]);
    });

    it('should make the expected request when store() is called on an ad with a vastUrl', function () {
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
      assertRequestMade({ vastUrl: 'my-mock-url.com', ttl: 25 }, expectedValue)
    });

    it('should make the expected request when store() is called on an ad with a vastUrl and a vastImpUrl', function () {
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
      assertRequestMade({ vastUrl: 'my-mock-url.com', vastImpUrl: 'imptracker.com', ttl: 25 }, expectedValue)
    });

    it('should make the expected request when store() is called on an ad with vastXml', function () {
      const vastXml = '<VAST version="3.0"></VAST>';
      assertRequestMade({ vastXml: vastXml, ttl: 25 }, vastXml);
    });

    it('should make the expected request when store() is called while supplying a custom key param', function () {
      const customKey1 = 'keyword_abc_123';
      const customKey2 = 'other_xyz_789';
      const vastXml1 = '<VAST version="3.0">test1</VAST>';
      const vastXml2 = '<VAST version="3.0">test2</VAST>';

      const bids = [{
        vastXml: vastXml1,
        ttl: 25,
        customCacheKey: customKey1
      }, {
        vastXml: vastXml2,
        ttl: 25,
        customCacheKey: customKey2
      }];

      store(bids, function () { });
      const request = server.requests[0];
      request.method.should.equal('POST');
      request.url.should.equal('https://prebid.adnxs.com/pbc/v1/cache');
      request.requestHeaders['Content-Type'].should.equal('text/plain;charset=utf-8');
      let payload = {
        puts: [{
          type: 'xml',
          value: vastXml1,
          ttlseconds: 40,
          key: customKey1
        }, {
          type: 'xml',
          value: vastXml2,
          ttlseconds: 40,
          key: customKey2
        }]
      };
      JSON.parse(request.requestBody).should.deep.equal(payload);
    });

    it('should include additional params in request payload should config.cache.vasttrack be true', () => {
      config.setConfig({
        cache: {
          url: 'https://prebid.adnxs.com/pbc/v1/cache',
          vasttrack: true
        }
      });

      const customKey1 = 'vasttrack_123';
      const customKey2 = 'vasttrack_abc';
      const vastXml1 = '<VAST version="3.0">testvast1</VAST>';
      const vastXml2 = '<VAST version="3.0">testvast2</VAST>';

      const bids = [{
        vastXml: vastXml1,
        ttl: 25,
        customCacheKey: customKey1,
        requestId: '12345abc',
        bidder: 'appnexus',
        auctionId: '1234-56789-abcde'
      }, {
        vastXml: vastXml2,
        ttl: 25,
        customCacheKey: customKey2,
        requestId: 'cba54321',
        bidder: 'rubicon',
        auctionId: '1234-56789-abcde'
      }];

      store(bids, function () { });
      const request = server.requests[0];
      request.method.should.equal('POST');
      request.url.should.equal('https://prebid.adnxs.com/pbc/v1/cache');
      request.requestHeaders['Content-Type'].should.equal('text/plain;charset=utf-8');
      let payload = {
        puts: [{
          type: 'xml',
          value: vastXml1,
          ttlseconds: 40,
          key: customKey1,
          bidid: '12345abc',
          aid: '1234-56789-abcde',
          bidder: 'appnexus'
        }, {
          type: 'xml',
          value: vastXml2,
          ttlseconds: 40,
          key: customKey2,
          bidid: 'cba54321',
          aid: '1234-56789-abcde',
          bidder: 'rubicon'
        }]
      };

      JSON.parse(request.requestBody).should.deep.equal(payload);
    });

    it('should include additional params in request payload should config.cache.vasttrack be true - with timestamp', () => {
      config.setConfig({
        cache: {
          url: 'https://prebid.adnxs.com/pbc/v1/cache',
          vasttrack: true
        }
      });

      const customKey1 = 'vasttrack_123';
      const customKey2 = 'vasttrack_abc';
      const vastXml1 = '<VAST version="3.0">testvast1</VAST>';
      const vastXml2 = '<VAST version="3.0">testvast2</VAST>';

      const bids = [{
        vastXml: vastXml1,
        ttl: 25,
        customCacheKey: customKey1,
        requestId: '12345abc',
        bidder: 'appnexus',
        auctionId: '1234-56789-abcde'
      }, {
        vastXml: vastXml2,
        ttl: 25,
        customCacheKey: customKey2,
        requestId: 'cba54321',
        bidder: 'rubicon',
        auctionId: '1234-56789-abcde'
      }];

      const stub = sinon.stub(auctionManager, 'index');
      stub.get(() => new AuctionIndex(() => [{
        getAuctionId() {
          return '1234-56789-abcde';
        },
        getAuctionStart() {
          return 1510852447530;
        }
      }]))
      try {
        store(bids, function () { });
      } finally {
        stub.restore();
      }

      const request = server.requests[0];
      request.method.should.equal('POST');
      request.url.should.equal('https://prebid.adnxs.com/pbc/v1/cache');
      request.requestHeaders['Content-Type'].should.equal('text/plain;charset=utf-8');
      let payload = {
        puts: [{
          type: 'xml',
          value: vastXml1,
          ttlseconds: 40,
          key: customKey1,
          bidid: '12345abc',
          bidder: 'appnexus',
          aid: '1234-56789-abcde',
          timestamp: 1510852447530
        }, {
          type: 'xml',
          value: vastXml2,
          ttlseconds: 40,
          key: customKey2,
          bidid: 'cba54321',
          bidder: 'rubicon',
          aid: '1234-56789-abcde',
          timestamp: 1510852447530
        }]
      };

      JSON.parse(request.requestBody).should.deep.equal(payload);
    });

    it('should wait the duration of the batchTimeout and pass the correct batchSize if batched requests are enabled in the config', () => {
      const mockAfterBidAdded = function() {};
      let callback = null;
      let mockTimeout = sinon.stub().callsFake((cb) => { callback = cb });

      config.setConfig({
        cache: {
          url: 'https://prebid.adnxs.com/pbc/v1/cache',
          batchSize: 3,
          batchTimeout: 20
        }
      });

      let stubCache = sinon.stub();
      const batchAndStore = batchingCache(mockTimeout, stubCache);
      for (let i = 0; i < 3; i++) {
        batchAndStore({}, {}, mockAfterBidAdded);
      }

      sinon.assert.calledOnce(mockTimeout);
      sinon.assert.calledWith(mockTimeout, sinon.match.any, 20);

      const expectedBatch = [{ afterBidAdded: mockAfterBidAdded, auctionInstance: { }, bidResponse: { } }, { afterBidAdded: mockAfterBidAdded, auctionInstance: { }, bidResponse: { } }, { afterBidAdded: mockAfterBidAdded, auctionInstance: { }, bidResponse: { } }];

      callback();

      sinon.assert.calledWith(stubCache, expectedBatch);
    });

    function assertRequestMade(bid, expectedValue) {
      store([bid], function () { });

      const request = server.requests[0];
      request.method.should.equal('POST');
      request.url.should.equal('https://prebid.adnxs.com/pbc/v1/cache');
      request.requestHeaders['Content-Type'].should.equal('text/plain;charset=utf-8');

      JSON.parse(request.requestBody).should.deep.equal({
        puts: [{
          type: 'xml',
          value: expectedValue,
          ttlseconds: 40
        }],
      });
    }

    function fakeServerCall(bid, responseBody) {
      const callback = sinon.spy();
      store([bid], callback);
      server.requests[0].respond(
        200,
        {
          'Content-Type': 'application/json',
        },
        responseBody);
      return callback;
    }
  });
});

describe('The getCache function', function () {
  beforeEach(function () {
    config.setConfig({
      cache: {
        url: 'https://prebid.adnxs.com/pbc/v1/cache'
      }
    })
  });

  afterEach(function () {
    config.resetConfig();
  });

  it('should return the expected URL', function () {
    const uuid = 'c488b101-af3e-4a99-b538-00423e5a3371';
    const url = getCacheUrl(uuid);
    url.should.equal(`https://prebid.adnxs.com/pbc/v1/cache?uuid=${uuid}`);
  });
})
