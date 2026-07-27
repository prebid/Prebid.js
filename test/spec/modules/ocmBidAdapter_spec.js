import { expect } from 'chai';
import { spec } from 'modules/ocmBidAdapter.js';
import * as utils from 'src/utils.js';
import { config } from 'src/config.js';
import { Renderer } from 'src/Renderer.js';
import { EVENT_TYPE_IMPRESSION, EVENT_TYPE_WIN, TRACKER_METHOD_IMG } from 'src/eventTrackers.js';
// Side-effect import: registers the price-floors ORTB processors the adapter relies on through
// pbsExtensions, so the floor pass-through test below exercises the real conversion path.
import 'modules/priceFloors.js';

const AUCTION_ENDPOINT = 'https://pbam.orangeclickmedia.com/openrtb2/auction';
const USER_SYNC_LOADER = 'https://pbam.orangeclickmedia.com/static/cookie_sync.html';
const USER_SYNC_REDIRECT = 'https://pbam.orangeclickmedia.com/cookie_sync/redirect';

describe('ocmBidAdapter', function () {
  const baseParams = { publisherId: 'pub-123', placementId: 'plc-456' };

  const bannerBid = {
    bidder: 'ocm',
    adUnitCode: 'div-banner',
    bidId: 'bid-banner-1',
    params: { ...baseParams },
    mediaTypes: { banner: { sizes: [[300, 250], [728, 90]] } }
  };

  const bannerBidderRequest = {
    bidderCode: 'ocm',
    bids: [bannerBid]
  };

  const videoBid = {
    bidder: 'ocm',
    adUnitCode: 'div-video',
    bidId: 'bid-video-1',
    params: { ...baseParams },
    mediaTypes: {
      video: {
        context: 'instream',
        playerSize: [[640, 480]],
        mimes: ['video/mp4'],
        protocols: [2, 3],
        maxduration: 30,
        minduration: 5
      }
    }
  };

  const nativeBid = {
    bidder: 'ocm',
    adUnitCode: 'div-native',
    bidId: 'bid-native-1',
    params: { ...baseParams },
    mediaTypes: {
      native: {
        ortb: {
          assets: [
            { id: 1, required: 1, title: { len: 80 } },
            { id: 2, required: 0, data: { type: 1 } }
          ]
        }
      }
    }
  };

  describe('isBidRequestValid', function () {
    it('returns true for a valid banner bid', function () {
      expect(spec.isBidRequestValid(bannerBid)).to.equal(true);
    });

    it('returns true for a valid instream video bid', function () {
      expect(spec.isBidRequestValid(videoBid)).to.equal(true);
    });

    it('returns true for a valid ORTB native bid', function () {
      expect(spec.isBidRequestValid(nativeBid)).to.equal(true);
    });

    it('returns false when publisherId is missing', function () {
      const bid = { ...bannerBid, params: { placementId: 'plc-456' } };
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('returns false when placementId is missing', function () {
      const bid = { ...bannerBid, params: { publisherId: 'pub-123' } };
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('returns false when publisherId is not a string', function () {
      const bid = { ...bannerBid, params: { publisherId: 123, placementId: 'plc-456' } };
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('returns false for a banner bid without sizes', function () {
      const bid = { ...bannerBid, mediaTypes: { banner: { sizes: [] } } };
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('returns false for a video bid without a valid context', function () {
      const bid = {
        ...videoBid,
        mediaTypes: { video: { context: 'invalid', playerSize: [[640, 480]] } }
      };
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    // isValid(NATIVE, ...) runs for every bid, so the native branch must tolerate a bid with no
    // mediaTypes at all rather than throwing while dereferencing mediaTypes.native.
    it('returns false (without throwing) for a bid that declares no mediaTypes', function () {
      const bid = { bidder: 'ocm', params: { ...baseParams } };
      expect(() => spec.isBidRequestValid(bid)).to.not.throw();
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    // Regression: a native video asset with minduration:0 must be accepted.
    // Before the fix the falsy `!asset.video.minduration` check rejected a legitimate 0.
    it('accepts a native video asset with minduration of 0', function () {
      const bid = {
        ...nativeBid,
        mediaTypes: {
          native: {
            ortb: {
              assets: [{
                id: 1,
                required: 1,
                video: { mimes: ['video/mp4'], minduration: 0, maxduration: 30, protocols: [2, 3] }
              }]
            }
          }
        }
      };
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });

    it('rejects a native video asset that is missing minduration', function () {
      const bid = {
        ...nativeBid,
        mediaTypes: {
          native: {
            ortb: {
              assets: [{
                id: 1,
                required: 1,
                video: { mimes: ['video/mp4'], maxduration: 30, protocols: [2, 3] }
              }]
            }
          }
        }
      };
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('rejects an ORTB native bid whose event tracker has no methods', function () {
      const bid = {
        ...nativeBid,
        mediaTypes: {
          native: {
            ortb: {
              assets: [{ id: 1, required: 1, title: { len: 80 } }],
              eventtrackers: [{ event: 1, methods: [] }]
            }
          }
        }
      };
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('accepts an ORTB native bid with a valid event tracker', function () {
      const bid = {
        ...nativeBid,
        mediaTypes: {
          native: {
            ortb: {
              assets: [{ id: 1, required: 1, title: { len: 80 } }],
              eventtrackers: [{ event: 1, methods: [1, 2] }]
            }
          }
        }
      };
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });

    it('returns false for a bid with no params object', function () {
      expect(spec.isBidRequestValid({ bidder: 'ocm' })).to.equal(false);
    });

    // isValidAsset rejection paths, reached through the ORTB native validation branch.
    it('rejects an ORTB native asset that has no valid integer id', function () {
      const bid = {
        ...nativeBid,
        mediaTypes: { native: { ortb: { assets: [{ required: 1, title: { len: 80 } }] } } }
      };
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('rejects an ORTB native asset with no content (title/img/data/video)', function () {
      const bid = {
        ...nativeBid,
        mediaTypes: { native: { ortb: { assets: [{ id: 1, required: 1 }] } } }
      };
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('rejects an ORTB native title asset that is missing a valid len', function () {
      const bid = {
        ...nativeBid,
        mediaTypes: { native: { ortb: { assets: [{ id: 1, required: 1, title: {} }] } } }
      };
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('rejects an ORTB native data asset that is missing a valid type', function () {
      const bid = {
        ...nativeBid,
        mediaTypes: { native: { ortb: { assets: [{ id: 1, required: 1, data: {} }] } } }
      };
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    // Legacy (non-ORTB) native path: mediaTypes.native carries no `ortb`, so the adapter converts
    // bid.nativeParams via toOrtbNativeRequest and validates the resulting assets.
    it('returns false for a legacy native bid with no nativeParams', function () {
      const bid = { ...nativeBid, mediaTypes: { native: {} } };
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('returns true for a legacy native bid whose nativeParams convert to a valid asset', function () {
      const bid = {
        ...nativeBid,
        mediaTypes: { native: {} },
        nativeParams: { title: { required: true, len: 80 } }
      };
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });
  });

  describe('buildRequests', function () {
    it('builds a single POST request to the OCM auction endpoint', function () {
      const request = spec.buildRequests([bannerBid], bannerBidderRequest);
      expect(request).to.be.an('object');
      expect(request.method).to.equal('POST');
      expect(request.url).to.equal(AUCTION_ENDPOINT);
      expect(request.data).to.be.an('object');
    });

    it('maps placementId into imp.ext.prebid.storedrequest.id', function () {
      const request = spec.buildRequests([bannerBid], bannerBidderRequest);
      const imp = request.data.imp[0];
      expect(imp.ext.prebid.storedrequest.id).to.equal('plc-456');
    });

    it('removes imp.ext.prebid.bidder so PBS resolves demand from the stored request', function () {
      const request = spec.buildRequests([bannerBid], bannerBidderRequest);
      const imp = request.data.imp[0];
      // The injected bidder.ocm params are what broke the stored-request setup; they must be gone.
      expect(imp.ext.prebid.bidder).to.equal(undefined);
      // storedrequest is preserved, and other PBS fields (e.g. adunitcode) are no longer whitelisted
      // away — the same mechanism that now lets price-floor data through.
      expect(imp.ext.prebid.storedrequest.id).to.equal('plc-456');
      expect(imp.ext.prebid.adunitcode).to.equal('div-banner');
    });

    it('passes price-floor data through to the OCM request', function () {
      // The price-floors module attaches getFloor to each bid during the auction; simulate that so
      // the pbsExtensions floor processors populate the imp during conversion.
      const flooredBid = { ...bannerBid, getFloor: () => ({ currency: 'USD', floor: 1.25 }) };
      const request = spec.buildRequests([flooredBid], { bidderCode: 'ocm', bids: [flooredBid] });
      const imp = request.data.imp[0];

      // Top-level OpenRTB floor (what PBS and downstream bidders read).
      expect(imp.bidfloor).to.equal(1.25);
      expect(imp.bidfloorcur).to.equal('USD');
      // PBS floorMin under ext.prebid.floors must survive the imp cleanup (previously stripped).
      expect(imp.ext.prebid.floors.floorMin).to.equal(1.25);
      // ...without losing the stored request.
      expect(imp.ext.prebid.storedrequest.id).to.equal('plc-456');
    });

    // Regression: publisherId must attach even when the converter did not pre-seed a publisher object.
    it('attaches publisherId to the site publisher object', function () {
      const request = spec.buildRequests([bannerBid], bannerBidderRequest);
      expect(request.data.site.publisher.id).to.equal('pub-123');
    });

    describe('tmax', function () {
      // PBS must answer early enough for the response to travel back and be parsed before Prebid's
      // auction timer fires, so the tmax it is given is the auction timeout minus a buffer, while the
      // un-buffered timeout is advertised as ext.tmaxmax.
      it('reserves a buffer out of the auction timeout and sends the full timeout as ext.tmaxmax', function () {
        const request = spec.buildRequests([bannerBid], { ...bannerBidderRequest, timeout: 1000 });
        expect(request.data.tmax).to.equal(800);
        expect(request.data.ext.tmaxmax).to.equal(1000);
      });

      // The buffer is capped proportionally, so a deliberately short timeout is not cut to nothing.
      it('caps the buffer at a quarter of a short auction timeout', function () {
        const request = spec.buildRequests([bannerBid], { ...bannerBidderRequest, timeout: 200 });
        expect(request.data.tmax).to.equal(150);
        expect(request.data.ext.tmaxmax).to.equal(200);
      });

      it('leaves a publisher-supplied ortb2.tmax untouched', function () {
        const request = spec.buildRequests([bannerBid], {
          ...bannerBidderRequest,
          timeout: 1000,
          ortb2: { tmax: 400 }
        });
        expect(request.data.tmax).to.equal(400);
        // The real ceiling is still reported, so PBS knows what the client will actually wait for.
        expect(request.data.ext.tmaxmax).to.equal(1000);
      });

      it('sends no tmax when the auction timeout is unknown', function () {
        const request = spec.buildRequests([bannerBid], bannerBidderRequest);
        expect(request.data.tmax).to.equal(undefined);
        expect(request.data.ext.tmaxmax).to.equal(undefined);
      });
    });
  });

  describe('interpretResponse', function () {
    const sampleResponse = {
      body: {
        id: 'auction-1',
        cur: 'USD',
        seatbid: [{
          seat: 'ocm',
          bid: [{
            id: 'bid-1',
            impid: 'bid-banner-1',
            price: 1.5,
            adm: '<div>OCM Ad</div>',
            adomain: ['example.com'],
            crid: 'creative-1',
            w: 300,
            h: 250,
            mtype: 1
          }]
        }]
      }
    };

    it('maps the ORTB response to Prebid bids with the OCM bidderCode', function () {
      const request = spec.buildRequests([bannerBid], bannerBidderRequest);
      const result = spec.interpretResponse(sampleResponse, request);
      expect(result).to.be.an('array').with.lengthOf(1);
      const bid = result[0];
      expect(bid.cpm).to.equal(1.5);
      expect(bid.currency).to.equal('USD');
      expect(bid.width).to.equal(300);
      expect(bid.height).to.equal(250);
      expect(bid.creativeId).to.equal('creative-1');
      expect(bid.bidderCode).to.equal('ocm');
      expect(bid.meta.advertiserDomains).to.deep.equal(['example.com']);
    });

    it('returns an array of bids (not the converter wrapper object)', function () {
      const request = spec.buildRequests([bannerBid], bannerBidderRequest);
      const result = spec.interpretResponse(sampleResponse, request);
      expect(result).to.be.an('array');
      expect(result.bids).to.equal(undefined);
    });

    it('returns no bids for an empty seatbid', function () {
      const request = spec.buildRequests([bannerBid], bannerBidderRequest);
      const result = spec.interpretResponse({ body: { id: 'auction-1', cur: 'USD', seatbid: [] } }, request);
      expect(result).to.be.an('array').that.is.empty;
    });

    // PBS resolves demand from real server-side seats, so seatbid[].seat is usually another bidder's
    // code. The converter's bidderCode override must re-attribute it to `ocm`, otherwise core drops
    // the bid as an unregistered alternate bidder code.
    it('re-attributes a bid returned under a server-side seat to the ocm bidderCode', function () {
      const request = spec.buildRequests([bannerBid], bannerBidderRequest);
      const seatResponse = {
        body: {
          ...sampleResponse.body,
          seatbid: [{ ...sampleResponse.body.seatbid[0], seat: 'appnexus' }]
        }
      };
      const bid = spec.interpretResponse(seatResponse, request)[0];
      expect(bid.bidderCode).to.equal('ocm');
    });
  });

  describe('native', function () {
    // Prebid core decorates each native bid request with `nativeOrtbRequest` (derived from
    // mediaTypes.native.ortb) before calling buildRequests; the ORTB converter reads that field to
    // populate imp.native. Replicate that decoration here so the native request path is exercised
    // exactly as it is in production.
    const nativeOrtbRequest = {
      ver: '1.2',
      assets: [
        { id: 1, required: 1, title: { len: 80 } },
        { id: 2, required: 1, img: { type: 3, w: 150, h: 150 } },
        { id: 3, required: 0, data: { type: 1 } }
      ]
    };
    const nativeRequestBid = { ...nativeBid, nativeOrtbRequest };
    const nativeBidderRequest = { bidderCode: 'ocm', bids: [nativeRequestBid] };

    // A native ORTB response: the creative markup (adm) is the JSON-serialised native object PBS
    // returns, and mtype 4 marks the bid as native (see ORTB_MTYPES in the mediaType processor).
    const nativeAdm = {
      ver: '1.2',
      link: { url: 'https://example.com/click' },
      assets: [
        { id: 1, title: { text: 'OCM Native Ad' } },
        { id: 2, img: { url: 'https://cdn.example.com/i.png', w: 150, h: 150 } }
      ]
    };
    function nativeResponse(impid) {
      return {
        body: {
          id: 'auction-native',
          cur: 'USD',
          seatbid: [{
            seat: 'ocm',
            bid: [{
              id: 'nbid-1',
              impid,
              price: 2.1,
              adm: JSON.stringify(nativeAdm),
              adomain: ['example.com'],
              crid: 'creative-native',
              mtype: 4
            }]
          }]
        }
      };
    }

    it('builds imp.native.request from the ad unit native ORTB request', function () {
      const request = spec.buildRequests([nativeRequestBid], nativeBidderRequest);
      const imp = request.data.imp[0];
      // imp.native is populated by the converter's native processor, which is compiled out when
      // FEATURES.NATIVE is disabled (e.g. the all-features-disabled test build); guard accordingly.
      if (FEATURES.NATIVE) {
        expect(imp.native).to.be.an('object');
        const parsed = JSON.parse(imp.native.request);
        expect(parsed.assets).to.have.lengthOf(3);
        expect(parsed.ver).to.equal('1.2');
      }
      // The stored-request wiring and PBS bidder-params cleanup apply to native imps as well.
      expect(imp.ext.prebid.storedrequest.id).to.equal('plc-456');
      expect(imp.ext.prebid.bidder).to.equal(undefined);
    });

    it('interprets a native ORTB response into bidResponse.native.ortb', function () {
      const request = spec.buildRequests([nativeRequestBid], nativeBidderRequest);
      const bid = spec.interpretResponse(nativeResponse('bid-native-1'), request)[0];
      expect(bid).to.exist;
      expect(bid.cpm).to.equal(2.1);
      expect(bid.bidderCode).to.equal('ocm');
      // mtype 4 maps to the native mediaType regardless of the native feature flag.
      expect(bid.mediaType).to.equal('native');
      // The native creative is parsed by the converter's native response processor (FEATURES.NATIVE).
      if (FEATURES.NATIVE) {
        expect(bid.native).to.be.an('object');
        expect(bid.native.ortb.assets).to.have.lengthOf(2);
        expect(bid.native.ortb.link.url).to.equal('https://example.com/click');
      }
      // Native bids never receive the outstream video renderer.
      expect(bid.renderer).to.equal(undefined);
    });

    it('validates and builds a multi-format (banner + video + native) ad unit', function () {
      const multiBid = {
        bidder: 'ocm',
        adUnitCode: 'div-multi',
        bidId: 'bid-multi-1',
        params: { ...baseParams },
        mediaTypes: {
          banner: { sizes: [[300, 250]] },
          video: { context: 'outstream', playerSize: [[640, 480]], mimes: ['video/mp4'], protocols: [2, 3] },
          native: { ortb: { assets: [{ id: 1, required: 1, title: { len: 80 } }] } }
        },
        nativeOrtbRequest: { assets: [{ id: 1, required: 1, title: { len: 80 } }] }
      };
      expect(spec.isBidRequestValid(multiBid)).to.equal(true);

      const request = spec.buildRequests([multiBid], { bidderCode: 'ocm', bids: [multiBid] });
      const imp = request.data.imp[0];
      expect(imp.banner).to.be.an('object');
      if (FEATURES.NATIVE) {
        expect(imp.native).to.be.an('object');
      }
      if (FEATURES.VIDEO) {
        expect(imp.video).to.be.an('object');
      }
    });
  });

  describe('PBS event trackers', function () {
    const IMP_URL = 'https://pbam.orangeclickmedia.com/event?t=imp&b=evt-bid-1&a=pub-123';
    const WIN_URL = 'https://pbam.orangeclickmedia.com/event?t=win&b=evt-bid-1&a=pub-123';

    // Builds a banner ORTB response for div-banner whose bid carries the PBS-generated win/impression
    // event URLs at bid.ext.prebid.events, mirroring an events-enabled Prebid Server response.
    function responseWithEvents(events) {
      return {
        body: {
          id: 'auction-evt',
          cur: 'USD',
          seatbid: [{
            seat: 'ocm',
            bid: [{
              id: 'evt-bid-1',
              impid: 'bid-banner-1',
              price: 1.5,
              adm: '<div>OCM Ad</div>',
              crid: 'creative-1',
              w: 300,
              h: 250,
              mtype: 1,
              ext: { prebid: { events } }
            }]
          }]
        }
      };
    }

    function trackersFor(bid, event) {
      return (bid.eventtrackers || []).filter((t) => t.event === event && t.method === TRACKER_METHOD_IMG);
    }

    it('registers the impression event URL as an image impression tracker so core fires it on billing', function () {
      const request = spec.buildRequests([bannerBid], bannerBidderRequest);
      const bid = spec.interpretResponse(responseWithEvents({ imp: IMP_URL }), request)[0];
      const impTrackers = trackersFor(bid, EVENT_TYPE_IMPRESSION);
      expect(impTrackers).to.have.lengthOf(1);
      expect(impTrackers[0].url).to.equal(IMP_URL);
    });

    // The win tracker itself is registered by the shared pbsExtensions processor (addEventTrackers),
    // not by the adapter's addPbsEventTrackers; this asserts the end-to-end result: an interpreted OCM
    // bid carries the win URL as a WIN image tracker so core fires it on win.
    it('registers the win event URL as an image win tracker so core fires it when the bid wins', function () {
      const request = spec.buildRequests([bannerBid], bannerBidderRequest);
      const bid = spec.interpretResponse(responseWithEvents({ win: WIN_URL }), request)[0];
      const winTrackers = trackersFor(bid, EVENT_TYPE_WIN);
      expect(winTrackers).to.have.lengthOf(1);
      expect(winTrackers[0].url).to.equal(WIN_URL);
    });

    it('registers both the win and impression trackers when PBS supplies both', function () {
      const request = spec.buildRequests([bannerBid], bannerBidderRequest);
      const bid = spec.interpretResponse(responseWithEvents({ imp: IMP_URL, win: WIN_URL }), request)[0];
      expect(trackersFor(bid, EVENT_TYPE_IMPRESSION)).to.have.lengthOf(1);
      expect(trackersFor(bid, EVENT_TYPE_WIN)).to.have.lengthOf(1);
    });

    it('does not duplicate the win tracker already added by the shared pbsExtensions processor', function () {
      const request = spec.buildRequests([bannerBid], bannerBidderRequest);
      const bid = spec.interpretResponse(responseWithEvents({ win: WIN_URL }), request)[0];
      expect(trackersFor(bid, EVENT_TYPE_WIN)).to.have.lengthOf(1);
    });

    // The shared pbsExtensions processor maps a legacy bid.burl to an impression tracker; when PBS sets
    // burl to the same /event URL as events.imp, the adapter's dedup guard must keep a single tracker.
    it('does not duplicate the impression tracker when burl matches the impression event URL', function () {
      const request = spec.buildRequests([bannerBid], bannerBidderRequest);
      const response = responseWithEvents({ imp: IMP_URL });
      response.body.seatbid[0].bid[0].burl = IMP_URL;
      const bid = spec.interpretResponse(response, request)[0];
      const impTrackers = trackersFor(bid, EVENT_TYPE_IMPRESSION);
      expect(impTrackers).to.have.lengthOf(1);
      expect(impTrackers[0].url).to.equal(IMP_URL);
    });

    it('adds no win/impression trackers when the bid carries no ext.prebid.events', function () {
      const request = spec.buildRequests([bannerBid], bannerBidderRequest);
      const bareResponse = {
        body: {
          id: 'auction-bare',
          cur: 'USD',
          seatbid: [{ seat: 'ocm', bid: [{ id: 'bare-1', impid: 'bid-banner-1', price: 1, adm: '<div></div>', crid: 'c', w: 300, h: 250, mtype: 1 }] }]
        }
      };
      const bid = spec.interpretResponse(bareResponse, request)[0];
      expect(trackersFor(bid, EVENT_TYPE_IMPRESSION)).to.have.lengthOf(0);
      expect(trackersFor(bid, EVENT_TYPE_WIN)).to.have.lengthOf(0);
    });
  });

  describe('outstream renderer', function () {
    const RENDERER_URL = 'https://cdn.orangeclickmedia.com/tech/libs/ocm-player.js';

    const outstreamVideoBid = {
      bidder: 'ocm',
      adUnitCode: 'div-video-outstream',
      bidId: 'bid-video-outstream-1',
      params: { ...baseParams },
      mediaTypes: {
        video: {
          context: 'outstream',
          playerSize: [[640, 480]],
          mimes: ['video/mp4'],
          protocols: [2, 3]
        }
      }
    };
    const outstreamBidderRequest = { bidderCode: 'ocm', bids: [outstreamVideoBid] };

    // Builds an ORTB video response (mtype 2) whose bid maps to `impid`; carries both an inline VAST
    // document (adm -> vastXml) and a hosted VAST URL (nurl -> vastUrl).
    function videoResponse(impid) {
      return {
        body: {
          id: 'auction-v',
          cur: 'USD',
          seatbid: [{
            seat: 'ocm',
            bid: [{
              id: 'vbid-1',
              impid,
              price: 3.2,
              adm: '<VAST version="4.0"></VAST>',
              nurl: 'https://vast.orangeclickmedia.com/v.xml',
              adomain: ['example.com'],
              crid: 'creative-v',
              w: 640,
              h: 480,
              mtype: 2
            }]
          }]
        }
      };
    }

    afterEach(function () {
      delete window.OcmPlayer;
      const node = document.getElementById('div-video-outstream');
      if (node) node.remove();
    });

    it('attaches the OCM renderer to outstream video bids', function () {
      const request = spec.buildRequests([outstreamVideoBid], outstreamBidderRequest);
      const bid = spec.interpretResponse(videoResponse('bid-video-outstream-1'), request)[0];
      expect(bid.mediaType).to.equal('video');
      expect(bid.renderer).to.exist;
      expect(bid.renderer.url).to.equal(RENDERER_URL);
    });

    it('does not attach a renderer to instream video bids', function () {
      const request = spec.buildRequests([videoBid], { bidderCode: 'ocm', bids: [videoBid] });
      const bid = spec.interpretResponse(videoResponse('bid-video-1'), request)[0];
      expect(bid.mediaType).to.equal('video');
      expect(bid.renderer).to.equal(undefined);
    });

    it('does not attach a renderer to banner bids', function () {
      const request = spec.buildRequests([bannerBid], bannerBidderRequest);
      const bid = spec.interpretResponse({
        body: {
          id: 'auction-b',
          cur: 'USD',
          seatbid: [{ seat: 'ocm', bid: [{ id: 'b1', impid: 'bid-banner-1', price: 1, adm: '<div></div>', crid: 'c', w: 300, h: 250, mtype: 1 }] }]
        }
      }, request)[0];
      expect(bid.renderer).to.equal(undefined);
    });

    it('does not override a publisher-defined (non-backupOnly) renderer', function () {
      const pubBid = {
        ...outstreamVideoBid,
        mediaTypes: {
          video: {
            ...outstreamVideoBid.mediaTypes.video,
            renderer: { url: 'https://pub.example/r.js', render: () => {}, backupOnly: false }
          }
        }
      };
      const request = spec.buildRequests([pubBid], { bidderCode: 'ocm', bids: [pubBid] });
      const bid = spec.interpretResponse(videoResponse('bid-video-outstream-1'), request)[0];
      expect(bid.renderer).to.equal(undefined);
    });

    // Regression: the documented override shape (mediaTypes.video.renderer.options, an options-only
    // holder with no url/render) must NOT be mistaken for a publisher renderer. Otherwise the OCM
    // renderer is skipped and the outstream bid is left with no renderer at all. Core only prefers
    // an ad-unit renderer that defines both url and render (isRendererPreferredFromAdUnit).
    it('installs the OCM renderer when the ad unit only supplies renderer.options (documented override)', function () {
      const optionsBid = {
        ...outstreamVideoBid,
        mediaTypes: {
          video: {
            ...outstreamVideoBid.mediaTypes.video,
            renderer: { options: { player: { muted: false, autoplay: false } } }
          }
        }
      };
      const request = spec.buildRequests([optionsBid], { bidderCode: 'ocm', bids: [optionsBid] });
      const bid = spec.interpretResponse(videoResponse('bid-video-outstream-1'), request)[0];
      expect(bid.renderer).to.exist;
      expect(bid.renderer.url).to.equal(RENDERER_URL);
      // The publisher's options ride along on the OCM renderer config (merged into the player at render time).
      expect(bid.renderer.getConfig()).to.deep.equal({ player: { muted: false, autoplay: false } });
    });

    it('installs the OCM renderer over a publisher renderer flagged backupOnly', function () {
      const backupBid = {
        ...outstreamVideoBid,
        mediaTypes: {
          video: {
            ...outstreamVideoBid.mediaTypes.video,
            renderer: { url: 'https://pub.example/r.js', render: () => {}, backupOnly: true }
          }
        }
      };
      const request = spec.buildRequests([backupBid], { bidderCode: 'ocm', bids: [backupBid] });
      const bid = spec.interpretResponse(videoResponse('bid-video-outstream-1'), request)[0];
      expect(bid.renderer).to.exist;
      expect(bid.renderer.url).to.equal(RENDERER_URL);
    });

    it('renders an outstream bid through window.OcmPlayer with the bid VAST and player size', function () {
      const request = spec.buildRequests([outstreamVideoBid], outstreamBidderRequest);
      const bid = spec.interpretResponse(videoResponse('bid-video-outstream-1'), request)[0];
      // Prebid core populates adUnitCode/adId on the bid before invoking the renderer; replicate that.
      bid.adUnitCode = outstreamVideoBid.adUnitCode;
      bid.adId = 'ad-id-1';

      const slot = document.createElement('div');
      slot.id = outstreamVideoBid.adUnitCode;
      document.body.appendChild(slot);
      window.OcmPlayer = sinon.spy();

      // loaded=true makes renderer.push() run synchronously; invoking the render fn directly avoids
      // depending on loadExternalScript fetching the player script over the network.
      bid.renderer.loaded = true;
      bid.renderer._render(bid);

      expect(window.OcmPlayer.calledOnce).to.equal(true);
      const [containerId, config] = window.OcmPlayer.firstCall.args;
      expect(containerId).to.match(/^ocm-player-wrapper-/);
      expect(document.getElementById(containerId)).to.exist;
      // vastUrl is populated by the ORTB converter's video response processor, which is compiled out
      // when FEATURES.VIDEO is disabled (e.g. the all-features-disabled test build), so guard this
      // assertion; the player dimensions below derive from bid.w/bid.h and hold either way.
      if (FEATURES.VIDEO) {
        expect(config.ads.preroll[0].waterfall[0].vast.url).to.equal('https://vast.orangeclickmedia.com/v.xml');
      }
      expect(config.player.width).to.equal('640px');
      expect(config.player.height).to.equal('480px');
      expect(config.player.outstream.type).to.equal('in-article');
    });

    it('logs an error without throwing when window.OcmPlayer is unavailable', function () {
      const request = spec.buildRequests([outstreamVideoBid], outstreamBidderRequest);
      const bid = spec.interpretResponse(videoResponse('bid-video-outstream-1'), request)[0];
      bid.adUnitCode = outstreamVideoBid.adUnitCode;
      delete window.OcmPlayer;
      const stub = sinon.stub(utils, 'logError');

      bid.renderer.loaded = true;
      expect(() => bid.renderer._render(bid)).to.not.throw();
      expect(stub.called).to.equal(true);
      stub.restore();
    });

    it('logs an error without throwing when setRender fails while installing the renderer', function () {
      // Force the installed renderer's setRender to throw so createRenderer's defensive catch runs.
      const logErr = sinon.stub(utils, 'logError');
      const installStub = sinon.stub(Renderer, 'install').returns({
        setRender() { throw new Error('setRender failed'); }
      });
      try {
        const request = spec.buildRequests([outstreamVideoBid], outstreamBidderRequest);
        expect(() => spec.interpretResponse(videoResponse('bid-video-outstream-1'), request)).to.not.throw();
        expect(logErr.called).to.equal(true);
      } finally {
        installStub.restore();
        logErr.restore();
      }
    });

    it('logs an error when the outstream container element cannot be found', function () {
      const request = spec.buildRequests([outstreamVideoBid], outstreamBidderRequest);
      const bid = spec.interpretResponse(videoResponse('bid-video-outstream-1'), request)[0];
      // Point the bid at an ad-slot id that is not present in the DOM.
      bid.adUnitCode = 'ocm-missing-slot';
      window.OcmPlayer = sinon.spy();
      const logErr = sinon.stub(utils, 'logError');

      bid.renderer.loaded = true;
      expect(() => bid.renderer._render(bid)).to.not.throw();
      // The player is never instantiated when its container is missing.
      expect(window.OcmPlayer.called).to.equal(false);
      expect(logErr.called).to.equal(true);
      logErr.restore();
    });

    it('logs a ready message when the OCM player invokes its ready callback', function () {
      const request = spec.buildRequests([outstreamVideoBid], outstreamBidderRequest);
      const bid = spec.interpretResponse(videoResponse('bid-video-outstream-1'), request)[0];
      bid.adUnitCode = outstreamVideoBid.adUnitCode;
      bid.adId = 'ad-id-ready';

      const slot = document.createElement('div');
      slot.id = outstreamVideoBid.adUnitCode;
      document.body.appendChild(slot);
      const logMsg = sinon.stub(utils, 'logMessage');
      // Invoke the ready callback the adapter passes as the player's third argument.
      window.OcmPlayer = (containerId, config, cb) => cb();

      bid.renderer.loaded = true;
      bid.renderer._render(bid);

      expect(logMsg.called).to.equal(true);
      logMsg.restore();
    });

    it('logs an error without throwing when the OCM player throws while rendering', function () {
      const request = spec.buildRequests([outstreamVideoBid], outstreamBidderRequest);
      const bid = spec.interpretResponse(videoResponse('bid-video-outstream-1'), request)[0];
      bid.adUnitCode = outstreamVideoBid.adUnitCode;

      const slot = document.createElement('div');
      slot.id = outstreamVideoBid.adUnitCode;
      document.body.appendChild(slot);
      const logErr = sinon.stub(utils, 'logError');
      window.OcmPlayer = () => { throw new Error('player boom'); };

      bid.renderer.loaded = true;
      expect(() => bid.renderer._render(bid)).to.not.throw();
      expect(logErr.called).to.equal(true);
      logErr.restore();
    });
  });

  describe('getUserSyncs', function () {
    const syncResponses = [{ body: { ext: { responsetimemillis: { appnexus: 80, rubicon: 120 } } } }];
    // GDPR applies and purpose 1 (device storage/access) is consented — the shape cookie syncing needs.
    const purpose1Consent = {
      gdprApplies: true,
      consentString: 'consent-xyz',
      vendorData: { purpose: { consents: { 1: true } } }
    };

    let filterSettingsBefore;

    // Reads back the filterSettings object the adapter forwards to PBS /cookie_sync.
    function forwardedFilterSettings(url) {
      const match = /[?&]filterSettings=([^&]*)/.exec(url);
      return match ? JSON.parse(decodeURIComponent(match[1])) : undefined;
    }

    function setFilterSettings(filterSettings) {
      config.setConfig({ userSync: { filterSettings } });
    }

    beforeEach(function () {
      filterSettingsBefore = config.getConfig('userSync.filterSettings');
    });

    afterEach(function () {
      config.setConfig({ coppa: false, userSync: { filterSettings: filterSettingsBefore } });
    });

    it('returns no syncs (and warns) when neither iframe nor image syncing is enabled', function () {
      const warn = sinon.stub(utils, 'logWarn');
      try {
        expect(spec.getUserSyncs({ iframeEnabled: false, pixelEnabled: false }, syncResponses)).to.deep.equal([]);
        expect(warn.called).to.equal(true);
      } finally {
        warn.restore();
      }
    });

    it('returns no syncs when the auction response lists no bidders', function () {
      expect(spec.getUserSyncs({ iframeEnabled: true }, [{ body: {} }])).to.deep.equal([]);
    });

    it('returns an iframe sync to the loader page with the bidders from the response', function () {
      const syncs = spec.getUserSyncs({ iframeEnabled: true }, syncResponses);
      expect(syncs).to.have.lengthOf(1);
      expect(syncs[0].type).to.equal('iframe');
      expect(syncs[0].url.indexOf(USER_SYNC_LOADER)).to.equal(0);
      expect(decodeURIComponent(syncs[0].url)).to.contain('bidders=appnexus,rubicon');
      expect(syncs[0].url).to.contain('limit=10');
    });

    // Core's default filterSettings enable image syncs only, so this is the path most publishers get;
    // returning [] here (the old behaviour) meant they silently synced nothing at all.
    it('falls back to an image sync to the redirect endpoint when only image syncing is enabled', function () {
      const syncs = spec.getUserSyncs({ iframeEnabled: false, pixelEnabled: true }, syncResponses);
      expect(syncs).to.have.lengthOf(1);
      expect(syncs[0].type).to.equal('image');
      expect(syncs[0].url.indexOf(USER_SYNC_REDIRECT)).to.equal(0);
      expect(decodeURIComponent(syncs[0].url)).to.contain('bidders=appnexus,rubicon');
      expect(syncs[0].url).to.contain('limit=10');
    });

    // The loader can drop both iframe and redirect syncs, so it wins whenever it is allowed.
    it('prefers the iframe loader when both sync types are enabled', function () {
      const syncs = spec.getUserSyncs({ iframeEnabled: true, pixelEnabled: true }, syncResponses);
      expect(syncs[0].type).to.equal('iframe');
      expect(syncs[0].url.indexOf(USER_SYNC_LOADER)).to.equal(0);
    });

    it('derives bidders from seatbid seats when responsetimemillis is absent', function () {
      const responses = [{ body: { seatbid: [{ seat: 'pubmatic' }, { seat: 'ix' }] } }];
      const syncs = spec.getUserSyncs({ iframeEnabled: true }, responses);
      expect(decodeURIComponent(syncs[0].url)).to.contain('bidders=pubmatic,ix');
    });

    it('disables PBS cooperative syncing so only auction participants are synced', function () {
      const syncs = spec.getUserSyncs({ iframeEnabled: true }, syncResponses);
      expect(syncs[0].url).to.contain('coopSync=0');
    });

    describe('filterSettings forwarding', function () {
      // A sync type Prebid did not authorise for ocm has to be blocked explicitly: PBS treats an
      // absent per-type filter as "allowed for every bidder".
      it('blocks the sync type Prebid did not authorise', function () {
        setFilterSettings({ iframe: { bidders: '*', filter: 'include' } });
        const syncs = spec.getUserSyncs({ iframeEnabled: true, pixelEnabled: false }, syncResponses);
        expect(forwardedFilterSettings(syncs[0].url)).to.deep.equal({
          iframe: { bidders: '*', filter: 'include' },
          image: { bidders: '*', filter: 'exclude' }
        });
      });

      // The point of the fix: the publisher's own per-bidder object reaches PBS, so the downstream
      // syncs obey it too — not just a coarse "iframe,image" type list.
      it('forwards the publisher per-bidder list for the enabled type', function () {
        setFilterSettings({ iframe: { bidders: ['ocm', 'bidderA', 'bidderB'], filter: 'include' } });
        const syncs = spec.getUserSyncs({ iframeEnabled: true }, syncResponses);
        expect(forwardedFilterSettings(syncs[0].url).iframe).to.deep.equal({
          bidders: ['bidderA', 'bidderB'],
          filter: 'include'
        });
      });

      it('preserves an exclude filter', function () {
        setFilterSettings({ image: { bidders: ['bidderB'], filter: 'exclude' } });
        const syncs = spec.getUserSyncs({ iframeEnabled: false, pixelEnabled: true }, syncResponses);
        expect(forwardedFilterSettings(syncs[0].url).image).to.deep.equal({
          bidders: ['bidderB'],
          filter: 'exclude'
        });
      });

      // `bidders: ['ocm']` (the shape the adapter's docs recommend) authorises the OCM sync itself;
      // it must not be forwarded literally, or PBS would allow no server-side bidder at all.
      it('authorises every PBS-side bidder when the publisher only named ocm', function () {
        setFilterSettings({ iframe: { bidders: ['ocm'], filter: 'include' } });
        const syncs = spec.getUserSyncs({ iframeEnabled: true }, syncResponses);
        expect(forwardedFilterSettings(syncs[0].url).iframe).to.deep.equal({
          bidders: '*',
          filter: 'include'
        });
      });

      it('applies filterSettings.all to both sync types', function () {
        setFilterSettings({ all: { bidders: ['bidderA'], filter: 'include' } });
        const syncs = spec.getUserSyncs({ iframeEnabled: true, pixelEnabled: true }, syncResponses);
        expect(forwardedFilterSettings(syncs[0].url)).to.deep.equal({
          iframe: { bidders: ['bidderA'], filter: 'include' },
          image: { bidders: ['bidderA'], filter: 'include' }
        });
      });

      it('allows all bidders for an enabled type the publisher did not configure', function () {
        setFilterSettings({ image: { bidders: '*', filter: 'include' } });
        const syncs = spec.getUserSyncs({ iframeEnabled: true, pixelEnabled: true }, syncResponses);
        expect(forwardedFilterSettings(syncs[0].url).iframe).to.deep.equal({
          bidders: '*',
          filter: 'include'
        });
      });
    });

    describe('privacy gates', function () {
      it('registers no syncs when COPPA is enabled', function () {
        config.setConfig({ coppa: true });
        const warn = sinon.stub(utils, 'logWarn');
        try {
          expect(spec.getUserSyncs({ iframeEnabled: true }, syncResponses)).to.deep.equal([]);
          expect(warn.called).to.equal(true);
        } finally {
          warn.restore();
        }
      });

      it('registers no syncs when GDPR applies without purpose 1 consent', function () {
        const warn = sinon.stub(utils, 'logWarn');
        try {
          const syncs = spec.getUserSyncs({ iframeEnabled: true }, syncResponses, {
            gdprApplies: true,
            consentString: 'consent-xyz',
            vendorData: { purpose: { consents: { 1: false } } }
          });
          expect(syncs).to.deep.equal([]);
          expect(warn.called).to.equal(true);
        } finally {
          warn.restore();
        }
      });

      it('registers syncs when purpose 1 consent is given', function () {
        const syncs = spec.getUserSyncs({ iframeEnabled: true }, syncResponses, purpose1Consent);
        expect(syncs).to.have.lengthOf(1);
      });

      it('registers syncs when GDPR does not apply', function () {
        const syncs = spec.getUserSyncs({ iframeEnabled: true }, syncResponses, { gdprApplies: false });
        expect(syncs).to.have.lengthOf(1);
      });
    });

    it('includes the account echoed by PBS in the auction response', function () {
      const responses = [{ body: { ext: { account: 'echoed-789', responsetimemillis: { appnexus: 80 } } } }];
      const syncs = spec.getUserSyncs({ iframeEnabled: true }, responses);
      expect(syncs[0].url).to.contain('account=echoed-789');
    });

    it('scopes the sync account to the auction response and never a captured fallback', function () {
      // Regression: the cookie_sync account must come only from THIS auction's response (ext.account),
      // not from a module-level value captured during buildRequests — otherwise an overlapping auction
      // could leak its publisher account into this sync. buildRequests runs first (it used to capture
      // account=pub-123) but the response below echoes no account, so no account must be emitted.
      spec.buildRequests([bannerBid], bannerBidderRequest);
      const syncs = spec.getUserSyncs({ iframeEnabled: true }, syncResponses);
      expect(syncs[0].url).to.not.contain('account=');
    });

    it('forwards GDPR, USP and GPP consent', function () {
      const syncs = spec.getUserSyncs(
        { iframeEnabled: true },
        syncResponses,
        purpose1Consent,
        '1YNN',
        { gppString: 'DBACNYA', applicableSections: [7, 8] }
      );
      const url = syncs[0].url;
      expect(url).to.contain('gdpr=1');
      expect(url).to.contain('gdpr_consent=consent-xyz');
      expect(url).to.contain('us_privacy=1YNN');
      expect(url).to.contain('gpp=DBACNYA');
      expect(decodeURIComponent(url)).to.contain('gpp_sid=7,8');
    });

    // Consent signals must ride along on the image path too, not just the iframe loader.
    it('forwards consent on the image fallback as well', function () {
      const syncs = spec.getUserSyncs(
        { iframeEnabled: false, pixelEnabled: true },
        syncResponses,
        purpose1Consent,
        '1YNN'
      );
      expect(syncs[0].type).to.equal('image');
      expect(syncs[0].url).to.contain('gdpr=1');
      expect(syncs[0].url).to.contain('gdpr_consent=consent-xyz');
      expect(syncs[0].url).to.contain('us_privacy=1YNN');
    });
  });

  describe('billing (burl)', function () {
    // burl is fired by Prebid core via the impression event tracker that the shared pbsExtensions
    // processor registers (see the PBS event trackers suite), not by the adapter — so there is no
    // onBidWon handler that would double-fire it on win.
    it('registers no onBidWon handler (core fires burl at billing time)', function () {
      expect(spec.onBidWon).to.equal(undefined);
    });

    it('exposes a PBS burl as an image impression tracker so core fires it at billing', function () {
      const request = spec.buildRequests([bannerBid], bannerBidderRequest);
      const BURL = 'https://pbam.orangeclickmedia.com/event?t=imp&b=burl-1&a=pub-123';
      const response = {
        body: {
          id: 'auction-burl',
          cur: 'USD',
          seatbid: [{
            seat: 'ocm',
            bid: [{ id: 'burl-1', impid: 'bid-banner-1', price: 1.5, adm: '<div></div>', crid: 'c', w: 300, h: 250, mtype: 1, burl: BURL }]
          }]
        }
      };
      const bid = spec.interpretResponse(response, request)[0];
      const impTrackers = (bid.eventtrackers || []).filter((t) => t.event === EVENT_TYPE_IMPRESSION && t.method === TRACKER_METHOD_IMG);
      expect(impTrackers.map((t) => t.url)).to.include(BURL);
    });
  });

  describe('onTimeout', function () {
    it('logs a warning without throwing', function () {
      const stub = sinon.stub(utils, 'logWarn');
      expect(() => spec.onTimeout([{ bidder: 'ocm', timeout: 3000 }])).to.not.throw();
      expect(stub.calledOnce).to.equal(true);
      stub.restore();
    });
  });

  describe('onBidderError', function () {
    it('logs an error without throwing', function () {
      const stub = sinon.stub(utils, 'logError');
      expect(() => spec.onBidderError({ error: { status: 500 }, bidderRequest: {} })).to.not.throw();
      expect(stub.calledOnce).to.equal(true);
      stub.restore();
    });
  });
});
