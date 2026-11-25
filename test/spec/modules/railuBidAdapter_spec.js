import { expect } from 'chai';
import { spec } from 'modules/railuBidAdapter.js';
import { BANNER, VIDEO, NATIVE } from 'src/mediaTypes.js';

const ENDPOINT = 'https://api.railu.ai/v1/ortb/bid';

function bidRequest(overrides = {}) {
  return {
    bidder: 'railu',
    bidId: 'b1',
    adUnitCode: 'banner-1',
    auctionId: 'a1',
    params: { tid: 't_k3m9p2x7q4w8z6' },
    mediaTypes: { banner: { sizes: [[300, 250], [300, 600]] } },
    ...overrides,
  };
}

const bidderRequest = {
  bidderRequestId: 'r1',
  auctionId: 'a1',
  timeout: 1200,
  refererInfo: { page: 'https://news.example.com/story', domain: 'news.example.com', ref: 'https://search.example/' },
  ortb2: { device: { ua: 'Mozilla/5.0 (Macintosh)' } },
};

describe('railuBidAdapter', function () {
  describe('spec', function () {
    it('has the bidder code and the media types it serves', function () {
      expect(spec.code).to.equal('railu');
      expect(spec.supportedMediaTypes).to.deep.equal([BANNER, VIDEO, NATIVE]);
    });
  });

  describe('isBidRequestValid', function () {
    it('accepts banner, video and native ad units with no params', function () {
      expect(spec.isBidRequestValid(bidRequest({ params: {} }))).to.equal(true);
      expect(spec.isBidRequestValid(bidRequest({ mediaTypes: { video: { playerSize: [[640, 360]] } } }))).to.equal(true);
      expect(spec.isBidRequestValid(bidRequest({ mediaTypes: { native: {} } }))).to.equal(true);
    });
    it('rejects an ad unit with no media type', function () {
      expect(spec.isBidRequestValid(bidRequest({ mediaTypes: {} }))).to.equal(false);
      expect(spec.isBidRequestValid({})).to.equal(false);
    });
  });

  describe('buildRequests', function () {
    it('sends one OpenRTB 2.6 POST per auction to the Railu endpoint', function () {
      const reqs = spec.buildRequests([bidRequest(), bidRequest({ bidId: 'b2', adUnitCode: 'banner-2' })], bidderRequest);
      expect(reqs).to.have.lengthOf(1);
      expect(reqs[0].method).to.equal('POST');
      expect(reqs[0].url).to.equal(ENDPOINT);
      const body = reqs[0].data;
      expect(body.imp.map((i) => i.id)).to.deep.equal(['b1', 'b2']);
      expect(body.imp[0].banner.format).to.deep.equal([{ w: 300, h: 250 }, { w: 300, h: 600 }]);
      expect(body.imp[0].ext.tid).to.equal('t_k3m9p2x7q4w8z6');
      expect(body.site.page).to.equal('https://news.example.com/story');
      expect(body.site.domain).to.equal('news.example.com');
      expect(body.tmax).to.equal(1200);
      expect(body.cur).to.deep.equal(['USD']);
      expect(body.test).to.equal(undefined);
    });

    it('carries the video player constraints', function () {
      const v = { context: 'instream', playerSize: [[640, 360]], mimes: ['video/mp4'], protocols: [2, 3], minduration: 5, maxduration: 30, plcmt: 1 };
      const body = spec.buildRequests([bidRequest({ mediaTypes: { video: v } })], bidderRequest)[0].data;
      expect(body.imp[0].video).to.include({ w: 640, h: 360, minduration: 5, maxduration: 30, plcmt: 1 });
      expect(body.imp[0].video.mimes).to.deep.equal(['video/mp4']);
    });

    it('uses the native request Prebid built', function () {
      const nativeOrtbRequest = { ver: '1.2', assets: [{ id: 7, required: 1, title: { len: 90 } }] };
      const body = spec.buildRequests([bidRequest({ mediaTypes: { native: {} }, nativeOrtbRequest })], bidderRequest)[0].data;
      expect(JSON.parse(body.imp[0].native.request)).to.deep.equal(nativeOrtbRequest);
    });

    it('passes the consent signals', function () {
      const br = { ...bidderRequest, gdprConsent: { gdprApplies: true, consentString: 'CONSENT' }, uspConsent: '1YNN', gppConsent: { gppString: 'GPP', applicableSections: [7] } };
      const body = spec.buildRequests([bidRequest()], br)[0].data;
      expect(body.regs.ext.gdpr).to.equal(1);
      expect(body.user.ext.consent).to.equal('CONSENT');
      expect(body.regs.ext.us_privacy).to.equal('1YNN');
      expect(body.regs.gpp).to.equal('GPP');
      expect(body.regs.gpp_sid).to.deep.equal([7]);
    });

    it('sets OpenRTB test = 1 when params.test is true', function () {
      const body = spec.buildRequests([bidRequest({ params: { test: true } })], bidderRequest)[0].data;
      expect(body.test).to.equal(1);
    });

    it('sends nothing for ad units it does not serve', function () {
      expect(spec.buildRequests([bidRequest({ mediaTypes: {} })], bidderRequest)).to.deep.equal([]);
    });
  });

  describe('interpretResponse', function () {
    const request = () => spec.buildRequests([
      bidRequest(),
      bidRequest({ bidId: 'v1', adUnitCode: 'video-1', mediaTypes: { video: { context: 'instream', playerSize: [[640, 360]] } } }),
    ], bidderRequest)[0];

    it('turns the BidResponse into Prebid bids', function () {
      const serverResponse = {
        body: {
          id: 'r1',
          cur: 'USD',
          seatbid: [{
            seat: 'railu',
            bid: [
              { id: 'x1', impid: 'b1', price: 2.5, adm: '<div>ad</div>', crid: 'cr1', w: 300, h: 250, mtype: 1, adomain: ['brand.example'], dealid: 'deal-1' },
              { id: 'x2', impid: 'v1', price: 12, adm: '<VAST version="4.2"></VAST>', crid: 'cr2', w: 640, h: 360, mtype: 2, ext: { railu: { iid: 'iid-1' } } },
            ]
          }]
        }
      };
      const bids = spec.interpretResponse(serverResponse, request());
      expect(bids).to.have.lengthOf(2);
      expect(bids[0]).to.include({ requestId: 'b1', cpm: 2.5, currency: 'USD', width: 300, height: 250, creativeId: 'cr1', netRevenue: true, ttl: 300, mediaType: 'banner', ad: '<div>ad</div>', dealId: 'deal-1' });
      expect(bids[0].meta.advertiserDomains).to.deep.equal(['brand.example']);
      expect(bids[1]).to.include({ requestId: 'v1', cpm: 12, mediaType: 'video', vastXml: '<VAST version="4.2"></VAST>' });
      expect(bids[1].vastUrl).to.equal('https://api.railu.ai/serve/inner?iid=iid-1');
    });

    it('maps native assets onto the ids Prebid asked for and keeps a click link', function () {
      const nativeOrtbRequest = { ver: '1.2', assets: [{ id: 7, required: 1, title: { len: 90 } }, { id: 9, required: 1, img: { type: 3 } }] };
      const req = spec.buildRequests([bidRequest({ bidId: 'n1', mediaTypes: { native: {} }, nativeOrtbRequest })], bidderRequest)[0];
      const adm = JSON.stringify({ native: { ver: '1.2', assets: [{ id: 1, title: { text: 'Hello' } }, { id: 2, img: { url: 'https://img.example/a.png', w: 1200, h: 627 } }], link: { url: 'https://brand.example' } } });
      const bids = spec.interpretResponse({ body: { seatbid: [{ bid: [{ impid: 'n1', price: 3, adm, crid: 'cr3', mtype: 4 }] }] } }, req);
      expect(bids[0].mediaType).to.equal('native');
      expect(bids[0].native.ortb.assets.map((a) => a.id)).to.deep.equal([7, 9]);
      expect(bids[0].native.ortb.link.url).to.equal('https://brand.example');
    });

    it('returns no bids for an empty or no-fill answer', function () {
      expect(spec.interpretResponse({ body: { id: 'r1', nbr: 0, seatbid: [] } }, request())).to.deep.equal([]);
      expect(spec.interpretResponse({}, request())).to.deep.equal([]);
      expect(spec.interpretResponse({ body: { seatbid: [{ bid: [{ impid: 'b1', price: 0, adm: 'x' }] }] } }, request())).to.deep.equal([]);
    });
  });

  describe('getUserSyncs', function () {
    it('asks for no user syncs', function () {
      expect(spec.getUserSyncs({ iframeEnabled: true, pixelEnabled: true })).to.deep.equal([]);
    });
  });
});
