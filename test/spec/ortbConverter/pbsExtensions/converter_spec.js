import { expect } from 'chai';
import { buildPBSRequest, interpretPBSResponse } from '../../../../modules/prebidServerBidAdapter/ortbConverter.js';
import { config } from 'src/config.js';
import * as redactor from 'src/activities/redactor.js';
import { deepClone } from 'src/utils.js';
import adapterManager from 'src/adapterManager.js';
import { registerBidder } from 'src/adapters/bidderFactory.js';
import {
  EVENT_TYPE_IMPRESSION,
  EVENT_TYPE_WIN,
  TRACKER_METHOD_IMG,
} from '../../../../src/eventTrackers.js';

describe('PBS ortbConverter', () => {
  const IMP_ID = 'ad-slot-1';
  const BID_ID = 'bid-123';

  let sandbox;

  function buildFixtures(bidderCode = 'msft') {
    const adUnit = {
      code: IMP_ID,
      transactionId: 'txn-1',
      adUnitId: 'au-1',
      mediaTypes: { banner: { sizes: [[300, 250]] } },
      bids: [{
        bid_id: BID_ID,
        bidder: bidderCode,
        params: { placementId: '12345' },
      }],
    };
    const bidderRequest = {
      bidderCode,
      auctionId: 'auction-1',
      bidderRequestId: 'br-1',
      timeout: 5000,
      ortb2: { site: { page: 'http://test.com' } },
      bids: [{
        bidId: BID_ID,
        bid_id: BID_ID,
        bidder: bidderCode,
        adUnitCode: IMP_ID,
        params: { placementId: '12345' },
        mediaTypes: { banner: { sizes: [[300, 250]] } },
        transactionId: 'txn-1',
      }],
    };
    const s2sBidRequest = {
      s2sConfig: {
        accountId: 'acct-1',
        enabled: true,
        bidders: [bidderCode],
        timeout: 1000,
      },
      requestBidsTimeout: 3000,
      ortb2Fragments: { global: {}, bidder: {} },
    };
    return { adUnit, bidderRequest, s2sBidRequest };
  }

  function buildRequest(bidderCode = 'msft') {
    const { adUnit, bidderRequest, s2sBidRequest } = buildFixtures(bidderCode);
    return buildPBSRequest(
      s2sBidRequest,
      [deepClone(bidderRequest)],
      [deepClone(adUnit)],
      [bidderCode],
    );
  }

  function interpretSeatBid(request, seatBid) {
    return interpretPBSResponse({
      id: 'resp-1',
      cur: 'USD',
      seatbid: [seatBid],
    }, request);
  }

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    config.resetConfig();
    config.setConfig({ floors: { enabled: false } });
    sandbox.stub(redactor, 'redactor').callsFake(() => ({
      ortb2: sinon.stub().callsFake((o) => o),
      bidRequest: sinon.stub().callsFake((o) => o),
    }));
  });

  afterEach(() => {
    sandbox.restore();
    config.resetConfig();
  });

  describe('fromORTB', () => {
    it('maps seatbid bid ext.prebid.meta.rendererUrl to bidResponse.safeRenderer', () => {
      const rendererUrl = 'https://cdn.example/safe-renderer.js';
      const request = buildRequest();
      const { bids } = interpretSeatBid(request, {
        seat: 'msft',
        bid: [{
          id: 'seatbid-1',
          impid: IMP_ID,
          price: 1.5,
          ext: {
            prebid: {
              meta: { rendererUrl },
            },
          },
        }],
      });

      expect(bids).to.have.length(1);
      expect(bids[0].bid.safeRenderer).to.eql({ url: rendererUrl });
    });

    it('maps seatbid bid burl to impression eventtrackers via pbsWinTrackers processor', () => {
      const request = buildRequest();
      const burl = 'https://pbs.example/impression';
      const { bids } = interpretSeatBid(request, {
        seat: 'msft',
        bid: [{
          id: 'seatbid-1',
          impid: IMP_ID,
          price: 1.5,
          burl,
        }],
      });

      expect(bids[0].bid.eventtrackers).to.deep.include({
        method: TRACKER_METHOD_IMG,
        event: EVENT_TYPE_IMPRESSION,
        url: burl,
      });
    });

    it('maps seatbid bid ext.prebid.events.win to win eventtrackers via pbsWinTrackers processor', () => {
      const request = buildRequest();
      const winUrl = 'https://pbs.example/win';
      const { bids } = interpretSeatBid(request, {
        seat: 'msft',
        bid: [{
          id: 'seatbid-1',
          impid: IMP_ID,
          price: 1.5,
          ext: {
            prebid: {
              events: { win: winUrl },
            },
          },
        }],
      });

      expect(bids[0].bid.eventtrackers).to.deep.include({
        method: TRACKER_METHOD_IMG,
        event: EVENT_TYPE_WIN,
        url: winUrl,
      });
    });
  });

  describe('toORTB', () => {
    const STUB_BIDDER = 'pbsConverterStubBidder';
    const STUB_ALIAS = 'pbsConverterStubAlias';

    beforeEach(() => {
      registerBidder({
        code: STUB_BIDDER,
        aliases: [STUB_ALIAS],
        isBidRequestValid: () => true,
        buildRequests: () => [],
        interpretResponse: () => [],
      });
    });

    afterEach(() => {
      delete adapterManager.bidderRegistry[STUB_BIDDER];
      delete adapterManager.bidderRegistry[STUB_ALIAS];
      delete adapterManager.aliasRegistry[STUB_ALIAS];
    });

    it('maps alias bidder codes to ext.prebid.aliases via extPrebidAliases processor', () => {
      const request = buildRequest(STUB_ALIAS);
      expect(request.ext.prebid.aliases).to.deep.include({
        [STUB_ALIAS]: STUB_BIDDER,
      });
    });
  });
});
