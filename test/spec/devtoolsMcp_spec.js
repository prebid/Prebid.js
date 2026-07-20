import { expect } from 'chai';
import { getPrebidDevTools, installPrebidDevTools } from '../../modules/devtoolsMcp/index.ts';
import { install } from '../../modules/devtoolsMcp/devtoolsMcp.ts';
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
    expect(win.__prebidDevToolsMcp).to.be.an('array');
    const [eventName, handler] = win.addEventListener.firstCall.args;
    let toolGroup;

    handler({
      respondWith(group) {
        toolGroup = group;
      }
    });

    expect(eventName).to.equal('devtoolstooldiscovery');
    expect(toolGroup.name).to.equal('Prebid.js DevTools');
    expect(toolGroup.tools.map(tool => tool.name)).to.include.members(['summary', 'auctions', 'events']);
  });

  it('exposes a single, un-namespaced set of tools regardless of the Prebid global name', function () {
    const win = {
      addEventListener: sinon.stub()
    };
    installPrebidDevTools(win);
    const [, handler] = win.addEventListener.firstCall.args;
    let toolGroup;

    handler({
      respondWith(group) {
        toolGroup = group;
      }
    });

    const names = toolGroup.tools.map(tool => tool.name);
    expect(names).to.include.members(['summary', 'auctions', 'events']);
    expect(names.some(name => name.includes('pbjs') || name.includes('_'))).to.equal(false);
  });

  it('installs the discovery listener only once per page, by the first instance', function () {
    const win = {
      addEventListener: sinon.stub()
    };
    installPrebidDevTools(win);
    installPrebidDevTools(win);

    expect(win.addEventListener.callCount).to.equal(1);
    const [, handler] = win.addEventListener.firstCall.args;
    let toolGroup;
    handler({
      respondWith(group) {
        toolGroup = group;
      }
    });
    expect(toolGroup.tools.map(tool => tool.name)).to.include.members(['summary', 'auctions', 'events']);
  });

  it('aggregates tool results across all registered instances, tagging each row with its instance', function () {
    const a = {
      summary: sinon.stub().returns({ v: 'A' }),
      auctions: sinon.stub().returns([{ auctionId: 'a1' }]),
      events: sinon.stub().returns([{ id: 'ea1', elapsedTime: 1 }, { id: 'ea2', elapsedTime: 2 }])
    };
    const b = {
      summary: sinon.stub().returns({ v: 'B' }),
      auctions: sinon.stub().returns([{ auctionId: 'b1' }, { auctionId: 'b2' }]),
      events: sinon.stub().returns([{ id: 'eb1', elapsedTime: 3 }])
    };
    const win = { __prebidDevToolsMcp: [{ instance: 'inst-a', handlers: a }, { instance: 'inst-b', handlers: b }] };
    const tools = Object.fromEntries(getPrebidDevTools(win).tools.map(tool => [tool.name, tool]));

    // summary: one entry per instance (concatenation), each tagged with its instance
    expect(tools.summary.execute({})).to.eql([{ instance: 'inst-a', v: 'A' }, { instance: 'inst-b', v: 'B' }]);
    // auctions: flattened list across instances, each tagged
    expect(tools.auctions.execute({ auctionId: 'x' })).to.eql([
      { instance: 'inst-a', auctionId: 'a1' },
      { instance: 'inst-b', auctionId: 'b1' },
      { instance: 'inst-b', auctionId: 'b2' }
    ]);
    expect(a.auctions.calledWith({ auctionId: 'x' })).to.equal(true);
    // events: flattened history across instances, tagged and ordered by elapsedTime
    expect(tools.events.execute({}).map(event => `${event.instance}:${event.id}`)).to.eql(['inst-a:ea1', 'inst-a:ea2', 'inst-b:eb1']);
  });

  it('returns the most recent events by elapsedTime across instances', function () {
    const a = {
      summary: sinon.stub(),
      auctions: sinon.stub().returns([]),
      events: sinon.stub().returns([{ id: 'a1', elapsedTime: 10 }, { id: 'a2', elapsedTime: 40 }])
    };
    const b = {
      summary: sinon.stub(),
      auctions: sinon.stub().returns([]),
      events: sinon.stub().returns([{ id: 'b1', elapsedTime: 20 }, { id: 'b2', elapsedTime: 30 }])
    };
    const win = { __prebidDevToolsMcp: [{ instance: 'inst-a', handlers: a }, { instance: 'inst-b', handlers: b }] };
    const tools = Object.fromEntries(getPrebidDevTools(win).tools.map(tool => [tool.name, tool]));

    // combined order by elapsedTime is a1(10), b1(20), b2(30), a2(40);
    // the 3 most recent are b1, b2, a2 (interleaved across instances)
    expect(tools.events.execute({ limit: 3 }).map(event => event.id)).to.eql(['b1', 'b2', 'a2']);
    // the limit is handled at the aggregation layer, not passed down to each instance
    expect(a.events.firstCall.args[0]).to.not.have.property('limit');
    // a limit of 0 returns nothing
    expect(tools.events.execute({ limit: 0 })).to.eql([]);
  });

  it('filters each tool to the requested instance', function () {
    const a = {
      summary: sinon.stub().returns({ v: 'A' }),
      auctions: sinon.stub().returns([{ auctionId: 'a1' }]),
      events: sinon.stub().returns([{ id: 'ea1', elapsedTime: 1 }])
    };
    const b = {
      summary: sinon.stub().returns({ v: 'B' }),
      auctions: sinon.stub().returns([{ auctionId: 'b1' }]),
      events: sinon.stub().returns([{ id: 'eb1', elapsedTime: 2 }])
    };
    const win = { __prebidDevToolsMcp: [{ instance: 'inst-a', handlers: a }, { instance: 'inst-b', handlers: b }] };
    const tools = Object.fromEntries(getPrebidDevTools(win).tools.map(tool => [tool.name, tool]));

    expect(tools.summary.execute({ instance: 'inst-b' })).to.eql([{ instance: 'inst-b', v: 'B' }]);
    expect(tools.auctions.execute({ instance: 'inst-a' })).to.eql([{ instance: 'inst-a', auctionId: 'a1' }]);
    expect(tools.events.execute({ instance: 'inst-a' }).map(event => event.id)).to.eql(['ea1']);
    // the non-selected instance's handlers are not consulted
    expect(b.auctions.called).to.equal(false);
    // `instance` is not passed down to the per-instance handlers
    expect(a.auctions.firstCall.args[0]).to.not.have.property('instance');
  });

  it('identifies each instance by its global var name, or a synthetic id when no global is defined', function () {
    const win = { addEventListener: sinon.stub() };
    const baseDeps = {
      auctionManager: {},
      getGlobal: () => ({}),
      getBufferedTTL: () => undefined,
      getEffectiveMinBidCacheTTL: () => undefined,
      isBidUsable: () => undefined
    };
    install({ ...baseDeps, shouldDefineGlobal: () => true, getGlobalVarName: () => 'myPbjs' }, win);
    install({ ...baseDeps, shouldDefineGlobal: () => false, getGlobalVarName: () => 'ignored' }, win);
    install({ ...baseDeps, shouldDefineGlobal: () => false, getGlobalVarName: () => 'ignored' }, win);

    expect(win.__prebidDevToolsMcp.map(registration => registration.instance)).to.eql(['myPbjs', 'unnamed-0', 'unnamed-1']);
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
    const auctions = tools.auctions.execute({ auctionId: 'auction-1' });
    const events = tools.events.execute({ auctionId: 'auction-1' });
    const noEvents = tools.events.execute({ auctionId: 'auction-1', limit: 0 });
    const summary = tools.summary.execute({});

    expect(auctions).to.have.length(1);
    expect(auctions[0].eligibleBidRequests).to.eql([]);
    expect(auctions[0].bidsReceived[0]).to.include({ bidder: 'bidderA', ttl: 30, bufferedTTL: 29 });
    expect(auctions[0].bidsReceived[0].floorData).to.eql({ floorValue: 1.0 });
    expect(auctions[0].metrics).to.include({ 'requestBids.total': 12 });
    expect(events[0]).to.include({ eventType: EVENTS.AUCTION_INIT });
    expect(events[0].args.auctionId).to.equal('auction-1');
    expect(noEvents).to.eql([]);
    expect(summary).to.have.length(1);
    expect(summary[0].byBidder.bidderA).to.include({ bids: 1, wins: 1 });
    expect(summary[0].latestAuction.auctionId).to.equal('auction-1');
  });
});
