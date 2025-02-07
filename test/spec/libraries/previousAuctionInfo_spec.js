import * as previousAuctionInfo from 'libraries/previousAuctionInfo/previousAuctionInfo.js';
import sinon from 'sinon';
import { expect } from 'chai';

describe('previous auction info', () => {
  let sandbox;
  let initHandlersStub;

  const auctionDetails = {
    auctionId: 'auction123',
    bidsReceived: [
      { requestId: 'bid123', bidderCode: 'testBidder1', cpm: 1, adUnitCode: 'adUnit1', currency: 'USD', originalCpm: 1.1, originalCurrency: 'USD' },
      { requestId: 'bidabc', bidderCode: 'testBidder2', cpm: 2, adUnitCode: 'adUnit1', currency: 'EUR', originalCpm: 2.1, originalCurrency: 'EUR' },
      { requestId: 'bidxyz', bidderCode: 'testBidder3', cpm: 3, adUnitCode: 'adUnit2', currency: 'USD', originalCpm: 3.2, originalCurrency: 'USD' }
    ],
    bidsRejected: [
      { requestId: 'bid456', rejectionReason: 1 },
      { requestId: 'bid789', rejectionReason: 2 }
    ],
    bidderRequests: [
      {
        bidderCode: 'testBidder1',
        bidderRequestId: 'req1',
        bids: [
          { bidId: 'bid123', ortb2: { cur: ['USD'] }, ortb2Imp: { ext: { tid: 'trans123' } }, adUnitCode: 'adUnit1' }
        ]
      },
      {
        bidderCode: 'testBidder2',
        bidderRequestId: 'req2',
        bids: [
          { bidId: 'bidabc', ortb2: { cur: ['EUR'] }, ortb2Imp: { ext: { tid: 'trans456' } }, adUnitCode: 'adUnit1' }
        ]
      },
      {
        bidderCode: 'testBidder3',
        bidderRequestId: 'req3',
        bids: [
          { bidId: 'bidxyz', ortb2: { cur: ['USD'] }, ortb2Imp: { ext: { tid: 'trans789' } }, adUnitCode: 'adUnit2' }
        ]
      }
    ],
    timestamp: Date.now(),
  };

  beforeEach(() => {
    previousAuctionInfo.resetPreviousAuctionInfo();
    sandbox = sinon.createSandbox();
    initHandlersStub = sandbox.stub();
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('config', () => {
    it('should only be initialized once', () => {
      const config = { bidderCode: 'testBidder' };
      previousAuctionInfo.enablePreviousAuctionInfo(config, initHandlersStub);
      sandbox.assert.calledOnce(initHandlersStub);
      previousAuctionInfo.enablePreviousAuctionInfo(config, initHandlersStub);
      sandbox.assert.calledOnce(initHandlersStub);
    });
  });

  describe('onAuctionEndHandler', () => {
    it('should store auction data for enabled bidders in auctionState', () => {
      const config = { bidderCode: 'testBidder2' };
      previousAuctionInfo.enablePreviousAuctionInfo(config, initHandlersStub);
      previousAuctionInfo.onAuctionEndHandler(auctionDetails);

      expect(previousAuctionInfo.auctionState).to.have.property('testBidder2');
      expect(previousAuctionInfo.auctionState['testBidder2']).to.be.an('array').with.lengthOf(1);

      const storedData = previousAuctionInfo.auctionState['testBidder2'][0];

      expect(storedData).to.include({
        bidderRequestId: 'req2',
        bidId: 'bidabc',
        rendered: 0,
        source: 'pbjs',
        adUnitCode: 'adUnit1',
        highestBidCpm: 2,
        bidderCpm: 2,
        bidderOriginalCpm: 2.1,
        bidderCurrency: 'EUR',
        bidderOriginalCurrency: 'EUR',
        bidderErrorCode: -1,
        timestamp: auctionDetails.timestamp
      });
    });

    it('should store auction data for multiple bidders correctly', () => {
      const config1 = { bidderCode: 'testBidder1' };
      const config2 = { bidderCode: 'testBidder3' };
      previousAuctionInfo.enablePreviousAuctionInfo(config1, initHandlersStub);
      previousAuctionInfo.enablePreviousAuctionInfo(config2, initHandlersStub);
      previousAuctionInfo.onAuctionEndHandler(auctionDetails);

      expect(previousAuctionInfo.auctionState).to.have.property('testBidder1');
      expect(previousAuctionInfo.auctionState).to.have.property('testBidder3');

      expect(previousAuctionInfo.auctionState['testBidder1'][0]).to.include({
        bidId: 'bid123',
        highestBidCpm: 2,
        adUnitCode: 'adUnit1',
        bidderCpm: 1,
        bidderCurrency: 'USD'
      });

      expect(previousAuctionInfo.auctionState['testBidder3'][0]).to.include({
        bidId: 'bidxyz',
        highestBidCpm: 3,
        adUnitCode: 'adUnit2',
        bidderCpm: 3,
        bidderCurrency: 'USD'
      });
    });

    it('should not store auction data for disabled bidders', () => {
      previousAuctionInfo.onAuctionEndHandler(auctionDetails);
      expect(previousAuctionInfo.auctionState).to.not.have.property('testBidder2');
    });
  });

  describe('onBidRequestedHandler', () => {
    it('should update highestBidCpm and rendered fields if a pbjs bid wins', () => {
      const config = { bidderCode: 'testBidder3' };
      previousAuctionInfo.enablePreviousAuctionInfo(config, initHandlersStub);

      const bidRequest = {
        bidderCode: 'testBidder3',
        ortb2: { ext: { prebid: {} } },
      };

      previousAuctionInfo.winningBidsMap['trans789'] = {
        cpm: 5.6,
        transactionId: 'trans789',
        adserverTargeting: { hb_pb: 5 }
      };

      previousAuctionInfo.auctionState['testBidder3'] = [
        { transactionId: 'trans789', highestBidCpm: 0, rendered: 0 }
      ];

      previousAuctionInfo.onBidRequestedHandler(bidRequest);
      const updatedInfo = bidRequest.ortb2.ext.prebid.previousauctioninfo;

      expect(updatedInfo).to.be.an('array').with.lengthOf(1);
      expect(updatedInfo[0]).to.include({ highestBidCpm: 5.6, targetedBidCpm: 5, rendered: 1 });
    });

    it('should remove winning bid entry from winningBidsMap after updating auctionState', () => {
      const config = { bidderCode: 'testBidder3' };
      previousAuctionInfo.enablePreviousAuctionInfo(config, initHandlersStub);

      previousAuctionInfo.winningBidsMap['trans789'] = {
        cpm: 3.5,
        transactionId: 'trans789',
        adserverTargeting: { hb_pb: '3.50' }
      };

      previousAuctionInfo.auctionState['testBidder3'] = [
        { transactionId: 'trans789', highestBidCpm: 0, rendered: 0 }
      ];

      const bidRequest = { bidderCode: 'testBidder3', ortb2: { ext: { prebid: {} } } };
      previousAuctionInfo.onBidRequestedHandler(bidRequest);

      expect(previousAuctionInfo.winningBidsMap).to.not.have.property('trans789');
    });
  });
});
