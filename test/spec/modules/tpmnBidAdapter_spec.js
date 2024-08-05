/* eslint-disable no-tabs */
import {spec, storage, VIDEO_RENDERER_URL} from 'modules/tpmnBidAdapter.js';
import {generateUUID} from '../../../src/utils.js';
import {expect} from 'chai';
import * as utils from 'src/utils';
import * as sinon from 'sinon';
import 'modules/consentManagementTcf.js';
import {addFPDToBidderRequest} from '../../helpers/fpd.js';

const BIDDER_CODE = 'tpmn';
const BANNER_BID = {
  bidder: BIDDER_CODE,
  params: {
    inventoryId: 1
  },
  mediaTypes: {
    banner: {
      sizes: [
        [300, 250]
      ],
    },
  },
  adUnitCode: 'adUnitCode1',
  bidId: 'bidId',
  bidderRequestId: 'bidderRequestId',
  auctionId: 'auctionId-56a2-4f71-9098-720a68f2f708',
};

const VIDEO_BID = {
  bidder: BIDDER_CODE,
  params: {
    inventoryId: 1
  },
  mediaTypes: {
    video: {
      context: 'outstream',
      api: [1, 2, 4, 6],
      mimes: ['video/mp4'],
      playbackmethod: [2, 4, 6],
      playerSize: [[1024, 768]],
      protocols: [3, 4, 7, 8, 10],
      placement: 1,
      plcmt: 1,
      minduration: 0,
      maxduration: 60,
      startdelay: 0
    },
  },
  adUnitCode: 'adUnitCode1',
  bidId: 'bidId',
  bidderRequestId: 'bidderRequestId',
  auctionId: 'auctionId-56a2-4f71-9098-720a68f2f708',
};

const BIDDER_REQUEST = {
  auctionId: 'auctionId-56a2-4f71-9098-720a68f2f708',
  bidderRequestId: 'bidderRequestId',
  timeout: 500,
  refererInfo: {
    page: 'https://hello-world-page.com/',
    domain: 'hello-world-page.com',
    ref: 'http://example-domain.com/foo',
  }
};

const BANNER_BID_RESPONSE = {
  'id': 'bidderRequestId',
  'bidId': 'bidid',
  'seatbid': [
    {
      'bid': [
        {
          'id': 'id',
          'impid': 'bidId',
          'price': 0.18,
          'adm': '<script>adm</script>',
          'adid': '144762342',
          'burl': 'http://0.0.0.0:8181/burl',
          'adomain': [
            'https://dummydomain.com'
          ],
          'cid': 'cid',
          'crid': 'crid',
          'iurl': 'iurl',
          'cat': [],
          'w': 300,
          'h': 250
        }
      ]
    }
  ],
  'cur': 'USD'
};

const VIDEO_BID_RESPONSE = {
  'id': 'bidderRequestId',
  'bidid': 'bidid',
  'seatbid': [
    {
      'bid': [
        {
          'id': 'id',
          'impid': 'bidId',
          'price': 1.09,
          'adid': '144762342',
          'burl': 'http://0.0.0.0:8181/burl',
          'adm': '<VAST version="4.2"></VAST>',
          'adomain': [
            'https://dummydomain.com'
          ],
          'cid': 'cid',
          'crid': 'crid',
          'iurl': 'iurl',
          'cat': [],
          'h': 768,
          'w': 1024
        }
      ]
    }
  ],
  'cur': 'USD'
};

