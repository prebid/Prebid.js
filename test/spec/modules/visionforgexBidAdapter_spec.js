import { expect } from 'chai';
import { dep, spec, ENDPOINT } from 'modules/visionforgexBidAdapter.js';
import { newBidder } from 'src/adapters/bidderFactory.js';
import { BANNER, VIDEO } from 'src/mediaTypes.js';
// load the modules that register ORTB processors
import 'src/prebid.js';
import 'modules/currency.js';
import 'modules/priceFloors.js';
import 'modules/consentManagementTcf.js';
import 'modules/consentManagementUsp.js';
import { hook } from '../../../src/hook.js';

function bannerBid(overrides = {}) {
  return {
    bidder: 'visionforgex',
    params: { placementId: 'vfx-test-banner' },
    adUnitCode: 'div-banner',
    bidId: 'bid-1',
    bidderRequestId: 'breq-1',
    auctionId: 'auction-1',
    transactionId: 'tid-1',
    mediaTypes: { banner: { sizes: [[300, 250], [336, 280]] } },
    ...overrides
  };
}

function videoBid(overrides = {}) {
  return {
    bidder: 'visionforgex',
    params: { placementId: 'vfx-test-video' },
    adUnitCode: 'div-video',
    bidId: 'bid-2',
    bidderRequestId: 'breq-1',
    auctionId: 'auction-1',
    transactionId: 'tid-2',
    mediaTypes: {
      video: {
        context: 'instream',
        playerSize: [[640, 360]],
        mimes: ['video/mp4'],
        protocols: [2, 3, 5, 6],
        minduration: 1,
        maxduration: 30
      }
    },
    ...overrides
  };
}

function bidderRequest(overrides = {}) {
  return {
    bidderCode: 'visionforgex',
    auctionId: 'auction-1',
    bidderRequestId: 'breq-1',
    refererInfo: {
      page: 'https://publisher.example/article/1',
      domain: 'publisher.example',
      ref: 'https://www.google.com/'
    },
    ortb2: {
      site: { page: 'https://publisher.example/article/1', domain: 'publisher.example' },
      device: { w: 1920, h: 1080 }
    },
    timeout: 1000,
    ...overrides
  };
}

