import { expect } from 'chai';
import { server } from 'test/mocks/xhr.js';
import { spec } from 'modules/wbBidAdapter.ts';
import * as utils from 'src/utils.js';
import { config } from 'src/config.js';
import { setConfig as setCurrencyConfig } from 'modules/currency.js';
import 'modules/priceFloors.js';
import { BANNER } from 'src/mediaTypes.js';
import { addFPDToBidderRequest } from '../../helpers/fpd.js';

const PLACEMENT_ID = '0124e053-3580-7000-a9e5-ee0fc93df3db';
const PLACEMENT_ID_UNDASHED = '0124e05335807000a9e5ee0fc93df3db';
let sandbox;

describe('WB adapter', function () {
  beforeEach(function () {
    sandbox = sinon.createSandbox();
  });

  afterEach(function () {
    sandbox.restore();
    config.resetConfig();
  });

  describe('isBidRequestValid', function () {
    it('should return true for dashed uuid placementId', function () {
      expect(spec.isBidRequestValid(getBidRequest())).to.be.true;
    });

    it('should return true for undashed uuid placementId', function () {
      const bid = getBidRequest({ placementId: PLACEMENT_ID_UNDASHED });
      expect(spec.isBidRequestValid(bid)).to.be.true;
    });

    it('should return false when placementId is missing', function () {
      const bid = getBidRequest();
      delete bid.params.placementId;
      expect(spec.isBidRequestValid(bid)).to.be.false;
    });

    it('should return false when params are missing', function () {
      expect(spec.isBidRequestValid({})).to.be.false;
    });

    it('should return false when placementId is garbage', function () {
      expect(spec.isBidRequestValid(getBidRequest({ placementId: '123' }))).to.be.false;
      expect(spec.isBidRequestValid(getBidRequest({ placementId: 'zzzzzzzz-zzzz-zzzz-zzzz-zzzzzzzzzzzz' }))).to.be.false;
    });

    it('should return false when placementId is not a string', function () {
      expect(spec.isBidRequestValid(getBidRequest({ placementId: 123456 }))).to.be.false;
    });
  });

  describe('buildRequests', function () {
    let bidderRequest;

    const buildRequest = (bidRequests = [getBidRequest()], request = bidderRequest) => spec.buildRequests(bidRequests, request)[0];

    beforeEach(function () {
      bidderRequest = getBidderRequest();
    });

    afterEach(function () {
      setCurrencyConfig({});
    });

    it('should build a single POST request for all bids', function () {
      const bidRequests = [getBidRequest(), getBidRequest({}, { bidId: 'bid-2' })];
      const requests = spec.buildRequests(bidRequests, bidderRequest);

      expect(requests).to.have.lengthOf(1);
      expect(requests[0].method).to.equal('POST');
      expect(requests[0].data.imp.map((imp) => imp.id)).to.deep.equal(['bid-1', 'bid-2']);
    });

    it('should use default endpoint', function () {
      expect(buildRequest().url).to.equal('https://ads-media.wildberries.ru/adn/v1/bids');
    });

    it('should use domain from config', function () {
      config.setConfig({ wb: { domain: 'stage.example.ru/custom/path' } });
      expect(buildRequest().url).to.equal('https://stage.example.ru/custom/path/adn/v1/bids');
    });

    it('should send credentials, text/plain content type and the display manager header', function () {
      expect(buildRequest().options).to.deep.equal({
        contentType: 'text/plain',
        customHeaders: { 'x-display-manager': 'prebid' },
        withCredentials: true,
      });
    });

    it('should fill imp fields', function () {
      const [imp] = buildRequest().data.imp;

      expect(imp.id).to.equal('bid-1');
      expect(imp.tagid).to.equal(PLACEMENT_ID);
      expect(imp.secure).to.equal(1);
      expect(imp).to.not.have.property('bidfloor');
      expect(imp).to.not.have.property('bidfloorcur');
    });

    it('should map banner sizes to format', function () {
      const bidRequest = getBidRequest();
      bidRequest.mediaTypes.banner.sizes = [[300, 600], [300, 250]];
      const [imp] = buildRequest([bidRequest]).data.imp;

      expect(imp.banner.format).to.deep.equal([{ w: 300, h: 600 }, { w: 300, h: 250 }]);
      expect(imp.banner.topframe).to.equal(utils.inIframe() ? 0 : 1);
    });

    it('should pass ortb2Imp to imp', function () {
      const bidRequest = getBidRequest({}, { ortb2Imp: { ext: { gpid: '/123/slot', tid: 'tid-1' } } });
      const [imp] = buildRequest([bidRequest]).data.imp;

      expect(imp.ext).to.deep.equal({ gpid: '/123/slot', tid: 'tid-1' });
    });

    it('should always request RUB', function () {
      setCurrencyConfig({ adServerCurrency: 'EUR' });

      return addFPDToBidderRequest(bidderRequest).then((res) => {
        expect(buildRequest([getBidRequest()], res).data.cur).to.deep.equal(['RUB']);
      });
    });

    it('should request the banner floor in RUB', function () {
      const bidRequest = getBidRequest();
      const getFloor = sandbox.stub().returns({ currency: 'RUB', floor: 2.5 });
      bidRequest.getFloor = getFloor;
      const [imp] = buildRequest([bidRequest]).data.imp;

      expect(getFloor.firstCall.args[0]).to.include({ currency: 'RUB', mediaType: BANNER });
      expect(imp.bidfloor).to.equal(2.5);
      expect(imp.bidfloorcur).to.equal('RUB');
    });

    it('should not set bidfloor when the floor could not be converted to RUB', function () {
      const bidRequest = getBidRequest();
      bidRequest.getFloor = () => ({ currency: 'USD', floor: 2.5 });
      const [imp] = buildRequest([bidRequest]).data.imp;

      expect(imp).to.not.have.property('bidfloor');
      expect(imp).to.not.have.property('bidfloorcur');
    });

    it('should not set bidfloor when getFloor returns an empty object', function () {
      const bidRequest = getBidRequest();
      bidRequest.getFloor = () => ({});
      const [imp] = buildRequest([bidRequest]).data.imp;

      expect(imp).to.not.have.property('bidfloor');
      expect(imp).to.not.have.property('bidfloorcur');
    });

    it('should pass tmax', function () {
      expect(buildRequest().data.tmax).to.equal(1500);
    });

    it('should pass first party data from ortb2 without mutating it', function () {
      bidderRequest.ortb2.site.id = 'ortb2-site';
      bidderRequest.ortb2.regs = { ext: { gdpr: 1, us_privacy: '1YNN' }, gpp: 'gpp-string', gpp_sid: [7] };
      bidderRequest.ortb2.source = { ext: { schain: { ver: '1.0', complete: 1, nodes: [] } } };
      bidderRequest.ortb2.user.ext = { consent: 'consent-string', eids: [{ source: 'pubcid.org', uids: [{ id: 'id-1', atype: 1 }] }] };
      const ortb2Before = JSON.parse(JSON.stringify(bidderRequest.ortb2));
      const { data } = buildRequest();

      expect(data.site).to.deep.equal(ortb2Before.site);
      expect(data.device).to.deep.equal(ortb2Before.device);
      expect(data.user).to.deep.equal(ortb2Before.user);
      expect(data.regs).to.deep.equal(ortb2Before.regs);
      expect(data.source).to.deep.equal(ortb2Before.source);

      data.site.id = 'changed';
      expect(bidderRequest.ortb2).to.deep.equal(ortb2Before);
    });
  });

  describe('interpretResponse', function () {
    let serverRequest;

    const interpret = (serverBids, cur) => spec.interpretResponse(getServerResponse(serverBids, cur), serverRequest);

    beforeEach(function () {
      const bidRequests = [getBidRequest(), getBidRequest({}, { bidId: 'bid-2' })];
      serverRequest = spec.buildRequests(bidRequests, getBidderRequest())[0];
    });

    it('should map a banner bid', function () {
      const [bid] = interpret([getServerBid({
        burl: 'https://example.com/bill?price=${AUCTION_PRICE}',
        adomain: ['advertiser.ru'],
        exp: 120,
      })]);

      expect(bid).to.include({
        requestId: 'bid-1',
        cpm: 12.5,
        currency: 'RUB',
        width: 300,
        height: 250,
        creativeId: 'creative-1',
        ttl: 120,
        netRevenue: true,
        mediaType: BANNER,
        burl: 'https://example.com/bill?price=12.5',
      });
      expect(bid.meta.advertiserDomains).to.deep.equal(['advertiser.ru']);
    });

    it('should use default ttl and the creative as is when the bid has no notices', function () {
      const [bid] = interpret([getServerBid()]);

      expect(bid.ttl).to.equal(300);
      expect(bid.ad).to.equal('<div>ad</div>');
      expect(bid.burl).to.be.undefined;
    });

    it('should embed the win notice into the creative as a pixel', function () {
      const [bid] = interpret([getServerBid({ nurl: 'https://example.com/win?price=${AUCTION_PRICE}' })]);

      expect(bid.ad).to.include('https://example.com/win?price=${AUCTION_PRICE}');
      expect(bid.ad.endsWith('<div>ad</div>')).to.be.true;
      expect(bid).to.not.have.property('nurl');
    });

    it('should drop a bid without price', function () {
      expect(interpret([getServerBid({ price: undefined })])).to.deep.equal([]);
    });

    it('should drop a bid with non-positive price', function () {
      expect(interpret([getServerBid({ price: 0 })])).to.deep.equal([]);
    });

    it('should replace every macro occurrence in burl', function () {
      const [bid] = interpret([getServerBid({
        burl: 'https://example.com/bill?p=${AUCTION_PRICE}&q=${AUCTION_PRICE}&c=${AUCTION_CURRENCY}&d=${AUCTION_CURRENCY}',
      })]);

      expect(bid.burl).to.equal('https://example.com/bill?p=12.5&q=12.5&c=RUB&d=RUB');
    });

    it('should use currency from the response', function () {
      const [bid] = interpret([getServerBid()], 'USD');
      expect(bid.currency).to.equal('USD');
    });

    it('should return empty array when the response has no currency', function () {
      const response = getServerResponse([getServerBid()]);
      delete response.body.cur;

      expect(spec.interpretResponse(response, serverRequest)).to.deep.equal([]);
    });

    it('should skip bids that are not banner or have no mtype', function () {
      expect(interpret([getServerBid({ mtype: 2 })])).to.deep.equal([]);
      expect(interpret([getServerBid({ mtype: undefined })])).to.deep.equal([]);
    });

    it('should map every bid of an ad server response', function () {
      const bids = spec.interpretResponse({ body: getAdServerResponse() }, serverRequest);

      expect(bids).to.have.lengthOf(2);
      expect(bids.map((bid) => bid.requestId)).to.deep.equal(['bid-1', 'bid-2']);
      expect(bids[0]).to.include({
        cpm: 1,
        currency: 'RUB',
        width: 728,
        height: 90,
        creativeId: 'prebid-mock-static',
        ttl: 300,
        mediaType: BANNER,
        burl: 'https://example.com/prebid-mock/bill?bid=request-1_bid-1&price=1',
      });
      expect(bids[0].ad).to.include('https://example.com/prebid-mock/win?bid=request-1_bid-1');
      expect(bids[0].ad).to.include('<iframe');
      expect(bids[0].meta.advertiserDomains).to.deep.equal(['wildberries.ru']);
      expect(bids[1].creativeId).to.equal('prebid-mock-tgo');
    });

    it('should map bids from several seatbids', function () {
      const response = getServerResponse([getServerBid()]);
      response.body.seatbid.push({ bid: [getServerBid({ id: 'server-bid-2', impid: 'bid-2' })] });
      const bids = spec.interpretResponse(response, serverRequest);

      expect(bids.map((bid) => bid.requestId)).to.deep.equal(['bid-1', 'bid-2']);
    });

    it('should skip bids with unknown impid', function () {
      expect(interpret([getServerBid({ impid: 'unknown' })])).to.deep.equal([]);
    });

    it('should ignore seatbids without bid array', function () {
      const response = getServerResponse([getServerBid()]);
      response.body.seatbid.push({}, { bid: null });

      expect(spec.interpretResponse(response, serverRequest)).to.have.lengthOf(1);
    });

    it('should return empty array for a response without seatbid', function () {
      expect(spec.interpretResponse(undefined, serverRequest)).to.deep.equal([]);
      expect(spec.interpretResponse({}, serverRequest)).to.deep.equal([]);
      expect(spec.interpretResponse({ body: {} }, serverRequest)).to.deep.equal([]);
      expect(spec.interpretResponse({ body: { cur: 'RUB', seatbid: [] } }, serverRequest)).to.deep.equal([]);
    });
  });

  describe('onBidBillable', function () {
    it('should send burl with keepalive', function () {
      spec.onBidBillable({ burl: 'https://example.com/bill' });

      expect(server.requests).to.have.lengthOf(1);
      expect(server.requests[0].url).to.equal('https://example.com/bill');
      expect(server.requests[0].fetch.request.keepalive).to.be.true;
    });

    it('should not send anything without burl', function () {
      spec.onBidBillable({});
      expect(server.requests).to.have.lengthOf(0);
    });
  });

  it('should not expose logging-only hooks', function () {
    ['onBidWon', 'onTimeout', 'onBidderError', 'onAdRenderSucceeded'].forEach((hook) => {
      expect(spec).to.not.have.property(hook);
    });
  });
});

