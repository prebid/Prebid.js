import { expect } from 'chai';
import { spec, ENDPOINT_URL } from '../../../modules/sellwildBidAdapter.ts';
import * as utils from '../../../src/utils.js';
import { deepClone } from '../../../src/utils.js';
import 'modules/priceFloors.js';

const PARAMS = { partnerCode: 'acme', key: 'pub-key' };

const bannerBid = {
  adUnitCode: 'banner-div',
  auctionId: 'auction-1',
  bidId: 'bid-banner',
  bidder: 'sellwild',
  bidderRequestId: 'bidder-request-1',
  mediaTypes: { banner: { sizes: [[300, 250], [728, 90]] } },
  params: { ...PARAMS },
};

const videoBid = {
  adUnitCode: 'video-div',
  auctionId: 'auction-1',
  bidId: 'bid-video',
  bidder: 'sellwild',
  bidderRequestId: 'bidder-request-1',
  mediaTypes: {
    video: { context: 'instream', playerSize: [[640, 480]], mimes: ['video/mp4'], protocols: [2, 3], plcmt: 1 },
  },
  params: { ...PARAMS },
};

const multiFormatBid = {
  adUnitCode: 'multi-div',
  auctionId: 'auction-1',
  bidId: 'bid-multi',
  bidder: 'sellwild',
  bidderRequestId: 'bidder-request-1',
  mediaTypes: {
    banner: { sizes: [[300, 250]] },
    video: { context: 'outstream', playerSize: [[640, 360]], mimes: ['video/mp4'] },
  },
  params: { ...PARAMS },
};

const NATIVE_ORTB_REQUEST = { ver: '1.2', assets: [{ id: 1, required: 1, title: { len: 80 } }] };

const nativeBid = {
  adUnitCode: 'native-div',
  auctionId: 'auction-1',
  bidId: 'bid-native',
  bidder: 'sellwild',
  bidderRequestId: 'bidder-request-1',
  mediaTypes: { native: { ortb: NATIVE_ORTB_REQUEST } },
  nativeOrtbRequest: NATIVE_ORTB_REQUEST,
  params: { ...PARAMS },
};

const bannerNativeBid = {
  ...nativeBid,
  adUnitCode: 'banner-native-div',
  bidId: 'bid-banner-native',
  mediaTypes: { banner: { sizes: [[300, 250]] }, native: { ortb: NATIVE_ORTB_REQUEST } },
};

const NATIVE_ADM = JSON.stringify({ ver: '1.2', assets: [{ id: 1, title: { text: 'Hello' } }], link: { url: 'https://brand.com' } });

function bidderRequestFor(bids) {
  return {
    bidderCode: 'sellwild',
    auctionId: 'auction-1',
    bidderRequestId: 'bidder-request-1',
    bids,
    timeout: 1000,
    refererInfo: { page: 'https://www.example.com/article', domain: 'www.example.com' },
    ortb2: { site: { page: 'https://www.example.com/article', domain: 'www.example.com' } },
  };
}

function bidsOf(response) {
  return Array.isArray(response) ? response : response.bids;
}

function build(bids) {
  const copies = bids.map(deepClone);
  return spec.buildRequests(copies, bidderRequestFor(copies));
}

