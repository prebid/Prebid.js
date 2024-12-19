import * as previousAuctionInfo from 'libraries/previousAuctionInfo/previousAuctionInfo.js';
import sinon from 'sinon';

describe('previous auction info', () => {
  let sandbox;
  let initHandlersStub;

  const auctionDetails = {
    auctionId: 'auction123',
    bidsReceived: [{ requestId: 'bid1', bidderCode: 'testBidder2', cpm: 2 }],
    bidsRejected: [{ requestId: 'bid2', rejectionReason: 1 }],
    bidderRequests: [
      {
        bidderCode: 'testBidder2',
        bidderRequestId: 'req1',
        bids: [{ bidId: 'bid1', ortb2: { cur: ['US'] }, ortb2Imp: { ext: { tid: 'trans123' } }, adUnitCode: 'adUnit1' }],
      },
    ],
    timestamp: Date.now(),
  };

  beforeEach(() => {
    previousAuctionInfo.resetPreviousAuctionInfo();
    if (window.pbpai) delete window.pbpai;
    sandbox = sinon.createSandbox();
    initHandlersStub = sandbox.stub();
  });

  afterEach(() => {
    sandbox.restore();
    if (window.pbpai) delete window.pbpai;
  });

  describe('config', () => {
    it('should only be initialized once', () => {
      const config = { bidderCode: 'testBidder', isBidRequestValid: () => true };
      previousAuctionInfo.enablePreviousAuctionInfo(config, initHandlersStub);
      sandbox.assert.calledOnce(initHandlersStub);
      previousAuctionInfo.enablePreviousAuctionInfo(config, initHandlersStub);
      sandbox.assert.calledOnce(initHandlersStub);
    });
  });

  describe('on auction end', () => {
    it('should only capture data for enabled bids who submitted a valid bid', () => {
      const config = { bidderCode: 'testBidder2', isBidRequestValid: (bid) => bid.bidId === 'bid1' };
      previousAuctionInfo.enablePreviousAuctionInfo(config, initHandlersStub);
      previousAuctionInfo.onAuctionEndHandler(auctionDetails);

      expect(window.pbpai.testBidder2).to.be.an('array').with.lengthOf(1);
      expect(window.pbpai.testBidder2[0]).to.include({
        auctionId: 'auction123',
        minBidToWin: 2,
        transactionId: 'trans123',
        rendered: 0,
      });
    });
  });

  describe('on bid requested', () => {
    it('should update the minBidToWin and rendered fields if a pbjs bid wins', () => {
      const config = { bidderCode: 'testBidder3', isBidRequestValid: () => true };
      previousAuctionInfo.enablePreviousAuctionInfo(config, initHandlersStub);
      const bidRequest = {
        bidderCode: 'testBidder3',
        ortb2: { ext: { prebid: {} } },
      };

      previousAuctionInfo.winningBidsMap['trans123'] = { cpm: 5, transactionId: 'trans123' };

      window.pbpai = {
        testBidder3: [{ transactionId: 'trans123', minBidToWin: 0, rendered: 0 }],
      };

      previousAuctionInfo.onBidRequestedHandler(bidRequest);
      const updatedInfo = bidRequest.ortb2.ext.prebid.previousauctioninfo;
      expect(updatedInfo).to.be.an('array').with.lengthOf(1);
      expect(updatedInfo[0]).to.include({ minBidToWin: 5, rendered: 1 });
    });
  });
});
