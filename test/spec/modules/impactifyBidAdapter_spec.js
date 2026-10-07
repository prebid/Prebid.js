import { expect } from 'chai';
import { spec, STORAGE } from 'modules/impactifyBidAdapter.js';
import * as utils from 'src/utils.js';
import * as percentInView from 'libraries/percentInView/percentInView.js';
import sinon from 'sinon';
import { getGlobal } from '../../../src/prebidGlobal.js';

const DEFAULT_CURRENCY = 'USD';
const DEFAULT_VIDEO_WIDTH = 640;
const DEFAULT_VIDEO_HEIGHT = 360;
const ORIGIN = 'https://sonic.impactify.media';

const AUCTIONURI = '/bidder';

var gdprData = {
  'consentString': 'BOh7mtYOh7mtYAcABBENCU-AAAAncgPIXJiiAoao0PxBFkgCAC8ACIAAQAQQAAIAAAIAAAhBGAAAQAQAEQgAAAAAAABAAAAAAAAAAAAAAACAAAAAAAACgAAAAABAAAAQAAAAAAA',
  'gdprApplies': true
};

describe('ImpactifyAdapter', function () {
  let sandbox;

  beforeEach(function () {
    getGlobal().bidderSettings = {
      impactify: {
        storageAllowed: true
      }
    };
    sandbox = sinon.createSandbox();
    sandbox.stub(document.body, 'appendChild');
    sandbox.stub(STORAGE, 'getDataFromLocalStorage');
    sandbox.stub(STORAGE, 'localStorageIsEnabled');
  });

  afterEach(function () {
    getGlobal().bidderSettings = {};
    sandbox.restore();
  });

  describe('isBidRequestValid', function () {
    const validBids = [
      {
        bidder: 'impactify',
        params: {
          appId: 'example.com',
          format: 'screen',
          style: 'inline'
        }
      },
      {
        bidder: 'impactify',
        params: {
          appId: 'example.com',
          format: 'display',
          style: 'static'
        }
      }
    ];

    it('should return true when required params found', function () {
      expect(spec.isBidRequestValid(validBids[0])).to.equal(true);
      expect(spec.isBidRequestValid(validBids[1])).to.equal(true);
    });

    it('should return false when required params are not passed', function () {
      const bid = Object.assign({}, validBids[0]);
      delete bid.params;
      bid.params = {};
      expect(spec.isBidRequestValid(bid)).to.equal(false);

      const bid2 = Object.assign({}, validBids[1]);
      delete bid2.params;
      bid2.params = {};
      expect(spec.isBidRequestValid(bid2)).to.equal(false);
    });

    it('should return false when format is not equals to screen or display', () => {
      const bid = utils.deepClone(validBids[0]);
      if (bid.params.format !== 'screen' && bid.params.format !== 'display') {
        expect(spec.isBidRequestValid(bid)).to.equal(false);
      }

      const bid2 = utils.deepClone(validBids[1]);
      if (bid2.params.format !== 'screen' && bid2.params.format !== 'display') {
        expect(spec.isBidRequestValid(bid2)).to.equal(false);
      }
    });

    it('should return false when style is missing', () => {
      const bid = utils.deepClone(validBids[0]);
      delete bid.params.style;

      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should return false when style is not a string', () => {
      const bid = utils.deepClone(validBids[0]);

      bid.params.style = 123;
      expect(spec.isBidRequestValid(bid)).to.equal(false);

      bid.params.style = false;
      expect(spec.isBidRequestValid(bid)).to.equal(false);

      bid.params.style = void (0);
      expect(spec.isBidRequestValid(bid)).to.equal(false);

      bid.params.style = {};
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });
  });
  describe('buildRequests', function () {
    const defaultVideoBidRequests = [
      {
        bidder: 'impactify',
        params: {
          appId: '1',
          format: 'screen',
          style: 'inline'
        },
        mediaTypes: {
          video: {
            context: 'instream'
          }
        },
        adUnitCode: 'adunit-code',
        sizes: [[DEFAULT_VIDEO_WIDTH, DEFAULT_VIDEO_HEIGHT]],
        bidId: '123456789',
        bidderRequestId: '987654321',
        auctionId: '19ab94a9-b0d7-4ed7-9f80-ad0c033cf1b1',
        transactionId: 'f7b2c372-7a7b-11eb-9439-0242ac130002',
        userId: {
          pubcid: '87a0327b-851c-4bb3-a925-0c7be94548f5'
        },
        userIdAsEids: [
          {
            source: 'pubcid.org',
            uids: [
              {
                id: '87a0327b-851c-4bb3-a925-0c7be94548f5',
                atype: 1
              }
            ]
          }
        ]
      }
    ];
    const defaultVideoBidderRequest = {
      bidderRequestId: '98845765110',
      auctionId: '165410516454',
      bidderCode: 'impactify',
      bids: [
        {
          ...defaultVideoBidRequests[0]
        }
      ],
      refererInfo: {
        referer: 'https://impactify.io'
      }
    };

    let videoBidRequests;
    let videoBidderRequest;

    beforeEach(function () {
      videoBidRequests = utils.deepClone(defaultVideoBidRequests);
      videoBidderRequest = utils.deepClone(defaultVideoBidderRequest);
    });

    function buildImpression(bid = videoBidRequests[0]) {
      return JSON.parse(spec.buildRequests([bid], videoBidderRequest).data).imp[0];
    }

    it('should pass bidfloor', function () {
      videoBidRequests[0].getFloor = function () {
        return {
          currency: 'USD',
          floor: 1.23,
        };
      };

      const res = spec.buildRequests(videoBidRequests, videoBidderRequest);
      const resData = JSON.parse(res.data);
      expect(resData.imp[0].bidfloor).to.equal(1.23);
    });

    it('sends video bid request to ENDPOINT via POST', function () {
      const request = spec.buildRequests(videoBidRequests, videoBidderRequest);

      expect(request.url).to.equal(ORIGIN + AUCTIONURI);
      expect(request.method).to.equal('POST');
    });

    [
      { timeout: undefined, expected: 400 },
      { timeout: 0, expected: 400 },
      { timeout: 200, expected: 400 },
      { timeout: 400, expected: 400 },
      { timeout: 500, expected: 500 },
      { timeout: 2500, expected: 2500 }
    ].forEach(({ timeout, expected }) => {
      it(`should send tmax ${expected} when bidderRequest.timeout is ${timeout}`, function () {
        const request = spec.buildRequests(videoBidRequests, { ...videoBidderRequest, timeout });

        expect(JSON.parse(request.data).tmax).to.equal(expected);
      });
    });

    it('should default tmax to 400 when bidderRequest is missing', function () {
      const request = spec.buildRequests(videoBidRequests);

      expect(JSON.parse(request.data).tmax).to.equal(400);
    });

    it('should set instream context and player size for video imps', function () {
      const request = spec.buildRequests(videoBidRequests, videoBidderRequest);
      const payload = JSON.parse(request.data);

      expect(payload.imp[0].video.context).to.equal('instream');
      expect(payload.imp[0].video.playerSize).to.deep.equal([DEFAULT_VIDEO_WIDTH, DEFAULT_VIDEO_HEIGHT]);
      expect(payload.imp[0]).to.not.have.property('banner');
    });

    [
      [[300, 250]],
      [[728, 90], [300, 250], [970, 250]]
    ].forEach((sizes) => {
      it(`should map ${sizes.length} banner size(s) in order without adding video`, function () {
        const bid = videoBidRequests[0];
        bid.mediaTypes = { banner: { sizes } };
        bid.params.format = 'display';

        const imp = buildImpression();

        expect(imp.id).to.equal(bid.bidId);
        expect(imp.banner).to.deep.equal({
          id: 'banner-' + bid.bidId,
          format: sizes.map(([w, h]) => ({ w, h }))
        });
        expect(imp).to.not.have.property('video');
      });
    });

    it('should map both banner and video on a multiformat impression', function () {
      const bid = videoBidRequests[0];
      bid.mediaTypes.banner = { sizes: [[300, 250], [728, 90]] };
      bid.mediaTypes.video.playerSize = [854, 480];

      const imp = buildImpression();

      expect(imp.banner).to.deep.equal({
        id: 'banner-' + bid.bidId,
        format: [{ w: 300, h: 250 }, { w: 728, h: 90 }]
      });
      expect(imp.video).to.deep.equal({ context: 'instream', playerSize: [854, 480] });
    });

    it('should pass supported video fields including zero values and ignore unsupported fields', function () {
      const video = {
        context: 'instream',
        playerSize: [854, 480],
        minduration: 0,
        maxduration: 60,
        api: [2, 7],
        mimes: ['video/mp4'],
        placement: 1,
        plcmt: 1,
        protocols: [2, 3],
        playbackmethod: [2],
        pos: 0,
        startdelay: 0,
        skip: 0,
        skipmin: 0,
        skipafter: 0,
        minbitrate: 0,
        maxbitrate: 2000
      };
      videoBidRequests[0].mediaTypes.video = { ...video, unsupported: 'ignored' };

      expect(buildImpression().video).to.deep.equal(video);
    });

    it('should keep banner format empty when sizes are missing', function () {
      videoBidRequests[0].mediaTypes = { banner: {} };

      expect(buildImpression().banner).to.deep.equal({
        id: 'banner-' + videoBidRequests[0].bidId,
        format: []
      });
    });

    it('should skip incomplete banner sizes while retaining valid sizes', function () {
      videoBidRequests[0].mediaTypes = {
        banner: { sizes: [[728, 90], [300], null, '300x250', [300, 250]] }
      };

      expect(buildImpression().banner.format).to.deep.equal([{ w: 728, h: 90 }, { w: 300, h: 250 }]);
    });

    [undefined, {}].forEach((mediaTypes) => {
      it(`should omit media objects when mediaTypes is ${JSON.stringify(mediaTypes)}`, function () {
        videoBidRequests[0].mediaTypes = mediaTypes;

        const imp = buildImpression();

        expect(imp.id).to.equal(videoBidRequests[0].bidId);
        expect(imp).to.not.have.property('banner');
        expect(imp).to.not.have.property('video');
      });
    });

    it('should use the first bid size when video playerSize is missing', function () {
      videoBidRequests[0].sizes = [[800, 450], [640, 360]];

      expect(buildImpression().video.playerSize).to.deep.equal([800, 450]);
    });

    [undefined, []].forEach((sizes) => {
      it(`should default video size and context when optional video fields and sizes ${JSON.stringify(sizes)} are absent`, function () {
        videoBidRequests[0].mediaTypes.video = {};
        videoBidRequests[0].sizes = sizes;

        expect(buildImpression().video).to.deep.equal({
          playerSize: [DEFAULT_VIDEO_WIDTH, DEFAULT_VIDEO_HEIGHT],
          context: 'outstream'
        });
      });
    });

    it('should preserve an explicit outstream context', function () {
      videoBidRequests[0].mediaTypes.video.context = 'outstream';

      expect(buildImpression().video.context).to.equal('outstream');
    });

    describe('viewability', function () {
      let element;
      let lookup;
      let measurable;
      let measure;
      let topWindow;

      beforeEach(function () {
        element = document.createElement('div');
        topWindow = {};
        videoBidRequests[0].adUnitCode = 'impactify-viewability-test';
        videoBidRequests[0].mediaTypes = { banner: { sizes: [[300, 250], [728, 90]] } };
        lookup = sandbox.stub(document, 'getElementById').returns(null);
        lookup.withArgs('impactify-viewability-test').returns(element);
        measurable = sandbox.stub(percentInView, 'isViewabilityMeasurable').returns(true);
        measure = sandbox.stub(percentInView, 'getViewability').returns(100);
        sandbox.stub(utils, 'getWindowTop').returns(topWindow);
      });

      [
        { state: 'fully in view', measured: 100, expected: 100 },
        { state: 'partially in view', measured: 42.6, expected: 43 },
        { state: 'out of view', measured: 0, expected: 0 }
      ].forEach(({ state, measured, expected }) => {
        it(`should serialize viewability when the element is ${state}`, function () {
          measure.returns(measured);

          const imp = buildImpression();

          expect(imp.ext.impactify.viewability).to.equal(expected);
          sinon.assert.calledOnceWithExactly(lookup, 'impactify-viewability-test');
          sinon.assert.calledOnceWithExactly(measurable, element);
          sinon.assert.calledOnceWithExactly(measure, element, topWindow, { w: 300, h: 250 });
        });
      });

      it('should measure video using its player dimensions', function () {
        videoBidRequests[0].mediaTypes = { video: { playerSize: [[854, 480]] } };

        expect(buildImpression().ext.impactify.viewability).to.equal(100);
        sinon.assert.calledOnceWithExactly(measure, element, topWindow, { w: 854, h: 480 });
      });

      it('should use zero dimensions when media sizes are missing', function () {
        delete videoBidRequests[0].mediaTypes;

        expect(buildImpression().ext.impactify.viewability).to.equal(100);
        sinon.assert.calledOnceWithExactly(measure, element, topWindow, { w: 0, h: 0 });
      });

      it('should preserve the impression and omit viewability when the element is not found', function () {
        lookup.withArgs('impactify-viewability-test').returns(null);
        let imp;

        expect(() => { imp = buildImpression(); }).to.not.throw();
        expect(imp.id).to.equal(videoBidRequests[0].bidId);
        expect(imp.banner.format).to.deep.equal([{ w: 300, h: 250 }, { w: 728, h: 90 }]);
        expect(imp.ext.impactify).to.not.have.property('viewability');
        sinon.assert.notCalled(measurable);
        sinon.assert.notCalled(measure);
      });

      [
        { failure: 'element is unmeasurable', setup: () => measurable.returns(false), measures: false },
        { failure: 'lookup is unavailable', setup: () => lookup.value(undefined), measures: false },
        {
          failure: 'lookup throws',
          setup: () => lookup.withArgs('impactify-viewability-test').throws(new Error('DOM lookup failed')),
          measures: false
        },
        { failure: 'measurement throws', setup: () => measure.throws(new Error('DOM measurement failed')), measures: true }
      ].forEach(({ failure, setup, measures }) => {
        it(`should preserve the impression with na viewability when ${failure}`, function () {
          setup();
          let imp;

          expect(() => { imp = buildImpression(); }).to.not.throw();
          expect(imp.id).to.equal(videoBidRequests[0].bidId);
          expect(imp.banner.format).to.deep.equal([{ w: 300, h: 250 }, { w: 728, h: 90 }]);
          expect(imp.ext.impactify.viewability).to.equal('na');
          if (measures) {
            sinon.assert.calledOnce(measure);
          } else {
            sinon.assert.notCalled(measure);
          }
        });
      });

      it('should continue mapping subsequent impressions after a measurement failure', function () {
        measure.onFirstCall().throws(new Error('DOM measurement failed'));
        const secondBid = utils.deepClone(videoBidRequests[0]);
        secondBid.bidId = 'second-bid';
        secondBid.adUnitCode = 'second-impactify-slot';
        lookup.withArgs(secondBid.adUnitCode).returns(document.createElement('div'));

        const request = spec.buildRequests([...videoBidRequests, secondBid], videoBidderRequest);
        const { imp } = JSON.parse(request.data);

        expect(imp).to.have.length(2);
        expect(imp[0].ext.impactify.viewability).to.equal('na');
        expect(imp[1].id).to.equal('second-bid');
        expect(imp[1].ext.impactify.viewability).to.equal(100);
        expect(imp[1].banner.format).to.deep.equal([{ w: 300, h: 250 }, { w: 728, h: 90 }]);
        sinon.assert.calledTwice(measure);
      });
    });

    it('should pass supported render fields in imp ext', function () {
      videoBidRequests[0].params.render = {
        top: 0,
        bottom: 0,
        align: 'right',
        container: '#my-container',
        expandAd: true,
        location: 'bottom-left',
        onAdEventName: 'on-ad-event',
        onNoAdEventName: 'on-noad-event'
      };

      const request = spec.buildRequests(videoBidRequests, videoBidderRequest);
      const requestData = JSON.parse(request.data);

      expect(requestData.imp[0].ext.impactify.render).to.deep.equal(videoBidRequests[0].params.render);
    });

    it('should ignore unsupported render fields and types', function () {
      videoBidRequests[0].params.render = {
        top: '0',
        bottom: 0,
        align: 'right',
        container: 123,
        expandAd: true,
        location: 'bottom-left',
        onAdEventName: 'on-ad-event',
        onNoAdEventName: false,
        foo: 'bar'
      };

      const request = spec.buildRequests(videoBidRequests, videoBidderRequest);
      const requestData = JSON.parse(request.data);

      expect(requestData.imp[0].ext.impactify.render).to.deep.equal({
        bottom: 0,
        align: 'right',
        expandAd: true,
        location: 'bottom-left',
        onAdEventName: 'on-ad-event'
      });
    });

    it('should include schain, eids, gdpr and usp in ortb request', function () {
      const bid = {
        bidId: '1',
        adUnitCode: 'adunit-code',
        params: {
          appId: 'example.com',
          style: 'inline',
          accountId: 'pub-1'
        },
        mediaTypes: {
          banner: {
            sizes: [[300, 250]]
          }
        },
        ortb2: {
          source: {
            ext: {
              schain: { ver: '1.0', complete: 1, nodes: [] }
            }
          }
        },
        userIdAsEids: [{ source: 'test.com', uids: [{ id: 'abc', atype: 1 }] }]
      };

      const bidderRequest = {
        bidderRequestId: 'req-1',
        refererInfo: { page: 'https://publisher.com/page' },
        gdprConsent: { gdprApplies: true, consentString: 'consent123' },
        uspConsent: '1YNN'
      };

      const request = JSON.parse(spec.buildRequests([bid], bidderRequest).data);

      expect(request.source.ext.schain).to.deep.equal(bid.ortb2.source.ext.schain);
      expect(request.user.ext.eids).to.deep.equal(bid.userIdAsEids);
      expect(request.user.ext.consent).to.equal('consent123');
      expect(request.regs.ext.gdpr).to.equal(1);
      expect(request.regs.ext.us_privacy).to.equal('1YNN');
    });
  });
  describe('interpretResponse', function () {
    it('should get correct bid response', function () {
      const response = {
        id: '19ab94a9-b0d7-4ed7-9f80-ad0c033cf1b1',
        seatbid: [
          {
            bid: [
              {
                id: '65820304700829014',
                impid: '462c08f20d428',
                price: 3.40,
                mtype: 2,
                adm: '<script type="text/javascript" src="https://ad.impactify.io/static/ad/tag.js"></script>',
                adid: '97517771',
                iurl: 'https://fra1-ib.adnxs.com/cr?id=97517771',
                cid: '9325',
                crid: '97517771',
                w: 1,
                h: 1,
                adomain: ['testdomain.com'],
                ext: {
                  prebid: {
                    type: 'video'
                  },
                  bidder: {
                    prebid: {
                      type: 'video',
                      video: {
                        duration: 30,
                        primary_category: ''
                      }
                    },
                    bidder: {
                      appnexus: {
                        brand_id: 182979,
                        auction_id: '8657683934873599656',
                        bidder_id: 2,
                        bid_ad_type: 1,
                        creative_info: {
                          video: {
                            duration: 30,
                            mimes: [
                              'video/x-flv',
                              'video/mp4',
                              'video/webm'
                            ]
                          }
                        }
                      }
                    }
                  }
                }
              }
            ],
            seat: 'impactify'
          }
        ],
        cur: DEFAULT_CURRENCY,
        ext: {
          responsetimemillis: {
            impactify: 114
          },
          prebid: {
            auctiontimestamp: 1614587024591
          }
        }
      };
      const bidderRequest = {
        bids: [
          {
            bidId: '462c08f20d428',
            adUnitCode: '/19968336/header-bid-tag-1',
            auctionId: '19ab94a9-b0d7-4ed7-9f80-ad0c033cf1b1',
            bidder: 'impactify',
            sizes: [[DEFAULT_VIDEO_WIDTH, DEFAULT_VIDEO_HEIGHT]],
            mediaTypes: {
              video: {
                context: 'outstream'
              }
            }
          },
        ]
      };

      const expectedResponse = [
        {
          id: '65820304700829014',
          requestId: '462c08f20d428',
          cpm: 3.40,
          currency: DEFAULT_CURRENCY,
          netRevenue: true,
          ad: '<script type="text/javascript" src="https://ad.impactify.io/static/ad/tag.js"></script>',
          width: 1,
          height: 1,
          mediaType: 'video',
          meta: { advertiserDomains: ['testdomain.com'] },
          ttl: 300,
          creativeId: '97517771'
        }
      ];
      const result = spec.interpretResponse({ body: response }, bidderRequest);
      expect(result).to.deep.equal(expectedResponse);
    });

    it('should map player responses to video bids', function () {
      const bidRequest = {
        data: JSON.stringify({
          imp: [{
            id: 'imp-1',
            ext: {
              impactify: {
                format: 'player'
              }
            }
          }]
        })
      };

      const serverResponse = {
        body: {
          cur: 'USD',
          seatbid: [{
            bid: [{
              id: 'bid-1',
              impid: 'imp-1',
              price: 2.5,
              mtype: 2,
              ext: {
                vast_url: 'https://example.com/vast.xml'
              },
              adm: '<VAST>fallback</VAST>',
              crid: 'creative-1',
              adomain: ['advertiser.com']
            }]
          }]
        }
      };

      const result = spec.interpretResponse(serverResponse, bidRequest);

      expect(result).to.deep.equal([{
        id: 'bid-1',
        requestId: 'imp-1',
        cpm: 2.5,
        currency: 'USD',
        netRevenue: true,
        width: 0,
        height: 0,
        ttl: 300,
        creativeId: 'creative-1',
        mediaType: 'video',
        meta: { advertiserDomains: ['advertiser.com'] },
        vastUrl: 'https://example.com/vast.xml',
        vastXml: '<VAST>fallback</VAST>'
      }]);
    });

    it('should map banner responses to banner bids', function () {
      const bidRequest = {
        data: JSON.stringify({
          imp: [{
            id: 'imp-banner-1',
            ext: {
              impactify: {
                format: 'display'
              }
            }
          }]
        })
      };

      const serverResponse = {
        body: {
          cur: 'EUR',
          seatbid: [{
            bid: [{
              id: 'bid-banner-1',
              impid: 'imp-banner-1',
              price: 1.75,
              mtype: 1,
              adm: '<div>banner creative</div>',
              crid: 'creative-banner-1',
              w: 300,
              h: 250,
              adomain: ['advertiser.com']
            }]
          }]
        }
      };

      const result = spec.interpretResponse(serverResponse, bidRequest);

      expect(result).to.deep.equal([{
        id: 'bid-banner-1',
        requestId: 'imp-banner-1',
        cpm: 1.75,
        currency: 'EUR',
        netRevenue: true,
        width: 300,
        height: 250,
        ttl: 300,
        creativeId: 'creative-banner-1',
        mediaType: 'banner',
        meta: { advertiserDomains: ['advertiser.com'] },
        ad: '<div>banner creative</div>'
      }]);
    });

    [
      { name: 'banner impression', impression: { banner: {} }, mediaType: 'banner' },
      { name: 'video impression', impression: { video: {} }, mediaType: 'video' },
      { name: 'player impression', impression: { ext: { impactify: { format: 'player' } } }, mediaType: 'video' },
      { name: 'impression without media information', impression: {}, mediaType: 'banner' }
    ].forEach(({ name, impression, mediaType }) => {
      it(`should infer media type from a ${name} when mtype is missing`, function () {
        const bidRequest = {
          data: JSON.stringify({ imp: [{ id: 'imp-1', ...impression }] })
        };
        const serverResponse = {
          body: { seatbid: [{ bid: [{ id: 'bid-1', impid: 'imp-1', price: 1, adm: 'creative' }] }] }
        };

        const result = spec.interpretResponse(serverResponse, bidRequest);

        expect(result).to.have.length(1);
        expect(result[0].requestId).to.equal('imp-1');
        expect(result[0].mediaType).to.equal(mediaType);
      });
    });

    it('should match response impressions by id when responses arrive in a different order', function () {
      const bidRequest = {
        data: JSON.stringify({ imp: [{ id: 'banner-1', banner: {} }, { id: 'video-1', video: {} }] })
      };
      const serverResponse = {
        body: {
          seatbid: [{
            bid: [
              { id: 'bid-video', impid: 'video-1', price: 2, adm: 'video creative' },
              { id: 'bid-banner', impid: 'banner-1', price: 1, adm: 'banner creative' }
            ]
          }]
        }
      };

      const result = spec.interpretResponse(serverResponse, bidRequest);

      expect(result.map(({ requestId, mediaType }) => ({ requestId, mediaType }))).to.deep.equal([
        { requestId: 'video-1', mediaType: 'video' },
        { requestId: 'banner-1', mediaType: 'banner' }
      ]);
    });

    it('should default missing response fields and request information', function () {
      const serverResponse = {
        body: {
          seatbid: [{ bid: [{ id: 'bid-1', impid: 'imp-1', price: 1.5, adm: '<div>creative</div>' }] }]
        }
      };

      expect(spec.interpretResponse(serverResponse)).to.deep.equal([{
        id: 'bid-1',
        requestId: 'imp-1',
        cpm: 1.5,
        currency: DEFAULT_CURRENCY,
        netRevenue: true,
        width: 0,
        height: 0,
        ttl: 300,
        creativeId: 0,
        mediaType: 'banner',
        meta: { advertiserDomains: [] },
        ad: '<div>creative</div>'
      }]);
    });

    [undefined, {}, { seatbid: [] }].forEach((body) => {
      it(`should return no bids when response bid data is missing from ${JSON.stringify(body)}`, function () {
        expect(spec.interpretResponse({ body })).to.deep.equal([]);
      });
    });
  });
  describe('getUserSyncs', function () {
    const validResponse = {
      id: '19ab94a9-b0d7-4ed7-9f80-ad0c033cf1b1',
      seatbid: [
        {
          bid: [
            {
              id: '65820304700829014',
              impid: '462c08f20d428',
              price: 3.40,
              adm: '<script type="text/javascript" src="https://ad.impactify.io/static/ad/tag.js"></script>',
              adid: '97517771',
              iurl: 'https://fra1-ib.adnxs.com/cr?id=97517771',
              cid: '9325',
              crid: '97517771',
              w: 1,
              h: 1,
              meta: { 'advertiserDomains': ['testdomain.com'] },
              ext: {
                prebid: {
                  'type': 'video'
                },
                bidder: {
                  prebid: {
                    type: 'video',
                    video: {
                      duration: 30,
                      primary_category: ''
                    }
                  },
                  bidder: {
                    appnexus: {
                      brand_id: 182979,
                      auction_id: '8657683934873599656',
                      bidder_id: 2,
                      bid_ad_type: 1,
                      creative_info: {
                        video: {
                          duration: 30,
                          mimes: [
                            'video/x-flv',
                            'video/mp4',
                            'video/webm'
                          ]
                        }
                      }
                    }
                  }
                }
              }
            }
          ],
          seat: 'impactify'
        }
      ],
      cur: DEFAULT_CURRENCY,
      ext: {
        responsetimemillis: {
          impactify: 114
        },
        prebid: {
          auctiontimestamp: 1614587024591
        }
      }
    };
    it('should return empty response if server response is false', function () {
      const result = spec.getUserSyncs('bad', false, gdprData);
      expect(result).to.be.empty;
    });
    it('should return empty response if server response is empty', function () {
      const result = spec.getUserSyncs('bad', [], gdprData);
      expect(result).to.be.empty;
    });
    it('should append the various values if they exist', function () {
      const result = spec.getUserSyncs({ iframeEnabled: true }, validResponse, gdprData);
      expect(result[0].url).to.include('gdpr=1');
      expect(result[0].url).to.include('gdpr_consent=BOh7mtYOh7mtYAcABBENCU-AAAAncgPIXJiiAoao0PxBFkgCAC8ACIAAQAQQAAIAAAIAAAhBGAAAQAQAEQgAAAAAAABAAAAAAAAAAAAAAACAAAAAAAACgAAAAABAAAAQAAAAAAA');
    });
  });

  describe('On winning bid', function () {
    const bid = {
      ad: '<script type="text/javascript" src="https://ad.impactify.io/static/ad/tag.js"></script>',
      cpm: '2'
    };
    const result = spec.onBidWon(bid);
    assert.ok(result);
  });

  describe('On bid Time out', function () {
    const bid = {
      ad: '<script type="text/javascript" src="https://ad.impactify.io/static/ad/tag.js"></script>',
      cpm: '2'
    };
    const result = spec.onTimeout(bid);
    assert.ok(result);
  });
});
