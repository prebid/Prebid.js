
import { expect } from 'chai';
import { sessionLoader, addBidResponseHook, addBidderRequestsHook, getConfig, disableOverrides, addBidResponseBound, addBidderRequestsBound } from 'src/debugging.js';
import { addBidResponse, addBidderRequests } from 'src/auction.js';
import { config } from 'src/config.js';

describe('bid overrides', function () {
  let sandbox;

  beforeEach(function () {
    sandbox = sinon.sandbox.create();
  });

  afterEach(function () {
    window.sessionStorage.clear();
    config.resetConfig();
    sandbox.restore();
  });

  describe('initialization', function () {
    beforeEach(function () {
      sandbox.stub(config, 'setConfig');
    });

    afterEach(function () {
      disableOverrides();
    });

    it('should happen when enabled with setConfig', function () {
      getConfig({
        enabled: true
      });

      expect(addBidResponse.getHooks().some(hook => hook.hook === addBidResponseBound)).to.equal(true);
      expect(addBidderRequests.getHooks().some(hook => hook.hook === addBidderRequestsBound)).to.equal(true);
    });

    it('should happen when configuration found in sessionStorage', function () {
      sessionLoader({
        getItem: () => ('{"enabled": true}')
      });
      expect(addBidResponse.getHooks().some(hook => hook.hook === addBidResponseBound)).to.equal(true);
      expect(addBidderRequests.getHooks().some(hook => hook.hook === addBidderRequestsBound)).to.equal(true);
    });

    it('should not throw if sessionStorage is inaccessible', function () {
      expect(() => {
        sessionLoader({
          getItem() {
            throw new Error('test');
          }
        });
      }).not.to.throw();
    });
  });

  describe('bidResponse hook', function () {
    let mockBids;
    let bids;

    beforeEach(function () {
      let baseBid = {
        'bidderCode': 'rubicon',
        'width': 970,
        'height': 250,
        'statusMessage': 'Bid available',
        'mediaType': 'banner',
        'source': 'client',
        'currency': 'USD',
        'cpm': 0.5,
        'ttl': 300,
        'netRevenue': false,
        'adUnitCode': '/19968336/header-bid-tag-0'
      };
      mockBids = [];
      mockBids.push(baseBid);
      mockBids.push(Object.assign({}, baseBid, {
        bidderCode: 'appnexus'
      }));

      bids = [];
    });

    function run(overrides) {
      mockBids.forEach(bid => {
        let next = (adUnitCode, bid) => {
          bids.push(bid);
        };
        addBidResponseHook.bind(overrides)(next, bid.adUnitCode, bid);
      });
    }

    it('should allow us to exclude bidders', function () {
      run({
        enabled: true,
        bidders: ['appnexus']
      });

      expect(bids.length).to.equal(1);
      expect(bids[0].bidderCode).to.equal('appnexus');
    });

    it('should allow us to override all bids', function () {
      run({
        enabled: true,
        bids: [{
          cpm: 2
        }]
      });

      expect(bids.length).to.equal(2);
      expect(bids[0].cpm).to.equal(2);
      expect(bids[1].cpm).to.equal(2);
    });

    it('should allow us to override bids by bidder', function () {
      run({
        enabled: true,
        bids: [{
          bidder: 'rubicon',
          cpm: 2
        }]
      });

      expect(bids.length).to.equal(2);
      expect(bids[0].cpm).to.equal(2);
      expect(bids[1].cpm).to.equal(0.5);
    });

    it('should allow us to override bids by adUnitCode', function () {
      mockBids[1].adUnitCode = 'test';

      run({
        enabled: true,
        bids: [{
          adUnitCode: 'test',
          cpm: 2
        }]
      });

      expect(bids.length).to.equal(2);
      expect(bids[0].cpm).to.equal(0.5);
      expect(bids[1].cpm).to.equal(2);
    });
  });

  describe('bidRequests hook', function () {
    let mockBidRequests;
    let bidderRequests;

    beforeEach(function () {
      let baseBidderRequest = {
        'bidderCode': 'rubicon',
        'bids': [{
          'width': 970,
          'height': 250,
          'statusMessage': 'Bid available',
          'mediaType': 'banner',
          'source': 'client',
          'currency': 'USD',
          'cpm': 0.5,
          'ttl': 300,
          'netRevenue': false,
          'adUnitCode': '/19968336/header-bid-tag-0'
        }]
      };
      mockBidRequests = [];
      mockBidRequests.push(baseBidderRequest);
      mockBidRequests.push(Object.assign({}, baseBidderRequest, {
        bidderCode: 'appnexus'
      }));

      bidderRequests = [];
    });

    function run(overrides) {
      let next = (b) => {
        bidderRequests = b;
      };
      addBidderRequestsHook.bind(overrides)(next, mockBidRequests);
    }

    it('should allow us to exclude bidders', function () {
      run({
        enabled: true,
        bidders: ['appnexus']
      });

      expect(bidderRequests.length).to.equal(1);
      expect(bidderRequests[0].bidderCode).to.equal('appnexus');
    });
  });
});
