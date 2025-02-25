import * as previousAuctionInfo from 'libraries/previousAuctionInfo/previousAuctionInfo.js';
import sinon from 'sinon';
import { expect } from 'chai';
import { config } from 'src/config.js';

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
    sandbox = sinon.createSandbox();
    previousAuctionInfo.resetPreviousAuctionInfo();
    initHandlersStub = sandbox.stub();
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('config', () => {
    it('should initialize the module if publisher enabled', () => {
      previousAuctionInfo.initPreviousAuctionInfo(initHandlersStub);
      config.setConfig({ previousAuctionInfo: true });
      sandbox.assert.calledOnce(initHandlersStub);
    });

    it('should not enable previous auction info if config.previousAuctionInfo is not set', () => {
      sandbox.restore();
      previousAuctionInfo.initPreviousAuctionInfo(initHandlersStub);
      config.setConfig({ previousAuctionInfo: false });
      expect(previousAuctionInfo.previousAuctionInfoEnabled).to.be.false;
    });
  });

  describe('onAuctionEndHandler', () => {
    it('should store auction data for enabled bidders in auctionState', () => {
      const config = { bidderCode: 'testBidder2' };
      previousAuctionInfo.enablePreviousAuctionInfo(config);
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
      previousAuctionInfo.enablePreviousAuctionInfo(config1);
      previousAuctionInfo.enablePreviousAuctionInfo(config2);
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

  describe('onBidWonHandler', () => {
    it('should update the rendered field in auctionState when a pbjs bid wins', () => {
      const config = { bidderCode: 'testBidder3' };
      previousAuctionInfo.enablePreviousAuctionInfo(config);

      previousAuctionInfo.auctionState['testBidder3'] = [
        { transactionId: 'trans789', rendered: 0 }
      ];

      const winningBid = {
        transactionId: 'trans789'
      };

      previousAuctionInfo.onBidWonHandler(winningBid);

      expect(previousAuctionInfo.auctionState['testBidder3'][0]).to.include({ rendered: 1 });
    });

    it('should not update the rendered field if no matching transactionId is found', () => {
      const config = { bidderCode: 'testBidder3' };
      previousAuctionInfo.enablePreviousAuctionInfo(config);

      previousAuctionInfo.auctionState['testBidder3'] = [
        { transactionId: 'someOtherTid', rendered: 0 }
      ];

      const winningBid = {
        transactionId: 'trans789'
      };

      previousAuctionInfo.onBidWonHandler(winningBid);

      expect(previousAuctionInfo.auctionState['testBidder3'][0]).to.include({ rendered: 0 });
    });
  });
});
