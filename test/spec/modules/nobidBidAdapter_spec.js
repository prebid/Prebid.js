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
        'siteId': 1
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
        'siteId': 1
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
    const SITE_ID = 1;
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

  describe('interpretResponse', function () {
    const CREATIVE_ID_300x250 = 'CREATIVE-100';
    const ADUNIT_300x250 = 'ADUNIT-1';
    const ADMARKUP_300x250 = 'ADMARKUP-300x250';
    const PRICE_300x250 = 0.51;
    const REQUEST_ID = '3db3773286ee59';
    let response = {
      country: 'US',
      ip: '68.83.15.75',
      device: 'COMPUTER',
      site: 1,
      bids: [
        {id: 1,
          bdrid: 101,
          divid: ADUNIT_300x250,
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
          dealId: '',
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
      expect(Object.keys(result[0])).to.have.members(Object.keys(expectedResponse[0])); ;
    });
  });
});
