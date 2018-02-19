import { expect } from 'chai';
import { newBidder } from 'src/adapters/bidderFactory';
import { spec } from 'modules/gumgumBidAdapter';

const ENDPOINT = 'https://g2.gumgum.com/hbid/imp';

describe('gumgumAdapter', () => {
  const adapter = newBidder(spec);

  describe('inherited functions', () => {
    it('exists and is a function', () => {
      expect(adapter.callBids).to.exist.and.to.be.a('function');
    });
  });

  describe('isBidRequestValid', () => {
    let bid = {
      'bidder': 'gumgum',
      'params': {
        'inScreen': '10433394'
      },
      'adUnitCode': 'adunit-code',
      'sizes': [[300, 250], [300, 600]],
      'bidId': '30b31c1838de1e',
      'bidderRequestId': '22edbae2733bf6',
      'auctionId': '1d1a030790a475',
    };

    it('should return true when required params found', () => {
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });

    it('should return true when required params found', () => {
      let bid = Object.assign({}, bid);
      delete bid.params;
      bid.params = {
        'inSlot': '789'
      };

      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });

    it('should return false when required params are not passed', () => {
      let bid = Object.assign({}, bid);
      delete bid.params;
      bid.params = {
        'placementId': 0
      };
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });
  });

  describe('buildRequests', () => {
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

    it('sends bid request to ENDPOINT via GET', () => {
      const requests = spec.buildRequests(bidRequests);
      const request = requests[0];
      expect(request.url).to.equal(ENDPOINT);
      expect(request.method).to.equal('GET');
      expect(request.id).to.equal('30b31c1838de1e');
    });
  })

  describe('interpretResponse', () => {
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
      sizes: [[300, 250]],
      url: ENDPOINT,
      method: 'GET',
      pi: 3
    }

    it('should get correct bid response', () => {
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

    it('handles nobid responses', () => {
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
  })
});
