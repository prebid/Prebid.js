// jshint esversion: 6, es3: false, node: true
import { assert, expect } from 'chai';
import { getStorageManager } from 'src/storageManager.js';
import { spec } from 'modules/seedingAllianceBidAdapter.js';
import { config } from 'src/config.js';
import { getGlobal } from '../../../src/prebidGlobal.js';

describe('SeedingAlliance adapter', function () {
  let serverResponse, bidRequest, bidResponses;
  const bid = {
    'bidder': 'seedingAlliance',
    'params': {
      'adUnitId': '1hq8'
    }
  };

  const validBidRequests = [{
    bidId: 'bidId',
    params: {},
    mediaType: {
      native: {}
    }
  }];

  describe('spec metadata', function () {
    it('should expose code, gvlid, and supportedMediaTypes', function () {
      expect(spec.code).to.equal('seedingAlliance');
      expect(spec.gvlid).to.equal(371);
      expect(spec.supportedMediaTypes).to.have.members(['native', 'banner']);
    });
  });

  describe('isBidRequestValid', function () {
    it('should return true when required params found', function () {
      assert(spec.isBidRequestValid(bid));
    });

    it('should return false when AdUnitId is not set', function () {
      delete bid.params.adUnitId;
      assert.isFalse(spec.isBidRequestValid(bid));
    });
  });

  describe('buildRequests', function () {
    it('should send request with correct structure', function () {
      const request = spec.buildRequests(validBidRequests, { refererInfo: { referer: 'page' } });

      assert.equal(request.method, 'POST');
      assert.ok(request.data);
    });

    it('should have default request structure', function () {
      const keys = 'site,cur,imp,regs'.split(',');
      const request = JSON.parse(spec.buildRequests(validBidRequests, { refererInfo: { referer: 'page' } }).data);
      const data = Object.keys(request);

      assert.includeDeepMembers(data, keys);
    });

    it('Verify the site url', function () {
      const siteUrl = 'https://www.yourdomain.tld/your-directory/';
      validBidRequests[0].params.url = siteUrl;
      const request = JSON.parse(spec.buildRequests(validBidRequests, { refererInfo: { referer: 'page' } }).data);

      assert.equal(request.site.page, siteUrl);
    });

    it('should set imp.tagid from params.adUnitId', function () {
      const bidRequests = [{ bidId: 'bidId', params: { adUnitId: 'unit-1' }, mediaType: { native: {} } }];
      const request = JSON.parse(spec.buildRequests(bidRequests, { refererInfo: { page: 'page' } }).data);

      assert.equal(request.imp[0].tagid, 'unit-1');
    });

    it('should remove device from request', function () {
      const bidRequests = [{ bidId: 'bidId', params: {}, mediaType: { native: {} } }];
      const request = JSON.parse(spec.buildRequests(bidRequests, { refererInfo: { page: 'page' } }).data);

      assert.isUndefined(request.device);
    });

    it('should set regs.ext.pb_ver', function () {
      const bidRequests = [{ bidId: 'bidId', params: {}, mediaType: { native: {} } }];
      const request = JSON.parse(spec.buildRequests(bidRequests, { refererInfo: { page: 'page' } }).data);

      assert.ok(request.regs.ext.pb_ver);
    });

    it('should default currency to EUR', function () {
      const bidRequests = [{ bidId: 'bidId', params: {}, mediaType: { native: {} } }];
      const request = JSON.parse(spec.buildRequests(bidRequests, { refererInfo: { page: 'page' } }).data);

      assert.deepEqual(request.cur, ['EUR']);
    });

    it('should use currency from config when adServerCurrency is set', function () {
      config.setConfig({ currency: { adServerCurrency: 'USD' } });
      const bidRequests = [{ bidId: 'bidId', params: {}, mediaType: { native: {} } }];
      const request = JSON.parse(spec.buildRequests(bidRequests, { refererInfo: { page: 'page' } }).data);

      assert.deepEqual(request.cur, ['USD']);
      config.resetConfig();
    });

    it('should use custom endpoint from config when seedingAlliance.endpoint is set', function () {
      config.setConfig({ seedingAlliance: { endpoint: 'https://custom.example/rtb' } });
      const bidRequests = [{ bidId: 'bidId', params: {}, mediaType: { native: {} } }];
      const result = spec.buildRequests(bidRequests, { refererInfo: { page: 'page' } });

      assert.equal(result.url, 'https://custom.example/rtb');
      config.resetConfig();
    });

    it('should set GDPR consent fields when gdprConsent is present', function () {
      const bidRequests = [{ bidId: 'bidId', params: {}, mediaType: { native: {} } }];
      const bidderRequest = {
        refererInfo: { page: 'page' },
        gdprConsent: { gdprApplies: true, consentString: 'CONSENT-XYZ' }
      };
      const request = JSON.parse(spec.buildRequests(bidRequests, bidderRequest).data);

      assert.equal(request.user.ext.consent, 'CONSENT-XYZ');
      assert.equal(request.regs.ext.gdpr, 1);
    });

    it('should set regs.ext.gdpr to 0 when gdprApplies is not a boolean', function () {
      const bidRequests = [{ bidId: 'bidId', params: {}, mediaType: { native: {} } }];
      const bidderRequest = {
        refererInfo: { page: 'page' },
        gdprConsent: { gdprApplies: undefined, consentString: 'X' }
      };
      const request = JSON.parse(spec.buildRequests(bidRequests, bidderRequest).data);

      assert.equal(request.regs.ext.gdpr, 0);
    });
  });

  describe('check user ID functionality', function () {
    const storage = getStorageManager({ bidderCode: 'seedingAlliance' });
    const localStorageIsEnabledStub = sinon.stub(storage, 'localStorageIsEnabled');
    const getDataFromLocalStorageStub = sinon.stub(storage, 'getDataFromLocalStorage');
    const bidRequests = [{
      bidId: 'bidId',
      params: {}
    }];
    const bidderRequest = {
      refererInfo: { referer: 'page' },
      gdprConsent: 'CP0j9IAP0j9IAAGABCENAYEgAP_gAAAAAAYgIxBVBCpNDWFAMHBVAJIgCYAU1sARIAQAABCAAyAFAAOA8IAA0QECEAQAAAACAAAAgVABAAAAAABEAACAAAAEAQFkAAQQgAAIAAAAAAEQQgBQAAgAAAAAEAAIgAABAwQAkACQIYLEBUCAhIAgCgAAAIgBgICAAgMACEAYAAAAAAIAAIBAAgIEMIAAAAECAQAAAFhIEoACAAKgAcgA-AEAAMgAaABEACYAG8APwAhIBDAESAJYATQAw4B9gH6ARQAjQBKQC5gF6AMUAbQA3ACdgFDgLzAYMAw0BmYDVwGsgOCAcmA8cCEMELQQuCAAgGQgQMHQKAAKgAcgA-AEAAMgAaABEACYAG8AP0AhgCJAEsAJoAYYA0YB9gH6ARQAiwBIgCUgFzAL0AYoA2gBuAEXgJkATsAocBeYDBgGGgMqAZYAzMBpoDVwHFgOTAeOBC0cAHAAQABcAKACEAF0AMEAZCQgFABMADeARQAlIBcwDFAG0AeOBCgCFpAAGAAgBggEMyUAwABAAHAAPgBEACZAIYAiQB-AFzAMUAi8BeYEISQAMAC4DLAIZlIEAAFQAOQAfACAAGQANAAiABMACkAH6AQwBEgDRgH4AfoBFgCRAEpALmAYoA2gBuAEXgJ2AUOAvMBhoDLAGsgOCAcmA8cCEIELQIZlAAoAFwB9gLoAYIBAwtADAL0AzMB44AAA.f_wAAAAAAAAA'
    }
    let request;

    before(function () {
      storage.removeDataFromLocalStorage('nativendo_id');
      const localStorageData = {
        nativendo_id: '123'
      };

      getDataFromLocalStorageStub.callsFake(function (key) {
        return localStorageData[key];
      });
    });

    after(function () {
      localStorageIsEnabledStub.restore();
      getDataFromLocalStorageStub.restore();
    });

    it('should return an empty array if local storage is not enabled', function () {
      localStorageIsEnabledStub.returns(false);
      getGlobal().bidderSettings = {
        seedingAlliance: {
          storageAllowed: false
        }
      };

      request = JSON.parse(spec.buildRequests(bidRequests, bidderRequest).data);
      expect(request.user.ext.eids).to.be.an('array').that.is.empty;
    });

    it('should return an empty array if local storage is enabled but storageAllowed is false', function () {
      getGlobal().bidderSettings = {
        seedingAlliance: {
          storageAllowed: false
        }
      };
      localStorageIsEnabledStub.returns(true);

      request = JSON.parse(spec.buildRequests(bidRequests, bidderRequest).data);
      expect(request.user.ext.eids).to.be.an('array').that.is.empty;
    });

    it('should return a non empty array if local storage is enabled and storageAllowed is true', function () {
      getGlobal().bidderSettings = {
        seedingAlliance: {
          storageAllowed: true
        }
      };
      localStorageIsEnabledStub.returns(true);

      request = JSON.parse(spec.buildRequests(bidRequests, bidderRequest).data);
      expect(request.user.ext.eids).to.be.an('array').that.is.not.empty;
    });

    it('should return an array containing the nativendoUserEid', function () {
      getGlobal().bidderSettings = {
        seedingAlliance: {
          storageAllowed: true
        }
      };
      localStorageIsEnabledStub.returns(true);

      const nativendoUserEid = { source: 'nativendo.de', uids: [{ id: '123', atype: 1 }] };
      storage.setDataInLocalStorage('nativendo_id', '123');

      request = JSON.parse(spec.buildRequests(bidRequests, bidderRequest).data);

      expect(request.user.ext.eids).to.deep.include(nativendoUserEid);
    });

    it('should append userIdAsEids when present on the bid request', function () {
      getGlobal().bidderSettings = {
        seedingAlliance: { storageAllowed: true }
      };
      localStorageIsEnabledStub.returns(true);

      const userIdEid = { source: 'pubcid.org', uids: [{ id: 'pub-id-1', atype: 1 }] };
      const bidRequestsWithEids = [{
        bidId: 'bidId',
        params: {},
        userIdAsEids: userIdEid
      }];

      request = JSON.parse(spec.buildRequests(bidRequestsWithEids, bidderRequest).data);

      expect(request.user.ext.eids).to.deep.include(userIdEid);
    });

    it('should generate and persist a new nativendo_id when none exists in storage', function () {
      getGlobal().bidderSettings = {
        seedingAlliance: { storageAllowed: true }
      };
      localStorageIsEnabledStub.returns(true);
      window.localStorage.removeItem('nativendo_id');

      try {
        request = JSON.parse(spec.buildRequests(bidRequests, bidderRequest).data);

        const persisted = window.localStorage.getItem('nativendo_id');
        expect(persisted).to.be.a('string').and.not.empty;

        const nativendoEid = request.user.ext.eids.find(e => e.source === 'nativendo.de');
        expect(nativendoEid).to.exist;
        expect(nativendoEid.uids[0].id).to.equal(persisted);
      } finally {
        window.localStorage.removeItem('nativendo_id');
      }
    });
  });

  describe('interpretResponse', function () {
    const goodNativeResponse = {
      body: {
        cur: 'EUR',
        id: 'bidid1',
        seatbid: [
          {
            seat: 'seedingAlliance',
            bid: [{
              adm: JSON.stringify({
                native: {
                  assets: [
                    { id: 0, title: { text: 'this is a title' } },
                    { id: 1, img: { url: 'https://domain.for/img.jpg' } },
                  ],
                  imptrackers: ['https://domain.for/imp/tracker?price=${AUCTION_PRICE}'],
                  link: {
                    clicktrackers: ['https://domain.for/imp/tracker?price=${AUCTION_PRICE}'],
                    url: 'https://domain.for/ad/'
                  }
                }
              }),
              impid: 1,
              price: 0.55
            }]
          }
        ]
      }
    };

    const goodBannerResponse = {
      body: {
        cur: 'EUR',
        id: 'bidid1',
        seatbid: [
          {
            seat: 'seedingAlliance',
            bid: [{
              adm: '<iframe src="https://domain.tld/cds/delivery?wp=0.90"></iframe>',
              impid: 1,
              price: 0.90,
              h: 250,
              w: 300
            }]
          }
        ]
      }
    };

    const badResponse = {
      body: {
        cur: 'EUR',
        id: 'bidid1',
        seatbid: []
      }
    };

    const bidNativeRequest = {
      data: {},
      bidRequests: [{ bidId: '1', nativeParams: { title: { required: true, len: 800 }, image: { required: true, sizes: [300, 250] } } }]
    };

    const bidBannerRequest = {
      data: {},
      bidRequests: [{ bidId: '1', sizes: [300, 250] }]
    };

    it('should return null if body is missing or empty', function () {
      const result = spec.interpretResponse(badResponse, bidNativeRequest);
      assert.equal(result.length, 0);

      delete badResponse.body

      const result1 = spec.interpretResponse(badResponse, bidNativeRequest);
      assert.equal(result.length, 0);
    });

    it('should return the correct params', function () {
      const resultNative = spec.interpretResponse(goodNativeResponse, bidNativeRequest);
      const bidNative = goodNativeResponse.body.seatbid[0].bid[0];

      assert.deepEqual(resultNative[0].currency, goodNativeResponse.body.cur);
      assert.deepEqual(resultNative[0].requestId, bidNativeRequest.bidRequests[0].bidId);
      assert.deepEqual(resultNative[0].cpm, bidNative.price);
      assert.deepEqual(resultNative[0].creativeId, bidNative.crid);
      assert.deepEqual(resultNative[0].mediaType, 'native');

      const resultBanner = spec.interpretResponse(goodBannerResponse, bidBannerRequest);

      assert.deepEqual(resultBanner[0].mediaType, 'banner');
      assert.deepEqual(resultBanner[0].width, bidBannerRequest.bidRequests[0].sizes[0]);
      assert.deepEqual(resultBanner[0].height, bidBannerRequest.bidRequests[0].sizes[1]);
    });

    it('should return the correct native tracking links', function () {
      const result = spec.interpretResponse(goodNativeResponse, bidNativeRequest);
      const bid = goodNativeResponse.body.seatbid[0].bid[0];
      const regExpPrice = new RegExp('price=' + bid.price);

      result[0].native.clickTrackers.forEach(function (clickTracker) {
        assert.ok(clickTracker.search(regExpPrice) > -1);
      });

      result[0].native.impressionTrackers.forEach(function (impTracker) {
        assert.ok(impTracker.search(regExpPrice) > -1);
      });
    });

    it('should return the correct banner content', function () {
      const result = spec.interpretResponse(goodBannerResponse, bidBannerRequest);
      const bid = goodBannerResponse.body.seatbid[0].bid[0];
      const regExpContent = new RegExp('<iframe.+?' + bid.price + '.+?</iframe>');

      assert.ok(result[0].ad.search(regExpContent) > -1);
    });

    it('should return an empty array when seatbid is undefined', function () {
      const result = spec.interpretResponse({ body: { cur: 'EUR', id: 'bidid1' } }, bidNativeRequest);
      assert.equal(result.length, 0);
    });

    it('should accept adm provided as an object', function () {
      const objectAdmResponse = {
        body: {
          cur: 'EUR',
          seatbid: [{
            seat: 'seedingAlliance',
            bid: [{
              adm: {
                native: {
                  link: { url: 'https://domain.for/ad/' }
                }
              },
              impid: 1,
              price: 0.55
            }]
          }]
        }
      };
      const result = spec.interpretResponse(objectAdmResponse, bidNativeRequest);

      expect(result[0].native.clickUrl).to.equal('https://domain.for/ad/');
    });

    it('should leave native undefined when adm string is not valid JSON', function () {
      const invalidJsonResponse = {
        body: {
          cur: 'EUR',
          seatbid: [{
            seat: 'seedingAlliance',
            bid: [{
              adm: 'not-json',
              impid: 1,
              price: 0.55
            }]
          }]
        }
      };
      const result = spec.interpretResponse(invalidJsonResponse, bidNativeRequest);

      expect(result).to.have.length(1);
      expect(result[0].native).to.be.undefined;
    });

    it('should replace AUCTION_PRICE in native eventtrackers', function () {
      const eventTrackerResponse = {
        body: {
          cur: 'EUR',
          seatbid: [{
            seat: 'seedingAlliance',
            bid: [{
              adm: JSON.stringify({
                native: {
                  link: { url: 'https://domain.for/ad/' },
                  eventtrackers: [
                    { event: 1, method: 1, url: 'https://domain.for/event?price=${AUCTION_PRICE}' }
                  ]
                }
              }),
              impid: 1,
              price: 1.23
            }]
          }]
        }
      };
      const result = spec.interpretResponse(eventTrackerResponse, bidNativeRequest);

      expect(result[0].native.ortb.eventtrackers[0].url).to.equal('https://domain.for/event?price=1.23');
    });

    it('should default meta.advertiserDomains to an empty array when adomain is missing', function () {
      const result = spec.interpretResponse(goodNativeResponse, bidNativeRequest);

      expect(result[0].meta.advertiserDomains).to.deep.equal([]);
    });

    it('should populate meta.advertiserDomains from adomain', function () {
      const responseWithAdomain = {
        body: {
          cur: 'EUR',
          seatbid: [{
            seat: 'seedingAlliance',
            bid: [{
              adm: JSON.stringify({ native: { link: { url: 'https://domain.for/ad/' } } }),
              impid: 1,
              price: 0.55,
              adomain: ['example.com']
            }]
          }]
        }
      };
      const result = spec.interpretResponse(responseWithAdomain, bidNativeRequest);

      expect(result[0].meta.advertiserDomains).to.deep.equal(['example.com']);
    });

    it('should replace AUCTION_PRICE macro in banner ad', function () {
      const bannerWithMacro = {
        body: {
          cur: 'EUR',
          seatbid: [{
            seat: 'seedingAlliance',
            bid: [{
              adm: '<iframe src="https://domain.tld/cds/delivery?wp=${AUCTION_PRICE}"></iframe>',
              impid: 1,
              price: 1.5,
              h: 250,
              w: 300
            }]
          }]
        }
      };
      const result = spec.interpretResponse(bannerWithMacro, bidBannerRequest);

      expect(result[0].ad).to.contain('wp=1.5');
      expect(result[0].ad).to.not.contain('${AUCTION_PRICE}');
    });

    it('should filter out bid requests without a matching seatbid response', function () {
      const noMatchResponse = {
        body: {
          cur: 'EUR',
          seatbid: [{
            seat: 'seedingAlliance',
            bid: [{
              adm: JSON.stringify({ native: { link: { url: 'https://x' } } }),
              impid: 999,
              price: 0.5
            }]
          }]
        }
      };
      const result = spec.interpretResponse(noMatchResponse, bidNativeRequest);

      expect(result).to.have.length(0);
    });
  });
});
