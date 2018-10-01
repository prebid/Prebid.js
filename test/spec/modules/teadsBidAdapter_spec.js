import {expect} from 'chai';
import {spec} from 'modules/teadsBidAdapter';
import {newBidder} from 'src/adapters/bidderFactory';

const ENDPOINT = '//a.teads.tv/hb/bid-request';
const AD_SCRIPT = '<script type="text/javascript" class="teads" async="true" src="http://a.teads.tv/hb/bid-request/hb/getAdSettings"></script>"';

describe('teadsBidAdapter', function() {
  const adapter = newBidder(spec);

  describe('inherited functions', function() {
    it('exists and is a function', function() {
      expect(adapter.callBids).to.exist.and.to.be.a('function');
    });
  });

  describe('isBidRequestValid', function() {
    let bid = {
      'bidder': 'teads',
      'params': {
        'placementId': 10433394,
        'pageId': 1234
      },
      'adUnitCode': 'adunit-code',
      'sizes': [[300, 250], [300, 600]],
      'bidId': '30b31c1838de1e',
      'bidderRequestId': '22edbae2733bf6',
      'auctionId': '1d1a030790a475',
      'creativeId': 'er2ee'
    };

    it('should return true when required params found', function() {
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });

    it('should return false when pageId is not valid (letters)', function() {
      let bid = Object.assign({}, bid);
      delete bid.params;
      bid.params = {
        'placementId': 1234,
        'pageId': 'ABCD'
      };

      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should return false when placementId is not valid (letters)', function() {
      let bid = Object.assign({}, bid);
      delete bid.params;
      bid.params = {
        'placementId': 'FCP',
        'pageId': 1234
      };

      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should return false when placementId < 0 or pageId < 0', function() {
      let bid = Object.assign({}, bid);
      delete bid.params;
      bid.params = {
        'placementId': -1,
        'pageId': -1
      };

      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should return false when required params are not passed', function() {
      let bid = Object.assign({}, bid);
      delete bid.params;

      bid.params = {
        'placementId': 0
      };

      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });
  });

  describe('buildRequests', function() {
    let bidRequests = [
      {
        'bidder': 'teads',
        'params': {
          'placementId': 10433394,
          'pageId': 1234
        },
        'adUnitCode': 'adunit-code',
        'sizes': [[300, 250], [300, 600]],
        'bidId': '30b31c1838de1e',
        'bidderRequestId': '22edbae2733bf6',
        'auctionId': '1d1a030790a475',
        'creativeId': 'er2ee',
        'deviceWidth': 1680
      }
    ];

    it('sends bid request to ENDPOINT via POST', function() {
      let bidderRequest = {
        'auctionId': '1d1a030790a475',
        'bidderRequestId': '22edbae2733bf6',
        'timeout': 3000
      };
      const request = spec.buildRequests(bidRequests, bidderRequest);

      expect(request.url).to.equal(ENDPOINT);
      expect(request.method).to.equal('POST');
    });

    it('should send GDPR to endpoint', function() {
      let consentString = 'JRJ8RKfDeBNsERRDCSAAZ+A==';
      let bidderRequest = {
        'auctionId': '1d1a030790a475',
        'bidderRequestId': '22edbae2733bf6',
        'timeout': 3000,
        'gdprConsent': {
          'consentString': consentString,
          'gdprApplies': true,
          'vendorData': {
            'hasGlobalConsent': false
          }
        }
      };

      const request = spec.buildRequests(bidRequests, bidderRequest);
      const payload = JSON.parse(request.data);

      expect(payload.gdpr_iab).to.exist;
      expect(payload.gdpr_iab.consent).to.equal(consentString);
      expect(payload.gdpr_iab.status).to.equal(12);
    })

    it('should send GDPR to endpoint with 11 status', function() {
      let consentString = 'JRJ8RKfDeBNsERRDCSAAZ+A==';
      let bidderRequest = {
        'auctionId': '1d1a030790a475',
        'bidderRequestId': '22edbae2733bf6',
        'timeout': 3000,
        'gdprConsent': {
          'consentString': consentString,
          'gdprApplies': true,
          'vendorData': {
            'hasGlobalScope': true
          }
        }
      };

      const request = spec.buildRequests(bidRequests, bidderRequest);
      const payload = JSON.parse(request.data);

      expect(payload.gdpr_iab).to.exist;
      expect(payload.gdpr_iab.consent).to.equal(consentString);
      expect(payload.gdpr_iab.status).to.equal(11);
    })

    it('should send GDPR to endpoint with 22 status', function() {
      let consentString = 'JRJ8RKfDeBNsERRDCSAAZ+A==';
      let bidderRequest = {
        'auctionId': '1d1a030790a475',
        'bidderRequestId': '22edbae2733bf6',
        'timeout': 3000,
        'gdprConsent': {
          'consentString': undefined,
          'gdprApplies': undefined,
          'vendorData': undefined
        }
      };

      const request = spec.buildRequests(bidRequests, bidderRequest);
      const payload = JSON.parse(request.data);

      expect(payload.gdpr_iab).to.exist;
      expect(payload.gdpr_iab.consent).to.equal('');
      expect(payload.gdpr_iab.status).to.equal(22);
    })

    it('should send GDPR to endpoint with 0 status', function() {
      let consentString = 'JRJ8RKfDeBNsERRDCSAAZ+A==';
      let bidderRequest = {
        'auctionId': '1d1a030790a475',
        'bidderRequestId': '22edbae2733bf6',
        'timeout': 3000,
        'gdprConsent': {
          'consentString': consentString,
          'gdprApplies': false,
          'vendorData': {
            'hasGlobalScope': false
          }
        }
      };

      const request = spec.buildRequests(bidRequests, bidderRequest);
      const payload = JSON.parse(request.data);

      expect(payload.gdpr_iab).to.exist;
      expect(payload.gdpr_iab.consent).to.equal(consentString);
      expect(payload.gdpr_iab.status).to.equal(0);
    })
  });

  describe('interpretResponse', function() {
    let bids = {
      'body': {
        'responses': [{
          'ad': AD_SCRIPT,
          'cpm': 0.5,
          'currency': 'USD',
          'height': 250,
          'netRevenue': true,
          'requestId': '3ede2a3fa0db94',
          'ttl': 360,
          'width': 300,
          'creativeId': 'er2ee'
        }]
      }
    };

    it('should get correct bid response', function() {
      let expectedResponse = [{
        'cpm': 0.5,
        'width': 300,
        'height': 250,
        'currency': 'USD',
        'netRevenue': true,
        'ttl': 360,
        'ad': AD_SCRIPT,
        'requestId': '3ede2a3fa0db94',
        'creativeId': 'er2ee'
      }];

      let result = spec.interpretResponse(bids);
      expect(Object.keys(result[0])).to.deep.equal(Object.keys(expectedResponse[0]));
    });

    it('handles nobid responses', function() {
      let bids = {
        'body': {
          'responses': []
        }
      };

      let result = spec.interpretResponse(bids);
      expect(result.length).to.equal(0);
    });
  });
});
