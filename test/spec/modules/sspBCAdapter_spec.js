import { assert, expect } from 'chai';
import { spec } from 'modules/sspBCAdapter.js';
import * as utils from 'src/utils.js';

const BIDDER_CODE = 'sspBC';
const BIDDER_URL = 'https://ssp.wp.pl/bidder/';
const SYNC_URL = 'https://ssp.wp.pl/bidder/usersync';

describe('SSPBC adapter', function () {
  function prepareTestData() {
    const bidderRequestId = '1041bb47b0fafa';
    const auctionId = '8eda6d06-3d7c-4a94-9b35-74e42fbb3089';
    const transactionId = '50259989-b5c0-4edf-8f47-b1ef5fbedf39';
    const gdprConsent = {
      consentString: 'BOtq-3dOtq-30BIABCPLC4-AAAAthr_7__7-_9_-_f__9uj3Or_v_f__30ccL59v_h_7v-_7fi_20nV4u_1vft9yfk1-5ctDztp505iakivHmqNeb9v_mz1_5pRP78k89r7337Ew_v8_v-b7JCON_Ig',
      gdprApplies: true,
    }
    const bids = [{
      adUnitCode: 'test_wideboard',
      bidder: BIDDER_CODE,
      mediaTypes: {
        banner: {
          sizes: [
            [728, 90],
            [750, 100],
            [750, 200]
          ]
        }
      },
      sizes: [
        [728, 90],
        [750, 100],
        [750, 200]
      ],
      params: {
        id: '003',
        siteId: '8816',
      },
      auctionId,
      bidderRequestId,
      bidId: auctionId + '1',
      transactionId,
    },
    {
      adUnitCode: 'test_rectangle',
      bidder: BIDDER_CODE,
      mediaTypes: {
        banner: {
          sizes: [
            [300, 250]
          ]
        }
      },
      sizes: [
        [300, 250]
      ],
      params: {
        id: '005',
        siteId: '8816',
      },
      auctionId,
      bidderRequestId,
      bidId: auctionId + '1',
      transactionId,
    }
    ];
    const bids_test = [{
      adUnitCode: 'test_wideboard',
      bidder: BIDDER_CODE,
      mediaTypes: {
        banner: {
          sizes: [
            [970, 300],
            [750, 300],
            [750, 200],
            [750, 100],
            [300, 250]
          ]
        }
      },
      sizes: [
        [970, 300],
        [750, 300],
        [750, 200],
        [750, 100],
        [300, 250]
      ],
      params: {
        id: '005',
        siteId: '235911',
        test: 1
      },
      auctionId,
      bidderRequestId,
      bidId: auctionId + '1',
      transactionId,
    }];
    const bidRequest = {
      auctionId,
      bidderCode: BIDDER_CODE,
      bidderRequestId,
      bids,
      gdprConsent,
      refererInfo: {
        reachedTop: true,
        referer: 'https://test.site.pl/',
        stack: ['https://test.site.pl/'],
      }
    };
    const bidRequestSingle = {
      auctionId,
      bidderCode: BIDDER_CODE,
      bidderRequestId,
      bids: [bids[0]],
      gdprConsent,
      refererInfo: {
        reachedTop: true,
        referer: 'https://test.site.pl/',
        stack: ['https://test.site.pl/'],
      }
    };
    const bidRequestTest = {
      auctionId,
      bidderCode: BIDDER_CODE,
      bidderRequestId,
      bids: bids_test,
      gdprConsent,
      refererInfo: {
        reachedTop: true,
        referer: 'https://test.site.pl/',
        stack: ['https://test.site.pl/'],
      }
    };
    const bidRequestTestNoGDPR = {
      auctionId,
      bidderCode: BIDDER_CODE,
      bidderRequestId,
      bids: bids_test,
      refererInfo: {
        reachedTop: true,
        referer: 'https://test.site.pl/',
        stack: ['https://test.site.pl/'],
      }
    };
    const serverResponse = {
      'body': {
        'id': auctionId,
        'seatbid': [{
          'bid': [{
            'id': '3347324c-6889-46d2-a800-ae78a5214c06',
            'impid': '003',
            'price': 1,
            'adid': 'lxHWkB7OnZeso3QiN1N4',
            'nurl': '',
            'adm': 'AD CODE 1',
            'adomain': ['adomain.pl'],
            'cid': 'BZ4gAg21T5nNtxlUCDSW',
            'crid': 'lxHWkB7OnZeso3QiN1N4',
            'w': 728,
            'h': 90
          }],
          'seat': 'dsp1',
          'group': 0
        }, {
          'bid': [{
            'id': '2d766853-ea07-4529-8299-5f0ebadc546a',
            'impid': '005',
            'price': 2,
            'adm': 'AD CODE 2',
            'cid': '57744',
            'crid': '858252',
            'w': 300,
            'h': 250
          }],
          'seat': 'dsp2',
          'group': 0
        }],
        'cur': 'PLN'
      }
    };
    const serverResponseSingle = {
      'body': {
        'id': auctionId,
        'seatbid': [{
          'bid': [{
            'id': '3347324c-6889-46d2-a800-ae78a5214c06',
            'impid': '003',
            'price': 1,
            'adid': 'lxHWkB7OnZeso3QiN1N4',
            'nurl': '',
            'adm': 'AD CODE 1',
            'adomain': ['adomain.pl'],
            'cid': 'BZ4gAg21T5nNtxlUCDSW',
            'crid': 'lxHWkB7OnZeso3QiN1N4',
            'w': 728,
            'h': 90
          }],
          'seat': 'dsp1',
          'group': 0
        }],
        'cur': 'PLN'
      }
    };
    const emptyResponse = {
      'body': {
        'id': auctionId,
      }
    }
    return {
      bids,
      bids_test,
      bidRequest,
      bidRequestSingle,
      bidRequestTest,
      bidRequestTestNoGDPR,
      serverResponse,
      serverResponseSingle,
      emptyResponse
    };
  };

  describe('dependencies', function () {
    it('utils should contain required functions', function () {
      expect(utils.parseUrl).to.be.a('function');
      expect(utils.deepAccess).to.be.a('function');
      expect(utils.logWarn).to.be.a('function');
    });
  });

  describe('isBidRequestValid', function () {
    const { bids } = prepareTestData();
    let bid = bids[0];

    it('should return true when required params found', function () {
      assert(spec.isBidRequestValid(bid));
    });

    it('should return false when required params are missing', function () {
      bid.params.id = undefined;
      assert.isFalse(spec.isBidRequestValid(bid));
    });
  });

  describe('buildRequests', function () {
    const { bids, bidRequest, bidRequestSingle } = prepareTestData();
    const request = spec.buildRequests(bids, bidRequest);
    const requestSingle = spec.buildRequests([bids[0]], bidRequestSingle);
    const payload = request ? JSON.parse(request.data) : { site: false, imp: false };
    const payloadSingle = request ? JSON.parse(requestSingle.data) : { site: false, imp: false };

    it('should send bid request to endpoint via POST', function () {
      expect(request.url).to.contain(BIDDER_URL);
      expect(request.method).to.equal('POST');
    });

    it('should contain prebid and bidder versions', function () {
      expect(request.url).to.contain('bdver');
      expect(request.url).to.contain('pbver=$prebid.version$');
    });

    it('should create one imp object per bid', function () {
      expect(payload.imp.length).to.equal(bids.length);
      expect(payloadSingle.imp.length).to.equal(1);
    });

    it('should save bidder request data', function () {
      expect(request.bidderRequest).to.deep.equal(bidRequest);
    });

    it('should send site Id from bidder params', function () {
      expect(payload.site.id).to.equal(bids[0].params.siteId);
    });

    it('should send page url from refererInfo', function () {
      expect(payload.site.page).to.equal(bidRequest.refererInfo.referer);
    });

    it('should send gdpr data', function () {
      expect(payload.regs).to.be.an('object').and.to.have.property('[ortb_extensions.gdpr]', 1);
      expect(payload.user).to.be.an('object').and.to.have.property('[ortb_extensions.consent]', bidRequest.gdprConsent.consentString);
    });
  });

  describe('interpretResponse', function () {
    const { bids, emptyResponse, serverResponse, serverResponseSingle, bidRequest, bidRequestSingle } = prepareTestData();
    const request = spec.buildRequests(bids, bidRequest);
    const requestSingle = spec.buildRequests([bids[0]], bidRequestSingle);

    it('should handle nobid responses', function () {
      let result = spec.interpretResponse(emptyResponse, request);
      expect(result.length).to.equal(0);
    });

    it('should create bids from non-empty responses', function () {
      let result = spec.interpretResponse(serverResponse, request);
      let resultSingle = spec.interpretResponse(serverResponseSingle, requestSingle);

      expect(result.length).to.equal(bids.length);
      expect(resultSingle.length).to.equal(1);
      expect(resultSingle[0]).to.have.keys('ad', 'cpm', 'width', 'height', 'bidderCode', 'mediaType', 'meta', 'requestId', 'creativeId', 'currency', 'netRevenue', 'ttl');
    });

    it('should handle a partial response', function () {
      let resultPartial = spec.interpretResponse(serverResponseSingle, request);
      expect(resultPartial.length).to.equal(1);
    });

    it('banner ad code should contain required variables', function () {
      let resultSingle = spec.interpretResponse(serverResponseSingle, requestSingle);
      let adcode = resultSingle[0].ad;
      expect(adcode).to.be.a('string');
      expect(adcode).to.contain('window.rekid');
      expect(adcode).to.contain('window.mcad');
      expect(adcode).to.contain('window.gdpr');
      expect(adcode).to.contain('window.page');
    })
  });

  describe('getUserSyncs', function () {
    let syncResultAll = spec.getUserSyncs({ iframeEnabled: true, pixelEnabled: true });
    let syncResultImage = spec.getUserSyncs({ iframeEnabled: false, pixelEnabled: true });
    let syncResultNone = spec.getUserSyncs({ iframeEnabled: false, pixelEnabled: false });

    it('should provide correct url, if frame sync is allowed', function () {
      expect(syncResultAll).to.have.length(1);
      expect(syncResultAll[0].url).to.be.equal(SYNC_URL);
    });

    it('should send no syncs, if frame sync is not allowed', function () {
      expect(syncResultImage).to.be.undefined;
      expect(syncResultNone).to.be.undefined;
    });
  });
});
