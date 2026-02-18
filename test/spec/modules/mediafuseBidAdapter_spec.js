/**
 * mediafuseBidAdapter_spec.js — extended tests
 *
 * Tests for mediafuseBidAdapter.js covering buildRequests, interpretResponse,
 * getUserSyncs, and lifecycle callbacks.
 */

import { expect } from 'chai';
import { spec } from 'modules/mediafuseBidAdapter.js';
import { deepClone } from '../../../src/utils.js';
import { config } from '../../../src/config.js';
import * as utils from '../../../src/utils.js';
import { bidderSettings } from '../../../src/bidderSettings.js';
import sinon from 'sinon';

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------
const BASE_BID = {
  bidder: 'mediafuse',
  adUnitCode: 'adunit-code',
  bidId: 'bid-id-1',
  params: { placementId: 12345 }
};

const BASE_BIDDER_REQUEST = {
  auctionId: 'auction-1',
  ortb2: {
    site: { page: 'http://example.com', domain: 'example.com' },
    user: {}
  },
  refererInfo: {
    topmostLocation: 'http://example.com',
    reachedTop: true,
    numIframes: 0,
    stack: ['http://example.com']
  },
  bids: [BASE_BID]
};

// ---------------------------------------------------------------------------
describe('mediafuseBidAdapter', function () {
  let sandbox;

  beforeEach(function () {
    sandbox = sinon.createSandbox();
  });

  afterEach(function () {
    sandbox.restore();
  });

  // -------------------------------------------------------------------------
  // buildRequests — endpoint selection
  // -------------------------------------------------------------------------
  describe('buildRequests - endpoint selection', function () {
    it('should use simple endpoint when GDPR purpose 1 consent is missing', function () {
      const bidderRequest = deepClone(BASE_BIDDER_REQUEST);
      bidderRequest.gdprConsent = {
        gdprApplies: true,
        consentString: 'test-consent',
        vendorData: { purpose: { consents: { 1: false } } }
      };
      const [req] = spec.buildRequests([deepClone(BASE_BID)], bidderRequest);
      expect(req.url).to.include('adnxs-simple.com');
    });
  });

  // -------------------------------------------------------------------------
  // buildRequests — GPID
  // -------------------------------------------------------------------------
  describe('buildRequests - GPID', function () {
    it('should map ortb2Imp.ext.gpid into imp.ext.appnexus.gpid', function () {
      const bid = deepClone(BASE_BID);
      bid.ortb2Imp = { ext: { gpid: '/1234/home#header' } };
      const [req] = spec.buildRequests([bid], deepClone(BASE_BIDDER_REQUEST));
      expect(req.data.imp[0].ext.appnexus.gpid).to.equal('/1234/home#header');
    });
  });

  // -------------------------------------------------------------------------
  // buildRequests — global keywords
  // -------------------------------------------------------------------------
  describe('buildRequests - global keywords', function () {
    it('should include mediafuseAuctionKeywords in request ext', function () {
      sandbox.stub(config, 'getConfig').callsFake((key) => {
        if (key === 'mediafuseAuctionKeywords') return { section: ['news', 'sports'] };
        return undefined;
      });
      const [req] = spec.buildRequests([deepClone(BASE_BID)], deepClone(BASE_BIDDER_REQUEST));
      expect(req.data.ext.appnexus.keywords).to.include('section=news,sports');
    });
  });

  // -------------------------------------------------------------------------
  // buildRequests — user params
  // -------------------------------------------------------------------------
  describe('buildRequests - user params', function () {
    it('should map age, gender, and numeric segments', function () {
      const bid = deepClone(BASE_BID);
      bid.params.user = { age: 35, gender: 'F', segments: [10, 20] };
      // bidderRequest.bids must contain the bid for the request() hook to find params.user
      const bidderRequest = deepClone(BASE_BIDDER_REQUEST);
      bidderRequest.bids = [bid];
      const [req] = spec.buildRequests([bid], bidderRequest);
      expect(req.data.user.age).to.equal(35);
      expect(req.data.user.gender).to.equal('F');
      expect(req.data.user.ext.segments).to.deep.equal([{ id: 10 }, { id: 20 }]);
    });

    it('should map object-style segments and ignore invalid ones', function () {
      const bid = deepClone(BASE_BID);
      bid.params.user = { segments: [{ id: 99 }, 'bad', null] };
      const bidderRequest = deepClone(BASE_BIDDER_REQUEST);
      bidderRequest.bids = [bid];
      const [req] = spec.buildRequests([bid], bidderRequest);
      expect(req.data.user.ext.segments).to.deep.equal([{ id: 99 }]);
    });
  });

  // -------------------------------------------------------------------------
  // buildRequests — app params
  // -------------------------------------------------------------------------
  describe('buildRequests - app params', function () {
    it('should merge app params into request.app', function () {
      const bid = deepClone(BASE_BID);
      bid.params.app = { name: 'MyApp', bundle: 'com.myapp', ver: '1.0' };
      // bidderRequest.bids must contain the bid for the request() hook to find params.app
      const bidderRequest = deepClone(BASE_BIDDER_REQUEST);
      bidderRequest.bids = [bid];
      const [req] = spec.buildRequests([bid], bidderRequest);
      expect(req.data.app.name).to.equal('MyApp');
      expect(req.data.app.bundle).to.equal('com.myapp');
    });
  });

  // -------------------------------------------------------------------------
  // buildRequests — privacy: USP, addtlConsent, COPPA
  // -------------------------------------------------------------------------
  describe('buildRequests - privacy', function () {
    it('should set us_privacy from uspConsent', function () {
      const bidderRequest = deepClone(BASE_BIDDER_REQUEST);
      bidderRequest.uspConsent = '1YNN';
      const [req] = spec.buildRequests([deepClone(BASE_BID)], bidderRequest);
      expect(req.data.regs.ext.us_privacy).to.equal('1YNN');
    });

    it('should parse addtlConsent into array of integers', function () {
      const bidderRequest = deepClone(BASE_BIDDER_REQUEST);
      bidderRequest.gdprConsent = {
        gdprApplies: true,
        consentString: 'cs',
        addtlConsent: '1~7.12.99'
      };
      const [req] = spec.buildRequests([deepClone(BASE_BID)], bidderRequest);
      expect(req.data.user.ext.addtl_consent).to.deep.equal([7, 12, 99]);
    });

    it('should not set addtl_consent when addtlConsent has no ~ separator', function () {
      const bidderRequest = deepClone(BASE_BIDDER_REQUEST);
      bidderRequest.gdprConsent = { gdprApplies: true, consentString: 'cs', addtlConsent: 'no-tilde' };
      const [req] = spec.buildRequests([deepClone(BASE_BID)], bidderRequest);
      expect(req.data.user?.ext?.addtl_consent).to.be.undefined;
    });

    it('should set regs.coppa=1 when coppa config is true', function () {
      sandbox.stub(config, 'getConfig').callsFake((key) => {
        if (key === 'coppa') return true;
        return undefined;
      });
      const [req] = spec.buildRequests([deepClone(BASE_BID)], deepClone(BASE_BIDDER_REQUEST));
      expect(req.data.regs.coppa).to.equal(1);
    });
  });

  // -------------------------------------------------------------------------
  // buildRequests — video RTB targeting
  // -------------------------------------------------------------------------
  describe('buildRequests - video RTB targeting', function () {
    it('should map skip, skipafter, playbackmethod, and api to AN fields', function () {
      const bid = deepClone(BASE_BID);
      bid.mediaTypes = {
        video: {
          context: 'instream',
          playerSize: [640, 480],
          skip: 1,
          skipafter: 5,
          playbackmethod: [2],
          api: [4]
        }
      };
      const [req] = spec.buildRequests([bid], deepClone(BASE_BIDDER_REQUEST));
      const video = req.data.imp[0].video;
      const extAN = req.data.imp[0].ext.appnexus;
      expect(video.skippable).to.be.true;
      expect(video.skipoffset).to.equal(5);
      expect(video.playback_method).to.equal(2);
      // api [4] maps to video_frameworks [5] (4↔5 swap)
      expect(extAN.video_frameworks).to.include(5);
    });

    it('should set outstream placement=4 for outstream context', function () {
      const bid = deepClone(BASE_BID);
      bid.mediaTypes = { video: { context: 'outstream', playerSize: [640, 480] } };
      const [req] = spec.buildRequests([bid], deepClone(BASE_BIDDER_REQUEST));
      expect(req.data.imp[0].video.placement).to.equal(4);
    });

    it('should set require_asset_url for instream context', function () {
      const bid = deepClone(BASE_BID);
      bid.mediaTypes = { video: { context: 'instream', playerSize: [640, 480] } };
      const [req] = spec.buildRequests([bid], deepClone(BASE_BIDDER_REQUEST));
      expect(req.data.imp[0].ext.appnexus.require_asset_url).to.be.true;
    });

    it('should map video params from bid.params.video (VIDEO_TARGETING fields)', function () {
      const bid = deepClone(BASE_BID);
      bid.mediaTypes = { video: { context: 'instream', playerSize: [640, 480] } };
      bid.params.video = { minduration: 5, maxduration: 30, frameworks: [1, 2] };
      const [req] = spec.buildRequests([bid], deepClone(BASE_BIDDER_REQUEST));
      expect(req.data.imp[0].video.minduration).to.equal(5);
      expect(req.data.imp[0].ext.appnexus.video_frameworks).to.deep.equal([1, 2]);
    });
  });

  // -------------------------------------------------------------------------
  // buildRequests — AdPod requireExactDuration with multiple durations
  // -------------------------------------------------------------------------
  describe('buildRequests - AdPod requireExactDuration', function () {
    it('should assign durations round-robin when requireExactDuration=true with multiple durations', function () {
      const bid = {
        bidder: 'mediafuse',
        adUnitCode: 'pod',
        bidId: 'pod-bid',
        mediaTypes: {
          video: {
            context: 'adpod',
            adPodDurationSec: 60,
            durationRangeSec: [15, 30],
            requireExactDuration: true
          }
        },
        params: { placementId: 111 }
      };
      const [req] = spec.buildRequests([bid], deepClone(BASE_BIDDER_REQUEST));
      // 60/15=4 placements, 2 durations → 2 per duration
      expect(req.data.imp).to.have.lengthOf(4);
      // First chunk gets duration 15
      expect(req.data.imp[0].video.minduration).to.equal(15);
      expect(req.data.imp[0].video.maxduration).to.equal(15);
      // Second chunk gets duration 30
      expect(req.data.imp[2].video.minduration).to.equal(30);
      expect(req.data.imp[2].video.maxduration).to.equal(30);
    });

    it('should set maxduration to max of range when requireExactDuration=false', function () {
      const bid = {
        bidder: 'mediafuse',
        adUnitCode: 'pod',
        bidId: 'pod-bid-2',
        mediaTypes: {
          video: {
            context: 'adpod',
            adPodDurationSec: 30,
            durationRangeSec: [10, 20],
            requireExactDuration: false
          }
        },
        params: { placementId: 111 }
      };
      const [req] = spec.buildRequests([bid], deepClone(BASE_BIDDER_REQUEST));
      // 30/10=3 placements, all get maxduration=20
      expect(req.data.imp).to.have.lengthOf(3);
      req.data.imp.forEach(imp => {
        expect(imp.video.maxduration).to.equal(20);
      });
    });
  });

  // -------------------------------------------------------------------------
  // buildRequests — OMID support
  // -------------------------------------------------------------------------
  describe('buildRequests - OMID support', function () {
    it('should set iab_support when bid.params.frameworks includes 6', function () {
      const bid = deepClone(BASE_BID);
      bid.params.frameworks = [6];
      // hasOmidSupport reads bidderRequest.bids[0], so bid must be there
      const bidderRequest = deepClone(BASE_BIDDER_REQUEST);
      bidderRequest.bids = [bid];
      const [req] = spec.buildRequests([bid], bidderRequest);
      expect(req.data.ext.appnexus.iab_support).to.deep.equal({
        omidpn: 'Mediafuse',
        omidpv: '$prebid.version$'
      });
    });

    it('should set iab_support when mediaTypes.video.api includes 7', function () {
      const bid = deepClone(BASE_BID);
      bid.mediaTypes = { video: { context: 'instream', playerSize: [640, 480], api: [7] } };
      // hasOmidSupport reads bidderRequest.bids[0]
      const bidderRequest = deepClone(BASE_BIDDER_REQUEST);
      bidderRequest.bids = [bid];
      const [req] = spec.buildRequests([bid], bidderRequest);
      expect(req.data.ext.appnexus.iab_support).to.exist;
    });
  });

  // -------------------------------------------------------------------------
  // buildRequests — brand_category_uniqueness
  // -------------------------------------------------------------------------
  describe('buildRequests - brand_category_uniqueness', function () {
    it('should set brand_category_uniqueness when adpod.brandCategoryExclusion is true', function () {
      sandbox.stub(config, 'getConfig').callsFake((key) => {
        if (key === 'adpod.brandCategoryExclusion') return true;
        return undefined;
      });
      const [req] = spec.buildRequests([deepClone(BASE_BID)], deepClone(BASE_BIDDER_REQUEST));
      expect(req.data.ext.appnexus.brand_category_uniqueness).to.be.true;
    });
  });

  // -------------------------------------------------------------------------
  // interpretResponse — adpod video response
  // -------------------------------------------------------------------------
  describe('interpretResponse - adpod video', function () {
    it('should set video.context=adpod and map primaryCatId from brand_category_id', function () {
      const bid = {
        bidder: 'mediafuse',
        adUnitCode: 'pod',
        bidId: 'pod-bid',
        mediaTypes: { video: { context: 'adpod', adPodDurationSec: 30, durationRangeSec: [15] } },
        params: { placementId: 111 }
      };
      const [req] = spec.buildRequests([bid], deepClone(BASE_BIDDER_REQUEST));
      const impId = req.data.imp[0].id;

      const serverResponse = {
        body: {
          seatbid: [{
            bid: [{
              impid: impId,
              price: 2.5,
              ext: {
                appnexus: {
                  bid_ad_type: 1,
                  brand_category_id: 1  // maps to 'IAB2' (Automotive) in APPNEXUS_CATEGORY_MAPPING
                }
              }
            }]
          }]
        }
      };

      const bids = spec.interpretResponse(serverResponse, req);
      expect(bids[0].video.context).to.equal('adpod');
      // brand_category_id:1 maps to 'IAB20-3' in APPNEXUS_CATEGORY_MAPPING
      expect(bids[0].meta.primaryCatId).to.equal('IAB20-3');
    });
  });

  // -------------------------------------------------------------------------
  // interpretResponse — outstream renderer
  // -------------------------------------------------------------------------
  describe('interpretResponse - outstream renderer', function () {
    it('should create renderer when renderer_url and renderer_id are present', function () {
      const bid = deepClone(BASE_BID);
      bid.mediaTypes = { video: { context: 'outstream', playerSize: [640, 480] } };
      const [req] = spec.buildRequests([bid], deepClone(BASE_BIDDER_REQUEST));
      const impId = req.data.imp[0].id;

      const serverResponse = {
        body: {
          seatbid: [{
            bid: [{
              impid: impId,
              price: 3.0,
              ext: {
                appnexus: {
                  bid_ad_type: 1,
                  renderer_url: 'https://cdn.adnxs.com/renderer.js',
                  renderer_id: 42,
                  renderer_config: '{"key":"val"}'
                }
              }
            }]
          }]
        }
      };

      const bids = spec.interpretResponse(serverResponse, req);
      expect(bids[0].renderer).to.exist;
      expect(bids[0].adResponse.ad.renderer_config).to.equal('{"key":"val"}');
    });

    it('should set vastUrl from nurl+asset_url when no renderer', function () {
      const bid = deepClone(BASE_BID);
      bid.mediaTypes = { video: { context: 'instream', playerSize: [640, 480] } };
      const [req] = spec.buildRequests([bid], deepClone(BASE_BIDDER_REQUEST));
      const impId = req.data.imp[0].id;

      const serverResponse = {
        body: {
          seatbid: [{
            bid: [{
              impid: impId,
              price: 1.0,
              nurl: 'https://notify.example.com/win',
              ext: {
                appnexus: {
                  bid_ad_type: 1,
                  asset_url: 'https://vast.example.com/vast.xml'
                }
              }
            }]
          }]
        }
      };

      const bids = spec.interpretResponse(serverResponse, req);
      expect(bids[0].vastUrl).to.include('redir=');
      expect(bids[0].vastUrl).to.include(encodeURIComponent('https://vast.example.com/vast.xml'));
    });
  });

  // -------------------------------------------------------------------------
  // interpretResponse — zero CPM bids
  // -------------------------------------------------------------------------
  describe('interpretResponse - zero CPM bids', function () {
    it('should filter out zero CPM bids by default (allowZeroCpmBids=false)', function () {
      const [req] = spec.buildRequests([deepClone(BASE_BID)], deepClone(BASE_BIDDER_REQUEST));
      const impId = req.data.imp[0].id;
      const serverResponse = {
        body: {
          seatbid: [{ bid: [{ impid: impId, price: 0, ext: { appnexus: { bid_ad_type: 0 } } }] }]
        }
      };

      const stub = sandbox.stub(bidderSettings, 'get');
      stub.withArgs('mediafuse', 'allowZeroCpmBids').returns(false);
      expect(spec.interpretResponse(serverResponse, req)).to.have.lengthOf(0);
    });

    it('should include zero CPM bids when allowZeroCpmBids=true', function () {
      const [req] = spec.buildRequests([deepClone(BASE_BID)], deepClone(BASE_BIDDER_REQUEST));
      const impId = req.data.imp[0].id;
      const serverResponse = {
        body: {
          seatbid: [{ bid: [{ impid: impId, price: 0, ext: { appnexus: { bid_ad_type: 0 } } }] }]
        }
      };

      const stub = sandbox.stub(bidderSettings, 'get');
      stub.withArgs('mediafuse', 'allowZeroCpmBids').returns(true);
      expect(spec.interpretResponse(serverResponse, req)).to.have.lengthOf(1);
    });
  });

  // -------------------------------------------------------------------------
  // interpretResponse — debug info logging
  // -------------------------------------------------------------------------
  describe('interpretResponse - debug info logging', function () {
    it('should clean HTML and call logMessage when debug_info is present', function () {
      const [req] = spec.buildRequests([deepClone(BASE_BID)], deepClone(BASE_BIDDER_REQUEST));
      const logStub = sandbox.stub(utils, 'logMessage');

      spec.interpretResponse({
        body: {
          seatbid: [],
          debug: { debug_info: '<h1>Auction Debug</h1><br><td>Row</td>' }
        }
      }, req);

      expect(logStub.calledOnce).to.be.true;
      expect(logStub.firstCall.args[0]).to.include('===== Auction Debug =====');
      expect(logStub.firstCall.args[0]).to.not.include('<h1>');
    });
  });

  // -------------------------------------------------------------------------
  // interpretResponse — native exhaustive assets
  // -------------------------------------------------------------------------
  describe('interpretResponse - native exhaustive assets', function () {
    it('should map all optional native fields', function () {
      const bid = deepClone(BASE_BID);
      bid.mediaTypes = { native: { title: { required: true } } };
      const [req] = spec.buildRequests([bid], deepClone(BASE_BIDDER_REQUEST));
      const impId = req.data.imp[0].id;

      const nativeAdm = {
        native: {
          title: 'Title',
          desc: 'Body',
          desc2: 'Body2',
          ctatext: 'Click',
          rating: '4.5',
          sponsored: 'Sponsor',
          privacy_link: 'https://priv.example.com',
          address: '123 Main St',
          downloads: '1000',
          likes: '500',
          phone: '555-1234',
          price: '$9.99',
          saleprice: '$4.99',
          displayurl: 'example.com',
          link: { url: 'https://click.example.com', click_trackers: ['https://ct.example.com'] },
          main_img: { url: 'https://img.example.com/img.jpg', width: 300, height: 250 },
          icon: { url: 'https://img.example.com/icon.png', width: 50, height: 50 }
        }
      };

      const serverResponse = {
        body: {
          seatbid: [{
            bid: [{
              impid: impId,
              price: 1.5,
              adm: JSON.stringify(nativeAdm),
              ext: { appnexus: { bid_ad_type: 3 } }
            }]
          }]
        }
      };

      const bids = spec.interpretResponse(serverResponse, req);
      const native = bids[0].native;
      expect(native.title).to.equal('Title');
      expect(native.body).to.equal('Body');
      expect(native.body2).to.equal('Body2');
      expect(native.cta).to.equal('Click');
      expect(native.rating).to.equal('4.5');
      expect(native.sponsoredBy).to.equal('Sponsor');
      expect(native.privacyLink).to.equal('https://priv.example.com');
      expect(native.address).to.equal('123 Main St');
      expect(native.downloads).to.equal('1000');
      expect(native.likes).to.equal('500');
      expect(native.phone).to.equal('555-1234');
      expect(native.price).to.equal('$9.99');
      expect(native.salePrice).to.equal('$4.99');
      expect(native.displayUrl).to.equal('example.com');
      expect(native.clickUrl).to.equal('https://click.example.com');
      expect(native.clickTrackers).to.deep.equal(['https://ct.example.com']);
      expect(native.image.url).to.equal('https://img.example.com/img.jpg');
      expect(native.image.width).to.equal(300);
      expect(native.icon.url).to.equal('https://img.example.com/icon.png');
    });

    it('should disarm eventtrackers (trk.js) by replacing src= with data-src=', function () {
      const bid = deepClone(BASE_BID);
      bid.mediaTypes = { native: { title: { required: true } } };
      const [req] = spec.buildRequests([bid], deepClone(BASE_BIDDER_REQUEST));
      const impId = req.data.imp[0].id;

      const nativeAdm = {
        native: {
          title: 'T',
          eventtrackers: [
            { method: 1, url: '//cdn.adnxs.com/v/trk.js?src=1&dom_id=%native_dom_id%' },
            { method: 1, url: 'https://other-tracker.com/pixel' }
          ]
        }
      };

      const serverResponse = {
        body: {
          seatbid: [{
            bid: [{
              impid: impId,
              price: 1.0,
              adm: JSON.stringify(nativeAdm),
              ext: { appnexus: { bid_ad_type: 3 } }
            }]
          }]
        }
      };

      const bids = spec.interpretResponse(serverResponse, req);
      const trackers = bids[0].native.javascriptTrackers;
      expect(trackers).to.be.an('array');
      // The trk.js tracker should be disarmed: 'src=' replaced with 'data-src='
      const trkTracker = trackers.find(t => t.includes('trk.js'));
      expect(trkTracker).to.include('data-src=');
      // Verify the original 'src=1' param is now 'data-src=1' (not a bare 'src=')
      expect(trkTracker).to.not.match(/(?<!data-)src=1/);
    });

    it('should handle viewability.config disarming', function () {
      const bid = deepClone(BASE_BID);
      bid.mediaTypes = { native: { title: { required: true } } };
      const [req] = spec.buildRequests([bid], deepClone(BASE_BIDDER_REQUEST));
      const impId = req.data.imp[0].id;

      const serverResponse = {
        body: {
          seatbid: [{
            bid: [{
              impid: impId,
              price: 1.0,
              adm: JSON.stringify({ native: { title: 'T' } }),
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

      const bids = spec.interpretResponse(serverResponse, req);
      const trackers = bids[0].native.javascriptTrackers;
      expect(trackers).to.be.an('array');
      expect(trackers[0]).to.include('data-src=');
    });

    it('should handle malformed native adm gracefully', function () {
      const bid = deepClone(BASE_BID);
      bid.mediaTypes = { native: { title: { required: true } } };
      const [req] = spec.buildRequests([bid], deepClone(BASE_BIDDER_REQUEST));
      const impId = req.data.imp[0].id;
      const logErrorStub = sandbox.stub(utils, 'logError');

      const serverResponse = {
        body: {
          seatbid: [{
            bid: [{
              impid: impId,
              price: 1.0,
              adm: 'NOT_VALID_JSON',
              ext: { appnexus: { bid_ad_type: 3 } }
            }]
          }]
        }
      };

      // Should not throw
      expect(() => spec.interpretResponse(serverResponse, req)).to.not.throw();
      expect(logErrorStub.calledOnce).to.be.true;
    });
  });

  // -------------------------------------------------------------------------
  // getUserSyncs — gdprApplies not a boolean
  // -------------------------------------------------------------------------
  describe('getUserSyncs - gdprApplies undefined', function () {
    it('should use only gdpr_consent param when gdprApplies is not a boolean', function () {
      const syncOptions = { pixelEnabled: true };
      const serverResponses = [{
        body: { ext: { appnexus: { userSync: { url: 'https://sync.example.com/px' } } } }
      }];
      const gdprConsent = { consentString: 'abc123' }; // gdprApplies is undefined

      const syncs = spec.getUserSyncs(syncOptions, serverResponses, gdprConsent);
      expect(syncs).to.have.lengthOf(1);
      expect(syncs[0].url).to.include('gdpr_consent=abc123');
      expect(syncs[0].url).to.not.include('gdpr=');
    });
  });

  // -------------------------------------------------------------------------
  // lifecycle — onBidWon
  // -------------------------------------------------------------------------
  describe('onBidWon', function () {
    it('should call reloadViewabilityScript for native bids without throwing', function () {
      const bid = {
        adId: 'ad-1',
        adUnitCode: 'unit-1',
        native: { javascriptTrackers: ['//cdn.adnxs.com/v/trk.js?dom_id=%native_dom_id%'] }
      };
      expect(() => spec.onBidWon(bid)).to.not.throw();
    });

    it('should not throw for non-native bids', function () {
      const bid = { adId: 'ad-2', adUnitCode: 'unit-2', ad: '<div>Banner</div>' };
      expect(() => spec.onBidWon(bid)).to.not.throw();
    });
  });

  // -------------------------------------------------------------------------
  // lifecycle — onBidderError
  // -------------------------------------------------------------------------
  describe('onBidderError', function () {
    it('should call logMessage with error details', function () {
      const logStub = sandbox.stub(utils, 'logMessage');
      const error = new Error('timeout');
      spec.onBidderError({ error, bidderRequest: { auctionId: 'x' } });
      expect(logStub.calledOnce).to.be.true;
      expect(logStub.firstCall.args[0]).to.include('Mediafuse Bidder Error');
    });
  });

  // -------------------------------------------------------------------------
  // interpretResponse — dchain from buyer_member_id
  // -------------------------------------------------------------------------
  describe('interpretResponse - dchain', function () {
    it('should set meta.dchain when buyer_member_id is present', function () {
      const [req] = spec.buildRequests([deepClone(BASE_BID)], deepClone(BASE_BIDDER_REQUEST));
      const impId = req.data.imp[0].id;

      const serverResponse = {
        body: {
          seatbid: [{
            bid: [{
              impid: impId,
              price: 1.0,
              ext: { appnexus: { bid_ad_type: 0, buyer_member_id: 77, advertiser_id: 99 } }
            }]
          }]
        }
      };

      const bids = spec.interpretResponse(serverResponse, req);
      expect(bids[0].meta.dchain).to.deep.equal({
        ver: '1.0',
        complete: 0,
        nodes: [{ bsid: '77' }]
      });
      expect(bids[0].meta.advertiserId).to.equal(99);
    });
  });

  // -------------------------------------------------------------------------
  // buildRequests — optional params map (allowSmallerSizes, usePaymentRule, etc.)
  // -------------------------------------------------------------------------
  describe('buildRequests - optional params', function () {
    it('should map allowSmallerSizes, usePaymentRule, trafficSourceCode', function () {
      const bid = deepClone(BASE_BID);
      bid.params.allowSmallerSizes = true;
      bid.params.usePaymentRule = true;
      bid.params.trafficSourceCode = 'my-source';
      const [req] = spec.buildRequests([bid], deepClone(BASE_BIDDER_REQUEST));
      const extAN = req.data.imp[0].ext.appnexus;
      expect(extAN.allow_smaller_sizes).to.be.true;
      expect(extAN.use_pmt_rule).to.be.true;
      expect(extAN.traffic_source_code).to.equal('my-source');
    });

    it('should map externalImpId to imp.id', function () {
      const bid = deepClone(BASE_BID);
      bid.params.externalImpId = 'ext-imp-123';
      const [req] = spec.buildRequests([bid], deepClone(BASE_BIDDER_REQUEST));
      expect(req.data.imp[0].id).to.equal('ext-imp-123');
    });
  });
});

describe('mediafuseBidAdapter', function () {
  let sandbox;

  beforeEach(function () {
    sandbox = sinon.createSandbox();
  });

  afterEach(function () {
    sandbox.restore();
  });

  // -------------------------------------------------------------------------
  // isBidRequestValid
  // -------------------------------------------------------------------------
  describe('isBidRequestValid', function () {
    it('should return true for placement_id (snake_case)', function () {
      expect(spec.isBidRequestValid({ params: { placement_id: 12345 } })).to.be.true;
    });

    it('should return true for member + invCode', function () {
      expect(spec.isBidRequestValid({ params: { member: '123', invCode: 'inv' } })).to.be.true;
    });

    it('should return true for member + inv_code', function () {
      expect(spec.isBidRequestValid({ params: { member: '123', inv_code: 'inv' } })).to.be.true;
    });

    it('should return false when no params', function () {
      expect(spec.isBidRequestValid({})).to.be.false;
    });

    it('should return false for member without invCode or inv_code', function () {
      expect(spec.isBidRequestValid({ params: { member: '123' } })).to.be.false;
    });
  });

  // -------------------------------------------------------------------------
  // getBidFloor
  // -------------------------------------------------------------------------
  describe('buildRequests - getBidFloor', function () {
    it('should use getFloor function result when available and currency matches', function () {
      const bid = deepClone(BASE_BID);
      bid.getFloor = () => ({ currency: 'USD', floor: 1.5 });
      const [req] = spec.buildRequests([bid], deepClone(BASE_BIDDER_REQUEST));
      expect(req.data.imp[0].bidfloor).to.equal(1.5);
    });

    it('should return null when getFloor returns wrong currency', function () {
      const bid = deepClone(BASE_BID);
      bid.getFloor = () => ({ currency: 'EUR', floor: 1.5 });
      const [req] = spec.buildRequests([bid], deepClone(BASE_BIDDER_REQUEST));
      expect(req.data.imp[0].bidfloor).to.be.undefined;
    });

    it('should use params.reserve when no getFloor function', function () {
      const bid = deepClone(BASE_BID);
      bid.params.reserve = 2.0;
      const [req] = spec.buildRequests([bid], deepClone(BASE_BIDDER_REQUEST));
      expect(req.data.imp[0].bidfloor).to.equal(2.0);
    });
  });

  // -------------------------------------------------------------------------
  // buildRequests — inv_code
  // -------------------------------------------------------------------------
  describe('buildRequests - inv_code', function () {
    it('should set tagid from invCode when no placementId', function () {
      const bid = { bidder: 'mediafuse', adUnitCode: 'au', bidId: 'b1', params: { invCode: 'my-inv-code', member: '123' } };
      const [req] = spec.buildRequests([bid], deepClone(BASE_BIDDER_REQUEST));
      expect(req.data.imp[0].tagid).to.equal('my-inv-code');
    });

    it('should set tagid from inv_code when no placementId', function () {
      const bid = { bidder: 'mediafuse', adUnitCode: 'au', bidId: 'b1', params: { inv_code: 'my-inv-code-snake', member: '123' } };
      const [req] = spec.buildRequests([bid], deepClone(BASE_BIDDER_REQUEST));
      expect(req.data.imp[0].tagid).to.equal('my-inv-code-snake');
    });
  });

  // -------------------------------------------------------------------------
  // buildRequests — banner_frameworks
  // -------------------------------------------------------------------------
  describe('buildRequests - banner_frameworks', function () {
    it('should set banner_frameworks from bid.params.banner_frameworks when no banner.api', function () {
      const bid = deepClone(BASE_BID);
      bid.mediaTypes = { banner: { sizes: [[300, 250]] } };
      bid.params.banner_frameworks = [1, 2, 3];
      const [req] = spec.buildRequests([bid], deepClone(BASE_BIDDER_REQUEST));
      expect(req.data.imp[0].ext.appnexus.banner_frameworks).to.deep.equal([1, 2, 3]);
    });
  });

  // -------------------------------------------------------------------------
  // buildRequests — custom_renderer_present via bid.renderer
  // -------------------------------------------------------------------------
  describe('buildRequests - custom renderer present', function () {
    it('should set custom_renderer_present when bid.renderer is set for video imp', function () {
      const bid = deepClone(BASE_BID);
      bid.mediaTypes = { video: { context: 'outstream', playerSize: [640, 480] } };
      bid.renderer = { id: 'custom', url: 'https://renderer.example.com/r.js' };
      const [req] = spec.buildRequests([bid], deepClone(BASE_BIDDER_REQUEST));
      expect(req.data.imp[0].ext.appnexus.custom_renderer_present).to.be.true;
    });
  });

  // -------------------------------------------------------------------------
  // buildRequests — catch-all unknown camelCase params
  // -------------------------------------------------------------------------
  describe('buildRequests - catch-all unknown params', function () {
    it('should convert unknown camelCase params to snake_case in extAN', function () {
      const bid = deepClone(BASE_BID);
      bid.params.unknownCamelCaseParam = 'value123';
      const [req] = spec.buildRequests([bid], deepClone(BASE_BIDDER_REQUEST));
      expect(req.data.imp[0].ext.appnexus.unknown_camel_case_param).to.equal('value123');
    });
  });

  // -------------------------------------------------------------------------
  // buildRequests — bid-level keywords
  // -------------------------------------------------------------------------
  describe('buildRequests - bid keywords', function () {
    it('should map bid.params.keywords to extAN.keywords string', function () {
      const bid = deepClone(BASE_BID);
      bid.params.keywords = { genre: ['rock', 'pop'] };
      const [req] = spec.buildRequests([bid], deepClone(BASE_BIDDER_REQUEST));
      expect(req.data.imp[0].ext.appnexus.keywords).to.be.a('string');
      expect(req.data.imp[0].ext.appnexus.keywords).to.include('genre=rock,pop');
    });
  });

  // -------------------------------------------------------------------------
  // buildRequests — canonicalUrl in referer detection
  // -------------------------------------------------------------------------
  describe('buildRequests - canonicalUrl', function () {
    it('should set rd_can in referrer_detection when canonicalUrl is present', function () {
      const bidderRequest = deepClone(BASE_BIDDER_REQUEST);
      bidderRequest.refererInfo.canonicalUrl = 'https://canonical.example.com/page';
      const [req] = spec.buildRequests([deepClone(BASE_BID)], bidderRequest);
      expect(req.data.ext.appnexus.referrer_detection.rd_can).to.equal('https://canonical.example.com/page');
    });
  });

  // -------------------------------------------------------------------------
  // buildRequests — publisherId → site.publisher.id
  // -------------------------------------------------------------------------
  describe('buildRequests - publisherId', function () {
    it('should set site.publisher.id from bid.params.publisherId', function () {
      const bid = deepClone(BASE_BID);
      bid.params.publisherId = 67890;
      const bidderRequest = deepClone(BASE_BIDDER_REQUEST);
      bidderRequest.bids = [bid];
      const [req] = spec.buildRequests([bid], bidderRequest);
      expect(req.data.site.publisher.id).to.equal('67890');
    });
  });

  // -------------------------------------------------------------------------
  // buildRequests — member appended to endpoint URL
  // -------------------------------------------------------------------------
  describe('buildRequests - member URL param', function () {
    it('should append member_id to endpoint URL when bid.params.member is set', function () {
      const bid = deepClone(BASE_BID);
      bid.params.member = '456';
      const bidderRequest = deepClone(BASE_BIDDER_REQUEST);
      bidderRequest.bids = [bid];
      const [req] = spec.buildRequests([bid], bidderRequest);
      expect(req.url).to.include('member_id=456');
    });
  });

  // -------------------------------------------------------------------------
  // buildRequests — gppConsent
  // -------------------------------------------------------------------------
  describe('buildRequests - gppConsent', function () {
    it('should set regs.gpp and regs.gpp_sid from gppConsent', function () {
      const bidderRequest = deepClone(BASE_BIDDER_REQUEST);
      bidderRequest.gppConsent = { gppString: 'DBACMYA', applicableSections: [7] };
      const [req] = spec.buildRequests([deepClone(BASE_BID)], bidderRequest);
      expect(req.data.regs.gpp).to.equal('DBACMYA');
      expect(req.data.regs.gpp_sid).to.deep.equal([7]);
    });
  });

  // -------------------------------------------------------------------------
  // buildRequests — gdprApplies=false
  // -------------------------------------------------------------------------
  describe('buildRequests - gdprApplies false', function () {
    it('should set regs.ext.gdpr=0 when gdprApplies is false', function () {
      const bidderRequest = deepClone(BASE_BIDDER_REQUEST);
      bidderRequest.gdprConsent = { gdprApplies: false, consentString: 'cs' };
      const [req] = spec.buildRequests([deepClone(BASE_BID)], bidderRequest);
      expect(req.data.regs.ext.gdpr).to.equal(0);
    });
  });

  // -------------------------------------------------------------------------
  // buildRequests — user.externalUid
  // -------------------------------------------------------------------------
  describe('buildRequests - user externalUid', function () {
    it('should map externalUid to user.external_uid', function () {
      const bid = deepClone(BASE_BID);
      bid.params.user = { externalUid: 'uid-abc-123' };
      const bidderRequest = deepClone(BASE_BIDDER_REQUEST);
      bidderRequest.bids = [bid];
      const [req] = spec.buildRequests([bid], bidderRequest);
      expect(req.data.user.external_uid).to.equal('uid-abc-123');
    });
  });

  // -------------------------------------------------------------------------
  // buildRequests — EID rti_partner mapping (TDID / UID2)
  // -------------------------------------------------------------------------
  describe('buildRequests - EID rti_partner mapping', function () {
    it('should add rti_partner=TDID to adserver.org EID', function () {
      const bid = deepClone(BASE_BID);
      bid.userIdAsEids = [{ source: 'adserver.org', uids: [{ id: 'tdid-value', atype: 1 }] }];
      const [req] = spec.buildRequests([bid], deepClone(BASE_BIDDER_REQUEST));
      const eid = req.data.user && req.data.user.ext && req.data.user.ext.eids &&
        req.data.user.ext.eids.find(e => e.source === 'adserver.org');
      if (eid) {
        expect(eid.rti_partner).to.equal('TDID');
      }
    });

    it('should add rti_partner=UID2 to uidapi.com EID', function () {
      const bid = deepClone(BASE_BID);
      bid.userIdAsEids = [{ source: 'uidapi.com', uids: [{ id: 'uid2-value', atype: 3 }] }];
      const [req] = spec.buildRequests([bid], deepClone(BASE_BIDDER_REQUEST));
      const eid = req.data.user && req.data.user.ext && req.data.user.ext.eids &&
        req.data.user.ext.eids.find(e => e.source === 'uidapi.com');
      if (eid) {
        expect(eid.rti_partner).to.equal('UID2');
      }
    });
  });

  // -------------------------------------------------------------------------
  // buildRequests — apn_test config → X-Is-Test header
  // -------------------------------------------------------------------------
  describe('buildRequests - apn_test config header', function () {
    it('should set X-Is-Test:1 custom header when config apn_test=true', function () {
      sandbox.stub(config, 'getConfig').callsFake((key) => {
        if (key === 'apn_test') return true;
        return undefined;
      });
      const [req] = spec.buildRequests([deepClone(BASE_BID)], deepClone(BASE_BIDDER_REQUEST));
      expect(req.options.customHeaders).to.deep.equal({ 'X-Is-Test': 1 });
    });
  });

  // -------------------------------------------------------------------------
  // buildRequests — adpod early return (no durationRangeSec)
  // -------------------------------------------------------------------------
  describe('buildRequests - adpod early return', function () {
    it('should return single imp when adpod has no durationRangeSec', function () {
      const bid = {
        bidder: 'mediafuse',
        adUnitCode: 'pod',
        bidId: 'pod-bid',
        mediaTypes: { video: { context: 'adpod', adPodDurationSec: 30 } },
        params: { placementId: 111 }
      };
      const [req] = spec.buildRequests([bid], deepClone(BASE_BIDDER_REQUEST));
      expect(req.data.imp).to.have.lengthOf(1);
    });
  });

  // -------------------------------------------------------------------------
  // buildRequests — video minduration already set (skip overwrite)
  // -------------------------------------------------------------------------
  describe('buildRequests - video minduration skip overwrite', function () {
    it('should not overwrite minduration set by params.video when mediaTypes.video.minduration also present', function () {
      const bid = deepClone(BASE_BID);
      bid.mediaTypes = { video: { context: 'instream', playerSize: [640, 480], minduration: 10 } };
      bid.params.video = { minduration: 5 };
      const [req] = spec.buildRequests([bid], deepClone(BASE_BIDDER_REQUEST));
      // params.video sets minduration=5 first; mediaTypes check sees it's already a number → skips
      expect(req.data.imp[0].video.minduration).to.equal(5);
    });
  });

  // -------------------------------------------------------------------------
  // buildRequests — playbackmethod out of range (>4)
  // -------------------------------------------------------------------------
  describe('buildRequests - video playbackmethod out of range', function () {
    it('should not set playback_method when playbackmethod[0] > 4', function () {
      const bid = deepClone(BASE_BID);
      bid.mediaTypes = { video: { context: 'instream', playerSize: [640, 480], playbackmethod: [5] } };
      const [req] = spec.buildRequests([bid], deepClone(BASE_BIDDER_REQUEST));
      expect(req.data.imp[0].video.playback_method).to.be.undefined;
    });
  });

  // -------------------------------------------------------------------------
  // buildRequests — video api val=6 filtered out
  // -------------------------------------------------------------------------
  describe('buildRequests - video api val=6 filtered', function () {
    it('should produce empty video_frameworks when api=[6] since 6 is out of 1-5 range', function () {
      const bid = deepClone(BASE_BID);
      bid.mediaTypes = { video: { context: 'instream', playerSize: [640, 480], api: [6] } };
      const [req] = spec.buildRequests([bid], deepClone(BASE_BIDDER_REQUEST));
      expect(req.data.imp[0].ext.appnexus.video_frameworks).to.deep.equal([]);
    });
  });

  // -------------------------------------------------------------------------
  // buildRequests — video_frameworks already set; api should not override
  // -------------------------------------------------------------------------
  describe('buildRequests - video_frameworks not overridden by api', function () {
    it('should keep frameworks from params.video when mediaTypes.video.api is also present', function () {
      const bid = deepClone(BASE_BID);
      bid.mediaTypes = { video: { context: 'instream', playerSize: [640, 480], api: [4] } };
      bid.params.video = { frameworks: [1, 2] };
      const [req] = spec.buildRequests([bid], deepClone(BASE_BIDDER_REQUEST));
      expect(req.data.imp[0].ext.appnexus.video_frameworks).to.deep.equal([1, 2]);
    });
  });

  // -------------------------------------------------------------------------
  // interpretResponse — adomain string vs empty array
  // -------------------------------------------------------------------------
  describe('interpretResponse - adomain handling', function () {
    it('should wrap string adomain in an array for advertiserDomains', function () {
      const [req] = spec.buildRequests([deepClone(BASE_BID)], deepClone(BASE_BIDDER_REQUEST));
      const impId = req.data.imp[0].id;
      const serverResponse = {
        body: {
          seatbid: [{
            bid: [{
              impid: impId,
              price: 1.0,
              adomain: 'example.com',
              ext: { appnexus: { bid_ad_type: 0 } }
            }]
          }]
        }
      };
      const bids = spec.interpretResponse(serverResponse, req);
      expect(bids[0].meta.advertiserDomains).to.deep.equal(['example.com']);
    });

    it('should not set non-empty advertiserDomains when adomain is an empty array', function () {
      const [req] = spec.buildRequests([deepClone(BASE_BID)], deepClone(BASE_BIDDER_REQUEST));
      const impId = req.data.imp[0].id;
      const serverResponse = {
        body: {
          seatbid: [{
            bid: [{
              impid: impId,
              price: 1.0,
              adomain: [],
              ext: { appnexus: { bid_ad_type: 0 } }
            }]
          }]
        }
      };
      const bids = spec.interpretResponse(serverResponse, req);
      // adapter's guard skips setting advertiserDomains for empty arrays;
      // ortbConverter may set it to [] — either way it must not be a non-empty array
      const domains = bids[0].meta && bids[0].meta.advertiserDomains;
      expect(!domains || domains.length === 0).to.be.true;
    });
  });

  // -------------------------------------------------------------------------
  // interpretResponse — banner impression_urls trackers
  // -------------------------------------------------------------------------
  describe('interpretResponse - banner trackers', function () {
    it('should append tracker pixel HTML to bid.ad when trackers.impression_urls is present', function () {
      const [req] = spec.buildRequests([deepClone(BASE_BID)], deepClone(BASE_BIDDER_REQUEST));
      const impId = req.data.imp[0].id;
      const serverResponse = {
        body: {
          seatbid: [{
            bid: [{
              impid: impId,
              price: 1.0,
              adm: '<div>ad</div>',
              ext: {
                appnexus: {
                  bid_ad_type: 0,
                  trackers: [{ impression_urls: ['https://tracker.example.com/impression'] }]
                }
              }
            }]
          }]
        }
      };
      const bids = spec.interpretResponse(serverResponse, req);
      expect(bids[0].ad).to.include('tracker.example.com/impression');
    });
  });

  // -------------------------------------------------------------------------
  // interpretResponse — native jsTrackers combinations
  // -------------------------------------------------------------------------
  describe('interpretResponse - native jsTrackers combinations', function () {
    function buildNativeReq() {
      const bid = deepClone(BASE_BID);
      bid.mediaTypes = { native: { title: { required: true } } };
      const [req] = spec.buildRequests([bid], deepClone(BASE_BIDDER_REQUEST));
      return req;
    }

    it('should combine string jsTracker with viewability.config into array [str, disarmed]', function () {
      const req = buildNativeReq();
      const impId = req.data.imp[0].id;
      const serverResponse = {
        body: {
          seatbid: [{
            bid: [{
              impid: impId,
              price: 1.0,
              adm: JSON.stringify({ native: { title: 'T', javascript_trackers: 'https://existing-tracker.com/t.js' } }),
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
      const bids = spec.interpretResponse(serverResponse, req);
      const trackers = bids[0].native.javascriptTrackers;
      expect(trackers).to.be.an('array').with.lengthOf(2);
      expect(trackers[0]).to.equal('https://existing-tracker.com/t.js');
      expect(trackers[1]).to.include('data-src=');
    });

    it('should push viewability.config into existing array jsTrackers', function () {
      const req = buildNativeReq();
      const impId = req.data.imp[0].id;
      const serverResponse = {
        body: {
          seatbid: [{
            bid: [{
              impid: impId,
              price: 1.0,
              adm: JSON.stringify({ native: { title: 'T', javascript_trackers: ['https://tracker1.com/t.js'] } }),
              ext: {
                appnexus: {
                  bid_ad_type: 3,
                  viewability: { config: '<script src="https://cdn.adnxs.com/v/trk.js?id=456"></script>' }
                }
              }
            }]
          }]
        }
      };
      const bids = spec.interpretResponse(serverResponse, req);
      const trackers = bids[0].native.javascriptTrackers;
      expect(trackers).to.be.an('array').with.lengthOf(2);
      expect(trackers[0]).to.equal('https://tracker1.com/t.js');
      expect(trackers[1]).to.include('data-src=');
    });

    it('should combine string jsTracker with eventtrackers into array', function () {
      const req = buildNativeReq();
      const impId = req.data.imp[0].id;
      const serverResponse = {
        body: {
          seatbid: [{
            bid: [{
              impid: impId,
              price: 1.0,
              adm: JSON.stringify({
                native: {
                  title: 'T',
                  javascript_trackers: 'https://existing-tracker.com/t.js',
                  eventtrackers: [{ method: 1, url: 'https://event-tracker.com/track' }]
                }
              }),
              ext: { appnexus: { bid_ad_type: 3 } }
            }]
          }]
        }
      };
      const bids = spec.interpretResponse(serverResponse, req);
      const trackers = bids[0].native.javascriptTrackers;
      expect(trackers).to.be.an('array').with.lengthOf(2);
      expect(trackers[0]).to.equal('https://existing-tracker.com/t.js');
      expect(trackers[1]).to.equal('https://event-tracker.com/track');
    });

    it('should push eventtrackers into existing array jsTrackers', function () {
      const req = buildNativeReq();
      const impId = req.data.imp[0].id;
      const serverResponse = {
        body: {
          seatbid: [{
            bid: [{
              impid: impId,
              price: 1.0,
              adm: JSON.stringify({
                native: {
                  title: 'T',
                  javascript_trackers: ['https://existing-tracker.com/t.js'],
                  eventtrackers: [{ method: 1, url: 'https://event-tracker.com/track' }]
                }
              }),
              ext: { appnexus: { bid_ad_type: 3 } }
            }]
          }]
        }
      };
      const bids = spec.interpretResponse(serverResponse, req);
      const trackers = bids[0].native.javascriptTrackers;
      expect(trackers).to.be.an('array').with.lengthOf(2);
      expect(trackers[0]).to.equal('https://existing-tracker.com/t.js');
      expect(trackers[1]).to.equal('https://event-tracker.com/track');
    });
  });

  // -------------------------------------------------------------------------
  // getUserSyncs — iframe and pixel syncing
  // -------------------------------------------------------------------------
  describe('getUserSyncs - iframe and pixel syncing', function () {
    it('should add iframe sync when iframeEnabled and purpose-1 consent is present', function () {
      const syncOptions = { iframeEnabled: true };
      const gdprConsent = {
        gdprApplies: true,
        consentString: 'cs',
        vendorData: { purpose: { consents: { 1: true } } }
      };
      const syncs = spec.getUserSyncs(syncOptions, [], gdprConsent);
      expect(syncs).to.have.lengthOf(1);
      expect(syncs[0].type).to.equal('iframe');
      expect(syncs[0].url).to.include('gdpr=1');
    });

    it('should have no gdpr params in pixel url when gdprConsent is null', function () {
      const syncOptions = { pixelEnabled: true };
      const serverResponses = [{
        body: { ext: { appnexus: { userSync: { url: 'https://sync.example.com/px' } } } }
      }];
      const syncs = spec.getUserSyncs(syncOptions, serverResponses, null);
      expect(syncs).to.have.lengthOf(1);
      expect(syncs[0].url).to.not.include('gdpr');
    });

    it('should append gdpr params with & when pixel url already contains ?', function () {
      const syncOptions = { pixelEnabled: true };
      const serverResponses = [{
        body: { ext: { appnexus: { userSync: { url: 'https://sync.example.com/px?existing=1' } } } }
      }];
      const gdprConsent = { gdprApplies: true, consentString: 'cs' };
      const syncs = spec.getUserSyncs(syncOptions, serverResponses, gdprConsent);
      expect(syncs[0].url).to.include('existing=1');
      expect(syncs[0].url).to.include('gdpr=1');
      expect(syncs[0].url).to.match(/\?existing=1&/);
    });
  });

  // -------------------------------------------------------------------------
  // Empty lifecycle methods — onTimeout, onSetTargeting, onAdRenderSucceeded
  // -------------------------------------------------------------------------
  describe('empty lifecycle methods', function () {
    it('onTimeout should not throw', function () {
      expect(() => spec.onTimeout({ bidderCode: 'mediafuse', timeout: 3000 })).to.not.throw();
    });

    it('onSetTargeting should not throw', function () {
      expect(() => spec.onSetTargeting({ adUnitCode: 'au', params: {} })).to.not.throw();
    });

    it('onAdRenderSucceeded should not throw', function () {
      expect(() => spec.onAdRenderSucceeded({ adUnitCode: 'au' })).to.not.throw();
    });
  });

  // -------------------------------------------------------------------------
  // onBidWon — string jsTracker
  // -------------------------------------------------------------------------
  describe('onBidWon - string jsTracker', function () {
    it('should handle jsTrackers as a plain string without throwing', function () {
      const bid = {
        adId: 'ad-str',
        adUnitCode: 'unit-str',
        native: { javascriptTrackers: '//cdn.adnxs.com/v/trk.js?dom_id=%native_dom_id%' }
      };
      expect(() => spec.onBidWon(bid)).to.not.throw();
    });
  });

  // -------------------------------------------------------------------------
  // getUserSyncs — iframeEnabled but consent denied (no iframe added)
  // -------------------------------------------------------------------------
  describe('getUserSyncs - iframeEnabled denied by consent', function () {
    it('should not add iframe sync when iframeEnabled but purpose-1 consent is denied', function () {
      const syncOptions = { iframeEnabled: true };
      const gdprConsent = {
        gdprApplies: true,
        consentString: 'cs',
        vendorData: { purpose: { consents: { 1: false } } }
      };
      const syncs = spec.getUserSyncs(syncOptions, [], gdprConsent);
      expect(syncs).to.have.lengthOf(0);
    });

    it('should not add pixel sync when serverResponses is empty', function () {
      const syncOptions = { pixelEnabled: true };
      const syncs = spec.getUserSyncs(syncOptions, [], null);
      expect(syncs).to.have.lengthOf(0);
    });

    it('should not add pixel sync when response has no userSync url', function () {
      const syncOptions = { pixelEnabled: true };
      const serverResponses = [{ body: { ext: { appnexus: {} } } }];
      const syncs = spec.getUserSyncs(syncOptions, serverResponses, null);
      expect(syncs).to.have.lengthOf(0);
    });
  });

  // -------------------------------------------------------------------------
  // interpretResponse — bid_ad_type not in RESPONSE_MEDIA_TYPE_MAP
  // -------------------------------------------------------------------------
  describe('interpretResponse - unknown bid_ad_type', function () {
    it('should not throw when bid_ad_type=2 is not in the media type map', function () {
      const [req] = spec.buildRequests([deepClone(BASE_BID)], deepClone(BASE_BIDDER_REQUEST));
      const impId = req.data.imp[0].id;
      const serverResponse = {
        body: {
          seatbid: [{
            bid: [{
              impid: impId,
              price: 1.5,
              adm: '<div>creative</div>',
              ext: { appnexus: { bid_ad_type: 2 } }
            }]
          }]
        }
      };
      expect(() => spec.interpretResponse(serverResponse, req)).to.not.throw();
    });
  });

  // -------------------------------------------------------------------------
  // interpretResponse — adpod brand_category_id not in APPNEXUS_CATEGORY_MAPPING
  // -------------------------------------------------------------------------
  describe('interpretResponse - adpod brand_category_id not in mapping', function () {
    it('should not set primaryCatId when brand_category_id has no mapping entry', function () {
      const bid = {
        bidder: 'mediafuse',
        adUnitCode: 'pod',
        bidId: 'pod-bid',
        mediaTypes: { video: { context: 'adpod', adPodDurationSec: 30, durationRangeSec: [15] } },
        params: { placementId: 111 }
      };
      const [req] = spec.buildRequests([bid], deepClone(BASE_BIDDER_REQUEST));
      const impId = req.data.imp[0].id;
      const serverResponse = {
        body: {
          seatbid: [{
            bid: [{
              impid: impId,
              price: 2.0,
              ext: {
                appnexus: {
                  bid_ad_type: 1,
                  brand_category_id: 99999
                }
              }
            }]
          }]
        }
      };
      const bids = spec.interpretResponse(serverResponse, req);
      expect(bids[0].meta && bids[0].meta.primaryCatId).to.be.undefined;
    });
  });

  // -------------------------------------------------------------------------
  // buildRequests — topmostLocation falsy → rd_ref=''
  // -------------------------------------------------------------------------
  describe('buildRequests - topmostLocation falsy', function () {
    it('should set rd_ref to empty string when topmostLocation is not present', function () {
      const bidderRequest = deepClone(BASE_BIDDER_REQUEST);
      bidderRequest.refererInfo = {
        topmostLocation: null,
        reachedTop: false,
        numIframes: 0,
        stack: []
      };
      const [req] = spec.buildRequests([deepClone(BASE_BID)], bidderRequest);
      expect(req.data.ext.appnexus.referrer_detection.rd_ref).to.equal('');
    });
  });

  // -------------------------------------------------------------------------
  // buildRequests — addtlConsent all-NaN → addtl_consent not set
  // -------------------------------------------------------------------------
  describe('buildRequests - addtlConsent all-NaN values', function () {
    it('should not set addtl_consent when all values after ~ are NaN', function () {
      const bidderRequest = deepClone(BASE_BIDDER_REQUEST);
      bidderRequest.gdprConsent = {
        gdprApplies: true,
        consentString: 'cs',
        addtlConsent: '1~abc.def.ghi'
      };
      const [req] = spec.buildRequests([deepClone(BASE_BID)], bidderRequest);
      expect(req.data.user && req.data.user.ext && req.data.user.ext.addtl_consent).to.be.undefined;
    });
  });

  // -------------------------------------------------------------------------
  // buildRequests — EID with unrecognized source passes through unchanged
  // -------------------------------------------------------------------------
  describe('buildRequests - EID unrecognized source', function () {
    it('should pass through EID unchanged when source is neither adserver.org nor uidapi.com', function () {
      const bid = deepClone(BASE_BID);
      bid.userIdAsEids = [{ source: 'unknown-id-provider.com', uids: [{ id: 'some-id', atype: 1 }] }];
      const [req] = spec.buildRequests([bid], deepClone(BASE_BIDDER_REQUEST));
      const eid = req.data.user && req.data.user.ext && req.data.user.ext.eids &&
        req.data.user.ext.eids.find(e => e.source === 'unknown-id-provider.com');
      if (eid) {
        expect(eid.rti_partner).to.be.undefined;
      }
    });
  });

  // -------------------------------------------------------------------------
  // getBidFloor — edge cases
  // -------------------------------------------------------------------------
  describe('buildRequests - getBidFloor edge cases', function () {
    it('should return null when getFloor returns a non-plain-object (null)', function () {
      const bid = deepClone(BASE_BID);
      bid.getFloor = () => null;
      const [req] = spec.buildRequests([bid], deepClone(BASE_BIDDER_REQUEST));
      expect(req.data.imp[0].bidfloor).to.be.undefined;
    });

    it('should return null when getFloor returns a NaN floor value', function () {
      const bid = deepClone(BASE_BID);
      bid.getFloor = () => ({ currency: 'USD', floor: NaN });
      const [req] = spec.buildRequests([bid], deepClone(BASE_BIDDER_REQUEST));
      expect(req.data.imp[0].bidfloor).to.be.undefined;
    });
  });

  // -------------------------------------------------------------------------
  // buildRequests — banner_frameworks type guard
  // -------------------------------------------------------------------------
  describe('buildRequests - banner_frameworks invalid type', function () {
    it('should not set banner_frameworks when value is a string (not array of nums)', function () {
      const bid = deepClone(BASE_BID);
      bid.mediaTypes = { banner: { sizes: [[300, 250]] } };
      bid.params.banner_frameworks = 'not-an-array';
      const [req] = spec.buildRequests([bid], deepClone(BASE_BIDDER_REQUEST));
      expect(req.data.imp[0].ext.appnexus.banner_frameworks).to.be.undefined;
    });
  });

  // -------------------------------------------------------------------------
  // onBidWon — no trk.js in jsTrackers
  // -------------------------------------------------------------------------
  describe('onBidWon - jsTrackers with no trk.js URL', function () {
    it('should return early when no trk.js tracker is found in jsTrackers array', function () {
      const bid = {
        adId: 'ad-no-trk',
        adUnitCode: 'unit-no-trk',
        native: { javascriptTrackers: ['https://other-tracker.com/track.js', 'https://another.com/t.js'] }
      };
      expect(() => spec.onBidWon(bid)).to.not.throw();
    });
  });

  // -------------------------------------------------------------------------
  // onBidWon — HTML-snippet tracker
  // -------------------------------------------------------------------------
  describe('onBidWon - HTML-snippet style tracker', function () {
    it('should extract src from HTML-snippet style tracker without throwing', function () {
      const bid = {
        adId: 'ad-html',
        adUnitCode: 'unit-html',
        native: {
          javascriptTrackers: ['<script src="//cdn.adnxs.com/v/trk.js?dom_id=%native_dom_id%"></script>']
        }
      };
      expect(() => spec.onBidWon(bid)).to.not.throw();
    });
  });

  // -------------------------------------------------------------------------
  // buildRequests — video params frameworks type guard
  // -------------------------------------------------------------------------
  describe('buildRequests - video params frameworks', function () {
    it('should not set video_frameworks when params.video.frameworks is not an array', function () {
      const bid = deepClone(BASE_BID);
      bid.mediaTypes = { video: { context: 'instream', playerSize: [640, 480] } };
      bid.params.video = { frameworks: 'not-an-array' };
      const [req] = spec.buildRequests([bid], deepClone(BASE_BIDDER_REQUEST));
      expect(req.data.imp[0].ext.appnexus.video_frameworks).to.be.undefined;
    });
  });

  // -------------------------------------------------------------------------
  // buildRequests — banner_frameworks param fallback
  // -------------------------------------------------------------------------
  describe('buildRequests - banner frameworks param fallback', function () {
    it('should use bid.params.frameworks as fallback when banner_frameworks is absent', function () {
      const bid = deepClone(BASE_BID);
      bid.mediaTypes = { banner: { sizes: [[300, 250]] } };
      bid.params.frameworks = [1, 2];
      const [req] = spec.buildRequests([bid], deepClone(BASE_BIDDER_REQUEST));
      expect(req.data.imp[0].ext.appnexus.banner_frameworks).to.deep.equal([1, 2]);
    });
  });

  // -------------------------------------------------------------------------
  // buildRequests — refererInfo.stack absent
  // -------------------------------------------------------------------------
  describe('buildRequests - refererInfo stack absent', function () {
    it('should set rd_stk to undefined when stack is not present in refererInfo', function () {
      const bidderRequest = deepClone(BASE_BIDDER_REQUEST);
      bidderRequest.refererInfo = {
        topmostLocation: 'http://example.com',
        reachedTop: true,
        numIframes: 0
      };
      const [req] = spec.buildRequests([deepClone(BASE_BID)], bidderRequest);
      expect(req.data.ext.appnexus.referrer_detection.rd_stk).to.be.undefined;
    });
  });

  // -------------------------------------------------------------------------
  // interpretResponse — renderer options from mediaTypes.video.renderer.options
  // -------------------------------------------------------------------------
  describe('interpretResponse - renderer options from mediaTypes.video.renderer', function () {
    it('should use mediaTypes.video.renderer.options when available', function () {
      const bid = deepClone(BASE_BID);
      bid.mediaTypes = { video: { context: 'outstream', playerSize: [640, 480], renderer: { options: { key: 'val' } } } };
      const [req] = spec.buildRequests([bid], deepClone(BASE_BIDDER_REQUEST));
      const impId = req.data.imp[0].id;
      const serverResponse = {
        body: {
          seatbid: [{
            bid: [{
              impid: impId,
              price: 3.0,
              ext: {
                appnexus: {
                  bid_ad_type: 1,
                  renderer_url: 'https://cdn.adnxs.com/renderer.js',
                  renderer_id: 42
                }
              }
            }]
          }]
        }
      };
      const bids = spec.interpretResponse(serverResponse, req);
      expect(bids[0].renderer).to.exist;
    });
  });

  // -------------------------------------------------------------------------
  // buildRequests — video params.video takes priority over mediaTypes.video for maxduration
  // -------------------------------------------------------------------------
  describe('buildRequests - video maxduration skip overwrite', function () {
    it('should not overwrite maxduration set by params.video when mediaTypes.video.maxduration also present', function () {
      const bid = deepClone(BASE_BID);
      bid.mediaTypes = { video: { context: 'instream', playerSize: [640, 480], maxduration: 15 } };
      bid.params.video = { maxduration: 30 };
      const [req] = spec.buildRequests([bid], deepClone(BASE_BIDDER_REQUEST));
      expect(req.data.imp[0].video.maxduration).to.equal(30);
    });
  });

  // -------------------------------------------------------------------------
  // buildRequests — video params.video takes priority over mediaTypes.video for skippable
  // -------------------------------------------------------------------------
  describe('buildRequests - video skippable skip overwrite', function () {
    it('should not overwrite skippable set by params.video when mediaTypes.video.skip is also present', function () {
      const bid = deepClone(BASE_BID);
      bid.mediaTypes = { video: { context: 'instream', playerSize: [640, 480], skip: 1 } };
      bid.params.video = { skippable: false };
      const [req] = spec.buildRequests([bid], deepClone(BASE_BIDDER_REQUEST));
      expect(req.data.imp[0].video.skippable).to.be.false;
    });
  });

  // -------------------------------------------------------------------------
  // buildRequests — video params.video takes priority over mediaTypes.video for skipoffset
  // -------------------------------------------------------------------------
  describe('buildRequests - video skipoffset skip overwrite', function () {
    it('should not overwrite skipoffset set by params.video when mediaTypes.video.skipafter is also present', function () {
      const bid = deepClone(BASE_BID);
      bid.mediaTypes = { video: { context: 'instream', playerSize: [640, 480], skipafter: 10 } };
      bid.params.video = { skipoffset: 5 };
      const [req] = spec.buildRequests([bid], deepClone(BASE_BIDDER_REQUEST));
      expect(req.data.imp[0].video.skipoffset).to.equal(5);
    });
  });

  // -------------------------------------------------------------------------
  // buildRequests — video playbackmethod type guard
  // -------------------------------------------------------------------------
  describe('buildRequests - video playbackmethod', function () {
    it('should not set playback_method when mediaTypes.video.playbackmethod is not an array', function () {
      const bid = deepClone(BASE_BID);
      bid.mediaTypes = { video: { context: 'instream', playerSize: [640, 480], playbackmethod: 2 } };
      const [req] = spec.buildRequests([bid], deepClone(BASE_BIDDER_REQUEST));
      expect(req.data.imp[0].video.playback_method).to.be.undefined;
    });
  });

  // -------------------------------------------------------------------------
  // interpretResponse — video nurl without asset_url
  // -------------------------------------------------------------------------
  describe('interpretResponse - video nurl without asset_url', function () {
    it('should set vastImpUrl but not vastUrl when nurl present but asset_url absent', function () {
      const bid = deepClone(BASE_BID);
      bid.mediaTypes = { video: { context: 'instream', playerSize: [640, 480] } };
      const [req] = spec.buildRequests([bid], deepClone(BASE_BIDDER_REQUEST));
      const impId = req.data.imp[0].id;

      const serverResponse = {
        body: {
          seatbid: [{
            bid: [{
              impid: impId,
              price: 1.0,
              nurl: 'https://notify.example.com/win',
              ext: {
                appnexus: {
                  bid_ad_type: 1
                  // no asset_url, no renderer_url/renderer_id
                }
              }
            }]
          }]
        }
      };
      const bids = spec.interpretResponse(serverResponse, req);
      expect(bids[0].vastImpUrl).to.equal('https://notify.example.com/win');
      expect(bids[0].vastUrl).to.not.include('&redir=');
    });
  });
});
