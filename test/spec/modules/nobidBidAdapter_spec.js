import { expect } from 'chai';
import { spec } from 'modules/nobidBidAdapter';
import { newBidder } from 'src/adapters/bidderFactory';
import { deepClone } from 'src/utils';

describe('Nobid Adapter', function () {
  const adapter = newBidder(spec);

  describe('inherited functions', function () {
    it('exists and is a function', function () {
      expect(adapter.callBids).to.exist.and.to.be.a('function');
    });
  });

  describe('isBidRequestValid', function () {
    let bid = {
      'bidder': 'nobid',
      'params': {
        'siteId': 2
      },
      'adUnitCode': 'adunit-code',
      'sizes': [[300, 250]],
      'bidId': '30b31c1838de1e',
      'bidderRequestId': '22edbae2733bf6',
      'auctionId': '1d1a030790a475',
    };

    it('should return true when required params found', function () {
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });

    it('should return true when required params found', function () {
      let bid = Object.assign({}, bid);
      delete bid.params;
      bid.params = {
        'siteId': 2
      };

      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });

    it('should return false when required params are not passed', function () {
      let bid = Object.assign({}, bid);
      delete bid.params;
      bid.params = {
        'siteId': 0
      };
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });
  });

  describe('buildRequests', function () {
    const SITE_ID = 2;
    const REFERER = 'https://www.examplereferer.com';
    let bidRequests = [
      {
        'bidder': 'nobid',
        'params': {
          'siteId': SITE_ID
        },
        'adUnitCode': 'adunit-code',
        'sizes': [[300, 250]],
        'bidId': '30b31c1838de1e',
        'bidderRequestId': '22edbae2733bf6',
        'auctionId': '1d1a030790a475',
      }
    ];

    let bidderRequest = {
      refererInfo: {referer: REFERER}
    }

    it('should add source and verison to the tag', function () {
      const request = spec.buildRequests(bidRequests, bidderRequest);
      const payload = JSON.parse(request.data);
      expect(payload.sid).to.equal(SITE_ID);
      expect(payload.l).to.exist.and.to.equal(encodeURIComponent(REFERER));
      expect(payload.tt).to.exist;
      expect(payload.a).to.exist;
      expect(payload.t).to.exist;
      expect(payload.tz).to.exist;
      expect(payload.r).to.exist;
      expect(payload.lang).to.exist;
      expect(payload.ref).to.exist;
      expect(payload.gdpr).to.exist;
    });

    it('sends bid request to ENDPOINT via POST', function () {
      const request = spec.buildRequests(bidRequests);
      expect(request.url).to.contain('ads.servenobid.com/adreq');
      expect(request.method).to.equal('POST');
    });

    it('should add gdpr consent information to the request', function () {
      let consentString = 'BOJ8RZsOJ8RZsABAB8AAAAAZ+A==';
      let bidderRequest = {
        'bidderCode': 'nobid',
        'auctionId': '1d1a030790a475',
        'bidderRequestId': '22edbae2733bf6',
        'timeout': 3000,
        'gdprConsent': {
          consentString: consentString,
          gdprApplies: true
        }
      };
      bidderRequest.bids = bidRequests;

      const request = spec.buildRequests(bidRequests, bidderRequest);
      const payload = JSON.parse(request.data);

      expect(payload.gdpr).to.exist;
      expect(payload.gdpr.consentString).to.exist.and.to.equal(consentString);
      expect(payload.gdpr.consentRequired).to.exist.and.to.be.true;
    });
  });

  describe('buildRequestsRefreshCount', function () {
    const SITE_ID = 2;
    const REFERER = 'https://www.examplereferer.com';
    let bidRequests = [
      {
        'bidder': 'nobid',
        'params': {
          'siteId': SITE_ID
        },
        'adUnitCode': 'adunit-code',
        'sizes': [[300, 250]],
        'bidId': '30b31c1838de1e',
        'bidderRequestId': '22edbae2733bf6',
        'auctionId': '1d1a030790a475',
      }
    ];

    let bidderRequest = {
      refererInfo: {referer: REFERER}
    }

    it('should refreshCount = 4', function () {
      nobid.refreshLimit = 2;
      nobid.refreshCount = 0;
      spec.buildRequests(bidRequests, bidderRequest);
      spec.buildRequests(bidRequests, bidderRequest);
      spec.buildRequests(bidRequests, bidderRequest);
      const request = spec.buildRequests(bidRequests, bidderRequest);
      expect(nobid.refreshCount).to.equal(3);
      expect(typeof request).to.equal('undefined');
    });
  });

  describe('interpretResponse', function () {
    const CREATIVE_ID_300x250 = 'CREATIVE-100';
    const ADUNIT_300x250 = 'ADUNIT-1';
    const ADMARKUP_300x250 = 'ADMARKUP-300x250';
    const PRICE_300x250 = 0.51;
    const REQUEST_ID = '3db3773286ee59';
    const DEAL_ID = 'deal123';
    let response = {
      country: 'US',
      ip: '68.83.15.75',
      device: 'COMPUTER',
      site: 2,
      bids: [
        {id: 1,
          bdrid: 101,
          divid: ADUNIT_300x250,
          dealid: DEAL_ID,
          creativeid: CREATIVE_ID_300x250,
          size: {'w': 300, 'h': 250},
          adm: ADMARKUP_300x250,
          price: '' + PRICE_300x250
        }
      ]
    };

    it('should get correct bid response', function () {
      let expectedResponse = [
        {
          requestId: REQUEST_ID,
          cpm: PRICE_300x250,
          width: 300,
          height: 250,
          creativeId: CREATIVE_ID_300x250,
          dealId: DEAL_ID,
          currency: 'USD',
          netRevenue: true,
          ttl: 300,
          ad: ADMARKUP_300x250,
          mediaType: 'banner'
        }
      ];

      let bidderRequest = {
        bids: [{
          bidId: REQUEST_ID,
          adUnitCode: ADUNIT_300x250
        }]
      }
      let result = spec.interpretResponse({ body: response }, {bidderRequest: bidderRequest});
      expect(result.length).to.equal(expectedResponse.length);
      expect(Object.keys(result[0])).to.have.members(Object.keys(expectedResponse[0]));
      expect(result[0].requestId).to.equal(expectedResponse[0].requestId);
      expect(result[0].cpm).to.equal(expectedResponse[0].cpm);
    });

    it('should get correct empty response', function () {
      let bidderRequest = {
        bids: [{
          bidId: REQUEST_ID,
          adUnitCode: ADUNIT_300x250 + '1'
        }]
      }
      let result = spec.interpretResponse({ body: response }, {bidderRequest: bidderRequest});
      expect(result.length).to.equal(0);
    });

    it('should get correct deal id', function () {
      let expectedResponse = [
        {
          requestId: REQUEST_ID,
          cpm: PRICE_300x250,
          width: 300,
          height: 250,
          creativeId: CREATIVE_ID_300x250,
          dealId: DEAL_ID,
          currency: 'USD',
          netRevenue: true,
          ttl: 300,
          ad: ADMARKUP_300x250,
          mediaType: 'banner'
        }
      ];

      let bidderRequest = {
        bids: [{
          bidId: REQUEST_ID,
          adUnitCode: ADUNIT_300x250
        }]
      }
      let result = spec.interpretResponse({ body: response }, {bidderRequest: bidderRequest});
      expect(result.length).to.equal(expectedResponse.length);
      expect(result[0].dealId).to.equal(expectedResponse[0].dealId);
    });
  });

  describe('interpretResponseWithRefreshLimit', function () {
    const CREATIVE_ID_300x250 = 'CREATIVE-100';
    const ADUNIT_300x250 = 'ADUNIT-1';
    const ADMARKUP_300x250 = 'ADMARKUP-300x250';
    const PRICE_300x250 = 0.51;
    const REQUEST_ID = '3db3773286ee59';
    const DEAL_ID = 'deal123';
    const REFRESH_LIMIT = 3;
    let response = {
      country: 'US',
      ip: '68.83.15.75',
      device: 'COMPUTER',
      site: 2,
      rlimit: REFRESH_LIMIT,
      bids: [
        {id: 1,
          bdrid: 101,
          divid: ADUNIT_300x250,
          dealid: DEAL_ID,
          creativeid: CREATIVE_ID_300x250,
          size: {'w': 300, 'h': 250},
          adm: ADMARKUP_300x250,
          price: '' + PRICE_300x250
        }
      ]
    };

    it('should refreshLimit be respected', function () {
      let bidderRequest = {
        bids: [{
          bidId: REQUEST_ID,
          adUnitCode: ADUNIT_300x250
        }]
      }
      let result = spec.interpretResponse({ body: response }, {bidderRequest: bidderRequest});
      expect(nobid.refreshLimit).to.equal(REFRESH_LIMIT);
    });
  });

  describe('getUserSyncs', function () {
    const GDPR_CONSENT_STRING = 'GDPR_CONSENT_STRING';
    it('should get correct user sync when iframeEnabled', function () {
      let pixel = spec.getUserSyncs({iframeEnabled: true})
      expect(pixel[0].type).to.equal('iframe');
      expect(pixel[0].url).to.equal('https://public.servenobid.com/sync.html');
    });

    it('should get correct user sync when iframeEnabled and pixelEnabled', function () {
      let pixel = spec.getUserSyncs({iframeEnabled: true, pixelEnabled: true})
      expect(pixel[0].type).to.equal('iframe');
      expect(pixel[0].url).to.equal('https://public.servenobid.com/sync.html');
    });

    it('should get correct user sync when iframeEnabled', function () {
      let pixel = spec.getUserSyncs({iframeEnabled: true}, {}, {gdprApplies: true, consentString: GDPR_CONSENT_STRING})
      expect(pixel[0].type).to.equal('iframe');
      expect(pixel[0].url).to.equal('https://public.servenobid.com/sync.html?gdpr=1&gdpr_consent=' + GDPR_CONSENT_STRING);
    });

    it('should get correct user sync when !iframeEnabled', function () {
      let pixel = spec.getUserSyncs({iframeEnabled: false})
      expect(pixel.length).to.equal(0);
    });

    it('should get correct user sync when !iframeEnabled', function () {
	  let pixel = spec.getUserSyncs({})
	  expect(pixel.length).to.equal(0);
    });
  });

  describe('onTimeout', function (syncOptions) {
    it('should increment timeoutTotal', function () {
      let timeoutTotal = spec.onTimeout()
      expect(timeoutTotal).to.equal(1);
    });
  });

  describe('onBidWon', function (syncOptions) {
    it('should increment bidWonTotal', function () {
      let bidWonTotal = spec.onBidWon()
      expect(bidWonTotal).to.equal(1);
    });
  });
});
