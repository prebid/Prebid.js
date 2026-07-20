import { expect } from 'chai';
import { getPrebidDevTools, installPrebidDevTools } from '../../modules/devtoolsMcp/index.ts';
import { auctionManager } from '../../src/auctionManager.js';
import { clearEvents, emit } from '../../src/events.js';
import { EVENTS } from '../../src/constants.js';
import { newMetrics } from '../../src/utils/perfMetrics.js';
import adapterManager from '../../src/adapterManager.js';

describe('devtoolsMcp', function () {
  afterEach(function () {
    auctionManager.clearAllAuctions();
    clearEvents();
  });

  it('registers a Chrome DevTools MCP tool group', function () {
    const win = {
      addEventListener: sinon.stub()
    };
    installPrebidDevTools(win);
    expect(win.__prebidDevToolsMcpInstalled).to.have.property('pbjs', true);
    const [eventName, handler] = win.addEventListener.firstCall.args;
    let toolGroup;

    handler({
      respondWith(group) {
        toolGroup = group;
      }
    });

    expect(eventName).to.equal('devtoolstooldiscovery');
    expect(toolGroup.name).to.equal('Prebid.js DevTools');
    expect(toolGroup.tools.map(tool => tool.name)).to.include.members(['pbjs_prebid_summary', 'pbjs_prebid_auctions', 'pbjs_prebid_events']);
  });

  it('namespaces tools for non-default Prebid globals', function () {
    const win = {
      addEventListener: sinon.stub()
    };
    installPrebidDevTools(win, 'customPbjs');
    expect(win.__prebidDevToolsMcpInstalled).to.have.property('customPbjs', true);
    const [, handler] = win.addEventListener.firstCall.args;
    let toolGroup;

    handler({
      respondWith(group) {
        toolGroup = group;
      }
    });

    expect(toolGroup.tools.map(tool => tool.name)).to.include.members(['customPbjs_prebid_summary', 'customPbjs_prebid_auctions', 'customPbjs_prebid_events']);
  });

  it('exposes auction, TTL, floor, and event timing details', function () {
    const metrics = newMetrics();
    metrics.setMetric('requestBids.total', 12);
    const auction = auctionManager.createAuction({
      adUnits: [{ code: 'div-1', adUnitId: 'au-1' }],
      adUnitCodes: ['div-1'],
      callback: function () {},
      cbTimeout: 1000,
      labels: [],
      auctionId: 'auction-1',
      ortb2Fragments: {},
      metrics
    });
    const bid = {
      auctionId: 'auction-1',
      adUnitCode: 'div-1',
      bidderCode: 'bidderA',
      requestId: 'bid-1',
      cpm: 1.23,
      currency: 'USD',
      ttl: 30,
      responseTimestamp: Date.now(),
      floorData: { floorValue: 1.0 },
      metrics
    };
    const callBidWonBidder = sinon.stub(adapterManager, 'callBidWonBidder');
    const triggerBilling = sinon.stub(adapterManager, 'triggerBilling');
    auction.addBidReceived(bid);
    auction.addWinningBid(bid);
    callBidWonBidder.restore();
    triggerBilling.restore();
    emit(EVENTS.AUCTION_INIT, auction.getProperties());

    const tools = Object.fromEntries(getPrebidDevTools().tools.map(tool => [tool.name, tool]));
    const auctions = tools.pbjs_prebid_auctions.execute({ auctionId: 'auction-1' });
    const events = tools.pbjs_prebid_events.execute({ auctionId: 'auction-1' });
    const noEvents = tools.pbjs_prebid_events.execute({ auctionId: 'auction-1', limit: 0 });
    const summary = tools.pbjs_prebid_summary.execute({});

    expect(auctions).to.have.length(1);
    expect(auctions[0].eligibleBidRequests).to.eql([]);
    expect(auctions[0].bidsReceived[0]).to.include({ bidder: 'bidderA', ttl: 30, bufferedTTL: 29 });
    expect(auctions[0].bidsReceived[0].floorData).to.eql({ floorValue: 1.0 });
    expect(auctions[0].metrics).to.include({ 'requestBids.total': 12 });
    expect(events[0]).to.include({ eventType: EVENTS.AUCTION_INIT });
    expect(events[0].args.auctionId).to.equal('auction-1');
    expect(noEvents).to.eql([]);
    expect(summary.byBidder.bidderA).to.include({ bids: 1, wins: 1 });
    expect(summary.latestAuction.auctionId).to.equal('auction-1');
  });
});
