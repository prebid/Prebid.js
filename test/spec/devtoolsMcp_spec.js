import { expect } from 'chai';
import { getPrebidDevTools, installPrebidDevTools } from '../../modules/devtoolsMcp.js';
import { auctionManager } from '../../src/auctionManager.js';
import { clearEvents, emit } from '../../src/events.js';
import { EVENTS } from '../../src/constants.js';
import { newMetrics } from '../../src/utils/perfMetrics.js';

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
    const [eventName, handler] = win.addEventListener.firstCall.args;
    let toolGroup;

    handler({
      respondWith(group) {
        toolGroup = group;
      }
    });

    expect(eventName).to.equal('devtoolstooldiscovery');
    expect(toolGroup.name).to.equal('Prebid.js DevTools');
    expect(toolGroup.tools.map(tool => tool.name)).to.include.members(['prebid_summary', 'prebid_auctions', 'prebid_events']);
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
    auction.addBidReceived({
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
    });
    emit(EVENTS.AUCTION_INIT, auction.getProperties());

    const tools = Object.fromEntries(getPrebidDevTools().tools.map(tool => [tool.name, tool]));
    const auctions = tools.prebid_auctions.execute({ auctionId: 'auction-1' });
    const events = tools.prebid_events.execute({ auctionId: 'auction-1' });
    const summary = tools.prebid_summary.execute({});

    expect(auctions).to.have.length(1);
    expect(auctions[0].eligibleBidRequests).to.eql([]);
    expect(auctions[0].bidsReceived[0]).to.include({ bidder: 'bidderA', ttl: 30, bufferedTTL: 29 });
    expect(auctions[0].bidsReceived[0].floorData).to.eql({ floorValue: 1.0 });
    expect(auctions[0].metrics).to.include({ 'requestBids.total': 12 });
    expect(events[0]).to.include({ eventType: EVENTS.AUCTION_INIT });
    expect(events[0].args.auctionId).to.equal('auction-1');
    expect(summary.latestAuction.auctionId).to.equal('auction-1');
  });
});
