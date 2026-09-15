import { expect } from 'chai';
import sinon from 'sinon';
import { newBidder } from '../../../src/adapters/bidderFactory.js';
import {
  BID_ENDPOINT,
  EVENT_ENDPOINT,
  spec,
  storage,
} from '../../../modules/cwireBidAdapter.js';
import * as utils from 'src/utils.js';
import * as ajaxLib from 'src/ajax.js';
import * as autoplayLib from '../../../libraries/autoplayDetection/autoplay.js';
import * as adUnits from 'src/utils/adUnits';
import { BANNER, VIDEO } from '../../../src/mediaTypes.js';
import 'modules/priceFloors.js';
import 'modules/currency.js';

function makeBannerBid(overrides = {}) {
  return Object.assign(
    {
      bidder: 'cwire',
      params: { domainId: 1422, placementId: 2211521 },
      adUnitCode: 'adunit-code',
      mediaTypes: { banner: { sizes: [[300, 250], [300, 600]] } },
      bidId: '30b31c1838de1e',
      bidderRequestId: '22edbae2733bf6',
      auctionId: '1d1a030790a475',
      transactionId: '04f2659e-c005-4eb1-a57c-fa93145e3843',
    },
    overrides
  );
}

function makeVideoBid(overrides = {}) {
  return Object.assign(
    {
      bidder: 'cwire',
      params: { domainId: 1422 },
      adUnitCode: 'video-adunit',
      mediaTypes: {
        video: {
          context: 'instream',
          playerSize: [640, 480],
          mimes: ['video/mp4'],
          protocols: [2, 3, 5, 6],
          api: [2],
          linearity: 1,
        },
      },
      bidId: 'video-bid-id',
      bidderRequestId: 'video-request-id',
      auctionId: 'video-auction-id',
      transactionId: 'video-transaction-id',
    },
    overrides
  );
}

function makeBidderRequest(overrides = {}) {
  return Object.assign(
    {
      bidderCode: 'cwire',
      auctionId: '1d1a030790a475',
      bidderRequestId: '22edbae2733bf6',
      pageViewId: '326dca71-9ca0-4e8f-9e4d-6106161ac1ad',
      refererInfo: { page: 'https://example.com/article' },
      timeout: 1000,
      ortb2: {},
    },
    overrides
  );
}

