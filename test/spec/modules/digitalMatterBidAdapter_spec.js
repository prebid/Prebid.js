import {assert, expect} from 'chai';
import {spec} from 'modules/digitalMatterBidAdapter';
import {config} from '../../../src/config';
import {deepClone} from '../../../src/utils';

const bid = {
  'adUnitCode': 'adUnitCode',
  'bidId': 'bidId',
  'bidder': 'digitalMatter',
  'mediaTypes': {
    'banner': {
      'sizes': [[300, 250], [300, 600]]
    }
  },
  'params': {
    'accountId': '1_demo_1',
    'siteId': '1-demo-1'
  }
};
const bidderRequest = {
  ortb2: {
    source: {
      tid: 'tid-string'
    },
    regs: {
      ext: {
        gdpr: 1
      }
    },
    site: {
      domain: 'publisher.domain.com',
      publisher: {
        domain: 'publisher.domain.com'
      },
      page: 'https://publisher.domain.com/test.html'
    },
    device: {
      w: 100,
      h: 100,
      dnt: 0,
      ua: navigator.userAgent,
      language: 'en'
    }
  }
};

describe('Digital Matter BidAdapter', function () {
  describe('isBidRequestValid', function () {
    it('should return true when all required params found', function () {
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });

    it('should return false when required params are not passed', function () {
      let invalidBid = Object.assign({}, bid);
      delete invalidBid.params;
      expect(spec.isBidRequestValid(invalidBid)).to.equal(false);
    });

    it('should return false when media type banner is missing', function () {
      let invalidBid = deepClone(bid);
      delete invalidBid.mediaTypes.banner;
      expect(spec.isBidRequestValid(invalidBid)).to.equal(false);
    });
  });

  describe('buildRequests', function () {
    beforeEach(function () {
      config.resetConfig();
    });
    it('should send request with correct structure', function () {
      let request = spec.buildRequests([bid], bidderRequest);

      assert.equal(request.method, 'POST');
      assert.equal(request.url, 'https://adx.digitalmatter.services/openrtb2/auction');
      assert.equal(request.options, undefined);
      assert.ok(request.data);
    });

    it('should have default request structure', function () {
      let keys = 'tid,site,device,imp,test,ext'.split(',');
      let request = JSON.parse(spec.buildRequests([bid], bidderRequest).data);
      let data = Object.keys(request);

      assert.deepEqual(keys, data);
    });

    it('should send info about device', function () {
      config.setConfig({
        device: {w: 1920, h: 1080}
      });
      let request = JSON.parse(spec.buildRequests([bid], bidderRequest).data);

      assert.equal(request.device.ua, navigator.userAgent);
      assert.equal(request.device.w, 100);
      assert.equal(request.device.h, 100);
    });

    it('should send info about the site', function () {
      let request = JSON.parse(spec.buildRequests([bid], bidderRequest).data);

      assert.deepEqual(request.site, {
        domain: 'publisher.domain.com',
        publisher: {
          domain: 'publisher.domain.com'
        },
        page: 'https://publisher.domain.com/test.html'
      });
    });

    it('should send currency if defined', function () {
      config.setConfig({currency: {adServerCurrency: 'EUR'}});
      let request = JSON.parse(spec.buildRequests([bid], bidderRequest).data);

      assert.deepEqual(request.cur, [{adServerCurrency: 'EUR'}]);
    });

    it('should pass supply chain object', function () {
      let validBidRequests = {
        ...bid,
        schain: {
          validation: 'strict',
          config: {
            ver: '1.0'
          }
        }
      };

      let request = JSON.parse(spec.buildRequests([validBidRequests], bidderRequest).data);
      assert.deepEqual(request.source.ext.schain, {
        validation: 'strict',
        config: {
          ver: '1.0'
        }
      });
    });

    it('should pass extended ids if exists', function () {
      let validBidRequests = {
        ...bid,
        userIdAsEids: [
          {
            source: 'adserver.org',
            uids: [
              {
                id: 'TTD_ID_FROM_USER_ID_MODULE',
                atype: 1,
                ext: {
                  rtiPartner: 'TDID'
                }
              }
            ]
          }
        ]
      };

      let request = JSON.parse(spec.buildRequests([validBidRequests], bidderRequest).data);

      assert.deepEqual(request.user.ext.eids, validBidRequests.userIdAsEids);
    });

    it('should pass gdpr consent data if gdprApplies', function () {
      let consentedBidderRequest = {
        ...bidderRequest,
        gdprConsent: {
          gdprApplies: true,
          consentString: 'consentDataString'
        }
      };

      let request = JSON.parse(spec.buildRequests([bid], consentedBidderRequest).data);
      assert.equal(request.user.ext.consent, consentedBidderRequest.gdprConsent.consentString);
      assert.equal(request.regs.ext.gdpr, consentedBidderRequest.gdprConsent.gdprApplies);
      assert.equal(typeof request.regs.ext.gdpr, 'number');
    });
  });

  describe('interpretResponse', function () {
    it('should return empty array if no body in response', function () {
      assert.ok(spec.interpretResponse([]));
    });

    it('should return array with bids if response not empty', function () {
      const firstResponse = {
        id: 'id_1',
        impid: 'impId_1',
        bidid: 'bidId_1',
        adunitcode: 'adUnitCode_1',
        cpm: 0.10,
        ad: '<p>ad</>',
        adomain: [
          'advertiser.org'
        ],
        width: 970,
        height: 250,
        creativeid: 'creativeId_1',
        meta: {
          advertiserDomains: [
            'advertiser.org'
          ]
        }
      };
      const secondResponse = {
        'id': 'id_2',
        'impid': 'impId_2',
        'bidid': 'bidId_2',
        'adunitcode': 'adUnitCode_2',
        'cpm': 0.11,
        'ad': '<p>ad</>',
        'adomain': [
          'advertiser.org'
        ],
        'width': 970,
        'height': 250,
        'creativeid': 'creativeId_2',
        'meta': {
          'advertiserDomains': [
            'advertiser.org'
          ]
        }
      };
      const currency = 'EUR';

      const bids = spec.interpretResponse({
        body: {
          id: 'randomId',
          cur: currency,
          bids: [
            firstResponse,
            secondResponse
          ]
        }
      });

      assert.ok(bids);
      assert.deepEqual(bids[0].requestId, firstResponse.bidid);
      assert.deepEqual(bids[0].cpm, firstResponse.cpm);
      assert.deepEqual(bids[0].creativeId, firstResponse.creativeid);
      assert.deepEqual(bids[0].ttl, 300);
      assert.deepEqual(bids[0].netRevenue, true);
      assert.deepEqual(bids[0].currency, currency);
      assert.deepEqual(bids[0].width, firstResponse.width);
      assert.deepEqual(bids[0].height, firstResponse.height);
      assert.deepEqual(bids[0].dealId, undefined);
      assert.deepEqual(bids[0].meta.advertiserDomains, [ 'advertiser.org' ]);

      assert.deepEqual(bids[1].requestId, secondResponse.bidid);
      assert.deepEqual(bids[1].cpm, secondResponse.cpm);
      assert.deepEqual(bids[1].creativeId, secondResponse.creativeid);
      assert.deepEqual(bids[1].ttl, 300);
      assert.deepEqual(bids[1].netRevenue, true);
      assert.deepEqual(bids[1].currency, currency);
      assert.deepEqual(bids[1].width, secondResponse.width);
      assert.deepEqual(bids[1].height, secondResponse.height);
      assert.deepEqual(bids[1].dealId, undefined);
      assert.deepEqual(bids[1].meta.advertiserDomains, [ 'advertiser.org' ]);
    });
  });

  describe('getUserSyncs', function () {
    it('handle empty array (e.g. timeout)', function () {
      const syncs = spec.getUserSyncs({ pixelEnabled: true, iframeEnabled: true }, []);
      expect(syncs).to.deep.equal([]);
    });
  });
});
