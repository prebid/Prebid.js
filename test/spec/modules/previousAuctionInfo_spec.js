import * as previousAuctionInfo from '../../../modules/previousAuctionInfo';
import sinon from 'sinon';
import { expect } from 'chai';
import { config } from 'src/config.js';
import * as events from 'src/events.js';
import {CONFIG_NS, resetPreviousAuctionInfo, startAuctionHook} from '../../../modules/previousAuctionInfo';
import { REJECTION_REASON } from '../../../src/constants.js';

describe('previous auction info', () => {
  let sandbox;

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

  before(() => {
    config.resetConfig();
  })

  beforeEach(() => {
    sandbox = sinon.createSandbox();
  });

  afterEach(() => {
    config.resetConfig();
    resetPreviousAuctionInfo();
    sandbox.restore();
  });

  describe('config', () => {
    it('should initialize the module if publisher enabled', () => {
      sandbox.spy(events, 'on');
      config.setConfig({ [CONFIG_NS]: { enabled: true, bidders: ['testBidder1', 'testBidder2'] } });
      expect(previousAuctionInfo.previousAuctionInfoEnabled).to.be.true;
      sinon.assert.called(events.on);
    });

    it('should not enable previous auction info if config.previousAuctionInfo is not set', () => {
      config.setConfig({});
      expect(previousAuctionInfo.previousAuctionInfoEnabled).to.be.false;
    });
  });

  describe('onAuctionEndHandler', () => {
    it('should store auction data for enabled bidders in auctionState', () => {
      config.setConfig({ [CONFIG_NS]: { enabled: true, bidders: ['testBidder2'] } });
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
        highestBidCurrency: 'EUR',
        bidderCpm: 2,
        bidderOriginalCpm: 2.1,
        bidderCurrency: 'EUR',
        bidderOriginalCurrency: 'EUR',
        rejectionReason: null,
        timestamp: auctionDetails.timestamp
      });
    });

    it('should store auction data for multiple bidders correctly', () => {
      config.setConfig({ [CONFIG_NS]: { enabled: true, bidders: ['testBidder1', 'testBidder3'] } });
      previousAuctionInfo.onAuctionEndHandler(auctionDetails);

      expect(previousAuctionInfo.auctionState).to.have.property('testBidder1');
      expect(previousAuctionInfo.auctionState).to.have.property('testBidder3');

      expect(previousAuctionInfo.auctionState['testBidder1'][0]).to.include({
        bidId: 'bid123',
        highestBidCpm: 2,
        highestBidCurrency: 'EUR',
        adUnitCode: 'adUnit1',
        bidderCpm: 1,
        bidderCurrency: 'USD',
        rejectionReason: null,
      });

      expect(previousAuctionInfo.auctionState['testBidder3'][0]).to.include({
        bidId: 'bidxyz',
        highestBidCpm: 3,
        highestBidCurrency: 'USD',
        adUnitCode: 'adUnit2',
        bidderCpm: 3,
        bidderCurrency: 'USD',
        rejectionReason: null,
      });
    });

    it('should not store auction data for disabled bidders', () => {
      config.setConfig({ [CONFIG_NS]: { enabled: true, bidders: ['testBidder1'] } });
      previousAuctionInfo.onAuctionEndHandler(auctionDetails);

      expect(previousAuctionInfo.auctionState).to.have.property('testBidder1');
      expect(previousAuctionInfo.auctionState).to.not.have.property('testBidder2');
    });

    it('should include rejectionReason string if the bid was rejected', () => {
      const auctionDetailsWithRejectedBid = {
        auctionId: 'auctionXYZ',
        bidsReceived: [],
        bidsRejected: [
          { requestId: 'bid456', rejectionReason: REJECTION_REASON.FLOOR_NOT_MET } // string from REJECTION_REASON
        ],
        bidderRequests: [
          {
            bidderCode: 'testBidder1',
            bidderRequestId: 'req1',
            bids: [
              { bidId: 'bid456', adUnitCode: 'adUnit1' }
            ]
          }
        ],
        timestamp: Date.now(),
      };

      config.setConfig({ [CONFIG_NS]: { enabled: true, bidders: ['testBidder1'] } });
      previousAuctionInfo.onAuctionEndHandler(auctionDetailsWithRejectedBid);

      const stored = previousAuctionInfo.auctionState['testBidder1'][0];
      expect(stored).to.include({
        bidId: 'bid456',
        rejectionReason: REJECTION_REASON.FLOOR_NOT_MET,
        bidderCpm: null,
        highestBidCpm: null
      });
    });
  });

  describe('startAuctionHook', () => {
    let global, bidder, next;
    beforeEach(() => {
      global = {};
      bidder = {};
      next = sinon.spy();
    });
    function runHook() {
      startAuctionHook(next, {ortb2Fragments: {global, bidder}});
    }
    it('should not add info when none is available', () => {
      runHook();
      expect(global).to.eql({});
      expect(bidder).to.eql({});
    })
    it('should call next', () => {
      runHook();
      sinon.assert.called(next);
    })
    describe('when info is available', () => {
      beforeEach(() => {
        Object.assign(previousAuctionInfo.auctionState, {
          bidder1: [{transactionId: 'tid1', auction: '1'}],
          bidder2: [{transactionId: 'tid2', auction: '2'}]
        })
      })

      function extractInfo() {
        return Object.fromEntries(
          Object.entries(bidder)
            .map(([bidder, ortb2]) => [bidder, ortb2.ext?.prebid?.previousauctioninfo])
        )
      }

      it('should set info for enabled bidders, when only some are enabled', () => {
        config.setConfig({[CONFIG_NS]: {enabled: true, bidders: ['bidder1']}});
        runHook();
        expect(extractInfo()).to.eql({
          bidder1: [{auction: '1'}]
        })
      });

      it('should set info for all bidders, when none is specified', () => {
        config.setConfig({[CONFIG_NS]: {enabled: true}});
        runHook();
        expect(extractInfo()).to.eql({
          bidder1: [{auction: '1'}],
          bidder2: [{auction: '2'}]
        })
      })
    })
  })

  describe('onBidWonHandler', () => {
    it('should update the rendered field in auctionState when a pbjs bid wins', () => {
      config.setConfig({ previousAuctionInfo: { enabled: true, bidders: ['testBidder3'] } });

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
      config.setConfig({ previousAuctionInfo: { enabled: true, bidders: ['testBidder3'] } });

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
