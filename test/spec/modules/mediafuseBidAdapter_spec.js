import { expect } from 'chai';
import { spec } from 'modules/mediafuseBidAdapter.js';
import { BANNER, VIDEO, NATIVE, ADPOD } from '../../../src/mediaTypes.js';
import { deepClone } from '../../../src/utils.js';
import { config } from '../../../src/config.js';
import * as utils from '../../../src/utils.js';
import sinon from 'sinon';

const ENDPOINT_URL_NORMAL = 'https://ib.adnxs.com/openrtb2/prebidjs';

describe('mediafuseBidAdapter', function () {
  const baseBidRequests = {
    bidder: 'mediafuse',
    adUnitCode: 'adunit-code',
    bidId: '2c5f3044f546f1',
    params: {
      placementId: 12345
    }
  };

  const baseBidderRequest = {
    auctionId: 'test-auction-id',
    ortb2: {
      site: {
        page: 'http://www.example.com/page.html',
        domain: 'example.com'
      },
      user: {}
    },
    refererInfo: {
      reachedTop: true,
      numIframes: 0,
      stack: ['http://example.com/page.html'],
      topmostLocation: 'http://example.com/page.html'
    },
    bids: [baseBidRequests]
  };

  describe('isBidRequestValid', function () {
    it('should return true when required params are present (placementId)', function () {
      const bid = {
        bidder: 'mediafuse',
        params: {
          placementId: 12345
        }
      };
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });

    it('should return true when snake_case params are present (placement_id)', function () {
      const bid = {
        bidder: 'mediafuse',
        params: {
          placement_id: 12345
        }
      };
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });

    it('should return true when member and invCode are present', function () {
      const bid = {
        bidder: 'mediafuse',
        params: {
          member: 123,
          invCode: 'abc'
        }
      };
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });

    it('should return false when required params are not present', function () {
      const bid = {
        bidder: 'mediafuse',
        params: {
          member: 123
        }
      };
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });
  });

  describe('buildRequests', function () {
    it('should build a basic banner request', function () {
      const bidRequests = [deepClone(baseBidRequests)];
      bidRequests[0].mediaTypes = {
        banner: {
          sizes: [[300, 250]]
        }
      };
      const bidderRequest = deepClone(baseBidderRequest);
      bidderRequest.bids = bidRequests;

      const requestArr = spec.buildRequests(bidRequests, bidderRequest);
      expect(requestArr).to.have.lengthOf(1);
      const request = requestArr[0];
      expect(request.method).to.equal('POST');
      expect(request.url).to.contain(ENDPOINT_URL_NORMAL);
      const data = request.data;
      expect(data.imp[0].banner).to.exist;
      expect(data.imp[0].ext.appnexus.placement_id).to.equal(12345);
    });

    it('should handle floor mapping from bid.getFloor', function () {
      const bidRequests = [deepClone(baseBidRequests)];
      bidRequests[0].getFloor = () => {
        return {
          currency: 'USD',
          floor: 1.23
        };
      };
      bidRequests[0].mediaTypes = { banner: { sizes: [[300, 250]] } };
      const bidderRequest = deepClone(baseBidderRequest);
      bidderRequest.bids = bidRequests;

      const request = spec.buildRequests(bidRequests, bidderRequest)[0];
      expect(request.data.imp[0].bidfloor).to.equal(1.23);
    });

    it('should handle floor mapping from bid.params.reserve', function () {
      const bidRequests = [deepClone(baseBidRequests)];
      bidRequests[0].params.reserve = 0.50;
      bidRequests[0].mediaTypes = { banner: { sizes: [[300, 250]] } };
      const bidderRequest = deepClone(baseBidderRequest);
      bidderRequest.bids = bidRequests;

      const request = spec.buildRequests(bidRequests, bidderRequest)[0];
      expect(request.data.imp[0].bidfloor).to.equal(0.50);
    });

    it('should handle keywords mapping', function () {
      const bidRequests = [deepClone(baseBidRequests)];
      bidRequests[0].params.keywords = {
        'hb_pb': ['1.00'],
        'test_kw': 'test_val'
      };
      bidRequests[0].mediaTypes = { banner: { sizes: [[300, 250]] } };
      const bidderRequest = deepClone(baseBidderRequest);
      bidderRequest.bids = bidRequests;

      const request = spec.buildRequests(bidRequests, bidderRequest)[0];
      const keywords = request.data.imp[0].ext.appnexus.keywords;
      expect(keywords).to.contain('hb_pb=1.00');
      expect(keywords).to.contain('test_kw=test_val');
    });

    it('should handle GDPR consent', function () {
      const bidRequests = [deepClone(baseBidRequests)];
      const bidderRequest = deepClone(baseBidderRequest);
      bidderRequest.gdprConsent = {
        gdprApplies: true,
        consentString: 'test-consent',
        addtlConsent: '1~12.34.56'
      };

      const request = spec.buildRequests(bidRequests, bidderRequest)[0];
      expect(request.data.regs.ext.gdpr).to.equal(1);
      expect(request.data.user.ext.consent).to.equal('test-consent');
      expect(request.data.user.ext.addtl_consent).to.deep.equal([12, 34, 56]);
    });

    it('should handle GPP consent', function () {
      const bidRequests = [deepClone(baseBidRequests)];
      const bidderRequest = deepClone(baseBidderRequest);
      bidderRequest.gppConsent = {
        gppString: 'test-gpp-string',
        applicableSections: [7]
      };

      const request = spec.buildRequests(bidRequests, bidderRequest)[0];
      expect(request.data.regs.gpp).to.equal('test-gpp-string');
      expect(request.data.regs.gpp_sid).to.deep.equal([7]);
    });

    it('should handle force creative override', function () {
      const bidRequests = [deepClone(baseBidRequests)];
      const bidderRequest = deepClone(baseBidderRequest);

      const stub = sinon.stub(utils, 'getParameterByName');
      stub.withArgs('ast_override_div').returns('adunit-code:98765');

      const request = spec.buildRequests(bidRequests, bidderRequest)[0];
      expect(request.data.imp[0].ext.appnexus.force_creative_id).to.equal(98765);
      stub.restore();
    });

    it('should add member_id to URL if member param is present', function () {
      const bidRequests = [deepClone(baseBidRequests)];
      bidRequests[0].params.member = 999;
      const bidderRequest = deepClone(baseBidderRequest);
      bidderRequest.bids = bidRequests;

      const request = spec.buildRequests(bidRequests, bidderRequest)[0];
      expect(request.url).to.contain('member_id=999');
    });

    it('should handle AdPod duplication', function () {
      const bidRequests = [{
        bidder: 'mediafuse',
        adUnitCode: 'adpod-unit',
        mediaTypes: {
          video: {
            context: ADPOD,
            adPodDurationSec: 30,
            durationRangeSec: [15]
          }
        },
        params: { placementId: 111 }
      }];
      const bidderRequest = deepClone(baseBidderRequest);
      bidderRequest.bids = bidRequests;

      const requests = spec.buildRequests(bidRequests, bidderRequest);
      // 30 / 15 = 2 placements
      expect(requests).to.have.lengthOf(1);
      expect(requests[0].data.imp).to.have.lengthOf(2);
    });

    it('should chunk requests with more than 15 imps', function () {
      const bidRequests = [];
      for (let i = 0; i < 20; i++) {
        bidRequests.push({
          bidder: 'mediafuse',
          adUnitCode: `unit-${i}`,
          params: { placementId: 1000 + i },
          mediaTypes: { banner: { sizes: [[300, 250]] } }
        });
      }
      const bidderRequest = deepClone(baseBidderRequest);
      bidderRequest.bids = bidRequests;

      const requests = spec.buildRequests(bidRequests, bidderRequest);
      expect(requests).to.have.lengthOf(2);
      expect(requests[0].data.imp).to.have.lengthOf(15);
      expect(requests[1].data.imp).to.have.lengthOf(5);
    });

    it('should add X-Is-Test header when apn_test is true', function () {
      const bidRequests = [deepClone(baseBidRequests)];
      const bidderRequest = deepClone(baseBidderRequest);
      sinon.stub(config, 'getConfig').withArgs('apn_test').returns(true);

      const requests = spec.buildRequests(bidRequests, bidderRequest);
      expect(requests[0].options.customHeaders['X-Is-Test']).to.equal(1);
      config.getConfig.restore();
    });
  });

  describe('interpretResponse', function () {
    it('should handle banner response', function () {
      const bidRequests = [deepClone(baseBidRequests)];
      bidRequests[0].mediaTypes = { banner: { sizes: [[300, 250]] } };
      const bidderRequest = deepClone(baseBidderRequest);
      const request = spec.buildRequests(bidRequests, bidderRequest)[0];

      const serverResponse = {
        body: {
          id: 'test-id',
          cur: 'USD',
          seatbid: [{
            seat: 'mediafuse',
            bid: [{
              impid: request.data.imp[0].id,
              price: 1.5,
              adm: '<html>BANNER AD</html>',
              w: 300,
              h: 250,
              ext: {
                appnexus: {
                  bid_ad_type: 0,
                  advertiser_id: 99,
                  brand_id: 88,
                  buyer_member_id: 77,
                  deal_code: 'abc',
                  deal_priority: 10
                }
              }
            }]
          }]
        }
      };

      const bids = spec.interpretResponse(serverResponse, request);
      expect(bids).to.have.lengthOf(1);
      expect(bids[0].cpm).to.equal(1.5);
      expect(bids[0].ad).to.equal('<html>BANNER AD</html>');
      expect(bids[0].meta.advertiserId).to.equal(99);
      expect(bids[0].mediafuse.buyerMemberId).to.equal(77);
      expect(bids[0].mediafuse.dealCode).to.equal('abc');
    });

    it('should handle in-line trackers in banner response', function () {
      const bidRequests = [deepClone(baseBidRequests)];
      bidRequests[0].mediaTypes = { banner: { sizes: [[300, 250]] } };
      const bidderRequest = deepClone(baseBidderRequest);
      const request = spec.buildRequests(bidRequests, bidderRequest)[0];

      const serverResponse = {
        body: {
          id: 'test-id',
          cur: 'USD',
          seatbid: [{
            seat: 'mediafuse',
            bid: [{
              impid: request.data.imp[0].id,
              price: 1.5,
              adm: '<div>AD</div>',
              ext: {
                appnexus: {
                  bid_ad_type: 0,
                  trackers: [{ impression_urls: ['http://track.me/pixel'] }]
                }
              }
            }]
          }]
        }
      };

      const bids = spec.interpretResponse(serverResponse, request);
      expect(bids).to.have.lengthOf(1);
      expect(bids[0].ad).to.contain('http://track.me/pixel');
    });

    it('should disarm native viewability trackers', function () {
      const bidRequests = [deepClone(baseBidRequests)];
      bidRequests[0].mediaTypes = { native: { title: { required: true } } };
      const bidderRequest = deepClone(baseBidderRequest);
      const request = spec.buildRequests(bidRequests, bidderRequest)[0];

      const serverResponse = {
        body: {
          seatbid: [{
            bid: [{
              impid: request.data.imp[0].id,
              price: 1.5,
              adm: JSON.stringify({ native: { title: 'Native ad' } }),
              ext: {
                appnexus: {
                  bid_ad_type: 3,
                  viewability: { config: '<script src="https://cdn.adnxs.com/v/trk.js?id=123"></script>' }
                }
              }
            }]
          }]
        }
      };

      const bids = spec.interpretResponse(serverResponse, request);
      expect(bids[0].native.javascriptTrackers[0]).to.contain('data-src=');
      expect(bids[0].native.javascriptTrackers[0]).to.not.contain('src=https');
    });
  });

  describe('spec properties', function () {
    it('should have alwaysHasCapacity set to true', function () {
      expect(spec.alwaysHasCapacity).to.equal(true);
    });

    it('should have aliases defined', function () {
      expect(spec.aliases).to.be.an('array').with.lengthOf(1);
      expect(spec.aliases[0].code).to.equal('mediafuseBidAdapter');
    });
  });

  describe('getUserSyncs', function () {
    it('should return user sync if iframe enabled and purpose 1 consent', function () {
      const syncOptions = { iframeEnabled: true };
      const gdprConsent = { gdprApplies: true, consentString: 'test', vendorData: { purpose: { consents: { 1: true } } } };
      const syncs = spec.getUserSyncs(syncOptions, [], gdprConsent);
      expect(syncs).to.have.lengthOf(1);
      expect(syncs[0].type).to.equal('iframe');
      expect(syncs[0].url).to.contain('https://acdn.adnxs.com/dmp/async_usersync.html');
      expect(syncs[0].url).to.contain('gdpr=1');
      expect(syncs[0].url).to.contain('gdpr_consent=test');
    });

    it('should return pixel sync if enabled and present in response', function () {
      const syncOptions = { pixelEnabled: true };
      const serverResponses = [{
        body: {
          ext: {
            appnexus: {
              userSync: { url: 'http://sync.me/pixel' }
            }
          }
        }
      }];
      const gdprConsent = { gdprApplies: false, consentString: 'test' };
      const syncs = spec.getUserSyncs(syncOptions, serverResponses, gdprConsent);
      expect(syncs).to.have.lengthOf(1);
      expect(syncs[0].type).to.equal('image');
      expect(syncs[0].url).to.equal('http://sync.me/pixel&gdpr=0&gdpr_consent=test');
    });

    it('should return empty sync if nothing enabled', function () {
      const syncOptions = { iframeEnabled: false, pixelEnabled: false };
      const syncs = spec.getUserSyncs(syncOptions, [], {});
      expect(syncs).to.have.lengthOf(0);
    });
  });

  describe('lifecycle methods', function () {
    it('should have onTimeout', function () {
      expect(spec.onTimeout).to.be.a('function');
    });

    it('should have onSetTargeting', function () {
      expect(spec.onSetTargeting).to.be.a('function');
    });

    it('should have onBidderError', function () {
      expect(spec.onBidderError).to.be.a('function');
    });

    it('should have onAdRenderSucceeded', function () {
      expect(spec.onAdRenderSucceeded).to.be.a('function');
    });
  });
});
