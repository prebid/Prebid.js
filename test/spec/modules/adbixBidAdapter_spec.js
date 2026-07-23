import { expect } from 'chai';
import { spec } from 'modules/adbixBidAdapter.js';

describe('Adbix Bidder Adapter', function () {
  const validBid = {
    bidder: 'adbix',
    bidId: 'adbix-bid-id-1',

    params: {
      publisherId: 'test-publisher',
      placementId: 'test-300x250',
      test: true
    },

    mediaTypes: {
      banner: {
        sizes: [[300, 250]]
      }
    },

    getFloor: () => ({
      floor: 0,
      currency: 'USD'
    })
  };

  it('accepts a bid with publisherId, placementId and banner size', function () {
    expect(spec.isBidRequestValid(validBid)).to.equal(true);
  });

  it('rejects a bid without publisherId', function () {
    const bid = {
      ...validBid,
      params: {
        placementId: 'test-300x250'
      }
    };

    expect(spec.isBidRequestValid(bid)).to.equal(false);
  });

  it('rejects a bid without placementId', function () {
    const bid = {
      ...validBid,
      params: {
        publisherId: 'test-publisher'
      }
    };

    expect(spec.isBidRequestValid(bid)).to.equal(false);
  });

  it('builds an OpenRTB-style test request for the Adbix endpoint', function () {
    const request = spec.buildRequests([validBid], {
      bidderRequestId: 'auction-001',
      timeout: 800,

      refererInfo: {
        domain: 'example.com',
        page: 'https://example.com/article',
        ref: 'https://google.com/'
      }
    });

    expect(request.method).to.equal('POST');
    expect(request.url).to.equal('https://adbix.net/api/prebid-auction.php');

    const body = JSON.parse(request.data);

    expect(body.id).to.equal('auction-001');
    expect(body.test).to.equal(1);
    expect(body.imp[0].id).to.equal('adbix-bid-id-1');
    expect(body.imp[0].banner.format).to.deep.equal([
      { w: 300, h: 250 }
    ]);

    expect(body.imp[0].ext.prebid.bidder.adbix.publisherId)
      .to.equal('test-publisher');

    expect(body.imp[0].ext.prebid.bidder.adbix.placementId)
      .to.equal('test-300x250');
  });

  it('preserves publisher ortb2Imp ext.prebid fields and Adbix bidder params', function () {
    const bid = {
      ...validBid,

      ortb2Imp: {
        instl: 1,

        ext: {
          prebid: {
            storedrequest: {
              id: 'stored-request-id'
            },

            passthrough: {
              customField: 'custom-value'
            },

            bidder: {
              anotherBidder: {
                placementId: 'another-placement'
              }
            }
          },

          customExtensionField: 'preserved'
        }
      }
    };

    const request = spec.buildRequests([bid], {
      bidderRequestId: 'auction-ortb2-001',
      timeout: 800,
      refererInfo: {}
    });

    const body = JSON.parse(request.data);
    const imp = body.imp[0];

    expect(imp.instl).to.equal(1);

    expect(imp.ext.customExtensionField).to.equal('preserved');

    expect(imp.ext.prebid.storedrequest).to.deep.equal({
      id: 'stored-request-id'
    });

    expect(imp.ext.prebid.passthrough).to.deep.equal({
      customField: 'custom-value'
    });

    expect(imp.ext.prebid.bidder.anotherBidder).to.deep.equal({
      placementId: 'another-placement'
    });

    expect(imp.ext.prebid.bidder.adbix.publisherId)
      .to.equal('test-publisher');

    expect(imp.ext.prebid.bidder.adbix.placementId)
      .to.equal('test-300x250');

    expect(imp.ext.prebid.bidder.adbix.test).to.equal(true);
  });

  it('does not return an image user sync when pixel sync is disabled', function () {
    const syncs = spec.getUserSyncs({
      iframeEnabled: true,
      pixelEnabled: false
    });

    expect(syncs).to.deep.equal([]);
  });

  it('returns an image user sync when pixel sync is enabled', function () {
    const syncs = spec.getUserSyncs({
      iframeEnabled: false,
      pixelEnabled: true
    });

    expect(syncs).to.deep.equal([{
      type: 'image',
      url: 'https://adbix.net/sync'
    }]);
  });

  it('parses a valid Adbix OpenRTB bid response', function () {
    const bids = spec.interpretResponse({
      body: {
        cur: 'USD',

        seatbid: [{
          seat: 'adbix',

          bid: [{
            id: 'adbix-response-1',
            impid: 'adbix-bid-id-1',
            price: 0.10,
            adm: '<div>Adbix test creative</div>',
            adomain: ['adbix.net'],
            crid: 'adbix-test-300x250',
            w: 300,
            h: 250,
            ttl: 300
          }]
        }]
      }
    }, {});

    expect(bids).to.have.length(1);
    expect(bids[0].requestId).to.equal('adbix-bid-id-1');
    expect(bids[0].cpm).to.equal(0.10);
    expect(bids[0].width).to.equal(300);
    expect(bids[0].height).to.equal(250);

    expect(bids[0].meta.advertiserDomains)
      .to.deep.equal(['adbix.net']);
  });
});
