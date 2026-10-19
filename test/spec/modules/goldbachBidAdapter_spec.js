import { expect } from 'chai';
import sinon from 'sinon';
import { dep, spec } from 'modules/goldbachBidAdapter.js';
import { newBidder } from 'src/adapters/bidderFactory.js';
import { deepClone } from 'src/utils.js';
import { BANNER, NATIVE, VIDEO } from 'src/mediaTypes.js';
import { OUTSTREAM } from 'src/video.js';
import { clearSlotInfoCache } from 'libraries/gptUtils/gptUtils.js';
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
      const payload = request.ortbRequest || request.data;

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
        const payload = request.ortbRequest || request.data;

        expect(payload.imp.length).to.equal(1);
        expect(payload.imp[0][VIDEO]).to.exist;
        expect(payload.imp[0][VIDEO].w).to.equal(640);
        expect(payload.imp[0][VIDEO].h).to.equal(480);
      });
    }

    it('should enable endpoint compression while keeping the request CORS-simple on the full route', function () {
      const bidRequests = deepClone(validBidRequests);
      bidRequests[0].params.auctionType = 'full';
      const bidderRequest = deepClone(validBidderRequest);
      const request = spec.buildRequests(bidRequests, bidderRequest);

      expect(request.options.endpointCompression).to.equal(true);
      expect(request.options.contentType).to.equal('text/plain');
      expect(request.options.withCredentials).to.equal(true);
    });

    it('should set custom config on request', function () {
      const bidRequests = deepClone(validBidRequests);
      const bidderRequest = deepClone(validBidderRequest);
      const request = spec.buildRequests(bidRequests, bidderRequest);
      const payload = request.ortbRequest || request.data;

      expect(payload.ext.goldbach.publisherId).to.equal(bidRequests[0].params.publisherId);
    });

    it('should set auctionStartTime on request', function () {
      const bidRequests = deepClone(validBidRequests);
      const bidderRequest = deepClone(validBidderRequest);
      const before = Date.now();
      const request = spec.buildRequests(bidRequests, bidderRequest);
      const after = Date.now();
      const payload = request.ortbRequest || request.data;

      expect(payload.ext.goldbach.auctionStartTime).to.be.a('number');
      expect(payload.ext.goldbach.auctionStartTime).to.be.at.least(before);
      expect(payload.ext.goldbach.auctionStartTime).to.be.at.most(after);
    });

    it('should set gdpr on request', function () {
      const bidRequests = deepClone(validBidRequests);
      const bidderRequest = deepClone(validBidderRequest);
      const request = spec.buildRequests(bidRequests, bidderRequest);
      const payload = request.ortbRequest || request.data;

      expect(!!payload.regs.ext.gdpr).to.equal(bidderRequest.gdprConsent.gdprApplies);
      expect(payload.user.ext.consent).to.equal(bidderRequest.gdprConsent.consentString);
    });

    it('should handle missing gdprConsent gracefully', function () {
      const bidRequests = deepClone(validBidRequests);
      const bidderRequest = deepClone(validBidderRequest);
      delete bidderRequest.gdprConsent;
      const request = spec.buildRequests(bidRequests, bidderRequest);
      const payload = request.ortbRequest || request.data;

      expect(payload.ext.goldbach.publisherId).to.exist;
      expect(payload.regs?.ext?.gdpr).to.not.exist;
    });

    it('should set custom targeting on request', function () {
      const bidRequests = deepClone(validBidRequests);
      const bidderRequest = deepClone(validBidderRequest);
      const request = spec.buildRequests(bidRequests, bidderRequest);
      const payload = request.ortbRequest || request.data;

      expect(payload.imp[0].ext.goldbach.targetings).to.exist;
      expect(payload.imp[0].ext.goldbach.targetings).to.deep.equal(bidRequests[0].params.customTargeting);
    });
  });

  describe('buildRequests fast auction route', function () {
    const decodeBase64Url = (value) => {
      const base64 = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '=');
      const binary = atob(base64);
      const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
      return new TextDecoder().decode(bytes);
    };

    const createFastBidRequests = () => {
      const bidRequests = deepClone(validBidRequests);
      bidRequests[0].params.auctionType = 'fast';
      return bidRequests;
    };

    it('should send the auction as a GET with the payload base64url-encoded in ?b= when auctionType is fast', function () {
      const request = spec.buildRequests(createFastBidRequests(), deepClone(validBidderRequest));

      expect(request.method).to.equal('GET');
      expect(request.url).to.equal(ENDPOINT);
      expect(Object.keys(request.data)).to.deep.equal(['b']);
      expect(request.data.b).to.match(/^[A-Za-z0-9_-]+$/);
      expect(request.options.withCredentials).to.equal(true);
    });

    it('should default to the POST route when auctionType is not set', function () {
      const request = spec.buildRequests(deepClone(validBidRequests), deepClone(validBidderRequest));

      expect(request.method).to.equal('POST');
      expect(request.data.imp).to.exist;
      expect(request.ortbRequest).to.not.exist;
    });

    it('should encode the exact OpenRTB request the POST route would send', function () {
      const request = spec.buildRequests(createFastBidRequests(), deepClone(validBidderRequest));
      const decoded = JSON.parse(decodeBase64Url(request.data.b));

      expect(decoded).to.deep.equal(JSON.parse(JSON.stringify(request.ortbRequest)));
      expect(decoded.ext.goldbach.publisherId).to.equal(validBidRequests[0].params.publisherId);
      expect(decoded.imp.length).to.equal(validBidRequests.length);
    });

    it('should map responses to bids on the fast route via the retained converter request', function () {
      const request = spec.buildRequests(createFastBidRequests(), deepClone(validBidderRequest));
      const bidResponse = deepClone({ body: validOrtbBidResponse });
      const response = spec.interpretResponse(bidResponse, request);

      expect(response.length).to.equal(3);
      expect(response.filter(bid => bid.requestId === validBidRequests[0].bidId).length).to.equal(1);
    });

    it('should fall back to the POST route when the encoded payload exceeds the GET budget', function () {
      const bidRequests = createFastBidRequests();
      bidRequests[0].params.customTargeting = { oversize: 'x'.repeat(12 * 1024) };
      const request = spec.buildRequests(bidRequests, deepClone(validBidderRequest));

      expect(request.method).to.equal('POST');
      expect(request.data.imp).to.exist;
      expect(request.options.endpointCompression).to.equal(true);
    });

    it('should use only the POST route when auctionType is full', function () {
      const bidRequests = deepClone(validBidRequests);
      bidRequests[0].params.auctionType = 'full';
      const request = spec.buildRequests(bidRequests, deepClone(validBidderRequest));

      expect(request.method).to.equal('POST');
      expect(request.data.imp).to.exist;
      expect(request.ortbRequest).to.not.exist;
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

      function runRenderer({ adUnitCode = 'au-2', playerSize = [[640, 480]], playbackmethod, doc, creativeDoc = null, params, ortb2Imp }) {
        const bidRequests = deepClone(validBidRequests);
        bidRequests[1].adUnitCode = adUnitCode;
        bidRequests[1].mediaTypes.video.playerSize = playerSize;
        if (playbackmethod !== undefined) {
          bidRequests[1].mediaTypes.video.playbackmethod = playbackmethod;
        }
        if (params) {
          Object.assign(bidRequests[1].params, params);
        }
        if (ortb2Imp) {
          bidRequests[1].ortb2Imp = ortb2Imp;
        }
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
        // mimic core executeRenderer(): resolve the mount document, then render into it
        const resolvedDoc = videoBid.renderer.config.documentResolver(videoBid, doc, creativeDoc) || doc;
        videoBid.renderer._render(videoBid, resolvedDoc);
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

      it('does not start the player when no visible container can be resolved', function () {
        const doc = buildFakeDoc({});
        runRenderer({ adUnitCode: 'missing-slot', doc });

        expect(goldPlayerSpy.called).to.be.false;
      });

      it('reads width/height from playerSize[0] tuple', function () {
        const doc = buildFakeDoc({ 'au-2': { id: 'au-2' } });
        runRenderer({ playerSize: [[640, 360]], doc });

        expect(goldPlayerOptions.publisherProvidedWidth).to.equal(640);
        expect(goldPlayerOptions.publisherProvidedHeight).to.equal(360);
      });

      it('reads width/height from a flat playerSize tuple [w, h]', function () {
        const doc = buildFakeDoc({ 'au-2': { id: 'au-2' } });
        runRenderer({ playerSize: [640, 360], doc });

        expect(goldPlayerOptions.publisherProvidedWidth).to.equal(640);
        expect(goldPlayerOptions.publisherProvidedHeight).to.equal(360);
      });

      it('leaves width/height undefined when playerSize is missing/invalid', function () {
        const doc = buildFakeDoc({ 'au-2': { id: 'au-2' } });
        // null bypasses runRenderer's default-arg fallback so the renderer sees a falsy playerSize.
        runRenderer({ playerSize: null, doc });

        expect(goldPlayerOptions.publisherProvidedWidth).to.be.undefined;
        expect(goldPlayerOptions.publisherProvidedHeight).to.be.undefined;
      });

      it('normalizes an ORTB playbackmethod array into autoplay/muted flags', function () {
        const doc = buildFakeDoc({ 'au-2': { id: 'au-2' } });
        runRenderer({ playbackmethod: [2], doc });

        expect(goldPlayerOptions.autoplay).to.be.true;
        expect(goldPlayerOptions.muted).to.be.true;
      });

      it('maps a GAM ad unit path adUnitCode to the GPT slot element', function () {
        const slotDiv = { id: 'div-gpt-1', tagName: 'DIV' };
        const doc = buildFakeDoc({ 'div-gpt-1': slotDiv });
        const previousGoogletag = window.googletag;
        window.googletag = {
          apiReady: true,
          pubads: () => ({
            getSlots: () => [{
              getSlotElementId: () => 'div-gpt-1',
              getAdUnitPath: () => '/123/site.com/slot'
            }]
          })
        };
        try {
          runRenderer({ adUnitCode: '/123/site.com/slot', doc });

          expect(goldPlayerSpy.calledOnce).to.be.true;
          expect(goldPlayerOptions.divContainerElement).to.equal(slotDiv);
        } finally {
          window.googletag = previousGoogletag;
          clearSlotInfoCache();
        }
      });

      it('mounts into the element named by params.divId before any other strategy', function () {
        const target = { id: 'video-slot-1', tagName: 'DIV' };
        const other = { id: 'au-2', tagName: 'DIV' };
        const doc = buildFakeDoc({ 'video-slot-1': target, 'au-2': other });
        runRenderer({ doc, params: { divId: 'video-slot-1' } });

        expect(goldPlayerSpy.calledOnce).to.be.true;
        expect(goldPlayerOptions.divContainerElement).to.equal(target);
      });

      it('mounts into the element named by ortb2Imp.ext.data.divId', function () {
        const target = { id: 'fpd-slot', tagName: 'DIV' };
        const doc = buildFakeDoc({ 'fpd-slot': target });
        runRenderer({ adUnitCode: 'missing-slot', doc, ortb2Imp: { ext: { data: { divId: 'fpd-slot' } } } });

        expect(goldPlayerSpy.calledOnce).to.be.true;
        expect(goldPlayerOptions.divContainerElement).to.equal(target);
      });

      it('climbs from the GAM creative iframe to the page slot div (PUC flow)', function () {
        const slotDiv = document.createElement('div');
        slotDiv.id = 'page-slot';
        const wrapper = document.createElement('div');
        wrapper.id = 'google_ads_iframe_/123/site.com/slot_0__container__';
        const iframe = document.createElement('iframe');
        wrapper.appendChild(iframe);
        slotDiv.appendChild(wrapper);
        document.body.appendChild(slotDiv);
        window.GoldPlayer = function GoldPlayer(opts) {
          goldPlayerOptions = opts;
          goldPlayerSpy(opts);
          this.play = sinon.stub();
        };
        try {
          runRenderer({ adUnitCode: '/123/site.com/slot', doc: document, creativeDoc: iframe.contentDocument });

          expect(goldPlayerSpy.calledOnce).to.be.true;
          expect(goldPlayerOptions.divContainerElement).to.equal(slotDiv);
          expect(wrapper.style.display).to.equal('none');
        } finally {
          delete window.GoldPlayer;
          document.body.removeChild(slotDiv);
        }
      });

      it('falls back to rendering inside a sized same-origin creative iframe', function () {
        const iframe = document.createElement('iframe');
        iframe.width = '640';
        iframe.height = '360';
        document.body.appendChild(iframe);
        iframe.contentWindow.GoldPlayer = function GoldPlayer(opts) {
          goldPlayerOptions = opts;
          goldPlayerSpy(opts);
          this.play = sinon.stub();
        };
        try {
          runRenderer({ adUnitCode: 'missing-slot', doc: buildFakeDoc({}), creativeDoc: iframe.contentDocument });

          expect(goldPlayerSpy.calledOnce).to.be.true;
          expect(goldPlayerOptions.divContainerElement).to.equal(iframe.contentDocument.body);
        } finally {
          document.body.removeChild(iframe);
        }
      });

      it('survives a cross-origin page document and still falls back to the creative iframe', function () {
        // Reaching into a foreign-origin page document throws; the resolver must treat
        // that as "not found" and keep trying, not let the throw abort the render.
        const crossOriginDoc = {
          getElementById: sinon.spy(() => { throw new Error('SecurityError: Blocked a frame with origin'); }),
          defaultView: {}
        };
        const iframe = document.createElement('iframe');
        iframe.width = '640';
        iframe.height = '360';
        document.body.appendChild(iframe);
        iframe.contentWindow.GoldPlayer = function GoldPlayer(opts) {
          goldPlayerOptions = opts;
          goldPlayerSpy(opts);
          this.play = sinon.stub();
        };
        try {
          expect(() => runRenderer({
            adUnitCode: 'missing-slot',
            doc: crossOriginDoc,
            creativeDoc: iframe.contentDocument
          })).to.not.throw();

          expect(crossOriginDoc.getElementById.called).to.be.true;
          expect(goldPlayerSpy.calledOnce).to.be.true;
          expect(goldPlayerOptions.divContainerElement).to.equal(iframe.contentDocument.body);
        } finally {
          document.body.removeChild(iframe);
        }
      });

      it('refuses to render into a collapsed (1x1) creative iframe instead of playing invisibly', function () {
        const iframe = document.createElement('iframe');
        iframe.width = '1';
        iframe.height = '1';
        iframe.style.border = '0';
        document.body.appendChild(iframe);
        try {
          runRenderer({ adUnitCode: 'missing-slot', doc: buildFakeDoc({}), creativeDoc: iframe.contentDocument });

          expect(goldPlayerSpy.called).to.be.false;
        } finally {
          document.body.removeChild(iframe);
        }
      });

      it('resolves a GAM-style adUnitCode (slashes and dots) via getElementById without throwing', function () {
        const gamId = '/123/site.com/slot';
        const slotDiv = { id: gamId, tagName: 'DIV' };
        const doc = buildFakeDoc({ [gamId]: slotDiv });

        expect(() => runRenderer({ adUnitCode: gamId, doc })).to.not.throw();
        expect(goldPlayerOptions.divContainerElement).to.equal(slotDiv);
        expect(doc.getElementById.calledWith(gamId)).to.be.true;
      });

      function interpretVideoResponse(bidRequests) {
        const bidderRequest = deepClone(validBidderRequest);
        bidderRequest.bids = bidRequests;
        const request = spec.buildRequests(bidRequests, bidderRequest);
        const bidResponse = deepClone({ body: validOrtbBidResponse });
        bidResponse.body.seatbid[0].bid[1].adm =
          '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><VAST version="4.0"></VAST>';
        bidResponse.body.seatbid[0].bid[1].ext = { prebid: { type: 'video', meta: { type: 'video_outstream' } } };
        return spec.interpretResponse(bidResponse, request);
      }

      it('keeps its own renderer when the publisher renderer is backupOnly', function () {
        const bidRequests = deepClone(validBidRequests);
        bidRequests[1].renderer = { url: 'https://publisher.example/player.js', render: () => {}, backupOnly: true };
        const response = interpretVideoResponse(bidRequests);

        expect(response.filter(bid => !!bid.renderer).length).to.equal(1);
      });

      it('defers to a publisher renderer that is not backupOnly', function () {
        const bidRequests = deepClone(validBidRequests);
        bidRequests[1].renderer = { url: 'https://publisher.example/player.js', render: () => {} };
        const response = interpretVideoResponse(bidRequests);

        expect(response.filter(bid => !!bid.renderer).length).to.equal(0);
      });

      it('collapses the leftover ad server frame when exactly one is present', function () {
        const slotDiv = document.createElement('div');
        slotDiv.id = 'out-slot-single';
        const wrapper = document.createElement('div');
        wrapper.id = 'google_ads_iframe_/123/out_0__container__';
        wrapper.appendChild(document.createElement('iframe'));
        slotDiv.appendChild(wrapper);
        document.body.appendChild(slotDiv);
        window.GoldPlayer = function GoldPlayer(opts) {
          goldPlayerOptions = opts;
          goldPlayerSpy(opts);
          this.play = sinon.stub();
        };
        try {
          runRenderer({ adUnitCode: 'out-slot-single', doc: document });

          expect(goldPlayerSpy.calledOnce).to.be.true;
          expect(goldPlayerOptions.divContainerElement).to.equal(slotDiv);
          expect(wrapper.style.display).to.equal('none');
        } finally {
          delete window.GoldPlayer;
          document.body.removeChild(slotDiv);
        }
      });

      it('hides nothing when several ad server frames could be the leftover', function () {
        const slotDiv = document.createElement('div');
        slotDiv.id = 'out-slot-crowded';
        const firstWrapper = document.createElement('div');
        firstWrapper.id = 'google_ads_iframe_/123/other_0__container__';
        const secondWrapper = document.createElement('div');
        secondWrapper.id = 'google_ads_iframe_/123/out_0__container__';
        slotDiv.appendChild(firstWrapper);
        slotDiv.appendChild(secondWrapper);
        document.body.appendChild(slotDiv);
        window.GoldPlayer = function GoldPlayer(opts) {
          goldPlayerOptions = opts;
          goldPlayerSpy(opts);
          this.play = sinon.stub();
        };
        try {
          runRenderer({ adUnitCode: 'out-slot-crowded', doc: document });

          expect(goldPlayerSpy.calledOnce).to.be.true;
          expect(firstWrapper.style.display).to.not.equal('none');
          expect(secondWrapper.style.display).to.not.equal('none');
        } finally {
          delete window.GoldPlayer;
          document.body.removeChild(slotDiv);
        }
      });

      it('reports a render failure metric when the player script fails to load', function () {
        const videoBid = interpretVideoResponse(deepClone(validBidRequests)).find(bid => !!bid.renderer);

        videoBid.renderer.callback.error(new Error('blocked'));

        const metricsCall = ajaxStub.getCalls().find((call) => String(call.args[2]).includes('creative_render_failed'));
        expect(metricsCall).to.exist;
        expect(String(metricsCall.args[2])).to.include('player script failed to load');
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
