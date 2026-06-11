import { expect } from 'chai';
import sinon from 'sinon';
import { dep, spec } from 'modules/goldbachBidAdapter.js';
import { newBidder } from 'src/adapters/bidderFactory.js';
import { deepClone } from 'src/utils.js';
import { BANNER, NATIVE, VIDEO } from 'src/mediaTypes.js';
import { OUTSTREAM } from 'src/video.js';
import { addFPDToBidderRequest } from '../../helpers/fpd.js';

const BIDDER_NAME = 'goldbach';
const ENDPOINT = 'https://goldlayer-api.prod.gbads.net/openrtb/2.5/auction';

/* Eids */
const eids = [
  {
    source: 'goldbach.com',
    uids: [
      {
        id: '0d862e87-14e9-47a4-9e9b-886b7d7a9d1b',
        atype: 1,
        ext: { stype: 'ppuid' }
      }
    ]
  },
  {
    source: 'niceid.live',
    uids: [
      {
        id: '0d862e87-14e9-47a4-9e9b-886b7d7a9d1a',
        atype: 1,
        ext: { stype: 'ppuid' }
      }
    ]
  },
  {
    source: 'otherid.live',
    uids: [
      {
        id: '0d862e87-14e9-47a4-9e9b-886b7d7a9d1a',
        atype: 1,
        ext: { stype: 'other-id' }
      }
    ]
  }
];

const validNativeObject = {
  link: {
    url: 'https://example.com/cta',
  },
  imptrackers: [
    'https://example.com/impression1',
    'https://example.com/impression2',
  ],
  assets: [
    {
      id: 1,
      title: {
        text: 'Amazing Product - Do not Miss Out!',
      },
    },
    {
      id: 2,
      img: {
        url: 'https://example.com/main-image.jpg',
        w: 300,
        h: 250,
      },
    },
    {
      id: 3,
      img: {
        url: 'https://example.com/icon-image.jpg',
        w: 50,
        h: 50,
      },
    },
    {
      id: 4,
      data: {
        value: 'This is the description of the product or service being advertised.',
      },
    },
    {
      id: 5,
      data: {
        value: 'Sponsored by some brand',
      },
    },
    {
      id: 6,
      data: {
        value: 'Buy Now',
      },
    },
  ],
};

/* Minimal validBidRequests */
const validBidRequests = [
  {
    bidder: BIDDER_NAME,
    adUnitCode: 'au-1',
    adUnitId: 'c3400db6-c4c5-465e-bf67-1545751944b7',
    auctionId: '7570fb24-810d-4c26-9f9c-acd0b6977f60',
    bidId: '3d52a1909b972a',
    bidderRequestId: '2b63a1826ab946',
    userIdAsEids: eids,
    mediaTypes: {
      [BANNER]: {
        sizes: [[300, 50], [300, 250], [300, 600], [320, 50], [320, 480], [320, 64], [320, 160], [320, 416], [336, 280]]
      }
    },
    sizes: [[300, 50], [300, 250], [300, 600], [320, 50], [320, 480], [320, 64], [320, 160], [320, 416], [336, 280]],
    params: {
      publisherId: 'de-publisher.ch-ios',
      slotId: '/46753895/publisher.ch/inside-full-content-pos1/pbjs-test',
      customTargeting: { language: 'de' }
    }
  },
  {
    bidder: BIDDER_NAME,
    adUnitCode: 'au-2',
    adUnitId: 'c3400db6-c4c5-465e-bf67-1545751944b8',
    auctionId: '7570fb24-810d-4c26-9f9c-acd0b6977f60',
    bidId: '3d52a1909b972b',
    bidderRequestId: '2b63a1826ab946',
    userIdAsEids: eids,
    mediaTypes: {
      [VIDEO]: {
        playerSize: [[640, 480]],
        context: OUTSTREAM,
        protocols: [1, 2],
        mimes: ['video/mp4']
      }
    },
    params: {
      publisherId: 'de-publisher.ch-ios',
      slotId: '/46753895/publisher.ch/inside-full-content-pos1/pbjs-test/video',
      customTargeting: {
        language: 'de'
      }
    }
  },
  {
    bidder: BIDDER_NAME,
    adUnitCode: 'au-3',
    adUnitId: 'c3400db6-c4c5-465e-bf67-1545751944b9',
    auctionId: '7570fb24-810d-4c26-9f9c-acd0b6977f60',
    bidId: '3d52a1909b972c',
    bidderRequestId: '2b63a1826ab946',
    userIdAsEids: eids,
    mediaTypes: {
      [NATIVE]: {
        title: {
          required: true,
          len: 50
        },
        image: {
          required: true,
          sizes: [300, 157]
        },
        icon: {
          required: true,
          sizes: [30, 30]
        },
        body: {
          required: true,
          len: 150
        },
        cta: {
          required: true,
          len: 15
        },
        sponsoredBy: {
          required: true,
          len: 25
        },
      }
    },
    params: {
      publisherId: 'de-publisher.ch-ios',
      slotId: '/46753895/publisher.ch/inside-full-content-pos1/pbjs-test/native',
      customTargeting: {
        language: 'de'
      }
    }
  }
];

