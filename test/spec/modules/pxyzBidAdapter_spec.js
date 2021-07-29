import { expect } from 'chai';
import { spec } from 'modules/pxyzBidAdapter.js';
import { newBidder } from 'src/adapters/bidderFactory.js';
import { deepClone } from 'src/utils.js';

const URL = 'https://ads.playground.xyz/host-config/prebid?v=2';
const GDPR_CONSENT = 'XYZ-CONSENT';

const BIDDER_REQUEST = {
  refererInfo: {
    referer: 'https://example.com'
  }
};

describe('pxyzBidAdapter', function () {
  const adapter = newBidder(spec);

  describe('inherited functions', function () {
    it('exists and is a function', function () {
      expect(adapter.callBids).to.exist.and.to.be.a('function');
    });
  });

  describe('isBidRequestValid', function () {
    let bid = {
      'bidder': 'pxyz',
      'params': {
        'placementId': '10433394'
      },
      'adUnitCode': 'adunit-code',
      'sizes': [[300, 250], [320, 50]],
      'bidId': '30b31c1838de1e',
      'bidderRequestId': '22edbae2733bf6',
      'auctionId': '1d1a030790a475',
    };

    it('should return true when required params found', function () {
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
        'bidder': 'pxyz',
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

    it('sends bid request to ENDPOINT via POST', function () {
      const request = spec.buildRequests(bidRequests, BIDDER_REQUEST);
      const data = JSON.parse(request.data);
      const banner = data.imp[0].banner;

      expect(Object.keys(data.imp[0].ext)).to.have.members(['appnexus', 'pxyz']);
      expect([banner.w, banner.h]).to.deep.equal([300, 250]);
      expect(banner.format).to.deep.equal([{w: 300, h: 250}, {w: 300, h: 600}]);
      expect(request.url).to.equal(URL);
      expect(request.method).to.equal('POST');
    });

    describe('CCPA', function () {
      describe('when USP consent object is NOT present in bidder request', function () {
        const request = spec.buildRequests(bidRequests, BIDDER_REQUEST);
        const data = JSON.parse(request.data);
        it('should not populate ext.gdpr or ext.consent', function () {
          expect(data).to.not.have.property('Regs.ext.us_privacy');
        });
      });

      describe('when USP consent object is present in bidder request', function () {
        describe('when GDPR is applicable', function () {
          const request = spec.buildRequests(
            bidRequests,
            Object.assign({}, BIDDER_REQUEST, { uspConsent: '1YYY' })
          );
          const data = JSON.parse(request.data);
          it('should set Regs.ext.us_privacy with the correct value', function () {
            expect(data.Regs.ext['us_privacy']).to.equal('1YYY');
          });
        });
      });
    });

    describe('GDPR', function () {
      describe('when no GDPR consent object is present in bidder request', function () {
        const request = spec.buildRequests(bidRequests, BIDDER_REQUEST);
        const data = JSON.parse(request.data);
        it('should not populate ext.gdpr or ext.consent', function () {
          expect(data).to.not.have.property('Regs.ext.consent');
        });
      });

      describe('when GDPR consent object is present in bidder request', function () {
        describe('when GDPR is applicable', function () {
          const request = spec.buildRequests(
            bidRequests,
            Object.assign({}, BIDDER_REQUEST, {
              gdprConsent: { gdprApplies: true, consentString: GDPR_CONSENT }
            })
          );
          const data = JSON.parse(request.data);
          it('should set ext.gdpr with 1', function () {
            expect(data.Regs.ext.gdpr).to.equal(1);
          });
          it('should set ext.consent', function () {
            expect(data.User.ext.consent).to.equal('XYZ-CONSENT');
          });
        });
        describe('when GDPR is NOT applicable', function () {
          const request = spec.buildRequests(
            bidRequests,
            Object.assign({}, BIDDER_REQUEST, {
              gdprConsent: { gdprApplies: false, consentString: GDPR_CONSENT }
            })
          );
          const data = JSON.parse(request.data);
          it('should set ext.gdpr to 0', function () {
            expect(data.Regs.ext.gdpr).to.equal(0);
          });
          it('should populate ext.consent', function () {
            expect(data.User.ext.consent).to.equal('XYZ-CONSENT');
          });
        });
      });
    });
  })

  describe('interpretResponse', function () {
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
      'cur': 'AUD'
    };

    let bidderRequest = {
      'bidderCode': 'pxyz'
    };

    it('should get correct bid response', function () {
      let expectedResponse = [
        {
          'requestId': '221f2bdc1fbc31',
          'cpm': 1,
          'creativeId': 91673066,
          'width': 300,
          'height': 50,
          'ad': '<script src=\'pgxyz\'></script>',
          'mediaType': 'banner',
          'currency': 'AUD',
          'ttl': 300,
          'netRevenue': true,
          'meta': {
            advertiserDomains: ['pg.xyz']
          }
        }
      ];
      let result = spec.interpretResponse({ body: response }, {bidderRequest});
      expect(Object.keys(result[0])).to.have.members(Object.keys(expectedResponse[0]));
      expect(result[0].meta.advertiserDomains).to.deep.equal(expectedResponse[0].meta.advertiserDomains);
    });

    it('handles nobid response', function () {
      const response = undefined;
      let result = spec.interpretResponse({ body: response }, {bidderRequest});
      expect(result.length).to.equal(0);
    });
  });

  describe('getUserSyncs', function () {
    const syncUrl = '//ib.adnxs.com/getuidnb?https://ads.playground.xyz/usersync?partner=appnexus&uid=$UID';

    describe('when iframeEnabled is true', function () {
      const syncOptions = {
        'iframeEnabled': true
      }
      it('should return one image type user sync pixel', function () {
        let result = spec.getUserSyncs(syncOptions);
        expect(result.length).to.equal(1);
        expect(result[0].type).to.equal('image')
        expect(result[0].url).to.equal(syncUrl);
      });
    });

    describe('when iframeEnabled is false', function () {
      const syncOptions = {
        'iframeEnabled': false
      }
      it('should return one image type user sync pixel', function () {
        let result = spec.getUserSyncs(syncOptions);
        expect(result.length).to.equal(1);
        expect(result[0].type).to.equal('image')
        expect(result[0].url).to.equal(syncUrl);
      });
    });
  })
});
