import {ENDPOINT, spec} from 'modules/browsiBidAdapter.js';
import {config} from 'src/config.js';
import {VIDEO, BANNER} from 'src/mediaTypes.js';

const {expect} = require('chai');
const DATA = 'brwvidtag';
const ADAPTER = '__bad';

describe('browsi Bid Adapter Test', function () {
  describe('isBidRequestValid', function () {
    let mediaTypes;
    let bid;
    beforeEach(function () {
      mediaTypes = {};
      mediaTypes[VIDEO] = {};
      bid = {
        'params': {
          'pubId': '1234567',
          'tagId': '1'
        },
        'mediaTypes': mediaTypes
      };
    });
    it('should return true when required params found', function () {
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });
    it('should return false when missing pubId', function () {
      delete bid.params.pubId;
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });
    it('should return false when missing tagId', function () {
      delete bid.params.tagId;
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });
    it('should return false when missing params', function () {
      delete bid.params;
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });
    it('should return false when params have invalid type', function () {
      bid.params.tagId = 1;
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });
    it('should return false when video mediaType is missing', function () {
      delete bid.mediaTypes[VIDEO];
      bid.mediaTypes[BANNER] = {}
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });
  });

  describe('buildRequests', function () {
    let bidRequest;
    let bidderRequest;
    beforeEach(function () {
      window[DATA] = {}
      window[DATA][ADAPTER] = {index: 0};
      bidRequest = [
        {
          'params': {
            'pubId': 'browiPubId1',
            'tagId': '2'
          },
          'adUnitCode': 'adUnitCode1',
          'auctionId': 'auctionId1',
          'sizes': [640, 480],
          'bidId': '12345678',
          'requestId': '1234567-3456-4562-7689-98765434A',
          'transactionId': '1234567-3456-4562-7689-98765434B',
          'schain': {},
          'mediaTypes': {video: {playerSize: [640, 480]}}
        }
      ];
      bidderRequest = {
        'bidderRequestId': 'bidderRequestId1',
        'refererInfo': {
          'canonicalUrl': null,
          'page': 'https://browsi.com',
          'domain': 'browsi.com',
          'ref': null,
          'numIframes': 0,
          'reachedTop': true,
          'isAmp': false,
          'stack': ['https://browsi.com']
        },
        'gdprConsent': {
          consentString: 'BOtmiBKOtmiBKABABAENAFAAAAACeAAA',
          gdprApplies: true
        },
        'uspConsent': '1YYY'
      };
    });
    afterEach(function() {
      window[DATA] = undefined;
      config.resetConfig();
    });
    it('should return an array of requests with single request', function () {
      const requests = spec.buildRequests(bidRequest, bidderRequest);
      expect(requests.length).to.equal(1);
      const request = requests[0];
      const inputRequest = bidRequest[0];
      const requestToExpect = {
        method: 'POST',
        url: ENDPOINT,
        data: {
          requestId: bidderRequest.bidderRequestId,
          bidId: inputRequest.bidId,
          timeout: 3000,
          baData: window[DATA][ADAPTER],
          referer: bidderRequest.refererInfo.page,
          gdpr: bidderRequest.gdprConsent,
          ccpa: bidderRequest.uspConsent,
          sizes: inputRequest.sizes,
          video: {playerSize: [640, 480]},
          aUCode: inputRequest.adUnitCode,
          aID: inputRequest.auctionId,
          tID: inputRequest.transactionId,
          schain: inputRequest.schain,
          params: inputRequest.params
        }
      }
      assert.deepEqual(request, requestToExpect);
    });
    it('should pass on timeout in bidderRequest', function() {
      bidderRequest.timeout = 8000;
      const requests = spec.buildRequests(bidRequest, bidderRequest);
      expect(requests[0].data.timeout).to.equal(8000);
    });
    it('should pass timeout in config', function() {
      config.setConfig({'bidderTimeout': 6000});
      const requests = spec.buildRequests(bidRequest, bidderRequest);
      expect(requests[0].data.timeout).to.equal(6000);
    });
  });

  describe('interpretResponse', function () {
    let bidRequest = {
      'url': ENDPOINT,
      'data': {
        'bidId': 'bidId1',
      }
    };
    let serverResponse = {};
    serverResponse.body = {
      bidId: 'bidId1',
      w: 300,
      h: 250,
      vXml: 'vastXml',
      vUrl: 'vastUrl',
      cpm: 1,
      cur: 'USD',
      ttl: 10000,
      someExtraParams: 8,
    }

    it('should return a valid response', function () {
      const bidResponses = spec.interpretResponse(serverResponse, bidRequest);
      expect(bidResponses.length).to.equal(1);
      const actualBidResponse = bidResponses[0];
      const expectedBidResponse = {
        requestId: bidRequest.data.bidId,
        bidderCode: 'browsi',
        bidId: 'bidId1',
        width: 300,
        height: 250,
        vastXml: 'vastXml',
        vastUrl: 'vastUrl',
        cpm: 1,
        currency: 'USD',
        ttl: 10000,
        someExtraParams: 8,
        mediaType: VIDEO
      };

      assert.deepEqual(actualBidResponse, expectedBidResponse);
    });
  });

  describe('getUserSyncs', function () {
    const bidResponse = {
      userSyncs: [
        {url: 'syncUrl1', type: 'image'},
        {url: 'http://syncUrl2', type: 'iframe'}
      ]
    }
    let serverResponse = [
      {body: bidResponse}
    ];
    it('should return iframe type userSync', function () {
      let userSyncs = spec.getUserSyncs({iframeEnabled: true, pixelEnabled: false}, serverResponse[0]);
      expect(userSyncs.length).to.equal(1);
      let userSync = userSyncs[0];
      expect(userSync.url).to.equal('http://syncUrl2');
      expect(userSync.type).to.equal('iframe');
    });
    it('should return image type userSyncs', function () {
      let userSyncs = spec.getUserSyncs({iframeEnabled: false, pixelEnabled: true}, serverResponse[0]);
      let userSync = userSyncs[0];
      expect(userSync.url).to.equal('http://syncUrl1');
      expect(userSync.type).to.equal('image');
    });
    it('should handle multiple server responses', function () {
      let userSyncs = spec.getUserSyncs({iframeEnabled: false, pixelEnabled: true}, serverResponse);
      expect(userSyncs.length).to.equal(1);
    });
    it('should return empty userSyncs', function () {
      let userSyncs = spec.getUserSyncs({iframeEnabled: false, pixelEnabled: false}, serverResponse);
      expect(userSyncs.length).to.equal(0);
    });
  });
});
