import {expect} from 'chai';
import {spec} from 'modules/admixerBidAdapter';
import {newBidder} from 'src/adapters/bidderFactory';

const BIDDER_CODE = 'admixer';
const ENDPOINT_URL = '//inv-nets.admixer.net/prebid.1.0.aspx';
const ZONE_ID = '2eb6bd58-865c-47ce-af7f-a918108c3fd2';

describe('AdmixerAdapter', () => {
  const adapter = newBidder(spec);

  describe('inherited functions', () => {
    it('exists and is a function', () => {
      expect(adapter.callBids).to.be.exist.and.to.be.a('function');
    });
  });

  describe('isBidRequestValid', () => {
    let bid = {
      'bidder': BIDDER_CODE,
      'params': {
        'zone': ZONE_ID
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
        'bidder': BIDDER_CODE,
        'params': {
          'zone': ZONE_ID
        },
        'adUnitCode': 'adunit-code',
        'sizes': [[300, 250], [300, 600]],
        'bidId': '30b31c1838de1e',
        'bidderRequestId': '22edbae2733bf6',
        'auctionId': '1d1a030790a475',
      }
    ];

    it('should add referrer and imp to be equal bidRequest', () => {
      const request = spec.buildRequests(bidRequests);
      const payload = JSON.parse(request.data.substr(5));
      expect(payload.referrer).to.not.be.undefined;
      expect(payload.imps[0]).to.deep.equal(bidRequests[0]);
    });

    it('sends bid request to ENDPOINT via GET', () => {
      const request = spec.buildRequests(bidRequests);
      expect(request.url).to.equal(ENDPOINT_URL);
      expect(request.method).to.equal('GET');
    });
  });

  describe('interpretResponse', () => {
    let response = {
      body: [{
        'currency': 'USD',
        'cpm': 6.210000,
        'ad': '<div>ad</div>',
        'width': 300,
        'height': 600,
        'creativeId': 'ccca3e5e-0c54-4761-9667-771322fbdffc',
        'ttl': 360,
        'netRevenue': false,
        'bidId': '5e4e763b6bc60b'
      }]
    };

    it('should get correct bid response', () => {
      const body = response.body;
      let expectedResponse = [
        {
          'requestId': body[0].bidId,
          'cpm': body[0].cpm,
          'creativeId': body[0].creativeId,
          'width': body[0].width,
          'height': body[0].height,
          'ad': body[0].ad,
          'vastUrl': undefined,
          'currency': body[0].currency,
          'netRevenue': body[0].netRevenue,
          'ttl': body[0].ttl,
        }
      ];

      let result = spec.interpretResponse(response);
      expect(result[0]).to.deep.equal(expectedResponse[0]);
    });

    it('handles nobid responses', () => {
      let response = [];

      let result = spec.interpretResponse(response);
      expect(result.length).to.equal(0);
    });
  });
});
