import { expect } from 'chai';
import { spec } from 'modules/biddigiBidAdapter.js';
import { newBidder } from 'src/adapters/bidderFactory.js';
import { config } from 'src/config.js';
import { addFPDToBidderRequest } from '../../helpers/fpd.js';

// load modules that register ORTB processors / are exercised indirectly by the converter
import 'src/prebid.js';
import 'modules/currency.js';
import 'modules/userId/index.js';
import 'modules/priceFloors.js';
import 'modules/consentManagementTcf.js';
import 'modules/consentManagementUsp.js';
import 'modules/consentManagementGpp.js';
import 'modules/schain.js';

const BANNER_BID_REQUEST = {
  bidder: 'biddigi',
  params: {
    placementId: 'placement-123',
    publisherId: 'publisher-abc',
  },
  mediaTypes: {
    banner: {
      sizes: [[300, 250], [300, 600]],
    },
  },
  adUnitCode: '/adunit-code/test-path',
  bidId: 'test-bid-id-1',
  bidderRequestId: 'test-bid-request-1',
  auctionId: 'test-auction-1',
  transactionId: 'test-transactionId-1',
  timeout: 1000,
};

const VIDEO_BID_REQUEST = {
  bidder: 'biddigi',
  params: {
    placementId: 'placement-video-1',
    publisherId: 'publisher-abc',
    region: 'us',
  },
  mediaTypes: {
    video: {
      playerSize: [640, 480],
      context: 'instream',
      mimes: ['video/mp4'],
      protocols: [2, 5],
      minduration: 5,
      maxduration: 30,
    },
  },
  adUnitCode: '/adunit-code/video-path',
  bidId: 'test-bid-id-2',
  bidderRequestId: 'test-bid-request-1',
  auctionId: 'test-auction-1',
  transactionId: 'test-transactionId-2',
  timeout: 1000,
};

const NATIVE_BID_REQUEST = {
  bidder: 'biddigi',
  params: {
    placementId: 'placement-native-1',
    publisherId: 'publisher-abc',
  },
  mediaTypes: {
    native: {
      title: { required: true, len: 80 },
      image: { required: true },
      sponsoredBy: { required: true },
      clickUrl: { required: true },
      body: { required: false },
    },
  },
  // Normally populated by Prebid core's native-params normalization (src/native.js) before
  // buildRequests() is ever called; supplied directly here since this unit test calls
  // buildRequests() in isolation. See libraries/ortbConverter/processors/native.js#fillNativeImp.
  nativeOrtbRequest: {
    ver: '1.2',
    assets: [
      { id: 0, required: 1, title: { len: 80 } },
      { id: 1, required: 1, img: { type: 3 } },
      { id: 2, required: 1, data: { type: 1 } },
    ],
  },
  adUnitCode: '/adunit-code/native-path',
  bidId: 'test-bid-id-3',
  bidderRequestId: 'test-bid-request-1',
  auctionId: 'test-auction-1',
  transactionId: 'test-transactionId-3',
  timeout: 1000,
};

const bidderRequest = {
  bidderCode: 'biddigi',
  refererInfo: {
    page: 'https://publisher.example/home',
    ref: 'https://referrer.example',
  },
};

