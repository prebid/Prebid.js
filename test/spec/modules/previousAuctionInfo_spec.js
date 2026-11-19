import * as previousAuctionInfo from '../../../modules/previousAuctionInfo/index.js';
import sinon from 'sinon';
import { expect } from 'chai';
import { config } from 'src/config.js';
import * as events from 'src/events.js';
import { CONFIG_NS, resetPreviousAuctionInfo, startAuctionHook } from '../../../modules/previousAuctionInfo/index.js';
import { EVENTS, REJECTION_REASON } from '../../../src/constants.js';

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
  });

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

  describe('Prebid Server relay instruction', () => {
    // testBidder2 and testBidder3 are Prebid Server bidders, testBidder1 is client-side
    function s2sAuction(...flaggedRequestIds) {
      const details = JSON.parse(JSON.stringify(auctionDetails));
      details.bidderRequests.forEach(bidderRequest => {
        bidderRequest.src = bidderRequest.bidderCode === 'testBidder1' ? 'client' : 's2s';
      });
      details.bidsReceived.forEach(bid => {
        if (flaggedRequestIds.includes(bid.requestId)) {
          bid.relayPreviousAuctionInfo = true;
        }
      });
      return details;
    }

    function injectedInfo() {
      const bidder = {};
      startAuctionHook(sinon.spy(), { ortb2Fragments: { global: {}, bidder } });
      return Object.fromEntries(
        Object.entries(bidder).map(([bidderCode, ortb2]) => [bidderCode, ortb2.ext.prebid.previousauctioninfo])
      );
    }

    describe('with an explicit bidders list', () => {
      it('does not record or inject a flagged bidder that is not listed', () => {
        config.setConfig({ [CONFIG_NS]: { enabled: true, bidders: ['testBidder1'] } });
        previousAuctionInfo.onAuctionEndHandler(s2sAuction('bidabc'));
        expect(Object.keys(previousAuctionInfo.auctionState)).to.eql(['testBidder1']);
        expect(Object.keys(injectedInfo())).to.eql(['testBidder1']);
      });

      it('records and injects listed Prebid Server bidders, flagged or not', () => {
        config.setConfig({ [CONFIG_NS]: { enabled: true, bidders: ['testBidder2', 'testBidder3'] } });
        previousAuctionInfo.onAuctionEndHandler(s2sAuction('bidabc'));
        const injected = injectedInfo();
        expect(Object.keys(injected)).to.have.members(['testBidder2', 'testBidder3']);
        expect(injected.testBidder2[0]).to.include({ bidId: 'bidabc', bidderCpm: 2 });
        expect(injected.testBidder3[0]).to.include({ bidId: 'bidxyz', bidderCpm: 3 });
      });
    });

    describe('without a bidders list', () => {
      beforeEach(() => {
        config.setConfig({ [CONFIG_NS]: { enabled: true } });
      });

      it('records client-side bidders and flagged Prebid Server bidders, but not unflagged ones', () => {
        previousAuctionInfo.onAuctionEndHandler(s2sAuction('bidabc'));
        expect(Object.keys(previousAuctionInfo.auctionState)).to.have.members(['testBidder1', 'testBidder2']);
        const injected = injectedInfo();
        expect(Object.keys(injected)).to.have.members(['testBidder1', 'testBidder2']);
        expect(injected.testBidder2[0]).to.include({ bidId: 'bidabc', bidderCpm: 2 });
        expect(injected.testBidder2[0]).to.not.have.property('transactionId');
      });

      it('keeps recording a flagged Prebid Server bidder in later auctions', () => {
        previousAuctionInfo.onAuctionEndHandler(s2sAuction('bidabc'));
        injectedInfo();
        previousAuctionInfo.onAuctionEndHandler(s2sAuction());
        expect(Object.keys(injectedInfo())).to.have.members(['testBidder1', 'testBidder2']);
      });

      it('treats a flag on a rejected bid as a relay instruction', () => {
        previousAuctionInfo.onAuctionEndHandler({
          ...s2sAuction(),
          bidsReceived: [],
          bidsRejected: [{ requestId: 'bidabc', bidderCode: 'testBidder2', rejectionReason: REJECTION_REASON.FLOOR_NOT_MET, relayPreviousAuctionInfo: true }]
        });
        expect(previousAuctionInfo.auctionState.testBidder2[0]).to.include({
          bidId: 'bidabc',
          rejectionReason: REJECTION_REASON.FLOOR_NOT_MET
        });
        expect(previousAuctionInfo.auctionState).to.not.have.property('testBidder3');
      });

      it('forgets flagged bidders when the module is disabled', () => {
        previousAuctionInfo.onAuctionEndHandler(s2sAuction('bidabc'));
        config.setConfig({ [CONFIG_NS]: { enabled: false } });
        config.setConfig({ [CONFIG_NS]: { enabled: true } });
        previousAuctionInfo.onAuctionEndHandler(s2sAuction());
        expect(Object.keys(injectedInfo())).to.eql(['testBidder1']);
      });

      describe('stored impressions', () => {
        // stored impressions are requested with a null bidder; the seats that answered are named in the response
        function storedImpAuction(flagged) {
          return {
            auctionId: 'auction123',
            bidsReceived: [
              { requestId: 'stored1', bidderCode: 'seatA', cpm: 1, adUnitCode: 'adUnit1', currency: 'USD', relayPreviousAuctionInfo: flagged.includes('seatA') },
              { requestId: 'stored1', bidderCode: 'seatB', cpm: 2, adUnitCode: 'adUnit1', currency: 'USD', relayPreviousAuctionInfo: flagged.includes('seatB') }
            ],
            bidsRejected: [],
            bidderRequests: [{
              bidderCode: null,
              src: 's2s',
              bidderRequestId: 'reqStored',
              bids: [{ bidId: 'stored1', bidder: null, adUnitCode: 'adUnit1' }]
            }],
            timestamp: 1
          };
        }

        it('attributes the relay flag to the seat that responded', () => {
          previousAuctionInfo.onAuctionEndHandler(storedImpAuction(['seatB']));
          expect(Object.keys(previousAuctionInfo.auctionState)).to.eql(['seatB']);
          expect(previousAuctionInfo.auctionState.seatB[0]).to.include({
            bidId: 'stored1',
            bidderCpm: 2,
            highestBidCpm: 2
          });
          expect(Object.keys(injectedInfo())).to.eql(['seatB']);
        });

        it('records nothing when no seat is flagged', () => {
          previousAuctionInfo.onAuctionEndHandler(storedImpAuction([]));
          expect(previousAuctionInfo.auctionState).to.eql({});
        });

        it('applies an explicit list to the responding seats', () => {
          config.setConfig({ [CONFIG_NS]: { enabled: true, bidders: ['seatA'] } });
          previousAuctionInfo.onAuctionEndHandler(storedImpAuction(['seatB']));
          expect(Object.keys(previousAuctionInfo.auctionState)).to.eql(['seatA']);
          expect(previousAuctionInfo.auctionState.seatA[0]).to.include({ bidderCpm: 1 });
        });
      });
    });

    describe('when the module is not enabled', () => {
      it('records nothing, even for flagged bids', () => {
        config.setConfig({ [CONFIG_NS]: { enabled: false } });
        events.emit(EVENTS.AUCTION_END, s2sAuction('bid123', 'bidabc', 'bidxyz'));
        expect(previousAuctionInfo.previousAuctionInfoEnabled).to.be.false;
        expect(previousAuctionInfo.auctionState).to.eql({});
      });

      it('records from AUCTION_END once enabled', () => {
        config.setConfig({ [CONFIG_NS]: { enabled: true } });
        events.emit(EVENTS.AUCTION_END, s2sAuction('bidabc'));
        expect(Object.keys(previousAuctionInfo.auctionState)).to.have.members(['testBidder1', 'testBidder2']);
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
      startAuctionHook(next, { ortb2Fragments: { global, bidder } });
    }
    it('should not add info when none is available', () => {
      runHook();
      expect(global).to.eql({});
      expect(bidder).to.eql({});
    });
    it('should call next', () => {
      runHook();
      sinon.assert.called(next);
    });
    describe('when info is available', () => {
      beforeEach(() => {
        Object.assign(previousAuctionInfo.auctionState, {
          bidder1: [{ transactionId: 'tid1', auction: '1' }],
          bidder2: [{ transactionId: 'tid2', auction: '2' }]
        });
      });

      function extractInfo() {
        return Object.fromEntries(
          Object.entries(bidder)
            .map(([bidder, ortb2]) => [bidder, ortb2.ext?.prebid?.previousauctioninfo])
        );
      }

      it('should set info for enabled bidders, when only some are enabled', () => {
        config.setConfig({ [CONFIG_NS]: { enabled: true, bidders: ['bidder1'] } });
        runHook();
        expect(extractInfo()).to.eql({
          bidder1: [{ auction: '1' }]
        });
      });

      it('should set info for all bidders, when none is specified', () => {
        config.setConfig({ [CONFIG_NS]: { enabled: true } });
        runHook();
        expect(extractInfo()).to.eql({
          bidder1: [{ auction: '1' }],
          bidder2: [{ auction: '2' }]
        });
      });
    });
  });

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
