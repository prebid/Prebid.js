// jshint esversion: 6, es3: false, node: true
import { assert } from 'chai';
import { spec } from 'modules/carodaBidAdapter.js';
import { config } from 'src/config.js';
import { createEidsArray } from 'modules/userId/eids.js';

describe('Caroda adapter', function () {
  let bids = [];

  describe('isBidRequestValid', function () {
    let bid = {
      'bidder': 'caroda',
      'params': {
        'ctok': 'adf232eef344'
      }
    };

    it('should return true when required params found', function () {
      assert(spec.isBidRequestValid(bid));

      bid.params = {
        ctok: 'adf232eef344',
        placementId: 'someplacement'
      };
      assert(spec.isBidRequestValid(bid));
    });

    it('should return false when required params are missing', function () {
      bid.params = {};
      assert.isFalse(spec.isBidRequestValid(bid));

      bid.params = {
        placementId: 'someplacement'
      };
      assert.isFalse(spec.isBidRequestValid(bid));
    });
  });

  describe('buildRequests', function () {
    beforeEach(function () {
      config.resetConfig();
      delete window.carodaPageViewId;
    });
    it('should send request with minimal structure', function () {
      const validBidRequests = [{
        bid_id: 'bidId',
        params: {
          'ctok': 'adf232eef344'
        }
      }];
      window.top.carodaPageViewId = 12345;
      const request = spec.buildRequests(validBidRequests, { refererInfo: { page: 'page' } })[0];
      assert.equal(request.method, 'POST');
      assert.equal(request.url, 'https://prebid.caroda.io/api/hb?entry_id=12345');
      assert.equal(request.options, undefined);
      const data = JSON.parse(request.data)
      assert.equal(data.ctok, 'adf232eef344');
      assert.ok(data.site);
      assert.ok(data.hb_version);
      assert.ok(data.device);
      assert.equal(data.price_type, 'net');
    });

    it('should add test to request, if test is set in parameters', function () {
      const validBidRequests = [{
        bid_id: 'bidId',
        params: {
          'ctok': 'adf232eef344',
          'test': 1
        }
      }];
      window.top.carodaPageViewId = 12345;
      const request = spec.buildRequests(validBidRequests, { refererInfo: { page: 'page' } })[0];
      const data = JSON.parse(request.data)
      assert.equal(data.test, 1);
    });

    it('should add placement_id to request when available', function () {
      const validBidRequests = [{
        bid_id: 'bidId',
        params: {
          'ctok': 'adf232eef344',
          'placementId': 'opzafe342f'
        }
      }];
      window.top.carodaPageViewId = 12345;
      const request = spec.buildRequests(validBidRequests, { refererInfo: { page: 'page' } })[0];
      const data = JSON.parse(request.data);
      assert.equal(data.placement_id, 'opzafe342f');
    });

    it('should send info about device', function () {
      config.setConfig({
        device: { w: 100, h: 100 }
      });
      const validBidRequests = [{
        bid_id: 'bidId',
        params: { 'ctok': 'adf232eef344' }
      }];
      const data = JSON.parse(spec.buildRequests(validBidRequests, { refererInfo: { page: 'page' } })[0].data);
      assert.equal(data.device.ua, navigator.userAgent);
      assert.equal(data.device.w, 100);
      assert.equal(data.device.h, 100);
    });

    it('should pass supply chain object', function () {
      const validBidRequests = [{
        bid_id: 'bidId',
        params: {},
        schain: {
          validation: 'strict',
          config: {
            ver: '1.0'
          }
        }
      }];

      let data = JSON.parse(spec.buildRequests(validBidRequests, { refererInfo: { page: 'page' } })[0].data);
      assert.deepEqual(data.schain, {
        validation: 'strict',
        config: {
          ver: '1.0'
        }
      });
    });

    it('should send app info', function () {
      config.setConfig({
        app: { id: 'appid' },
      });
      const ortb2 = { app: { name: 'appname' } };
      let validBidRequests = [{
        bid_id: 'bidId',
        params: { mid: '1000' },
        ortb2
      }];
      let request = JSON.parse(spec.buildRequests(validBidRequests, { refererInfo: { page: 'page' }, ortb2 })[0].data);
      assert.equal(request.app.id, 'appid');
      assert.equal(request.app.name, 'appname');
      assert.equal(request.site, undefined);
    });

    it('should send info about the site', function () {
      config.setConfig({
        site: {
          id: '123123',
          publisher: {
            domain: 'publisher.domain.com'
          }
        },
      });
      const ortb2 = {
        site: {
          publisher: {
            name: 'publisher\'s name'
          }
        }
      };
      let validBidRequests = [{
        bid_id: 'bidId',
        params: { mid: '1000' },
        ortb2
      }];
      let refererInfo = { page: 'page' };
      let request = JSON.parse(spec.buildRequests(validBidRequests, { refererInfo, ortb2 })[0].data);

      assert.deepEqual(request.site, {
        page: refererInfo.page,
        publisher: {
          domain: 'publisher.domain.com',
          name: 'publisher\'s name'
        },
        id: '123123'
      });
    });

    it('should send correct priceType value', function () {
      let validBidRequests = [{
        bid_id: 'bidId',
        params: { priceType: 'gross' }
      }];
      let request = JSON.parse(spec.buildRequests(validBidRequests, { refererInfo: { page: 'page' } })[0].data);

      assert.equal(request.price_type, 'gross');
    });

    it('should send currency if defined', function () {
      config.setConfig({ currency: { adServerCurrency: 'EUR' } });
      let validBidRequests = [{ params: {} }];
      let refererInfo = { page: 'page' };
      let request = JSON.parse(spec.buildRequests(validBidRequests, { refererInfo })[0].data);

      assert.deepEqual(request.currency, 'EUR');
    });

    it('should pass extended ids', function () {
      let validBidRequests = [{
        bid_id: 'bidId',
        params: {},
        userIdAsEids: createEidsArray({
          tdid: 'TTD_ID_FROM_USER_ID_MODULE',
          pubcid: 'pubCommonId_FROM_USER_ID_MODULE'
        })
      }];

      let request = JSON.parse(spec.buildRequests(validBidRequests, { refererInfo: { page: 'page' } })[0].data);
      assert.deepEqual(request.user.eids, [
        { source: 'adserver.org', uids: [ { id: 'TTD_ID_FROM_USER_ID_MODULE', atype: 1, ext: { rtiPartner: 'TDID' } } ] },
        { source: 'pubcid.org', uids: [ { id: 'pubCommonId_FROM_USER_ID_MODULE', atype: 1 } ] }
      ]);
    });

    describe('user privacy', function () {
      it('should send GDPR Consent data to adform if gdprApplies', function () {
        let validBidRequests = [{ bid_id: 'bidId', params: { test: 1 } }];
        let bidderRequest = { gdprConsent: { gdprApplies: true, consentString: 'consentDataString' }, refererInfo: { page: 'page' } };
        let request = JSON.parse(spec.buildRequests(validBidRequests, bidderRequest)[0].data);

        assert.equal(request.privacy.gdpr_consent, bidderRequest.gdprConsent.consentString);
        assert.equal(request.privacy.gdpr, bidderRequest.gdprConsent.gdprApplies);
        assert.equal(typeof request.privacy.gdpr, 'number');
      });

      it('should send gdpr as number', function () {
        let validBidRequests = [{ bid_id: 'bidId', params: { test: 1 } }];
        let bidderRequest = { gdprConsent: { gdprApplies: true, consentString: 'consentDataString' }, refererInfo: { page: 'page' } };
        let request = JSON.parse(spec.buildRequests(validBidRequests, bidderRequest)[0].data);

        assert.equal(typeof request.privacy.gdpr, 'number');
        assert.equal(request.privacy.gdpr, 1);
      });

      it('should send CCPA Consent data', function () {
        let validBidRequests = [{ bid_id: 'bidId', params: { test: 1 } }];
        let bidderRequest = { uspConsent: '1YA-', refererInfo: { page: 'page' } };
        let request = JSON.parse(spec.buildRequests(validBidRequests, bidderRequest)[0].data);

        assert.equal(request.privacy.us_privacy, '1YA-');

        bidderRequest = { uspConsent: '1YA-', gdprConsent: { gdprApplies: true, consentString: 'consentDataString' }, refererInfo: { page: 'page' } };
        request = JSON.parse(spec.buildRequests(validBidRequests, bidderRequest)[0].data);

        assert.equal(request.privacy.us_privacy, '1YA-');
        assert.equal(request.privacy.gdpr_consent, 'consentDataString');
        assert.equal(request.privacy.gdpr, 1);
      });

      it('should not set coppa when coppa is not provided or is set to false', function () {
        config.setConfig({
        });
        let validBidRequests = [{ bid_id: 'bidId', params: { test: 1 } }];
        let bidderRequest = { gdprConsent: { gdprApplies: true, consentString: 'consentDataString' }, refererInfo: { page: 'page' } };
        let request = JSON.parse(spec.buildRequests(validBidRequests, bidderRequest)[0].data);

        assert.equal(request.privacy.coppa, undefined);

        config.setConfig({
          coppa: false
        });
        request = JSON.parse(spec.buildRequests(validBidRequests, bidderRequest)[0].data);

        assert.equal(request.privacy.coppa, undefined);
      });
      it('should set coppa to 1 when coppa is provided with value true', function () {
        config.setConfig({
          coppa: true
        });
        let validBidRequests = [{ bid_id: 'bidId', params: { test: 1 } }];
        let request = JSON.parse(spec.buildRequests(validBidRequests, { refererInfo: { page: 'page' } })[0].data);

        assert.equal(request.privacy.coppa, 1);
      });
    });

    describe('bids', function () {
      it('should be able to handle multiple bids', function () {
        const validBidRequests = [{
          bid_id: 'bidId',
          params: { ctok: 'ctok1' }
        }, {
          bid_id: 'bidId2',
          params: { ctok: 'ctok2' }
        }];
        const request = spec.buildRequests(validBidRequests, { refererInfo: { page: 'page' } });
        assert.equal(request.length, 2);
        const data = request.map(r => JSON.parse(r.data));
        assert.equal(data[0].ctok, 'ctok1');
        assert.equal(data[1].ctok, 'ctok2');
      });

      describe('price floors', function () {
        it('should not add if floors module not configured', function () {
          const validBidRequests = [{ bid_id: 'bidId', params: {ctok: 'ctok1'}, mediaTypes: {video: {}} }];
          const imp = JSON.parse(spec.buildRequests(validBidRequests, { refererInfo: { page: 'page' } })[0].data);
          assert.equal(imp.bidfloor, undefined);
          assert.equal(imp.bidfloorcur, undefined);
        });

        it('should not add if floor price not defined', function () {
          const validBidRequests = [ getBidWithFloor() ];
          const imp = JSON.parse(spec.buildRequests(validBidRequests, { refererInfo: { page: 'page' } })[0].data);
          assert.equal(imp.bidfloor, undefined);
          assert.equal(imp.bidfloorcur, 'EUR');
        });

        it('should request floor price in adserver currency', function () {
          config.setConfig({ currency: { adServerCurrency: 'DKK' } });
          const validBidRequests = [ getBidWithFloor() ];
          const imp = JSON.parse(spec.buildRequests(validBidRequests, { refererInfo: { page: 'page' } })[0].data);
          assert.equal(imp.bidfloor, undefined);
          assert.equal(imp.bidfloorcur, 'DKK');
        });

        it('should add correct floor values', function () {
          const expectedFloors = [ 1, 1.3, 0.5 ];
          const validBidRequests = expectedFloors.map(getBidWithFloor);
          const imps = spec
            .buildRequests(validBidRequests, { refererInfo: { page: 'page' } })
            .map(r => JSON.parse(r.data));
          expectedFloors.forEach((floor, index) => {
            assert.equal(imps[index].bidfloor, floor);
            assert.equal(imps[index].bidfloorcur, 'EUR');
          });
        });

        function getBidWithFloor(floor) {
          return {
            params: { ctok: 'ctok1' },
            mediaTypes: { video: {} },
            getFloor: ({ currency }) => {
              return {
                currency: currency,
                floor
              };
            }
          };
        }
      });

      describe('multiple media types', function () {
        it('should use all configured media types for bidding', function () {
          const validBidRequests = [{
            bid_id: 'bidId',
            params: { ctok: 'ctok1' },
            mediaTypes: {
              banner: {
                sizes: [[100, 100], [200, 300]]
              },
              video: {}
            }
          }, {
            bid_id: 'bidId2',
            params: { ctok: 'ctok1' },
            mediaTypes: {
              video: {},
              native: {}
            }
          }];
          const [ first, second ] = spec
            .buildRequests(validBidRequests, { refererInfo: { page: 'page' } })
            .map(r => JSON.parse(r.data));

          assert.ok(first.banner);
          assert.ok(first.video);

          assert.ok(second.video);
          assert.equal(second.banner, undefined);
        });
      });

      describe('banner', function () {
        it('should convert sizes to openrtb format', function () {
          const validBidRequests = [{
            bid_id: 'bidId',
            params: { mid: 1000 },
            mediaTypes: {
              banner: {
                sizes: [[100, 100], [200, 300]]
              }
            }
          }];
          const { banner } = JSON.parse(spec.buildRequests(validBidRequests, { refererInfo: { page: 'page' } })[0].data);
          assert.deepEqual(banner, {
            format: [ { w: 100, h: 100 }, { w: 200, h: 300 } ]
          });
        });
      });

      describe('video', function () {
        it('should pass video mediatype config', function () {
          const validBidRequests = [{
            bid_id: 'bidId',
            params: { mid: 1000 },
            mediaTypes: {
              video: {
                playerSize: [640, 480],
                context: 'outstream',
                mimes: ['video/mp4']
              }
            }
          }];
          const { video } = JSON.parse(spec.buildRequests(validBidRequests, { refererInfo: { page: 'page' } })[0].data);
          assert.deepEqual(video, {
            playerSize: [640, 480],
            context: 'outstream',
            mimes: ['video/mp4']
          });
        });
      });
    });
  });

  describe('interpretResponse', function () {
    it('should return if no body in response', function () {
      const serverResponse = {};
      const bidRequest = {};
      assert.ok(!spec.interpretResponse(serverResponse, bidRequest));
    });
    const basicBidResponse = () => ({
      bid_id: 'bidId',
      cpm: 10,
      creative_id: '12345',
      currency: 'CZK',
      w: 100,
      h: 100,
      ad: '<script....',
      placement_id: 'opzafe23'
    });
    const bidRequest = () => ({
      data: {},
      bids: [
        {
          bid_id: 'bidId1',
          params: { ctok: 'ctok1' }
        },
        {
          bid_id: 'bidId2',
          params: { ctok: 'ctok2' }
        }
      ]
    });
    it('should parse a typical ok response', function () {
      const serverResponse = {
        body: { ok: { value: JSON.stringify([basicBidResponse()]) } }
      };
      bids = spec.interpretResponse(serverResponse, bidRequest());
      assert.equal(bids.length, 1);
      assert.deepEqual(bids[0],
        {
          requestId: 'bidId',
          cpm: 10,
          creativeId: '12345',
          ttl: 300,
          netRevenue: true,
          currency: 'CZK',
          width: 100,
          height: 100,
          meta: {
            advertiserDomains: []
          },
          ad: '<script....',
          placementId: 'opzafe23'
        });
    });
    it('should add adserverTargeting', function () {
      const serverResponse = {
        body: {
          ok: {
            value: JSON.stringify([{
              ...basicBidResponse(),
              adserver_targeting: { tag: 'value' }
            }])
          }
        }
      };
      bids = spec.interpretResponse(serverResponse, bidRequest());
      assert.deepEqual(bids[0].adserverTargeting, { tag: 'value' });
    });
    it('should add adomains', function () {
      const serverResponse = {
        body: {
          ok: {
            value: JSON.stringify([{
              ...basicBidResponse(),
              adomain: ['a.b.c']
            }])
          }
        }
      };
      bids = spec.interpretResponse(serverResponse, bidRequest());
      assert.deepEqual(bids[0].meta.advertiserDomains, ['a.b.c']);
    });
  });
});