/* Minimal bidderRequest */
const validBidderRequest = {
  bidderCode: BIDDER_NAME,
  auctionId: '7570fb24-810d-4c26-9f9c-acd0b6977f60',
  bidderRequestId: '7570fb24-811d-4c26-9f9c-acd0b6977f61',
  bids: validBidRequests,
  gdprConsent: {
    gdprApplies: true,
    consentString: 'CONSENT'
  },
  timeout: 3000
};

/* OpenRTB response from auction endpoint */
const validOrtbBidResponse = {
  id: '3d52a1909b972a',
  seatbid: [
    {
      bid: [
        {
          id: '3d52a1909b972a',
          impid: '3d52a1909b972a',
          price: 0.5,
          adm: '<div>creative</div>',
          crid: 'creative-id',
          w: 300,
          h: 250,
          ext: {
            origbidcur: 'USD',
            prebid: {
              type: 'banner'
            }
          }
        },
        {
          id: '3d52a1909b972b',
          impid: '3d52a1909b972b',
          price: 0.5,
          adm: '<div>creative</div>',
          crid: 'creative-id',
          w: 640,
          h: 480,
          ext: {
            origbidcur: 'USD',
            prebid: {
              type: 'video'
            }
          }
        },
        {
          id: '3d52a1909b972c',
          impid: '3d52a1909b972c',
          price: 0.5,
          adm: validNativeObject,
          crid: 'creative-id',
          ext: {
            origbidcur: 'USD',
            prebid: {
              type: 'native'
            }
          }
        }
      ]
    }
  ],
  cur: 'USD',
  ext: {
    prebid: {
      targeting: {
        hb_bidder: 'appnexus',
        hb_pb: '0.50',
        hb_adid: '3d52a1909b972a',
        hb_deal: 'deal-id',
        hb_size: '300x250'
      }
    }
  }
};

