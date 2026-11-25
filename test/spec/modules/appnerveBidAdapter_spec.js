import { expect } from 'chai';
import { spec, ENDPOINT, getSourceId } from 'modules/appnerveBidAdapter.js';
import { newBidder } from 'src/adapters/bidderFactory.js';
import { AUDIO, BANNER, NATIVE, VIDEO } from 'src/mediaTypes.js';
// load modules that register ORTB processors
import 'src/prebid.js';
import 'modules/currency.js';
import 'modules/priceFloors.js';
import 'modules/consentManagementTcf.js';
import 'modules/consentManagementUsp.js';
import 'modules/consentManagementGpp.js';

function bidRequest(mediaTypes, params = { sourceId: 'appnerve-test-banner' }, overrides = {}) {
  return {
    bidder: 'appnerve',
    params,
    mediaTypes,
    adUnitCode: 'ad-unit-' + Object.keys(mediaTypes)[0],
    bidId: 'bid-' + Object.keys(mediaTypes)[0],
    bidderRequestId: 'bidder-request',
    auctionId: 'auction',
    transactionId: 'transaction',
    ...overrides
  };
}

const banner = () => bidRequest({ banner: { sizes: [[300, 250], [728, 90]] } });
const video = () => bidRequest({ video: { context: 'instream', playerSize: [[640, 360]], mimes: ['video/mp4'], protocols: [2, 3] } }, { sourceId: 'appnerve-test-video' });
const NATIVE_ORTB = { ver: '1.2', assets: [{ id: 1, required: 1, title: { len: 90 } }, { id: 2, required: 1, img: { type: 3, w: 300, h: 250 } }] };
const native = () => bidRequest({ native: { ortb: NATIVE_ORTB } }, { sourceId: 'appnerve-test-native' }, { nativeOrtbRequest: NATIVE_ORTB });
const audio = () => bidRequest({ audio: { mimes: ['audio/mpeg'], protocols: [2, 3], minduration: 5, maxduration: 30 } }, { sourceId: 'appnerve-test-audio' });

function bidderRequest(bids, ortb2 = {}) {
  return {
    bidderCode: 'appnerve',
    auctionId: 'auction',
    bidderRequestId: 'bidder-request',
    timeout: 1000,
    refererInfo: { page: 'https://publisher.example/page', domain: 'publisher.example' },
    ortb2: { site: { page: 'https://publisher.example/page', domain: 'publisher.example' }, ...ortb2 },
    bids
  };
}

function build(bids, ortb2) {
  return spec.buildRequests(bids, bidderRequest(bids, ortb2));
}

function response(bid) {
  return { body: { id: 'response', cur: 'USD', seatbid: [{ seat: 'appnerve', bid: [{ id: 'b1', price: 1.25, crid: 'creative-1', adomain: ['advertiser.example'], ...bid }] }] } };
}