describe('Sellwild bid adapter', () => {
  describe('spec', () => {
    it('declares the bidder code and media types', () => {
      expect(spec.code).to.equal('sellwild');
      expect(spec.supportedMediaTypes).to.have.members(['banner', 'video', 'native']);
    });
  });

  describe('isBidRequestValid', () => {
    it('accepts a partner code and key', () => {
      expect(spec.isBidRequestValid(deepClone(bannerBid))).to.be.true;
    });

    [
      ['no params', undefined],
      ['no partnerCode', { key: 'k' }],
      ['no key', { partnerCode: 'acme' }],
      ['a blank key', { partnerCode: 'acme', key: '   ' }],
      ['a numeric key', { partnerCode: 'acme', key: 123 }],
      ['a partner code with a slash', { partnerCode: 'ac/me', key: 'k' }],
      ['a partner code over 64 characters', { partnerCode: 'a'.repeat(65), key: 'k' }],
      ['an empty partner code', { partnerCode: '', key: 'k' }],
    ].forEach(([name, params]) => {
      it(`rejects ${name}`, () => {
        expect(spec.isBidRequestValid({ ...deepClone(bannerBid), params })).to.be.false;
      });
    });
  });

  describe('buildRequests', () => {
    it('posts to the partner endpoint with the key in the query string', () => {
      const [request] = build([bannerBid]);
      expect(request.method).to.equal('POST');
      expect(request.url).to.equal(`${ENDPOINT_URL}acme?key=pub-key`);
      expect(request.options).to.deep.equal({ withCredentials: false });
    });

    it('encodes the partner code and key', () => {
      const bid = { ...deepClone(bannerBid), params: { partnerCode: 'acme', key: 'a+b/c=' } };
      const [request] = build([bid]);
      expect(request.url).to.equal(`${ENDPOINT_URL}acme?key=a%2Bb%2Fc%3D`);
    });

    it('builds an OpenRTB request with one imp per bid', () => {
      const [request] = build([bannerBid, videoBid]);
      const imps = request.data.imp;
      expect(imps.map((imp) => imp.id)).to.deep.equal(['bid-banner', 'bid-video']);
      expect(imps[0].banner.format).to.deep.equal([{ w: 300, h: 250 }, { w: 728, h: 90 }]);
      expect(request.data.site.page).to.equal('https://www.example.com/article');
    });

    if (FEATURES.VIDEO) {
      it('fills imp.video from the ad unit', () => {
        const [request] = build([videoBid]);
        expect(request.data.imp[0].video).to.include({ w: 640, h: 480, plcmt: 1 });
      });
    }

    it('never puts the key or bidder params in the request body', () => {
      const [request] = build([bannerBid]);
      const body = JSON.stringify(request.data);
      expect(body).to.not.include('pub-key');
      expect(body).to.not.include('partnerCode');
    });

    it('sends one request per partner code and key', () => {
      const other = { ...deepClone(bannerBid), bidId: 'bid-other', params: { partnerCode: 'acme', key: 'other-key' } };
      const second = { ...deepClone(bannerBid), bidId: 'bid-second', params: { partnerCode: 'beta', key: 'pub-key' } };
      const requests = build([bannerBid, other, videoBid, second]);
      expect(requests.map((r) => r.url)).to.deep.equal([
        `${ENDPOINT_URL}acme?key=pub-key`,
        `${ENDPOINT_URL}acme?key=other-key`,
        `${ENDPOINT_URL}beta?key=pub-key`,
      ]);
      expect(requests[0].data.imp.map((imp) => imp.id)).to.deep.equal(['bid-banner', 'bid-video']);
      expect(requests[1].data.imp.map((imp) => imp.id)).to.deep.equal(['bid-other']);
      expect(requests[2].data.imp.map((imp) => imp.id)).to.deep.equal(['bid-second']);
    });

    it('passes the floor from getFloor', () => {
      const bid = deepClone(bannerBid);
      bid.getFloor = () => ({ floor: 1.25, currency: 'USD' });
      const [request] = build([bid]);
      expect(request.data.imp[0]).to.include({ bidfloor: 1.25, bidfloorcur: 'USD' });
    });
  });

  describe('interpretResponse', () => {
    function respond(bids, response) {
      const [request] = build(bids);
      return bidsOf(spec.interpretResponse({ body: response(request.data) }, request));
    }

    it('returns banner bids using mtype', () => {
      const [bid] = respond([bannerBid], (req) => ({
        id: req.id,
        cur: 'USD',
        seatbid: [{
          bid: [{
            id: 'b1',
            impid: 'bid-banner',
            price: 2.5,
            adm: '<div>ad</div>',
            w: 300,
            h: 250,
            crid: 'cr1',
            mtype: 1,
            adomain: ['brand.com'],
            burl: 'https://exchange.sellwild.com/win/x?p=${AUCTION_PRICE}',
          }],
        }],
      }));
      expect(bid).to.include({
        requestId: 'bid-banner',
        cpm: 2.5,
        mediaType: 'banner',
        ad: '<div>ad</div>',
        width: 300,
        height: 250,
        creativeId: 'cr1',
        currency: 'USD',
        netRevenue: true,
        ttl: 300,
      });
      expect(bid.burl).to.equal('https://exchange.sellwild.com/win/x?p=${AUCTION_PRICE}');
      expect(bid.meta.advertiserDomains).to.deep.equal(['brand.com']);
    });

    if (FEATURES.VIDEO) {
      it('returns video bids as vastXml', () => {
        const [bid] = respond([videoBid], (req) => ({
          id: req.id,
          seatbid: [{ bid: [{ id: 'v1', impid: 'bid-video', price: 8, adm: '<VAST version="4.0"><Ad/></VAST>', crid: 'cr2', mtype: 2 }] }],
        }));
        expect(bid).to.include({ requestId: 'bid-video', mediaType: 'video', vastXml: '<VAST version="4.0"><Ad/></VAST>' });
      });
    }

    it('takes the media type from a single-format ad unit when mtype is missing', () => {
      const [bid] = respond([bannerBid], (req) => ({
        id: req.id,
        seatbid: [{ bid: [{ id: 'b1', impid: 'bid-banner', price: 1, adm: '<div/>', w: 300, h: 250, crid: 'c' }] }],
      }));
      expect(bid.mediaType).to.equal('banner');
    });

    if (FEATURES.VIDEO) {
      it('takes the media type from the markup on a multi-format ad unit when mtype is missing', () => {
        const bids = respond([multiFormatBid], (req) => ({
          id: req.id,
          seatbid: [{
            bid: [
              { id: 'v', impid: 'bid-multi', price: 3, adm: '<?xml version="1.0"?><VAST version="3.0"></VAST>', crid: 'c' },
              { id: 'b', impid: 'bid-multi', price: 2, adm: '<div/>', w: 300, h: 250, crid: 'c' },
            ],
          }],
        }));
        expect(bids.map((b) => b.mediaType)).to.deep.equal(['video', 'banner']);
      });
    }

    if (FEATURES.VIDEO) {
      it('does not let one bid\'s inferred type leak to another bid on the same imp', () => {
        const bids = respond([multiFormatBid], (req) => ({
          id: req.id,
          seatbid: [{
            bid: [
              { id: 'v', impid: 'bid-multi', price: 3, adm: '<VAST version="3.0"></VAST>', crid: 'c' },
              { id: 'b', impid: 'bid-multi', price: 2, adm: '<div/>', w: 300, h: 250, crid: 'c', mtype: 1 },
            ],
          }],
        }));
        expect(bids.map((b) => b.mediaType)).to.deep.equal(['video', 'banner']);
        expect(bids[1].ad).to.equal('<div/>');
      });

      it('takes the type from a single-format ad unit even without markup', () => {
        const [bid] = respond([videoBid], (req) => ({
          id: req.id,
          seatbid: [{ bid: [{ id: 'v', impid: 'bid-video', price: 3, nurl: 'https://demand.example/vast.xml', crid: 'c' }] }],
        }));
        expect(bid.mediaType).to.equal('video');
      });
    }

    if (FEATURES.NATIVE) {
      it('fills imp.native from the ad unit', () => {
        const [request] = build([nativeBid]);
        expect(JSON.parse(request.data.imp[0].native.request)).to.deep.equal(NATIVE_ORTB_REQUEST);
      });

      it('returns native bids', () => {
        const [bid] = respond([nativeBid], (req) => ({
          id: req.id,
          seatbid: [{ bid: [{ id: 'n', impid: 'bid-native', price: 1.5, adm: NATIVE_ADM, crid: 'c', mtype: 4 }] }],
        }));
        expect(bid.mediaType).to.equal('native');
        expect(bid.native.ortb.assets[0].title.text).to.equal('Hello');
      });

      it('recognises native markup on a banner and native ad unit when mtype is missing', () => {
        const bids = respond([bannerNativeBid], (req) => ({
          id: req.id,
          seatbid: [{
            bid: [
              { id: 'n', impid: 'bid-banner-native', price: 1.5, adm: NATIVE_ADM, crid: 'c' },
              { id: 'b', impid: 'bid-banner-native', price: 1, adm: '<div/>', w: 300, h: 250, crid: 'c' },
            ],
          }],
        }));
        expect(bids.map((b) => b.mediaType)).to.deep.equal(['native', 'banner']);
      });

      it('treats JSON without a top-level assets array as banner markup', () => {
        const [bid] = respond([bannerNativeBid], (req) => ({
          id: req.id,
          seatbid: [{ bid: [{ id: 'x', impid: 'bid-banner-native', price: 1, adm: '{"native":{"assets":[]}}', w: 300, h: 250, crid: 'c' }] }],
        }));
        expect(bid.mediaType).to.equal('banner');
      });
    }

    it('returns no bids for an empty or no-bid response', () => {
      const [request] = build([bannerBid]);
      expect(spec.interpretResponse({ body: undefined }, request)).to.deep.equal([]);
      expect(bidsOf(spec.interpretResponse({ body: { id: request.data.id } }, request))).to.deep.equal([]);
    });
  });

  describe('onBidBillable', () => {
    let triggerPixelStub;

    beforeEach(() => {
      triggerPixelStub = sinon.stub(utils, 'triggerPixel');
    });

    afterEach(() => {
      triggerPixelStub.restore();
    });

    it('fires burl with the auction price for banner', () => {
      spec.onBidBillable({ mediaType: 'banner', burl: 'https://exchange.sellwild.com/win/x?p=${AUCTION_PRICE}', cpm: 2, originalCpm: 2.5 });
      expect(triggerPixelStub.calledOnceWith('https://exchange.sellwild.com/win/x?p=2.5')).to.be.true;
    });

    it('does not fire for video, whose VAST carries the win impression', () => {
      spec.onBidBillable({ mediaType: 'video', burl: 'https://exchange.sellwild.com/win/x', cpm: 2 });
      expect(triggerPixelStub.called).to.be.false;
    });

    it('does nothing without burl', () => {
      spec.onBidBillable({ mediaType: 'banner', cpm: 2 });
      expect(triggerPixelStub.called).to.be.false;
    });
  });
});
