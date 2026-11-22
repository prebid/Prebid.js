import { expect } from 'chai';
import { spec } from '../../../modules/bidespressoBidAdapter.ts';
import { deepClone } from '../../../src/utils.js';
import { hook } from '../../../src/hook.js';
// Load core plus the modules that register the converter's real ORTB
// processors — without these, floors/currency/consent conversion logic is a
// no-op in tests and assertions against it would pass vacuously.
import 'src/prebid.js';
import 'modules/currency.js';
import 'modules/priceFloors.js';
import 'modules/consentManagementTcf.js';
import 'modules/consentManagementUsp.js';

const ENDPOINT_URL = 'https://auction.bidespresso.com/openrtb2/auction';
const SYNC_URL = 'https://auction.bidespresso.com/usync';

const bidRequestBase = {
  adUnitCode: 'banner-ad-unit-code',
  auctionId: 'auction-id',
  bidId: 'bid-id-1',
  bidder: 'bidespresso',
  bidderRequestId: 'bidder-request-id',
  mediaTypes: { banner: { sizes: [[300, 250]] } },
  params: { publisherId: 'k8xw2r4p', inventoryId: 'n7c3tkqe' },
};

describe('Bid Espresso bid adapter', () => {
  before(() => {
    hook.ready();
  });

  describe('spec', () => {
    it('has the required properties', () => {
      expect(spec).to.have.property('code', 'bidespresso');
      expect(spec).to.have.property('supportedMediaTypes').that.includes('banner');
      expect(spec).to.have.property('supportedMediaTypes').that.includes('video');
      expect(spec).to.have.property('isBidRequestValid').that.is.a('function');
      expect(spec).to.have.property('buildRequests').that.is.a('function');
      expect(spec).to.have.property('interpretResponse').that.is.a('function');
      expect(spec).to.have.property('getUserSyncs').that.is.a('function');
    });
  });

  describe('isBidRequestValid', () => {
    let bid;

    beforeEach(() => {
      bid = deepClone(bidRequestBase);
    });

    it('returns true when both publisherId and inventoryId are non-empty strings', () => {
      expect(spec.isBidRequestValid(bid)).to.be.true;
    });

    it('returns false when inventoryId is missing', () => {
      delete bid.params.inventoryId;
      expect(spec.isBidRequestValid(bid)).to.be.false;
    });

    it('returns false when params is missing', () => {
      delete bid.params;
      expect(spec.isBidRequestValid(bid)).to.be.false;
    });

    it('returns false when publisherId is missing', () => {
      bid.params = { inventoryId: 'n7c3tkqe' };
      expect(spec.isBidRequestValid(bid)).to.be.false;
    });

    it('returns false when publisherId is an empty string', () => {
      bid.params = { publisherId: '', inventoryId: 'n7c3tkqe' };
      expect(spec.isBidRequestValid(bid)).to.be.false;
    });

    it('returns false when publisherId is a number', () => {
      bid.params = { publisherId: 12345, inventoryId: 'n7c3tkqe' };
      expect(spec.isBidRequestValid(bid)).to.be.false;
    });

    it('returns false when inventoryId is present but empty', () => {
      bid.params.inventoryId = '';
      expect(spec.isBidRequestValid(bid)).to.be.false;
    });

    it('returns false when inventoryId is present but not a string', () => {
      bid.params.inventoryId = 42;
      expect(spec.isBidRequestValid(bid)).to.be.false;
    });

    describe('video-only ad units', () => {
      beforeEach(() => {
        bid.mediaTypes = {
          video: { context: 'instream', playerSize: [[640, 480]], mimes: ['video/mp4'] },
        };
      });

      it('returns true for a well-formed video declaration', () => {
        expect(spec.isBidRequestValid(bid)).to.be.true;
      });

      it('returns false when mimes is missing', () => {
        delete bid.mediaTypes.video.mimes;
        expect(spec.isBidRequestValid(bid)).to.be.false;
      });

      it('returns false when mimes is an empty array', () => {
        bid.mediaTypes.video.mimes = [];
        expect(spec.isBidRequestValid(bid)).to.be.false;
      });

      it('accepts a flat playerSize ([w, h])', () => {
        bid.mediaTypes.video.playerSize = [640, 480];
        expect(spec.isBidRequestValid(bid)).to.be.true;
      });

      it('accepts numeric w/h in place of playerSize', () => {
        delete bid.mediaTypes.video.playerSize;
        bid.mediaTypes.video.w = 640;
        bid.mediaTypes.video.h = 480;
        expect(spec.isBidRequestValid(bid)).to.be.true;
      });

      it('returns false when no player size is resolvable', () => {
        delete bid.mediaTypes.video.playerSize;
        expect(spec.isBidRequestValid(bid)).to.be.false;
      });
    });

    it('keeps a mixed banner+video ad unit valid even when the video half is malformed', () => {
      bid.mediaTypes = {
        banner: { sizes: [[300, 250]] },
        video: { context: 'instream' }, // no mimes, no size — banner can still bid
      };
      expect(spec.isBidRequestValid(bid)).to.be.true;
    });
  });

  describe('buildRequests', () => {
    let bid;
    let bidderRequest;

    beforeEach(() => {
      bid = deepClone(bidRequestBase);
      bidderRequest = {
        bidderCode: 'bidespresso',
        auctionId: bid.auctionId,
        bidderRequestId: bid.bidderRequestId,
        bids: [bid],
        ortb2: {
          site: { page: 'https://example.com/article' },
        },
      };
    });

    it('sends one POST per segment group with both routing params on the URL', () => {
      const requests = spec.buildRequests([bid], bidderRequest);
      expect(requests).to.have.lengthOf(1);
      expect(requests[0].method).to.equal('POST');
      expect(requests[0].url).to.equal(`${ENDPOINT_URL}?pub=k8xw2r4p&inv=n7c3tkqe`);
    });

    it('splits a mixed-segment page into one request per publisherId|inventoryId group', () => {
      const secondBid = deepClone(bidRequestBase);
      secondBid.bidId = 'bid-id-2';
      secondBid.adUnitCode = 'second-ad-unit';
      secondBid.params = { publisherId: 'k8xw2r4p', inventoryId: 'zz99tt11' };
      bidderRequest.bids = [bid, secondBid];

      const requests = spec.buildRequests([bid, secondBid], bidderRequest);
      expect(requests).to.have.lengthOf(2);
      const first = requests.find((r) => r.url === `${ENDPOINT_URL}?pub=k8xw2r4p&inv=n7c3tkqe`);
      const second = requests.find((r) => r.url === `${ENDPOINT_URL}?pub=k8xw2r4p&inv=zz99tt11`);
      expect(first, 'request for segment n7c3tkqe').to.exist;
      expect(second, 'request for segment zz99tt11').to.exist;
      expect(first.data.imp).to.have.lengthOf(1);
      expect(first.data.imp[0].id).to.equal('bid-id-1');
      expect(first.data.imp[0].ext.inventoryId).to.equal('n7c3tkqe');
      expect(second.data.imp).to.have.lengthOf(1);
      expect(second.data.imp[0].id).to.equal('bid-id-2');
      expect(second.data.imp[0].ext.inventoryId).to.equal('zz99tt11');
      expect(first.data.id).to.not.equal(second.data.id);
    });

    it('never merges segments whose ids contain the group delimiter', () => {
      bid.params = { publisherId: 'a|b', inventoryId: 'c' };
      const secondBid = deepClone(bidRequestBase);
      secondBid.bidId = 'bid-id-2';
      secondBid.params = { publisherId: 'a', inventoryId: 'b|c' };
      bidderRequest.bids = [bid, secondBid];

      const requests = spec.buildRequests([bid, secondBid], bidderRequest);
      expect(requests).to.have.lengthOf(2);
    });

    it('drops an empty user object after stripping a lone buyeruid', () => {
      bidderRequest.ortb2.user = { buyeruid: 'page-injected-id' };
      const [request] = spec.buildRequests([bid], bidderRequest);
      expect(request.data.user).to.be.undefined;
    });

    it('drops an empty regs object (gpp_sid without gpp is meaningless)', () => {
      bidderRequest.ortb2.regs = { gpp_sid: [7] };
      const [request] = spec.buildRequests([bid], bidderRequest);
      expect(request.data.regs).to.be.undefined;
    });

    it('URL-encodes both param values', () => {
      bid.params.publisherId = 'a b&c';
      bid.params.inventoryId = 'x/y';
      const requests = spec.buildRequests([bid], bidderRequest);
      expect(requests[0].url).to.equal(`${ENDPOINT_URL}?pub=a%20b%26c&inv=x%2Fy`);
    });

    it('sends a credentialed request so the user-match cookie can attach', () => {
      const [request] = spec.buildRequests([bid], bidderRequest);
      expect(request.options.withCredentials).to.equal(true);
    });

    it('uses a simple content type to avoid a CORS preflight', () => {
      const [request] = spec.buildRequests([bid], bidderRequest);
      expect(request.options.contentType).to.equal('text/plain');
    });

    it('builds an ORTB request with one banner imp per bid', () => {
      const secondBid = deepClone(bidRequestBase);
      secondBid.bidId = 'bid-id-2';
      secondBid.adUnitCode = 'banner-ad-unit-code-2';
      bidderRequest.bids = [bid, secondBid];

      const [request] = spec.buildRequests([bid, secondBid], bidderRequest);
      expect(request.data.imp).to.have.lengthOf(2);
      expect(request.data.imp[0].id).to.equal('bid-id-1');
      expect(request.data.imp[0].banner.format).to.deep.equal([{ w: 300, h: 250 }]);
      expect(request.data.imp[1].id).to.equal('bid-id-2');
      expect(request.data.site.page).to.equal('https://example.com/article');
    });

    it('stamps imp.tagid from the ad unit code and respects a publisher preset', () => {
      const presetBid = deepClone(bidRequestBase);
      presetBid.bidId = 'bid-id-2';
      presetBid.adUnitCode = 'preset-ad-unit';
      presetBid.ortb2Imp = { tagid: 'publisher-tag' };
      bidderRequest.bids = [bid, presetBid];

      const [request] = spec.buildRequests([bid, presetBid], bidderRequest);
      expect(request.data.imp[0].tagid).to.equal('banner-ad-unit-code');
      expect(request.data.imp[1].tagid).to.equal('publisher-tag');
    });

    it('stamps imp.ext.inventoryId on every imp', () => {
      const [request] = spec.buildRequests([bid], bidderRequest);
      expect(request.data.imp[0].ext.inventoryId).to.equal('n7c3tkqe');
    });

    it('sets displaymanager defaults and lets publisher ortb2Imp win', () => {
      const presetBid = deepClone(bidRequestBase);
      presetBid.bidId = 'bid-id-2';
      presetBid.adUnitCode = 'preset-ad-unit';
      presetBid.ortb2Imp = { displaymanager: 'PubPlayer', displaymanagerver: '9.9' };
      bidderRequest.bids = [bid, presetBid];

      const [request] = spec.buildRequests([bid, presetBid], bidderRequest);
      expect(request.data.imp[0].displaymanager).to.equal('Prebid.js');
      expect(request.data.imp[0].displaymanagerver).to.be.a('string').with.length.greaterThan(0);
      expect(request.data.imp[1].displaymanager).to.equal('PubPlayer');
      expect(request.data.imp[1].displaymanagerver).to.equal('9.9');
    });

    it('strips a page-injected user.buyeruid but keeps the rest of user', () => {
      bidderRequest.ortb2.user = { buyeruid: 'page-injected-id', id: 'keep-me' };
      const [request] = spec.buildRequests([bid], bidderRequest);
      expect(request.data.user.buyeruid).to.be.undefined;
      expect(request.data.user.id).to.equal('keep-me');
    });

    it('carries ortb2Imp.ext.gpid through untouched', () => {
      bid.ortb2Imp = { ext: { gpid: '/1234/homepage#top' } };
      const [request] = spec.buildRequests([bid], bidderRequest);
      expect(request.data.imp[0].ext.gpid).to.equal('/1234/homepage#top');
      expect(request.data.imp[0].ext.inventoryId).to.equal('n7c3tkqe');
    });

    it('attaches a USD floor from the floors module', () => {
      bid.getFloor = ({ currency }) => ({ currency, floor: 1.25 });
      const [request] = spec.buildRequests([bid], bidderRequest);
      expect(request.data.imp[0].bidfloor).to.equal(1.25);
      expect(request.data.imp[0].bidfloorcur).to.equal('USD');
    });

    it('refuses a floor the module cannot quote in USD', () => {
      bid.getFloor = () => ({ currency: 'EUR', floor: 0.8 });
      const [request] = spec.buildRequests([bid], bidderRequest);
      expect(request.data.imp[0].bidfloor).to.be.undefined;
      expect(request.data.imp[0].bidfloorcur).to.be.undefined;
    });

    it('attaches per-size granular floors when they resolve in USD', () => {
      bid.mediaTypes = { banner: { sizes: [[300, 250], [728, 90]] } };
      bid.getFloor = ({ currency, size }) => ({
        currency,
        floor: Array.isArray(size) && size[0] === 728 ? 2.5 : 1.25,
      });
      const [request] = spec.buildRequests([bid], bidderRequest);
      const formats = request.data.imp[0].banner.format;
      const leaderboard = formats.find((f) => f.w === 728);
      expect(leaderboard.ext.bidfloor).to.equal(2.5);
      expect(leaderboard.ext.bidfloorcur).to.equal('USD');
    });

    it('withholds granular floors that cannot resolve in USD', () => {
      bid.mediaTypes = { banner: { sizes: [[300, 250], [728, 90]] } };
      bid.getFloor = ({ size }) => ({
        currency: 'EUR',
        floor: Array.isArray(size) && size[0] === 728 ? 2.5 : 0.8,
      });
      const [request] = spec.buildRequests([bid], bidderRequest);
      expect(request.data.imp[0].bidfloor).to.be.undefined;
      const banner = request.data.imp[0].banner;
      expect(banner.ext?.bidfloor).to.be.undefined;
      (banner.format ?? []).forEach((f) => {
        expect(f.ext?.bidfloor, `format ${f.w}x${f.h}`).to.be.undefined;
      });
    });

    it('forwards the COPPA flag from config', () => {
      bidderRequest.ortb2.regs = { coppa: 1 };
      const [request] = spec.buildRequests([bid], bidderRequest);
      expect(request.data.regs.coppa).to.equal(1);
    });

    if (FEATURES.VIDEO) {
      it('builds a video imp for a video-only ad unit', () => {
        bid.mediaTypes = {
          video: { context: 'instream', playerSize: [[640, 480]], mimes: ['video/mp4'], protocols: [2, 3] },
        };
        const [request] = spec.buildRequests([bid], bidderRequest);
        expect(request.data.imp).to.have.lengthOf(1);
        expect(request.data.imp[0].video).to.exist;
        expect(request.data.imp[0].video.w).to.equal(640);
        expect(request.data.imp[0].video.h).to.equal(480);
        expect(request.data.imp[0].video.mimes).to.deep.equal(['video/mp4']);
        expect(request.data.imp[0].banner).to.not.exist;
      });
    }

    if (FEATURES.VIDEO) {
      it('sends both media objects for a mixed banner+video ad unit', () => {
        bid.mediaTypes = {
          banner: { sizes: [[300, 250]] },
          video: { context: 'instream', playerSize: [[640, 480]], mimes: ['video/mp4'] },
        };
        const [request] = spec.buildRequests([bid], bidderRequest);
        expect(request.data.imp).to.have.lengthOf(1);
        expect(request.data.imp[0].banner).to.exist;
        expect(request.data.imp[0].video).to.exist;
        expect(request.data.imp[0].video.mimes).to.deep.equal(['video/mp4']);
      });
    }

    it('drops only a malformed video half from a mixed ad unit', () => {
      bid.mediaTypes = {
        banner: { sizes: [[300, 250]] },
        video: { context: 'instream' }, // no mimes, no size — banner still bids
      };
      const [request] = spec.buildRequests([bid], bidderRequest);
      expect(request.data.imp).to.have.lengthOf(1);
      expect(request.data.imp[0].banner).to.exist;
      expect(request.data.imp[0].video).to.not.exist;
    });

    it('drops an ortb2Imp-injected video that has no mediaTypes declaration to validate', () => {
      bid.ortb2Imp = { video: { mimes: ['video/mp4'], w: 640, h: 480 } };
      const [request] = spec.buildRequests([bid], bidderRequest);
      expect(request.data.imp[0].banner).to.exist;
      expect(request.data.imp[0].video).to.not.exist;
    });

    it('carries page-level deals (ortb2Imp.pmp) into the imp', () => {
      bid.ortb2Imp = {
        pmp: {
          private_auction: 0,
          deals: [{ id: 'MAGNITE-DEAL-1', bidfloor: 2.5, bidfloorcur: 'USD' }],
        },
      };
      const [request] = spec.buildRequests([bid], bidderRequest);
      expect(request.data.imp[0].pmp).to.deep.equal({
        private_auction: 0,
        deals: [{ id: 'MAGNITE-DEAL-1', bidfloor: 2.5, bidfloorcur: 'USD' }],
      });
    });

    it('forwards 2.5-located consent untouched', () => {
      bidderRequest.ortb2.regs = { ext: { gdpr: 0, us_privacy: '1YNN' } };
      const [request] = spec.buildRequests([bid], bidderRequest);
      expect(request.data.regs.ext.gdpr).to.equal(0);
      expect(request.data.regs.ext.us_privacy).to.equal('1YNN');
    });

    it('relocates root-level gpp/gpp_sid to regs.ext', () => {
      bidderRequest.ortb2.regs = { gpp: 'DBACOe~SOMETHING', gpp_sid: [7] };
      const [request] = spec.buildRequests([bid], bidderRequest);
      expect(request.data.regs.ext.gpp).to.equal('DBACOe~SOMETHING');
      expect(request.data.regs.ext.gpp_sid).to.deep.equal([7]);
      expect(request.data.regs.gpp).to.be.undefined;
      expect(request.data.regs.gpp_sid).to.be.undefined;
    });

    it('keeps the ext copy and drops the root copy when gpp is in both locations', () => {
      bidderRequest.ortb2.regs = { gpp: 'ROOT-COPY', gpp_sid: [7], ext: { gpp: 'EXT-COPY', gpp_sid: [6] } };
      const [request] = spec.buildRequests([bid], bidderRequest);
      expect(request.data.regs.ext.gpp).to.equal('EXT-COPY');
      expect(request.data.regs.ext.gpp_sid).to.deep.equal([6]);
      expect(request.data.regs.gpp).to.be.undefined;
      expect(request.data.regs.gpp_sid).to.be.undefined;
    });

    it('passes user.ext.eids through untouched (core normalizes eids before adapters run)', () => {
      const eids = [{ source: 'pubcid.org', uids: [{ id: 'abc-123', atype: 1 }] }];
      bidderRequest.ortb2.user = { ext: { eids } };
      const [request] = spec.buildRequests([bid], bidderRequest);
      expect(request.data.user.ext.eids).to.deep.equal(eids);
      expect(request.data.user.eids).to.be.undefined;
    });
  });

  describe('interpretResponse', () => {
    let bid;
    let bidderRequest;
    let request;
    let serverResponse;

    // Shaped like a REAL gateway response: upstream answers in an oRTB 2.4-era
    // dialect, so bids carry no `mtype` and the response no `cur`. The adapter
    // pins both via converter context. The response id echoes the request id.
    const gatewayResponseBody = {
      seatbid: [
        {
          seat: '2307',
          bid: [
            {
              id: '1',
              impid: 'bid-id-1',
              price: 0.09,
              adm: '<div>bidespresso-ad</div>',
              adomain: ['advertiser.example'],
              crid: '2307:abc123',
              w: 300,
              h: 250,
            },
          ],
        },
      ],
      ext: { optimera: { bids: 1, ms: 200, note: 'ok', synced: false, variant: 'go-v2' } },
    };

    beforeEach(() => {
      bid = deepClone(bidRequestBase);
      bidderRequest = {
        bidderCode: 'bidespresso',
        auctionId: bid.auctionId,
        bidderRequestId: bid.bidderRequestId,
        bids: [bid],
        ortb2: {},
      };
      [request] = spec.buildRequests([bid], bidderRequest);
      serverResponse = { body: deepClone(gatewayResponseBody) };
      serverResponse.body.id = request.data.id;
    });

    it('maps a gateway banner bid without mtype or cur to a Prebid bid', () => {
      const result = spec.interpretResponse(serverResponse, request);
      const bids = result.bids;
      expect(bids).to.have.lengthOf(1);
      expect(bids[0].requestId).to.equal('bid-id-1');
      expect(bids[0].cpm).to.equal(0.09);
      expect(bids[0].width).to.equal(300);
      expect(bids[0].height).to.equal(250);
      expect(bids[0].ad).to.equal('<div>bidespresso-ad</div>');
      expect(bids[0].creativeId).to.equal('2307:abc123');
      expect(bids[0].currency).to.equal('USD');
      expect(bids[0].netRevenue).to.equal(true);
      expect(bids[0].ttl).to.equal(300);
      expect(bids[0].mediaType).to.equal('banner');
      expect(bids[0].meta.advertiserDomains).to.deep.equal(['advertiser.example']);
    });

    it('surfaces a deal ID when the gateway returns one', () => {
      serverResponse.body.seatbid[0].bid[0].dealid = 'MAGNITE-DEAL-1';
      const result = spec.interpretResponse(serverResponse, request);
      expect(result.bids).to.have.lengthOf(1);
      expect(result.bids[0].dealId).to.equal('MAGNITE-DEAL-1');
    });

    it('honors a per-bid exp for ttl', () => {
      serverResponse.body.seatbid[0].bid[0].exp = 42;
      const result = spec.interpretResponse(serverResponse, request);
      expect(result.bids[0].ttl).to.equal(42);
    });

    it('drops a response that does not answer this request', () => {
      serverResponse.body.id = 'some-other-auction';
      const result = spec.interpretResponse(serverResponse, request);
      expect(result.bids).to.deep.equal([]);
    });

    it('returns no bids for an empty response body', () => {
      const result = spec.interpretResponse({ body: null }, request);
      expect(result.bids).to.have.lengthOf(0);
    });

    it('returns no bids for a literal empty-string body (a raw 204)', () => {
      const result = spec.interpretResponse({ body: '' }, request);
      expect(result.bids).to.have.lengthOf(0);
    });

    it('returns no bids for the gateway no-bid shape', () => {
      const result = spec.interpretResponse({ body: { id: request.data.id } }, request);
      expect(result.bids).to.have.lengthOf(0);
    });

    it('returns no bids when seatbid is an empty array', () => {
      const result = spec.interpretResponse({ body: { id: request.data.id, seatbid: [] } }, request);
      expect(result.bids).to.have.lengthOf(0);
    });
  });

  if (FEATURES.VIDEO) {
    describe('interpretResponse for a mixed banner+video response', () => {
      // Two ad units (one banner, one video) answered in ONE response. Pins the
      // converter's per-imp context isolation: the video bid's mediaType/ttl
      // treatment must never leak onto the banner bid.
      it('types and ttls each bid by its own imp', () => {
        const bannerBid = deepClone(bidRequestBase);
        const videoBid = deepClone(bidRequestBase);
        videoBid.bidId = 'video-bid-1';
        videoBid.adUnitCode = 'video-ad-unit-code';
        videoBid.mediaTypes = { video: { context: 'instream', playerSize: [[640, 480]], mimes: ['video/mp4'] } };
        const bidderRequest = {
          bidderCode: 'bidespresso',
          auctionId: bannerBid.auctionId,
          bidderRequestId: bannerBid.bidderRequestId,
          bids: [bannerBid, videoBid],
          ortb2: {},
        };
        const [request] = spec.buildRequests([bannerBid, videoBid], bidderRequest);
        const response = {
          body: {
            id: request.data.id,
            seatbid: [
              {
                seat: '2307',
                bid: [
                  { id: 'v', impid: 'video-bid-1', price: 0.35, adm: '<VAST version="3.0"></VAST>', crid: 'vid' },
                  { id: 'b', impid: 'bid-id-1', price: 0.09, adm: '<div>ad</div>', w: 300, h: 250, crid: 'ban' },
                ],
              },
            ],
          },
        };
        const result = spec.interpretResponse(response, request);
        const bids = result.bids;
        expect(bids).to.have.lengthOf(2);
        const video = bids.find((b) => b.requestId === 'video-bid-1');
        const banner = bids.find((b) => b.requestId === 'bid-id-1');
        expect(video.mediaType).to.equal('video');
        expect(video.ttl).to.equal(900);
        expect(banner.mediaType).to.equal('banner');
        expect(banner.ttl).to.equal(300);
        expect(banner.ad).to.equal('<div>ad</div>');
      });
    });
  }

  describe('interpretResponse with gateway-stamped mtype (dual-media imps)', () => {
    // The gateway stamps `mtype` on every bid; on a dual-media imp it is the
    // ONLY way to classify a bid, since the imp carries both media objects.
    // The literals 1/2 are the wire contract.
    const mixedBid = {
      adUnitCode: 'mixed-ad-unit-code',
      auctionId: 'auction-id',
      bidId: 'mixed-bid-1',
      bidder: 'bidespresso',
      bidderRequestId: 'bidder-request-id',
      mediaTypes: {
        banner: { sizes: [[300, 250]] },
        video: { context: 'instream', playerSize: [[640, 480]], mimes: ['video/mp4'] },
      },
      params: { publisherId: 'k8xw2r4p', inventoryId: 'n7c3tkqe' },
    };
    const vast = '<VAST version="3.0"><Ad><InLine></InLine></Ad></VAST>';

    let request;

    beforeEach(() => {
      const bid = deepClone(mixedBid);
      const bidderRequest = {
        bidderCode: 'bidespresso',
        auctionId: bid.auctionId,
        bidderRequestId: bid.bidderRequestId,
        bids: [bid],
        ortb2: {},
      };
      [request] = spec.buildRequests([bid], bidderRequest);
    });

    function dualResponse(bidFields) {
      return {
        body: {
          id: request.data.id,
          seatbid: [{ seat: '2307', bid: [{ id: '1', impid: 'mixed-bid-1', price: 0.2, ...bidFields }] }],
        },
      };
    }

    it('classifies an mtype 1 bid on a dual-media imp as banner', () => {
      const result = spec.interpretResponse(
        dualResponse({ adm: '<div>banner-ad</div>', mtype: 1, w: 300, h: 250 }), request);
      expect(result.bids).to.have.lengthOf(1);
      expect(result.bids[0].mediaType).to.equal('banner');
      expect(result.bids[0].ad).to.equal('<div>banner-ad</div>');
      expect(result.bids[0].ttl).to.equal(300);
    });

    if (FEATURES.VIDEO) {
      it('classifies an mtype 2 bid on a dual-media imp as video with the video ttl', () => {
        const result = spec.interpretResponse(dualResponse({ adm: vast, mtype: 2 }), request);
        expect(result.bids).to.have.lengthOf(1);
        expect(result.bids[0].mediaType).to.equal('video');
        expect(result.bids[0].vastXml).to.equal(vast);
        expect(result.bids[0].ttl).to.equal(900);
      });
    }

    it('defaults a no-mtype bid on a dual-media imp to banner', () => {
      const result = spec.interpretResponse(
        dualResponse({ adm: '<div>legacy-ad</div>', w: 300, h: 250 }), request);
      expect(result.bids).to.have.lengthOf(1);
      expect(result.bids[0].mediaType).to.equal('banner');
      expect(result.bids[0].ttl).to.equal(300);
    });
  });

  if (FEATURES.VIDEO) {
    describe('interpretResponse for video', () => {
      // Gateway bids carry no mtype; the adapter must infer VIDEO from the imp
      // the bid answers, and video bids get the longer video ttl.
      const videoBid = {
        adUnitCode: 'video-ad-unit-code',
        auctionId: 'auction-id',
        bidId: 'video-bid-1',
        bidder: 'bidespresso',
        bidderRequestId: 'bidder-request-id',
        mediaTypes: { video: { context: 'instream', playerSize: [[640, 480]], mimes: ['video/mp4'] } },
        params: { publisherId: 'k8xw2r4p', inventoryId: 'n7c3tkqe' },
      };

      const vast = '<VAST version="3.0"><Ad><InLine></InLine></Ad></VAST>';

      it('maps a no-mtype video bid to a Prebid video bid with vastXml and the video ttl', () => {
        const bid = deepClone(videoBid);
        const bidderRequest = {
          bidderCode: 'bidespresso',
          auctionId: bid.auctionId,
          bidderRequestId: bid.bidderRequestId,
          bids: [bid],
          ortb2: {},
        };
        const [request] = spec.buildRequests([bid], bidderRequest);
        const videoServerResponse = {
          body: {
            id: request.data.id,
            seatbid: [
              {
                seat: '2307',
                bid: [
                  {
                    id: '1',
                    impid: 'video-bid-1',
                    price: 0.35,
                    adm: vast,
                    adomain: ['advertiser.example'],
                    crid: '2307:vid123',
                  },
                ],
              },
            ],
          },
        };
        const result = spec.interpretResponse(videoServerResponse, request);
        const bids = result.bids;
        expect(bids).to.have.lengthOf(1);
        expect(bids[0].requestId).to.equal('video-bid-1');
        expect(bids[0].mediaType).to.equal('video');
        expect(bids[0].cpm).to.equal(0.35);
        expect(bids[0].vastXml).to.equal(vast);
        expect(bids[0].currency).to.equal('USD');
        expect(bids[0].netRevenue).to.equal(true);
        expect(bids[0].ttl).to.equal(900);
      });
    });
  }

  describe('getUserSyncs', () => {
    it('registers nothing in pixel-only mode: the sync chain must run as a document', () => {
      expect(spec.getUserSyncs({ iframeEnabled: false, pixelEnabled: true }, [])).to.deep.equal([]);
    });

    it('registers an iframe sync when enabled', () => {
      const syncs = spec.getUserSyncs({ iframeEnabled: true }, []);
      expect(syncs).to.have.lengthOf(1);
      expect(syncs[0].type).to.equal('iframe');
      expect(syncs[0].url).to.equal(SYNC_URL);
    });

    it('appends consent params for GDPR, US Privacy and GPP', () => {
      const syncs = spec.getUserSyncs(
        { iframeEnabled: true },
        [],
        { gdprApplies: true, consentString: 'CONSENT-STRING' },
        '1YNY',
        { gppString: 'DBACOe~SOMETHING', applicableSections: [7] }
      );
      expect(syncs).to.have.lengthOf(1);
      const url = new URL(syncs[0].url);
      expect(`${url.origin}${url.pathname}`).to.equal(SYNC_URL);
      expect(url.searchParams.get('gdpr')).to.equal('1');
      expect(url.searchParams.get('gdpr_consent')).to.equal('CONSENT-STRING');
      expect(url.searchParams.get('gpp')).to.equal('DBACOe~SOMETHING');
      expect(url.searchParams.get('gpp_sid')).to.equal('7');
      expect(syncs[0].url).to.contain('us_privacy=');
    });

    it('appends no query string when no consent is available', () => {
      const syncs = spec.getUserSyncs({ iframeEnabled: true }, [], undefined, undefined, undefined);
      expect(syncs[0].url).to.equal(SYNC_URL);
      expect(syncs[0].url).to.not.contain('?');
    });
  });
});