describe('Appnerve bid adapter', function () {
  const adapter = newBidder(spec);

  describe('inherited functions', function () {
    it('exists and is a function', function () {
      expect(adapter.callBids).to.exist.and.to.be.a('function');
    });
  });

  describe('spec', function () {
    it('uses the appnerve bidder code and all four media types', function () {
      expect(spec.code).to.equal('appnerve');
      expect(spec.supportedMediaTypes).to.deep.equal([BANNER, VIDEO, NATIVE, AUDIO]);
    });
  });

  describe('getSourceId', function () {
    it('prefers sourceId, falls back to placementId and trims', function () {
      expect(getSourceId({ sourceId: ' a ', placementId: 'b' })).to.equal('a');
      expect(getSourceId({ placementId: 'b' })).to.equal('b');
      expect(getSourceId({ sourceId: 123 })).to.equal('');
      expect(getSourceId(undefined)).to.equal('');
    });
  });

  describe('isBidRequestValid', function () {
    it('accepts sourceId or placementId', function () {
      expect(spec.isBidRequestValid(banner())).to.equal(true);
      expect(spec.isBidRequestValid({ ...banner(), params: { placementId: 'p1' } })).to.equal(true);
    });

    it('rejects missing, empty or non-string IDs', function () {
      expect(spec.isBidRequestValid({ ...banner(), params: {} })).to.equal(false);
      expect(spec.isBidRequestValid({ ...banner(), params: { sourceId: '   ' } })).to.equal(false);
      expect(spec.isBidRequestValid({ ...banner(), params: { sourceId: 42 } })).to.equal(false);
      expect(spec.isBidRequestValid({ ...banner(), params: undefined })).to.equal(false);
    });
  });

  describe('buildRequests', function () {
    it('sends one text/plain POST per ad unit to the fixed endpoint', function () {
      const requests = build([banner(), video()]);
      expect(requests).to.have.length(2);
      expect(requests[0].method).to.equal('POST');
      expect(requests[0].url).to.equal(ENDPOINT + '?ssp_id=appnerve-test-banner');
      expect(requests[1].url).to.equal(ENDPOINT + '?ssp_id=appnerve-test-video');
      expect(requests[0].options).to.deep.equal({ contentType: 'text/plain', withCredentials: false });
      expect(requests[0].data.imp).to.have.length(1);
      expect(requests[1].data.imp).to.have.length(1);
    });

    it('URL-encodes the source ID', function () {
      const request = build([bidRequest({ banner: { sizes: [[300, 250]] } }, { sourceId: 'a b&c' })])[0];
      expect(request.url).to.equal(ENDPOINT + '?ssp_id=a%20b%26c');
    });

    it('builds a banner imp with tagid and secure', function () {
      const imp = build([banner()])[0].data.imp[0];
      expect(imp.id).to.equal('bid-banner');
      expect(imp.tagid).to.equal('appnerve-test-banner');
      expect(imp.secure).to.equal(1);
      expect(imp.banner.format).to.deep.equal([{ w: 300, h: 250 }, { w: 728, h: 90 }]);
    });

    if (FEATURES.VIDEO && FEATURES.NATIVE && FEATURES.AUDIO) {
      it('builds video, native and audio imps', function () {
        const [videoReq, nativeReq, audioReq] = build([video(), native(), audio()]);
        expect(videoReq.data.imp[0].video).to.include({ w: 640, h: 360 });
        expect(videoReq.data.imp[0].video.mimes).to.deep.equal(['video/mp4']);
        expect(JSON.parse(nativeReq.data.imp[0].native.request).assets).to.have.length(2);
        expect(audioReq.data.imp[0].audio.mimes).to.deep.equal(['audio/mpeg']);
      });
    }

    it('passes first party data and privacy signals', function () {
      const ortb2 = {
        regs: { coppa: 1, gpp: 'GPP', gpp_sid: [7], ext: { gdpr: 1, us_privacy: '1YNN' } },
        user: { ext: { consent: 'TCF', eids: [{ source: 'id.example', uids: [{ id: 'u', atype: 1 }] }] } },
        source: { ext: { schain: { ver: '1.0', complete: 1, nodes: [{ asi: 'appnerve.com', sid: '1', hp: 1 }] } } }
      };
      const data = build([banner()], ortb2)[0].data;
      expect(data.site.domain).to.equal('publisher.example');
      expect(data.regs.coppa).to.equal(1);
      expect(data.regs.gpp).to.equal('GPP');
      expect(data.regs.gpp_sid).to.deep.equal([7]);
      expect(data.regs.ext.gdpr).to.equal(1);
      expect(data.regs.ext.us_privacy).to.equal('1YNN');
      expect(data.user.ext.consent).to.equal('TCF');
      expect(data.user.ext.eids[0].source).to.equal('id.example');
      expect(data.source.ext.schain.nodes[0].asi).to.equal('appnerve.com');
    });

    it('applies floors from the price floors module', function () {
      const bid = banner();
      bid.getFloor = () => ({ floor: 0.75, currency: 'USD' });
      const imp = build([bid])[0].data.imp[0];
      expect(imp.bidfloor).to.equal(0.75);
      expect(imp.bidfloorcur).to.equal('USD');
    });

    it('keeps an explicitly configured imp.secure value', function () {
      const bid = { ...banner(), ortb2Imp: { secure: 0 } };
      expect(build([bid])[0].data.imp[0].secure).to.equal(0);
    });

    it('keeps impression level first party data', function () {
      const bid = { ...banner(), ortb2Imp: { ext: { gpid: '/123/slot' } } };
      expect(build([bid])[0].data.imp[0].ext.gpid).to.equal('/123/slot');
    });
  });

  describe('interpretResponse', function () {
    it('returns a banner bid with gross CPM and resolved price macro', function () {
      const request = build([banner()])[0];
      const bids = spec.interpretResponse(response({ impid: 'bid-banner', adm: '<div>${AUCTION_PRICE}</div>', w: 300, h: 250 }), request);
      expect(bids).to.have.length(1);
      expect(bids[0]).to.include({ requestId: 'bid-banner', cpm: 1.25, width: 300, height: 250, creativeId: 'creative-1', currency: 'USD', netRevenue: false, ttl: 300, mediaType: BANNER, ad: '<div>1.25</div>' });
      expect(bids[0].meta.advertiserDomains).to.deep.equal(['advertiser.example']);
    });

    if (FEATURES.VIDEO) {
      it('returns VAST XML for video', function () {
        const request = build([video()])[0];
        const bids = spec.interpretResponse(response({ impid: 'bid-video', adm: '<VAST version="4.0"></VAST>', w: 640, h: 360 }), request);
        expect(bids[0].mediaType).to.equal(VIDEO);
        expect(bids[0].vastXml).to.equal('<VAST version="4.0"></VAST>');
      });
    }

    if (FEATURES.VIDEO) {
      it('turns a VAST URL in adm into vastUrl', function () {
        const request = build([video()])[0];
        const bids = spec.interpretResponse(response({ impid: 'bid-video', adm: ' https://creative.example/vast.xml ' }), request);
        expect(bids[0].vastUrl).to.equal('https://creative.example/vast.xml');
        expect(bids[0].vastXml).to.equal(undefined);
      });
    }

    if (FEATURES.NATIVE && FEATURES.AUDIO) {
      it('returns audio and native bids', function () {
        const audioBids = spec.interpretResponse(response({ impid: 'bid-audio', adm: '<VAST version="4.0"></VAST>' }), build([audio()])[0]);
        expect(audioBids[0].mediaType).to.equal(AUDIO);
        expect(audioBids[0].vastXml).to.contain('<VAST');
        const adm = JSON.stringify({ ver: '1.2', assets: [{ id: 1, title: { text: 'Hello' } }, { id: 2, img: { url: 'https://img.example/a.png', w: 300, h: 250 } }], link: { url: 'https://click.example' } });
        const nativeBids = spec.interpretResponse(response({ impid: 'bid-native', adm }), build([native()])[0]);
        expect(nativeBids[0].mediaType).to.equal(NATIVE);
        expect(nativeBids[0].native.ortb.link.url).to.equal('https://click.example');
      });
    }

    if (FEATURES.VIDEO) {
      it('uses ext.prebid.type, then mtype, then adm to pick the type of a multi-format bid', function () {
        const multi = bidRequest({ banner: { sizes: [[300, 250]] }, video: { context: 'outstream', playerSize: [[640, 360]], mimes: ['video/mp4'] } });
        const request = build([multi])[0];
        expect(spec.interpretResponse(response({ impid: multi.bidId, adm: '<div></div>', w: 300, h: 250, ext: { prebid: { type: 'banner' } } }), request)[0].mediaType).to.equal(BANNER);
        expect(spec.interpretResponse(response({ impid: multi.bidId, adm: '<VAST></VAST>', mtype: 2 }), build([multi])[0])[0].mediaType).to.equal(VIDEO);
        expect(spec.interpretResponse(response({ impid: multi.bidId, adm: '<VAST version="3.0"></VAST>' }), build([multi])[0])[0].mediaType).to.equal(VIDEO);
        expect(spec.interpretResponse(response({ impid: multi.bidId, adm: '<div></div>', w: 300, h: 250 }), build([multi])[0])[0].mediaType).to.equal(BANNER);
      });

      it('resolves the media type separately for each bid in one response', function () {
        const multi = bidRequest({ banner: { sizes: [[300, 250]] }, video: { context: 'outstream', playerSize: [[640, 360]], mimes: ['video/mp4'] } });
        const request = build([multi])[0];
        const body = {
          id: 'response',
          cur: 'USD',
          seatbid: [{
            seat: 'appnerve',
            bid: [
              { id: 'b1', impid: multi.bidId, price: 1, crid: 'c1', adm: '<VAST version="3.0"></VAST>', mtype: 2 },
              { id: 'b2', impid: multi.bidId, price: 1, crid: 'c2', adm: '<div></div>', w: 300, h: 250, mtype: 1 }
            ]
          }]
        };
        const bids = spec.interpretResponse({ body }, request);
        expect(bids.map((b) => b.mediaType)).to.deep.equal([VIDEO, BANNER]);
      });
    }

    if (FEATURES.VIDEO && FEATURES.NATIVE) {
      it('drops a multi-format bid whose type cannot be matched', function () {
        const multi = bidRequest({ video: { context: 'instream', playerSize: [[640, 360]], mimes: ['video/mp4'] }, native: native().mediaTypes.native }, undefined, { nativeOrtbRequest: NATIVE_ORTB });
        const bids = spec.interpretResponse(response({ impid: multi.bidId, adm: 'plain text' }), build([multi])[0]);
        expect(bids).to.deep.equal([]);
      });
    }

    it('ignores bids for unknown impressions', function () {
      const bids = spec.interpretResponse(response({ impid: 'other', adm: '<div></div>', w: 300, h: 250 }), build([banner()])[0]);
      expect(bids).to.deep.equal([]);
    });

    it('returns nothing for empty or malformed responses', function () {
      const request = build([banner()])[0];
      expect(spec.interpretResponse({ body: '' }, request)).to.deep.equal([]);
      expect(spec.interpretResponse({}, request)).to.deep.equal([]);
      expect(spec.interpretResponse({ body: { id: 'x' } }, request)).to.deep.equal([]);
      expect(spec.interpretResponse({ body: { seatbid: [] } }, request)).to.deep.equal([]);
    });
  });

  describe('user sync', function () {
    it('does not implement user syncs', function () {
      expect(spec.getUserSyncs).to.equal(undefined);
    });
  });
});
