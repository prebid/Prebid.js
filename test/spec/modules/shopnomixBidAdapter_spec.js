import { expect } from 'chai';
import { spec, ENDPOINT } from 'modules/shopnomixBidAdapter.js';
import { config } from 'src/config.js';
import * as utils from 'src/utils.js';
import * as prebidGlobal from 'src/prebidGlobal.js';
import { impressionViewableHandler } from 'modules/bidViewability.js';
import 'modules/priceFloors.js';

const publisherId = 'pub_01h2xcejqtf2nbrexx3vqjhp41';
const placementId = 'plc_01h2xcejqtf2nbrexx3vqjhp41';

const nativeRequest = {
  ver: '1.2',
  assets: [
    { id: 1, required: 1, title: { len: 80 } },
    { id: 2, required: 1, img: { type: 3, wmin: 300, hmin: 150 } },
    { id: 3, required: 1, data: { type: 1, len: 60 } }
  ],
  eventtrackers: [{ event: 1, methods: [1] }]
};

function bid(id = 'slot-1', params = {}) {
  return {
    bidId: id,
    adUnitCode: id,
    bidder: 'shopnomix',
    params: { publisherId, placementId, ...params },
    mediaTypes: { native: { ortb: nativeRequest } },
    nativeOrtbRequest: nativeRequest,
    ortb2Imp: { bidfloor: 0.25, bidfloorcur: 'USD' }
  };
}

function bidderRequest(bids = [bid()]) {
  return {
    bidderCode: 'shopnomix',
    bidderRequestId: 'req-1',
    auctionId: 'auction-1',
    timeout: 1000,
    bids,
    ortb2: {
      site: {
        page: 'https://publisher.example/article',
        domain: 'publisher.example',
        content: { keywords: 'running, shoes' }
      },
      regs: { gdpr: 1, coppa: 0 },
      user: { ext: { consent: 'test-consent' } }
    }
  };
}

function nativeAdm(impid, overrides = {}) {
  return JSON.stringify({
    native: {
      ver: '1.2',
      assets: [
        { id: 1, title: { text: 'Test native ad' } },
        { id: 2, img: { type: 3, url: 'https://cdn.example/ad.jpg', w: 600, h: 300 } },
        { id: 3, data: { type: 1, value: 'Example Brand' } }
      ],
      link: { url: `https://click.example/api/v1/click/${impid}` },
      eventtrackers: [
        { event: 1, method: 1, url: `https://api.prnmx.com/api/v1/openrtb/notice/prebid/render?bid_id=bid-${impid}` }
      ],
      ...overrides
    }
  });
}

function serverResponse(request, overrides = {}) {
  return {
    body: {
      id: request.id,
      cur: 'USD',
      seatbid: [{
        seat: 'pronomix',
        bid: request.imp.map(imp => ({
          id: `bid-${imp.id}`,
          impid: imp.id,
          price: 1.25,
          crid: `creative-${imp.id}`,
          cid: 'campaign-1',
          adomain: ['advertiser.example'],
          adm: nativeAdm(imp.id),
          nurl: `https://api.prnmx.com/api/v1/openrtb/notice/prebid/win?bid_id=bid-${imp.id}&price=\${AUCTION_PRICE}`,
          burl: `https://api.prnmx.com/api/v1/openrtb/notice/prebid/billing?bid_id=bid-${imp.id}&price=\${AUCTION_PRICE}`,
          ...overrides
        }))
      }]
    }
  };
}

