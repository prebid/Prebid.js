
import { expect } from 'chai';
import { sessionLoader, addBidResponseHook, getConfig, disableOverrides, boundHook } from 'src/debugging';
import { addBidResponse } from 'src/auction';
import { config } from 'src/config';

describe('bid overrides', () => {
  let sandbox;

  beforeEach(() => {
    sandbox = sinon.sandbox.create();
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('initialization', () => {
    beforeEach(() => {
      sandbox.stub(config, 'setConfig');
      sandbox.stub(window.sessionStorage, 'setItem');
      sandbox.stub(window.sessionStorage, 'removeItem');
    });

    afterEach(() => {
      disableOverrides();
    });

    it('should happen when enabled with setConfig', () => {
      getConfig({
        enabled: true
      });

      expect(addBidResponse.hasHook(boundHook)).to.equal(true);
    });

    it('should happen when configuration found in sessionStorage', () => {
      sandbox.stub(window.sessionStorage, 'getItem').returns('{"enabled": true}');

      sessionLoader();
      expect(addBidResponse.hasHook(boundHook)).to.equal(true);
    });

    it('should not throw if sessionStorage is inaccessible', () => {
      sandbox.stub(window.sessionStorage, 'getItem').throws();

      expect(() => {
        sessionLoader();
      }).not.to.throw();
    });
  });

  describe('hook', () => {
    let mockBids;
    let bids;

    beforeEach(() => {
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
        addBidResponseHook(overrides, bid.adUnitCode, bid, (adUnitCode, bid) => {
          bids.push(bid);
        })
      });
    }

    it('should allow us to exclude bidders', () => {
      run({
        enabled: true,
        bidders: ['appnexus']
      });

      expect(bids.length).to.equal(1);
      expect(bids[0].bidderCode).to.equal('appnexus');
    });

    it('should allow us to override all bids', () => {
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

    it('should allow us to override bids by bidder', () => {
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

    it('should allow us to override bids by adUnitCode', () => {
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
});