describe('biddigiAdapter', function () {
  const adapter = newBidder(spec);

  describe('inherited functions', function () {
    it('exists and is a function', function () {
      expect(adapter.callBids).to.exist.and.to.be.a('function');
    });
  });

  describe('isBidRequestValid', function () {
    it('returns true when placementId and publisherId are present', function () {
      expect(spec.isBidRequestValid(BANNER_BID_REQUEST)).to.equal(true);
    });

    it('returns false when placementId is missing', function () {
      const bid = JSON.parse(JSON.stringify(BANNER_BID_REQUEST));
      delete bid.params.placementId;
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('returns false when publisherId is missing', function () {
      const bid = JSON.parse(JSON.stringify(BANNER_BID_REQUEST));
      delete bid.params.publisherId;
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('returns false when params is entirely absent', function () {
      expect(spec.isBidRequestValid({ bidder: 'biddigi' })).to.equal(false);
    });
  });

  describe('buildRequests', function () {
    it('returns an empty array when there are no valid bid requests', async function () {
      const built = spec.buildRequests([], await addFPDToBidderRequest(bidderRequest));
      expect(built).to.be.an('array').that.is.empty;
    });

    it('builds a well-formed oRTB POST request for a banner bid', async function () {
      const built = spec.buildRequests([BANNER_BID_REQUEST], await addFPDToBidderRequest(bidderRequest));
      expect(built.method).to.equal('POST');
      expect(built.url).to.equal('https://biddigi-auction-service.biddigi25.workers.dev/openrtb2/auction'); // default region 'in'
      expect(built.data).to.be.an('object');
      expect(built.data).to.have.property('id');
      expect(built.data).to.have.property('imp');
      expect(built.data.imp[0].banner).to.exist;
      expect(built.data.imp[0].banner.format[0].w).to.be.a('number');
      expect(built.data.imp[0].ext.biddigi).to.deep.equal({
        placementId: 'placement-123',
        publisherId: 'publisher-abc',
      });
      expect(built.data.cur).to.deep.equal(['INR']);
    });

    it('still resolves to the (single, global) endpoint when params.region is set', async function () {
      // BidDigi's auction-service runs as one Cloudflare Worker on Cloudflare's global edge
      // network rather than one host per region, so every region key in BIDDIGI_ENDPOINTS
      // resolves to the same URL — this just confirms setting `region` doesn't break that.
      const built = spec.buildRequests([VIDEO_BID_REQUEST], await addFPDToBidderRequest(bidderRequest));
      expect(built.url).to.equal('https://biddigi-auction-service.biddigi25.workers.dev/openrtb2/auction');
    });

    // FEATURES.VIDEO / FEATURES.NATIVE are webpack-injected globals (no import needed) --
    // Prebid.js's CI also runs an "all features disabled" build/test job specifically to catch
    // modules that assume optional features are always present. libraries/ortbConverter's video
    // and native imp processors are conditionally compiled out under that build, so imp.video /
    // imp.native legitimately don't exist there -- every other adapter's spec in this repo guards
    // these same assertions the same way (e.g. test/spec/modules/pubmaticBidAdapter_spec.js,
    // limelightDigitalBidAdapter_spec.js).
    if (FEATURES.VIDEO) {
      it('builds a well-formed oRTB video imp', async function () {
        const built = spec.buildRequests([VIDEO_BID_REQUEST], await addFPDToBidderRequest(bidderRequest));
        expect(built.data.imp[0].video).to.exist;
        expect(built.data.imp[0].video.mimes).to.include('video/mp4');
      });
    }

    if (FEATURES.NATIVE) {
      it('builds a well-formed oRTB native imp', async function () {
        const built = spec.buildRequests([NATIVE_BID_REQUEST], await addFPDToBidderRequest(bidderRequest));
        expect(built.data.imp[0].native).to.exist;
        expect(built.data.imp[0].native.request).to.be.a('string');
      });
    }

    it('passes through an explicit bidfloor when provided', async function () {
      const bid = JSON.parse(JSON.stringify(BANNER_BID_REQUEST));
      bid.params.bidfloor = 12.5;
      bid.params.bidfloorcur = 'INR';
      const built = spec.buildRequests([bid], await addFPDToBidderRequest(bidderRequest));
      expect(built.data.imp[0].bidfloor).to.equal(12.5);
      expect(built.data.imp[0].bidfloorcur).to.equal('INR');
    });

    it('sends the GDPR consent string when present', async function () {
      const built = spec.buildRequests([BANNER_BID_REQUEST], await addFPDToBidderRequest({
        ...bidderRequest,
        gdprConsent: {
          apiVersion: 2,
          consentString: 'CONSENT_STRING',
          gdprApplies: true,
        },
      }));
      expect(built.data.user.ext.consent).to.equal('CONSENT_STRING');
      expect(built.data.regs.ext.gdpr).to.equal(1);
    });

    it('sends the USP consent string when present', async function () {
      const built = spec.buildRequests([BANNER_BID_REQUEST], await addFPDToBidderRequest({
        ...bidderRequest,
        uspConsent: '1YYY',
      }));
      expect(built.data.regs.ext.us_privacy).to.equal('1YYY');
    });

    it('sets test=1 when Prebid debug mode is on', async function () {
      const stub = sinon.stub(config, 'getConfig');
      stub.withArgs('debug').returns(true);
      const built = spec.buildRequests([BANNER_BID_REQUEST], await addFPDToBidderRequest(bidderRequest));
      expect(built.data.test).to.equal(1);
      stub.restore();
    });
  });

  describe('interpretResponse', function () {
    it('returns an empty array for a null/empty response', function () {
      expect(spec.interpretResponse(null, { data: {} })).to.deep.equal([]);
      expect(spec.interpretResponse({}, { data: {} })).to.deep.equal([]);
    });

    it('interprets a banner bid response', async function () {
      const request = spec.buildRequests([BANNER_BID_REQUEST], await addFPDToBidderRequest(bidderRequest));
      const serverResponse = {
        body: {
          id: request.data.id,
          cur: 'INR',
          seatbid: [{
            bid: [{
              impid: request.data.imp[0].id,
              price: 197.5,
              adm: '<div>ad</div>',
              w: 300,
              h: 250,
              crid: 'creative-1',
              adomain: ['biddigi.com'],
              mtype: 1, // ORTB 2.6: 1 = banner
            }],
          }],
        },
      };

      const bids = spec.interpretResponse(serverResponse, request);
      expect(bids).to.have.lengthOf(1);
      expect(bids[0].cpm).to.equal(197.5);
      expect(bids[0].currency).to.equal('INR');
      expect(bids[0].width).to.equal(300);
      expect(bids[0].height).to.equal(250);
      expect(bids[0].creativeId).to.equal('creative-1');
      expect(bids[0].requestId).to.equal(BANNER_BID_REQUEST.bidId);
      expect(bids[0].netRevenue).to.equal(true);
      expect(bids[0].ttl).to.equal(300);
    });

    it('defaults currency to INR when the response omits cur', async function () {
      const request = spec.buildRequests([BANNER_BID_REQUEST], await addFPDToBidderRequest(bidderRequest));
      const serverResponse = {
        body: {
          id: request.data.id,
          seatbid: [{
            bid: [{
              impid: request.data.imp[0].id,
              price: 50,
              adm: '<div>ad</div>',
              w: 300,
              h: 250,
              crid: 'creative-2',
              mtype: 1, // ORTB 2.6: 1 = banner
            }],
          }],
        },
      };
      const bids = spec.interpretResponse(serverResponse, request);
      expect(bids[0].currency).to.equal('INR');
    });

    // ------------------------------------------------------------------------------------
    // OpenRTB 2.5 responses (no `mtype`).
    //
    // `mtype` is a 2.6 field. This adapter advertises 2.5+, so a spec-compliant 2.5 response
    // carries no `mtype` at all -- and ortbConverter's default media-type processor then throws
    // "Cannot determine mediaType for response" and drops the bid, returning nothing from a
    // response that was perfectly legal.
    //
    // Every other test in this block sets `mtype: 1`, which is exactly what masked this. These
    // assert the PROTOCOL property -- a legal 2.5 bid must produce a bid object -- not whatever
    // the adapter currently happens to do. They fail against the adapter as it stood before the
    // resolveResponseMediaType fix.
    // ------------------------------------------------------------------------------------
    it('interprets a banner bid when the response omits mtype (ORTB 2.5)', async function () {
      const request = spec.buildRequests([BANNER_BID_REQUEST], await addFPDToBidderRequest(bidderRequest));
      const serverResponse = {
        body: {
          id: request.data.id,
          cur: 'INR',
          seatbid: [{
            bid: [{
              impid: request.data.imp[0].id,
              price: 12.5,
              adm: '<div>ad</div>',
              w: 300,
              h: 250,
              crid: 'creative-25',
              // no mtype -- this is the whole point
            }],
          }],
        },
      };

      const bids = spec.interpretResponse(serverResponse, request);
      expect(bids).to.have.lengthOf(1,
        'a legal ORTB 2.5 bid must not be silently dropped for lacking a 2.6-only field');
      expect(bids[0].mediaType).to.equal('banner');
      expect(bids[0].cpm).to.equal(12.5);
    });

    if (FEATURES.VIDEO) {
      it('infers video from VAST markup when the response omits mtype', async function () {
        const request = spec.buildRequests([VIDEO_BID_REQUEST], await addFPDToBidderRequest(bidderRequest));
        const serverResponse = {
          body: {
            id: request.data.id,
            cur: 'INR',
            seatbid: [{
              bid: [{
                impid: request.data.imp[0].id,
                price: 40,
                adm: '<VAST version="4.0"><Ad></Ad></VAST>',
                crid: 'creative-vast',
              }],
            }],
          },
        };

        const bids = spec.interpretResponse(serverResponse, request);
        expect(bids).to.have.lengthOf(1);
        expect(bids[0].mediaType).to.equal('video');
      });
    }

    if (FEATURES.NATIVE) {
      const nativeBody = {
        ver: '1.2',
        link: { url: 'https://biddigi.com' },
        assets: [
          { id: 0, title: { text: 'A native title' } },
          { id: 1, img: { url: 'https://cdn.biddigi.com/i.png', w: 300, h: 250 } },
          { id: 2, data: { value: 'BidDigi' } },
        ],
      };

      // ORTB Native 1.2 shape: `assets` at the root of adm. This is what Prebid's own
      // fillNativeResponse expects, and it is the only shape that worked before this change.
      it('interprets a native bid in the ORTB Native 1.2 shape', async function () {
        const request = spec.buildRequests([NATIVE_BID_REQUEST], await addFPDToBidderRequest(bidderRequest));
        const serverResponse = {
          body: {
            id: request.data.id,
            cur: 'INR',
            seatbid: [{
              bid: [{
                impid: request.data.imp[0].id,
                price: 30,
                crid: 'creative-native-12',
                mtype: 4,
                adm: JSON.stringify(nativeBody),
              }],
            }],
          },
        };

        const bids = spec.interpretResponse(serverResponse, request);
        expect(bids).to.have.lengthOf(1);
        expect(bids[0].mediaType).to.equal('native');
        expect(bids[0].native.ortb.assets).to.have.lengthOf(3);
      });

      // ORTB Native 1.1 shape: the same payload wrapped in a top-level `native` key. Plenty of
      // exchanges still emit this, and BidDigi forwards whatever its demand partner sent.
      // Prebid's fillNativeResponse reads `ortb.assets`, so before normalizeNativeAdm this threw
      // "ORTB native response contained no assets" and the bid was dropped with nothing logged to
      // the publisher -- a paying bid earning zero.
      it('interprets a native bid wrapped in the legacy 1.1 `native` envelope', async function () {
        const request = spec.buildRequests([NATIVE_BID_REQUEST], await addFPDToBidderRequest(bidderRequest));
        const serverResponse = {
          body: {
            id: request.data.id,
            cur: 'INR',
            seatbid: [{
              bid: [{
                impid: request.data.imp[0].id,
                price: 30,
                crid: 'creative-native-11',
                mtype: 4,
                adm: JSON.stringify({ native: nativeBody }),
              }],
            }],
          },
        };

        const bids = spec.interpretResponse(serverResponse, request);
        expect(bids).to.have.lengthOf(1,
          'a 1.1-shaped native bid is legal and worth money -- dropping it silently is the bug');
        expect(bids[0].mediaType).to.equal('native');
        expect(bids[0].native.ortb.assets).to.have.lengthOf(3);
      });

      // Both fixes together: 2.5 response (no mtype) AND the 1.1 envelope.
      it('interprets a native bid with neither mtype nor the 1.2 shape', async function () {
        const request = spec.buildRequests([NATIVE_BID_REQUEST], await addFPDToBidderRequest(bidderRequest));
        const serverResponse = {
          body: {
            id: request.data.id,
            cur: 'INR',
            seatbid: [{
              bid: [{
                impid: request.data.imp[0].id,
                price: 30,
                crid: 'creative-native-25',
                adm: JSON.stringify({ native: nativeBody }),
              }],
            }],
          },
        };

        const bids = spec.interpretResponse(serverResponse, request);
        expect(bids).to.have.lengthOf(1);
        expect(bids[0].mediaType).to.equal('native');
      });
    }
  });

  describe('getUserSyncs', function () {
    it('returns no syncs when the response has none', function () {
      const syncs = spec.getUserSyncs({ iframeEnabled: true, pixelEnabled: true }, [{ body: {} }]);
      expect(syncs).to.deep.equal([]);
    });

    it('returns iframe syncs only when iframeEnabled is true', function () {
      const serverResponses = [{
        body: {
          ext: {
            syncs: [
              { type: 'iframe', url: 'https://sync.biddigi.com/iframe' },
              { type: 'image', url: 'https://sync.biddigi.com/pixel' },
            ],
          },
        },
      }];
      const syncs = spec.getUserSyncs({ iframeEnabled: true, pixelEnabled: false }, serverResponses);
      expect(syncs).to.deep.equal([{ type: 'iframe', url: 'https://sync.biddigi.com/iframe' }]);
    });

    it('returns image syncs only when pixelEnabled is true', function () {
      const serverResponses = [{
        body: {
          ext: {
            syncs: [
              { type: 'iframe', url: 'https://sync.biddigi.com/iframe' },
              { type: 'image', url: 'https://sync.biddigi.com/pixel' },
            ],
          },
        },
      }];
      const syncs = spec.getUserSyncs({ iframeEnabled: false, pixelEnabled: true }, serverResponses);
      expect(syncs).to.deep.equal([{ type: 'image', url: 'https://sync.biddigi.com/pixel' }]);
    });
  });
});
