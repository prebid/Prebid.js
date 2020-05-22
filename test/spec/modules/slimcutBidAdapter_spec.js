import {expect} from 'chai';
import {spec} from 'modules/slimcutBidAdapter';
import {newBidder} from 'src/adapters/bidderFactory';

const ENDPOINT = '//sb.freeskreen.com/pbr';
const AD_SCRIPT = '<script type="text/javascript" class="slimcut" async="true" src="http://static.freeskreen.com/publisher/83/freeskreen.min.js"></script>"';

describe('slimcutBidAdapter', function() {
  const adapter = newBidder(spec);

  describe('inherited functions', function() {
    it('exists and is a function', function() {
      expect(adapter.callBids).to.exist.and.to.be.a('function');
    });
  });

  describe('isBidRequestValid', function() {
    let bid = {
      'bidder': 'slimcut',
      'params': {
        'placementId': 83
      },
      'adUnitCode': 'adunit-code',
      'sizes': [[300, 250], [300, 600]],
      'bidId': '3c871ffa8ef14c',
      'bidderRequestId': 'b41642f1aee381',
      'auctionId': '4e156668c977d7'
    };

    it('should return true when required params found', function() {
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });

    it('should return false when placementId is not valid (letters)', function() {
      let bid = Object.assign({}, bid);
      delete bid.params;
      bid.params = {
        'placementId': 'ABCD'
      };

      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should return false when placementId < 0', function() {
      let bid = Object.assign({}, bid);
      delete bid.params;
      bid.params = {
        'placementId': -1
      };

      expect(spec.isBidRequestValid(bid)).to.equal(false);
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
        'bidder': 'teads',
        'params': {
          'placementId': 10433394
        },
        'adUnitCode': 'adunit-code',
        'sizes': [[300, 250], [300, 600]],
        'bidId': '3c871ffa8ef14c',
        'bidderRequestId': 'b41642f1aee381',
        'auctionId': '4e156668c977d7',
        'deviceWidth': 1680
      }
    ];

    let bidderResquestDefault = {
      'auctionId': '4e156668c977d7',
      'bidderRequestId': 'b41642f1aee381',
      'timeout': 3000
    };

    it('sends bid request to ENDPOINT via POST', function() {
      const request = spec.buildRequests(bidRequests, bidderResquestDefault);

      expect(request.url).to.equal(ENDPOINT);
      expect(request.method).to.equal('POST');
    });

    it('should send GDPR to endpoint', function() {
      let consentString = 'JRJ8RKfDeBNsERRDCSAAZ+A==';
      let bidderRequest = {
        'auctionId': '4e156668c977d7',
        'bidderRequestId': 'b41642f1aee381',
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
    });

    it('should add referer info to payload', function () {
      const bidRequest = Object.assign({}, bidRequests[0])
      const bidderRequest = {
        refererInfo: {
          referer: 'http://example.com/page.html',
          reachedTop: true,
          numIframes: 2
        }
      }
      const request = spec.buildRequests([bidRequest], bidderRequest);
      const payload = JSON.parse(request.data);

      expect(payload.referrer).to.exist;
      expect(payload.referrer).to.deep.equal('http://example.com/page.html')
    });
  });

  describe('getUserSyncs', () => {
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
          'creativeId': 'er2ee',
          'transactionId': 'deadb33f',
          'winUrl': 'https://sb.freeskreen.com/win'
        }]
      }
    };

    it('should get the correct number of sync urls', () => {
      let urls = spec.getUserSyncs({iframeEnabled: true}, bids);
      expect(urls.length).to.equal(1);
      expect(urls[0].url).to.equal('//sb.freeskreen.com/async_usersync.html');
    });

    it('should return no url if not iframe enabled', () => {
      let urls = spec.getUserSyncs({iframeEnabled: false}, bids);
      expect(urls.length).to.equal(0);
    });
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
          'creativeId': 'er2ee',
          'transactionId': 'deadb33f',
          'winUrl': 'https://sb.freeskreen.com/win'
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
        'creativeId': 'er2ee',
        'transactionId': 'deadb33f',
        'winUrl': 'https://sb.freeskreen.com/win'
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