describe('tpmnAdapterTests', function () {
  let sandbox = sinon.sandbox.create();
  let getCookieStub;
  beforeEach(function () {
    $$PREBID_GLOBAL$$.bidderSettings = {
      tpmn: {
        storageAllowed: true
      }
    };
    sandbox = sinon.sandbox.create();
    getCookieStub = sinon.stub(storage, 'getCookie');
  });

  afterEach(function () {
    sandbox.restore();
    getCookieStub.restore();
    $$PREBID_GLOBAL$$.bidderSettings = {};
  });

  describe('isBidRequestValid()', function () {
    it('should accept request if placementId is passed', function () {
      let bid = {
        bidder: BIDDER_CODE,
        params: {
          inventoryId: 123
        },
        mediaTypes: {
          banner: {
            sizes: [[300, 250]]
          }
        }
      };
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });

    it('should reject requests without params', function () {
      let bid = {
        bidder: BIDDER_CODE,
        params: {}
      };
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should return true when required params found', () => {
      expect(spec.isBidRequestValid(BANNER_BID)).to.equal(true);
      expect(spec.isBidRequestValid(VIDEO_BID)).to.equal(true);
    });
  });

  describe('buildRequests()', function () {
    it('should have gdpr data if applicable', async function () {
      const bid = utils.deepClone(BANNER_BID);

      const req = await addFPDToBidderRequest(Object.assign({}, BIDDER_REQUEST, {
        gdprConsent: {
          consentString: 'consentString',
          gdprApplies: true,
        }
      }));
      let request = spec.buildRequests([bid], req)[0];

      const payload = request.data;
      expect(payload.user.ext).to.have.property('consent', req.gdprConsent.consentString);
      expect(payload.regs.ext).to.have.property('gdpr', 1);
    });

    it('should properly forward ORTB blocking params', function () {
      let bid = utils.deepClone(BANNER_BID);
      bid = utils.mergeDeep(bid, {
        params: { bcat: ['IAB1-1'], badv: ['example.com'], bapp: ['com.example'], battr: [1] },
        mediaTypes: { banner: { battr: [1] } }
      });

      let [request] = spec.buildRequests([bid], BIDDER_REQUEST);

      expect(request).to.exist.and.to.be.an('object');
      const payload = request.data;
      expect(payload).to.have.deep.property('bcat', ['IAB1-1']);
      expect(payload).to.have.deep.property('badv', ['example.com']);
      expect(payload).to.have.deep.property('bapp', ['com.example']);
      expect(payload.imp[0].banner).to.have.deep.property('battr', [1]);
    });

    context('when mediaType is banner', function () {
      it('should build correct request for banner bid with both w, h', () => {
        const bid = utils.deepClone(BANNER_BID);

        const [request] = spec.buildRequests([bid], BIDDER_REQUEST);
        const requestData = request.data;
        // expect(requestData.imp[0].banner).to.equal(null);
        expect(requestData.imp[0].banner.format[0].w).to.equal(300);
        expect(requestData.imp[0].banner.format[0].h).to.equal(250);
      });

      it('should create request data', function () {
        const bid = utils.deepClone(BANNER_BID);

        let [request] = spec.buildRequests([bid], BIDDER_REQUEST);
        expect(request).to.exist.and.to.be.a('object');
        const payload = request.data;
        expect(payload.imp[0]).to.have.property('id', bid.bidId);
      });
    });

    context('when mediaType is video', function () {
      if (FEATURES.VIDEO) {
        it('should return false when there is no video in mediaTypes', () => {
          const bid = utils.deepClone(VIDEO_BID);
          delete bid.mediaTypes.video;

          expect(spec.isBidRequestValid(bid)).to.equal(false);
        });
      }

      if (FEATURES.VIDEO) {
        it('should reutrn false if player size is not set', () => {
          const bid = utils.deepClone(VIDEO_BID);
          delete bid.mediaTypes.video.playerSize;

          expect(spec.isBidRequestValid(bid)).to.equal(false);
        });
      }
      if (FEATURES.VIDEO) {
        it('when mediaType is Video - check', () => {
          const bid = utils.deepClone(VIDEO_BID);
          const check = {
            w: 1024,
            h: 768,
            mimes: ['video/mp4'],
            playbackmethod: [2, 4, 6],
            api: [1, 2, 4, 6],
            protocols: [3, 4, 7, 8, 10],
            placement: 1,
            minduration: 0,
            maxduration: 60,
            startdelay: 0,
            plcmt: 1
          };
          expect(spec.isBidRequestValid(bid)).to.equal(true);
          const requests = spec.buildRequests([bid], BIDDER_REQUEST);
          const request = requests[0].data;
          expect(request.imp[0].video).to.deep.include({...check});
        });
      }

      if (FEATURES.VIDEO) {
        it('when mediaType New Video', () => {
          const NEW_VIDEO_BID = {
            'bidder': 'tpmn',
            'params': {'inventoryId': 2, 'bidFloor': 2},
            'userId': {'pubcid': '88a49ee6-beeb-4dd6-92ac-3b6060e127e1'},
            'mediaTypes': {
              'video': {
                'context': 'outstream',
                'mimes': ['video/mp4'],
                'playerSize': [[1024, 768]],
                'playbackmethod': [2, 4, 6],
                'protocols': [3, 4],
                'api': [1, 2, 3, 6],
                'placement': 1,
                'minduration': 0,
                'maxduration': 30,
                'startdelay': 0,
                'skip': 1,
                'plcmt': 4
              }
            },
          };

          const check = {
            w: 1024,
            h: 768,
            mimes: [ 'video/mp4' ],
            playbackmethod: [2, 4, 6],
            api: [1, 2, 3, 6],
            protocols: [3, 4],
            placement: 1,
            minduration: 0,
            maxduration: 30,
            startdelay: 0,
            skip: 1,
            plcmt: 4
          }

          expect(spec.isBidRequestValid(NEW_VIDEO_BID)).to.equal(true);
          let requests = spec.buildRequests([NEW_VIDEO_BID], BIDDER_REQUEST);
          const request = requests[0].data;
          expect(request.imp[0].video.w).to.equal(check.w);
          expect(request.imp[0].video.h).to.equal(check.h);
          expect(request.imp[0].video.placement).to.equal(check.placement);
          expect(request.imp[0].video.minduration).to.equal(check.minduration);
          expect(request.imp[0].video.maxduration).to.equal(check.maxduration);
          expect(request.imp[0].video.startdelay).to.equal(check.startdelay);
          expect(request.imp[0].video.skip).to.equal(check.skip);
          expect(request.imp[0].video.plcmt).to.equal(check.plcmt);
          expect(request.imp[0].video.mimes).to.deep.have.same.members(check.mimes);
          expect(request.imp[0].video.playbackmethod).to.deep.have.same.members(check.playbackmethod);
          expect(request.imp[0].video.api).to.deep.have.same.members(check.api);
          expect(request.imp[0].video.protocols).to.deep.have.same.members(check.protocols);
        });
      }

      if (FEATURES.VIDEO) {
        it('should use bidder video params if they are set', () => {
          let bid = utils.deepClone(VIDEO_BID);
          const check = {
            api: [1, 2],
            mimes: ['video/mp4', 'video/x-flv'],
            playbackmethod: [3, 4],
            protocols: [5, 6],
            placement: 1,
            plcmt: 1,
            minduration: 0,
            maxduration: 30,
            startdelay: 0,
            w: 640,
            h: 480

          };
          bid.mediaTypes.video = {...check};
          bid.mediaTypes.video.context = 'instream';
          bid.mediaTypes.video.playerSize = [[640, 480]];

          expect(spec.isBidRequestValid(bid)).to.equal(true);
          const requests = spec.buildRequests([bid], BIDDER_REQUEST);
          const request = requests[0].data;
          expect(request.imp[0].video).to.deep.include({...check});
        });
      }
    });
  });

  describe('interpretResponse()', function () {
    context('when mediaType is banner', function () {
      it('should correctly interpret valid banner response', function () {
        const bid = utils.deepClone(BANNER_BID);
        const [request] = spec.buildRequests([bid], BIDDER_REQUEST);
        const response = utils.deepClone(BANNER_BID_RESPONSE);

        const bids = spec.interpretResponse({ body: response }, request);
        expect(bids).to.be.an('array').that.is.not.empty;

        expect(bids[0].mediaType).to.equal('banner');
        expect(bids[0].burl).to.equal(BANNER_BID_RESPONSE.seatbid[0].bid[0].burl);
        expect(bids[0].currency).to.equal('USD');
        expect(bids[0].requestId).to.equal(BANNER_BID_RESPONSE.seatbid[0].bid[0].impid);
        expect(bids[0].cpm).to.equal(BANNER_BID_RESPONSE.seatbid[0].bid[0].price);
        expect(bids[0].width).to.equal(BANNER_BID_RESPONSE.seatbid[0].bid[0].w);
        expect(bids[0].height).to.equal(BANNER_BID_RESPONSE.seatbid[0].bid[0].h);
        expect(bids[0].ad).to.equal(BANNER_BID_RESPONSE.seatbid[0].bid[0].adm);
        expect(bids[0].creativeId).to.equal(BANNER_BID_RESPONSE.seatbid[0].bid[0].crid);
        expect(bids[0].meta.advertiserDomains[0]).to.equal('https://dummydomain.com');
        expect(bids[0].ttl).to.equal(500);
        expect(bids[0].netRevenue).to.equal(true);
      });

      it('should handle empty bid response', function () {
        const bid = utils.deepClone(BANNER_BID);

        let request = spec.buildRequests([bid], BIDDER_REQUEST)[0];
        const EMPTY_RESP = Object.assign({}, BANNER_BID_RESPONSE, { 'body': {} });
        const bids = spec.interpretResponse(EMPTY_RESP, request);
        expect(bids).to.be.empty;
      });
    });
    if (FEATURES.VIDEO) {
      context('when mediaType is video', function () {
        it('should correctly interpret valid instream video response', () => {
          const bid = utils.deepClone(VIDEO_BID);

          const [request] = spec.buildRequests([bid], BIDDER_REQUEST);
          const bids = spec.interpretResponse({ body: VIDEO_BID_RESPONSE }, request);
          expect(bids).to.be.an('array').that.is.not.empty;

          expect(bids[0].mediaType).to.equal('video');
          expect(bids[0].burl).to.equal(VIDEO_BID_RESPONSE.seatbid[0].bid[0].burl);
          expect(bids[0].currency).to.equal('USD');
          expect(bids[0].requestId).to.equal(VIDEO_BID_RESPONSE.seatbid[0].bid[0].impid);
          expect(bids[0].cpm).to.equal(VIDEO_BID_RESPONSE.seatbid[0].bid[0].price);
          expect(bids[0].width).to.equal(VIDEO_BID_RESPONSE.seatbid[0].bid[0].w);
          expect(bids[0].height).to.equal(VIDEO_BID_RESPONSE.seatbid[0].bid[0].h);
          expect(bids[0].vastXml).to.equal(VIDEO_BID_RESPONSE.seatbid[0].bid[0].adm);
          expect(bids[0].rendererUrl).to.equal(VIDEO_RENDERER_URL);
          expect(bids[0].creativeId).to.equal(VIDEO_BID_RESPONSE.seatbid[0].bid[0].crid);
          expect(bids[0].meta.advertiserDomains[0]).to.equal('https://dummydomain.com');
          expect(bids[0].ttl).to.equal(500);
          expect(bids[0].netRevenue).to.equal(true);
        });
      });
    }
  });

  describe('getUserSync', function () {
    const KEY_ID = 'uuid';
    const TMP_UUID = generateUUID().replace(/-/g, '');

    it('getCookie mock Test', () => {
      const uuid = storage.getCookie(KEY_ID);
      expect(uuid).to.equal(undefined);
    });

    it('getCookie mock Test', () => {
      expect(TMP_UUID.length).to.equal(32);
      getCookieStub.withArgs(KEY_ID).returns(TMP_UUID);
      const uuid = storage.getCookie(KEY_ID);
      expect(uuid).to.equal(TMP_UUID);
    });

    it('case 1 -> allow iframe', () => {
      const syncs = spec.getUserSyncs({iframeEnabled: true, pixelEnabled: true});
      expect(syncs.length).to.equal(1);
      expect(syncs[0].type).to.equal('iframe');
    });

    it('case 2 -> allow pixel with static sync', () => {
      const syncs = spec.getUserSyncs({ iframeEnabled: false, pixelEnabled: true });
      expect(syncs.length).to.be.equal(4);
      expect(syncs[0].type).to.be.equal('image');
      expect(syncs[1].type).to.be.equal('image');
      expect(syncs[2].type).to.be.equal('image');
      expect(syncs[3].type).to.be.equal('image');
    });
  });
});
