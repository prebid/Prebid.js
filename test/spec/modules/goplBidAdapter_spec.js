import { assert, expect } from 'chai';
import { spec } from 'modules/goplBidAdapter.js';
import * as utils from 'src/utils.js';
// import 'modules/schain.js';

const BIDDER_CODE = 'gopl';
const BIDDER_URL = 'https://ssp.wp.pl/bidder/';
const SYNC_URL_IFRAME = 'https://ssp.wp.pl/bidder/usersync';
const SYNC_URL_IMAGE = 'https://ssp.wp.pl/v1/sync/pixel';

describe('gopl adapter functionality', function () {
  function prepareTestData() {
    const bidderRequestId = '1041bb47b0fafa';
    const auctionId = '8eda6d06-3d7c-4a94-9b35-74e42fbb3089';
    const transactionId = '50259989-b5c0-4edf-8f47-b1ef5fbedf39';
    const gdprConsent = {
      consentString: 'BOtq-3dOtq-30BIABCPLC4-AAAAthr_7__7-_9_-_f__9uj3Or_v_f__30ccL59v_h_7v-_7fi_20nV4u_1vft9yfk1-5ctDztp505iakivHmqNeb9v_mz1_5pRP78k89r7337Ew_v8_v-b7JCON_Ig',
      gdprApplies: true,
    };
    const nativeOrtb2 = {
      ver: '1.2',
      assets: [
        {
          id: 0,
          required: 1,
          title: {
            len: 80
          }
        },
        {
          id: 1,
          required: 0,
          img: {
            type: 3,
            w: 350,
            h: 216
          }
        },
        {
          id: 2,
          required: 0,
          data: {
            type: 1
          }
        },
        {
          id: 3,
          required: 0,
          data: {
            type: 2
          }
        },
        {
          id: 4,
          required: 0,
          img: {
            type: 1,
            w: 50,
            h: 50
          }
        }
      ],
      privacy: 1
    };
    const nativeParams = {
      title: {
        required: true,
        len: 80
      },
      image: {
        required: false,
        sizes: [
          350,
          216
        ]
      },
      sponsoredBy: {
        required: false
      },
      clickUrl: {
        required: true
      },
      privacyLink: {
        required: false
      },
      body: {
        required: false
      },
      icon: {
        required: false,
        sizes: [
          50,
          50
        ]
      }
    };

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
      bidId: bidderRequestId + '1',
      transactionId,
      ortb2Imp: {
        ext: {
          data: {}
        }
      },
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
      bidId: bidderRequestId + '2',
      transactionId,
      ortb2Imp: {
        ext: {
          data: {}
        }
      },
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
      params: {
        siteId: '8816',
        id: '003',
      },
      sizes: [
        [728, 90],
        [750, 100],
        [750, 200]
      ],
      auctionId,
      bidderRequestId,
      bidId: bidderRequestId + '1',
      transactionId,
      ortb2Imp: {
        ext: {
          data: {}
        }
      },
    };
    const bid_native = {
      adUnitCode: 'slotNative',
      bidder: BIDDER_CODE,
      params: {
        siteId: '241449',
        id: '080'
      },
      auctionId: '360c8b78-16aa-4fb8-ae2d-d7ac80300237',
      ortb2Imp: {
        ext: {
          data: {}
        },
        native: nativeOrtb2,
      },
      nativeParams,
      nativeOrtbRequest: nativeOrtb2,
      mediaTypes: {
        native: nativeParams
      },
      transactionId: '4e82d57e-078b-4121-8637-501be94a012e',
      adUnitId: '83d30175-0ef2-423a-a47f-5d36bf65da16',
      sizes: [],
      bidId: '4bf7795aa87ced',
      bidderRequestId: '291594c52d9382',
      ortb2: {}
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
      params: {
        id: '150',
        siteId: '8816',
      },
      auctionId,
      bidderRequestId,
      bidId: bidderRequestId + '1',
      transactionId,
      ortb2Imp: {
        video: {
          context: 'instream',
          mimes: ['video/mp4', 'video/x-ms-wmv', 'video/webm', 'video/3gpp', 'application/javascript'],
          maxduration: 30,
          protocols: [2, 3, 5, 6],
          linearity: 1,
          skip: 1,
          playbackmethod: [2],
          api: [2]
        },
        ext: {
          data: {}
        }
      },
    };
    const bids_timeouted = [{
      adUnitCode: 'test_wideboard',
      bidder: BIDDER_CODE,
      params: [{
        id: '003',
        siteId: '8816',
      }],
      auctionId,
      bidId: bidderRequestId + '1',
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
      bidId: bidderRequestId + '2',
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
      bidId: bidderRequestId + '1',
      transactionId,
    }];

    const ortb2 = {
      source: {},
      regs: {
        ext: {
          dsa: {
            dsarequired: 1,
            pubrender: 0,
            datatopub: 2,
            transparency: [
              {
                domain: 'platform1domain.com',
                dsaparams: [
                  1
                ]
              },
              {
                domain: 'platform2domain.com',
                dsaparams: [
                  1,
                  2
                ]
              }
            ]
          },
          gdpr: 1
        }
      },
      user: {
        ext: {
          consent: 'BOtq-3dOtq-30BIABCPLC4-AAAAthr_7__7-_9_-_f__9uj3Or_v_f__30ccL59v_h_7v-_7fi_20nV4u_1vft9yfk1-5ctDztp505iakivHmqNeb9v_mz1_5pRP78k89r7337Ew_v8_v-b7JCON_Ig',
          data: {
            eids: [
              {
                source: 'bdr.wpcdn.pl',
                uids: [
                  {
                    id: '1',
                    atype: 3,
                    ext: {
                      stype: 'hemmd5'
                    }
                  },
                  {
                    id: '2',
                    atype: 3,
                    ext: {
                      stype: 'hemsha256'
                    }
                  }
                ]
              }
            ]
          }
        }
      },
      site: {
        domain: 'https://test.site.pl/',
        publisher: {
          domain: 'https://test.site.pl/',
        },
        page: 'https://test.site.pl/',
      },
    }
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
      },
      ortb2
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
      },
      ortb2
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
      },
      ortb2
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
      },
      ortb2
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
      },
      ortb2
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
      },
      ortb2
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
      },
      ortb2
    };
    const serverResponse = {
      'body': {
        'id': bidderRequestId,
        'seatbid': [{
          'bid': [{
            'id': '3347324c-6889-46d2-a800-ae78a5214c06',
            'impid': '003',
            'slotid': '003',
            'price': 1,
            'adid': 'lxHWkB7OnZeso3QiN1N4',
            'nurl': '',
            'adm': '<html>AD_CODE1</html>',
            'adomain': ['adomain.pl'],
            'cid': 'BZ4gAg21T5nNtxlUCDSW',
            'crid': 'lxHWkB7OnZeso3QiN1N4',
            'w': 728,
            'h': 90,
            'ext': {}
          }],
          'seat': 'dsp1',
          'group': 0
        }, {
          'bid': [{
            'id': '2d766853-ea07-4529-8299-5f0ebadc546a',
            'impid': '005',
            'slotid': '005',
            'price': 2,
            'adm': '<html>AD_CODE2</html>',
            'cid': '57744',
            'crid': '858252',
            'w': 300,
            'h': 250,
            'ext': {}
          }],
          'seat': 'dsp2',
          'group': 0
        }],
        'cur': 'PLN'
      }
    };
    const serverResponseSingle = {
      'body': {
        'id': bidderRequestId,
        'seatbid': [{
          'bid': [{
            'id': '3347324c-6889-46d2-a800-ae78a5214c06',
            'impid': '003',
            'siteid': '8816',
            'slotid': '003',
            'price': 1,
            'adid': 'lxHWkB7OnZeso3QiN1N4',
            'nurl': '',
            'adm': '<html>AD_CODE</html>',
            'adomain': ['adomain.pl'],
            'cid': 'BZ4gAg21T5nNtxlUCDSW',
            'crid': 'lxHWkB7OnZeso3QiN1N4',
            'w': 728,
            'h': 90,
            'ext': {}
          }],
          'seat': 'dsp1',
          'group': 0
        }],
        'cur': 'PLN'
      }
    };

    const serverResponsePaapi = {
      'body': {
        'id': bidderRequestId,
        'seatbid': [{
          'bid': [{
            'id': '3347324c-6889-46d2-a800-ae78a5214c06',
            'impid': '003',
            'siteid': '8816',
            'slotid': '003',
            'price': 1,
            'adid': 'lxHWkB7OnZeso3QiN1N4',
            'nurl': '',
            'adm': '<html>AD_CODE</html>',
            'adomain': ['adomain.pl'],
            'cid': 'BZ4gAg21T5nNtxlUCDSW',
            'crid': 'lxHWkB7OnZeso3QiN1N4',
            'w': 728,
            'h': 90,
            'ext': {}
          }],
          'seat': 'dsp1',
          'group': 0
        }],
        'cur': 'PLN',
        'ext': {
          'paapi': [
            { 'config_data': 'config value' },
          ]
        },
      }
    };

    const serverResponseIncorrect = {
      'body': {
        'id': bidderRequestId,
        'seatbid': [{
          'bid': [{
            'id': '3347324c-6889-46d2-a800-ae78a5214c06',
            'impid': '003',
            'slotid': '003',
            'price': 1,
            'adid': 'lxHWkB7OnZeso3QiN1N4',
            'nurl': '',
            'adm': 'THIS_IS_NOT_AN_AD',
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
        'id': bidderRequestId,
        'seatbid': [{
          'bid': [{
            'id': '3347324c-6889-46d2-a800-ae78a5214c06',
            'impid': '003',
            'price': 1,
            'adid': 'lxHWkB7OnZeso3QiN1N4',
            'nurl': '',
            'adm': '<html>AD_CODE</html>',
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
        'id': bidderRequestId,
        'seatbid': [{
          'bid': [{
            'id': '3347324c-6889-46d2-a800-ae78a5214c06',
            'impid': '150',
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
        'id': bidderRequestId,
        'seatbid': [{
          'bid': [{
            'id': '3347324c-6889-46d2-a800-ae78a5214c06',
            'impid': '080',
            'price': 0.5,
            'adid': 'lxHWkB7OnZeso3QiN1N4',
            'nurl': '',
            'adm': JSON.stringify({
              'assets': [
                { 'id': 0, 'title': { 'text': 'Title' } },
                { 'id': 1, 'img': { 'type': 3, 'url': 'https://img' } },
              ],
            }),
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
        'id': bidderRequestId,
      }
    };
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
      serverResponseIncorrect,
      serverResponsePaapi,
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
    let bids, bid_native, bid_video, bidRequest, bidRequestSingle, bidRequestNative, bidRequestVideo;
    let request, requestSingle, requestNative, requestVideo;
    let payload, payloadSingle, payloadNative, payloadVideo;

    before(function () {
      ({ bids, bid_native, bid_video, bidRequest, bidRequestSingle, bidRequestNative, bidRequestVideo } = prepareTestData());
      request = spec.buildRequests(bids, bidRequest);
      requestSingle = spec.buildRequests([bids[0]], bidRequestSingle);
      requestNative = spec.buildRequests([bid_native], bidRequestNative);
      requestVideo = spec.buildRequests([bid_video], bidRequestVideo);
      payload = request ? request.data : { site: false, imp: false };
      payloadSingle = requestSingle ? requestSingle.data : { site: false, imp: false };
      payloadNative = requestNative ? requestNative.data : { site: false, imp: false };
      payloadVideo = requestVideo ? requestVideo.data : { site: false, imp: false };
    });

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
      expect(payload.regs.ext).to.be.an('object').and.to.have.property('gdpr', 1);
      expect(payload.user.ext).to.be.an('object').and.to.have.property('consent', bidRequest.gdprConsent.consentString);
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

    it('should send user eids', function () {
      expect(payload.user.ext).to.be.an('object').and.to.have.property('data').that.is.an('object');

      const userDataEids = payload.user.ext.data.eids;
      expect(userDataEids).to.be.an('array').and.to.have.lengthOf(1);

      const eids = userDataEids[0];
      expect(eids).to.be.an('object').and.to.have.property('source', 'bdr.wpcdn.pl');
      expect(eids).to.be.an('object').and.to.have.property('uids').that.is.an('array');

      const eidsUids1 = eids.uids[0];
      expect(eidsUids1.id).to.equal('1');
      expect(eidsUids1.atype).to.equal(3);
      expect(eidsUids1.ext).to.be.an('object').and.to.have.property('stype', 'hemmd5');

      const eidsUids2 = eids.uids[1];
      expect(eidsUids2.id).to.equal('2');
      expect(eidsUids2.atype).to.equal(3);
      expect(eidsUids2.ext).to.be.an('object').and.to.have.property('stype', 'hemsha256');
    });

    it('pvid should be constant on a single page view', function () {
      const userData1 = payload.user.data;
      const userData2 = payloadNative.user.data;
      const pvid1 = userData1[1];
      const pvid2 = userData2[1];

      expect(pvid1.segment[0].value).to.equal(pvid2.segment[0].value);
    });

    it('should build correct native payload', function () {
      const nativeAssets = payloadNative.imp && payloadNative.imp[0].native;
      const nativeRequest = payloadNative.imp && payloadNative.imp[0].native.request;

      expect(payloadNative.imp.length).to.equal(1);

      expect(nativeAssets).to.have.property('ver').that.equals('1.2');
      expect(nativeAssets).to.have.property('privacy').that.equals(1);
      expect(nativeAssets).to.have.property('assets').that.is.a('array').and.has.lengthOf(5);
    });

    it('should build correct video payload', function () {
      const videoAssets = payloadVideo.imp && payloadVideo.imp[0].video;

      expect(payloadVideo.imp.length).to.equal(1);
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
      expect(extAssets1).to.have.property('pbsize').that.equals('750x200_1');
      expect(extAssets2).to.have.property('pbsize').that.equals('750x200_1');
    });

    it('should send supply chain data', function () {
      const supplyChain = {
        ver: '1.0',
        complete: 1,
        nodes: [
          {
            asi: 'first-seller.com',
            sid: '00001',
            hp: 1
          },
        ]
      };
      const bidRequestWithChain = {
        ...bidRequest,
        ortb2: {
          ...bidRequest.ortb2,
          source: { ext: { schain: supplyChain } }
        }
      };
      const requestWithSupplyChain = spec.buildRequests(bids, bidRequestWithChain);
      const payloadWithSupplyChain = requestWithSupplyChain ? requestWithSupplyChain.data : { site: false, imp: false };

      expect(payloadWithSupplyChain.source.ext).to.have.property('schain').that.has.keys('ver', 'complete', 'nodes');
    });
  });

  describe('interpretResponse', function () {
    let bid_OneCode, bid_video, bid_native, bids, emptyResponse, serverResponse, serverResponseOneCode, serverResponseSingle, serverResponseIncorrect, serverResponsePaapi, serverResponseVideo, serverResponseNative, bidRequest, bidRequestOneCode, bidRequestSingle, bidRequestVideo, bidRequestNative;
    let request, requestSingle, requestOneCode, requestVideo, requestNative;

    before(function () {
      ({ bid_OneCode, bid_video, bid_native, bids, emptyResponse, serverResponse, serverResponseOneCode, serverResponseSingle, serverResponseIncorrect, serverResponsePaapi, serverResponseVideo, serverResponseNative, bidRequest, bidRequestOneCode, bidRequestSingle, bidRequestVideo, bidRequestNative } = prepareTestData());
      request = spec.buildRequests(bids, bidRequest);
      requestSingle = spec.buildRequests([bids[0]], bidRequestSingle);
      requestOneCode = spec.buildRequests([bid_OneCode], bidRequestOneCode);
      requestVideo = spec.buildRequests([bid_video], bidRequestVideo);
      requestNative = spec.buildRequests([bid_native], bidRequestNative);
    });

    it('should handle nobid responses', function () {
      let result = spec.interpretResponse(emptyResponse, request);
      expect(result.length).to.equal(0);
    });

    it('should create bids from non-empty responses', function () {
      let result = spec.interpretResponse(serverResponse, request);
      let resultSingle = spec.interpretResponse(serverResponseSingle, requestSingle);

      expect(result.length).to.equal(bids.length);
      expect(resultSingle.length).to.equal(1);
      expect(resultSingle[0]).to.have.keys('ad', 'cpm', 'width', 'height', 'mediaType', 'meta', 'requestId', 'creativeId', 'creative_id', 'currency', 'netRevenue', 'seatBidId', 'ttl', 'vurls');
    });

    it('should create bid from OneCode (parameter-less) request, if response contains siteId', function () {
      let resultOneCode = spec.interpretResponse(serverResponseOneCode, requestOneCode);

      expect(resultOneCode.length).to.equal(1);
      expect(resultOneCode[0]).to.have.keys('ad', 'cpm', 'width', 'height', 'mediaType', 'meta', 'requestId', 'creativeId', 'creative_id', 'currency', 'netRevenue', 'seatBidId', 'ttl', 'vurls');
    });

    it('should not create bid from OneCode (parameter-less) request, if response does not contain siteId', function () {
      let resultOneCodeNoMatch = spec.interpretResponse(serverResponseIncorrect, requestOneCode);

      expect(resultOneCodeNoMatch.length).to.equal(0);
    });

    it('should handle a partial response', function () {
      let resultPartial = spec.interpretResponse(serverResponseSingle, request);
      expect(resultPartial.length).to.equal(1);
    });

    it('should not alter HTML from response', function () {
      let resultSingle = spec.interpretResponse(serverResponseSingle, requestSingle);
      let adcode = resultSingle[0].ad;

      expect(adcode).to.be.equal(serverResponseSingle.body.seatbid[0].bid[0].adm);
    });

    it('should create a correct video bid', function () {
      let resultVideo = spec.interpretResponse(serverResponseVideo, requestVideo);

      expect(resultVideo.length).to.equal(1);

      let videoBid = resultVideo[0];

      expect(videoBid.mediaType).to.equal('video');
      expect(videoBid.requestId).to.equal('1041bb47b0fafa1');
      expect(videoBid.cpm).to.equal(1);
      expect(videoBid.currency).to.equal('PLN');
      expect(videoBid.width).to.equal(640);
      expect(videoBid.height).to.equal(480);
      expect(videoBid.creative_id).to.equal('lxHWkB7OnZeso3QiN1N4');
    });

    it('should create a correct native bid', function () {
      let resultNative = spec.interpretResponse(serverResponseNative, requestNative);

      expect(resultNative.length).to.equal(1);

      let nativeBid = resultNative[0];

      expect(nativeBid.mediaType).to.equal('native');
      expect(nativeBid.requestId).to.equal('4bf7795aa87ced');
      expect(nativeBid.cpm).to.equal(0.5);
      expect(nativeBid.currency).to.equal('PLN');
      expect(nativeBid.creative_id).to.equal('lxHWkB7OnZeso3QiN1N4');
    });

    it('should reject responses that are not HTML, VATS/VPAID or native', function () {
      let resultIncorrect = spec.interpretResponse(serverResponseIncorrect, requestSingle);

      expect(resultIncorrect.length).to.equal(0);
    });

    it('should response with fledge auction configs', function () {
      const { bids, fledgeAuctionConfigs } = spec.interpretResponse(serverResponsePaapi, requestSingle);

      expect(bids.length).to.equal(1);
      expect(fledgeAuctionConfigs.length).to.equal(1);
    });
  });

  describe('getUserSyncs', function () {
    let syncResultAll, syncResultImage, syncResultNone;

    before(function () {
      syncResultAll = spec.getUserSyncs({ iframeEnabled: true, pixelEnabled: true });
      syncResultImage = spec.getUserSyncs({ iframeEnabled: false, pixelEnabled: true });
      syncResultNone = spec.getUserSyncs({ iframeEnabled: false, pixelEnabled: false });
    });

    it('should provide correct iframe url, if frame sync is allowed', function () {
      expect(syncResultAll).to.have.length(1);
      expect(syncResultAll[0].url).to.have.string(SYNC_URL_IFRAME);
    });

    it('should provide correct image url, if image sync is allowed', function () {
      expect(syncResultImage).to.have.length(1);
      expect(syncResultImage[0].url).to.have.string(SYNC_URL_IMAGE);
    });

    it('should send no syncs, if no sync is allowed', function () {
      expect(syncResultNone).to.have.length(0);
      expect(syncResultNone).to.have.length(0);
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
      expect(notificationPayload).to.have.property('requestId').that.equals(bid.bidderRequestId);
      expect(notificationPayload).to.have.property('tagid').that.deep.equals([bid.adUnitCode]);
      expect(notificationPayload).to.have.property('siteId').that.is.an('array');
      expect(notificationPayload).to.have.property('slotId').that.is.an('array');
    });
  });

  describe('onBidBillable', function () {
    it('should generate no notification if bid is undefined', function () {
      let notificationPayload = spec.onBidBillable();
      expect(notificationPayload).to.be.undefined;
    });

    it('should generate notification with event name and request/adUnit data, if correct bid is provided. Should also contain site/slot data as arrays.', function () {
      const { bids } = prepareTestData();
      let bid = bids[0];

      let notificationPayload = spec.onBidBillable(bid);
      expect(notificationPayload).to.have.property('event').that.equals('bidBillable');
      expect(notificationPayload).to.have.property('requestId').that.equals(bid.bidderRequestId);
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
      expect(notificationPayload).to.have.property('tagid').that.deep.equals([bids_timeouted[0].adUnitCode, bids_timeouted[1].adUnitCode]);
    });
  });

    describe('aliases', function () {
    it('should declare sspBC as alias inheriting gvlid 690', function () {
      expect(spec.aliases).to.include('sspBC');
      expect(spec.gvlid).to.equal(690);
    });
  });
});
