import { expect } from 'chai';
import { spec } from 'modules/playgroundxyzBidAdapter';
import { newBidder } from 'src/adapters/bidderFactory';
import { deepClone } from 'src/utils';

const URL = 'https://ads.playground.xyz/host-config/prebid';
const GDPR_CONSENT = 'XYZ-CONSENT';

describe('playgroundxyzBidAdapter', () => {
  const adapter = newBidder(spec);

  describe('inherited functions', () => {
    it('exists and is a function', () => {
      expect(adapter.callBids).to.exist.and.to.be.a('function');
    });
  });

  describe('isBidRequestValid', () => {
    let bid = {
      'bidder': 'playgroundxyz',
      'params': {
        'placementId': '10433394'
      },
      'adUnitCode': 'adunit-code',
      'sizes': [[300, 250], [320, 50]],
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
        'bidder': 'playgroundxyz',
        'params': {
          'placementId': '10433394'
        },
        'adUnitCode': 'adunit-code',
        'sizes': [[300, 250], [300, 600]],
        'bidId': '30b31c1838de1e',
        'bidderRequestId': '22edbae2733bf6',
        'auctionId': '1d1a030790a475',
      }
    ];

    it('sends bid request to ENDPOINT via POST', () => {
      let bidRequest = Object.assign([], bidRequests);

      const request = spec.buildRequests(bidRequest);
      const data = JSON.parse(request.data);
      const banner = data.imp[0].banner;

      expect(Object.keys(data.imp[0].ext)).to.have.members(['appnexus']);
      expect([banner.w, banner.h]).to.deep.equal([300, 250]);
      expect(banner.format).to.deep.equal([{w: 300, h: 250}, {w: 300, h: 600}]);
      expect(request.url).to.equal(URL);
      expect(request.method).to.equal('POST');
    });
  })

  describe('interpretResponse', () => {
    let response = {
      'id': 'bidd_id',
      'seatbid': [ {
        'bid': [
          {
            'id': '4434762738980910431',
            'impid': '221f2bdc1fbc31',
            'price': 1,
            'adid': '91673066',
            'adm': '<script src=\'pgxyz\'></script>',
            'adomain': [ 'pg.xyz' ],
            'iurl': 'http://pgxyz.com/cr?id=91673066',
            'cid': 'c_id',
            'crid': 'c_rid',
            'h': 50,
            'w': 320,
            'ext': {
              'appnexus': {
                'brand_id': 1,
                'auction_id': 1087655594852566000,
                'bidder_id': 2,
                'bid_ad_type': 0
              }
            }
          }
        ],
        'seat': '4321'
      }],
      'bidid': '6894227111893743356',
      'cur': 'USD'
    };

    let bidderRequest = {
      'bidderCode': 'playgroundxyz'
    };

    it('should get correct bid response', () => {
      let expectedResponse = [
        {
          'requestId': '221f2bdc1fbc31',
          'cpm': 1,
          'creativeId': 91673066,
          'width': 300,
          'height': 50,
          'ad': '<script src=\'pgxyz\'></script>',
          'mediaType': 'banner',
          'currency': 'USD',
          'ttl': 300,
          'netRevenue': true
        }
      ];
      let result = spec.interpretResponse({ body: response }, {bidderRequest});
      expect(Object.keys(result[0])).to.have.members(Object.keys(expectedResponse[0]));
    });

    it('handles nobid responses', () => {
      let response = '';
      let result = spec.interpretResponse({ body: response }, {bidderRequest});
      expect(result.length).to.equal(0);
    });
  });

  describe('buildRequests', () => {
    let bidRequests = [
      {
        'bidder': 'playgroundxyz',
        'params': {
          'publisherId': 'PUB_FAKE'
        },
        'adUnitCode': 'adunit-code',
        'sizes': [[300, 250]],
        'bidId': '321db112312as',
        'bidderRequestId': '23edabce2731sd6',
        'auctionId': '12as040790a475'
      }
    ];

    it('should not populate GDPR', () => {
      let bidRequest = Object.assign([], bidRequests);
      const request = spec.buildRequests(bidRequest);
      let data = JSON.parse(request.data);
      expect(data).to.not.have.property('user');
      expect(data).to.not.have.property('regs');
    });

    it('should populate GDPR and consent string when consetString is presented but not gdpApplies', () => {
      let bidRequest = Object.assign([], bidRequests);
      const request = spec.buildRequests(bidRequest, {gdprConsent: {consentString: GDPR_CONSENT}});
      let data = JSON.parse(request.data);
      expect(data.regs.ext.gdpr).to.equal(0);
      expect(data.user.ext.consent).to.equal('XYZ-CONSENT');
    });

    it('should populate GDPR and consent string when gdpr is set to true', () => {
      let bidRequest = Object.assign([], bidRequests);
      const request = spec.buildRequests(bidRequest, {gdprConsent: {gdprApplies: true, consentString: GDPR_CONSENT}});
      let data = JSON.parse(request.data);
      expect(data.regs.ext.gdpr).to.equal(1);
      expect(data.user.ext.consent).to.equal('XYZ-CONSENT');
    });

    it('should populate GDPR and consent string when gdpr is set to false', () => {
      let bidRequest = Object.assign([], bidRequests);
      const request = spec.buildRequests(bidRequest, {gdprConsent: {gdprApplies: false, consentString: GDPR_CONSENT}});
      let data = JSON.parse(request.data);
      expect(data.regs.ext.gdpr).to.equal(0);
      expect(data.user.ext.consent).to.equal('XYZ-CONSENT');
    });
  });
});
