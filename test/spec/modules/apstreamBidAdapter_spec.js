// jshint esversion: 6, es3: false, node: true
import {assert, expect} from 'chai';
import {config} from 'src/config.js';
import {spec} from 'modules/apstreamBidAdapter.js';
import * as utils from 'src/utils.js';

const validBidRequests = [{
  bidId: 'bidId',
  adUnitCode: '/id/site1/header-ad',
  sizes: [[980, 120], [980, 180]],
  mediaTypes: {
    banner: {
      sizes: [[980, 120], [980, 180]]
    }
  },
  params: {
    publisherId: '1234'
  }
}];

describe('AP Stream adapter', function() {
  describe('isBidRequestValid', function() {
    const bid = {
      bidder: 'apstream',
      mediaTypes: {
        banner: {
          sizes: [300, 250]
        }
      },
      params: {
      }
    };

    let mockConfig;
    beforeEach(function () {
      $$PREBID_GLOBAL$$.bidderSettings = {
        apstream: {
          storageAllowed: true
        }
      };
      mockConfig = {
        apstream: {
          publisherId: '4321'
        }
      };
      sinon.stub(config, 'getConfig').callsFake((key) => {
        return utils.deepAccess(mockConfig, key);
      });
    });

    afterEach(function () {
      $$PREBID_GLOBAL$$.bidderSettings = {};
      config.getConfig.restore();
    });

    it('should return true when publisherId is configured and one media type', function() {
      bid.params.publisherId = '1234';
      assert(spec.isBidRequestValid(bid))
    });

    it('should return false when publisherId is configured and two media types', function() {
      bid.mediaTypes.video = {sizes: [300, 250]};
      assert.isFalse(spec.isBidRequestValid(bid))
    });

    it('should return true when publisherId is configured via config', function() {
      delete bid.mediaTypes.video;
      delete bid.params.publisherId;
      assert.isTrue(spec.isBidRequestValid(bid))
    });
  });

  describe('buildRequests', function() {
    it('should send request with correct structure', function() {
      const request = spec.buildRequests(validBidRequests, { })[0];

      assert.equal(request.method, 'GET');
      assert.deepEqual(request.options, {withCredentials: false});
      assert.ok(request.data);
    });

    it('should send request with different endpoints', function() {
      const validTwoBidRequests = [
        ...validBidRequests,
        ...[{
          bidId: 'bidId2',
          adUnitCode: '/id/site1/header-ad',
          sizes: [[980, 980], [980, 900]],
          mediaTypes: {
            banner: {
              sizes: [[980, 980], [980, 900]]
            }
          },
          params: {
            publisherId: '1234',
            endpoint: 'site2.com'
          }
        }]
      ];

      const request = spec.buildRequests(validTwoBidRequests, {});
      assert.isArray(request);
      assert.lengthOf(request, 2);
      assert.equal(request[1].data.bids, 'bidId2:t=b,s=980x980_980x900,c=/id/site1/header-ad');
    });

    it('should send request with adUnit code', function() {
      const adunitCodeValidBidRequests = [
        {
          ...validBidRequests[0],
          ...{
            params: {
              code: 'Site1_Leaderboard'
            }
          }
        }
      ];

      const request = spec.buildRequests(adunitCodeValidBidRequests, { })[0];
      assert.equal(request.data.bids, 'bidId:t=b,s=980x120_980x180,c=Site1_Leaderboard');
    });

    it('should send request with adUnit id', function() {
      const adunitIdValidBidRequests = [
        {
          ...validBidRequests[0],
          ...{
            params: {
              adunitId: '12345'
            }
          }
        }
      ];

      const request = spec.buildRequests(adunitIdValidBidRequests, { })[0];
      assert.equal(request.data.bids, 'bidId:t=b,s=980x120_980x180,u=12345');
    });

    it('should send request with different media type', function() {
      const types = {
        'audio': 'a',
        'banner': 'b',
        'native': 'n',
        'video': 'v'
      }
      Object.keys(types).forEach(key => {
        const adunitIdValidBidRequests = [
          {
            ...validBidRequests[0],
            ...{
              mediaTypes: {
                [key]: {
                  sizes: [300, 250]
                }
              }
            }
          }
        ];

        const request = spec.buildRequests(adunitIdValidBidRequests, { })[0];
        assert.equal(request.data.bids, `bidId:t=${types[key]},s=980x120_980x180,c=/id/site1/header-ad`);
      })
    });

    describe('gdpr', function() {
      let mockConfig;

      beforeEach(function () {
        mockConfig = {
          consentManagement: {
            cmpApi: 'iab'
          }
        };
        sinon.stub(config, 'getConfig').callsFake((key) => {
          return utils.deepAccess(mockConfig, key);
        });
      });

      afterEach(function () {
        config.getConfig.restore();
      });

      it('should send GDPR Consent data', function() {
        const bidderRequest = {
          gdprConsent: {
            gdprApplies: true,
            consentString: 'consentDataString',
            vendorData: {
              vendorConsents: {
                '394': true
              }
            }
          }
        };

        const request = spec.buildRequests(validBidRequests, bidderRequest)[0].data;
        assert.equal(request.iab_consent, bidderRequest.gdprConsent.consentString);
      });
    });

    describe('dsu', function() {
      it('should pass DSU from local storage if set', function() {
        const bidderRequest = {
          gdprConsent: {
            gdprApplies: true,
            consentString: 'consentDataString',
            vendorData: {
              vendorConsents: {
                '394': true
              }
            }
          }
        };

        const request = spec.buildRequests(validBidRequests, bidderRequest)[0].data;
        assert.isNotEmpty(request.dsu);
      });
    });
  });

  describe('dsu config', function() {
    let mockConfig;
    beforeEach(function () {
      mockConfig = {
        apstream: {
          noDsu: true
        }
      };
      sinon.stub(config, 'getConfig').callsFake((key) => {
        return utils.deepAccess(mockConfig, key);
      });
    });

    afterEach(function () {
      config.getConfig.restore();
    });

    it('should not send DSU if it is disabled in config', function() {
      const request = spec.buildRequests(validBidRequests, { })[0];

      assert.equal(request.data.dsu, '');
    });
  });

  describe('interpretResponse', function () {
    it('should return empty array if no body in response', function () {
      const serverResponse = {};
      const bidRequest = {};

      assert.isEmpty(spec.interpretResponse(serverResponse, bidRequest));
    });

    it('should map server response', function () {
      const serverResponse = {
        body: [
          {
            bidId: 123,
            bidDetails: {
              cpm: 1.23,
              width: 980,
              height: 300,
              currency: 'DKK',
              netRevenue: 'true',
              creativeId: '1234',
              dealId: '99008',
              ad: '<p>Buy our something!</p>',
              ttl: 360
            }
          }
        ]
      };
      const bidRequest = {};

      const response = spec.interpretResponse(serverResponse, bidRequest);

      const expected = {
        requestId: 123,
        cpm: 1.23,
        width: 980,
        height: 300,
        currency: 'DKK',
        creativeId: '1234',
        netRevenue: 'true',
        dealId: '99008',
        ad: '<p>Buy our something!</p>',
        ttl: 360
      };

      assert.deepEqual(response[0], expected);
    });

    it('should add pixels to ad', function () {
      const serverResponse = {
        body: [
          {
            bidId: 123,
            bidDetails: {
              cpm: 1.23,
              width: 980,
              height: 300,
              currency: 'DKK',
              creativeId: '1234',
              netRevenue: 'true',
              dealId: '99008',
              ad: '<p>Buy our something!</p>',
              ttl: 360,
              noticeUrls: [
                'site1',
                'site2'
              ],
              impressionScripts: [
                'url_to_script'
              ]
            }
          }
        ]
      };
      const bidRequest = {};

      const response = spec.interpretResponse(serverResponse, bidRequest);

      assert.match(response[0].ad, /site1/);
      assert.match(response[0].ad, /site2/);
    });
  });
});
