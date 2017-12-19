import { expect } from 'chai';
import {
  ALG,
  BIDDER_CODE, CATEGORY, DATA_PARTNER_ID, DATA_PARTNER_PIXEL_ID, ENGINE_BASE_URL, NQ, NQ_NAME, SECURITY,
  spec
} from '../../../modules/nanointeractiveBidAdapter';

describe('nanointeractive adapter tests', function () {
  const SEARCH_QUERY = 'rumpelstiltskin';
  const WIDTH = 300;
  const HEIGHT = 250;
  const SIZES = [[WIDTH, HEIGHT]];
  const AD = '<script type="text/javascript" src="https://trc.audiencemanager.de/ad/?pl=58c2829beb0a193456047a27&cb=${CACHEBUSTER}&tc=${CLICK_URL_ENC}"></script> <noscript> <a href="https://trc.audiencemanager.de/ad/?t=c&pl=58c2829beb0a193456047a27&cb=${CACHEBUSTER}&tc=${CLICK_URL_ENC}"> <img src="https://trc.audiencemanager.de/ad/?t=i&pl=58c2829beb0a193456047a27&cb=${CACHEBUSTER}" alt="Click Here" border="0"> </a> </noscript>';
  const CPM = 1;

  function getBid(isValid) {
    return {
      bidder: BIDDER_CODE,
      params: (function () {
        return {
          [SECURITY]: isValid === true ? 'sec1' : null,
          [DATA_PARTNER_ID]: 'dpid1',
          [DATA_PARTNER_PIXEL_ID]: 'pid1',
          [ALG]: 'ihr',
          [NQ]: SEARCH_QUERY,
          [NQ_NAME]: null,
          [CATEGORY]: null,
        }
      })(),
      placementCode: 'div-gpt-ad-1460505748561-0',
      transactionId: 'ee335735-ddd3-41f2-b6c6-e8aa99f81c0f',
      sizes: SIZES,
      bidId: '24a1c9ec270973',
      bidderRequestId: '189135372acd55',
      auctionId: 'ac15bb68-4ef0-477f-93f4-de91c47f00a9'
    }
  }

  const SINGlE_BID_REQUEST = {
    [SECURITY]: 'sec1',
    [DATA_PARTNER_ID]: 'dpid1',
    [DATA_PARTNER_PIXEL_ID]: 'pid1',
    [ALG]: 'ihr',
    [NQ]: [SEARCH_QUERY, null],
    sizes: [WIDTH + 'x' + HEIGHT],
    bidId: '24a1c9ec270973',
    cors: 'http://localhost:9876'
  };

  function getSingleBidResponse(isValid) {
    return {
      id: '24a1c9ec270973',
      cpm: isValid === true ? CPM : null,
      width: WIDTH,
      height: HEIGHT,
      ad: AD,
      ttl: 360,
      creativeId: 'TEST_ID',
      netRevenue: false,
      currency: 'EUR',
    }
  }

  const VALID_BID = {
    requestId: '24a1c9ec270973',
    cpm: CPM,
    width: WIDTH,
    height: HEIGHT,
    ad: AD,
    ttl: 360,
    creativeId: 'TEST_ID',
    netRevenue: false,
    currency: 'EUR',
  };

  describe('NanoAdapter', () => {
    let nanoBidAdapter = spec;

    describe('Methods', () => {
      it('Test isBidRequestValid() with valid param', function () {
        expect(nanoBidAdapter.isBidRequestValid(getBid(true))).to.equal(true);
      });
      it('Test isBidRequestValid() with invalid param', function () {
        expect(nanoBidAdapter.isBidRequestValid(getBid(false))).to.equal(false);
      });
      it('Test buildRequests()', function () {
        let request = nanoBidAdapter.buildRequests([getBid(true)]);
        expect(request.method).to.equal('POST');
        expect(request.url).to.equal(ENGINE_BASE_URL);
        expect(request.data).to.equal(JSON.stringify([SINGlE_BID_REQUEST]));
      });
      it('Test interpretResponse() length', function () {
        let bids = nanoBidAdapter.interpretResponse([getSingleBidResponse(true), getSingleBidResponse(false)]);
        expect(bids.length).to.equal(1);
      });
      it('Test interpretResponse() bids', function () {
        let bid = nanoBidAdapter.interpretResponse([getSingleBidResponse(true), getSingleBidResponse(false)])[0];
        expect(bid.requestId).to.equal(VALID_BID.requestId);
        expect(bid.cpm).to.equal(VALID_BID.cpm);
        expect(bid.width).to.equal(VALID_BID.width);
        expect(bid.height).to.equal(VALID_BID.height);
        expect(bid.ad).to.equal(VALID_BID.ad);
        expect(bid.ttl).to.equal(VALID_BID.ttl);
        expect(bid.creativeId).to.equal(VALID_BID.creativeId);
        expect(bid.currency).to.equal(VALID_BID.currency);
      });
    });
  });
});