/**
 *
 * @param params
 * @param overrides
 */
function getBidRequest (params = {}, overrides = {}) {
  return {
    bidder: 'wb',
    bidId: 'bid-1',
    adUnitCode: 'adUnit-123',
    auctionId: 'auction-1',
    params: {
      placementId: PLACEMENT_ID,
      ...params,
    },
    mediaTypes: {
      banner: {
        sizes: [[300, 250]],
      },
    },
    ...overrides,
  };
}

/**
 *
 */
function getBidderRequest () {
  return {
    auctionId: 'auction-1',
    timeout: 1500,
    ortb2: {
      site: { page: 'https://example.com/' },
      device: { language: 'ru', ext: { foo: 'bar' } },
      user: { keywords: 'kw' },
    },
  };
}

/**
 *
 * @param overrides
 */
function getServerBid (overrides = {}) {
  return {
    id: 'server-bid-1',
    impid: 'bid-1',
    price: 12.5,
    w: 300,
    h: 250,
    crid: 'creative-1',
    adm: '<div>ad</div>',
    mtype: 1,
    ...overrides,
  };
}

/**
 *
 * @param bids
 * @param cur
 */
function getServerResponse (bids, cur = 'RUB') {
  return {
    body: {
      cur,
      seatbid: [{ bid: bids }],
    },
  };
}

/**
 * Bid response in the shape returned by the WB ad server.
 */
function getAdServerResponse () {
  const getBid = (impid, crid, template) => ({
    id: `request-1_${impid}`,
    impid,
    price: 1,
    adm: `<iframe src="https://static.example.com/creative/${template}/template.html" width="728" height="90"></iframe>`,
    bctx: 'prebid-mock',
    crid,
    cid: 'prebid-mock',
    adomain: ['wildberries.ru'],
    nurl: `https://example.com/prebid-mock/win?bid=request-1_${impid}&price=\${AUCTION_PRICE}`,
    burl: `https://example.com/prebid-mock/bill?bid=request-1_${impid}&price=\${AUCTION_PRICE}`,
    w: 728,
    h: 90,
    mtype: 1,
  });

  return {
    id: 'request-1',
    cur: 'RUB',
    createdat: '2026-11-12T09:27:58.879488154Z',
    seatbid: [
      {
        seat: 'prebid-mock',
        bid: [
          getBid('bid-1', 'prebid-mock-static', 'banner'),
          getBid('bid-2', 'prebid-mock-tgo', 'native'),
        ],
      },
    ],
  };
}
