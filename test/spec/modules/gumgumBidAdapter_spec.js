import { expect } from 'chai';
import { newBidder } from 'src/adapters/bidderFactory';
import { spec } from 'modules/gumgumBidAdapter';

const ENDPOINT = 'https://g2.gumgum.com/hbid/imp';

describe('gumgumAdapter', function () {
  const adapter = newBidder(spec);

  describe('inherited functions', function () {
    it('exists and is a function', function () {
      expect(adapter.callBids).to.exist.and.to.be.a('function');
    });
  });

  describe('isBidRequestValid', function () {
    let bid = {
      'bidder': 'gumgum',
      'params': {
        'inScreen': '10433394'
      },
      'adUnitCode': 'adunit-code',
      'sizes': [[300, 250], [300, 600], [1, 1]],
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
        'inSlot': '789'
      };

      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });

    it('should return false when required params are not passed', function () {
      let bid = Object.assign({}, bid);
      delete bid.params;
      bid.params = {
        'placementId': 0
      };
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });
  });

  describe('buildRequests', function () {
    let bidRequests = [
      {
        'bidder': 'gumgum',
        'params': {
          'inSlot': '9'
        },
        'adUnitCode': 'adunit-code',
        'sizes': [[300, 250], [300, 600]],
        'bidId': '30b31c1838de1e'
      }
    ];

    it('sends bid request to ENDPOINT via GET', function () {
      const request = spec.buildRequests(bidRequests)[0];
      expect(request.url).to.equal(ENDPOINT);
      expect(request.method).to.equal('GET');
      expect(request.id).to.equal('30b31c1838de1e');
    });
    it('should add consent parameters if gdprConsent is present', function () {
      const gdprConsent = { consentString: 'BOJ/P2HOJ/P2HABABMAAAAAZ+A==', gdprApplies: true };
      const fakeBidRequest = { gdprConsent: gdprConsent };
      const bidRequest = spec.buildRequests(bidRequests, fakeBidRequest)[0];
      expect(bidRequest.data.gdprApplies).to.eq(true);
      expect(bidRequest.data.gdprConsent).to.eq('BOJ/P2HOJ/P2HABABMAAAAAZ+A==');
    });
    it('should handle gdprConsent is present but values are undefined case', function () {
      const gdprConsent = { consent_string: undefined, gdprApplies: undefined };
      const fakeBidRequest = { gdprConsent: gdprConsent };
      const bidRequest = spec.buildRequests(bidRequests, fakeBidRequest)[0];
      expect(bidRequest.data).to.not.include.any.keys('gdprConsent')
    });
  })

  describe('interpretResponse', function () {
    let serverResponse = {
      'ad': {
        'id': 29593,
        'width': 300,
        'height': 250,
        'ipd': 2000,
        'markup': '<html><h3>I am an ad</h3></html>',
        'ii': true,
        'du': null,
        'price': 0,
        'zi': 0,
        'impurl': 'http://g2.gumgum.com/ad/view',
        'clsurl': 'http://g2.gumgum.com/ad/close'
      },
      'pag': {
        't': 'ggumtest',
        'pvid': 'aa8bbb65-427f-4689-8cee-e3eed0b89eec',
        'css': 'html { overflow-y: auto }',
        'js': 'console.log("environment", env);'
      },
      'thms': 10000
    }
    let bidRequest = {
      id: 12345,
      sizes: [[300, 250], [1, 1]],
      url: ENDPOINT,
      method: 'GET',
      pi: 3
    }

    it('should get correct bid response', function () {
      let expectedResponse = {
        'ad': '<html><h3>I am an ad</h3></html>',
        'cpm': 0,
        'creativeId': 29593,
        'currency': 'USD',
        'height': '250',
        'netRevenue': true,
        'requestId': 12345,
        'width': '300',
        // dealId: DEAL_ID,
        // referrer: REFERER,
        ttl: 60
      };
      expect(spec.interpretResponse({ body: serverResponse }, bidRequest)).to.deep.equal([expectedResponse]);
    });

    it('handles nobid responses', function () {
      let response = {
        'ad': {},
        'pag': {
          't': 'ggumtest',
          'pvid': 'aa8bbb65-427f-4689-8cee-e3eed0b89eec',
          'css': 'html { overflow-y: auto }',
          'js': 'console.log("environment", env);'
        },
        'thms': 10000
      }
      let result = spec.interpretResponse({ body: response }, bidRequest);
      expect(result.length).to.equal(0);
    });

    it('returns 1x1 when eligible product and size available', function () {
      let inscreenBidRequest = {
        id: 12346,
        sizes: [[300, 250], [1, 1]],
        url: ENDPOINT,
        method: 'GET',
        data: {
          pi: 2,
          t: 'ggumtest'
        }
      }
      let inscreenServerResponse = {
        'ad': {
          'id': 2065333,
          'height': 90,
          'ipd': 2000,
          'markup': '<html><h3>I am an inscreen ad</h3></html>',
          'ii': true,
          'du': null,
          'price': 1,
          'zi': 0,
          'impurl': 'http://g2.gumgum.com/ad/view',
          'clsurl': 'http://g2.gumgum.com/ad/close'
        },
        'pag': {
          't': 'ggumtest',
          'pvid': 'aa8bbb65-427f-4689-8cee-e3eed0b89eec',
          'css': 'html { overflow-y: auto }',
          'js': 'console.log("environment", env);'
        },
        'thms': 10000
      }
      let result = spec.interpretResponse({ body: inscreenServerResponse }, inscreenBidRequest);
      expect(result[0].width).to.equal('1');
      expect(result[0].height).to.equal('1');
    })
  })
  describe('getUserSyncs', function () {
    const syncOptions = {
      'iframeEnabled': 'true'
    }
    const response = {
      'pxs': {
        'scr': [
          {
            't': 'i',
            'u': 'https://c.gumgum.com/images/pixel.gif'
          },
          {
            't': 'f',
            'u': 'https://www.nytimes.com/'
          }
        ]
      }
    }
    let result = spec.getUserSyncs(syncOptions, [{ body: response }]);
    expect(result[0].type).to.equal('image')
    expect(result[1].type).to.equal('iframe')
  })
});