describe('VisionForgeX bid adapter', function () {
  before(() => {
    hook.ready();
  });

  const adapter = newBidder(spec);

  describe('spec', function () {
    it('registers with the bidder code and its functions', function () {
      expect(adapter.callBids).to.be.a('function');
      expect(spec.code).to.equal('visionforgex');
      expect(spec.supportedMediaTypes).to.deep.equal([BANNER, VIDEO]);
    });

    it('does not make user syncs', function () {
      expect(spec.getUserSyncs).to.equal(undefined);
    });
  });

  describe('isBidRequestValid', function () {
    it('accepts a placement ID', function () {
      expect(spec.isBidRequestValid(bannerBid())).to.equal(true);
      expect(spec.isBidRequestValid(videoBid())).to.equal(true);
    });

    it('accepts a numeric placement ID', function () {
      expect(spec.isBidRequestValid(bannerBid({ params: { placementId: 12345 } }))).to.equal(true);
    });

    it('rejects a missing or empty placement ID', function () {
      expect(spec.isBidRequestValid(bannerBid({ params: {} }))).to.equal(false);
      expect(spec.isBidRequestValid(bannerBid({ params: { placementId: '' } }))).to.equal(false);
      expect(spec.isBidRequestValid(bannerBid({ params: undefined }))).to.equal(false);
    });

    it('rejects a placement ID that is not one', function () {
      expect(spec.isBidRequestValid(bannerBid({ params: { placementId: 'a b' } }))).to.equal(false);
      expect(spec.isBidRequestValid(bannerBid({ params: { placementId: '-x' } }))).to.equal(false);
      expect(spec.isBidRequestValid(bannerBid({ params: { placementId: 'x'.repeat(65) } }))).to.equal(false);
      expect(spec.isBidRequestValid(bannerBid({ params: { placementId: { id: 1 } } }))).to.equal(false);
    });
  });

  describe('buildRequests', function () {
    it('makes one text/plain POST to the Exchange, without credentials', function () {
      const req = spec.buildRequests([bannerBid(), videoBid()], bidderRequest());
      expect(req.method).to.equal('POST');
      expect(req.url).to.equal(ENDPOINT);
      expect(req.url).to.equal('https://ex.visionforgex.com/openrtb2/prebid');
      expect(req.options.contentType).to.equal('text/plain');
      expect(req.options.withCredentials).to.equal(false);
      expect(req.data.imp).to.have.length(2);
    });

    it('returns nothing when there is nothing to ask', function () {
      expect(spec.buildRequests([], bidderRequest())).to.deep.equal([]);
    });

    it('puts the placement on each imp', function () {
      const imp = spec.buildRequests([bannerBid()], bidderRequest()).data.imp[0];
      expect(imp.id).to.equal('bid-1');
      expect(imp.tagid).to.equal('vfx-test-banner');
      expect(imp.secure).to.equal(1);
      expect(imp.ext.visionforgex.placementId).to.equal('vfx-test-banner');
    });

    it('turns a numeric placement ID into text', function () {
      const imp = spec.buildRequests([bannerBid({ params: { placementId: 987 } })], bidderRequest()).data.imp[0];
      expect(imp.tagid).to.equal('987');
    });

    it('builds the banner sizes from the ad unit', function () {
      const imp = spec.buildRequests([bannerBid()], bidderRequest()).data.imp[0];
      expect(imp.banner.format).to.deep.equal([{ w: 300, h: 250 }, { w: 336, h: 280 }]);
    });

    if (FEATURES.VIDEO) {
      it('builds the video object from the ad unit', function () {
        const imp = spec.buildRequests([videoBid()], bidderRequest()).data.imp[0];
        expect(imp.video.w).to.equal(640);
        expect(imp.video.h).to.equal(360);
        expect(imp.video.mimes).to.deep.equal(['video/mp4']);
        expect(imp.video.protocols).to.deep.equal([2, 3, 5, 6]);
      });

      it('keeps both formats of a multiformat ad unit', function () {
        const bid = bannerBid({ mediaTypes: { banner: { sizes: [[300, 250]] }, video: { context: 'outstream', playerSize: [[640, 360]], mimes: ['video/mp4'] } } });
        const imp = spec.buildRequests([bid], bidderRequest()).data.imp[0];
        expect(imp.banner).to.exist;
        expect(imp.video).to.exist;
      });
    }

    it('sends the page, and its own version in ext', function () {
      const data = spec.buildRequests([bannerBid()], bidderRequest()).data;
      expect(data.site.page).to.equal('https://publisher.example/article/1');
      expect(data.ext.visionforgex.adapterVersion).to.equal('1.0.0');
    });

    it('passes the supply chain from the request, not from params', function () {
      const schain = { ver: '1.0', complete: 1, nodes: [{ asi: 'publisher.example', sid: '1', hp: 1 }] };
      const data = spec.buildRequests([bannerBid()], bidderRequest({ ortb2: { source: { ext: { schain } } } })).data;
      expect(data.source.ext.schain).to.deep.equal(schain);
    });

    it('passes consent: GDPR, US privacy, GPP and COPPA', function () {
      const ortb2 = {
        regs: { coppa: 1, gpp: 'DBABMA~CPXxRfAPXxRfAAfKABENB-CgAAAAAAAAAAYgAAAAAAAA', gpp_sid: [2], ext: { gdpr: 1, us_privacy: '1YNN' } },
        user: { ext: { consent: 'CONSENT-STRING' } }
      };
      const data = spec.buildRequests([bannerBid()], bidderRequest({ ortb2 })).data;
      expect(data.regs.coppa).to.equal(1);
      expect(data.regs.gpp).to.equal(ortb2.regs.gpp);
      expect(data.regs.gpp_sid).to.deep.equal([2]);
      expect(data.regs.ext.gdpr).to.equal(1);
      expect(data.regs.ext.us_privacy).to.equal('1YNN');
      expect(data.user.ext.consent).to.equal('CONSENT-STRING');
    });

    it('passes user IDs from the request', function () {
      const eids = [{ source: 'pubcid.org', uids: [{ id: 'abc', atype: 1 }] }];
      const data = spec.buildRequests([bannerBid()], bidderRequest({ ortb2: { user: { ext: { eids } } } })).data;
      expect(data.user.ext.eids).to.deep.equal(eids);
    });

    it('takes the floor from the floors module', function () {
      const bid = bannerBid({ getFloor: () => ({ currency: 'USD', floor: 1.25 }) });
      const imp = spec.buildRequests([bid], bidderRequest()).data.imp[0];
      expect(imp.bidfloor).to.equal(1.25);
      expect(imp.bidfloorcur).to.equal('USD');
    });
  });

  describe('interpretResponse', function () {
    function request(bids) {
      return spec.buildRequests(bids, bidderRequest());
    }

    it('reads no bids from an empty answer', function () {
      const req = request([bannerBid()]);
      expect(spec.interpretResponse({ body: null }, req)).to.deep.equal([]);
      expect(spec.interpretResponse({ body: {} }, req)).to.deep.equal([]);
      expect(spec.interpretResponse({}, req)).to.deep.equal([]);
    });

    it('reads a banner bid', function () {
      const req = request([bannerBid()]);
      const body = {
        id: req.data.id,
        cur: 'USD',
        seatbid: [{
          seat: 'visionforgex',
          bid: [{
            id: 'b1',
            impid: 'bid-1',
            price: 1.5,
            adm: '<div>ad</div>',
            adomain: ['advertiser.example'],
            crid: 'creative-1',
            w: 300,
            h: 250,
            mtype: 1,
            exp: 300,
            nurl: 'https://ex.visionforgex.com/win?t=abc.def',
            burl: 'https://ex.visionforgex.com/bill?t=abc.def'
          }]
        }]
      };
      const bids = spec.interpretResponse({ body }, req);
      expect(bids).to.have.length(1);
      const b = bids[0];
      expect(b.requestId).to.equal('bid-1');
      expect(b.cpm).to.equal(1.5);
      expect(b.currency).to.equal('USD');
      expect(b.netRevenue).to.equal(true);
      expect(b.ttl).to.equal(300);
      expect(b.width).to.equal(300);
      expect(b.height).to.equal(250);
      expect(b.creativeId).to.equal('creative-1');
      expect(b.mediaType).to.equal(BANNER);
      expect(b.meta.advertiserDomains).to.deep.equal(['advertiser.example']);
      expect(b.burl).to.equal('https://ex.visionforgex.com/bill?t=abc.def');
      expect(b.ad).to.contain('<div>ad</div>');
      expect(b.ad).to.contain('https://ex.visionforgex.com/win?t=abc.def');
    });

    if (FEATURES.VIDEO) {
      it('reads a video bid', function () {
        const req = request([videoBid()]);
        const vast = '<VAST version="3.0"><Ad><InLine></InLine></Ad></VAST>';
        const body = { id: req.data.id, cur: 'USD', seatbid: [{ bid: [{ id: 'b2', impid: 'bid-2', price: 4, adm: vast, crid: 'v-1', mtype: 2, w: 640, h: 360 }] }] };
        const bids = spec.interpretResponse({ body }, req);
        expect(bids).to.have.length(1);
        expect(bids[0].mediaType).to.equal(VIDEO);
        expect(bids[0].vastXml).to.equal(vast);
        expect(bids[0].cpm).to.equal(4);
      });

      it('reads the format of a multiformat bid from mtype', function () {
        const bid = bannerBid({ mediaTypes: { banner: { sizes: [[300, 250]] }, video: { context: 'outstream', playerSize: [[640, 360]], mimes: ['video/mp4'] } } });
        const req = request([bid]);
        const body = { id: req.data.id, cur: 'USD', seatbid: [{ bid: [{ id: 'b3', impid: 'bid-1', price: 2, adm: '<VAST version="3.0"></VAST>', crid: 'v-2', mtype: 2, w: 640, h: 360 }] }] };
        expect(spec.interpretResponse({ body }, req)[0].mediaType).to.equal(VIDEO);
      });
    }
  });

  describe('onBidBillable', function () {
    let ajaxStub;

    beforeEach(function () {
      ajaxStub = sinon.stub(dep, 'ajax');
    });

    afterEach(function () {
      ajaxStub.restore();
    });

    it('calls the billing notice once, quietly', function () {
      spec.onBidBillable({ burl: 'https://ex.visionforgex.com/bill?t=abc.def' });
      expect(ajaxStub.calledOnce).to.equal(true);
      expect(ajaxStub.firstCall.args[0]).to.equal('https://ex.visionforgex.com/bill?t=abc.def');
      expect(ajaxStub.firstCall.args[3]).to.deep.equal({ method: 'GET', keepalive: true, withCredentials: false });
    });

    it('does nothing without a billing notice', function () {
      spec.onBidBillable({});
      spec.onBidBillable({ burl: '' });
      spec.onBidBillable(undefined);
      expect(ajaxStub.called).to.equal(false);
    });
  });
});