describe('GoldbachBidAdapter', function () {
  const adapter = newBidder(spec);
  let sandbox;
  let ajaxStub;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    ajaxStub = sandbox.stub(dep, 'ajax');
    sandbox.stub(Math, 'random').returns(0);
  });

  afterEach(() => {
    ajaxStub.restore();
    sandbox.restore();
  });

  describe('inherited functions', function () {
    it('exists and is a function', function () {
      expect(adapter.callBids).to.exist.and.to.be.a('function');
    });
  });

  describe('isBidRequestValid', function () {
    const bid = {
      bidder: BIDDER_NAME,
      params: {
        publisherId: 'de-publisher.ch-ios',
        slotId: '/46753895/publisher.ch/inside-full-content-pos1/pbjs-test',
        customTargeting: { language: 'de' }
      },
      adUnitCode: '/46753895/publisher.ch/inside-full-content-pos1/pbjs-test',
      sizes: [[300, 250], [300, 600]]
    };

    it('should return true when required params found', function () {
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });

    it('should return false when required params are not passed', function () {
      const invalidBid = Object.assign({}, bid);
      delete invalidBid.params;
      invalidBid.params = {
        publisherId: undefined
      };
      expect(spec.isBidRequestValid(invalidBid)).to.equal(false);
    });

    it('should return false when publisherId is an empty string', function () {
      const invalidBid = Object.assign({}, bid, { params: { publisherId: '' } });
      expect(spec.isBidRequestValid(invalidBid)).to.equal(false);
    });

    it('should return false when params is missing', function () {
      const invalidBid = { bidder: BIDDER_NAME };
      expect(spec.isBidRequestValid(invalidBid)).to.equal(false);
    });

    it('should return false when publisherId is not a string', function () {
      const invalidBid = Object.assign({}, bid, { params: { publisherId: 123 } });
      expect(spec.isBidRequestValid(invalidBid)).to.equal(false);
    });
  });

  describe('buildRequests', function () {
    it('should use defined endpoint', function () {
      const bidRequests = deepClone(validBidRequests);
      const bidderRequest = deepClone(validBidderRequest);

      const request = spec.buildRequests(bidRequests, bidderRequest);
      expect(request.url).to.equal(ENDPOINT);
    });

    it('should parse all bids to a valid openRTB request', function () {
      const bidRequests = deepClone(validBidRequests);
      const bidderRequest = deepClone(validBidderRequest);
      const request = spec.buildRequests(bidRequests, bidderRequest);
      const payload = request.data;

      expect(payload.imp).to.exist;
      expect(Array.isArray(payload.imp)).to.be.true;
      expect(payload.imp.length).to.equal(3);
      expect(payload.imp[0].ext.goldbach.slotId).to.equal(bidRequests[0].params.slotId);
      expect(Array.isArray(payload.imp[0][BANNER].format)).to.be.true;
      expect(payload.imp[0][BANNER].format.length).to.equal(bidRequests[0].sizes.length);
      expect(payload.imp[1].ext.goldbach.slotId).to.equal(bidRequests[1].params.slotId);
    });

    if (FEATURES.VIDEO) {
      it('should parse all video bids to valid video imps (use video player size)', async function () {
        const bidRequests = deepClone(validBidRequests);
        const bidderRequest = deepClone(validBidderRequest);
        const request = spec.buildRequests([bidRequests[1]], await addFPDToBidderRequest(bidderRequest));
        const payload = request.data;

        expect(payload.imp.length).to.equal(1);
        expect(payload.imp[0][VIDEO]).to.exist;
        expect(payload.imp[0][VIDEO].w).to.equal(640);
        expect(payload.imp[0][VIDEO].h).to.equal(480);
      });
    }

    it('should set custom config on request', function () {
      const bidRequests = deepClone(validBidRequests);
      const bidderRequest = deepClone(validBidderRequest);
      const request = spec.buildRequests(bidRequests, bidderRequest);
      const payload = request.data;

      expect(payload.ext.goldbach.publisherId).to.equal(bidRequests[0].params.publisherId);
    });

    it('should set auctionStartTime on request', function () {
      const bidRequests = deepClone(validBidRequests);
      const bidderRequest = deepClone(validBidderRequest);
      const before = Date.now();
      const request = spec.buildRequests(bidRequests, bidderRequest);
      const after = Date.now();
      const payload = request.data;

      expect(payload.ext.goldbach.auctionStartTime).to.be.a('number');
      expect(payload.ext.goldbach.auctionStartTime).to.be.at.least(before);
      expect(payload.ext.goldbach.auctionStartTime).to.be.at.most(after);
    });

    it('should set gdpr on request', function () {
      const bidRequests = deepClone(validBidRequests);
      const bidderRequest = deepClone(validBidderRequest);
      const request = spec.buildRequests(bidRequests, bidderRequest);
      const payload = request.data;

      expect(!!payload.regs.ext.gdpr).to.equal(bidderRequest.gdprConsent.gdprApplies);
      expect(payload.user.ext.consent).to.equal(bidderRequest.gdprConsent.consentString);
    });

    it('should handle missing gdprConsent gracefully', function () {
      const bidRequests = deepClone(validBidRequests);
      const bidderRequest = deepClone(validBidderRequest);
      delete bidderRequest.gdprConsent;
      const request = spec.buildRequests(bidRequests, bidderRequest);
      const payload = request.data;

      expect(payload.ext.goldbach.publisherId).to.exist;
      expect(payload.regs?.ext?.gdpr).to.not.exist;
    });

    it('should set custom targeting on request', function () {
      const bidRequests = deepClone(validBidRequests);
      const bidderRequest = deepClone(validBidderRequest);
      const request = spec.buildRequests(bidRequests, bidderRequest);
      const payload = request.data;

      expect(payload.imp[0].ext.goldbach.targetings).to.exist;
      expect(payload.imp[0].ext.goldbach.targetings).to.deep.equal(bidRequests[0].params.customTargeting);
    });
  });

  describe('interpretResponse', function () {
    it('should map response to valid bids (amount)', function () {
      const bidRequest = spec.buildRequests(validBidRequests, validBidderRequest);
      const bidResponse = deepClone({ body: validOrtbBidResponse });
      const response = spec.interpretResponse(bidResponse, bidRequest);

      expect(response).to.exist;
      expect(response.length).to.equal(3);
      expect(response.filter(bid => bid.requestId === validBidRequests[0].bidId).length).to.equal(1);
      expect(response.filter(bid => bid.requestId === validBidRequests[1].bidId).length).to.equal(1);
    });

    if (FEATURES.VIDEO) {
      it('should attach a custom video renderer ', function () {
        const bidRequest = spec.buildRequests(validBidRequests, validBidderRequest);
        const bidResponse = deepClone({ body: validOrtbBidResponse });
        bidResponse.body.seatbid[0].bid[1].adm = '<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?><VAST version=\"4.0\"></VAST>';
        bidResponse.body.seatbid[0].bid[1].ext = { prebid: { type: 'video', meta: { type: 'video_outstream' } } };
        const response = spec.interpretResponse(bidResponse, bidRequest);

        expect(response).to.exist;
        expect(response.filter(bid => !!bid.renderer).length).to.equal(1);
      });

      it('should set the player accordingly to config', function () {
        const bidRequest = spec.buildRequests(validBidRequests, validBidderRequest);
        const bidResponse = deepClone({ body: validOrtbBidResponse });
        bidResponse.body.seatbid[0].bid[1].adm = '<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?><VAST version=\"4.0\"></VAST>';
        bidResponse.body.seatbid[0].bid[1].ext = { prebid: { type: 'video', meta: { type: 'video_outstream' } } };
        validBidRequests[1].mediaTypes.video.playbackmethod = 1;
        const response = spec.interpretResponse(bidResponse, bidRequest);
        const renderer = response.find(bid => !!bid.renderer);

        expect(response).to.exist;
        expect(response.filter(bid => !!bid.renderer).length).to.equal(1);
        expect(renderer.renderer.config.documentResolver).to.exist;
        expect(renderer.renderer.url).to.be.a('string');
      });
    }

    it('should set meta fields from bid response', function () {
      const bidRequest = spec.buildRequests(validBidRequests, validBidderRequest);
      const bidResponse = deepClone({ body: validOrtbBidResponse });
      bidResponse.body.seatbid[0].bid[0].adomain = ['example.com'];
      const response = spec.interpretResponse(bidResponse, bidRequest);
      const bannerBid = response.find(bid => bid.requestId === validBidRequests[0].bidId);

      expect(bannerBid.meta).to.exist;
      expect(bannerBid.meta.advertiserDomains).to.deep.equal(['example.com']);
      expect(bannerBid.meta.mediaType).to.equal('banner');
    });

    it('should use origbidcur as currency fallback', function () {
      const bidRequest = spec.buildRequests(validBidRequests, validBidderRequest);
      const bidResponse = deepClone({ body: validOrtbBidResponse });
      const response = spec.interpretResponse(bidResponse, bidRequest);
      const bannerBid = response.find(bid => bid.requestId === validBidRequests[0].bidId);

      expect(bannerBid.currency).to.equal('USD');
    });

    it('should return empty array for empty seatbid', function () {
      const bidRequest = spec.buildRequests(validBidRequests, validBidderRequest);
      const bidResponse = { body: { id: 'test', seatbid: [] } };
      const response = spec.interpretResponse(bidResponse, bidRequest);

      expect(response).to.be.an('array').that.is.empty;
    });

    it('should not attach a custom video renderer when VAST url/xml is missing', function () {
      const bidRequest = spec.buildRequests(validBidRequests, validBidderRequest);
      const bidResponse = deepClone({ body: validOrtbBidResponse });
      bidResponse.body.seatbid[0].bid[1].adm = undefined;
      bidResponse.body.seatbid[0].bid[1].ext = { prebid: { type: 'video', meta: { type: 'video_outstream' } } };
      const response = spec.interpretResponse(bidResponse, bidRequest);

      expect(response).to.exist;
      expect(response.filter(bid => !!bid.renderer).length).to.equal(0);
    });

    it('should carry publisherId from the request onto every bid response under ext.goldbach', function () {
      const bidRequest = spec.buildRequests(validBidRequests, validBidderRequest);
      const bidResponse = deepClone({ body: validOrtbBidResponse });
      const response = spec.interpretResponse(bidResponse, bidRequest);

      expect(response).to.have.length.greaterThan(0);
      response.forEach(bid => {
        expect(bid.ext.goldbach.publisherId).to.equal('de-publisher.ch-ios');
      });
    });

    it('prefers a server-echoed ext.goldbach.publisherId over the request param', function () {
      const bidRequest = spec.buildRequests(validBidRequests, validBidderRequest);
      const bidResponse = deepClone({ body: validOrtbBidResponse });
      // Server echoes a different publisherId on the bid (e.g. normalized / parent-resolved)
      bidResponse.body.seatbid[0].bid.forEach(b => {
        b.ext = b.ext || {};
        b.ext.goldbach = { publisherId: 'server-resolved-pub' };
      });
      const response = spec.interpretResponse(bidResponse, bidRequest);

      expect(response).to.have.length.greaterThan(0);
      response.forEach(bid => {
        expect(bid.ext.goldbach.publisherId).to.equal('server-resolved-pub');
      });
    });
  });

  if (FEATURES.VIDEO) {
    describe('outstream renderer', function () {
      let goldPlayerSpy;
      let goldPlayerOptions;

      function buildFakeDoc(elementsById = {}) {
        return {
          getElementById: sinon.spy((id) =>
            Object.prototype.hasOwnProperty.call(elementsById, id) ? elementsById[id] : null
          ),
          defaultView: {
            GoldPlayer: function GoldPlayer(opts) {
              goldPlayerOptions = opts;
              goldPlayerSpy(opts);
              this.play = sinon.stub();
            }
          }
        };
      }

      function runRenderer({ adUnitCode = 'au-2', playerSize = [[640, 480]], doc }) {
        const bidRequests = deepClone(validBidRequests);
        bidRequests[1].adUnitCode = adUnitCode;
        bidRequests[1].mediaTypes.video.playerSize = playerSize;
        const bidderRequest = deepClone(validBidderRequest);
        bidderRequest.bids = bidRequests;

        const request = spec.buildRequests(bidRequests, bidderRequest);
        const bidResponse = deepClone({ body: validOrtbBidResponse });
        bidResponse.body.seatbid[0].bid[1].adm =
          '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><VAST version="4.0"></VAST>';
        bidResponse.body.seatbid[0].bid[1].ext = { prebid: { type: 'video', meta: { type: 'video_outstream' } } };
        const response = spec.interpretResponse(bidResponse, request);
        const videoBid = response.find(b => !!b.renderer);
        videoBid.adUnitCode = adUnitCode;
        videoBid.renderer._render(videoBid, doc);
        videoBid.renderer.process();
        return videoBid;
      }

      beforeEach(function () {
        goldPlayerSpy = sinon.spy();
        goldPlayerOptions = null;
      });

      it('passes the slot div as divContainerElement when adUnitCode matches a DOM id', function () {
        const slotDiv = { id: 'my-slot', tagName: 'DIV' };
        const doc = buildFakeDoc({ 'my-slot': slotDiv });
        runRenderer({ adUnitCode: 'my-slot', doc });

        expect(goldPlayerSpy.calledOnce).to.be.true;
        expect(goldPlayerOptions.divContainerElement).to.equal(slotDiv);
      });

      it('passes null divContainerElement when no DOM element matches adUnitCode', function () {
        const doc = buildFakeDoc({});
        runRenderer({ adUnitCode: 'missing-slot', doc });

        expect(goldPlayerSpy.calledOnce).to.be.true;
        expect(goldPlayerOptions.divContainerElement).to.equal(null);
      });

      it('reads width/height from playerSize[0] tuple', function () {
        const doc = buildFakeDoc({});
        runRenderer({ playerSize: [[640, 360]], doc });

        expect(goldPlayerOptions.publisherProvidedWidth).to.equal(640);
        expect(goldPlayerOptions.publisherProvidedHeight).to.equal(360);
      });

      it('reads width/height from a flat playerSize tuple [w, h]', function () {
        const doc = buildFakeDoc({});
        runRenderer({ playerSize: [640, 360], doc });

        expect(goldPlayerOptions.publisherProvidedWidth).to.equal(640);
        expect(goldPlayerOptions.publisherProvidedHeight).to.equal(360);
      });

      it('leaves width/height undefined when playerSize is missing/invalid', function () {
        const doc = buildFakeDoc({});
        // null bypasses runRenderer's default-arg fallback so the renderer sees a falsy playerSize.
        runRenderer({ playerSize: null, doc });

        expect(goldPlayerOptions.publisherProvidedWidth).to.be.undefined;
        expect(goldPlayerOptions.publisherProvidedHeight).to.be.undefined;
      });

      it('resolves a GAM-style adUnitCode (slashes and dots) via getElementById without throwing', function () {
        const gamId = '/123/site.com/slot';
        const slotDiv = { id: gamId, tagName: 'DIV' };
        const doc = buildFakeDoc({ [gamId]: slotDiv });

        expect(() => runRenderer({ adUnitCode: gamId, doc })).to.not.throw();
        expect(goldPlayerOptions.divContainerElement).to.equal(slotDiv);
        expect(doc.getElementById.calledWith(gamId)).to.be.true;
      });
    });
  }

  describe('getUserSyncs', function () {
    it('should return empty array when there is no auction response', function () {
      const syncOptions = { pixelEnabled: true, iframeEnabled: true };
      const userSyncs = spec.getUserSyncs(syncOptions, {}, undefined, {});
      expect(userSyncs).to.be.an('array').that.is.empty;
    });

    it('should proceed when gdprConsent is undefined (no CMP / GDPR not in scope) and substitute GDPR macros with safe defaults', function () {
      const syncOptions = { pixelEnabled: true, iframeEnabled: true };
      const serverResponses = [{
        body: {
          ext: {
            goldbach: {
              syncs: [
                { type: 'image', url: 'https://partner.example/sync?gdpr={{GDPR}}&gdpr_consent={{GDPR_CONSENT}}' },
              ]
            }
          }
        }
      }];
      const userSyncs = spec.getUserSyncs(syncOptions, serverResponses, undefined, undefined);

      expect(userSyncs).to.have.length(1);
      expect(userSyncs[0]).to.deep.equal({
        type: 'image',
        url: 'https://partner.example/sync?gdpr=0&gdpr_consent=',
      });
    });

    it('should return empty array when ext.goldbach.syncs is absent from the auction response', function () {
      const gdprConsent = {
        gdprApplies: true,
        consentString: 'CONSENT',
        vendorData: { purpose: { consents: { '1': true } } }
      };
      const syncOptions = { pixelEnabled: true, iframeEnabled: true };
      const userSyncs = spec.getUserSyncs(syncOptions, [{ body: { /* no ext */ } }], gdprConsent, undefined);

      expect(userSyncs).to.be.an('array').that.is.empty;
    });

    describe('server-driven syncs (ext.goldbach.syncs)', function () {
      const gdprConsent = {
        gdprApplies: true,
        consentString: 'CONSENT+/STR=',
        vendorData: { purpose: { consents: { '1': true } } }
      };

      function makeServerResponse(syncs) {
        return [{ body: { ext: { goldbach: { syncs } } } }];
      }

      it('uses server-driven sync URLs from the auction response when present', function () {
        const syncOptions = { pixelEnabled: true, iframeEnabled: true };
        const userSyncs = spec.getUserSyncs(
          syncOptions,
          makeServerResponse([
            { type: 'image', url: 'https://partner-a.example/sync?p=1' },
            { type: 'iframe', url: 'https://partner-b.example/sync?p=2' },
          ]),
          gdprConsent,
          '1YYY'
        );
        expect(userSyncs).to.have.length(2);
        expect(userSyncs[0]).to.deep.equal({ type: 'image', url: 'https://partner-a.example/sync?p=1' });
        expect(userSyncs[1]).to.deep.equal({ type: 'iframe', url: 'https://partner-b.example/sync?p=2' });
      });

      it('substitutes {{GDPR}}, {{GDPR_CONSENT}} and {{USP}} placeholders', function () {
        const syncOptions = { pixelEnabled: true };
        const userSyncs = spec.getUserSyncs(
          syncOptions,
          makeServerResponse([
            {
              type: 'image',
              url: 'https://partner.example/sync?gdpr={{GDPR}}&gdpr_consent={{GDPR_CONSENT}}&us_privacy={{USP}}'
            },
          ]),
          gdprConsent,
          '1YYY'
        );
        expect(userSyncs).to.have.length(1);
        expect(userSyncs[0].url).to.equal(
          `https://partner.example/sync?gdpr=1&gdpr_consent=${encodeURIComponent(gdprConsent.consentString)}&us_privacy=${encodeURIComponent('1YYY')}`
        );
      });

      it('substitutes {{GPP}} and {{GPP_SID}} placeholders', function () {
        const syncOptions = { pixelEnabled: true };
        const gppConsent = { gppString: 'GPP+/STR=', applicableSections: [7, 8] };
        const userSyncs = spec.getUserSyncs(
          syncOptions,
          makeServerResponse([
            { type: 'image', url: 'https://partner.example/sync?gpp={{GPP}}&gpp_sid={{GPP_SID}}' },
          ]),
          gdprConsent,
          undefined,
          gppConsent
        );
        expect(userSyncs).to.have.length(1);
        expect(userSyncs[0].url).to.equal(
          `https://partner.example/sync?gpp=${encodeURIComponent('GPP+/STR=')}&gpp_sid=${encodeURIComponent('7,8')}`
        );
      });

      it('substitutes GPP placeholders with empty values when gppConsent is missing', function () {
        const syncOptions = { pixelEnabled: true };
        const userSyncs = spec.getUserSyncs(
          syncOptions,
          makeServerResponse([
            { type: 'image', url: 'https://partner.example/sync?gpp={{GPP}}&gpp_sid={{GPP_SID}}' },
          ]),
          gdprConsent,
          undefined,
          undefined
        );
        expect(userSyncs).to.have.length(1);
        expect(userSyncs[0].url).to.equal('https://partner.example/sync?gpp=&gpp_sid=');
      });

      it('leaves URLs without GPP placeholders unchanged when gppConsent is provided', function () {
        const syncOptions = { pixelEnabled: true };
        const gppConsent = { gppString: 'GPPSTR', applicableSections: [7] };
        const userSyncs = spec.getUserSyncs(
          syncOptions,
          makeServerResponse([
            { type: 'image', url: 'https://partner.example/sync?gdpr={{GDPR}}' },
          ]),
          gdprConsent,
          undefined,
          gppConsent
        );
        expect(userSyncs).to.have.length(1);
        expect(userSyncs[0].url).to.equal('https://partner.example/sync?gdpr=1');
      });

      it('filters out iframe entries when only pixel is enabled (and vice versa)', function () {
        const syncOptions = { pixelEnabled: true, iframeEnabled: false };
        const userSyncs = spec.getUserSyncs(
          syncOptions,
          makeServerResponse([
            { type: 'image', url: 'https://partner.example/pixel' },
            { type: 'iframe', url: 'https://partner.example/iframe' },
          ]),
          gdprConsent,
          undefined
        );
        expect(userSyncs).to.have.length(1);
        expect(userSyncs[0].type).to.equal('image');
      });

      it('treats an empty server-driven array as an authoritative no-syncs signal (no fallback)', function () {
        const syncOptions = { pixelEnabled: true, iframeEnabled: true };
        const userSyncs = spec.getUserSyncs(
          syncOptions,
          makeServerResponse([]),
          gdprConsent,
          undefined
        );
        expect(userSyncs).to.be.an('array').that.is.empty;
      });

      it('drops malformed entries (missing url or unknown type)', function () {
        const syncOptions = { pixelEnabled: true, iframeEnabled: true };
        const userSyncs = spec.getUserSyncs(
          syncOptions,
          makeServerResponse([
            { type: 'image' },
            { type: 'audio', url: 'https://partner.example/audio' },
            { url: 'https://partner.example/no-type' },
            { type: 'image', url: 'https://partner.example/ok' },
          ]),
          gdprConsent,
          undefined
        );
        expect(userSyncs).to.have.length(1);
        expect(userSyncs[0].url).to.equal('https://partner.example/ok');
      });

      it('still gates server-driven syncs on GDPR purpose 1 consent', function () {
        const noConsent = { gdprApplies: true, consentString: 'CONSENT' /* no vendorData */ };
        const syncOptions = { pixelEnabled: true, iframeEnabled: true };
        const userSyncs = spec.getUserSyncs(
          syncOptions,
          makeServerResponse([{ type: 'image', url: 'https://partner.example/pixel' }]),
          noConsent,
          undefined
        );
        expect(userSyncs).to.be.an('array').that.is.empty;
      });
    });
  });

  describe('sendMetrics', function () {
    it('should not send metrics when sample rate is not met', function () {
      Math.random.returns(1);
      spec.onTimeout([]);
      expect(ajaxStub.calledOnce).to.be.false;
    });

    it('should set fetch keepalive on the metrics request so it survives navigation', function () {
      spec.onTimeout([]);
      expect(ajaxStub.calledOnce).to.be.true;
      const options = ajaxStub.firstCall.args[3];
      expect(options.keepalive).to.equal(true);
    });
  });

  describe('onTimeout', function () {
    it('should send timeout event', function () {
      spec.onTimeout([]);
      expect(ajaxStub.calledOnce).to.be.true;
      const payload = JSON.parse(ajaxStub.firstCall.args[2]);
      expect(payload.event).to.equal('timeout');
      expect(payload.source).to.be.a('string');
      expect(payload.projected).to.be.a('number');
      expect(payload.ts).to.be.a('number');
      expect(payload.data).to.be.an('object');
    });

    it('should read publisherId from the rewritten params array on the timed-out bidder', function () {
      // adapterManager rewrites timedOutBidder.params via getUserConfiguredParams which returns an array.
      spec.onTimeout([{ params: [{ publisherId: 'pub-from-timeout' }] }]);
      const payload = JSON.parse(ajaxStub.firstCall.args[2]);
      expect(payload.data.publisherId).to.equal('pub-from-timeout');
    });
  });

  describe('onBidWon', function () {
    it('should send bid_won event', function () {
      spec.onBidWon({
        ext: { goldbach: { publisherId: 'pub-1' } },
        creativeId: 'crid-1',
        adUnitCode: 'au-1',
        mediaType: 'banner',
        size: '300x250',
        cpm: 1.5,
        currency: 'USD'
      });
      expect(ajaxStub.calledOnce).to.be.true;
      const payload = JSON.parse(ajaxStub.firstCall.args[2]);
      expect(payload.event).to.equal('bid_won');
      expect(payload.source).to.be.a('string');
      expect(payload.projected).to.be.a('number');
      expect(payload.ts).to.be.a('number');
      expect(payload.data).to.be.an('object');
      expect(payload.data).to.include.keys('publisherId', 'creativeId', 'adUnitCode', 'mediaType', 'size', 'cpm', 'currency');
      expect(payload.data.publisherId).to.equal('pub-1');
    });
  });

  describe('onSetTargeting', function () {
    it('should send targeting_set event', function () {
      spec.onSetTargeting({
        ext: { goldbach: { publisherId: 'pub-1' } },
        creativeId: 'crid-1',
        adUnitCode: 'au-1',
        mediaType: 'banner',
        size: '300x250',
        cpm: 1.0,
        currency: 'CHF'
      });
      expect(ajaxStub.calledOnce).to.be.true;
      const payload = JSON.parse(ajaxStub.firstCall.args[2]);
      expect(payload.event).to.equal('targeting_set');
      expect(payload.source).to.be.a('string');
      expect(payload.projected).to.be.a('number');
      expect(payload.ts).to.be.a('number');
      expect(payload.data).to.be.an('object');
      expect(payload.data).to.include.keys('publisherId', 'creativeId', 'adUnitCode', 'mediaType', 'size', 'cpm', 'currency');
      expect(payload.data.publisherId).to.equal('pub-1');
    });
  });

  describe('onBidderError', function () {
    function payloadFor(error) {
      ajaxStub.resetHistory();
      spec.onBidderError({ error });
      return JSON.parse(ajaxStub.firstCall.args[2]).data;
    }

    it('should send error event with type + status, never the raw XHR object', function () {
      const data = payloadFor({ status: 500, statusText: 'Internal Server Error', responseText: '<huge body>' });
      expect(data).to.include.keys('type', 'status');
      expect(data).to.not.have.any.keys('errorData', 'responseText', 'responseXML', 'statusText');
    });

    it('classifies 5xx as "server"', function () {
      expect(payloadFor({ status: 503 }).type).to.equal('server');
    });

    it('classifies 4xx as "client"', function () {
      expect(payloadFor({ status: 404 }).type).to.equal('client');
    });

    it('classifies status 0 (or missing) as "network"', function () {
      expect(payloadFor({ status: 0 }).type).to.equal('network');
      expect(payloadFor({}).type).to.equal('network');
    });

    it('classifies a timeout flag as "timeout" regardless of status', function () {
      expect(payloadFor({ timedOut: true, status: 0 }).type).to.equal('timeout');
      expect(payloadFor({ timedOut: true, status: 504 }).type).to.equal('timeout');
    });

    it('classifies a 2xx (unexpected error path) as "unknown"', function () {
      expect(payloadFor({ status: 200 }).type).to.equal('unknown');
    });
  });

  describe('onAdRenderSucceeded', function () {
    it('should send creative_render event', function () {
      spec.onAdRenderSucceeded({
        ext: { goldbach: { publisherId: 'pub-1' } },
        creativeId: 'crid-1',
        adUnitCode: 'au-1',
        mediaType: 'video',
        size: '640x480',
        cpm: 2.0,
        currency: 'EUR'
      });
      expect(ajaxStub.calledOnce).to.be.true;
      const payload = JSON.parse(ajaxStub.firstCall.args[2]);
      expect(payload.event).to.equal('creative_render');
      expect(payload.source).to.be.a('string');
      expect(payload.projected).to.be.a('number');
      expect(payload.ts).to.be.a('number');
      expect(payload.data).to.be.an('object');
      expect(payload.data).to.include.keys('publisherId', 'creativeId', 'adUnitCode', 'mediaType', 'size', 'cpm', 'currency');
      expect(payload.data.publisherId).to.equal('pub-1');
    });
  });
});
