import { expect } from 'chai';
import { spec } from 'modules/ezoicBidAdapter.js';
import { resetWinDimensions } from 'src/utils.js';

const ENDPOINT = 'https://g.ezoic.net/ezoic/prebid/adapter';
const SYNC_URL = 'https://g.ezoic.net/ezoic/prebid/adapter/usersync-frame';
const BID_ID = 'ezoic-bid-1';
const AD_UNIT_CODE = 'div-gpt-ad-content-1';
const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

function getBidRequest(overrides = {}) {
  return {
    bidder: 'ezoic',
    params: {
      domainId: 123,
      placementType: 'display',
      adPositionType: 5,
      placementId: 987,
      renderUrl: 'https://g.ezoic.net/render',
    },
    adUnitCode: AD_UNIT_CODE,
    sizes: [[300, 250]],
    bidId: BID_ID,
    bidderRequestId: 'bidder-request-1',
    auctionId: 'auction-1',
    mediaTypes: {
      banner: {
        sizes: [[300, 250]]
      }
    },
    ...overrides
  };
}

function getVideoBidRequest(overrides = {}) {
  return getBidRequest({
    params: {
      placementType: 'video',
      adPositionType: 15,
      adPositionId: 2200,
    },
    sizes: undefined,
    mediaTypes: {
      video: {
        context: 'instream',
        playerSize: [[640, 360]],
        plcmt: 1,
        mimes: ['video/mp4'],
        protocols: [2, 3],
        api: [7],
        playbackmethod: [1],
        minduration: 5,
        maxduration: 30
      }
    },
    ortb2Imp: {
      video: {
        plcmt: 1,
        w: 640,
        h: 360
      },
      ext: {
        data: {
          pos: 'preroll'
        }
      }
    },
    ...overrides
  });
}

function getNativeBidRequest(overrides = {}) {
  return getBidRequest({
    params: {
      placementType: 'native',
      adPositionType: 5,
      adPositionId: 3300,
    },
    sizes: undefined,
    mediaTypes: {
      native: {
        ortb: {
          ver: '1.2',
          assets: [{
            id: 1,
            required: 1,
            title: { len: 90 }
          }, {
            id: 2,
            required: 1,
            img: { type: 3, wmin: 300, hmin: 250 }
          }],
          eventtrackers: [{ event: 1, methods: [1, 2] }]
        }
      }
    },
    ortb2Imp: {
      native: {
        request: JSON.stringify({
          ver: '1.2',
          assets: [{ id: 1, required: 1, title: { len: 90 } }]
        })
      },
      ext: {
        data: {
          pos: 'native-feed'
        }
      }
    },
    ...overrides
  });
}

function getMultiformatBidRequest(overrides = {}) {
  return getBidRequest({
    sizes: [[300, 250]],
    mediaTypes: {
      banner: {
        sizes: [[300, 250]]
      },
      video: {
        context: 'instream',
        playerSize: [[640, 360]],
        mimes: ['video/mp4'],
        protocols: [2, 3],
      }
    },
    ...overrides
  });
}

function getOutstreamBidRequest(overrides = {}) {
  return getVideoBidRequest({
    mediaTypes: {
      video: {
        context: 'outstream',
        playerSize: [[640, 360]],
        plcmt: 3
      }
    },
    ortb2Imp: {
      video: {
        plcmt: 3,
        w: 640,
        h: 360
      }
    },
    ...overrides
  });
}

function getOutstreamVastResponse(overrides = {}) {
  return {
    requestId: BID_ID,
    cpm: 3.21,
    currency: 'USD',
    creativeId: 'creative-video',
    mediaType: 'video',
    vastUrl: 'https://vastproxy.ezoic.net/vastadapter/signed-video-token',
    ...overrides
  };
}

function getBidderRequest(overrides = {}) {
  return {
    auctionId: 'auction-1',
    bidderRequestId: 'bidder-request-1',
    timeout: 750,
    refererInfo: {
      page: 'https://example.com/article'
    },
    gdprConsent: {
      gdprApplies: false
    },
    uspConsent: '1---',
    gppConsent: {
      gppString: 'GPP_STRING',
      applicableSections: [7]
    },
    ortb2: {
      site: {
        domain: 'example.com',
        page: 'https://example.com/article'
      }
    },
    ...overrides
  };
}