describe('C-WIRE bid adapter (ORTB2)', () => {
  const adapter = newBidder(spec);
  let sandbox;

  beforeEach(function () {
    sandbox = sinon.createSandbox();
  });

  afterEach(function () {
    sandbox.restore();
  });

  describe('inherited functions', function () {
    it('exposes the standard bidderFactory interface', function () {
      expect(adapter.callBids).to.exist.and.to.be.a('function');
      expect(spec.isBidRequestValid).to.exist.and.to.be.a('function');
      expect(spec.buildRequests).to.exist.and.to.be.a('function');
      expect(spec.interpretResponse).to.exist.and.to.be.a('function');
    });

    it('declares banner and video as supported media types', function () {
      expect(spec.supportedMediaTypes).to.include.members([BANNER, VIDEO]);
    });

    it('uses the v1 bid endpoint', function () {
      expect(BID_ENDPOINT).to.equal('https://prebid2.cwi.re/v1/bid');
    });

    it('uses the v1 event endpoint', function () {
      expect(EVENT_ENDPOINT).to.equal('https://prebid2.cwi.re/v1/event');
    });
  });

  describe('isBidRequestValid', function () {
    it('returns true when domainId is a number', function () {
      expect(spec.isBidRequestValid(makeBannerBid({ params: { domainId: 42 } }))).to.equal(true);
    });

    it('returns true with legacy pageId+placementId when domainId is missing', function () {
      expect(
        spec.isBidRequestValid(makeBannerBid({ params: { pageId: 42, placementId: 99 } }))
      ).to.equal(true);
    });

    it('returns false when params are absent', function () {
      const bid = makeBannerBid();
      delete bid.params;
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('returns false when domainId is missing and pageId+placementId incomplete', function () {
      expect(spec.isBidRequestValid(makeBannerBid({ params: { pageId: 42 } }))).to.equal(false);
    });

    it('returns false when domainId is missing and legacy pageId is missing', function () {
      expect(spec.isBidRequestValid(makeBannerBid({ params: { placementId: 99 } }))).to.equal(false);
    });
  });

  describe('buildRequests: envelope', function () {
    it('POSTs a single ORTB2 request to /v2/bid', function () {
      const req = spec.buildRequests([makeBannerBid()], makeBidderRequest());
      expect(req.method).to.equal('POST');
      expect(req.url).to.equal(BID_ENDPOINT);
      expect(req.data).to.be.an('object');
      expect(req.data.imp).to.be.an('array');
      expect(req.data.imp).to.have.lengthOf(1);
    });

    it('passes bidderRequest.timeout through as tmax', function () {
      const req = spec.buildRequests(
        [makeBannerBid()],
        makeBidderRequest({ timeout: 750 })
      );
      expect(req.data.tmax).to.equal(750);
    });
  });

  describe('buildRequests: imp shape', function () {
    it('places bidder params under imp.ext.bidder', function () {
      const bid = makeBannerBid({ params: { domainId: 1422, placementId: 2211521 } });
      const req = spec.buildRequests([bid], makeBidderRequest());
      const imp = req.data.imp[0];
      expect(imp.ext.bidder.domainId).to.equal(1422);
      expect(imp.ext.bidder.placementId).to.equal(2211521);
    });

    it('forwards legacy pageId under imp.ext.bidder when present', function () {
      const bid = makeBannerBid({ params: { pageId: 42, placementId: 99 } });
      const req = spec.buildRequests([bid], makeBidderRequest());
      const imp = req.data.imp[0];
      expect(imp.ext.bidder.pageId).to.equal(42);
      expect(imp.ext.bidder.placementId).to.equal(99);
    });

    it('emits imp.banner when adunit is banner-only', function () {
      const req = spec.buildRequests([makeBannerBid()], makeBidderRequest());
      const imp = req.data.imp[0];
      expect(imp.banner).to.exist;
      expect(imp.video).to.not.exist;
    });

    if (FEATURES.VIDEO) {
      it('emits imp.video when adunit is video-only', function () {
        const req = spec.buildRequests([makeVideoBid()], makeBidderRequest());
        const imp = req.data.imp[0];
        expect(imp.video).to.exist;
        expect(imp.banner).to.not.exist;
      });

      it('emits both imp.banner and imp.video for a multi-format adunit', function () {
        const bid = makeBannerBid({
          mediaTypes: {
            banner: { sizes: [[300, 250]] },
            video: { context: 'instream', playerSize: [640, 480], mimes: ['video/mp4'] },
          },
        });
        const req = spec.buildRequests([bid], makeBidderRequest());
        const imp = req.data.imp[0];
        expect(imp.banner).to.exist;
        expect(imp.video).to.exist;
      });
    }

    it('populates imp.bidfloor from getFloor when priceFloors module active', function () {
      const bid = makeBannerBid({
        getFloor: () => ({ currency: 'USD', floor: 1.23 }),
      });
      const req = spec.buildRequests([bid], makeBidderRequest());
      const imp = req.data.imp[0];
      expect(imp.bidfloor).to.equal(1.23);
      expect(imp.bidfloorcur).to.equal('USD');
    });
  });

  describe('buildRequests: imp.ext.cwire (slot signals)', function () {
    it('captures slot dimensions when the slot element has bounds', function () {
      sandbox.stub(adUnits, 'getAdUnitElement').returns({
        getBoundingClientRect() {
          return { width: 200, height: 250 };
        },
        style: {},
      });
      const req = spec.buildRequests([makeBannerBid()], makeBidderRequest());
      const ext = req.data.imp[0].ext.cwire;
      expect(ext.dimensions).to.deep.equal({ width: 200, height: 250 });
    });

    it('captures maxWidth/maxHeight when slot style sets them', function () {
      sandbox.stub(adUnits, 'getAdUnitElement').returns({
        getBoundingClientRect() {
          return { width: 0, height: 0 };
        },
        style: { maxWidth: '400px', maxHeight: '350px' },
      });
      const req = spec.buildRequests([makeBannerBid()], makeBidderRequest());
      const ext = req.data.imp[0].ext.cwire;
      expect(ext.style.maxWidth).to.equal('400px');
      expect(ext.style.maxHeight).to.equal('350px');
    });

    it('writes autoplay flag from isAutoplayEnabled', function () {
      sandbox.stub(autoplayLib, 'isAutoplayEnabled').returns(true);
      const req = spec.buildRequests([makeBannerBid()], makeBidderRequest());
      expect(req.data.imp[0].ext.cwire.autoplay).to.equal(true);
    });
  });

  describe('buildRequests: request.ext.cwire (page-level signals)', function () {
    it('writes pageViewId and sdk.version', function () {
      const req = spec.buildRequests([makeBannerBid()], makeBidderRequest());
      const ext = req.data.ext.cwire;
      expect(ext.pageViewId).to.equal('326dca71-9ca0-4e8f-9e4d-6106161ac1ad');
      expect(ext.sdk).to.have.property('version');
    });

    it('writes cwid from localStorage when present', function () {
      sandbox.stub(storage, 'localStorageIsEnabled').returns(true);
      sandbox.stub(storage, 'getDataFromLocalStorage').returns('cwid-from-storage');
      const req = spec.buildRequests([makeBannerBid()], makeBidderRequest());
      expect(req.data.ext.cwire.cwid).to.equal('cwid-from-storage');
    });

    it('omits cwid when localStorage is disabled', function () {
      sandbox.stub(storage, 'localStorageIsEnabled').returns(false);
      const req = spec.buildRequests([makeBannerBid()], makeBidderRequest());
      expect(req.data.ext.cwire.cwid).to.equal(undefined);
    });

    it('writes refgroups from cwgroups URL parameter', function () {
      sandbox.stub(utils, 'getParameterByName').callsFake((name) => {
        if (name === 'cwgroups') return 'g1,g2';
        return '';
      });
      const req = spec.buildRequests([makeBannerBid()], makeBidderRequest());
      expect(req.data.ext.cwire.refgroups).to.deep.equal(['g1', 'g2']);
    });

    it('writes featureFlags from cwfeatures URL parameter', function () {
      sandbox.stub(utils, 'getParameterByName').callsFake((name) => {
        if (name === 'cwfeatures') return 'f1,f2';
        return '';
      });
      const req = spec.buildRequests([makeBannerBid()], makeBidderRequest());
      expect(req.data.ext.cwire.featureFlags).to.deep.equal(['f1', 'f2']);
    });

    it('writes cwcreative from URL parameter', function () {
      sandbox.stub(utils, 'getParameterByName').callsFake((name) => {
        if (name === 'cwcreative') return '1234';
        return '';
      });
      const req = spec.buildRequests([makeBannerBid()], makeBidderRequest());
      expect(req.data.ext.cwire.cwcreative).to.equal('1234');
    });

    it('writes debug=true when cwdebug URL parameter is set', function () {
      sandbox.stub(utils, 'getParameterByName').callsFake((name) => {
        if (name === 'cwdebug') return 'true';
        return '';
      });
      const req = spec.buildRequests([makeBannerBid()], makeBidderRequest());
      expect(req.data.ext.cwire.debug).to.equal(true);
    });

    it('omits cwire ext fields that are empty', function () {
      sandbox.stub(utils, 'getParameterByName').returns('');
      sandbox.stub(storage, 'localStorageIsEnabled').returns(false);
      const req = spec.buildRequests([makeBannerBid()], makeBidderRequest());
      const ext = req.data.ext.cwire;
      expect(ext.cwid).to.equal(undefined);
      expect(ext.refgroups).to.equal(undefined);
      expect(ext.featureFlags).to.equal(undefined);
      expect(ext.cwcreative).to.equal(undefined);
      expect(ext.debug).to.equal(undefined);
    });
  });

  describe('interpretResponse', function () {
    function bannerOrtbResponse(impId) {
      return {
        seatbid: [
          {
            bid: [
              {
                id: 'seat-banner',
                impid: impId,
                price: 1.5,
                adm: '<h1>Hello world</h1>',
                crid: 'creative-banner',
                cid: 'campaign-1',
                w: 300,
                h: 250,
                mtype: 1,
                adomain: ['example.com'],
              },
            ],
          },
        ],
        cur: 'USD',
      };
    }

    function videoOrtbResponse(impId, vast = '<VAST version="3.0"><Ad></Ad></VAST>') {
      return {
        seatbid: [
          {
            bid: [
              {
                id: 'seat-video',
                impid: impId,
                price: 5.0,
                adm: vast,
                crid: 'creative-video',
                cid: 'campaign-2',
                w: 640,
                h: 480,
                mtype: 2,
                adomain: ['example.com'],
              },
            ],
          },
        ],
        cur: 'USD',
      };
    }

    it('maps a banner ORTB response to a Prebid banner bid', function () {
      const bid = makeBannerBid();
      const req = spec.buildRequests([bid], makeBidderRequest());
      const bids = spec.interpretResponse({ body: bannerOrtbResponse(req.data.imp[0].id) }, req);
      expect(bids).to.have.lengthOf(1);
      expect(bids[0].mediaType).to.equal(BANNER);
      expect(bids[0].ad).to.equal('<h1>Hello world</h1>');
      expect(bids[0].cpm).to.equal(1.5);
    });

    it('falls back to mediaType from the request when mtype is missing (banner-only adunit)', function () {
      const bid = makeBannerBid();
      const req = spec.buildRequests([bid], makeBidderRequest());
      const noMtypeResponse = bannerOrtbResponse(req.data.imp[0].id);
      delete noMtypeResponse.seatbid[0].bid[0].mtype;
      const bids = spec.interpretResponse({ body: noMtypeResponse }, req);
      expect(bids).to.have.lengthOf(1);
      expect(bids[0].mediaType).to.equal(BANNER);
    });

    if (FEATURES.VIDEO) {
      it('maps a video ORTB response (mtype=2) to a video bid with vastXml', function () {
        const bid = makeVideoBid();
        const req = spec.buildRequests([bid], makeBidderRequest());
        const vast = '<VAST version="3.0"><Ad></Ad></VAST>';
        const bids = spec.interpretResponse(
          { body: videoOrtbResponse(req.data.imp[0].id, vast) },
          req
        );
        expect(bids).to.have.lengthOf(1);
        expect(bids[0].mediaType).to.equal(VIDEO);
        expect(bids[0].vastXml).to.equal(vast);
      });

      it('falls back to mediaType from the request when mtype is missing (video-only adunit)', function () {
        const bid = makeVideoBid();
        const req = spec.buildRequests([bid], makeBidderRequest());
        const vast = '<VAST version="3.0"><Ad></Ad></VAST>';
        const noMtypeResponse = videoOrtbResponse(req.data.imp[0].id, vast);
        delete noMtypeResponse.seatbid[0].bid[0].mtype;
        const bids = spec.interpretResponse({ body: noMtypeResponse }, req);
        expect(bids).to.have.lengthOf(1);
        expect(bids[0].mediaType).to.equal(VIDEO);
      });
    }

    it('returns [] when seatbid is empty', function () {
      const bid = makeBannerBid();
      const req = spec.buildRequests([bid], makeBidderRequest());
      const bids = spec.interpretResponse({ body: { seatbid: [], cur: 'USD' } }, req);
      expect(bids).to.deep.equal([]);
    });

    it('persists cwid from response.ext.cwire.cwid into localStorage when not already stored', function () {
      sandbox.stub(storage, 'localStorageIsEnabled').returns(true);
      sandbox.stub(storage, 'getDataFromLocalStorage').returns(null);
      const setStub = sandbox.stub(storage, 'setDataInLocalStorage');

      const bid = makeBannerBid();
      const req = spec.buildRequests([bid], makeBidderRequest());
      const body = bannerOrtbResponse(req.data.imp[0].id);
      body.ext = { cwire: { cwid: 'new-cwid-from-server' } };
      spec.interpretResponse({ body }, req);

      expect(setStub.calledWith('cw_cwid', 'new-cwid-from-server')).to.equal(true);
    });

    it('does not persist cwid from response when localStorage is disabled', function () {
      sandbox.stub(storage, 'localStorageIsEnabled').returns(false);
      const setStub = sandbox.stub(storage, 'setDataInLocalStorage');

      const bid = makeBannerBid();
      const req = spec.buildRequests([bid], makeBidderRequest());
      const body = bannerOrtbResponse(req.data.imp[0].id);
      body.ext = { cwire: { cwid: 'new-cwid-from-server' } };
      spec.interpretResponse({ body }, req);

      expect(setStub.called).to.equal(false);
    });

    it('does not overwrite an existing cwid in localStorage', function () {
      sandbox.stub(storage, 'localStorageIsEnabled').returns(true);
      sandbox.stub(storage, 'getDataFromLocalStorage').returns('existing-cwid');
      const setStub = sandbox.stub(storage, 'setDataInLocalStorage');

      const bid = makeBannerBid();
      const req = spec.buildRequests([bid], makeBidderRequest());
      const body = bannerOrtbResponse(req.data.imp[0].id);
      body.ext = { cwire: { cwid: 'new-cwid-from-server' } };
      spec.interpretResponse({ body }, req);

      expect(setStub.called).to.equal(false);
    });
  });

  describe('event beacons', function () {
    it('onBidWon POSTs a BID_WON beacon to the v2 event endpoint', function () {
      const sendBeacon = sandbox.stub(ajaxLib, 'sendBeacon');
      const wonBid = { adUnitCode: 'au', cpm: 1.5, requestId: 'r' };
      spec.onBidWon(wonBid);
      expect(sendBeacon.calledOnce).to.equal(true);
      const [url, payload] = sendBeacon.firstCall.args;
      expect(url).to.equal(EVENT_ENDPOINT);
      const event = JSON.parse(payload);
      expect(event.type).to.equal('BID_WON');
      expect(event.payload.bid).to.deep.equal(wonBid);
    });

    it('onBidderError POSTs a BID_ERROR beacon to the v2 event endpoint', function () {
      const sendBeacon = sandbox.stub(ajaxLib, 'sendBeacon');
      const error = { reason: 'boom' };
      const bidderRequest = { bidderCode: 'cwire' };
      spec.onBidderError({ error, bidderRequest });
      expect(sendBeacon.calledOnce).to.equal(true);
      const [url, payload] = sendBeacon.firstCall.args;
      expect(url).to.equal(EVENT_ENDPOINT);
      const event = JSON.parse(payload);
      expect(event.type).to.equal('BID_ERROR');
      expect(event.payload.error).to.deep.equal(error);
    });
  });

  describe('getUserSyncs', function () {
    it('returns no syncs when GDPR purpose-1 consent is missing', function () {
      expect(spec.getUserSyncs({}, {}, {}, {})).to.be.empty;
    });

    it('returns no syncs when no syncOption is enabled', function () {
      const gdprConsent = {
        vendorData: { purpose: { consents: 1 } },
        gdprApplies: false,
        consentString: 'testConsentString',
      };
      expect(spec.getUserSyncs({}, {}, gdprConsent, {})).to.be.empty;
    });

    it('returns a pixel sync when pixelEnabled and gdprApplies=false', function () {
      const gdprConsent = {
        vendorData: { purpose: { consents: 1 } },
        gdprApplies: false,
        consentString: 'testConsentString',
      };
      const syncs = spec.getUserSyncs(
        { pixelEnabled: true, iframeEnabled: true },
        {},
        gdprConsent,
        {}
      );
      expect(syncs[0].type).to.equal('image');
      expect(syncs[0].url).to.equal(
        'https://ib.adnxs.com/getuid?https://prebid.cwi.re/v1/cookiesync?xandrId=$UID&gdpr=0&gdpr_consent=testConsentString'
      );
    });

    it('returns an iframe sync when only iframeEnabled and gdprApplies=true', function () {
      const gdprConsent = {
        vendorData: { purpose: { consents: { 1: true } } },
        gdprApplies: true,
        consentString: 'abc123',
      };
      const syncs = spec.getUserSyncs({ iframeEnabled: true }, {}, gdprConsent, {});
      expect(syncs[0].type).to.equal('iframe');
      expect(syncs[0].url).to.equal(
        'https://ib.adnxs.com/getuid?https://prebid.cwi.re/v1/cookiesync?xandrId=$UID&gdpr=1&gdpr_consent=abc123'
      );
    });
  });
});
