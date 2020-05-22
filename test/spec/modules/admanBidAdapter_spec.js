import {expect} from 'chai';
import {spec} from 'modules/admanBidAdapter';
import {newBidder} from 'src/adapters/bidderFactory';

const ENDPOINT = '//bidtor.admanmedia.com/prebid';
const BANNER = '<script type="text/javascript" async="true" src="https://bogus.script"></script>"';
const VAST = '<VAST version="3.0"></VAST>';
const USER_SYNC_IFRAME_URL = '//cs.admanmedia.com/sync_tag/html';

describe('admanBidAdapter', function() {
  const adapter = newBidder(spec);

  describe('inherited functions', function() {
    it('exists and is a function', function() {
      expect(adapter.callBids).to.exist.and.to.be.a('function');
    });
  });

  describe('isBidRequestValid', function() {
    let bid = {
      'bidder': 'adman',
      'params': {
        'id': '1234asdf'
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

    it('should return false when id is not valid (not string)', function() {
      let bid = Object.assign({}, bid);
      delete bid.params;
      bid.params = {
        'id': 1234
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
        'bidder': 'adman',
        'bidId': '51ef8751f9aead',
        'params': {
          'id': '1234asdf'
        },
        'adUnitCode': 'div-gpt-ad-1460505748561-0',
        'transactionId': 'd7b773de-ceaa-484d-89ca-d9f51b8d61ec',
        'sizes': [[320, 50], [300, 250], [300, 600]],
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
      expect(bid.params).to.exist;
      expect(bid.params.id).to.exist;
      expect(bid.params.bidId).to.exist;
      expect(bid.sizes).to.exist.and.to.be.an('array').and.to.have.lengthOf(3);
      bid.sizes.forEach(size => {
        expect(size).to.be.an('array').and.to.have.lengthOf(2);
        expect(size[0]).to.be.a('number');
        expect(size[1]).to.be.a('number');
      })
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

  describe('interpretResponse', function() {
    let bids = {
      'body': {
        'bids': [{
          'ad': BANNER,
          'height': 250,
          'cpm': 0.5,
          'currency': 'USD',
          'netRevenue': true,
          'requestId': '3ede2a3fa0db94',
          'ttl': 3599,
          'width': 300,
          'creativeId': 'er2ee'
        },
        {
          'vastXml': VAST,
          'cpm': 0.5,
          'currency': 'USD',
          'height': 250,
          'netRevenue': true,
          'requestId': '3ede2a3fa0db95',
          'ttl': 3599,
          'width': 300,
          'creativeId': 'er2ef'
        }]
      }
    };

    it('should get correct bid response', function() {
      let expectedResponse = [{
        'ad': BANNER,
        'cpm': 0.5,
        'creativeId': 'er2ee',
        'currency': 'USD',
        'height': 250,
        'netRevenue': true,
        'requestId': '3ede2a3fa0db94',
        'ttl': 3599,
        'width': 300,
      },
      {
        'vastXml': VAST,
        'cpm': 0.5,
        'creativeId': 'er2ef',
        'currency': 'USD',
        'height': 250,
        'netRevenue': true,
        'requestId': '3ede2a3fa0db95',
        'ttl': 3599,
        'width': 300,
      }];
      // los bids vienen formateados de server
      let result = spec.interpretResponse(bids);

      expect(result[0]).to.deep.equal(expectedResponse[0]);
      expect(result[1]).to.deep.equal(expectedResponse[1]);
      // expect(Object.keys(result[1])).to.deep.equal(Object.keys(bids[1]));
    });

    it('handles nobid responses', function() {
      let bids = {
        'body': {
          'bids': []
        }
      };

      let result = spec.interpretResponse(bids);
      expect(result.length).to.equal(0);
    });
  });
  describe('getUserSyncs', () => {
    it('should get correct user sync iframe url', function() {
      expect(spec.getUserSyncs({
        iframeEnabled: true
      }, [{}])).to.deep.equal([{
        type: 'iframe',
        url: USER_SYNC_IFRAME_URL
      }]);
    });
  });
});
