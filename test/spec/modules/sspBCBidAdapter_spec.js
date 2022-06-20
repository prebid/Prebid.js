import { assert, expect } from 'chai';
import { spec } from 'modules/sspBCBidAdapter.js';
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
      bidId: auctionId + '2',
      transactionId,
    }
    ];
    const bid_OneCode = {
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
      auctionId,
      bidderRequestId,
      bidId: auctionId + '1',
      transactionId,
    };
    const bid_native = {
      adUnitCode: 'test_native',
      bidder: BIDDER_CODE,
      mediaTypes: {
        native: {
          image: {
            required: true,
            sizes: [150, 50],
          },
          title: {
            required: true,
            len: 80
          },
          sponsoredBy: {
            required: true,
          },
          clickUrl: {
            required: true,
          },
          privacyLink: {
            required: false,
          },
          body: {
            required: true,
          },
          icon: {
            required: true,
            sizes: [50, 50]
          }
        }
      },
      sizes: [
        [1, 1],
      ],
      auctionId,
      bidderRequestId,
      bidId: auctionId + '1',
      transactionId,
    };
    const bid_video = {
      adUnitCode: 'test_video',
      bidder: BIDDER_CODE,
      mediaTypes: {
        video: {
          context: 'instream',
          playerSize: [[640, 480]],
          mimes: ['video/mp4', 'video/x-ms-wmv', 'video/webm', 'video/3gpp', 'application/javascript'],
          protocols: [2, 3, 5, 6],
          api: [2],
          maxduration: 30,
          linearity: 1
        }
      },
      sizes: [
        [640, 480],
      ],
      auctionId,
      bidderRequestId,
      bidId: auctionId + '1',
      transactionId,
    };
    const bids_timeouted = [{
      adUnitCode: 'test_wideboard',
      bidder: BIDDER_CODE,
      params: [{
        id: '003',
        siteId: '8816',
      }],
      auctionId,
      bidId: auctionId + '1',
      timeout: 100,
    },
    {
      adUnitCode: 'test_rectangle',
      bidder: BIDDER_CODE,
      params: [{
        id: '005',
        siteId: '8816',
      }],
      auctionId,
      bidId: auctionId + '2',
      timeout: 100,
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
        page: 'https://test.site.pl/',
        domain: 'test.site.pl',
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
        page: 'https://test.site.pl/',
        domain: 'test.site.pl',
        stack: ['https://test.site.pl/'],
      }
    };
    const bidRequestNative = {
      auctionId,
      bidderCode: BIDDER_CODE,
      bidderRequestId,
      bids: [bid_native],
      gdprConsent,
      refererInfo: {
        reachedTop: true,
        page: 'https://test.site.pl/',
        domain: 'test.site.pl',
        stack: ['https://test.site.pl/'],
      }
    };
    const bidRequestVideo = {
      auctionId,
      bidderCode: BIDDER_CODE,
      bidderRequestId,
      bids: [bid_video],
      gdprConsent,
      refererInfo: {
        reachedTop: true,
        page: 'https://test.site.pl/',
        domain: 'test.site.pl',
        stack: ['https://test.site.pl/'],
      }
    };
    const bidRequestOneCode = {
      auctionId,
      bidderCode: BIDDER_CODE,
      bidderRequestId,
      bids: [bid_OneCode],
      gdprConsent,
      refererInfo: {
        reachedTop: true,
        page: 'https://test.site.pl/',
        domain: 'test.site.pl',
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
        page: 'https://test.site.pl/',
        domain: 'test.site.pl',
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
        page: 'https://test.site.pl/',
        domain: 'test.site.pl',
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
            'siteid': '8816',
            'slotid': '003',
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
            'siteid': '8816',
            'slotid': '005',
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
            'siteid': '8816',
            'slotid': '003',
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
    const serverResponseOneCode = {
      'body': {
        'id': auctionId,
        'seatbid': [{
          'bid': [{
            'id': '3347324c-6889-46d2-a800-ae78a5214c06',
            'impid': 'bidid-' + auctionId + '1',
            'price': 1,
            'adid': 'lxHWkB7OnZeso3QiN1N4',
            'nurl': '',
            'adm': 'AD CODE 1',
            'adomain': ['adomain.pl'],
            'cid': 'BZ4gAg21T5nNtxlUCDSW',
            'crid': 'lxHWkB7OnZeso3QiN1N4',
            'w': 728,
            'h': 90,
            'ext': {
              'siteid': '8816',
              'slotid': '003',
            },
          }],
          'seat': 'dsp1',
          'group': 0
        }],
        'cur': 'PLN'
      }
    };
    const serverResponseVideo = {
      'body': {
        'id': auctionId,
        'seatbid': [{
          'bid': [{
            'id': '3347324c-6889-46d2-a800-ae78a5214c06',
            'impid': 'bidid-' + auctionId + '1',
            'price': 1,
            'adid': 'lxHWkB7OnZeso3QiN1N4',
            'nurl': '',
            'adm': '<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?><VAST version=\"3.0\"><Ad id=\"12345\"><Wrapper><AdSystem version=\"3.0\">adnxs</AdSystem><VASTAdTagURI><![CDATA[https://video.tag.uri]]></VASTAdTagURI><Impression><![CDATA[https://video.tag.tracker]]></Impression><Creatives><Creative adID=\"305683174\"><Linear></Linear></Creative></Creatives></Wrapper></Ad></VAST>',
            'adomain': ['adomain.pl'],
            'cid': 'BZ4gAg21T5nNtxlUCDSW',
            'crid': 'lxHWkB7OnZeso3QiN1N4',
            'w': 640,
            'h': 480,
            'ext': {
              'siteid': '8816',
              'slotid': '150',
              'cache': 'https://video.tag.cache'
            },
          }],
          'seat': 'dsp1',
          'group': 0
        }],
        'cur': 'PLN'
      }
    };
    const serverResponseNative = {
      'body': {
        'id': auctionId,
        'seatbid': [{
          'bid': [{
            'id': '3347324c-6889-46d2-a800-ae78a5214c06',
            'impid': 'bidid-' + auctionId + '1',
            'price': 1,
            'adid': 'lxHWkB7OnZeso3QiN1N4',
            'nurl': '',
            'adm': '{\"native\":{\"assets\":[{\"id\":3,\"img\":{\"url\":\"native_image\",\"w\":300,\"h\":150}},{\"id\":2,\"img\":{\"url\":\"native_icon\",\"w\":50,\"h\":50}},{\"id\":0,\"title\":{\"text\":\"native_title\"}},{\"id\":5,\"data\":{\"value\":\"native adomain\"}},{\"id\":4,\"data\":{\"value\":\"native_text\"}}],\"link\":{\"url\":\"native_url\"},\"imptrackers\":[\"native_tracker\"]}}',
            'adomain': ['adomain.pl'],
            'cid': 'BZ4gAg21T5nNtxlUCDSW',
            'crid': 'lxHWkB7OnZeso3QiN1N4',
            'ext': {
              'siteid': '8816',
              'slotid': '80',
            },
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
      bid_OneCode,
      bids,
      bids_test,
      bids_timeouted,
      bid_native,
      bid_video,
      bidRequest,
      bidRequestOneCode,
      bidRequestSingle,
      bidRequestNative,
      bidRequestVideo,
      bidRequestTest,
      bidRequestTestNoGDPR,
      serverResponse,
      serverResponseOneCode,
      serverResponseSingle,
      serverResponseVideo,
      serverResponseNative,
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

    it('should always return true whether bid has params (standard) or not (OneCode)', function () {
      assert(spec.isBidRequestValid(bid));
      bid.params.id = undefined;
      assert(spec.isBidRequestValid(bid));
    });
  });

  describe('buildRequests', function () {
    const { bids, bid_native, bid_video, bidRequest, bidRequestSingle, bidRequestNative, bidRequestVideo } = prepareTestData();
    const request = spec.buildRequests(bids, bidRequest);
    const requestSingle = spec.buildRequests([bids[0]], bidRequestSingle);
    const requestNative = spec.buildRequests([bid_native], bidRequestNative);
    const requestVideo = spec.buildRequests([bid_video], bidRequestVideo);
    const payload = request ? JSON.parse(request.data) : { site: false, imp: false };
    const payloadSingle = requestSingle ? JSON.parse(requestSingle.data) : { site: false, imp: false };
    const payloadNative = requestNative ? JSON.parse(requestNative.data) : { site: false, imp: false };
    const payloadVideo = requestVideo ? JSON.parse(requestVideo.data) : { site: false, imp: false };

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
      expect(payload.site.page).to.equal(bidRequest.refererInfo.page);
    });

    it('should send gdpr data', function () {
      expect(payload.regs).to.be.an('object').and.to.have.property('gdpr', 1);
      expect(payload.user).to.be.an('object').and.to.have.property('consent', bidRequest.gdprConsent.consentString);
    });

    it('should send net info and pvid', function () {
      expect(payload.user).to.be.an('object').and.to.have.property('data').that.is.an('array');

      const userData = payload.user.data;
      expect(userData.length).to.equal(2);

      const netInfo = userData[0];
      expect(netInfo.id).to.equal('12');
      expect(netInfo.name).to.equal('NetInfo');
      expect(netInfo).to.have.property('segment').that.is.an('array');

      const pvid = userData[1];
      expect(pvid.id).to.equal('7');
      expect(pvid.name).to.equal('pvid');
      expect(pvid).to.have.property('segment').that.is.an('array');
      expect(pvid.segment[0]).to.have.property('value');
    });

    it('pvid should be constant on a single page view', function () {
      const userData1 = payload.user.data;
      const userData2 = payloadNative.user.data;
      const pvid1 = userData1[1];
      const pvid2 = userData2[1];

      expect(pvid1.segment[0].value).to.equal(pvid2.segment[0].value);
    });

    it('should build correct native payload', function () {
      const nativeAssets = payloadNative.imp && payloadNative.imp[0].native.request;

      expect(payloadNative.imp.length).to.equal(1);
      expect(nativeAssets).to.contain('{"id":0,"required":true,"title":{"len":80}}');
      expect(nativeAssets).to.contain('{"id":2,"required":true,"img":{"type":1,"w":50,"h":50}}');
      expect(nativeAssets).to.contain('{"id":3,"required":true,"img":{"type":3,"w":150,"h":50}}');
      expect(nativeAssets).to.contain('{"id":4,"required":true,"data":{"type":2}');
      expect(nativeAssets).to.contain('{"id":5,"required":true,"data":{"type":1}');
    });

    it('should build correct video payload', function () {
      const videoAssets = payloadVideo.imp && payloadVideo.imp[0].video;

      expect(payloadVideo.imp.length).to.equal(1);
      expect(videoAssets).to.have.property('w').that.equals(640);
      expect(videoAssets).to.have.property('h').that.equals(480);
      expect(videoAssets).to.have.property('context').that.equals('instream');
      expect(videoAssets).to.have.property('maxduration').that.equals(30);
      expect(videoAssets).to.have.property('linearity').that.equals(1);
      expect(videoAssets).to.have.property('mimes').that.is.an('array');
      expect(videoAssets).to.have.property('protocols').that.is.an('array');
      expect(videoAssets).to.have.property('api').that.is.an('array');
    });

    it('should create auxilary placement identifier (size_numUsed), that is constant for a given adUnit', function () {
      const extAssets1 = payload.imp && payload.imp[0].ext.data;
      const extAssets2 = payloadSingle.imp && payloadSingle.imp[0].ext.data;

      /*
        note that payload comes from first, and payloadSingle from second auction in the test run
        also, since both have same adUnitName, value of pbsize property should be the same
      */
      expect(extAssets1).to.have.property('pbsize').that.equals('750x200_1')
      expect(extAssets2).to.have.property('pbsize').that.equals('750x200_1')
    });
  });

  describe('interpretResponse', function () {
    const { bid_OneCode, bid_video, bid_native, bids, emptyResponse, serverResponse, serverResponseOneCode, serverResponseSingle, serverResponseVideo, serverResponseNative, bidRequest, bidRequestOneCode, bidRequestSingle, bidRequestVideo, bidRequestNative } = prepareTestData();
    const request = spec.buildRequests(bids, bidRequest);
    const requestSingle = spec.buildRequests([bids[0]], bidRequestSingle);
    const requestOneCode = spec.buildRequests([bid_OneCode], bidRequestOneCode);
    const requestVideo = spec.buildRequests([bid_video], bidRequestVideo);
    const requestNative = spec.buildRequests([bid_native], bidRequestNative);

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

    it('should create bid from OneCode (parameter-less) request, if response contains siteId', function () {
      let resultOneCode = spec.interpretResponse(serverResponseOneCode, requestOneCode);

      expect(resultOneCode.length).to.equal(1);
      expect(resultOneCode[0]).to.have.keys('ad', 'cpm', 'width', 'height', 'bidderCode', 'mediaType', 'meta', 'requestId', 'creativeId', 'currency', 'netRevenue', 'ttl');
    });

    it('should not create bid from OneCode (parameter-less) request, if response does not contain siteId', function () {
      let resultOneCodeNoMatch = spec.interpretResponse(serverResponse, requestOneCode);

      expect(resultOneCodeNoMatch.length).to.equal(0);
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
      expect(adcode).to.contain('window.requestPVID');
    });

    it('should create a correct video bid', function () {
      let resultVideo = spec.interpretResponse(serverResponseVideo, requestVideo);

      expect(resultVideo.length).to.equal(1);

      let videoBid = resultVideo[0];
      expect(videoBid).to.have.keys('adType', 'bidderCode', 'cpm', 'creativeId', 'currency', 'width', 'height', 'meta', 'mediaType', 'netRevenue', 'requestId', 'ttl', 'vastContent', 'vastXml', 'vastUrl');
      expect(videoBid.adType).to.equal('instream');
      expect(videoBid.mediaType).to.equal('video');
      expect(videoBid.vastXml).to.match(/^<\?xml.*<\/VAST>$/);
      expect(videoBid.vastContent).to.match(/^<\?xml.*<\/VAST>$/);
      expect(videoBid.vastUrl).to.equal('https://video.tag.cache');
    });

    it('should create a correct native bid', function () {
      let resultNative = spec.interpretResponse(serverResponseNative, requestNative);

      expect(resultNative.length).to.equal(1);

      let nativeBid = resultNative[0];
      expect(nativeBid).to.have.keys('bidderCode', 'cpm', 'creativeId', 'currency', 'width', 'height', 'meta', 'mediaType', 'netRevenue', 'requestId', 'ttl', 'native');
      expect(nativeBid.native).to.have.keys('image', 'icon', 'title', 'sponsoredBy', 'body', 'clickUrl', 'impressionTrackers', 'javascriptTrackers');
    });
  });

  describe('getUserSyncs', function () {
    let syncResultAll = spec.getUserSyncs({ iframeEnabled: true, pixelEnabled: true });
    let syncResultImage = spec.getUserSyncs({ iframeEnabled: false, pixelEnabled: true });
    let syncResultNone = spec.getUserSyncs({ iframeEnabled: false, pixelEnabled: false });

    it('should provide correct url, if frame sync is allowed', function () {
      expect(syncResultAll).to.have.length(1);
      expect(syncResultAll[0].url).to.have.string(SYNC_URL);
    });

    it('should send no syncs, if frame sync is not allowed', function () {
      expect(syncResultImage).to.have.length(0); ;
      expect(syncResultNone).to.have.length(0); ;
    });
  });

  describe('onBidWon', function () {
    it('should generate no notification if bid is undefined', function () {
      let notificationPayload = spec.onBidWon();
      expect(notificationPayload).to.be.undefined;
    });

    it('should generate notification with event name and request/adUnit data, if correct bid is provided. Should also contain site/slot data as arrays.', function () {
      const { bids } = prepareTestData();
      let bid = bids[0];

      let notificationPayload = spec.onBidWon(bid);
      expect(notificationPayload).to.have.property('event').that.equals('bidWon');
      expect(notificationPayload).to.have.property('requestId').that.equals(bid.auctionId);
      expect(notificationPayload).to.have.property('tagid').that.deep.equals([bid.adUnitCode]);
      expect(notificationPayload).to.have.property('siteId').that.is.an('array');
      expect(notificationPayload).to.have.property('slotId').that.is.an('array');
    });
  });

  describe('onTimeout', function () {
    it('should generate no notification if timeout data is undefined / has no bids', function () {
      let notificationPayloadUndefined = spec.onTimeout();
      let notificationPayloadNoBids = spec.onTimeout([]);

      expect(notificationPayloadUndefined).to.be.undefined;
      expect(notificationPayloadNoBids).to.be.undefined;
    });

    it('should generate single notification for any number of timeouted bids', function () {
      const { bids_timeouted } = prepareTestData();
      let notificationPayload = spec.onTimeout(bids_timeouted);

      expect(notificationPayload).to.have.property('event').that.equals('timeout');
      expect(notificationPayload).to.have.property('requestId').that.equals(bids_timeouted[0].auctionId);
      expect(notificationPayload).to.have.property('tagid').that.deep.equals([bids_timeouted[0].adUnitCode, bids_timeouted[1].adUnitCode]);
    });
  });
});