describe('shopnomixBidAdapter', function () {
  afterEach(function () {
    config.resetConfig();
  });

  describe('isBidRequestValid', function () {
    it('accepts a native bid with well formed public IDs', function () {
      expect(spec.isBidRequestValid(bid())).to.equal(true);
    });

    it('rejects anything that is not native inventory', function () {
      const banner = bid();
      banner.mediaTypes = { banner: { sizes: [[300, 250]] } };
      expect(spec.isBidRequestValid(banner)).to.equal(false);
    });

    it('rejects malformed publisher and placement IDs', function () {
      expect(spec.isBidRequestValid(bid('x', { publisherId: 'secret-api-key' }))).to.equal(false);
      expect(spec.isBidRequestValid(bid('x', { placementId: '../path' }))).to.equal(false);
      expect(spec.isBidRequestValid(bid('x', { publisherId: 42 }))).to.equal(false);
    });

    it('rejects an empty bid', function () {
      expect(spec.isBidRequestValid(undefined)).to.equal(false);
      expect(spec.isBidRequestValid({})).to.equal(false);
    });

    // We bill from an image impression tracker. An ad unit that refuses one
    // would render without ever billing, so there is no point bidding on it.
    it('rejects an ad unit that allows no image impression tracker', function () {
      const noPixel = bid();
      noPixel.mediaTypes.native.ortb = {
        ...nativeRequest,
        eventtrackers: [{ event: 1, methods: [2] }]
      };
      expect(spec.isBidRequestValid(noPixel)).to.equal(false);
    });
  });

  describe('buildRequests', function () {
    it('posts to the publisher endpoint without credentials', function () {
      const [request] = spec.buildRequests([bid()], bidderRequest());
      expect(request.method).to.equal('POST');
      expect(request.url).to.equal(`${ENDPOINT}/${publisherId}`);
      expect(request.options.contentType).to.equal('text/plain');
      expect(request.options.withCredentials).to.equal(false);
    });

    it('sets the placement on tagid and prices in USD', function () {
      const [request] = spec.buildRequests([bid()], bidderRequest());
      expect(request.data.imp[0].tagid).to.equal(placementId);
      expect(request.data.imp[0].bidfloorcur).to.equal('USD');
      expect(request.data.cur).to.deep.equal(['USD']);
    });

    it('adds the publisher ID while keeping the publisher\'s own site fields', function () {
      const req = bidderRequest();
      req.ortb2.site.publisher = { domain: 'publisher.example', ext: { sid: 'seat-7' } };
      const [request] = spec.buildRequests([bid()], req);
      expect(request.data.site.publisher.id).to.equal(publisherId);
      expect(request.data.site.publisher.domain).to.equal('publisher.example');
      expect(request.data.site.publisher.ext.sid).to.equal('seat-7');
    });

    it('never sends site alongside app', function () {
      const req = bidderRequest();
      req.ortb2 = { app: { bundle: 'com.example.app' } };
      const [request] = spec.buildRequests([bid()], req);
      expect(request.data.app.bundle).to.equal('com.example.app');
      expect(request.data.site).to.equal(undefined);
    });

    it('forwards consent signals unchanged', function () {
      const [request] = spec.buildRequests([bid()], bidderRequest());
      expect(request.data.user.ext.consent).to.equal('test-consent');
      expect(request.data.regs.gdpr).to.equal(1);
      expect(request.data.regs.coppa).to.equal(0);
    });

    // The exchange cannot tell "not viewable" from "never measured" unless the
    // page says which it is.
    it('reports whether the page measures viewability', function () {
      const [unmeasured] = spec.buildRequests([bid()], bidderRequest());
      expect(unmeasured.data.ext.shopnomix.viewability).to.equal('none');

      config.setConfig({ bidViewability: { enabled: true } });
      const [measured] = spec.buildRequests([bid()], bidderRequest());
      expect(measured.data.ext.shopnomix.viewability).to.equal('module');
    });

    it('sends at most ten impressions per request', function () {
      const bids = Array.from({ length: 12 }, (_, i) => bid(`slot-${i}`));
      const requests = spec.buildRequests(bids, bidderRequest(bids));
      expect(requests).to.have.lengthOf(2);
      expect(requests[0].data.imp).to.have.lengthOf(10);
      expect(requests[1].data.imp).to.have.lengthOf(2);
    });

    it('groups slots by publisher', function () {
      const other = 'pub_01h2xcejqtf2nbrexx3vqjhp42';
      const bids = [bid('a'), bid('b', { publisherId: other })];
      const requests = spec.buildRequests(bids, bidderRequest(bids));
      expect(requests).to.have.lengthOf(2);
      expect(requests.map(r => r.url)).to.have.members([
        `${ENDPOINT}/${publisherId}`, `${ENDPOINT}/${other}`
      ]);
    });

    it('leaves out bids it would not accept', function () {
      const invalid = bid('bad', { placementId: 'nope' });
      const [request] = spec.buildRequests([bid('good'), invalid], bidderRequest());
      expect(request.data.imp).to.have.lengthOf(1);
      expect(request.data.imp[0].id).to.equal('good');
    });

    // We price in USD only. The converter drops the slot rather than letting the
    // error escape, so the publisher loses that slot and keeps the rest.
    it('drops a slot whose floor is not USD', function () {
      const priced = bid();
      priced.ortb2Imp = { bidfloor: 1, bidfloorcur: 'EUR' };
      expect(spec.buildRequests([priced], bidderRequest([priced]))).to.have.lengthOf(0);

      const mixed = [bid('usd'), priced];
      const [request] = spec.buildRequests(mixed, bidderRequest(mixed));
      expect(request.data.imp).to.have.lengthOf(1);
      expect(request.data.imp[0].id).to.equal('usd');
    });
  });

  describe('interpretResponse', function () {
    it('returns a native bid with the exchange price and currency', function () {
      const [request] = spec.buildRequests([bid()], bidderRequest());
      const [parsed] = spec.interpretResponse(serverResponse(request.data), request);
      expect(parsed.cpm).to.equal(1.25);
      expect(parsed.currency).to.equal('USD');
      expect(parsed.netRevenue).to.equal(true);
      expect(parsed.ttl).to.equal(60);
      expect(parsed.mediaType).to.equal('native');
      expect(parsed.meta.advertiserDomains).to.deep.equal(['advertiser.example']);
    });

    it('keeps the win notice and the billing URL, and drops burl', function () {
      const [request] = spec.buildRequests([bid()], bidderRequest());
      const [parsed] = spec.interpretResponse(serverResponse(request.data), request);
      expect(parsed.nurl).to.contain('/notice/prebid/win');
      expect(parsed.nurl).to.contain('price=1.25');
      expect(parsed.shopnomixBillingUrl).to.contain('/notice/prebid/billing');
      expect(parsed.burl).to.equal(undefined);
    });

    // Deferring billing must not defer the ad. The publisher's own visibility
    // check needs something on the page to measure.
    it('never defers rendering', function () {
      const [request] = spec.buildRequests([bid()], bidderRequest());
      const [parsed] = spec.interpretResponse(serverResponse(request.data), request);
      expect(parsed.deferRendering).to.equal(false);
    });

    it('drops response event trackers that would bill a second time', function () {
      const [request] = spec.buildRequests([bid()], bidderRequest());
      const response = serverResponse(request.data, {
        ext: { eventtrackers: [{ event: 1, method: 1, url: 'https://evil.example/imp' }] }
      });
      const [parsed] = spec.interpretResponse(response, request);
      expect(parsed.eventtrackers).to.equal(undefined);
      expect(parsed.cpm).to.equal(1.25);
    });

    it('rejects a billing URL that is not http', function () {
      const [request] = spec.buildRequests([bid()], bidderRequest());
      const response = serverResponse(request.data, { burl: 'javascript:alert(1)' });
      expect(spec.interpretResponse(response, request)).to.have.lengthOf(0);
    });

    it('rejects bids that are unpriced, unidentified or not in USD', function () {
      const [request] = spec.buildRequests([bid()], bidderRequest());
      expect(spec.interpretResponse(serverResponse(request.data, { price: 0 }), request))
        .to.have.lengthOf(0);
      expect(spec.interpretResponse(serverResponse(request.data, { crid: undefined }), request))
        .to.have.lengthOf(0);

      const euros = serverResponse(request.data);
      euros.body.cur = 'EUR';
      expect(spec.interpretResponse(euros, request)).to.have.lengthOf(0);
    });

    it('rejects native markup with no click URL or no assets', function () {
      const [request] = spec.buildRequests([bid()], bidderRequest());
      const noLink = serverResponse(request.data, { adm: nativeAdm('1', { link: undefined }) });
      expect(spec.interpretResponse(noLink, request)).to.have.lengthOf(0);

      const noAssets = serverResponse(request.data, { adm: nativeAdm('1', { assets: [] }) });
      expect(spec.interpretResponse(noAssets, request)).to.have.lengthOf(0);
    });

    it('returns nothing for an empty response', function () {
      const [request] = spec.buildRequests([bid()], bidderRequest());
      expect(spec.interpretResponse({ body: {} }, request)).to.have.lengthOf(0);
    });
  });

  describe('notices', function () {
    let pixel;

    beforeEach(function () {
      pixel = sinon.stub(utils, 'politeTriggerPixel');
    });

    afterEach(function () {
      pixel.restore();
    });

    function winningBid() {
      const [request] = spec.buildRequests([bid()], bidderRequest());
      const [parsed] = spec.interpretResponse(serverResponse(request.data), request);
      return parsed;
    }

    it('sends the win notice once', function () {
      const won = winningBid();
      spec.onBidWon(won);
      spec.onBidWon(won);
      sinon.assert.calledOnce(pixel);
      expect(pixel.firstCall.args[0]).to.contain('/notice/prebid/win');
    });

    it('does nothing when there is no win notice', function () {
      expect(() => spec.onBidWon({ adId: 'nothing' })).to.not.throw();
      sinon.assert.notCalled(pixel);
    });

    it('bills once, tagged as a render when billing was not deferred', function () {
      const won = winningBid();
      spec.onBidBillable(won);
      spec.onBidBillable(won);
      sinon.assert.calledOnce(pixel);
      expect(pixel.firstCall.args[0]).to.contain('billed_on=render');
    });

    it('tags a deferred bid as deferred', function () {
      const won = winningBid();
      won.deferBilling = true;
      spec.onBidBillable(won);
      expect(pixel.firstCall.args[0]).to.contain('billed_on=deferred');
    });

    it('reports a viewable impression only when the exchange supplies a URL', function () {
      const won = winningBid();
      expect(won.shopnomixViewableUrl).to.equal(undefined);
      spec.onBidViewable(won);
      sinon.assert.notCalled(pixel);

      won.shopnomixViewableUrl = 'https://api.prnmx.com/api/v1/openrtb/notice/prebid/viewable?bid_id=1';
      spec.onBidViewable(won);
      spec.onBidViewable(won);
      sinon.assert.calledOnce(pixel);
      expect(pixel.firstCall.args[0]).to.contain('/notice/prebid/viewable');
    });

    // A publisher on Google Ad Manager sets deferBilling and adds the
    // bidViewability module. Nothing of ours runs in between: the module finds
    // the winning bid for the slot and releases billing through onBidBillable.
    // If that chain breaks, a viewable-billed publisher is never paid and
    // nothing errors.
    it('bills a deferred bid when the viewability module reports it viewable', function () {
      const won = winningBid();
      won.adUnitCode = 'slot-1';
      won.bidder = 'shopnomix';
      won.deferBilling = true;

      const getGlobal = sinon.stub(prebidGlobal, 'getGlobal').returns({
        getAllWinningBids: () => [won],
        adUnits: [{ code: 'slot-1', bids: [{ bidder: 'shopnomix' }] }]
      });

      try {
        impressionViewableHandler({}, {
          slot: { getSlotElementId: () => 'slot-1', getAdUnitPath: () => '/1234/slot-1' }
        });
      } finally {
        getGlobal.restore();
      }

      sinon.assert.calledOnce(pixel);
      expect(pixel.firstCall.args[0]).to.contain('/notice/prebid/billing');
      expect(pixel.firstCall.args[0]).to.contain('billed_on=deferred');
    });
  });
});
