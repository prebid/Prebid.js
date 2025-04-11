import { expect } from 'chai';
import sinon from 'sinon';
import { spec, storage } from 'modules/goldbachBidAdapter.js';
import { newBidder } from 'src/adapters/bidderFactory.js';
import { deepClone } from 'src/utils.js';
import { BANNER, VIDEO, NATIVE } from 'src/mediaTypes.js';
import { OUTSTREAM } from 'src/video.js';
import { addFPDToBidderRequest } from '../../helpers/fpd.js';
import * as ajaxLib from 'src/ajax.js';

const BIDDER_NAME = 'goldbach'
const ENDPOINT = 'https://goldlayer-api.prod.gbads.net/openrtb/2.5/auction';
const ENDPOINT_COOKIESYNC = 'https://goldlayer-api.prod.gbads.net/cookiesync';

/* Eids */
let eids = [
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
let validBidRequests = [
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
let validBidderRequest = {
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
let validOrtbBidResponse = {
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
    sandbox = sinon.sandbox.create();
    ajaxStub = sandbox.stub(ajaxLib, 'ajax');
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
    let bid = {
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
      let invalidBid = Object.assign({}, bid);
      delete invalidBid.params;
      invalidBid.params = {
        publisherId: undefined
      };
      expect(spec.isBidRequestValid(invalidBid)).to.equal(false);
    });
  });

  describe('buildRequests', function () {
    it('should use defined endpoint', function () {
      let bidRequests = deepClone(validBidRequests);
      let bidderRequest = deepClone(validBidderRequest);

      const request = spec.buildRequests(bidRequests, bidderRequest);
      expect(request.url).to.equal(ENDPOINT);
    })

    it('should parse all bids to a valid openRTB request', function () {
      let bidRequests = deepClone(validBidRequests);
      let bidderRequest = deepClone(validBidderRequest);
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
        let bidRequests = deepClone(validBidRequests);
        let bidderRequest = deepClone(validBidderRequest);
        const request = spec.buildRequests([bidRequests[1]], await addFPDToBidderRequest(bidderRequest));
        const payload = request.data;

        expect(payload.imp.length).to.equal(1);
        expect(payload.imp[0][VIDEO]).to.exist;
        expect(payload.imp[0][VIDEO].w).to.equal(640);
        expect(payload.imp[0][VIDEO].h).to.equal(480);
      });
    }

    it('should set custom config on request', function () {
      let bidRequests = deepClone(validBidRequests);
      let bidderRequest = deepClone(validBidderRequest);
      const request = spec.buildRequests(bidRequests, bidderRequest);
      const payload = request.data;

      expect(payload.ext.goldbach.publisherId).to.equal(bidRequests[0].params.publisherId);
    });

    it('should set gdpr on request', function () {
      let bidRequests = deepClone(validBidRequests);
      let bidderRequest = deepClone(validBidderRequest);
      const request = spec.buildRequests(bidRequests, bidderRequest);
      const payload = request.data;

      expect(!!payload.regs.ext.gdpr).to.equal(bidderRequest.gdprConsent.gdprApplies);
      expect(payload.user.ext.consent).to.equal(bidderRequest.gdprConsent.consentString);
    });

    it('should set custom targeting on request', function () {
      let bidRequests = deepClone(validBidRequests);
      let bidderRequest = deepClone(validBidderRequest);
      const request = spec.buildRequests(bidRequests, bidderRequest);
      const payload = request.data;

      expect(payload.imp[0].ext.goldbach.targetings).to.exist;
      expect(payload.imp[0].ext.goldbach.targetings).to.deep.equal(bidRequests[0].params.customTargeting);
    });
  });

  describe('interpretResponse', function () {
    it('should map response to valid bids (amount)', function () {
      let bidRequest = spec.buildRequests(validBidRequests, validBidderRequest);
      let bidResponse = deepClone({body: validOrtbBidResponse});
      const response = spec.interpretResponse(bidResponse, bidRequest);

      expect(response).to.exist;
      expect(response.length).to.equal(3);
      expect(response.filter(bid => bid.requestId === validBidRequests[0].bidId).length).to.equal(1)
      expect(response.filter(bid => bid.requestId === validBidRequests[1].bidId).length).to.equal(1)
    });

    if (FEATURES.VIDEO) {
      it('should attach a custom video renderer ', function () {
        let bidRequest = spec.buildRequests(validBidRequests, validBidderRequest);
        let bidResponse = deepClone({body: validOrtbBidResponse});
        bidResponse.body.seatbid[0].bid[1].adm = '<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?><VAST version=\"4.0\"></VAST>';
        bidResponse.body.seatbid[0].bid[1].ext = { prebid: { type: 'video', meta: { type: 'video_outstream' } } };
        const response = spec.interpretResponse(bidResponse, bidRequest);

        expect(response).to.exist;
        expect(response.filter(bid => !!bid.renderer).length).to.equal(1);
      });

      it('should set the player accordingly to config', function () {
        let bidRequest = spec.buildRequests(validBidRequests, validBidderRequest);
        let bidResponse = deepClone({body: validOrtbBidResponse});
        bidResponse.body.seatbid[0].bid[1].adm = '<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?><VAST version=\"4.0\"></VAST>';
        bidResponse.body.seatbid[0].bid[1].ext = { prebid: { type: 'video', meta: { type: 'video_outstream' } } };
        validBidRequests[1].mediaTypes.video.playbackmethod = 1;
        const response = spec.interpretResponse(bidResponse, bidRequest);
        const renderer = response.find(bid => !!bid.renderer);
        renderer?.renderer?.render();

        expect(response).to.exist;
        expect(response.filter(bid => !!bid.renderer).length).to.equal(1);
        expect(renderer.renderer.config.documentResolver).to.exist;
      });
    }

    it('should not attach a custom video renderer when VAST url/xml is missing', function () {
      let bidRequest = spec.buildRequests(validBidRequests, validBidderRequest);
      let bidResponse = deepClone({body: validOrtbBidResponse});
      bidResponse.body.seatbid[0].bid[1].adm = undefined;
      bidResponse.body.seatbid[0].bid[1].ext = { prebid: { type: 'video', meta: { type: 'video_outstream' } } };
      const response = spec.interpretResponse(bidResponse, bidRequest);

      expect(response).to.exist;
      expect(response.filter(bid => !!bid.renderer).length).to.equal(0);
    });
  });

  describe('getUserSyncs', function () {
    it('user-syncs with enabled pixel option', function () {
      let gdprConsent = {
        vendorData: {
          purpose: {
            consents: 1
          }
        }};
      let synOptions = {pixelEnabled: true, iframeEnabled: true};
      const userSyncs = spec.getUserSyncs(synOptions, {}, gdprConsent, {});

      expect(userSyncs[0].type).to.equal('image');
      expect(userSyncs[0].url).to.contain(`https://ib.adnxs.com/getuid?${ENDPOINT_COOKIESYNC}`);
      expect(userSyncs[0].url).to.contain('xandrId=$UID');
    })

    it('user-syncs with enabled iframe option', function () {
      let gdprConsent = {
        vendorData: {
          purpose: {
            consents: 1
          }
        }};
      let synOptions = {iframeEnabled: true};
      const userSyncs = spec.getUserSyncs(synOptions, {}, gdprConsent, {});

      expect(userSyncs[0].type).to.equal('iframe');
      expect(userSyncs[0].url).to.contain(`https://ib.adnxs.com/getuid?${ENDPOINT_COOKIESYNC}`);
      expect(userSyncs[0].url).to.contain('xandrId=$UID');
    })
  });

  describe('getUserSyncs storage', function () {
    beforeEach(function () {
      sandbox.stub(storage, 'setDataInLocalStorage');
      sandbox.stub(storage, 'setCookie');
    });

    afterEach(function () {
      sandbox.restore();
    });

    it('should retrieve a uid in userSync call from localStorage', function () {
      sandbox.stub(storage, 'localStorageIsEnabled').callsFake(() => true);
      sandbox.stub(storage, 'getDataFromLocalStorage').callsFake((key) => 'goldbach_uid');
      const gdprConsent = { vendorData: { purpose: { consents: 1 } } };
      const syncOptions = { iframeEnabled: true };
      const userSyncs = spec.getUserSyncs(syncOptions, {}, gdprConsent, {});
      expect(userSyncs[0].url).to.contain('goldbach_uid');
    });

    it('should retrieve a uid in userSync call from cookie', function () {
      sandbox.stub(storage, 'cookiesAreEnabled').callsFake(() => true);
      sandbox.stub(storage, 'getCookie').callsFake((key) => 'goldbach_uid');
      const gdprConsent = { vendorData: { purpose: { consents: 1 } } };
      const syncOptions = { iframeEnabled: true };
      const userSyncs = spec.getUserSyncs(syncOptions, {}, gdprConsent, {});
      expect(userSyncs[0].url).to.contain('goldbach_uid');
    });
  });

  describe('sendLogs', function () {
    it('should not send logs when percentage is not met', function () {
      Math.random.returns(1);
      spec.onTimeout([]);
      expect(ajaxStub.calledOnce).to.be.false;
    });
  });

  describe('onTimeout', function () {
    it('should send logs on timeout', function () {
      spec.onTimeout([]);
      expect(ajaxStub.calledOnce).to.be.true;
    });
  });

  describe('onBidWon', function () {
    it('should send logs on won', function () {
      spec.onBidWon([]);
      expect(ajaxStub.calledOnce).to.be.true;
    });
  });

  describe('onSetTargeting', function () {
    it('should send logs on targeting', function () {
      spec.onSetTargeting([]);
      expect(ajaxStub.calledOnce).to.be.true;
    });
  });

  describe('onBidderError', function () {
    it('should send logs on bidder error', function () {
      spec.onBidderError([]);
      expect(ajaxStub.calledOnce).to.be.true;
    });
  });

  describe('onAdRenderSucceeded', function () {
    it('should send logs on render succeeded', function () {
      spec.onAdRenderSucceeded([]);
      expect(ajaxStub.calledOnce).to.be.true;
    });
  });
});
