import { expect } from 'chai';
import { spec } from 'modules/audiencerunBidAdapter.js';
import { newBidder } from 'src/adapters/bidderFactory.js';

const ENDPOINT = 'https://d.audiencerun.com/prebid';

const BID_SERVER_RESPONSE = {
  body: {
    bid: [
      {
        'bidId': '51ef8751f9aead',
        'zoneId': '12345abcde',
        'adId': '1234',
        'crid': '5678',
        'cpm': 8.021951999999999999,
        'currency': 'USD',
        'w': 728,
        'h': 90,
        'isNet': false,
        'buying_type': 'rtb',
        'syncUrl': 'https://ac.audiencerun.com/f/sync.html',
        'adm': '<!-- test creative -->'
      }
    ]
  }
};

describe('AudienceRun bid adapter tests', function() {
  const adapter = newBidder(spec);

  describe('inherited functions', function() {
    it('exists and is a function', function() {
      expect(adapter.callBids).to.exist.and.to.be.a('function');
    });
  });

  describe('isBidRequestValid', function() {
    let bid = {
      'bidder': 'audiencerun',
      'params': {
        'zoneId': '12345abcde'
      },
      'adUnitCode': 'adunit-code',
      'mediaTypes': {
        'banner': {
          'sizes': [[300, 250], [300, 600]]
        }
      },
      'bidId': '30b31c1838de1e',
      'bidderRequestId': '22edbae2733bf6',
      'auctionId': '1d1a030790a475',
      'creativeId': 'er2ee'
    };

    it('should return true when required params found', function() {
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });

    it('should return true when zoneId is valid', function() {
      let bid = Object.assign({}, bid);
      delete bid.params;
      bid.params = {
        'zoneId': '12345abcde'
      };

      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });

    it('should return false when required params are not passed', function() {
      let bid = Object.assign({}, bid);
      delete bid.params;

      bid.params = {};

      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });
  });

  describe('buildRequests', function() {
    let bidRequests = [
      {
        'bidder': 'audiencerun',
        'bidId': '51ef8751f9aead',
        'params': {
          'zoneId': '12345abcde'
        },
        'adUnitCode': 'div-gpt-ad-1460505748561-0',
        'transactionId': 'd7b773de-ceaa-484d-89ca-d9f51b8d61ec',
        'mediaTypes': {
          'banner': {
            'sizes': [[320, 50], [300, 250], [300, 600]]
          }
        },
        'bidderRequestId': '418b37f85e772c',
        'auctionId': '18fd8b8b0bd757',
        'bidRequestsCount': 1
      }
    ];

    it('sends a valid bid request to ENDPOINT via POST', function() {
      const request = spec.buildRequests(bidRequests, {
        gdprConsent: {
          consentString: 'BOZcQl_ObPFjWAeABAESCD-AAAAjx7_______9______9uz_Ov_v_f__33e8__9v_l_7_-___u_-33d4-_1vf99yfm1-7ftr3tp_87ues2_Xur__59__3z3_NohBgA',
          gdprApplies: true
        },
        refererInfo: {
          canonicalUrl: 'https://example.com/canonical',
          referer: 'https://example.com'
        }
      });

      expect(request.url).to.equal(ENDPOINT);
      expect(request.method).to.equal('POST');

      const payload = JSON.parse(request.data);
      expect(payload.gdpr).to.exist;

      expect(payload.bids).to.exist.and.to.be.an('array').and.to.have.lengthOf(1);
      expect(payload.referer).to.exist;

      const bid = payload.bids[0];
      expect(bid).to.exist;
      expect(bid).to.have.property('bidId');
      expect(bid).to.have.property('zoneId');
      expect(bid).to.have.property('sizes');
      expect(bid.sizes[0].w).to.be.a('number');
      expect(bid.sizes[0].h).to.be.a('number');
    });

    it('should send GDPR to endpoint and honor gdprApplies value', function() {
      let consentString = 'bogusConsent';
      let bidderRequest = {
        'gdprConsent': {
          'consentString': consentString,
          'gdprApplies': true
        }
      };

      const request = spec.buildRequests(bidRequests, bidderRequest);
      const payload = JSON.parse(request.data);
      expect(payload.gdpr).to.exist;
      expect(payload.gdpr.consent).to.equal(consentString);
      expect(payload.gdpr.applies).to.equal(true);

      let bidderRequest2 = {
        'gdprConsent': {
          'consentString': consentString,
          'gdprApplies': false
        }
      };

      const request2 = spec.buildRequests(bidRequests, bidderRequest2);
      const payload2 = JSON.parse(request2.data);

      expect(payload2.gdpr).to.exist;
      expect(payload2.gdpr.consent).to.equal(consentString);
      expect(payload2.gdpr.applies).to.equal(false);
    });
  });

  describe('interpretResponse', function () {
    const expectedResponse = [{
      'requestId': '51ef8751f9aead',
      'adId': '12345abcde',
      'cpm': 8.021951999999999999,
      'width': '728',
      'height': '90',
      'creativeId': '5678',
      'currency': 'USD',
      'netRevenue': false,
      'ttl': 300,
      'ad': '<!-- test creative -->',
      'mediaType': 'banner'
    }];

    it('should get the correct bid response by display ad', function () {
      let result = spec.interpretResponse(BID_SERVER_RESPONSE);
      expect(Object.keys(result[0])).to.have.members(Object.keys(expectedResponse[0]));
    });

    it('handles empty bid response', function () {
      const response = {
        body: {}
      };
      let result = spec.interpretResponse(response);
      expect(result.length).to.equal(0);
    });
  });

  describe('getUserSyncs', function () {
    const serverResponses = [ BID_SERVER_RESPONSE ];
    const syncOptions = { iframeEnabled: true };

    it('should return empty if no server responses', function() {
      const syncs = spec.getUserSyncs(syncOptions, []);
      expect(syncs).to.deep.equal([])
    });

    it('should return user syncs', function () {
      const syncs = spec.getUserSyncs(syncOptions, serverResponses);
      expect(syncs).to.deep.equal([{type: 'iframe', url: 'https://ac.audiencerun.com/f/sync.html'}])
    });
  });
});
