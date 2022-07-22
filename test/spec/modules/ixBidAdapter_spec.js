import * as utils from 'src/utils.js';
import { config } from 'src/config.js';
import { expect } from 'chai';
import { newBidder } from 'src/adapters/bidderFactory.js';
import { spec, storage, ERROR_CODES } from '../../../modules/ixBidAdapter.js';
import { createEidsArray } from 'modules/userId/eids.js';
import { deepAccess, deepClone } from '../../../src/utils.js';

describe('IndexexchangeAdapter', function () {
  const IX_SECURE_ENDPOINT = 'https://htlb.casalemedia.com/openrtb/pbjs';
  const VIDEO_ENDPOINT_VERSION = 8.1;
  const BANNER_ENDPOINT_VERSION = 7.2;
  const NATIVE_ENDPOINT_VERSION = undefined;

  const SAMPLE_SCHAIN = {
    'ver': '1.0',
    'complete': 1,
    'nodes': [
      {
        'asi': 'indirectseller.com',
        'sid': '00001',
        'hp': 1
      },
      {
        'asi': 'indirectseller-2.com',
        'sid': '00002',
        'hp': 2
      }
    ]
  };
  const LARGE_SET_OF_SIZES = [
    [300, 250],
    [600, 410],
    [336, 280],
    [400, 300],
    [320, 50],
    [360, 360],
    [250, 250],
    [320, 250],
    [400, 250],
    [387, 359],
    [300, 50],
    [372, 250],
    [320, 320],
    [412, 412],
    [327, 272],
    [312, 260],
    [384, 320],
    [335, 250],
    [366, 305],
    [374, 250],
    [375, 375],
    [272, 391],
    [364, 303],
    [414, 414],
    [366, 375],
    [272, 360],
    [364, 373],
    [366, 359],
    [320, 100],
    [360, 250],
    [468, 60],
    [480, 300],
    [600, 400],
    [600, 300],
    [33, 28],
    [40, 30],
    [32, 5],
    [36, 36],
    [25, 25],
    [320, 25],
    [400, 25],
    [387, 35],
    [300, 5],
    [372, 20],
    [320, 32],
    [412, 41],
    [327, 27],
    [312, 26],
    [384, 32],
    [335, 25],
    [366, 30],
    [374, 25],
    [375, 37],
    [272, 31],
    [364, 303],
    [414, 41],
    [366, 35],
    [272, 60],
    [364, 73],
    [366, 59],
    [320, 10],
    [360, 25],
    [468, 6],
    [480, 30],
    [600, 40],
    [600, 30]
  ];

  const ONE_VIDEO = [
    {
      bidder: 'ix',
      params: {
        siteId: '456',
        video: {
          skippable: false,
          mimes: [
            'video/mp4',
            'video/webm'
          ],
          minduration: 0,
          maxduration: 60,
          protocols: [2]
        },
        size: [400, 100]
      },
      sizes: [[400, 100]],
      mediaTypes: {
        video: {
          context: 'instream',
          playerSize: [[400, 100]]
        }
      },
      ortb2Imp: {
        ext: {
          tid: '173f49a8-7549-4218-a23c-e7ba59b47230'
        }
      },
      adUnitCode: 'div-gpt-ad-1460505748562-0',
      transactionId: '173f49a8-7549-4218-a23c-e7ba59b47230',
      bidId: '1a2b3c4e',
      bidderRequestId: '11a22b33c44e',
      auctionId: '1aa2bb3cc4de',
      schain: SAMPLE_SCHAIN
    }
  ];

  const ONE_BANNER = [
    {
      bidder: 'ix',
      params: {
        siteId: '123',
        size: [300, 250]
      },
      sizes: [[300, 250]],
      mediaTypes: {
        banner: {
          sizes: [[300, 250]]
        }
      },
      ortb2Imp: {
        ext: {
          tid: '173f49a8-7549-4218-a23c-e7ba59b47229'
        }
      },
      adUnitCode: 'div-gpt-ad-1460505748561-0',
      transactionId: '173f49a8-7549-4218-a23c-e7ba59b47229',
      bidId: '1a2b3c4d',
      bidderRequestId: '11a22b33c44d',
      auctionId: '1aa2bb3cc4dd',
      schain: SAMPLE_SCHAIN
    }
  ];

  const DEFAULT_BANNER_VALID_BID = [
    {
      bidder: 'ix',
      params: {
        siteId: '123',
        size: [300, 250]
      },
      sizes: [[300, 250], [300, 600]],
      mediaTypes: {
        banner: {
          sizes: [[300, 250], [300, 600]]
        }
      },
      ortb2Imp: {
        ext: {
          tid: '173f49a8-7549-4218-a23c-e7ba59b47229'
        }
      },
      adUnitCode: 'div-gpt-ad-1460505748561-0',
      transactionId: '173f49a8-7549-4218-a23c-e7ba59b47229',
      bidId: '1a2b3c4d',
      bidderRequestId: '11a22b33c44d',
      auctionId: '1aa2bb3cc4dd',
      schain: SAMPLE_SCHAIN
    }
  ];

  const DEFAULT_BANNER_VALID_BID_PARAM_NO_SIZE = [
    {
      bidder: 'ix',
      params: {
        siteId: '123'
      },
      mediaTypes: {
        banner: {
          sizes: [[300, 250], [300, 600]]
        }
      },
      ortb2Imp: {
        ext: {
          tid: '173f49a8-7549-4218-a23c-e7ba59b47229'
        }
      },
      adUnitCode: 'div-gpt-ad-1460505748561-0',
      transactionId: '173f49a8-7549-4218-a23c-e7ba59b47229',
      bidId: '1a2b3c4d',
      bidderRequestId: '11a22b33c44d',
      auctionId: '1aa2bb3cc4dd',
      schain: SAMPLE_SCHAIN
    }
  ];

  const DEFAULT_VIDEO_VALID_BID_NO_VIDEO_PARAMS = [
    {
      bidder: 'ix',
      params: {
        siteId: '456'
      },
      sizes: [400, 100],
      mediaTypes: {
        video: {
          context: 'instream',
          playerSize: [[400, 100]],
          mimes: [
            'video/mp4',
            'video/webm'
          ],
          minduration: 0,
          maxduration: 60,
          protocols: [2]
        }
      },
      ortb2Imp: {
        ext: {
          tid: '173f49a8-7549-4218-a23c-e7ba59b47230'
        }
      },
      adUnitCode: 'div-gpt-ad-1460505748562-0',
      transactionId: '173f49a8-7549-4218-a23c-e7ba59b47230',
      bidId: '1a2b3c4e',
      bidderRequestId: '11a22b33c44e',
      auctionId: '1aa2bb3cc4de',
      schain: SAMPLE_SCHAIN
    }
  ];

  const DEFAULT_VIDEO_VALID_BID = [
    {
      bidder: 'ix',
      params: {
        siteId: '456',
        video: {
          skippable: false,
          mimes: [
            'video/mp4',
            'video/webm'
          ],
          minduration: 0,
          maxduration: 60,
          protocols: [2]
        },
        size: [400, 100]
      },
      sizes: [[400, 100], [200, 400]],
      mediaTypes: {
        video: {
          context: 'instream',
          playerSize: [[400, 100], [200, 400]]
        }
      },
      ortb2Imp: {
        ext: {
          tid: '173f49a8-7549-4218-a23c-e7ba59b47230'
        }
      },
      adUnitCode: 'div-gpt-ad-1460505748562-0',
      transactionId: '173f49a8-7549-4218-a23c-e7ba59b47230',
      bidId: '1a2b3c4e',
      bidderRequestId: '11a22b33c44e',
      auctionId: '1aa2bb3cc4de',
      schain: SAMPLE_SCHAIN
    }
  ];

  const DEFAULT_MULTIFORMAT_BANNER_VALID_BID = [
    {
      bidder: 'ix',
      params: {
        tagId: '123',
        siteId: '123',
        size: [300, 250],
      },
      mediaTypes: {
        video: {
          context: 'outstream',
          playerSize: [[600, 700]]
        },
        banner: {
          sizes: [[300, 250], [300, 600], [400, 500]]
        }
      },
      ortb2Imp: {
        ext: {
          tid: '173f49a8-7549-4218-a23c-e7ba59b47230',
          data: {
            pbadslot: 'div-gpt-ad-1460505748562-0'
          }
        }
      },
      adUnitCode: 'div-gpt-ad-1460505748562-0',
      transactionId: '173f49a8-7549-4218-a23c-e7ba59b47230',
      bidId: '1a2b3c4e',
      bidderRequestId: '11a22b33c44e',
      auctionId: '1aa2bb3cc4de',
      schain: SAMPLE_SCHAIN
    }
  ];

  const DEFAULT_MULTIFORMAT_VIDEO_VALID_BID = [
    {
      bidder: 'ix',
      params: {
        tagId: '123',
        siteId: '456',
        video: {
          skippable: false,
          mimes: [
            'video/mp4',
            'video/webm'
          ],
          minduration: 0,
          maxduration: 60,
          protocols: [1]
        },
        size: [300, 250]
      },
      mediaTypes: {
        video: {
          context: 'outstream',
          playerSize: [[300, 250]]
        },
        banner: {
          sizes: [[300, 250], [300, 600]]
        }
      },
      ortb2Imp: {
        ext: {
          tid: '173f49a8-7549-4218-a23c-e7ba59b47230',
          data: {
            pbadslot: 'div-gpt-ad-1460505748562-0'
          }
        }
      },
      adUnitCode: 'div-gpt-ad-1460505748562-0',
      transactionId: '273f49a8-7549-4218-a23c-e7ba59b47230',
      bidId: '1a2b3c4e',
      bidderRequestId: '11a22b33c44e',
      auctionId: '1aa2bb3cc4de',
      schain: SAMPLE_SCHAIN
    }
  ];

  const DEFAULT_NATIVE_VALID_BID = [
    {
      bidder: 'ix',
      params: {
        siteId: '123',
        size: [300, 250]
      },
      sizes: [[300, 250], [300, 600]],
      mediaTypes: {
        native: {
          icon: {
            required: false
          },
          title: {
            required: true
          },
          body: {
            required: true
          },
          image: {
            required: true
          },
          video: {
            required: false
          },
          sponsoredBy: {
            required: true
          }
        }
      },
      adUnitCode: 'div-gpt-ad-1460505748563-0',
      transactionId: '173f49a8-7549-4218-a23c-e7ba59b47231',
      bidId: '1a2b3c4f',
      bidderRequestId: '11a22b33c44f',
      auctionId: '1aa2bb3cc4df',
      schain: SAMPLE_SCHAIN
    }
  ];

  const DEFAULT_MULTIFORMAT_NATIVE_VALID_BID = [
    {
      bidder: 'ix',
      params: {
        siteId: '123',
        size: [300, 250],
      },
      mediaTypes: {
        banner: {
          sizes: [[300, 250], [300, 600], [400, 500]]
        },
        native: {
          title: {
            required: true
          },
          body: {
            required: true
          },
          image: {
            required: true
          },
          sponsoredBy: {
            required: true
          },
          icon: {
            required: false
          }
        }
      },
      adUnitCode: 'div-gpt-ad-1460505748562-0',
      transactionId: '173f49a8-7549-4218-a23c-e7ba59b47230',
      bidId: '1a2b3c4e',
      bidderRequestId: '11a22b33c44e',
      auctionId: '1aa2bb3cc4de',
      schain: SAMPLE_SCHAIN
    }
  ];

  const DEFAULT_NATIVE_IMP = {
    request: '{"assets":[{"required":0,"img":{"type":1},"id":201},{"required":1,"title":{"len":25},"id":100},{"required":1,"data":{"type":2},"id":402},{"required":1,"img":{"type":3},"id":203},{"required":0,"video":{"mimes":["video/mp4","video/webm"],"minduration":0,"maxduration":120,"protocols":[2,3,5,6]},"id":300},{"required":1,"data":{"type":1},"id":401}],"ver":"1.2","eventtrackers":[{"event":1,"methods":[1,2]}],"privacy":1}',
    ver: '1.2'
  }

  const DEFAULT_BANNER_BID_RESPONSE = {
    cur: 'USD',
    id: '11a22b33c44d',
    seatbid: [
      {
        bid: [
          {
            crid: '12345',
            adomain: ['www.abc.com'],
            adid: '14851455',
            impid: '1a2b3c4d',
            cid: '3051266',
            price: 100,
            w: 300,
            h: 250,
            id: '1',
            ext: {
              dspid: 50,
              pricelevel: '_100',
              advbrandid: 303325,
              advbrand: 'OECTA'
            },
            adm: '<a target="_blank" href="https://www.indexexchange.com"></a>'
          }
        ],
        seat: '3970'
      }
    ]
  };

  const DEFAULT_BANNER_BID_RESPONSE_WITHOUT_ADOMAIN = {
    cur: 'USD',
    id: '11a22b33c44d',
    seatbid: [
      {
        bid: [
          {
            crid: '12345',
            adid: '14851455',
            impid: '1a2b3c4d',
            cid: '3051266',
            price: 100,
            w: 300,
            h: 250,
            id: '1',
            ext: {
              dspid: 50,
              pricelevel: '_100',
              advbrandid: 303325,
              advbrand: 'OECTA'
            },
            adm: '<a target="_blank" href="https://www.indexexchange.com"></a>'
          }
        ],
        seat: '3970'
      }
    ]
  };

  const DEFAULT_VIDEO_BID_RESPONSE = {
    cur: 'USD',
    id: '1aa2bb3cc4de',
    seatbid: [
      {
        bid: [
          {
            crid: '12346',
            adomain: ['www.abcd.com'],
            adid: '14851456',
            impid: '1a2b3c4e',
            cid: '3051267',
            price: 110,
            id: '2',
            ext: {
              vasturl: 'www.abcd.com/vast',
              errorurl: 'www.abcd.com/error',
              dspid: 51,
              pricelevel: '_110',
              advbrandid: 303326,
              advbrand: 'OECTB'
            }
          }
        ],
        seat: '3971'
      }
    ],
    ext: {
      videoplayerurl: 'https://test.com/video-renderer.js'
    }
  };

  const DEFAULT_VIDEO_BID_RESPONSE_WITH_MTYPE_SET = {
    cur: 'USD',
    id: '1aa2bb3cc4de',
    seatbid: [
      {
        bid: [
          {
            crid: '12346',
            adomain: ['www.abcd.com'],
            adid: '14851456',
            impid: '1a2b3c4e',
            cid: '3051267',
            price: 110,
            id: '2',
            mtype: 2,
            adm: '<?xml version=\"1.0\" encoding=\"UTF-8\"?><VAST xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\" xsi:noNamespaceSchemaLocation=\"vast.xsd\" version=\"3.0\"> <Ad id=\"488427365\">  <InLine>   <AdSystem>Test</AdSystem>   <AdTitle>In-Stream Video</AdTitle> </InLine> </Ad></VAST',
            ext: {
              vasturl: 'www.abcd.com/vast',
              errorurl: 'www.abcd.com/error',
              dspid: 51,
              pricelevel: '_110',
              advbrandid: 303326,
              advbrand: 'OECTB'
            }
          }
        ],
        seat: '3971'
      }
    ]
  };

  const DEFAULT_NATIVE_BID_RESPONSE = {
    cur: 'USD',
    id: '11a22b33c44d',
    seatbid: [
      {
        bid: [
          {
            crid: '12345',
            adomain: ['www.abc.com'],
            adid: '14851455',
            impid: '1a2b3c4d',
            cid: '3051266',
            price: 100,
            id: '1',
            ext: {
              dspid: 50,
              pricelevel: '_100',
              advbrandid: 303325,
              advbrand: 'OECTA'
            },
            adm: '{"native":{"ver":"1.2","assets":[{"id":201,"img":{"url":"https://cdn.liftoff.io/customers/1209/creatives/2501-icon-250x250.png","w":250,"h":250}},{"id":203,"img":{"url":"https://cdn.liftoff.io/customers/5a9cab9cc6/image/lambda_png/a0355879b06c09b09232.png","w":1200,"h":627}},{"id":401,"data":{"value":"autodoc.co.uk"}},{"id":402,"data":{"value":"Les pièces automobiles dont vous avez besoin, toujours sous la main."}},{"id":100,"title":{"text":"Autodoc"}},{"id":300,"video":{"vasttag":"<VAST>blah</VAST>"}}],"link":{"url":"https://play.google.com/store/apps/details?id=de.autodoc.gmbh","clicktrackers":["https://click.liftoff.io/v1/campaign_click/blah"]},"eventtrackers":[{"event":1,"method":1,"url":"https://impression-europe.liftoff.io/index/impression"},{"event":1,"method":1,"url":"https://a701.casalemedia.com/impression/v1"}],"privacy":"https://privacy.link.com"}}'
          }
        ],
        seat: '3970'
      }
    ]
  };

  const DEFAULT_OPTION = {
    gdprConsent: {
      gdprApplies: true,
      consentString: '3huaa11=qu3198ae',
      vendorData: {}
    },
    refererInfo: {
      page: 'https://www.prebid.org',
      canonicalUrl: 'https://www.prebid.org/the/link/to/the/page'
    }
  };

  const DEFAULT_IDENTITY_RESPONSE = {
    IdentityIp: {
      responsePending: false,
      data: {
        source: 'identityinc.com',
        uids: [
          {
            id: 'identityid'
          }
        ]
      }
    }
  };

  const DEFAULT_BIDDER_REQUEST_DATA = {
    ac: 'j',
    r: JSON.stringify({
      id: '345',
      imp: [
        {
          id: '1a2b3c4e',
          video: {
            w: 640,
            h: 480,
            placement: 1
          }
        }
      ],
      site: {
        ref: 'https://ref.com/ref.html',
        page: 'https://page.com'
      },
    }),
    s: '21',
    sd: 1,
    t: 1000,
    v: 8.1
  };

  const DEFAULT_USERID_DATA = {
    idl_env: '1234-5678-9012-3456', // Liveramp
    netId: 'testnetid123', // NetId
    IDP: 'userIDP000', // IDP
    fabrickId: 'fabrickId9000', // FabrickId
    // so structured because when calling createEidsArray, UID2's getValue func takes .id to set in uids
    uid2: { id: 'testuid2' }, // UID 2.0
    // similar to uid2, but id5's getValue takes .uid
    id5id: { uid: 'testid5id' } // ID5
  };

  const DEFAULT_USERIDASEIDS_DATA = createEidsArray(DEFAULT_USERID_DATA);

  const DEFAULT_USERID_PAYLOAD = [
    {
      source: 'liveramp.com',
      uids: [{
        id: DEFAULT_USERID_DATA.idl_env,
        ext: {
          rtiPartner: 'idl'
        }
      }]
    }, {
      source: 'netid.de',
      uids: [{
        id: DEFAULT_USERID_DATA.netId,
        ext: {
          rtiPartner: 'NETID'
        }
      }]
    }, {
      source: 'neustar.biz',
      uids: [{
        id: DEFAULT_USERID_DATA.fabrickId,
        ext: {
          rtiPartner: 'fabrickId'
        }
      }]
    }, {
      source: 'zeotap.com',
      uids: [{
        id: DEFAULT_USERID_DATA.IDP,
        ext: {
          rtiPartner: 'zeotapIdPlus'
        }
      }]
    }, {
      source: 'uidapi.com',
      uids: [{
        id: DEFAULT_USERID_DATA.uid2.id,
        ext: {
          rtiPartner: 'UID2'
        }
      }]
    }, {
      source: 'id5-sync.com',
      uids: [{
        id: DEFAULT_USERID_DATA.id5id.uid
      }]
    }
  ];

  const DEFAULT_USERID_BID_DATA = {
    lotamePanoramaId: 'bd738d136bdaa841117fe9b331bb4'
  };

  describe('inherited functions', function () {
    it('should exists and is a function', function () {
      const adapter = newBidder(spec);
      expect(adapter.callBids).to.exist.and.to.be.a('function');
    });
  });

  describe('getUserSync tests', function () {
    it('UserSync test : check type = iframe, check usermatch URL', function () {
      const syncOptions = {
        'iframeEnabled': true
      }
      let userSync = spec.getUserSyncs(syncOptions, []);
      expect(userSync[0].type).to.equal('iframe');
      const USER_SYNC_URL = 'https://js-sec.indexww.com/um/ixmatch.html';
      expect(userSync[0].url).to.equal(USER_SYNC_URL);
    });

    it('When iframeEnabled = false, default to img', function () {
      const syncOptions = {
        'iframeEnabled': false,
      }
      let userSync = spec.getUserSyncs(syncOptions, []);
      expect(userSync[0].type).to.equal('image');
      const USER_SYNC_URL = 'https://dsum.casalemedia.com/pbusermatch?origin=prebid&site_id=123&p=1&i=0&gdpr=1&gdpr_consent=3huaa11=qu3198ae&us_privacy=';
      expect(userSync[0].url).to.equal(USER_SYNC_URL);
    });

    it('UserSync test : check type = pixel, check usermatch URL, no exchange data, only drop 1', function () {
      const syncOptions = {
        'pixelEnabled': true
      }
      config.setConfig({
        userSync: {
          pixelEnabled: true,
          syncsPerBidder: 3
        }
      })
      let userSync = spec.getUserSyncs(syncOptions, []);
      expect(userSync[0].type).to.equal('image');
      const USER_SYNC_URL = 'https://dsum.casalemedia.com/pbusermatch?origin=prebid&site_id=123&p=1&i=0&gdpr=1&gdpr_consent=3huaa11=qu3198ae&us_privacy=';
      expect(userSync[0].url).to.equal(USER_SYNC_URL);
    });

    it('UserSync test : check type = pixel, check usermatch URL with override set to 0', function () {
      const syncOptions = {
        'pixelEnabled': true
      }
      config.setConfig({
        userSync: {
          pixelEnabled: true,
          syncsPerBidder: 3
        }
      });
      let userSync = spec.getUserSyncs(syncOptions, [{'body': {'ext': {'publishersyncsperbidderoverride': 0}}}]);
      expect(userSync.length).to.equal(0);
    });

    it('UserSync test : check type = pixel, check usermatch URL with override set', function () {
      const syncOptions = {
        'pixelEnabled': true
      }
      config.setConfig({
        userSync: {
          pixelEnabled: true,
          syncsPerBidder: 3
        }
      });
      let userSync = spec.getUserSyncs(syncOptions, [{'body': {'ext': {'publishersyncsperbidderoverride': 2}}}]);
      expect(userSync[0].type).to.equal('image');
      const USER_SYNC_URL_0 = 'https://dsum.casalemedia.com/pbusermatch?origin=prebid&site_id=123&p=2&i=0&gdpr=1&gdpr_consent=3huaa11=qu3198ae&us_privacy=';
      const USER_SYNC_URL_1 = 'https://dsum.casalemedia.com/pbusermatch?origin=prebid&site_id=123&p=2&i=1&gdpr=1&gdpr_consent=3huaa11=qu3198ae&us_privacy=';
      expect(userSync[0].url).to.equal(USER_SYNC_URL_0);
      expect(userSync[1].url).to.equal(USER_SYNC_URL_1);
      expect(userSync.length).to.equal(2);
    });

    it('UserSync test : check type = pixel, check usermatch URL with override greater than publisher syncs per bidder , use syncsperbidder', function () {
      const syncOptions = {
        'pixelEnabled': true
      }
      config.setConfig({
        userSync: {
          pixelEnabled: true,
          syncsPerBidder: 3
        }
      });
      let userSync = spec.getUserSyncs(syncOptions, [{'body': {'ext': {'publishersyncsperbidderoverride': 4}}}]);
      expect(userSync[0].type).to.equal('image');
      const USER_SYNC_URL_0 = 'https://dsum.casalemedia.com/pbusermatch?origin=prebid&site_id=123&p=3&i=0&gdpr=1&gdpr_consent=3huaa11=qu3198ae&us_privacy=';
      const USER_SYNC_URL_1 = 'https://dsum.casalemedia.com/pbusermatch?origin=prebid&site_id=123&p=3&i=1&gdpr=1&gdpr_consent=3huaa11=qu3198ae&us_privacy=';
      const USER_SYNC_URL_2 = 'https://dsum.casalemedia.com/pbusermatch?origin=prebid&site_id=123&p=3&i=2&gdpr=1&gdpr_consent=3huaa11=qu3198ae&us_privacy=';
      expect(userSync[0].url).to.equal(USER_SYNC_URL_0);
      expect(userSync[1].url).to.equal(USER_SYNC_URL_1);
      expect(userSync[2].url).to.equal(USER_SYNC_URL_2);
      expect(userSync.length).to.equal(3);
    });

    it('UserSync test : check type = pixel, syncsPerBidder = 0, still use override', function () {
      const syncOptions = {
        'pixelEnabled': true
      }
      config.setConfig({
        userSync: {
          pixelEnabled: true,
          syncsPerBidder: 0
        }
      });
      let userSync = spec.getUserSyncs(syncOptions, [{'body': {'ext': {'publishersyncsperbidderoverride': 2}}}]);
      expect(userSync[0].type).to.equal('image');
      const USER_SYNC_URL_0 = 'https://dsum.casalemedia.com/pbusermatch?origin=prebid&site_id=123&p=2&i=0&gdpr=1&gdpr_consent=3huaa11=qu3198ae&us_privacy=';
      const USER_SYNC_URL_1 = 'https://dsum.casalemedia.com/pbusermatch?origin=prebid&site_id=123&p=2&i=1&gdpr=1&gdpr_consent=3huaa11=qu3198ae&us_privacy=';
      expect(userSync[0].url).to.equal(USER_SYNC_URL_0);
      expect(userSync[1].url).to.equal(USER_SYNC_URL_1);
      expect(userSync.length).to.equal(2);
    });
  });

  describe('isBidRequestValid', function () {
    it('should return false if outstream player size is less than 144x144 and IX renderer is preferred', function () {
      const bid = utils.deepClone(DEFAULT_VIDEO_VALID_BID[0]);
      bid.mediaTypes.video.context = 'outstream';
      bid.mediaTypes.video.w = [[300, 143]];
      expect(spec.isBidRequestValid(bid)).to.equal(false);
      bid.mediaTypes.video.w = [[143, 300]];
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should return false if outstream video w & h  is less than 144x144 and IX renderer is preferred', function () {
      const bid = utils.deepClone(DEFAULT_VIDEO_VALID_BID[0]);
      bid.mediaTypes.video.context = 'outstream';
      bid.mediaTypes.video.playerSize = [[300, 250]];
      bid.mediaTypes.video.w = 300;
      bid.mediaTypes.video.h = 142;
      expect(spec.isBidRequestValid(bid)).to.equal(false);
      bid.mediaTypes.video.h = 300;
      bid.mediaTypes.video.w = 142;
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should return true if outstream player size is less than 300x250 and IX renderer is not preferred', function () {
      const bid = utils.deepClone(DEFAULT_VIDEO_VALID_BID[0]);
      bid.mediaTypes.video.renderer = {
        url: 'test',
        render: () => {}
      };
      bid.mediaTypes.video.context = 'outstream';
      bid.mediaTypes.video.playerSize = [[300, 249]];
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });

    it('should return true when required params found for a banner or video ad', function () {
      expect(spec.isBidRequestValid(DEFAULT_BANNER_VALID_BID[0])).to.equal(true);
      expect(spec.isBidRequestValid(DEFAULT_VIDEO_VALID_BID[0])).to.equal(true);
      expect(spec.isBidRequestValid(DEFAULT_NATIVE_VALID_BID[0])).to.equal(true);
    });

    it('should return true when optional bidFloor params found for an ad', function () {
      const bid = utils.deepClone(DEFAULT_BANNER_VALID_BID[0]);
      bid.params.bidFloor = 50;
      bid.params.bidFloorCur = 'USD';
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });

    it('should return true when siteID is number', function () {
      const bid = utils.deepClone(DEFAULT_BANNER_VALID_BID[0]);
      bid.params.siteId = 123;
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });

    it('should return false when siteID is missing', function () {
      const bid = utils.deepClone(DEFAULT_BANNER_VALID_BID[0]);
      delete bid.params.siteId;
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should return True when size is missing ', function () {
      const bid = utils.deepClone(DEFAULT_BANNER_VALID_BID[0]);
      delete bid.params.size;
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });

    it('should return false when size array is wrong length', function () {
      const bid = utils.deepClone(DEFAULT_BANNER_VALID_BID[0]);
      bid.params.size = [
        300,
        250,
        250
      ];
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should return false when size array is array of strings', function () {
      const bid = utils.deepClone(DEFAULT_BANNER_VALID_BID[0]);
      bid.params.size = ['300', '250'];
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should return false when mediaTypes.banner does not have sizes', function () {
      const bid = utils.deepClone(DEFAULT_BANNER_VALID_BID[0]);
      bid.mediaTypes = {
        banner: {
          size: [[300, 250]]
        }
      };
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should return false when mediaTypes.video.playerSize does not include params.size', function () {
      const bid = utils.deepClone(DEFAULT_VIDEO_VALID_BID[0]);
      bid.mediaTypes = {
        video: {
          playerSize: [[300, 250]]
        }
      };
      bid.params.size = [100, 200];
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should return true when mediaTypes.video.playerSize includes params.size', function () {
      const bid = utils.deepClone(DEFAULT_VIDEO_VALID_BID[0]);
      bid.mediaTypes = {
        video: {
          playerSize: [[300, 250], [200, 300]]
        }
      };
      bid.params.size = [[300, 250]];
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });

    it('should return true when bid.params.size is missing', function () {
      const bid = utils.deepClone(DEFAULT_VIDEO_VALID_BID[0]);
      delete bid.params.size;
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });

    it('should return false when minduration is missing', function () {
      const bid = utils.deepClone(DEFAULT_VIDEO_VALID_BID[0]);
      delete bid.params.video.minduration;
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should return false when mediaType is native', function () {
      const bid = utils.deepClone(DEFAULT_NATIVE_VALID_BID[0]);
      delete bid.params.mediaTypes;
      bid.mediaType = 'native';
      bid.sizes = [[300, 250]];
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });

    it('should return true when mediaType is missing and has sizes', function () {
      const bid = utils.deepClone(DEFAULT_BANNER_VALID_BID[0]);
      delete bid.mediaTypes;
      bid.sizes = [[300, 250]];
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });

    it('should return true when mediaType is banner', function () {
      const bid = utils.deepClone(DEFAULT_BANNER_VALID_BID[0]);
      delete bid.mediaTypes;
      bid.mediaType = 'banner';
      bid.sizes = [[300, 250]];
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });

    it('should return true when mediaType is video', function () {
      const bid = utils.deepClone(DEFAULT_VIDEO_VALID_BID[0]);
      delete bid.mediaTypes;
      bid.mediaType = 'video';
      bid.sizes = [[400, 100]];
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });

    it('should return true for banner bid when there are multiple mediaTypes (banner, outstream)', function () {
      const bid = utils.deepClone(DEFAULT_MULTIFORMAT_BANNER_VALID_BID[0]);
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });

    it('should return true for video bid when there are multiple mediaTypes (banner, outstream)', function () {
      const bid = utils.deepClone(DEFAULT_MULTIFORMAT_VIDEO_VALID_BID[0]);
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });

    it('shoult return true for native bid when there are multiple mediaTypes (banner, native)', function () {
      const bid = utils.deepClone(DEFAULT_MULTIFORMAT_NATIVE_VALID_BID[0]);
      expect(spec.isBidRequestValid(bid)).to.be.true;
    });

    it('should return false when there is only bidFloor', function () {
      const bid = utils.deepClone(DEFAULT_BANNER_VALID_BID[0]);
      bid.params.bidFloor = 50;
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should return false when there is only bidFloorCur', function () {
      const bid = utils.deepClone(DEFAULT_BANNER_VALID_BID[0]);
      bid.params.bidFloorCur = 'USD';
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should return false when bidFloor is string', function () {
      const bid = utils.deepClone(DEFAULT_BANNER_VALID_BID[0]);
      bid.params.bidFloor = '50';
      bid.params.bidFloorCur = 'USD';
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should return false when bidFloorCur is number', function () {
      const bid = utils.deepClone(DEFAULT_BANNER_VALID_BID[0]);
      bid.params.bidFloor = 50;
      bid.params.bidFloorCur = 70;
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should return false when required video properties are missing on both adunit & param levels', function () {
      const bid = utils.deepClone(DEFAULT_VIDEO_VALID_BID[0]);
      delete bid.params.video.mimes;
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should return true when required video properties are at the adunit level', function () {
      const bid = utils.deepClone(DEFAULT_VIDEO_VALID_BID[0]);
      delete bid.params.video.mimes;
      bid.mediaTypes.video.mimes = ['video/mp4'];
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });

    it('should return true if protocols exists but protocol doesn\'t', function () {
      const bid = utils.deepClone(DEFAULT_VIDEO_VALID_BID[0]);
      expect(spec.isBidRequestValid(bid)).to.equal(true);
      delete bid.params.video.protocols;
      bid.mediaTypes.video.protocols = 1;
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });

    it('should return true if protocol exists but protocols doesn\'t', function () {
      const bid = utils.deepClone(DEFAULT_VIDEO_VALID_BID[0]);
      delete bid.params.video.protocols;
      bid.params.video.protocol = 1;
      expect(spec.isBidRequestValid(bid)).to.equal(true);
      delete bid.params.video.protocol;
      bid.mediaTypes.video.protocol = 1;
      expect(spec.isBidRequestValid(bid)).to.equal(true);
    });

    it('should return false if both protocol/protocols are missing', function () {
      const bid = utils.deepClone(DEFAULT_VIDEO_VALID_BID[0]);
      delete bid.params.video.protocols;
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should fail when native contains unrecongized properties', function () {
      let bid = utils.deepClone(DEFAULT_NATIVE_VALID_BID[0]);
      bid.mediaTypes.native.test = {}
      expect(spec.isBidRequestValid(bid)).to.be.false;
    });

    it('should fail if native mediaTypes should contains no valid assets', function () {
      let bid = utils.deepClone(DEFAULT_NATIVE_VALID_BID[0]);
      bid.mediaTypes.native = {}
      expect(spec.isBidRequestValid(bid)).to.be.false;
    });
  });

  describe('Roundel alias adapter', function () {
    const vaildBids = [DEFAULT_BANNER_VALID_BID, DEFAULT_VIDEO_VALID_BID, DEFAULT_MULTIFORMAT_BANNER_VALID_BID, DEFAULT_MULTIFORMAT_VIDEO_VALID_BID];
    const ALIAS_OPTIONS = Object.assign({
      bidderCode: 'roundel'
    }, DEFAULT_OPTION);

    it('should not build requests for mediaTypes if liveramp data is unavaliable', function () {
      vaildBids.forEach((validBid) => {
        const request = spec.buildRequests(validBid, ALIAS_OPTIONS);
        expect(request).to.be.an('array');
        expect(request).to.have.lengthOf(0);
      });
    });

    it('should build requests for mediaTypes if liveramp data is avaliable', function () {
      vaildBids.forEach((validBid) => {
        const cloneValidBid = utils.deepClone(validBid);
        cloneValidBid[0].userIdAsEids = utils.deepClone(DEFAULT_USERIDASEIDS_DATA);
        const request = spec.buildRequests(cloneValidBid, ALIAS_OPTIONS);
        const payload = JSON.parse(request[0].data.r);
        expect(request).to.be.an('array');
        expect(request).to.have.lengthOf.above(0); // should be 1 or more
        expect(payload.user.eids).to.have.lengthOf(6);
        expect(payload.user.eids).to.deep.include(DEFAULT_USERID_PAYLOAD[0]);
      });
    });
  });

  describe('buildRequestsIdentity', function () {
    let request;
    let query;
    let testCopy;

    beforeEach(function () {
      window.headertag = {};
      window.headertag.getIdentityInfo = function () {
        return testCopy;
      };
      request = spec.buildRequests(DEFAULT_BANNER_VALID_BID, DEFAULT_OPTION)[0];
      query = request.data;
    });

    afterEach(function () {
      delete window.headertag;
    });

    describe('buildRequestSingleRTI', function () {
      before(function () {
        testCopy = JSON.parse(JSON.stringify(DEFAULT_IDENTITY_RESPONSE));
      });

      it('payload should have correct format and value (single identity partner)', function () {
        const payload = JSON.parse(query.r);

        expect(payload.user).to.exist;
        expect(payload.user.eids).to.exist;
        expect(payload.user.eids).to.be.an('array');
        expect(payload.user.eids).to.have.lengthOf(1);
      });

      it('identity data in impression should have correct format and value (single identity partner)', function () {
        const impression = JSON.parse(query.r).user.eids;
        expect(impression[0].source).to.equal(testCopy.IdentityIp.data.source);
        expect(impression[0].uids[0].id).to.equal(testCopy.IdentityIp.data.uids[0].id);
      });
    });

    describe('buildRequestMultipleIds', function () {
      before(function () {
        testCopy = JSON.parse(JSON.stringify(DEFAULT_IDENTITY_RESPONSE));
        testCopy.IdentityIp.data.uids.push(
          {
            id: '1234567'
          },
          {
            id: '2019-04-01TF2:34:41'
          }
        );
      });

      it('payload should have correct format and value (single identity w/ multi ids)', function () {
        const payload = JSON.parse(query.r);

        expect(payload.user).to.exist;
        expect(payload.user.eids).to.exist;
        expect(payload.user.eids).to.be.an('array');
        expect(payload.user.eids).to.have.lengthOf(1);
      });

      it('identity data in impression should have correct format and value (single identity w/ multi ids)', function () {
        const impression = JSON.parse(query.r).user.eids;

        expect(impression[0].source).to.equal(testCopy.IdentityIp.data.source);
        expect(impression[0].uids).to.have.lengthOf(3);
      });
    });

    describe('buildRequestMultipleRTI', function () {
      before(function () {
        testCopy = JSON.parse(JSON.stringify(DEFAULT_IDENTITY_RESPONSE));
        testCopy.JackIp = {
          responsePending: false,
          data: {
            source: 'jackinc.com',
            uids: [
              {
                id: 'jackid'
              }
            ]
          }
        }
        testCopy.GenericIp = {
          responsePending: false,
          data: {
            source: 'genericip.com',
            uids: [
              {
                id: 'genericipenvelope'
              }
            ]
          }
        }
      });

      it('payload should have correct format and value (multiple identity partners)', function () {
        const payload = JSON.parse(query.r);

        expect(payload.user).to.exist;
        expect(payload.user.eids).to.exist;
        expect(payload.user.eids).to.be.an('array');
        expect(payload.user.eids).to.have.lengthOf(3);
      });

      it('identity data in impression should have correct format and value (multiple identity partners)', function () {
        const impression = JSON.parse(query.r).user.eids;

        expect(impression[0].source).to.equal(testCopy.IdentityIp.data.source);
        expect(impression[0].uids).to.have.lengthOf(1);

        expect(impression[1].source).to.equal(testCopy.JackIp.data.source);
        expect(impression[1].uids).to.have.lengthOf(1);

        expect(impression[2].source).to.equal(testCopy.GenericIp.data.source);
        expect(impression[2].uids).to.have.lengthOf(1);
      });
    });

    describe('buildRequestNoData', function () {
      beforeEach(function () {
        testCopy = JSON.parse(JSON.stringify(DEFAULT_IDENTITY_RESPONSE));
      });

      it('payload should not have any user eids with an undefined identity data response', function () {
        window.headertag.getIdentityInfo = function () {
          return undefined;
        };
        request = spec.buildRequests(DEFAULT_BANNER_VALID_BID, DEFAULT_OPTION)[0];
        query = request.data;
        const payload = JSON.parse(query.r);

        expect(payload.user).to.exist;
        expect(payload.user.eids).to.not.exist;
      });

      it('payload should have user eids if least one partner data is available', function () {
        testCopy.GenericIp = {
          responsePending: true,
          data: {}
        }
        request = spec.buildRequests(DEFAULT_BANNER_VALID_BID, DEFAULT_OPTION)[0];
        query = request.data;
        const payload = JSON.parse(query.r);

        expect(payload.user).to.exist;
        expect(payload.user.eids).to.exist;
      });

      it('payload should not have any user eids if identity data is pending for all partners', function () {
        testCopy.IdentityIp.responsePending = true;
        request = spec.buildRequests(DEFAULT_BANNER_VALID_BID, DEFAULT_OPTION)[0];
        query = request.data;
        const payload = JSON.parse(query.r);

        expect(payload.user).to.exist;
        expect(payload.user.eids).to.not.exist;
      });

      it('payload should not have any user eids if identity data is pending or not available for all partners', function () {
        testCopy.IdentityIp.responsePending = false;
        testCopy.IdentityIp.data = {};
        request = spec.buildRequests(DEFAULT_BANNER_VALID_BID, DEFAULT_OPTION)[0];
        query = request.data;
        const payload = JSON.parse(query.r);

        expect(payload.user).to.exist;
        expect(payload.user.eids).to.not.exist;
      });
    });
  });

  describe('buildRequestsUserId', function () {
    let validIdentityResponse;
    let validUserIdPayload;

    beforeEach(function () {
      window.headertag = {};
      window.headertag.getIdentityInfo = function () {
        return validIdentityResponse;
      };
    });

    afterEach(function () {
      delete window.headertag;
    });

    it('IX adapter reads supported user modules from Prebid and adds it to Video', function () {
      const cloneValidBid = utils.deepClone(DEFAULT_VIDEO_VALID_BID);
      cloneValidBid[0].userIdAsEids = utils.deepClone(DEFAULT_USERIDASEIDS_DATA);
      const request = spec.buildRequests(cloneValidBid, DEFAULT_OPTION)[0];
      const payload = JSON.parse(request.data.r);

      expect(payload.user.eids).to.have.lengthOf(6);
      expect(payload.user.eids).to.have.deep.members(DEFAULT_USERID_PAYLOAD);
    });

    it('We continue to send in IXL identity info and Prebid takes precedence over IXL', function () {
      validIdentityResponse = {
        AdserverOrgIp: {
          responsePending: false,
          data: {
            source: 'adserver.org',
            uids: [
              {
                id: '1234-5678-9012-3456',
                ext: {
                  rtiPartner: 'TDID'
                }
              },
              {
                id: 'FALSE',
                ext: {
                  rtiPartner: 'TDID_LOOKUP'
                }
              },
              {
                id: '2020-06-24T14:43:48.860Z',
                ext: {
                  rtiPartner: 'TDID_CREATED_AT'
                }
              }
            ]
          }
        },
        MerkleIp: {
          responsePending: false,
          data: {
            source: 'merkle.com',
            uids: [{
              id: '1234-5678-9012-3456',
              ext: {
                keyID: '1234-5678',
                enc: 1
              }
            }]
          }
        },
        LiveRampIp: {
          source: 'liveramp.com',
          uids: [
            {
              id: '0000-1234-4567-8901',
              ext: {
                rtiPartner: 'idl'
              }
            }
          ]
        },
        NetIdIp: {
          source: 'netid.de',
          uids: [
            {
              id: 'testnetid',
              ext: {
                rtiPartner: 'NETID'
              }
            }
          ]
        },
        NeustarIp: {
          source: 'neustar.biz',
          uids: [
            {
              id: 'testfabrick',
              ext: {
                rtiPartner: 'fabrickId'
              }
            }
          ]
        },
        ZeotapIp: {
          source: 'zeotap.com',
          uids: [
            {
              id: 'testzeotap',
              ext: {
                rtiPartner: 'zeotapIdPlus'
              }
            }
          ]
        }
      };

      const cloneValidBid = utils.deepClone(DEFAULT_BANNER_VALID_BID);
      cloneValidBid[0].userIdAsEids = utils.deepClone(DEFAULT_USERIDASEIDS_DATA);

      const request = spec.buildRequests(cloneValidBid, DEFAULT_OPTION)[0];
      const payload = JSON.parse(request.data.r);

      validUserIdPayload = utils.deepClone(DEFAULT_USERID_PAYLOAD);
      validUserIdPayload.push({
        source: 'merkle.com',
        uids: [{
          id: '1234-5678-9012-3456',
          ext: {
            keyID: '1234-5678',
            enc: 1
          }
        }]
      })
      validUserIdPayload.push({
        source: 'adserver.org',
        uids: [
          {
            id: '1234-5678-9012-3456',
            ext: {
              rtiPartner: 'TDID'
            }
          },
          {
            id: 'FALSE',
            ext: {
              rtiPartner: 'TDID_LOOKUP'
            }
          },
          {
            id: '2020-06-24T14:43:48.860Z',
            ext: {
              rtiPartner: 'TDID_CREATED_AT'
            }
          }
        ]
      })

      expect(payload.user).to.exist;
      expect(payload.user.eids).to.have.lengthOf(8);

      expect(payload.user.eids).to.have.deep.members(validUserIdPayload);
    });

    it('IXL and Prebid are mutually exclusive', function () {
      validIdentityResponse = {
        LiveIntentIp: {
          responsePending: false,
          data: {
            source: 'liveintent.com',
            uids: [{
              id: '1234-5678-9012-3456',
              ext: {
                keyID: '1234-5678',
                rtiPartner: 'LDID',
                enc: 1
              }
            }]
          }
        }
      };

      const cloneValidBid = utils.deepClone(DEFAULT_VIDEO_VALID_BID);
      cloneValidBid[0].userIdAsEids = utils.deepClone(DEFAULT_USERIDASEIDS_DATA);

      const request = spec.buildRequests(cloneValidBid, DEFAULT_OPTION)[0];

      validUserIdPayload = utils.deepClone(DEFAULT_USERID_PAYLOAD);
      validUserIdPayload.push({
        source: 'liveintent.com',
        uids: [{
          id: '1234-5678-9012-3456',
          ext: {
            keyID: '1234-5678',
            rtiPartner: 'LDID',
            enc: 1
          }
        }]
      });

      const payload = JSON.parse(request.data.r);
      expect(payload.user.eids).to.have.lengthOf(7);
      expect(payload.user.eids).to.have.deep.members(validUserIdPayload);
    });
  });

  describe('getUserIds', function () {
    it('request should contain userId information if configured and within bid request', function () {
      config.setConfig({
        userSync: {
          syncDelay: 0,
          userIds: [
            { name: 'lotamePanoramaId' },
            { name: 'merkleId' },
            { name: 'parrableId' },
          ]
        }
      });

      const bid = utils.deepClone(DEFAULT_BANNER_VALID_BID[0]);
      bid.userId = DEFAULT_USERID_BID_DATA;

      const request = spec.buildRequests([bid], DEFAULT_OPTION)[0];
      const r = JSON.parse(request.data.r);

      expect(r.ext.ixdiag.userIds).to.be.an('array');
      expect(r.ext.ixdiag.userIds.should.not.include('lotamePanoramaId'));
      expect(r.ext.ixdiag.userIds.should.not.include('merkleId'));
      expect(r.ext.ixdiag.userIds.should.not.include('parrableId'));
    });
  });

  describe('First party data', function () {
    it('should not set ixdiag.fpd value if not defined', function () {
      const request = spec.buildRequests(DEFAULT_BANNER_VALID_BID, {ortb2: {}})[0];
      const r = JSON.parse(request.data.r);

      expect(r.ext.ixdiag.fpd).to.be.undefined;
    });

    it('should set ixdiag.fpd value if it exists using ortb2', function () {
      const ortb2 = {
        site: {
          ext: {
            data: {
              pageType: 'article'
            }
          }
        }
      };

      const request = spec.buildRequests(DEFAULT_BANNER_VALID_BID, {ortb2})[0];
      const r = JSON.parse(request.data.r);

      expect(r.ext.ixdiag.fpd).to.exist;
    });

    it('should set ixdiag.tmax value if it exists using tmax', function () {
      config.setConfig({
        bidderTimeout: 250
      });

      const request = spec.buildRequests(DEFAULT_BANNER_VALID_BID)[0];
      const r = JSON.parse(request.data.r);

      expect(r.ext.ixdiag.tmax).to.equal(250);
    });

    it('should not set ixdiag.tmax value if bidderTimeout is undefined', function () {
      config.setConfig({
        bidderTimeout: null
      })
      const request = spec.buildRequests(DEFAULT_BANNER_VALID_BID)[0];
      const r = JSON.parse(request.data.r);

      expect(r.ext.ixdiag.tmax).to.be.undefined
    });

    it('should not send information that is not part of openRTB spec v2.5 using ortb2', function () {
      const ortb2 = {
        site: {
          keywords: 'power tools, drills',
          search: 'drill',
          testProperty: 'test_string'
        },
        user: {
          keywords: ['a'],
          testProperty: 'test_string'
        }
      };

      const request = spec.buildRequests(DEFAULT_BANNER_VALID_BID, {ortb2})[0];
      const r = JSON.parse(request.data.r);

      expect(r.site.keywords).to.exist;
      expect(r.site.search).to.exist;
      expect(r.site.testProperty).to.be.undefined;
      expect(r.user.keywords).to.exist;
      expect(r.user.testProperty).to.be.undefined;
    });

    it('should not add fpd data to r object if it exceeds maximum request', function () {
      const ortb2 = {
        site: {
          keywords: 'power tools, drills',
          search: 'drill',
        },
        user: {
          keywords: Array(1000).join('#'),
        }
      };

      const bid = utils.deepClone(DEFAULT_BANNER_VALID_BID[0]);
      bid.mediaTypes.banner.sizes = LARGE_SET_OF_SIZES;

      const request = spec.buildRequests([bid], {ortb2})[0];
      const r = JSON.parse(request.data.r);

      expect(r.site.ref).to.exist;
      expect(r.site.keywords).to.be.undefined;
      expect(r.user).to.be.undefined;
    });
  });

  describe('buildRequests', function () {
    let request = spec.buildRequests(DEFAULT_BANNER_VALID_BID, DEFAULT_OPTION)[0];
    const requestUrl = request.url;
    const requestMethod = request.method;
    const query = request.data;

    const bidWithoutSchain = utils.deepClone(DEFAULT_BANNER_VALID_BID);
    delete bidWithoutSchain[0].schain;
    const requestWithoutSchain = spec.buildRequests(bidWithoutSchain, DEFAULT_OPTION)[0];
    const queryWithoutSchain = requestWithoutSchain.data;
    const GPID = '/19968336/some-adunit-path';

    it('request should be made to IX endpoint with GET method', function () {
      expect(requestMethod).to.equal('GET');
      expect(requestUrl).to.equal(IX_SECURE_ENDPOINT);
    });

    it('auction type should be set correctly', function () {
      const at = JSON.parse(query.r).at;
      expect(at).to.equal(1);
    })

    it('query object (version, siteID and request) should be correct', function () {
      expect(query.v).to.equal(BANNER_ENDPOINT_VERSION);
      expect(query.s).to.equal(DEFAULT_BANNER_VALID_BID[0].params.siteId);
      expect(query.r).to.exist;
      expect(query.ac).to.equal('j');
      expect(query.sd).to.equal(1);
      expect(query.nf).not.to.exist;
    });

    it('should send dfp_adunit_code in request if ortb2Imp.ext.data.adserver.adslot exists', function () {
      const AD_UNIT_CODE = '/19968336/some-adunit-path';
      const validBids = utils.deepClone(DEFAULT_BANNER_VALID_BID);
      validBids[0].ortb2Imp = {
        ext: {
          data: {
            adserver: {
              name: 'gam',
              adslot: AD_UNIT_CODE
            }
          }
        }
      };
      const requests = spec.buildRequests(validBids, DEFAULT_OPTION);
      const { ext: { dfp_ad_unit_code } } = JSON.parse(requests[0].data.r).imp[0];
      expect(dfp_ad_unit_code).to.equal(AD_UNIT_CODE);
    });

    it('should send gpid in request if ortb2Imp.ext.gpid exists', function () {
      const validBids = utils.deepClone(DEFAULT_BANNER_VALID_BID);
      validBids[0].ortb2Imp = {
        ext: {
          gpid: GPID
        }
      };
      const requests = spec.buildRequests(validBids, DEFAULT_OPTION);
      const { ext: { gpid } } = JSON.parse(requests[0].data.r).imp[0];
      expect(gpid).to.equal(GPID);
    });

    it('should still build gpid in request if ortb2Imp.ext.gpid does not exist', function () {
      const AD_UNIT_CODE = '/1111/home';
      const validBids = utils.deepClone(DEFAULT_BANNER_VALID_BID);
      sinon.stub(utils, 'getGptSlotInfoForAdUnitCode')
        .returns({ gptSlot: AD_UNIT_CODE, divId: 'adunit-code-3-div-id' });
      validBids[0].ortb2Imp = {
        ext: {
          data: {
            adserver: {
              name: 'gam',
              adslot: AD_UNIT_CODE
            }
          }
        }
      }
      const requests = spec.buildRequests(validBids, DEFAULT_OPTION);
      const { ext: { gpid } } = JSON.parse(requests[0].data.r).imp[0];
      utils.getGptSlotInfoForAdUnitCode.restore();
      expect(gpid).to.equal(`${AD_UNIT_CODE}#adunit-code-3-div-id`);
    });

    it('should not build gpid if divid doesnt exist when ortb2Imp.ext.gpid does not exist', function () {
      const AD_UNIT_CODE = '/1111/home';
      const validBids = utils.deepClone(DEFAULT_BANNER_VALID_BID);
      sinon.stub(utils, 'getGptSlotInfoForAdUnitCode')
        .returns({ gptSlot: AD_UNIT_CODE });
      validBids[0].ortb2Imp = {
        ext: {
          data: {
            adserver: {
              name: 'gam',
              adslot: AD_UNIT_CODE
            }
          }
        }
      }
      const requests = spec.buildRequests(validBids, DEFAULT_OPTION);
      const imp = JSON.parse(requests[0].data.r).imp[0];
      utils.getGptSlotInfoForAdUnitCode.restore();
      expect(imp.ext.gpid).to.be.undefined;
      expect(imp.ext.dfp_ad_unit_code).to.equal(AD_UNIT_CODE)
    });

    it('should not build gpid if dfp ad unit code / divid doesnt exist when ortb2Imp.ext.gpid does not exist', function () {
      const AD_UNIT_CODE = '/1111/home';
      const validBids = utils.deepClone(DEFAULT_BANNER_VALID_BID);
      sinon.stub(utils, 'getGptSlotInfoForAdUnitCode')
        .returns({});
      validBids[0].ortb2Imp = {
        ext: {
          data: {
            adserver: {
              name: 'gam',
            }
          }
        }
      }
      const requests = spec.buildRequests(validBids, DEFAULT_OPTION);

      const imp = JSON.parse(requests[0].data.r).imp[0];
      utils.getGptSlotInfoForAdUnitCode.restore();
      expect(imp.ext).to.be.undefined;
    });

    it('should send gpid in request if ortb2Imp.ext.gpid exists when no size present', function () {
      const validBids = utils.deepClone(DEFAULT_BANNER_VALID_BID_PARAM_NO_SIZE);
      validBids[0].ortb2Imp = {
        ext: {
          gpid: GPID
        }
      };
      const requests = spec.buildRequests(validBids, DEFAULT_OPTION);
      const { ext: { gpid } } = JSON.parse(requests[0].data.r).imp[0];
      expect(gpid).to.equal(GPID);
    });

    it('should not send dfp_adunit_code in request if ortb2Imp.ext.data.adserver.adslot does not exists', function () {
      const GPID = '/19968336/some-adunit-path';
      const validBids = utils.deepClone(DEFAULT_BANNER_VALID_BID);
      validBids[0].ortb2Imp = {
        ext: {
          gpid: GPID
        }
      };
      const requests = spec.buildRequests(validBids, DEFAULT_OPTION);
      const imp = JSON.parse(requests[0].data.r).imp[0];
      expect(deepAccess(imp, 'ext.dfp_ad_unit_code')).to.not.exist;
    });

    it('should not send gpid in request if ortb2Imp.ext.gpid does not exists', function () {
      const AD_UNIT_CODE = '/19968336/some-adunit-path';
      const validBids = utils.deepClone(DEFAULT_BANNER_VALID_BID);
      validBids[0].ortb2Imp = {
        ext: {
          data: {
            adserver: {
              name: 'gam',
              adslot: AD_UNIT_CODE
            }
          }
        }
      };
      const requests = spec.buildRequests(validBids, DEFAULT_OPTION);
      const imp = JSON.parse(requests[0].data.r).imp[0];
      expect(deepAccess(imp, 'ext.gpid')).to.not.exist;
    });

    it('should send gpid & dfp_adunit_code if they exist in ortb2Imp.ext', function () {
      const AD_UNIT_CODE = '/1111/home';
      const GPID = '/1111/home-left';
      const validBids = utils.deepClone(DEFAULT_BANNER_VALID_BID);
      validBids[0].ortb2Imp = {
        ext: {
          gpid: GPID,
          data: {
            adserver: {
              name: 'gam',
              adslot: AD_UNIT_CODE
            }
          }
        }
      };
      const requests = spec.buildRequests(validBids, DEFAULT_OPTION);
      const imp = JSON.parse(requests[0].data.r).imp[0];
      expect(deepAccess(imp, 'ext.gpid')).to.equal(GPID);
      expect(deepAccess(imp, 'ext.dfp_ad_unit_code')).to.equal(AD_UNIT_CODE);
    });

    it('payload should have correct format and value', function () {
      const payload = JSON.parse(query.r);
      expect(payload.id).to.equal(DEFAULT_BANNER_VALID_BID[0].bidderRequestId);
      expect(payload.id).to.be.a('string');
      expect(payload.site.page).to.equal(DEFAULT_OPTION.refererInfo.page);
      expect(payload.site.ref).to.equal(document.referrer);
      expect(payload.ext.source).to.equal('prebid');
      expect(payload.source.ext.schain).to.deep.equal(SAMPLE_SCHAIN);
      expect(payload.imp).to.be.an('array');
      expect(payload.imp).to.have.lengthOf(1);
    });

    it('payload should have correct format and value for r.id when bidderRequestId is a number ', function () {
      const bidWithIntId = utils.deepClone(DEFAULT_BANNER_VALID_BID);
      bidWithIntId[0].bidderRequestId = 123456;

      request = spec.buildRequests(bidWithIntId, DEFAULT_OPTION)[0];

      const payload = JSON.parse(request.data.r);
      expect(bidWithIntId[0].bidderRequestId).to.be.a('number');
      expect(payload.id).to.equal(bidWithIntId[0].bidderRequestId.toString());
      expect(payload.id).to.be.a('string');
    });

    it('payload should have correct format and value for r.id when bidderRequestId is a number ', function () {
      const bidWithIntId = utils.deepClone(DEFAULT_BANNER_VALID_BID);
      bidWithIntId[0].bidderRequestId = 123456;

      request = spec.buildRequests(bidWithIntId, DEFAULT_OPTION)[0];

      const payload = JSON.parse(request.data.r);
      expect(bidWithIntId[0].bidderRequestId).to.be.a('number');
      expect(payload.id).to.equal(bidWithIntId[0].bidderRequestId.toString());
      expect(payload.id).to.be.a('string');
    });

    it('payload should not include schain when not provided', function () {
      const payload = JSON.parse(queryWithoutSchain.r);
      expect(payload.source).to.not.exist; // source object currently only written for schain
    });

    it('impression should have correct format and value', function () {
      const impression = JSON.parse(query.r).imp[0];

      expect(impression.id).to.equal(DEFAULT_BANNER_VALID_BID[0].bidId);
      expect(impression.banner.format).to.be.length(2);
      expect(impression.banner.topframe).to.be.oneOf([0, 1]);
      expect(impression.ext.tid).to.equal(DEFAULT_BANNER_VALID_BID[0].transactionId);

      impression.banner.format.map(({ w, h, ext }, index) => {
        const size = DEFAULT_BANNER_VALID_BID[0].mediaTypes.banner.sizes[index];
        const sidValue = utils.parseGPTSingleSizeArray(size);

        expect(w).to.equal(size[0]);
        expect(h).to.equal(size[1]);
        expect(ext.siteID).to.equal(DEFAULT_BANNER_VALID_BID[0].params.siteId);
        expect(ext.sid).to.equal(sidValue);
      });
    });

    it('payload should have imp[].banner.format[].ext.siteID as string ', function () {
      const bid = utils.deepClone(DEFAULT_BANNER_VALID_BID[0]);
      bid.params.siteId = 1234;

      request = spec.buildRequests([bid], DEFAULT_OPTION)[0];

      const payload = JSON.parse(request.data.r);
      payload.imp[0].banner.format.forEach((imp) => {
        expect(imp.ext.siteID).to.be.a('string');
      });
    });

    describe('build requests with price floors', () => {
      const highFloor = 4.5;
      const lowFloor = 3.5;
      const currency = 'USD';

      it('video impression should contain floors from priceFloors module', function () {
        const bid = utils.deepClone(ONE_VIDEO[0]);
        const expectedFloor = 3.25;
        bid.getFloor = () => ({ floor: expectedFloor, currency });
        const request = spec.buildRequests([bid], {})[0];
        const impression = JSON.parse(request.data.r).imp[0];

        expect(impression.bidfloor).to.equal(expectedFloor);
        expect(impression.bidfloorcur).to.equal(currency);
        expect(impression.ext.fl).to.equal('p');
      });

      it('banner impression should contain floors from priceFloors module', function () {
        const bid = utils.deepClone(DEFAULT_BANNER_VALID_BID[0])
        const expectedFloor = 3.25;
        bid.getFloor = () => ({ floor: expectedFloor, currency });
        const request = spec.buildRequests([bid], {})[0];
        const impression = JSON.parse(request.data.r).imp[0];

        expect(impression.bidfloor).to.equal(expectedFloor);
        expect(impression.bidfloorcur).to.equal(currency);
        expect(impression.banner.format[0].ext.fl).to.equal('p');
      });

      it('should default to ix floors when priceFloors Module is not implemented', function () {
        const bid = utils.deepClone(ONE_BANNER[0]);
        bid.params.bidFloor = highFloor;
        bid.params.bidFloorCur = 'USD'
        const request = spec.buildRequests([bid], {})[0];
        const impression = JSON.parse(request.data.r).imp[0];

        expect(impression.bidfloor).to.equal(highFloor);
        expect(impression.bidfloorcur).to.equal(bid.params.bidFloorCur);
        expect(impression.banner.format[0].ext.fl).to.equal('x');
      });

      it('should prioritize priceFloors Module over IX param floors', function () {
        const bid = utils.deepClone(ONE_BANNER[0]);
        bid.params.bidFloor = lowFloor;
        bid.params.bidFloorCur = 'USD';
        const expectedFloor = highFloor;
        bid.getFloor = () => ({ floor: expectedFloor, currency });
        const requestBidFloor = spec.buildRequests([bid], {})[0];
        const impression = JSON.parse(requestBidFloor.data.r).imp[0];

        expect(impression.bidfloor).to.equal(highFloor);
        expect(impression.bidfloorcur).to.equal(bid.params.bidFloorCur);
        expect(impression.banner.format[0].ext.fl).to.equal('p');
      });

      it('impression should have bidFloor and bidFloorCur if configured', function () {
        const bid = utils.deepClone(DEFAULT_BANNER_VALID_BID[0]);
        bid.params.bidFloor = 50;
        bid.params.bidFloorCur = 'USD';
        const requestBidFloor = spec.buildRequests([bid], {})[0];
        const impression = JSON.parse(requestBidFloor.data.r).imp[0];

        expect(impression.bidfloor).to.equal(bid.params.bidFloor);
        expect(impression.bidfloorcur).to.equal(bid.params.bidFloorCur);
        expect(impression.banner.format[0].ext.fl).to.equal('x');
      });

      it('missing sizes impressions should contain floors from priceFloors module ', function () {
        const bid = utils.deepClone(ONE_BANNER[0]);
        bid.mediaTypes.banner.sizes.push([500, 400])

        const expectedFloor = 3.25;
        bid.getFloor = () => ({ floor: expectedFloor, currency });

        sinon.spy(bid, 'getFloor');

        const requestBidFloor = spec.buildRequests([bid], {})[0];
        expect(bid.getFloor.getCall(0).args[0].mediaType).to.equal('banner');
        expect(bid.getFloor.getCall(0).args[0].size[0]).to.equal(300);
        expect(bid.getFloor.getCall(0).args[0].size[1]).to.equal(250);

        expect(bid.getFloor.getCall(1).args[0].mediaType).to.equal('banner');
        expect(bid.getFloor.getCall(1).args[0].size[0]).to.equal(500);
        expect(bid.getFloor.getCall(1).args[0].size[1]).to.equal(400);

        const impression = JSON.parse(requestBidFloor.data.r).imp[0];
        expect(impression.bidfloor).to.equal(expectedFloor);
        expect(impression.bidfloorcur).to.equal(currency);
      });

      it('banner impressions should have pricefloors in AdUnit', function () {
        const bid = utils.deepClone(ONE_BANNER[0]);

        const expectedFloor = 4.3;
        bid.floors = {
          currency: 'USD',
          schema: {
            delimiter: '|',
            fields: ['mediaType', 'size']
          },
          values: {
            'banner|300x250': expectedFloor,
            'banner|600x500': 6.5,
            'banner|*': 7.5
          }
        };
        bid.getFloor = () => ({ floor: expectedFloor, currency });

        sinon.spy(bid, 'getFloor');

        const requestBidFloor = spec.buildRequests([bid], {})[0];
        expect(bid.getFloor.getCall(0).args[0].mediaType).to.equal('banner');
        expect(bid.getFloor.getCall(0).args[0].size[0]).to.equal(300);
        expect(bid.getFloor.getCall(0).args[0].size[1]).to.equal(250);

        const impression = JSON.parse(requestBidFloor.data.r).imp[0];
        expect(impression.bidfloor).to.equal(expectedFloor);
        expect(impression.bidfloorcur).to.equal(currency);
      });
    });

    it('impression should have sid if id is configured as number', function () {
      const bid = utils.deepClone(DEFAULT_BANNER_VALID_BID[0]);
      bid.params.id = 50;
      const requestBidFloor = spec.buildRequests([bid], {})[0];
      const impression = JSON.parse(requestBidFloor.data.r).imp[0];

      expect(impression.id).to.equal(DEFAULT_BANNER_VALID_BID[0].bidId);
      expect(impression.banner.format[0].w).to.equal(DEFAULT_BANNER_VALID_BID[0].params.size[0]);
      expect(impression.banner.format[0].h).to.equal(DEFAULT_BANNER_VALID_BID[0].params.size[1]);
      expect(impression.banner.topframe).to.be.oneOf([0, 1]);
      expect(impression.banner.format[0].ext.siteID).to.equal(DEFAULT_BANNER_VALID_BID[0].params.siteId);
      expect(impression.banner.format[0].ext.sid).to.equal('50');
    });

    it('impression should have sid if id is configured as string', function () {
      const bid = utils.deepClone(DEFAULT_BANNER_VALID_BID[0]);
      bid.params.id = 'abc';
      const requestBidFloor = spec.buildRequests([bid], {})[0];
      const impression = JSON.parse(requestBidFloor.data.r).imp[0];

      expect(impression.id).to.equal(DEFAULT_BANNER_VALID_BID[0].bidId);
      expect(impression.banner.format[0].w).to.equal(DEFAULT_BANNER_VALID_BID[0].params.size[0]);
      expect(impression.banner.format[0].h).to.equal(DEFAULT_BANNER_VALID_BID[0].params.size[1]);
      expect(impression.banner.topframe).to.be.oneOf([0, 1]);
      expect(impression.banner.format[0].ext.siteID).to.equal(DEFAULT_BANNER_VALID_BID[0].params.siteId);
      expect(impression.banner.format[0].ext.sid).to.equal('abc');
    });

    describe('first party data', () => {
      beforeEach(() => {
        config.resetConfig();
      });

      it('should add first party data to page url in bid request if it exists in config', function () {
        config.setConfig({
          ix: {
            firstPartyData: {
              ab: 123,
              cd: '123#ab',
              'e/f': 456,
              'h?g': '456#cd'
            }
          }
        });

        const requestWithFirstPartyData = spec.buildRequests(DEFAULT_BANNER_VALID_BID, DEFAULT_OPTION)[0];
        const pageUrl = JSON.parse(requestWithFirstPartyData.data.r).site.page;
        const expectedPageUrl = DEFAULT_OPTION.refererInfo.page + '?ab=123&cd=123%23ab&e%2Ff=456&h%3Fg=456%23cd';
        expect(pageUrl).to.equal(expectedPageUrl);
      });

      it('should not set first party data if it is not an object', function () {
        config.setConfig({
          ix: {
            firstPartyData: 500
          }
        });

        const requestFirstPartyDataNumber = spec.buildRequests(DEFAULT_BANNER_VALID_BID, DEFAULT_OPTION)[0];
        const pageUrl = JSON.parse(requestFirstPartyDataNumber.data.r).site.page;

        expect(pageUrl).to.equal(DEFAULT_OPTION.refererInfo.page);
      });

      it('should not set first party or timeout if it is not present', function () {
        config.setConfig({
          ix: {}
        });

        const requestWithoutConfig = spec.buildRequests(DEFAULT_BANNER_VALID_BID, DEFAULT_OPTION)[0];
        const pageUrl = JSON.parse(requestWithoutConfig.data.r).site.page;

        expect(pageUrl).to.equal(DEFAULT_OPTION.refererInfo.page);
        expect(requestWithoutConfig.data.t).to.be.undefined;
      });

      it('should not set first party or timeout if it is setConfig is not called', function () {
        const requestWithoutConfig = spec.buildRequests(DEFAULT_BANNER_VALID_BID, DEFAULT_OPTION)[0];
        const pageUrl = JSON.parse(requestWithoutConfig.data.r).site.page;

        expect(pageUrl).to.equal(DEFAULT_OPTION.refererInfo.page);
        expect(requestWithoutConfig.data.t).to.be.undefined;
      });

      it('should set timeout if publisher set it through setConfig', function () {
        config.setConfig({
          ix: {
            timeout: 500
          }
        });
        const requestWithTimeout = spec.buildRequests(DEFAULT_BANNER_VALID_BID, {})[0];

        expect(requestWithTimeout.data.t).to.equal(500);
      });

      it('should set timeout if timeout is a string', function () {
        config.setConfig({
          ix: {
            timeout: '500'
          }
        });
        const requestStringTimeout = spec.buildRequests(DEFAULT_BANNER_VALID_BID, {})[0];

        expect(requestStringTimeout.data.t).to.be.undefined;
      });
    });

    describe('request should contain both banner and video requests', function () {
      const request = spec.buildRequests([DEFAULT_BANNER_VALID_BID[0], DEFAULT_VIDEO_VALID_BID[0]], {});
      it('should have banner request', () => {
        const bannerImpression = JSON.parse(request[0].data.r).imp[0];

        expect(JSON.parse(request[0].data.r).imp).to.have.lengthOf(1);
        expect(JSON.parse(request[0].data.v)).to.equal(BANNER_ENDPOINT_VERSION);
        expect(bannerImpression.id).to.equal(DEFAULT_BANNER_VALID_BID[0].bidId);

        expect(bannerImpression.banner.format).to.be.length(2);
        expect(bannerImpression.banner.topframe).to.be.oneOf([0, 1]);

        bannerImpression.banner.format.map(({ w, h, ext }, index) => {
          const size = DEFAULT_BANNER_VALID_BID[0].mediaTypes.banner.sizes[index];
          const sidValue = utils.parseGPTSingleSizeArray(size);

          expect(w).to.equal(size[0]);
          expect(h).to.equal(size[1]);
          expect(ext.siteID).to.equal(DEFAULT_BANNER_VALID_BID[0].params.siteId);
          expect(ext.sid).to.equal(sidValue);
        });
      });

      it('should have video request', () => {
        const videoImpression = JSON.parse(request[1].data.r).imp[0];

        expect(JSON.parse(request[1].data.v)).to.equal(VIDEO_ENDPOINT_VERSION);
        expect(videoImpression.id).to.equal(DEFAULT_VIDEO_VALID_BID[0].bidId);
        expect(videoImpression.video.w).to.equal(DEFAULT_VIDEO_VALID_BID[0].params.size[0]);
        expect(videoImpression.video.h).to.equal(DEFAULT_VIDEO_VALID_BID[0].params.size[1]);
      });
    });

    describe('request should contain both banner and native requests', function () {
      const request = spec.buildRequests([DEFAULT_BANNER_VALID_BID[0], DEFAULT_NATIVE_VALID_BID[0]]);

      it('should have banner request', () => {
        const bannerImpression = JSON.parse(request[0].data.r).imp[0];

        expect(JSON.parse(request[0].data.r).imp).to.have.lengthOf(1);
        expect(JSON.parse(request[0].data.v)).to.equal(BANNER_ENDPOINT_VERSION);
        expect(bannerImpression.id).to.equal(DEFAULT_BANNER_VALID_BID[0].bidId);

        expect(bannerImpression.banner.format).to.be.length(2);
        expect(bannerImpression.banner.topframe).to.be.oneOf([0, 1]);

        bannerImpression.banner.format.map(({ w, h, ext }, index) => {
          const size = DEFAULT_BANNER_VALID_BID[0].mediaTypes.banner.sizes[index];
          const sidValue = utils.parseGPTSingleSizeArray(size);

          expect(w).to.equal(size[0]);
          expect(h).to.equal(size[1]);
          expect(ext.siteID).to.equal(DEFAULT_BANNER_VALID_BID[0].params.siteId);
          expect(ext.sid).to.equal(sidValue);
        });
      });

      it('should have native request', () => {
        const nativeImpression = JSON.parse(request[1].data.r).imp[0];

        expect(request[1].data.v).to.equal(NATIVE_ENDPOINT_VERSION);
        expect(nativeImpression.id).to.equal(DEFAULT_NATIVE_VALID_BID[0].bidId);
        expect(nativeImpression.native).to.deep.equal(DEFAULT_NATIVE_IMP);
      });
    });

    it('single request under 8k size limit for large ad unit', function () {
      const options = {};
      const bid = utils.deepClone(DEFAULT_BANNER_VALID_BID[0]);
      bid.mediaTypes.banner.sizes = LARGE_SET_OF_SIZES;
      const requests = spec.buildRequests([bid], options);

      const reqSize = `${requests[0].url}?${utils.parseQueryStringParameters(requests[0].data)}`.length;
      expect(requests).to.be.an('array');
      expect(requests).to.have.lengthOf(1);
      expect(reqSize).to.be.lessThan(8000);
      expect(requests[0].data.sn).to.be.undefined;
    });

    it('2 requests due to 2 ad units, one larger than url size', function () {
      const bid = utils.deepClone(DEFAULT_BANNER_VALID_BID[0]);
      bid.mediaTypes.banner.sizes = LARGE_SET_OF_SIZES;
      bid.params.siteId = '124';
      bid.adUnitCode = 'div-gpt-1'
      bid.transactionId = '152e36d1-1241-4242-t35e-y1dv34d12315';
      bid.bidId = '2f6g5s5e';

      const requests = spec.buildRequests([bid, DEFAULT_BANNER_VALID_BID[0]], DEFAULT_OPTION);
      expect(requests).to.be.an('array');
      expect(requests).to.have.lengthOf(2);
      expect(requests[0].data.sn).to.be.equal(0);
      expect(requests[1].data.sn).to.be.equal(1);
    });

    it('6 ad units should generate only 4 requests', function () {
      const bid1 = utils.deepClone(DEFAULT_BANNER_VALID_BID[0]);
      bid1.mediaTypes.banner.sizes = LARGE_SET_OF_SIZES;
      bid1.params.siteId = '121';
      bid1.adUnitCode = 'div-gpt-1'
      bid1.transactionId = 'tr1';
      bid1.bidId = '2f6g5s5e';

      const bid2 = utils.deepClone(bid1);
      bid2.transactionId = 'tr2';

      const bid3 = utils.deepClone(bid1);
      bid3.transactionId = 'tr3';

      const bid4 = utils.deepClone(bid1);
      bid4.transactionId = 'tr4';

      const bid5 = utils.deepClone(bid1);
      bid5.transactionId = 'tr5';

      const bid6 = utils.deepClone(bid1);
      bid6.transactionId = 'tr6';

      const requests = spec.buildRequests([bid1, bid2, bid3, bid4, bid5, bid6], DEFAULT_OPTION);

      expect(requests).to.be.an('array');
      expect(requests).to.have.lengthOf(4);

      for (var i = 0; i < requests.length; i++) {
        const reqSize = `${requests[i].url}?${utils.parseQueryStringParameters(requests[i].data)}`.length;
        expect(reqSize).to.be.lessThan(8000);
        let payload = JSON.parse(requests[i].data.r);
        if (requests.length > 1) {
          expect(requests[i].data.sn).to.equal(i);
        }
        expect(payload.source.ext.schain).to.deep.equal(SAMPLE_SCHAIN);
      }
    });

    it('multiple ad units in one request', function () {
      const bid1 = utils.deepClone(DEFAULT_BANNER_VALID_BID[0]);
      bid1.mediaTypes.banner.sizes = [[300, 250], [300, 600], [100, 200]];
      bid1.params.siteId = '121';
      bid1.adUnitCode = 'div-gpt-1'
      bid1.transactionId = 'tr1';
      bid1.bidId = '2f6g5s5e';

      const bid2 = utils.deepClone(bid1);
      bid2.transactionId = 'tr2';
      bid2.mediaTypes.banner.sizes = [[220, 221], [222, 223], [300, 250]];
      const bid3 = utils.deepClone(bid1);
      bid3.transactionId = 'tr3';
      bid3.mediaTypes.banner.sizes = [[330, 331], [332, 333], [300, 250]];

      const requests = spec.buildRequests([bid1, bid2, bid3], DEFAULT_OPTION);

      expect(requests).to.be.an('array');
      expect(requests).to.have.lengthOf(1);

      const impressions = JSON.parse(requests[0].data.r).imp;
      expect(impressions).to.be.an('array');
      expect(impressions).to.have.lengthOf(3);
      expect(requests[0].data.sn).to.be.undefined;
    });

    it('request should contain the extra banner ad sizes that IX is not configured for using the first site id in the ad unit', function () {
      const bid = utils.deepClone(DEFAULT_BANNER_VALID_BID[0]);
      bid.sizes.push([336, 280], [970, 90]);
      bid.mediaTypes.banner.sizes.push([336, 280], [970, 90]);
      const bid2 = utils.deepClone(bid);
      bid2.params.siteId = '124';
      bid2.params.size = [300, 600];
      bid2.params.bidId = '2b3c4d5e';

      const request = spec.buildRequests([bid, bid2], DEFAULT_OPTION)[0];
      const impression = JSON.parse(request.data.r).imp[0];

      expect(impression.id).to.equal(bid.bidId);
      expect(impression.banner.format).to.be.length(bid.mediaTypes.banner.sizes.length);
      expect(impression.banner.topframe).to.be.oneOf([0, 1]);

      impression.banner.format.map(({ w, h, ext }, index) => {
        const size = bid.mediaTypes.banner.sizes[index];
        const sidValue = utils.parseGPTSingleSizeArray(size);

        expect(w).to.equal(size[0]);
        expect(h).to.equal(size[1]);
        expect(ext.siteID).to.equal(index === 1 ? bid2.params.siteId : bid.params.siteId);
        expect(ext.sid).to.equal(sidValue);
      });
    });

    it('request should contain the extra banner ad sizes and their corresponding site ids when there is multiple ad units', function () {
      const bid = utils.deepClone(DEFAULT_BANNER_VALID_BID[0]);
      bid.params.siteId = '124';
      bid.adUnitCode = 'div-gpt-ad-156456451554-1'
      bid.transactionId = '152e36d1-1241-4242-t35e-y1dv34d12315';
      bid.bidId = '2f6g5s5e';
      bid.params.size = [336, 280]
      bid.sizes = [[336, 280], [970, 90]]
      bid.mediaTypes.banner.sizes = [[336, 280], [970, 90]]

      const bids = [DEFAULT_BANNER_VALID_BID[0], bid];
      const request = spec.buildRequests(bids, DEFAULT_OPTION)[0];

      const impressions = JSON.parse(request.data.r).imp;
      expect(impressions).to.be.an('array');
      expect(impressions).to.have.lengthOf(2);
      expect(request.data.sn).to.be.undefined;

      impressions.map((impression, impressionIndex) => {
        const firstSizeObject = bids[impressionIndex].mediaTypes.banner.sizes[0];

        expect(impression.banner.format).to.be.length(2);
        expect(impression.banner.topframe).to.be.oneOf([0, 1]);

        impression.banner.format.map(({ w, h, ext }, index) => {
          const size = bids[impressionIndex].mediaTypes.banner.sizes[index];
          const sidValue = utils.parseGPTSingleSizeArray(size);

          expect(w).to.equal(size[0]);
          expect(h).to.equal(size[1]);
          expect(ext.siteID).to.equal(bids[impressionIndex].params.siteId);
          expect(ext.sid).to.equal(sidValue);
        });
      });
    });

    it('request should not contain the extra video ad sizes that IX is not configured for', function () {
      const request = spec.buildRequests(DEFAULT_VIDEO_VALID_BID, DEFAULT_OPTION);
      const impressions = JSON.parse(request[0].data.r).imp;

      expect(impressions).to.be.an('array');
      expect(impressions).to.have.lengthOf(1);
    });

    describe('detect missing sizes', function () {
      beforeEach(function () {
        config.setConfig({
          ix: {
            detectMissingSizes: false
          }
        });
      })

      it('request should not contain missing sizes if detectMissingSizes = false', function () {
        const bid1 = utils.deepClone(DEFAULT_BANNER_VALID_BID[0]);
        bid1.mediaTypes.banner.sizes = LARGE_SET_OF_SIZES;

        const requests = spec.buildRequests([bid1, DEFAULT_BANNER_VALID_BID[0]], DEFAULT_OPTION);

        const impressions = JSON.parse(requests[0].data.r).imp;

        expect(impressions).to.be.an('array');
        expect(impressions).to.have.lengthOf(1);
      });
    });
  });

  describe('buildRequestVideo', function () {
    const request = spec.buildRequests(DEFAULT_VIDEO_VALID_BID, DEFAULT_OPTION);
    const query = request[0].data;

    it('query object (version, siteID and request) should be correct', function () {
      expect(query.v).to.equal(VIDEO_ENDPOINT_VERSION);
      expect(query.s).to.equal(DEFAULT_VIDEO_VALID_BID[0].params.siteId);
      expect(query.r).to.exist;
      expect(query.ac).to.equal('j');
      expect(query.sd).to.equal(1);
      expect(query.nf).to.equal(1);
    });

    it('auction type should be set correctly', function () {
      const at = JSON.parse(query.r).at;
      expect(at).to.equal(1);
    })

    it('impression should have correct format and value', function () {
      const impression = JSON.parse(query.r).imp[0];
      const sidValue = utils.parseGPTSingleSizeArray(DEFAULT_VIDEO_VALID_BID[0].params.size);

      expect(impression.id).to.equal(DEFAULT_VIDEO_VALID_BID[0].bidId);
      expect(impression.video.w).to.equal(DEFAULT_VIDEO_VALID_BID[0].params.size[0]);
      expect(impression.video.h).to.equal(DEFAULT_VIDEO_VALID_BID[0].params.size[1]);
      expect(impression.video.placement).to.equal(1);
      expect(impression.video.minduration).to.exist;
      expect(impression.video.minduration).to.equal(0);
      expect(impression.video.mimes[0]).to.equal('video/mp4');
      expect(impression.video.mimes[1]).to.equal('video/webm');

      expect(impression.video.skippable).to.equal(false);
    });

    it('should not use default placement values when placement is defined at adUnit level', function () {
      const bid = utils.deepClone(DEFAULT_VIDEO_VALID_BID[0]);
      bid.mediaTypes.video.context = 'outstream';
      bid.mediaTypes.video.placement = 2;
      const request = spec.buildRequests([bid], {})[0];
      const impression = JSON.parse(request.data.r).imp[0];

      expect(impression.id).to.equal(DEFAULT_VIDEO_VALID_BID[0].bidId);
      expect(impression.video.placement).to.equal(2);
    });

    it('should set correct default placement, if context is instream', function () {
      const bid = utils.deepClone(DEFAULT_VIDEO_VALID_BID[0]);
      bid.mediaTypes.video.context = 'instream';
      const request = spec.buildRequests([bid], {})[0];
      const impression = JSON.parse(request.data.r).imp[0];

      expect(impression.id).to.equal(DEFAULT_VIDEO_VALID_BID[0].bidId);
      expect(impression.video.placement).to.equal(1);
    });

    it('should set correct default placement, if context is outstream', function () {
      const bid = utils.deepClone(DEFAULT_VIDEO_VALID_BID[0]);
      bid.mediaTypes.video.context = 'outstream';
      const request = spec.buildRequests([bid], {})[0];
      const impression = JSON.parse(request.data.r).imp[0];

      expect(impression.id).to.equal(DEFAULT_VIDEO_VALID_BID[0].bidId);
      expect(impression.video.placement).to.equal(4);
    });

    it('should handle unexpected context', function () {
      const bid = utils.deepClone(DEFAULT_VIDEO_VALID_BID[0]);
      bid.mediaTypes.video.context = 'not-valid';
      const request = spec.buildRequests([bid], {})[0];
      const impression = JSON.parse(request.data.r).imp[0];
      expect(impression.video.placement).to.be.undefined;
    });

    it('should not override video properties if they are already configured at the params video level', function () {
      const bid = utils.deepClone(DEFAULT_VIDEO_VALID_BID[0]);
      bid.mediaTypes.video.context = 'outstream';
      bid.mediaTypes.video.protocols = [1];
      bid.mediaTypes.video.mimes = ['video/override'];
      const request = spec.buildRequests([bid], {})[0];
      const impression = JSON.parse(request.data.r).imp[0];

      expect(impression.video.protocols[0]).to.equal(2);
      expect(impression.video.mimes[0]).to.not.equal('video/override');
    });

    it('should not add video adunit level properties in imp object if they are not allowlisted', function () {
      const bid = utils.deepClone(DEFAULT_VIDEO_VALID_BID[0]);
      bid.mediaTypes.video.context = 'outstream';
      bid.mediaTypes.video.random = true;
      const request = spec.buildRequests([bid], {})[0];
      const impression = JSON.parse(request.data.r).imp[0];

      expect(impression.video.random).to.not.exist;
    });

    it('should add allowlisted adunit level video properties in imp object if they are not configured at params level', function () {
      const bid = utils.deepClone(DEFAULT_VIDEO_VALID_BID[0]);
      bid.mediaTypes.video.context = 'outstream';
      delete bid.params.video.protocols;
      delete bid.params.video.mimes;
      bid.mediaTypes.video.protocols = [6];
      bid.mediaTypes.video.mimes = ['video/mp4'];
      bid.mediaTypes.video.api = 2;
      const request = spec.buildRequests([bid], {})[0];
      const impression = JSON.parse(request.data.r).imp[0];

      expect(impression.video.protocols[0]).to.equal(6);
      expect(impression.video.api).to.equal(2);
      expect(impression.video.mimes[0]).to.equal('video/mp4');
    });

    it('should send gpid in request if ortb2Imp.ext.gpid exists', function () {
      const GPID = '/19968336/some-adunit-path';
      const validBids = utils.deepClone(DEFAULT_VIDEO_VALID_BID);
      validBids[0].ortb2Imp = {
        ext: {
          gpid: GPID
        }
      };
      const requests = spec.buildRequests(validBids, DEFAULT_OPTION);
      const { ext: { gpid } } = JSON.parse(requests[0].data.r).imp[0];
      expect(gpid).to.equal(GPID);
    });

    it('should build video request when if video obj is not provided at params level', () => {
      const request = spec.buildRequests([DEFAULT_VIDEO_VALID_BID_NO_VIDEO_PARAMS[0]], {});
      const videoImpression = JSON.parse(request[0].data.r).imp[0];

      expect(JSON.parse(request[0].data.v)).to.equal(VIDEO_ENDPOINT_VERSION);
      expect(videoImpression.id).to.equal(DEFAULT_VIDEO_VALID_BID_NO_VIDEO_PARAMS[0].bidId);
      expect(videoImpression.video.w).to.equal(DEFAULT_VIDEO_VALID_BID_NO_VIDEO_PARAMS[0].mediaTypes.video.playerSize[0][0]);
      expect(videoImpression.video.h).to.equal(DEFAULT_VIDEO_VALID_BID_NO_VIDEO_PARAMS[0].mediaTypes.video.playerSize[0][1]);
    });

    it('should set different placement for floating ad units', () => {
      const bid = utils.deepClone(DEFAULT_VIDEO_VALID_BID[0]);
      bid.mediaTypes.video.context = 'outstream';
      bid.params.video.playerConfig = {
        floatOnScroll: true
      };

      const request = spec.buildRequests([bid]);
      const videoImpression = JSON.parse(request[0].data.r).imp[0];

      expect(videoImpression.video.placement).to.eq(5);
    })
  });

  describe('buildRequestNative', function () {
    it('should build request with expected params', function() {
      const request = spec.buildRequests(DEFAULT_NATIVE_VALID_BID, DEFAULT_OPTION);
      const query = request[0].data;

      expect(query.v).to.equal(NATIVE_ENDPOINT_VERSION);
      expect(query.s).to.equal(DEFAULT_NATIVE_VALID_BID[0].params.siteId);
      expect(query.r).to.exist;
      expect(query.ac).to.equal('j');
      expect(query.sd).to.equal(1);
      expect(JSON.parse(query.r).at).to.equal(1);
    });

    it('should send gpid in request if ortb2Imp.ext.gpid exists', function () {
      const GPID = '/19968336/some-adunit-path';
      const bids = utils.deepClone(DEFAULT_NATIVE_VALID_BID);
      bids[0].ortb2Imp = {
        ext: {
          gpid: GPID
        }
      };
      const requests = spec.buildRequests(bids, DEFAULT_OPTION);
      const { ext: { gpid } } = JSON.parse(requests[0].data.r).imp[0];
      expect(gpid).to.equal(GPID);
    });

    it('should build request with required asset properties with default values', function() {
      const request = spec.buildRequests(DEFAULT_NATIVE_VALID_BID, DEFAULT_OPTION);
      const nativeImpression = JSON.parse(request[0].data.r).imp[0];

      expect(request[0].data.v).to.equal(NATIVE_ENDPOINT_VERSION);
      expect(nativeImpression.id).to.equal(DEFAULT_NATIVE_VALID_BID[0].bidId);
      expect(nativeImpression.native).to.deep.equal(DEFAULT_NATIVE_IMP);
    });

    it('should build request with given asset properties', function() {
      let bid = utils.deepClone(DEFAULT_NATIVE_VALID_BID)
      bid[0].mediaTypes.native = {
        title: {
          len: 200
        },
        video: {
          mimes: [
            'javascript'
          ],
          minduration: 10,
          maxduration: 60,
          protocols: [1]
        }
      }
      const request = spec.buildRequests(bid, DEFAULT_OPTION);
      const nativeImpression = JSON.parse(request[0].data.r).imp[0];
      expect(nativeImpression.native).to.deep.equal({request: '{"assets":[{"required":0,"title":{"len":200},"id":100},{"required":0,"video":{"mimes":["javascript"],"minduration":10,"maxduration":60,"protocols":[1]},"id":300}],"ver":"1.2","eventtrackers":[{"event":1,"methods":[1,2]}],"privacy":1}', ver: '1.2'});
    });

    it('should build request with all possible Prebid asset properties', function() {
      let bid = utils.deepClone(DEFAULT_NATIVE_VALID_BID)
      bid[0].mediaTypes.native = {
        title: {
          required: false
        },
        body: {
          required: false
        },
        body2: {
          required: false
        },
        sponsoredBy: {
          required: false
        },
        icon: {
          required: false
        },
        image: {
          required: false
        },
        clickUrl: {
          required: false
        },
        displayUrl: {
          required: false
        },
        privacyLink: {
          required: false
        },
        privacyIcon: {
          required: false
        },
        cta: {
          required: false
        },
        rating: {
          required: false
        },
        downloads: {
          required: false
        },
        likes: {
          required: false
        },
        price: {
          required: false
        },
        salePrice: {
          required: false
        },
        address: {
          required: false
        },
        phone: {
          required: false
        },
      }
      const request = spec.buildRequests(bid, DEFAULT_OPTION);
      const nativeImpression = JSON.parse(request[0].data.r).imp[0];
      expect(nativeImpression.native).to.deep.equal({request: '{"assets":[{"required":0,"title":{"len":25},"id":100},{"required":0,"data":{"type":2},"id":402},{"required":0,"data":{"type":10},"id":410},{"required":0,"data":{"type":1},"id":401},{"required":0,"img":{"type":1},"id":201},{"required":0,"img":{"type":3},"id":203},{"required":0,"data":{"type":11},"id":411},{"required":0,"data":{"type":12},"id":412},{"required":0,"data":{"type":3},"id":403},{"required":0,"data":{"type":5},"id":405},{"required":0,"data":{"type":4},"id":404},{"required":0,"data":{"type":6},"id":406},{"required":0,"data":{"type":7},"id":407},{"required":0,"data":{"type":9},"id":409},{"required":0,"data":{"type":8},"id":408}],"ver":"1.2","eventtrackers":[{"event":1,"methods":[1,2]}],"privacy":1}', ver: '1.2'});
    })
  });

  describe('buildRequestMultiFormat', function () {
    it('only banner bidder params set', function () {
      const request = spec.buildRequests(DEFAULT_MULTIFORMAT_BANNER_VALID_BID, {})
      const bannerImpression = JSON.parse(request[0].data.r).imp[0];
      expect(JSON.parse(request[0].data.r).imp).to.have.lengthOf(1);
      expect(JSON.parse(request[0].data.v)).to.equal(BANNER_ENDPOINT_VERSION);
      expect(bannerImpression.id).to.equal(DEFAULT_MULTIFORMAT_BANNER_VALID_BID[0].bidId);
      expect(bannerImpression.banner.format[0].w).to.equal(DEFAULT_MULTIFORMAT_BANNER_VALID_BID[0].params.size[0]);
      expect(bannerImpression.banner.format[0].h).to.equal(DEFAULT_MULTIFORMAT_BANNER_VALID_BID[0].params.size[1]);
    });

    describe('only video bidder params set', function () {
      it('should generate video impression', function () {
        const request = spec.buildRequests(DEFAULT_MULTIFORMAT_VIDEO_VALID_BID, {});
        const videoImp = JSON.parse(request[1].data.r).imp[0];
        expect(JSON.parse(request[1].data.r).imp).to.have.lengthOf(1);
        expect(JSON.parse(request[1].data.v)).to.equal(VIDEO_ENDPOINT_VERSION);
        expect(videoImp.id).to.equal(DEFAULT_MULTIFORMAT_VIDEO_VALID_BID[0].bidId);
        expect(videoImp.video.w).to.equal(DEFAULT_MULTIFORMAT_VIDEO_VALID_BID[0].params.size[0]);
        expect(videoImp.video.h).to.equal(DEFAULT_MULTIFORMAT_VIDEO_VALID_BID[0].params.size[1]);
      });

      it('should get missing sizes count 0 when params.size not used', function () {
        const bid = utils.deepClone(DEFAULT_MULTIFORMAT_VIDEO_VALID_BID[0]);
        delete bid.params.size;
        const request = spec.buildRequests([bid], {});
        const diagObj = JSON.parse(request[0].data.r).ext.ixdiag;
        expect(diagObj.msd).to.equal(0);
        expect(diagObj.msi).to.equal(0);
      });
    });

    describe('both banner and video bidder params set', function () {
      const bids = [DEFAULT_MULTIFORMAT_BANNER_VALID_BID[0], DEFAULT_MULTIFORMAT_VIDEO_VALID_BID[0]];
      const request = spec.buildRequests(bids, {});

      it('should return valid banner requests', function () {
        const impressions = JSON.parse(request[0].data.r).imp;

        expect(impressions).to.have.lengthOf(2);
        expect(JSON.parse(request[0].data.v)).to.equal(BANNER_ENDPOINT_VERSION);

        impressions.map((impression, index) => {
          const bid = bids[index];

          expect(impression.id).to.equal(bid.bidId);
          expect(impression.banner.format).to.be.length(bid.mediaTypes.banner.sizes.length);
          expect(impression.banner.topframe).to.be.oneOf([0, 1]);

          impression.banner.format.map(({ w, h, ext }, index) => {
            const size = bid.mediaTypes.banner.sizes[index];
            const sidValue = utils.parseGPTSingleSizeArray(size);

            expect(w).to.equal(size[0]);
            expect(h).to.equal(size[1]);
            expect(ext.siteID).to.equal(bid.params.siteId);
            expect(ext.sid).to.equal(sidValue);
          });
        });
      });

      it('should return valid banner and video requests', function () {
        const videoImpression = JSON.parse(request[1].data.r).imp[0];

        expect(JSON.parse(request[1].data.r).imp).to.have.lengthOf(1);
        expect(JSON.parse(request[1].data.v)).to.equal(VIDEO_ENDPOINT_VERSION);
        expect(videoImpression.id).to.equal(DEFAULT_MULTIFORMAT_VIDEO_VALID_BID[0].bidId);
        expect(videoImpression.video.w).to.equal(DEFAULT_MULTIFORMAT_VIDEO_VALID_BID[0].mediaTypes.video.playerSize[0][0]);
        expect(videoImpression.video.h).to.equal(DEFAULT_MULTIFORMAT_VIDEO_VALID_BID[0].mediaTypes.video.playerSize[0][1]);
      });

      it('should contain all correct IXdiag properties', function () {
        const diagObj = JSON.parse(request[0].data.r).ext.ixdiag;
        expect(diagObj.iu).to.equal(0);
        expect(diagObj.nu).to.equal(0);
        expect(diagObj.ou).to.equal(2);
        expect(diagObj.ren).to.equal(true);
        expect(diagObj.mfu).to.equal(2);
        expect(diagObj.allu).to.equal(2);
        expect(diagObj.version).to.equal('$prebid.version$');
        expect(diagObj.url).to.equal('http://localhost:9876/context.html')
        expect(diagObj.pbadslot).to.equal(DEFAULT_MULTIFORMAT_VIDEO_VALID_BID[0].ortb2Imp.ext.data.pbadslot)
        expect(diagObj.tagid).to.equal(DEFAULT_MULTIFORMAT_VIDEO_VALID_BID[0].params.tagId)
        expect(diagObj.adunitcode).to.equal(DEFAULT_MULTIFORMAT_VIDEO_VALID_BID[0].adUnitCode)
      });
    });
  });

  describe('interpretResponse', function () {
    it('should get correct bid response for banner ad', function () {
      const expectedParse = [
        {
          requestId: '1a2b3c4d',
          cpm: 1,
          creativeId: '12345',
          width: 300,
          height: 250,
          mediaType: 'banner',
          ad: '<a target="_blank" href="https://www.indexexchange.com"></a>',
          currency: 'USD',
          ttl: 300,
          netRevenue: true,
          meta: {
            networkId: 50,
            brandId: 303325,
            brandName: 'OECTA',
            advertiserDomains: ['www.abc.com']
          }
        }
      ];
      const result = spec.interpretResponse({ body: DEFAULT_BANNER_BID_RESPONSE }, { data: DEFAULT_BIDDER_REQUEST_DATA, validBidRequests: [] });
      expect(result[0]).to.deep.equal(expectedParse[0]);
    });

    it('should get correct bid response for banner ad with missing adomain', function () {
      const expectedParse = [
        {
          requestId: '1a2b3c4d',
          cpm: 1,
          creativeId: '12345',
          width: 300,
          height: 250,
          mediaType: 'banner',
          ad: '<a target="_blank" href="https://www.indexexchange.com"></a>',
          currency: 'USD',
          ttl: 300,
          netRevenue: true,
          meta: {
            networkId: 50,
            brandId: 303325,
            brandName: 'OECTA'
          }
        }
      ];
      const result = spec.interpretResponse({ body: DEFAULT_BANNER_BID_RESPONSE_WITHOUT_ADOMAIN }, { data: DEFAULT_BIDDER_REQUEST_DATA, validBidRequests: [] });
      expect(result[0]).to.deep.equal(expectedParse[0]);
    });

    it('should set creativeId to default value if not provided', function () {
      const bidResponse = utils.deepClone(DEFAULT_BANNER_BID_RESPONSE);
      delete bidResponse.seatbid[0].bid[0].crid;
      const expectedParse = [
        {
          requestId: '1a2b3c4d',
          cpm: 1,
          creativeId: '-',
          width: 300,
          height: 250,
          mediaType: 'banner',
          ad: '<a target="_blank" href="https://www.indexexchange.com"></a>',
          currency: 'USD',
          ttl: 300,
          netRevenue: true,
          meta: {
            networkId: 50,
            brandId: 303325,
            brandName: 'OECTA',
            advertiserDomains: ['www.abc.com']
          }
        }
      ];
      const result = spec.interpretResponse({ body: bidResponse }, { data: DEFAULT_BIDDER_REQUEST_DATA, validBidRequests: [] });
    });

    it('should set Japanese price correctly', function () {
      const bidResponse = utils.deepClone(DEFAULT_BANNER_BID_RESPONSE);
      bidResponse.cur = 'JPY';
      const expectedParse = [
        {
          requestId: '1a2b3c4d',
          cpm: 100,
          creativeId: '12345',
          width: 300,
          height: 250,
          mediaType: 'banner',
          ad: '<a target="_blank" href="https://www.indexexchange.com"></a>',
          currency: 'JPY',
          ttl: 300,
          netRevenue: true,
          meta: {
            networkId: 50,
            brandId: 303325,
            brandName: 'OECTA',
            advertiserDomains: ['www.abc.com']
          }
        }
      ];
      const result = spec.interpretResponse({ body: bidResponse }, { data: DEFAULT_BIDDER_REQUEST_DATA, validBidRequests: [] });
      expect(result[0]).to.deep.equal(expectedParse[0]);
    });

    it('should prioritize bid[].dealid over bid[].ext.dealid ', function () {
      const bidResponse = utils.deepClone(DEFAULT_BANNER_BID_RESPONSE);
      bidResponse.seatbid[0].bid[0].ext.dealid = 'ext-deal';
      bidResponse.seatbid[0].bid[0].dealid = 'outter-deal';
      const expectedParse = [
        {
          requestId: '1a2b3c4d',
          cpm: 1,
          creativeId: '12345',
          width: 300,
          height: 250,
          mediaType: 'banner',
          ad: '<a target="_blank" href="https://www.indexexchange.com"></a>',
          currency: 'USD',
          ttl: 300,
          netRevenue: true,
          dealId: 'outter-deal',
          meta: {
            networkId: 50,
            brandId: 303325,
            brandName: 'OECTA',
            advertiserDomains: ['www.abc.com']
          }
        }
      ];
      const result = spec.interpretResponse({ body: bidResponse }, { data: DEFAULT_BIDDER_REQUEST_DATA, validBidRequests: [] });

      expect(result[0].dealId).to.equal(expectedParse[0].dealId);
    });

    it('should not set bid[].dealid if dealid is not present', function () {
      const bidResponse = utils.deepClone(DEFAULT_BANNER_BID_RESPONSE);
      const expectedParse = [
        {
          requestId: '1a2b3c4d',
          cpm: 1,
          creativeId: '12345',
          width: 300,
          height: 250,
          mediaType: 'banner',
          ad: '<a target="_blank" href="https://www.indexexchange.com"></a>',
          currency: 'USD',
          ttl: 300,
          netRevenue: true,
          meta: {
            networkId: 50,
            brandId: 303325,
            brandName: 'OECTA',
            advertiserDomains: ['www.abc.com']
          }
        }
      ];
      const result = spec.interpretResponse({ body: bidResponse }, { data: DEFAULT_BIDDER_REQUEST_DATA, validBidRequests: [] });
      expect(result[0]).to.deep.equal(expectedParse[0]);
    });

    it('should use set bid[].ext.dealid if bid[].dealid is not present', function () {
      const bidResponse = utils.deepClone(DEFAULT_BANNER_BID_RESPONSE);
      bidResponse.seatbid[0].bid[0].ext.dealid = 'ext-deal';
      const expectedParse = [
        {
          requestId: '1a2b3c4d',
          cpm: 1,
          creativeId: '12345',
          width: 300,
          height: 250,
          mediaType: 'banner',
          ad: '<a target="_blank" href="https://www.indexexchange.com"></a>',
          currency: 'USD',
          ttl: 300,
          dealId: 'ext-deal',
          netRevenue: true,
          meta: {
            networkId: 50,
            brandId: 303325,
            brandName: 'OECTA',
            advertiserDomains: ['www.abc.com']
          }
        }
      ];
      const result = spec.interpretResponse({ body: bidResponse }, { data: DEFAULT_BIDDER_REQUEST_DATA, validBidRequests: [] });
      expect(result[0].dealId).to.deep.equal(expectedParse[0].dealId);
    });

    it('should get correct bid response for video ad', function () {
      const expectedParse = [
        {
          requestId: '1a2b3c4e',
          cpm: 1.1,
          creativeId: '12346',
          mediaType: 'video',
          mediaTypes: {
            video: {
              context: 'instream',
              playerSize: [
                [
                  400,
                  100
                ]
              ]
            }
          },
          width: 640,
          height: 480,
          currency: 'USD',
          ttl: 3600,
          netRevenue: true,
          vastUrl: 'www.abcd.com/vast',
          meta: {
            networkId: 51,
            brandId: 303326,
            brandName: 'OECTB',
            advertiserDomains: ['www.abcd.com']
          }
        }
      ];
      const result = spec.interpretResponse({ body: DEFAULT_VIDEO_BID_RESPONSE }, {
        data: DEFAULT_BIDDER_REQUEST_DATA, validBidRequests: ONE_VIDEO
      });

      expect(result[0]).to.deep.equal(expectedParse[0]);
    });

    it('should set bid[].renderer if renderer not defined at mediaType.video level', function () {
      const bid = spec.interpretResponse({ body: DEFAULT_VIDEO_BID_RESPONSE }, {
        data: DEFAULT_BIDDER_REQUEST_DATA, validBidRequests: DEFAULT_MULTIFORMAT_BANNER_VALID_BID
      });
      expect(bid[0].renderer).to.exist;
    });

    it('should set renderer URL by parsing video response', function () {
      const bid = spec.interpretResponse({ body: DEFAULT_VIDEO_BID_RESPONSE }, {
        data: DEFAULT_BIDDER_REQUEST_DATA, validBidRequests: DEFAULT_MULTIFORMAT_BANNER_VALID_BID
      });
      expect(bid[0].renderer.url).to.equal(DEFAULT_VIDEO_BID_RESPONSE.ext.videoplayerurl);
    });

    it('should not set bid[].renderer if renderer defined at mediaType.video level', function () {
      let outstreamAdUnit = utils.deepClone(DEFAULT_MULTIFORMAT_BANNER_VALID_BID);
      outstreamAdUnit[0].mediaTypes.video.renderer = {
        url: 'test',
        render: function() {}
      };
      const bid = spec.interpretResponse({ body: DEFAULT_VIDEO_BID_RESPONSE }, {
        data: DEFAULT_BIDDER_REQUEST_DATA, validBidRequests: outstreamAdUnit
      });
      expect(bid[0].renderer).to.be.undefined;
    });

    it('should not set bid[].renderer if renderer defined at the ad unit level', function () {
      let outstreamAdUnit = utils.deepClone(DEFAULT_MULTIFORMAT_BANNER_VALID_BID);
      outstreamAdUnit[0].renderer = {
        url: 'test',
        render: function() {}
      };
      const bid = spec.interpretResponse({ body: DEFAULT_VIDEO_BID_RESPONSE }, {
        data: DEFAULT_BIDDER_REQUEST_DATA, validBidRequests: outstreamAdUnit
      });
      expect(bid[0].renderer).to.be.undefined;
    });

    it('should set bid[].renderer if ad unit renderer is invalid', function () {
      let outstreamAdUnit = utils.deepClone(DEFAULT_MULTIFORMAT_BANNER_VALID_BID);
      outstreamAdUnit[0].mediaTypes.video.renderer = {
        url: 'test'
      };
      const bid = spec.interpretResponse({ body: DEFAULT_VIDEO_BID_RESPONSE }, {
        data: DEFAULT_BIDDER_REQUEST_DATA, validBidRequests: outstreamAdUnit
      });
      expect(bid[0].renderer).to.exist;
    });

    it('should set bid[].renderer if ad unit renderer is a backup', function () {
      let outstreamAdUnit = utils.deepClone(DEFAULT_MULTIFORMAT_BANNER_VALID_BID);
      outstreamAdUnit[0].mediaTypes.video.renderer = {
        url: 'test',
        render: function() {},
        backupOnly: true
      };
      const bid = spec.interpretResponse({ body: DEFAULT_VIDEO_BID_RESPONSE }, {
        data: DEFAULT_BIDDER_REQUEST_DATA, validBidRequests: outstreamAdUnit
      });
      expect(bid[0].renderer).to.exist;
    });

    it('should get correct bid response for video ad and set bid.vastXml when mtype is 2 (video)', function () {
      const expectedParse = [
        {
          requestId: '1a2b3c4e',
          cpm: 1.1,
          creativeId: '12346',
          mediaType: 'video',
          mediaTypes: {
            video: {
              context: 'instream',
              playerSize: [
                [
                  400,
                  100
                ]
              ]
            }
          },
          width: 640,
          height: 480,
          currency: 'USD',
          ttl: 3600,
          netRevenue: true,
          vastXml: '<?xml version=\"1.0\" encoding=\"UTF-8\"?><VAST xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\" xsi:noNamespaceSchemaLocation=\"vast.xsd\" version=\"3.0\"> <Ad id=\"488427365\">  <InLine>   <AdSystem>Test</AdSystem>   <AdTitle>In-Stream Video</AdTitle> </InLine> </Ad></VAST',
          meta: {
            networkId: 51,
            brandId: 303326,
            brandName: 'OECTB',
            advertiserDomains: ['www.abcd.com']
          }
        }
      ];
      const result = spec.interpretResponse({ body: DEFAULT_VIDEO_BID_RESPONSE_WITH_MTYPE_SET }, {
        data: DEFAULT_BIDDER_REQUEST_DATA, validBidRequests: ONE_VIDEO
      });

      expect(result[0]).to.deep.equal(expectedParse[0]);
    });

    it('bidrequest should not have page if options is undefined', function () {
      const options = {};
      const validBidWithoutreferInfo = spec.buildRequests(DEFAULT_BANNER_VALID_BID, options);
      const requestWithoutreferInfo = JSON.parse(validBidWithoutreferInfo[0].data.r);

      expect(requestWithoutreferInfo.site.page).to.be.undefined;
      expect(validBidWithoutreferInfo[0].url).to.equal(IX_SECURE_ENDPOINT);
    });

    it('bidrequest should not have page if options.refererInfo is an empty object', function () {
      const options = {
        refererInfo: {}
      };
      const validBidWithoutreferInfo = spec.buildRequests(DEFAULT_BANNER_VALID_BID, options);
      const requestWithoutreferInfo = JSON.parse(validBidWithoutreferInfo[0].data.r);

      expect(requestWithoutreferInfo.site.page).to.be.undefined;
      expect(validBidWithoutreferInfo[0].url).to.equal(IX_SECURE_ENDPOINT);
    });

    it('bidrequest should sent to secure endpoint if page url is secure', function () {
      const options = {
        refererInfo: {
          referer: 'https://www.prebid.org'
        }
      };
      const validBidWithoutreferInfo = spec.buildRequests(DEFAULT_BANNER_VALID_BID, options);
      const requestWithoutreferInfo = JSON.parse(validBidWithoutreferInfo[0].data.r);

      expect(requestWithoutreferInfo.site.page).to.equal(options.refererInfo.page);
      expect(validBidWithoutreferInfo[0].url).to.equal(IX_SECURE_ENDPOINT);
    });

    it('should set bid[].ttl to seatbid[].bid[].exp value from response', function () {
      const BANNER_RESPONSE_WITH_EXP = utils.deepClone(DEFAULT_BANNER_BID_RESPONSE);
      const VIDEO_RESPONSE_WITH_EXP = utils.deepClone(DEFAULT_VIDEO_BID_RESPONSE);
      VIDEO_RESPONSE_WITH_EXP.seatbid[0].bid[0].exp = 200;
      BANNER_RESPONSE_WITH_EXP.seatbid[0].bid[0].exp = 100;
      const bannerResult = spec.interpretResponse({ body: BANNER_RESPONSE_WITH_EXP }, { data: DEFAULT_BIDDER_REQUEST_DATA, validBidRequests: [] });
      const videoResult = spec.interpretResponse({ body: VIDEO_RESPONSE_WITH_EXP }, { data: DEFAULT_BIDDER_REQUEST_DATA, validBidRequests: [] });

      expect(bannerResult[0].ttl).to.equal(100);
      expect(videoResult[0].ttl).to.equal(200);
    });

    it('should default bid[].ttl if seat[].bid[].exp is not in the resposne', function () {
      const bannerResult = spec.interpretResponse({ body: DEFAULT_BANNER_BID_RESPONSE }, { data: DEFAULT_BIDDER_REQUEST_DATA, validBidRequests: [] });
      const videoResult = spec.interpretResponse({ body: DEFAULT_VIDEO_BID_RESPONSE }, { data: DEFAULT_BIDDER_REQUEST_DATA, validBidRequests: [] });

      expect(bannerResult[0].ttl).to.equal(300);
      expect(videoResult[0].ttl).to.equal(3600);
    });

    it('should get correct bid response for native ad', function () {
      const expectedParse = [
        {
          requestId: '1a2b3c4d',
          cpm: 1,
          creativeId: '12345',
          mediaType: 'native',
          width: 1,
          height: 1,
          currency: 'USD',
          netRevenue: true,
          meta: {
            networkId: 50,
            brandId: 303325,
            brandName: 'OECTA',
            advertiserDomains: ['www.abc.com']
          },
          native: {
            body: 'Les pièces automobiles dont vous avez besoin, toujours sous la main.',
            clickUrl: 'https://play.google.com/store/apps/details?id=de.autodoc.gmbh',
            icon: {
              height: 250,
              width: 250,
              url: 'https://cdn.liftoff.io/customers/1209/creatives/2501-icon-250x250.png'
            },
            image: {
              height: 627,
              width: 1200,
              url: 'https://cdn.liftoff.io/customers/5a9cab9cc6/image/lambda_png/a0355879b06c09b09232.png'
            },
            impressionTrackers: [
              'https://click.liftoff.io/v1/campaign_click/blah',
              'https://impression-europe.liftoff.io/index/impression',
              'https://a701.casalemedia.com/impression/v1'
            ],
            privacyLink: 'https://privacy.link.com',
            sponsoredBy: 'autodoc.co.uk',
            title: 'Autodoc',
            video: '<VAST>blah</VAST>'
          },
          ttl: 3600
        }
      ];
      const result = spec.interpretResponse({ body: DEFAULT_NATIVE_BID_RESPONSE }, { data: DEFAULT_BIDDER_REQUEST_DATA, validBidRequests: [] });
      expect(result[0]).to.deep.equal(expectedParse[0]);
    });
  });

  describe('bidrequest consent', function () {
    it('should have consent info if gdprApplies and consentString exist', function () {
      const validBidWithConsent = spec.buildRequests(DEFAULT_BANNER_VALID_BID, DEFAULT_OPTION);
      const requestWithConsent = JSON.parse(validBidWithConsent[0].data.r);

      expect(requestWithConsent.regs.ext.gdpr).to.equal(1);
      expect(requestWithConsent.user.ext.consent).to.equal('3huaa11=qu3198ae');
    });

    it('should not have consent field if consentString is undefined', function () {
      const options = {
        gdprConsent: {
          gdprApplies: true,
          vendorData: {}
        }
      };
      const validBidWithConsent = spec.buildRequests(DEFAULT_BANNER_VALID_BID, options);
      const requestWithConsent = JSON.parse(validBidWithConsent[0].data.r);

      expect(requestWithConsent.regs.ext.gdpr).to.equal(1);
      expect(requestWithConsent.user).to.be.undefined;
    });

    it('should not have gdpr field if gdprApplies is undefined', function () {
      const options = {
        gdprConsent: {
          consentString: '3huaa11=qu3198ae',
          vendorData: {}
        }
      };
      const validBidWithConsent = spec.buildRequests(DEFAULT_BANNER_VALID_BID, options);
      const requestWithConsent = JSON.parse(validBidWithConsent[0].data.r);

      expect(requestWithConsent.regs).to.be.undefined;
      expect(requestWithConsent.user.ext.consent).to.equal('3huaa11=qu3198ae');
    });

    it('should not have consent info if options.gdprConsent is undefined', function () {
      const options = {};
      const validBidWithConsent = spec.buildRequests(DEFAULT_BANNER_VALID_BID, options);
      const requestWithConsent = JSON.parse(validBidWithConsent[0].data.r);

      expect(requestWithConsent.regs).to.be.undefined;
      expect(requestWithConsent.user).to.be.undefined;
    });

    it('should have us_privacy if uspConsent is defined', function () {
      const options = {
        uspConsent: '1YYN'
      };
      const validBidWithUspConsent = spec.buildRequests(DEFAULT_BANNER_VALID_BID, options);
      const requestWithUspConsent = JSON.parse(validBidWithUspConsent[0].data.r);

      expect(requestWithUspConsent.regs.ext.us_privacy).to.equal('1YYN');
    });

    it('should not have us_privacy if uspConsent undefined', function () {
      const options = {};
      const validBidWithUspConsent = spec.buildRequests(DEFAULT_BANNER_VALID_BID, options);
      const requestWithUspConsent = JSON.parse(validBidWithUspConsent[0].data.r);

      expect(requestWithUspConsent.regs).to.be.undefined;
    });

    it('should have both gdpr and us_privacy if both are defined', function () {
      const options = {
        gdprConsent: {
          gdprApplies: true,
          vendorData: {}
        },
        uspConsent: '1YYN'
      };
      const validBidWithConsent = spec.buildRequests(DEFAULT_BANNER_VALID_BID, options);
      const requestWithConsent = JSON.parse(validBidWithConsent[0].data.r);
      expect(requestWithConsent.regs.ext.gdpr).to.equal(1);
      expect(requestWithConsent.regs.ext.us_privacy).to.equal('1YYN');
    });

    it('should contain `consented_providers_settings.consented_providers` & consent on user.ext when both are provided', function () {
      const options = {
        gdprConsent: {
          consentString: '3huaa11=qu3198ae',
          addtlConsent: '1~1.35.41.101',
        }
      };

      const validBidWithConsent = spec.buildRequests(DEFAULT_BANNER_VALID_BID, options);
      const requestWithConsent = JSON.parse(validBidWithConsent[0].data.r);
      expect(requestWithConsent.user.ext.consented_providers_settings.consented_providers).to.equal('1~1.35.41.101');
      expect(requestWithConsent.user.ext.consent).to.equal('3huaa11=qu3198ae');
    });

    it('should not contain `consented_providers_settings.consented_providers` on user.ext when consent is not provided', function () {
      const options = {
        gdprConsent: {
          addtlConsent: '1~1.35.41.101',
        }
      };

      const validBidWithConsent = spec.buildRequests(DEFAULT_BANNER_VALID_BID, options);
      const requestWithConsent = JSON.parse(validBidWithConsent[0].data.r);
      expect(utils.deepAccess(requestWithConsent, 'user.ext.consented_providers_settings')).to.not.exist;
      expect(utils.deepAccess(requestWithConsent, 'user.ext.consent')).to.not.exist;
    });

    it('should set coppa to 1 in config when enabled', () => {
      config.setConfig({ coppa: true })
      const bid = spec.buildRequests(DEFAULT_BANNER_VALID_BID, DEFAULT_OPTION);
      const r = JSON.parse(bid[0].data.r);

      expect(r.regs.coppa).to.equal(1);
    });
    it('should not set coppa in config when disabled', () => {
      config.setConfig({ coppa: false })
      const bid = spec.buildRequests(DEFAULT_BANNER_VALID_BID, DEFAULT_OPTION);
      const r = JSON.parse(bid[0].data.r);

      expect(r.regs.coppa).to.be.undefined;
    });
    it('should not set coppa when not specified in config', () => {
      config.resetConfig();
      const bid = spec.buildRequests(DEFAULT_BANNER_VALID_BID, DEFAULT_OPTION);
      const r = JSON.parse(bid[0].data.r);

      expect(r.regs.coppa).to.be.undefined;
    });
  });

  describe('LocalStorage error codes', () => {
    let TODAY = new Date().toISOString().slice(0, 10);
    const key = 'ixdiag';

    let sandbox;
    let setDataInLocalStorageStub;
    let getDataFromLocalStorageStub;
    let removeDataFromLocalStorageStub;
    let localStorageValues = {};

    beforeEach(() => {
      sandbox = sinon.sandbox.create();
      setDataInLocalStorageStub = sandbox.stub(storage, 'setDataInLocalStorage').callsFake((key, value) => localStorageValues[key] = value)
      getDataFromLocalStorageStub = sandbox.stub(storage, 'getDataFromLocalStorage').callsFake((key) => localStorageValues[key])
      removeDataFromLocalStorageStub = sandbox.stub(storage, 'removeDataFromLocalStorage').callsFake((key) => delete localStorageValues[key])
      sandbox.stub(storage, 'localStorageIsEnabled').returns(true);
    });

    afterEach(() => {
      setDataInLocalStorageStub.restore();
      getDataFromLocalStorageStub.restore();
      removeDataFromLocalStorageStub.restore();
      localStorageValues = {};
      sandbox.restore();

      config.setConfig({
        ortb2: {},
        ix: {},
      })
    });

    it('should not log error in LocalStorage when there is no logError called.', () => {
      const bid = DEFAULT_MULTIFORMAT_VIDEO_VALID_BID[0];
      expect(spec.isBidRequestValid(bid)).to.be.true;
      expect(localStorageValues[key]).to.be.undefined;
    });

    it('should log ERROR_CODES.BID_SIZE_INVALID_FORMAT in LocalStorage when there is logError called.', () => {
      const bid = utils.deepClone(DEFAULT_MULTIFORMAT_VIDEO_VALID_BID[0]);
      bid.params.size = ['400', 100];

      expect(spec.isBidRequestValid(bid)).to.be.false;
      expect(JSON.parse(localStorageValues[key])).to.deep.equal({ [TODAY]: { [ERROR_CODES.BID_SIZE_INVALID_FORMAT]: 1 } });
    });

    it('should log ERROR_CODES.BID_SIZE_NOT_INCLUDED in LocalStorage when there is logError called.', () => {
      const bid = utils.deepClone(DEFAULT_MULTIFORMAT_VIDEO_VALID_BID[0]);
      bid.params.size = [407, 100];

      expect(spec.isBidRequestValid(bid)).to.be.false;
      expect(JSON.parse(localStorageValues[key])).to.deep.equal({ [TODAY]: { [ERROR_CODES.BID_SIZE_NOT_INCLUDED]: 1 } });
    });

    it('should log ERROR_CODES.PROPERTY_NOT_INCLUDED in LocalStorage when there is logError called.', () => {
      const bid = utils.deepClone(DEFAULT_MULTIFORMAT_VIDEO_VALID_BID[0]);
      bid.params.video = {};

      expect(spec.isBidRequestValid(bid)).to.be.false;
      expect(JSON.parse(localStorageValues[key])).to.deep.equal({ [TODAY]: { [ERROR_CODES.PROPERTY_NOT_INCLUDED]: 4 } });
    });

    it('should log ERROR_CODES.SITE_ID_INVALID_VALUE in LocalStorage when there is logError called.', () => {
      const bid = utils.deepClone(DEFAULT_MULTIFORMAT_VIDEO_VALID_BID[0]);
      bid.params.siteId = false;

      expect(spec.isBidRequestValid(bid)).to.be.false;
      expect(JSON.parse(localStorageValues[key])).to.deep.equal({ [TODAY]: { [ERROR_CODES.SITE_ID_INVALID_VALUE]: 1 } });
    });

    it('should log ERROR_CODES.BID_FLOOR_INVALID_FORMAT in LocalStorage when there is logError called.', () => {
      const bid = utils.deepClone(DEFAULT_MULTIFORMAT_VIDEO_VALID_BID[0]);
      bid.params.bidFloor = true;

      expect(spec.isBidRequestValid(bid)).to.be.false;
      expect(JSON.parse(localStorageValues[key])).to.deep.equal({ [TODAY]: { [ERROR_CODES.BID_FLOOR_INVALID_FORMAT]: 1 } });
    });

    it('should log ERROR_CODES.IX_FPD_EXCEEDS_MAX_SIZE in LocalStorage when there is logError called.', () => {
      const bid = utils.deepClone(DEFAULT_MULTIFORMAT_VIDEO_VALID_BID[0]);

      config.setConfig({
        ix: {
          firstPartyData: {
            cd: Array(1700).join('#')
          }
        }
      });

      expect(spec.isBidRequestValid(bid)).to.be.true;
      spec.buildRequests([bid], {});
      expect(JSON.parse(localStorageValues[key])).to.deep.equal({ [TODAY]: { [ERROR_CODES.IX_FPD_EXCEEDS_MAX_SIZE]: 2 } });
    });

    it('should log ERROR_CODES.EXCEEDS_MAX_SIZE in LocalStorage when there is logError called.', () => {
      const bid = utils.deepClone(DEFAULT_MULTIFORMAT_VIDEO_VALID_BID[0]);
      bid.bidderRequestId = Array(8000).join('#');

      expect(spec.isBidRequestValid(bid)).to.be.true;
      spec.buildRequests([bid], {});
      expect(JSON.parse(localStorageValues[key])).to.deep.equal({ [TODAY]: { [ERROR_CODES.EXCEEDS_MAX_SIZE]: 2 } });
    });

    it('should log ERROR_CODES.PB_FPD_EXCEEDS_MAX_SIZE in LocalStorage when there is logError called.', () => {
      const bid = utils.deepClone(DEFAULT_MULTIFORMAT_VIDEO_VALID_BID[0]);
      const ortb2 = {
        site: {
          ext: {
            data: {
              pageType: Array(5700).join('#')
            }
          }
        }
      };

      expect(spec.isBidRequestValid(bid)).to.be.true;
      spec.buildRequests([bid], {ortb2});
      expect(JSON.parse(localStorageValues[key])).to.deep.equal({ [TODAY]: { [ERROR_CODES.PB_FPD_EXCEEDS_MAX_SIZE]: 2 } });
    });

    it('should log ERROR_CODES.VIDEO_DURATION_INVALID in LocalStorage when there is logError called.', () => {
      const bid = utils.deepClone(DEFAULT_MULTIFORMAT_VIDEO_VALID_BID[0]);
      bid.params.video.minduration = 1;
      bid.params.video.maxduration = 0;

      expect(spec.isBidRequestValid(bid)).to.be.true;
      spec.buildRequests([bid]);
      expect(JSON.parse(localStorageValues[key])).to.deep.equal({ [TODAY]: { [ERROR_CODES.VIDEO_DURATION_INVALID]: 2 } });
    });

    it('should increment errors for errorCode', () => {
      const bid = utils.deepClone(DEFAULT_MULTIFORMAT_VIDEO_VALID_BID[0]);
      bid.params.video = {};

      expect(spec.isBidRequestValid(bid)).to.be.false;
      expect(JSON.parse(localStorageValues[key])).to.deep.equal({ [TODAY]: { [ERROR_CODES.PROPERTY_NOT_INCLUDED]: 4 } });

      expect(spec.isBidRequestValid(bid)).to.be.false;
      expect(JSON.parse(localStorageValues[key])).to.deep.equal({ [TODAY]: { [ERROR_CODES.PROPERTY_NOT_INCLUDED]: 8 } });
    });

    it('should add new errorCode to ixdiag.', () => {
      let bid = utils.deepClone(DEFAULT_MULTIFORMAT_VIDEO_VALID_BID[0]);
      bid.params.size = ['400', 100];

      expect(spec.isBidRequestValid(bid)).to.be.false;
      expect(JSON.parse(localStorageValues[key])).to.deep.equal({ [TODAY]: { [ERROR_CODES.BID_SIZE_INVALID_FORMAT]: 1 } });

      bid = utils.deepClone(DEFAULT_MULTIFORMAT_VIDEO_VALID_BID[0]);
      bid.params.siteId = false;

      expect(spec.isBidRequestValid(bid)).to.be.false;
      expect(JSON.parse(localStorageValues[key])).to.deep.equal({
        [TODAY]: {
          [ERROR_CODES.BID_SIZE_INVALID_FORMAT]: 1,
          [ERROR_CODES.SITE_ID_INVALID_VALUE]: 1
        }
      });
    });

    it('should clear errors with successful response', () => {
      const ixdiag = { [TODAY]: { '1': 1, '3': 8, '4': 1 } };
      setDataInLocalStorageStub(key, JSON.stringify(ixdiag));

      expect(JSON.parse(localStorageValues[key])).to.deep.equal(ixdiag);

      const request = DEFAULT_MULTIFORMAT_VIDEO_VALID_BID[0];
      expect(spec.isBidRequestValid(request)).to.be.true;

      const data = {
        ...utils.deepClone(DEFAULT_BIDDER_REQUEST_DATA[0]),
        r: JSON.stringify({
          id: '345',
          imp: [
            {
              id: '1a2b3c4e',
            }
          ],
          ext: {
            ixdiag: {
              err: {
                '4': 8
              }
            }
          }
        }),
      };

      const validBidRequests = [
        DEFAULT_MULTIFORMAT_BANNER_VALID_BID[0],
        DEFAULT_MULTIFORMAT_VIDEO_VALID_BID[0]
      ];

      spec.interpretResponse({ body: DEFAULT_BANNER_BID_RESPONSE }, { data, validBidRequests });

      expect(localStorageValues[key]).to.be.undefined;
    });

    it('should clear errors after 7 day expiry errorCode', () => {
      const EXPIRED_DATE = '2019-12-12';

      const ixdiag = { [EXPIRED_DATE]: { '1': 1, '3': 8, '4': 1 }, [TODAY]: { '3': 8, '4': 1 } };
      setDataInLocalStorageStub(key, JSON.stringify(ixdiag));

      const bid = utils.deepClone(DEFAULT_MULTIFORMAT_VIDEO_VALID_BID[0]);
      bid.params.size = ['400', 100];

      expect(spec.isBidRequestValid(bid)).to.be.false;
      expect(JSON.parse(localStorageValues[key])[EXPIRED_DATE]).to.be.undefined;
      expect(JSON.parse(localStorageValues[key])).to.deep.equal({ [TODAY]: { '1': 1, '3': 8, '4': 1 } })
    });

    it('should not save error data into localstorage if consent is not given', () => {
      config.setConfig({ deviceAccess: false });
      const bid = utils.deepClone(DEFAULT_MULTIFORMAT_VIDEO_VALID_BID[0]);
      bid.params.size = ['400', 100];
      expect(spec.isBidRequestValid(bid)).to.be.false;
      expect(localStorageValues[key]).to.be.undefined;
    });
  });
});
