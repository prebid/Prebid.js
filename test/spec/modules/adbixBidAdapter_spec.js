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

  function buildRequest(bids = [validBid], bidderRequest = {}) {
    return spec.buildRequests(bids, {
      bidderRequestId: 'auction-001',
      timeout: 800,
      refererInfo: {
        domain: 'example.com',
        page: 'https://example.com/article',
        ref: 'https://google.com/'
      },
      ...bidderRequest
    });
  }

  function buildBody(bids = [validBid], bidderRequest = {}) {
    return JSON.parse(buildRequest(bids, bidderRequest).data);
  }

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

  it('rejects a bid without a valid banner size array', function () {
    const bid = {
      ...validBid,
      mediaTypes: {
        banner: {
          sizes: '300x250'
        }
      }
    };

    expect(spec.isBidRequestValid(bid)).to.equal(false);
  });

  it('builds an OpenRTB-style test request for the Adbix endpoint', function () {
    const request = buildRequest();
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

  it('preserves global ortb2 fields and supply-chain data', function () {
    const ortb2 = {
      device: {
        w: 390,
        h: 844,
        ua: 'test-user-agent'
      },
      cur: ['EUR'],
      ext: {
        publisherField: 'preserved'
      },
      regs: {
        coppa: 1,
        ext: {
          gpp: 'test-gpp'
        }
      },
      user: {
        id: 'test-user-id'
      },
      bcat: ['IAB1'],
      badv: ['blocked.example'],
      battr: [1],
      bapp: ['com.example.app'],
      wseat: ['seat-1'],
      source: {
        tid: 'auction-tid',
        ext: {
          schain: {
            ver: '1.0',
            complete: 1,
            nodes: []
          }
        }
      }
    };

    const body = buildBody([validBid], { ortb2 });

    expect(body.device).to.deep.equal(ortb2.device);
    expect(body.cur).to.deep.equal(ortb2.cur);
    expect(body.ext).to.deep.equal(ortb2.ext);
    expect(body.regs).to.deep.equal(ortb2.regs);
    expect(body.user).to.deep.equal(ortb2.user);
    expect(body.bcat).to.deep.equal(ortb2.bcat);
    expect(body.badv).to.deep.equal(ortb2.badv);
    expect(body.battr).to.deep.equal(ortb2.battr);
    expect(body.bapp).to.deep.equal(ortb2.bapp);
    expect(body.wseat).to.deep.equal(ortb2.wseat);
    expect(body.source).to.deep.equal(ortb2.source);
  });

  it('preserves configured site values over refererInfo fallbacks', function () {
    const ortb2 = {
      site: {
        domain: 'configured.example',
        page: 'https://configured.example/page',
        ref: 'https://configured.example/ref',
        publisher: {
          id: 'publisher-1'
        }
      }
    };

    const body = buildBody([validBid], {
      ortb2,
      refererInfo: {
        domain: 'actual.example',
        page: 'https://actual.example/page',
        ref: 'https://actual.example/ref'
      }
    });

    expect(body.site).to.deep.equal(ortb2.site);
  });

  it('sends app context without adding a site section', function () {
    const app = {
      id: 'app-1',
      name: 'Test App'
    };

    const body = buildBody([validBid], {
      ortb2: {
        app,
        device: {
          ua: 'app-user-agent'
        }
      }
    });

    expect(body.app).to.deep.equal(app);
    expect(body).to.not.have.property('site');
  });

  it('sends dooh context without adding site or app sections', function () {
    const dooh = {
      id: 'dooh-1',
      name: 'Test DOOH'
    };

    const body = buildBody([validBid], {
      ortb2: {
        dooh
      }
    });

    expect(body.dooh).to.deep.equal(dooh);
    expect(body).to.not.have.property('site');
    expect(body).to.not.have.property('app');
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

    const body = buildBody([bid], { refererInfo: {} });
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

  it('preserves an impression floor when getFloor is unavailable', function () {
    const bid = {
      ...validBid,
      getFloor: undefined,
      ortb2Imp: {
        bidfloor: 1.5,
        bidfloorcur: 'EUR'
      }
    };

    const body = buildBody([bid]);

    expect(body.imp[0].bidfloor).to.equal(1.5);
    expect(body.imp[0].bidfloorcur).to.equal('EUR');
  });

  it('preserves an impression floor when getFloor returns no usable floor', function () {
    const bid = {
      ...validBid,
      getFloor: () => ({
        floor: 0,
        currency: 'USD'
      }),
      ortb2Imp: {
        bidfloor: 1.75,
        bidfloorcur: 'GBP'
      }
    };

    const body = buildBody([bid]);

    expect(body.imp[0].bidfloor).to.equal(1.75);
    expect(body.imp[0].bidfloorcur).to.equal('GBP');
  });

  it('uses the floor and currency returned by getFloor when valid', function () {
    const bid = {
      ...validBid,
      getFloor: () => ({
        floor: 2.25,
        currency: 'EUR'
      }),
      ortb2Imp: {
        bidfloor: 1,
        bidfloorcur: 'USD'
      }
    };

    const body = buildBody([bid]);

    expect(body.imp[0].bidfloor).to.equal(2.25);
    expect(body.imp[0].bidfloorcur).to.equal('EUR');
  });

  it('does not mark a mixed test and live batch as a test request', function () {
    const liveBid = {
      ...validBid,
      bidId: 'adbix-bid-id-live',
      params: {
        ...validBid.params,
        test: false
      }
    };

    const body = buildBody([validBid, liveBid]);

    expect(body.test).to.equal(0);
    expect(body.imp.map((imp) => imp.ext.prebid.bidder.adbix.test))
      .to.deep.equal([true, false]);
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
      url: 'https://adbix.net/sync/index.php'
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

  it('ignores malformed bids in an Adbix OpenRTB response', function () {
    const bids = spec.interpretResponse({
      body: {
        cur: 'USD',
        seatbid: [{
          bid: [
            {
              id: 'invalid-response-1',
              impid: 'adbix-bid-id-invalid',
              price: 0,
              adm: '<div>Invalid creative</div>',
              w: 300,
              h: 250
            },
            {
              id: 'valid-response-1',
              impid: 'adbix-bid-id-valid',
              price: 0.20,
              adm: '<div>Valid creative</div>',
              crid: 'adbix-valid-300x250',
              w: 300,
              h: 250
            }
          ]
        }]
      }
    }, {});

    expect(bids).to.have.length(1);
    expect(bids[0].requestId).to.equal('adbix-bid-id-valid');
  });
});
