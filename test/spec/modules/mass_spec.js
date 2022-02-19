import { expect } from 'chai';
import {
  init,
  addBidResponseHook,
  addListenerOnce,
  isMassBid,
  useDefaultMatch,
  useDefaultRender,
  updateRenderers,
  listenerAdded,
  isEnabled
} from 'modules/mass';
import { logInfo } from 'src/utils.js';

// mock a MASS bid:
const mockedMassBids = [
  {
    bidder: 'ix',
    bidId: 'mass-bid-1',
    requestId: 'mass-bid-1',
    bidderRequestId: 'bidder-request-id-1',
    dealId: 'MASS1234',
    ad: 'mass://provider/product/etc...',
    meta: {}
  },
  {
    bidder: 'ix',
    bidId: 'mass-bid-2',
    requestId: 'mass-bid-2',
    bidderRequestId: 'bidder-request-id-1',
    dealId: '1234',
    ad: 'mass://provider/product/etc...',
    meta: {
      mass: true
    }
  },
];

// mock non-MASS bids:
const mockedNonMassBids = [
  {
    bidder: 'ix',
    bidId: 'non-mass-bid-1',
    requstId: 'non-mass-bid-1',
    bidderRequestId: 'bidder-request-id-1',
    dealId: 'MASS1234',
    ad: '<creative />',
    meta: {
      mass: true
    }
  },
  {
    bidder: 'ix',
    bidId: 'non-mass-bid-2',
    requestId: 'non-mass-bid-2',
    bidderRequestId: 'bidder-request-id-1',
    dealId: '1234',
    ad: 'mass://provider/product/etc...',
    meta: {}
  },
];

const noop = function() {};

describe('MASS Module', function() {
  it('should be enabled by default', function() {
    expect(isEnabled).to.equal(true);
  });

  it('can be disabled', function() {
    init({enabled: false});
    expect(isEnabled).to.equal(false);
  });

  it('should only affect MASS bids', function() {
    init({renderUrl: 'https://...'});
    mockedNonMassBids.forEach(function(mockedBid) {
      const originalBid = Object.assign({}, mockedBid);
      const bid = Object.assign({}, originalBid);

      addBidResponseHook(noop, 'ad-code-id', bid);

      expect(bid).to.deep.equal(originalBid);
    });
  });

  it('should only update the ad markup field', function() {
    init({renderUrl: 'https://...'});
    mockedMassBids.forEach(function(mockedBid) {
      const originalBid = Object.assign({}, mockedBid);
      const bid = Object.assign({}, originalBid);

      addBidResponseHook(noop, 'ad-code-id', bid);

      expect(bid.ad).to.not.equal(originalBid.ad);

      delete bid.ad;
      delete originalBid.ad;

      expect(bid).to.deep.equal(originalBid);
    });
  });

  it('should add a message listener', function() {
    addListenerOnce();
    expect(listenerAdded).to.equal(true);
  });

  it('should support custom renderers', function() {
    init({
      renderUrl: 'https://...',
      custom: [
        {
          dealIdPattern: /abc/,
          render: function() {}
        }
      ]
    });

    const renderers = updateRenderers();

    expect(renderers.length).to.equal(2);
  });

  it('should match bids by deal ID with the default matcher', function() {
    const match = useDefaultMatch(/abc/);

    expect(match({dealId: 'abc'})).to.equal(true);
    expect(match({dealId: 'xyz'})).to.equal(false);
  });

  it('should have a default renderer', function() {
    const render = useDefaultRender('https://example.com/render.js', 'abc');
    render({});

    expect(window.abc.loaded).to.equal(true);
    expect(window.abc.queue.length).to.equal(1);
  });
});