describe('Ezoic adapter', function () {
  afterEach(function () {
    // The adapter caches a generated pageview id/epoch on window for the
    // life of the page; reset it between tests so each test starts fresh.
    delete window.__ezoicPrebidAdapter;
    sinon.restore();
    resetWinDimensions();
  });

  it('declares Ezoic Inc GVL vendor id for Prebid TCF enforcement', function () {
    expect(spec.gvlid).to.equal(347);
  });

  it('declares banner, video, and native support', function () {
    expect(spec.supportedMediaTypes).to.include('banner');
    expect(spec.supportedMediaTypes).to.include('video');
    expect(spec.supportedMediaTypes).to.include('native');
  });

  describe('isBidRequestValid', function () {
    it('returns true for a bid request with no params', function () {
      expect(spec.isBidRequestValid(getBidRequest({ params: {} }))).to.equal(true);
    });

    it('returns true for a banner request with params', function () {
      expect(spec.isBidRequestValid(getBidRequest())).to.equal(true);
    });

    it('returns true regardless of bid shape', function () {
      expect(spec.isBidRequestValid({})).to.equal(true);
    });
  });

  describe('buildRequests', function () {
    it('posts Prebid and ORTB metadata to the fixed adapter endpoint', function () {
      // Karma runs specs inside an iframe, so `window.top` (what
      // getWinDimensions actually reads via canAccessWindowTop) is the outer
      // browser window, not the local `window` binding.
      sinon.stub(window.top, 'innerWidth').value(1280);
      resetWinDimensions();
      const bidderRequest = getBidderRequest({
        ortb2: {
          site: {
            domain: 'example.com',
            page: 'https://example.com/article',
            cat: ['IAB13']
          },
          device: {
            geo: {
              country: 'CA'
            }
          },
          user: {
            ext: {
              eids: [{ source: 'pubcid.org', uids: [{ id: 'pubcid-1', atype: 1 }] }]
            }
          }
        }
      });
      const request = spec.buildRequests([getBidRequest({
        params: {
          ...getBidRequest().params,
          impressionId: 'client-impression-1',
          tap: 'content-slot-client-impression-1',
          adPositionId: 1100,
          publisherProvidedId: 'ppid-from-client',
          googlePageTargeting: {
            AU_SEG: ['AU_SEG_TEST'],
            'li-module-enabled': 't1-e1'
          }
        }
      })], bidderRequest);

      expect(request.method).to.equal('POST');
      expect(request.url).to.equal(ENDPOINT);
      expect(request.options.contentType).to.equal('application/json');
      expect(request.options.withCredentials).to.equal(true);

      const payload = JSON.parse(request.data);
      expect(payload.auctionId).to.equal('auction-1');
      expect(payload.timeout).to.equal(750);
      expect(payload.page.url).to.equal('https://example.com/article');
      expect(payload.ortb2.site.cat).to.deep.equal(['IAB13']);
      expect(payload.ortb2.device.geo.country).to.equal('CA');
      expect(payload.ortb2.user.ext.eids[0].source).to.equal('pubcid.org');
      expect(payload.gdprConsent).to.deep.equal(bidderRequest.gdprConsent);
      expect(payload.uspConsent).to.equal(bidderRequest.uspConsent);
      expect(payload.gppConsent).to.deep.equal(bidderRequest.gppConsent);
      expect(payload.ezoic.formFactorId).to.equal(1);
      expect(payload.ezoic.country).to.equal('CA');
      expect(payload).to.not.have.property('buyeruids');
      expect(payload.imps).to.have.lengthOf(1);
      expect(payload.imps[0].requestId).to.equal(BID_ID);
      expect(payload.imps[0].adUnitCode).to.equal(AD_UNIT_CODE);
      expect(payload.imps[0].sizes[0]).to.deep.equal([300, 250]);
      expect(payload.imps[0].params).to.deep.equal({
        placementType: 'display',
        adPositionType: 5,
        impressionId: 'client-impression-1',
        tap: 'content-slot-client-impression-1',
        adPositionId: 1100,
        publisherProvidedId: 'ppid-from-client',
        googlePageTargeting: {
          AU_SEG: ['AU_SEG_TEST'],
          'li-module-enabled': 't1-e1'
        }
      });
      expect(payload.imps[0].impressionId).to.equal('client-impression-1');
    });

    it('generates and reuses adapter pageview metadata across auctions', function () {
      sinon.stub(Date, 'now').returns(1714752000000);

      const firstRequest = spec.buildRequests([getBidRequest()], getBidderRequest());
      const secondRequest = spec.buildRequests([getBidRequest({ bidId: 'ezoic-bid-2' })], getBidderRequest());
      const firstPayload = JSON.parse(firstRequest.data);
      const secondPayload = JSON.parse(secondRequest.data);

      expect(firstPayload.ezoic.pageviewId).to.be.a('string').and.not.equal('');
      expect(firstPayload.ezoic.pageviewId).to.match(UUID_V4_REGEX);
      expect(firstPayload.ezoic.pageviewId).to.equal(secondPayload.ezoic.pageviewId);
      expect(firstPayload.ezoic.pageviewIdSource).to.equal('adapter_generated');
      expect(firstPayload.ezoic.pageviewEpoch).to.equal(1714752000);
      expect(secondPayload.ezoic.pageviewEpoch).to.equal(1714752000);
    });

    it('prefers core pageViewId and refreshes epoch when it changes', function () {
      sinon.stub(Date, 'now').returns(1714752000000);

      const firstRequest = spec.buildRequests([getBidRequest()], getBidderRequest({
        pageViewId: 'core-pageview-1'
      }));
      const secondRequest = spec.buildRequests([getBidRequest({ bidId: 'ezoic-bid-2' })], getBidderRequest({
        pageViewId: 'core-pageview-1'
      }));
      const firstPayload = JSON.parse(firstRequest.data);
      const secondPayload = JSON.parse(secondRequest.data);

      expect(firstPayload.ezoic.pageviewId).to.equal('core-pageview-1');
      expect(firstPayload.ezoic.pageviewIdSource).to.equal('prebid_core');
      expect(firstPayload.ezoic.pageviewEpoch).to.equal(1714752000);
      expect(secondPayload.ezoic.pageviewId).to.equal('core-pageview-1');
      expect(secondPayload.ezoic.pageviewEpoch).to.equal(1714752000);

      sinon.restore();
      sinon.stub(Date, 'now').returns(1714752600000);

      const thirdRequest = spec.buildRequests([getBidRequest({ bidId: 'ezoic-bid-3' })], getBidderRequest({
        pageViewId: 'core-pageview-2'
      }));
      const thirdPayload = JSON.parse(thirdRequest.data);

      expect(thirdPayload.ezoic.pageviewId).to.equal('core-pageview-2');
      expect(thirdPayload.ezoic.pageviewIdSource).to.equal('prebid_core');
      expect(thirdPayload.ezoic.pageviewEpoch).to.equal(1714752600);
    });

    it('falls back to adapter-generated pageview metadata when core omits pageViewId', function () {
      sinon.stub(Date, 'now').returns(1714752000000);

      const request = spec.buildRequests([getBidRequest()], getBidderRequest());
      const payload = JSON.parse(request.data);

      expect(payload.ezoic.pageviewId).to.match(UUID_V4_REGEX);
      expect(payload.ezoic.pageviewIdSource).to.equal('adapter_generated');
      expect(payload.ezoic.pageviewEpoch).to.equal(1714752000);
    });

    it('passes a single banner size to getFloor', function () {
      const getFloor = sinon.stub().returns({ currency: 'USD', floor: 0.75 });
      const request = spec.buildRequests([getBidRequest({ getFloor })], getBidderRequest());
      const payload = JSON.parse(request.data);

      expect(getFloor.calledOnce).to.equal(true);
      expect(getFloor.firstCall.args[0]).to.deep.equal({
        currency: 'USD',
        mediaType: 'banner',
        size: [300, 250]
      });
      expect(payload.imps[0].floor).to.equal(0.75);
    });

    it('posts video media type details and asks Prebid floors for video size', function () {
      const getFloor = sinon.stub().returns({ currency: 'USD', floor: 1.25 });
      const bid = getVideoBidRequest({ getFloor });

      const request = spec.buildRequests([bid], getBidderRequest());
      const payload = JSON.parse(request.data);

      expect(getFloor.calledOnce).to.equal(true);
      expect(getFloor.firstCall.args[0]).to.deep.equal({
        currency: 'USD',
        mediaType: 'video',
        size: [640, 360]
      });
      expect(payload.imps[0].sizes).to.deep.equal([]);
      expect(payload.imps[0].mediaTypes).to.deep.equal({
        video: bid.mediaTypes.video
      });
      expect(payload.imps[0].floor).to.equal(1.25);
      expect(payload.imps[0].ortb2Imp.video.plcmt).to.equal(1);
    });

    it('posts native media type details and asks Prebid floors for native', function () {
      const getFloor = sinon.stub().returns({ currency: 'USD', floor: 0.95 });
      const bid = getNativeBidRequest({ getFloor });

      const request = spec.buildRequests([bid], getBidderRequest());
      const payload = JSON.parse(request.data);

      expect(getFloor.calledOnce).to.equal(true);
      expect(getFloor.firstCall.args[0]).to.deep.equal({
        currency: 'USD',
        mediaType: 'native',
        size: '*'
      });
      expect(payload.imps[0].sizes).to.deep.equal([]);
      expect(payload.imps[0].mediaTypes).to.deep.equal({
        native: bid.mediaTypes.native
      });
      expect(payload.imps[0].floor).to.equal(0.95);
      expect(payload.imps[0].ortb2Imp.native.request).to.be.a('string');
    });

    it('prefers explicit adapter floor params over Prebid floor module output', function () {
      const getFloor = sinon.stub().returns({ currency: 'USD', floor: 5.15 });
      const request = spec.buildRequests([getBidRequest({
        getFloor,
        params: {
          ...getBidRequest().params,
          floor: 0.4,
          bidfloor: 0.4,
          bidfloorcur: 'USD'
        }
      })], getBidderRequest());
      const payload = JSON.parse(request.data);

      expect(payload.imps[0].params.floor).to.equal(0.4);
      expect(payload.imps[0].params.bidfloor).to.equal(0.4);
      expect(payload.imps[0].floor).to.equal(0.4);
      expect(getFloor.called).to.equal(false);
    });

    it('returns undefined when there are no valid bid requests', function () {
      expect(spec.buildRequests([], getBidderRequest())).to.equal(undefined);
    });

    it('attaches the validBidRequests as bidderRequest.bids on the built request', function () {
      const bid = getBidRequest();
      const request = spec.buildRequests([bid], getBidderRequest());

      expect(request.bidderRequest.bids).to.deep.equal([bid]);
    });
  });

  describe('interpretResponse', function () {
    it('returns no bids for an explicit no-bid response', function () {
      const result = spec.interpretResponse({ body: { nobid: true } }, {
        bidderRequest: {
          bids: [getBidRequest()]
        }
      });

      expect(result).to.deep.equal([]);
    });

    it('returns no bids when the response body is empty', function () {
      const result = spec.interpretResponse({}, {
        bidderRequest: {
          bids: [getBidRequest()]
        }
      });

      expect(result).to.deep.equal([]);
    });

    it('normalizes a bid into a Prebid banner bid response', function () {
      const result = spec.interpretResponse({
        body: {
          bids: [{
            requestId: BID_ID,
            cpm: 1.23,
            currency: 'USD',
            width: 300,
            height: 250,
            creativeId: 'creative-1',
            ad: '<div>ad</div>',
            dealId: 'deal-1',
            meta: {
              advertiserDomains: ['advertiser.example']
            },
            ttl: 120,
            netRevenue: true,
            nurl: 'https://g.ezoic.net/win',
          }]
        }
      }, {
        bidderRequest: {
          bids: [getBidRequest()]
        }
      });

      expect(result).to.have.lengthOf(1);
      expect(result[0]).to.include({
        requestId: BID_ID,
        cpm: 1.23,
        currency: 'USD',
        width: 300,
        height: 250,
        creativeId: 'creative-1',
        ad: '<div>ad</div>',
        dealId: 'deal-1',
        ttl: 120,
        netRevenue: true,
        mediaType: 'banner',
      });
      expect(result[0].nurl).to.be.undefined;
      expect(result[0].meta.advertiserDomains).to.deep.equal(['advertiser.example']);
    });

    it('defaults meta.advertiserDomains to an empty array when the server omits meta', function () {
      const result = spec.interpretResponse({
        body: {
          bids: [{
            requestId: BID_ID,
            cpm: 1.23,
            currency: 'USD',
            width: 300,
            height: 250,
            creativeId: 'creative-1',
            ad: '<div>ad</div>',
          }]
        }
      }, {
        bidderRequest: {
          bids: [getBidRequest()]
        }
      });

      expect(result).to.have.lengthOf(1);
      expect(result[0].meta).to.deep.equal({ advertiserDomains: [] });
    });

    it('defaults meta.advertiserDomains to an empty array when the server sends meta without it', function () {
      const result = spec.interpretResponse({
        body: {
          bids: [{
            requestId: BID_ID,
            cpm: 1.23,
            currency: 'USD',
            width: 300,
            height: 250,
            creativeId: 'creative-1',
            ad: '<div>ad</div>',
            meta: {
              mediaType: 'banner'
            },
          }]
        }
      }, {
        bidderRequest: {
          bids: [getBidRequest()]
        }
      });

      expect(result).to.have.lengthOf(1);
      expect(result[0].meta).to.deep.equal({ mediaType: 'banner', advertiserDomains: [] });
    });

    it('normalizes explicit video VAST responses into Prebid video bids', function () {
      const result = spec.interpretResponse({
        body: {
          bids: [{
            requestId: BID_ID,
            cpm: 3.21,
            currency: 'USD',
            width: 640,
            height: 360,
            creativeId: 'creative-video',
            mediaType: 'video',
            vastUrl: 'https://vastproxy.ezoic.net/vastadapter/signed-video-token',
            ttl: 120,
            netRevenue: true,
          }]
        }
      }, {
        bidderRequest: {
          bids: [getVideoBidRequest()]
        }
      });

      expect(result).to.have.lengthOf(1);
      expect(result[0]).to.include({
        requestId: BID_ID,
        cpm: 3.21,
        currency: 'USD',
        width: 640,
        height: 360,
        creativeId: 'creative-video',
        mediaType: 'video',
        vastUrl: 'https://vastproxy.ezoic.net/vastadapter/signed-video-token',
        ttl: 120,
        netRevenue: true,
      });
      expect(result[0].ad).to.equal(undefined);
    });

    it('drops explicit video responses for banner-only requests', function () {
      const result = spec.interpretResponse({
        body: {
          bids: [{
            requestId: BID_ID,
            cpm: 3.21,
            currency: 'USD',
            width: 640,
            height: 360,
            creativeId: 'creative-video',
            mediaType: 'video',
            vastUrl: 'https://vastproxy.ezoic.net/vastadapter/signed-video-token',
            ad: '<div>video fallback markup</div>'
          }]
        }
      }, {
        bidderRequest: {
          bids: [getBidRequest()]
        }
      });

      expect(result).to.deep.equal([]);
    });

    it('normalizes outstream VAST URL responses when a publisher renderer is present', function () {
      const result = spec.interpretResponse({
        body: {
          bids: [getOutstreamVastResponse({
            width: 640,
            height: 360,
          })]
        }
      }, {
        bidderRequest: {
          bids: [getOutstreamBidRequest({
            renderer: {
              url: 'https://example.com/outstream.js',
              render: () => {},
            }
          })]
        }
      });

      expect(result).to.have.lengthOf(1);
      expect(result[0]).to.include({
        requestId: BID_ID,
        cpm: 3.21,
        currency: 'USD',
        width: 640,
        height: 360,
        creativeId: 'creative-video',
        mediaType: 'video',
        vastUrl: 'https://vastproxy.ezoic.net/vastadapter/signed-video-token'
      });
      expect(result[0].ad).to.equal(undefined);
    });

    it('drops outstream video bids when no publisher renderer is present', function () {
      const result = spec.interpretResponse({
        body: {
          bids: [getOutstreamVastResponse({
            width: 640,
            height: 360,
          })]
        }
      }, {
        bidderRequest: {
          bids: [getOutstreamBidRequest()]
        }
      });

      expect(result).to.deep.equal([]);
    });

    it('keeps outstream video bids when mediaTypes.video defines a renderer', function () {
      const result = spec.interpretResponse({
        body: {
          bids: [getOutstreamVastResponse({
            width: 640,
            height: 360,
          })]
        }
      }, {
        bidderRequest: {
          bids: [getOutstreamBidRequest({
            mediaTypes: {
              video: {
                context: 'outstream',
                playerSize: [[640, 360]],
                plcmt: 3,
                renderer: {
                  url: 'https://example.com/outstream.js',
                  render: () => {},
                }
              }
            }
          })]
        }
      });

      expect(result).to.have.lengthOf(1);
      expect(result[0].mediaType).to.equal('video');
    });

    it('drops bids with non-numeric or negative cpm values', function () {
      const request = {
        bidderRequest: {
          bids: [getBidRequest()]
        }
      };
      const baseBid = {
        requestId: BID_ID,
        currency: 'USD',
        width: 300,
        height: 250,
        creativeId: 'creative-1',
        ad: '<div>ad</div>',
      };

      expect(spec.interpretResponse({
        body: { bids: [{ ...baseBid, cpm: 'not-a-number' }] }
      }, request)).to.deep.equal([]);

      expect(spec.interpretResponse({
        body: { bids: [{ ...baseBid, cpm: -0.01 }] }
      }, request)).to.deep.equal([]);

      expect(spec.interpretResponse({
        body: { bids: [{ ...baseBid, cpm: 0 }] }
      }, request)).to.have.lengthOf(1);
    });

    it('uses video playerSize for multiformat video bids missing width and height', function () {
      const result = spec.interpretResponse({
        body: {
          bids: [{
            requestId: BID_ID,
            cpm: 2.5,
            currency: 'USD',
            creativeId: 'creative-video',
            mediaType: 'video',
            vastUrl: 'https://vastproxy.ezoic.net/vastadapter/signed-video-token'
          }]
        }
      }, {
        bidderRequest: {
          bids: [getMultiformatBidRequest()]
        }
      });

      expect(result).to.have.lengthOf(1);
      expect(result[0].width).to.equal(640);
      expect(result[0].height).to.equal(360);
    });

    it('uses banner size for multiformat banner bids missing width and height', function () {
      const result = spec.interpretResponse({
        body: {
          bids: [{
            requestId: BID_ID,
            cpm: 1.5,
            currency: 'USD',
            creativeId: 'creative-banner',
            ad: '<div>ad</div>'
          }]
        }
      }, {
        bidderRequest: {
          bids: [getMultiformatBidRequest()]
        }
      });

      expect(result).to.have.lengthOf(1);
      expect(result[0].width).to.equal(300);
      expect(result[0].height).to.equal(250);
      expect(result[0].mediaType).to.equal('banner');
    });

    it('normalizes native ORTB responses into Prebid native bids', function () {
      const nativeResponse = {
        ortb: {
          link: {
            url: 'https://advertiser.example/landing',
            clicktrackers: ['https://tracker.example/click']
          },
          assets: [{
            id: 1,
            title: { text: 'Native title' }
          }, {
            id: 2,
            img: { url: 'https://cdn.example/image.jpg', w: 300, h: 250 }
          }],
          eventtrackers: [{ event: 1, method: 1, url: 'https://tracker.example/imp' }]
        }
      };
      const result = spec.interpretResponse({
        body: {
          bids: [{
            requestId: BID_ID,
            cpm: 2.34,
            currency: 'USD',
            creativeId: 'creative-native',
            mediaType: 'native',
            native: nativeResponse,
            ttl: 120,
            netRevenue: true,
          }]
        }
      }, {
        bidderRequest: {
          bids: [getNativeBidRequest()]
        }
      });

      expect(result).to.have.lengthOf(1);
      expect(result[0]).to.include({
        requestId: BID_ID,
        cpm: 2.34,
        currency: 'USD',
        creativeId: 'creative-native',
        mediaType: 'native',
        ttl: 120,
        netRevenue: true,
      });
      expect(result[0].native).to.deep.equal(nativeResponse);
      expect(result[0].ad).to.equal(undefined);
      expect(result[0].width).to.equal(undefined);
      expect(result[0].height).to.equal(undefined);
    });

    it('drops native responses for banner-only requests', function () {
      const result = spec.interpretResponse({
        body: {
          bids: [{
            requestId: BID_ID,
            cpm: 2.34,
            currency: 'USD',
            creativeId: 'creative-native',
            mediaType: 'native',
            native: {
              ortb: {
                link: { url: 'https://advertiser.example/landing' },
                assets: [{ id: 1, title: { text: 'Native title' } }]
              }
            }
          }]
        }
      }, {
        bidderRequest: {
          bids: [getBidRequest()]
        }
      });

      expect(result).to.deep.equal([]);
    });

    it('drops bids that cannot be matched to an original request', function () {
      const result = spec.interpretResponse({
        body: {
          bids: [{
            requestId: 'unknown',
            cpm: 1.23,
            currency: 'USD',
            width: 300,
            height: 250,
            creativeId: 'creative-1',
            ad: '<div>ad</div>'
          }]
        }
      }, {
        bidderRequest: {
          bids: [getBidRequest()]
        }
      });

      expect(result).to.deep.equal([]);
    });

    it('drops bids missing required fields (cpm, creativeId)', function () {
      const result = spec.interpretResponse({
        body: {
          bids: [{
            requestId: BID_ID,
            width: 300,
            height: 250,
            ad: '<div>ad</div>'
          }]
        }
      }, {
        bidderRequest: {
          bids: [getBidRequest()]
        }
      });

      expect(result).to.deep.equal([]);
    });
  });

  describe('getUserSyncs', function () {
    it('returns no syncs when iframe syncing is disabled', function () {
      expect(spec.getUserSyncs({ iframeEnabled: false }, [])).to.deep.equal([]);
    });

    it('returns no syncs when syncOptions is missing', function () {
      expect(spec.getUserSyncs(undefined, [])).to.deep.equal([]);
    });

    it('returns a single iframe sync at the fixed usersync-frame URL when iframe syncing is enabled', function () {
      const syncs = spec.getUserSyncs({ iframeEnabled: true }, []);

      expect(syncs).to.have.lengthOf(1);
      expect(syncs[0].type).to.equal('iframe');
      expect(syncs[0].url.indexOf(SYNC_URL)).to.equal(0);
    });

    it('propagates GDPR consent onto the sync URL', function () {
      const syncs = spec.getUserSyncs(
        { iframeEnabled: true },
        [],
        { gdprApplies: true, consentString: 'CONSENT_STRING' }
      );

      const url = new URL(syncs[0].url);
      expect(url.searchParams.get('gdpr')).to.equal('1');
      expect(url.searchParams.get('gdpr_consent')).to.equal('CONSENT_STRING');
    });

    it('sends gdpr=0 and an empty gdpr_consent when GDPR does not apply or consent is missing', function () {
      const syncs = spec.getUserSyncs(
        { iframeEnabled: true },
        [],
        { gdprApplies: false }
      );

      const url = new URL(syncs[0].url);
      expect(url.searchParams.get('gdpr')).to.equal('0');
      expect(url.searchParams.get('gdpr_consent')).to.equal('');
    });

    it('sends gdpr=0 and empty consent when gdprConsent is not provided at all', function () {
      const syncs = spec.getUserSyncs({ iframeEnabled: true }, []);

      const url = new URL(syncs[0].url);
      expect(url.searchParams.get('gdpr')).to.equal('0');
      expect(url.searchParams.get('gdpr_consent')).to.equal('');
    });

    it('propagates GPP consent onto the sync URL', function () {
      const syncs = spec.getUserSyncs(
        { iframeEnabled: true },
        [],
        undefined,
        undefined,
        { gppString: 'GPP_STRING', applicableSections: [7, 8] }
      );

      const url = new URL(syncs[0].url);
      expect(url.searchParams.get('gpp')).to.equal('GPP_STRING');
      expect(url.searchParams.get('gpp_sid')).to.equal('7,8');
    });

    it('sends empty gpp/gpp_sid when gppConsent is not provided', function () {
      const syncs = spec.getUserSyncs({ iframeEnabled: true }, []);

      const url = new URL(syncs[0].url);
      expect(url.searchParams.get('gpp')).to.equal('');
      expect(url.searchParams.get('gpp_sid')).to.equal('');
    });

    it('propagates USP (CCPA) consent onto the sync URL', function () {
      const syncs = spec.getUserSyncs(
        { iframeEnabled: true },
        [],
        undefined,
        '1YNN'
      );

      const url = new URL(syncs[0].url);
      expect(url.searchParams.get('us_privacy')).to.equal('1YNN');
    });

    it('sends an empty us_privacy when uspConsent is not provided', function () {
      const syncs = spec.getUserSyncs({ iframeEnabled: true }, []);

      const url = new URL(syncs[0].url);
      expect(url.searchParams.get('us_privacy')).to.equal('');
    });

    it('does not include a redirect ("r") param', function () {
      const syncs = spec.getUserSyncs({ iframeEnabled: true }, []);

      const url = new URL(syncs[0].url);
      expect(url.searchParams.has('r')).to.equal(false);
    });
  });
});
