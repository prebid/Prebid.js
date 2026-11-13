import sinon from 'sinon';
import { expect } from 'chai';

import * as unifiedPricingRule from '../../../../../libraries/pubmaticUtils/plugins/unifiedPricingRule.js';
import * as prebidGlobal from '../../../../../src/prebidGlobal.js';
import * as utils from '../../../../../src/utils.js';

// Helper profile configuration with multipliers defined at config.json level
const profileConfigs = {
  plugins: {
    dynamicFloors: {
      pmTargetingKeys: {
        enabled: true,
        multiplier: { win: 2, floored: 3, nobid: 4 }
      },
      data: {
        multiplier: { win: 1.5, floored: 0.8, nobid: 1.2 }
      }
    }
  }
};

describe('UnifiedPricingRule - getTargeting scenarios', () => {
  let sandbox;
  let pbjsStub;

  beforeEach(() => {
    sandbox = sinon.createSandbox();

    // Stub logger methods to keep test output clean
    sandbox.stub(utils, 'logInfo');
    sandbox.stub(utils, 'logError');

    // Stub getGlobal to return our fake pbjs object
    pbjsStub = {
      getHighestCpmBids: sandbox.stub()
    };
    sandbox.stub(prebidGlobal, 'getGlobal').returns(pbjsStub);

    // Initialise plugin with mock config manager
    unifiedPricingRule.init('dynamicFloors', {
      getYMConfig: () => profileConfigs
    });
  });

  afterEach(() => {
    sandbox.restore();
  });

  const AD_UNIT_CODE = 'div1';

  /**
   * Utility to build an auction object skeleton
   */
  function buildAuction({ adUnits = [], bidsReceived = [], bidsRejected, bidderRequests } = {}) {
    return {
      adUnits,
      bidsReceived,
      bidsRejected,
      bidderRequests
    };
  }

  it('Winning bid', () => {
    const winningBid = {
      adUnitCode: AD_UNIT_CODE,
      cpm: 2.5,
      floorData: { floorProvider: 'PM', skipped: false, floorValue: 1.0 }
    };

    // pbjs should return highest CPM bids
    pbjsStub.getHighestCpmBids.withArgs(AD_UNIT_CODE).returns([winningBid]);

    const auction = buildAuction({
      adUnits: [{ bids: [winningBid] }],
      bidsReceived: [winningBid]
    });

    const targeting = unifiedPricingRule.getTargeting([AD_UNIT_CODE], {}, {}, auction);
    expect(targeting[AD_UNIT_CODE].pm_ym_flrs).to.equal(1);
    expect(targeting[AD_UNIT_CODE].pm_ym_bid_s).to.equal(1);
    expect(targeting[AD_UNIT_CODE].pm_ym_flrv).to.equal('5.00'); // 2.5 * 2
  });

  it('No bid - uses findFloorValueFromBidderRequests to derive floor', () => {
    pbjsStub.getHighestCpmBids.withArgs(AD_UNIT_CODE).returns([]);

    const bidRequest = {
      adUnitCode: AD_UNIT_CODE,
      mediaTypes: { banner: { sizes: [[300, 250]] } },
      getFloor: () => ({ currency: 'USD', floor: 2.0 })
    };

    // Dummy RTD-floor-applied bid for a different ad-unit so that hasRtdFloorAppliedBid === true
    const dummyBid = {
      adUnitCode: 'dummy',
      floorData: { floorProvider: 'PM', skipped: false, floorValue: 1.0 }
    };

    const auction = buildAuction({
      adUnits: [{ bids: [] }, { code: 'dummy', bids: [dummyBid] }],
      bidsReceived: [dummyBid],
      bidderRequests: [{ bids: [bidRequest] }]
    });

    const targeting = unifiedPricingRule.getTargeting([AD_UNIT_CODE], {}, {}, auction);
    expect(targeting[AD_UNIT_CODE].pm_ym_flrs).to.equal(1);
    expect(targeting[AD_UNIT_CODE].pm_ym_bid_s).to.equal(0);
    // 2.0 (min floor) * 4 (nobid multiplier) => 8.00
    expect(targeting[AD_UNIT_CODE].pm_ym_flrv).to.equal('8.00');
  });

  it('No bid & bidderRequests missing for adUnit - floor value 0', () => {
    pbjsStub.getHighestCpmBids.withArgs(AD_UNIT_CODE).returns([]);

    // bidderRequests only for different adUnit code
    const otherBidRequest = {
      adUnitCode: 'other',
      mediaTypes: { banner: { sizes: [[300, 250]] } },
      getFloor: () => ({ currency: 'USD', floor: 5.0 })
    };

    // RTD floor applied bid to ensure pm_ym_flrs logic executes
    const dummyBid = {
      adUnitCode: 'dummy',
      floorData: { floorProvider: 'PM', skipped: false, floorValue: 1.0 }
    };

    const auction = buildAuction({
      adUnits: [{ bids: [] }, { code: 'dummy', bids: [dummyBid] }],
      bidsReceived: [dummyBid],
      bidderRequests: [{ bids: [otherBidRequest] }]
    });

    const targeting = unifiedPricingRule.getTargeting([AD_UNIT_CODE], {}, {}, auction);
    expect(targeting[AD_UNIT_CODE].pm_ym_flrs).to.equal(1);
    expect(targeting[AD_UNIT_CODE].pm_ym_bid_s).to.equal(0);
    expect(targeting[AD_UNIT_CODE].pm_ym_flrv).to.equal('0.00');
  });

  it('No bid - bidderRequests array missing', () => {
    pbjsStub.getHighestCpmBids.withArgs(AD_UNIT_CODE).returns([]);

    // Dummy bid to ensure RTD floor flag is true
    const dummyBid = {
      adUnitCode: 'dummy',
      floorData: { floorProvider: 'PM', skipped: false, floorValue: 1.0 }
    };

    const auction = buildAuction({
      adUnits: [{ bids: [] }, { code: 'dummy', bids: [dummyBid] }],
      bidsReceived: [dummyBid]
      // bidderRequests is undefined => triggers early return 0
    });

    const targeting = unifiedPricingRule.getTargeting([AD_UNIT_CODE], {}, {}, auction);
    expect(targeting[AD_UNIT_CODE].pm_ym_flrs).to.equal(1);
    expect(targeting[AD_UNIT_CODE].pm_ym_bid_s).to.equal(0);
    expect(targeting[AD_UNIT_CODE].pm_ym_flrv).to.equal('0.00');
  });

  it('No bid - bidderRequest has no getFloor method', () => {
    pbjsStub.getHighestCpmBids.withArgs(AD_UNIT_CODE).returns([]);

    const bidRequest = {
      adUnitCode: AD_UNIT_CODE,
      mediaTypes: { banner: { sizes: [[300, 250]] } }, // no getFloor defined
    };

    const dummyBid = {
      adUnitCode: 'dummy',
      floorData: { floorProvider: 'PM', skipped: false, floorValue: 1.0 }
    };

    const auction = buildAuction({
      adUnits: [{ bids: [] }, { code: 'dummy', bids: [dummyBid] }],
      bidsReceived: [dummyBid],
      bidderRequests: [{ bids: [bidRequest] }]
    });

    const targeting = unifiedPricingRule.getTargeting([AD_UNIT_CODE], {}, {}, auction);
    expect(targeting[AD_UNIT_CODE].pm_ym_flrs).to.equal(1);
    expect(targeting[AD_UNIT_CODE].pm_ym_bid_s).to.equal(0);
    expect(targeting[AD_UNIT_CODE].pm_ym_flrv).to.equal('0.00');
  });

  it('No bid - video playerSize processed', () => {
    pbjsStub.getHighestCpmBids.withArgs(AD_UNIT_CODE).returns([]);

    const videoFloorStub = sinon.stub().returns({ currency: 'USD', floor: 3.0 });

    const bidRequest = {
      adUnitCode: AD_UNIT_CODE,
      mediaTypes: { video: { playerSize: [[640, 480]] } },
      getFloor: videoFloorStub
    };

    const dummyBid = {
      adUnitCode: 'dummy',
      floorData: { floorProvider: 'PM', skipped: false, floorValue: 1.0 }
    };

    const auction = buildAuction({
      adUnits: [{ bids: [] }, { code: 'dummy', bids: [dummyBid] }],
      bidsReceived: [dummyBid],
      bidderRequests: [{ bids: [bidRequest] }]
    });

    const targeting = unifiedPricingRule.getTargeting([AD_UNIT_CODE], {}, {}, auction);
    expect(videoFloorStub.called).to.be.true;
    expect(videoFloorStub.firstCall.args[0].mediaType).to.equal('video');
    expect(targeting[AD_UNIT_CODE].pm_ym_flrs).to.equal(1);
    expect(targeting[AD_UNIT_CODE].pm_ym_bid_s).to.equal(0);
    expect(targeting[AD_UNIT_CODE].pm_ym_flrv).to.equal('12.00'); // 3 * 4
  });

  it('No bid - fallback sizes array used', () => {
    pbjsStub.getHighestCpmBids.withArgs(AD_UNIT_CODE).returns([]);

    const sizesFloorStub = sinon.stub().returns({ currency: 'USD', floor: 4.0 });

    const bidRequest = {
      adUnitCode: AD_UNIT_CODE,
      sizes: [[300, 600]], // general sizes (no mediaTypes)
      getFloor: sizesFloorStub
    };

    const dummyBid = {
      adUnitCode: 'dummy',
      floorData: { floorProvider: 'PM', skipped: false, floorValue: 1.0 }
    };

    const auction = buildAuction({
      adUnits: [{ bids: [] }, { code: 'dummy', bids: [dummyBid] }],
      bidsReceived: [dummyBid],
      bidderRequests: [{ bids: [bidRequest] }]
    });

    const targeting = unifiedPricingRule.getTargeting([AD_UNIT_CODE], {}, {}, auction);
    expect(sizesFloorStub.called).to.be.true;
    expect(sizesFloorStub.firstCall.args[0].mediaType).to.equal('banner');
    expect(targeting[AD_UNIT_CODE].pm_ym_flrs).to.equal(1);
    expect(targeting[AD_UNIT_CODE].pm_ym_bid_s).to.equal(0);
    expect(targeting[AD_UNIT_CODE].pm_ym_flrv).to.equal('16.00'); // 4 * 4
  });

  it('No bid - wildcard size used when no sizes found', () => {
    pbjsStub.getHighestCpmBids.withArgs(AD_UNIT_CODE).returns([]);

    const wildcardFloorStub = sinon.stub().returns({ currency: 'USD', floor: 5.0 });

    const bidRequest = {
      adUnitCode: AD_UNIT_CODE,
      getFloor: wildcardFloorStub
    };

    const dummyBid = {
      adUnitCode: 'dummy',
      floorData: { floorProvider: 'PM', skipped: false, floorValue: 1.0 }
    };

    const auction = buildAuction({
      adUnits: [{ code: AD_UNIT_CODE, bids: [] }, { code: 'dummy', bids: [dummyBid] }],
      bidsReceived: [dummyBid],
      bidderRequests: [{ bids: [bidRequest] }]
    });

    const targeting = unifiedPricingRule.getTargeting([AD_UNIT_CODE], {}, {}, auction);
    expect(wildcardFloorStub.called).to.be.true;
    const floorArgs = wildcardFloorStub.firstCall.args[0];
    expect(floorArgs.mediaType).to.equal('banner');
    expect(floorArgs.size).to.deep.equal(['*', '*']);
    expect(targeting[AD_UNIT_CODE].pm_ym_flrs).to.equal(1);
    expect(targeting[AD_UNIT_CODE].pm_ym_bid_s).to.equal(0);
    expect(targeting[AD_UNIT_CODE].pm_ym_flrv).to.equal('20.00'); // 5 * 4
  });

  it('Multiplier selection from floor.json when config multiplier missing', () => {
    // Re-init with profileConfigs having multiplier only in data.multiplier (floor.json)
    unifiedPricingRule.init('dynamicFloors', {
      getYMConfig: () => ({
        plugins: {
          dynamicFloors: {
            pmTargetingKeys: {
              enabled: true // no multiplier object here
            },
            data: {
              multiplier: { win: 1.7 }
            }
          }
        }
      })
    });

    const winningBid = { adUnitCode: AD_UNIT_CODE, cpm: 2.0, floorData: { floorProvider: 'PM', skipped: false, floorValue: 1 } };
    pbjsStub.getHighestCpmBids.withArgs(AD_UNIT_CODE).returns([winningBid]);

    const auction = buildAuction({ adUnits: [{ bids: [winningBid] }], bidsReceived: [winningBid] });

    const targeting = unifiedPricingRule.getTargeting([AD_UNIT_CODE], {}, {}, auction);
    expect(targeting[AD_UNIT_CODE].pm_ym_flrv).to.equal('3.40'); // 2 * 1.7
  });

  it('Multiplier default constant used when no multipliers in profileConfigs', () => {
    unifiedPricingRule.init('dynamicFloors', {
      getYMConfig: () => ({
        plugins: {
          dynamicFloors: {
            pmTargetingKeys: { enabled: true },
            data: {} // no multiplier in data
          }
        }
      })
    });

    const winningBid = { adUnitCode: AD_UNIT_CODE, cpm: 2.0, floorData: { floorProvider: 'PM', skipped: false, floorValue: 1 } };
    pbjsStub.getHighestCpmBids.withArgs(AD_UNIT_CODE).returns([winningBid]);

    const auction = buildAuction({ adUnits: [{ bids: [winningBid] }], bidsReceived: [winningBid] });

    const targeting = unifiedPricingRule.getTargeting([AD_UNIT_CODE], {}, {}, auction);
    expect(targeting[AD_UNIT_CODE].pm_ym_flrv).to.equal('2.00'); // 2 * default 1.0
  });

  it('RTD floor not applied - pm_ym_flrs should be 0 only', () => {
    // Floor data indicates skipped OR different provider
    const nonRtdBid = {
      adUnitCode: AD_UNIT_CODE,
      cpm: 1.0,
      floorData: { floorProvider: 'OTHER', skipped: true }
    };

    const auction = buildAuction({
      adUnits: [{ bids: [nonRtdBid] }],
      bidsReceived: [nonRtdBid]
    });

    const targeting = unifiedPricingRule.getTargeting([AD_UNIT_CODE], {}, {}, auction);
    expect(targeting[AD_UNIT_CODE].pm_ym_flrs).to.equal(0);
    expect(targeting[AD_UNIT_CODE]).to.not.have.property('pm_ym_flrv');
    expect(targeting[AD_UNIT_CODE]).to.not.have.property('pm_ym_bid_s');
  });

  it('pmTargetingKeys disabled - should return empty object', () => {
    // Re-init with pmTargetingKeys disabled
    unifiedPricingRule.init('dynamicFloors', {
      getYMConfig: () => ({
        plugins: {
          dynamicFloors: {
            pmTargetingKeys: { enabled: false }
          }
        }
      })
    });

    const targeting = unifiedPricingRule.getTargeting([AD_UNIT_CODE], {}, {}, {});
    expect(targeting).to.deep.equal({});
  });
});
