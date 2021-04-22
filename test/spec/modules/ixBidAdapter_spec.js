import * as utils from 'src/utils.js';
import { config } from 'src/config.js';
import { expect } from 'chai';
import { newBidder } from 'src/adapters/bidderFactory.js';
import { spec } from 'modules/ixBidAdapter.js';
import { createEidsArray } from 'modules/userId/eids.js';

describe('IndexexchangeAdapter', function () {
  const IX_SECURE_ENDPOINT = 'https://htlb.casalemedia.com/cygnus';
  const VIDEO_ENDPOINT_VERSION = 8.1;
  const BANNER_ENDPOINT_VERSION = 7.2;

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
  const div_many_sizes = [
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
      adUnitCode: 'div-gpt-ad-1460505748561-0',
      transactionId: '173f49a8-7549-4218-a23c-e7ba59b47229',
      bidId: '1a2b3c4d',
      bidderRequestId: '11a22b33c44d',
      auctionId: '1aa2bb3cc4dd',
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
        siteId: '123',
        size: [300, 250]
      },
      sizes: [[300, 250], [300, 600]],
      mediaTypes: {
        video: {
          context: 'outstream',
          playerSize: [[400, 100]]
        },
        banner: {
          sizes: [[300, 250], [300, 600]]
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
        size: [400, 100]
      },
      sizes: [[300, 250], [300, 600]],
      mediaTypes: {
        video: {
          context: 'outstream',
          playerSize: [[400, 100]]
        },
        banner: {
          sizes: [[300, 250], [300, 600]]
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
    ]
  };

  const DEFAULT_OPTION = {
    gdprConsent: {
      gdprApplies: true,
      consentString: '3huaa11=qu3198ae',
      vendorData: {}
    },
    refererInfo: {
      referer: 'https://www.prebid.org',
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
    uid2: {id: 'testuid2'} // UID 2.0
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
        // when calling createEidsArray, UID2's getValue func returns .id, which is then set in uids
        id: DEFAULT_USERID_DATA.uid2.id,
        ext: {
          rtiPartner: 'UID2'
        }
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
      let userSync = spec.getUserSyncs(syncOptions);
      expect(userSync[0].type).to.equal('iframe');
      const USER_SYNC_URL = 'https://js-sec.indexww.com/um/ixmatch.html';
      expect(userSync[0].url).to.equal(USER_SYNC_URL);
    });

    it('When iframeEnabled is false, no userSync should be returned', function () {
      const syncOptions = {
        'iframeEnabled': false
      }
      let userSync = spec.getUserSyncs(syncOptions);
      expect(userSync).to.be.an('array').that.is.empty;
    });
  });

  describe('isBidRequestValid', function () {
    it('should return true when required params found for a banner or video ad', function () {
      expect(spec.isBidRequestValid(DEFAULT_BANNER_VALID_BID[0])).to.equal(true);
      expect(spec.isBidRequestValid(DEFAULT_VIDEO_VALID_BID[0])).to.equal(true);
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

    it('should return false when size is missing', function () {
      const bid = utils.deepClone(DEFAULT_BANNER_VALID_BID[0]);
      delete bid.params.size;
      expect(spec.isBidRequestValid(bid)).to.equal(false);
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

    it('should return false when mediaTypes is not banner or video', function () {
      const bid = utils.deepClone(DEFAULT_BANNER_VALID_BID[0]);
      bid.mediaTypes = {
        native: {
          sizes: [[300, 250]]
        }
      };
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

    it('should return false when mediaTypes.video does not have sizes', function () {
      const bid = utils.deepClone(DEFAULT_VIDEO_VALID_BID[0]);
      bid.mediaTypes = {
        video: {
          size: [[300, 250]]
        }
      };
      expect(spec.isBidRequestValid(bid)).to.equal(false);
    });

    it('should return false when mediaType is native', function () {
      const bid = utils.deepClone(DEFAULT_BANNER_VALID_BID[0]);
      delete bid.params.mediaTypes;
      bid.mediaType = 'native';
      bid.sizes = [[300, 250]];
      expect(spec.isBidRequestValid(bid)).to.equal(false);
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
        expect(request).to.have.lengthOf(1);
        expect(payload.user.eids).to.have.lengthOf(5);
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

      expect(payload.user.eids).to.have.lengthOf(5);
      expect(payload.user.eids).to.deep.include(DEFAULT_USERID_PAYLOAD[0]);
      expect(payload.user.eids).to.deep.include(DEFAULT_USERID_PAYLOAD[1]);
      expect(payload.user.eids).to.deep.include(DEFAULT_USERID_PAYLOAD[2]);
      expect(payload.user.eids).to.deep.include(DEFAULT_USERID_PAYLOAD[3]);
      expect(payload.user.eids).to.deep.include(DEFAULT_USERID_PAYLOAD[4]);
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
      expect(payload.user.eids).to.have.lengthOf(7);

      expect(payload.user.eids).to.deep.include(validUserIdPayload[0]);
      expect(payload.user.eids).to.deep.include(validUserIdPayload[1]);
      expect(payload.user.eids).to.deep.include(validUserIdPayload[2]);
      expect(payload.user.eids).to.deep.include(validUserIdPayload[3]);
      expect(payload.user.eids).to.deep.include(validUserIdPayload[4]);
      expect(payload.user.eids).to.deep.include(validUserIdPayload[5]);
      expect(payload.user.eids).to.deep.include(validUserIdPayload[6]);
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
      expect(payload.user.eids).to.have.lengthOf(6);
      expect(payload.user.eids).to.deep.include(validUserIdPayload[0]);
      expect(payload.user.eids).to.deep.include(validUserIdPayload[1]);
      expect(payload.user.eids).to.deep.include(validUserIdPayload[2]);
      expect(payload.user.eids).to.deep.include(validUserIdPayload[3]);
      expect(payload.user.eids).to.deep.include(validUserIdPayload[4]);
      expect(payload.user.eids).to.deep.include(validUserIdPayload[5]);
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
      expect(r.ext.ixdiag.userIds.should.include('lotamePanoramaId'));
      expect(r.ext.ixdiag.userIds.should.not.include('merkleId'));
      expect(r.ext.ixdiag.userIds.should.not.include('parrableId'));
    });
  });

  describe('buildRequests', function () {
    const request = spec.buildRequests(DEFAULT_BANNER_VALID_BID, DEFAULT_OPTION)[0];
    const requestUrl = request.url;
    const requestMethod = request.method;
    const query = request.data;

    const bidWithoutSchain = utils.deepClone(DEFAULT_BANNER_VALID_BID);
    delete bidWithoutSchain[0].schain;
    const requestWithoutSchain = spec.buildRequests(bidWithoutSchain, DEFAULT_OPTION)[0];
    const queryWithoutSchain = requestWithoutSchain.data;

    const bidWithoutMediaType = utils.deepClone(DEFAULT_BANNER_VALID_BID);
    delete bidWithoutMediaType[0].mediaTypes;
    bidWithoutMediaType[0].sizes = [[300, 250], [300, 600]];
    const requestWithoutMediaType = spec.buildRequests(bidWithoutMediaType, DEFAULT_OPTION)[0];
    const queryWithoutMediaType = requestWithoutMediaType.data;

    it('request should be made to IX endpoint with GET method', function () {
      expect(requestMethod).to.equal('GET');
      expect(requestUrl).to.equal(IX_SECURE_ENDPOINT);
    });

    it('query object (version, siteID and request) should be correct', function () {
      expect(query.v).to.equal(BANNER_ENDPOINT_VERSION);
      expect(query.s).to.equal(DEFAULT_BANNER_VALID_BID[0].params.siteId);
      expect(query.r).to.exist;
      expect(query.ac).to.equal('j');
      expect(query.sd).to.equal(1);
      expect(query.nf).not.to.exist;
    });

    it('payload should have correct format and value', function () {
      const payload = JSON.parse(query.r);
      expect(payload.id).to.equal(DEFAULT_BANNER_VALID_BID[0].bidderRequestId);
      expect(payload.site).to.exist;
      expect(payload.site.page).to.equal(DEFAULT_OPTION.refererInfo.referer);
      expect(payload.site.ref).to.equal(document.referrer);
      expect(payload.ext).to.exist;
      expect(payload.ext.source).to.equal('prebid');
      expect(payload.source.ext.schain).to.deep.equal(SAMPLE_SCHAIN);
      expect(payload.imp).to.exist;
      expect(payload.imp).to.be.an('array');
      expect(payload.imp).to.have.lengthOf(2);
    });

    it('payload should not include schain when not provided', function () {
      const payload = JSON.parse(queryWithoutSchain.r);
      expect(payload.source).to.not.exist; // source object currently only written for schain
    });

    it('impression should have correct format and value', function () {
      const impression = JSON.parse(query.r).imp[0];
      const sidValue = `${DEFAULT_BANNER_VALID_BID[0].params.size[0].toString()}x${DEFAULT_BANNER_VALID_BID[0].params.size[1].toString()}`;

      expect(impression.id).to.equal(DEFAULT_BANNER_VALID_BID[0].bidId);
      expect(impression.banner).to.exist;
      expect(impression.banner.w).to.equal(DEFAULT_BANNER_VALID_BID[0].params.size[0]);
      expect(impression.banner.h).to.equal(DEFAULT_BANNER_VALID_BID[0].params.size[1]);
      expect(impression.banner.topframe).to.exist;
      expect(impression.banner.topframe).to.be.oneOf([0, 1]);
      expect(impression.ext).to.exist;
      expect(impression.ext.siteID).to.equal(DEFAULT_BANNER_VALID_BID[0].params.siteId.toString());
      expect(impression.ext.sid).to.equal(sidValue);
    });

    it('video impression has #priceFloors floors', function () {
      const bid = utils.deepClone(ONE_VIDEO[0]);
      const flr = 5.5
      const floorInfo = {floor: flr, currency: 'USD'};
      bid.getFloor = function () {
        return floorInfo;
      }

      // check if floors are in imp
      const requestBidFloor = spec.buildRequests([bid])[0];
      const imp1 = JSON.parse(requestBidFloor.data.r).imp[0];
      expect(imp1.bidfloor).to.equal(flr);
      expect(imp1.bidfloorcur).to.equal('USD');
      expect(imp1.ext.fl).to.equal('p');
    });

    it('banner imp has floors from #priceFloors module', function () {
      const floor300x250 = 3.25
      const bid = utils.deepClone(DEFAULT_BANNER_VALID_BID[0])

      const floorInfo = { floor: floor300x250, currency: 'USD' };
      bid.getFloor = function () {
        return floorInfo;
      };

      // check if floors are in imp
      const requestBidFloor = spec.buildRequests([bid])[0];
      const imp1 = JSON.parse(requestBidFloor.data.r).imp[0];

      expect(imp1.bidfloorcur).to.equal('USD');
      expect(imp1.bidfloor).to.equal(floor300x250);
      expect(imp1.ext.fl).to.equal('p');
    });

    it('ix adapter floors chosen over #priceFloors ', function () {
      const bid = utils.deepClone(ONE_BANNER[0]);

      const floorhi = 4.5
      const floorlow = 3.5

      bid.params.bidFloor = floorhi
      bid.params.bidFloorCur = 'USD'

      const floorInfo = { floor: floorlow, currency: 'USD' };
      bid.getFloor = function () {
        return floorInfo;
      };

      // check if floors are in imp
      const requestBidFloor = spec.buildRequests([bid])[0];
      const imp1 = JSON.parse(requestBidFloor.data.r).imp[0];
      expect(imp1.bidfloor).to.equal(floorhi);
      expect(imp1.bidfloorcur).to.equal(bid.params.bidFloorCur);
      expect(imp1.ext.fl).to.equal('x');
    });

    it(' #priceFloors floors chosen over ix adapter floors', function () {
      const bid = utils.deepClone(ONE_BANNER[0]);

      const floorhi = 4.5
      const floorlow = 3.5

      bid.params.bidFloor = floorlow
      bid.params.bidFloorCur = 'USD'

      const floorInfo = { floor: floorhi, currency: 'USD' };
      bid.getFloor = function () {
        return floorInfo;
      };

      // check if floors are in imp
      const requestBidFloor = spec.buildRequests([bid])[0];
      const imp1 = JSON.parse(requestBidFloor.data.r).imp[0];
      expect(imp1.bidfloor).to.equal(floorhi);
      expect(imp1.bidfloorcur).to.equal(bid.params.bidFloorCur);
      expect(imp1.ext.fl).to.equal('p');
    });

    it('impression should have bidFloor and bidFloorCur if configured', function () {
      const bid = utils.deepClone(DEFAULT_BANNER_VALID_BID[0]);
      bid.params.bidFloor = 50;
      bid.params.bidFloorCur = 'USD';
      const requestBidFloor = spec.buildRequests([bid])[0];
      const impression = JSON.parse(requestBidFloor.data.r).imp[0];

      expect(impression.bidfloor).to.equal(bid.params.bidFloor);
      expect(impression.bidfloorcur).to.equal(bid.params.bidFloorCur);
      expect(impression.ext.fl).to.equal('x');
    });

    it('missing sizes #priceFloors ', function () {
      const bid = utils.deepClone(ONE_BANNER[0]);
      bid.mediaTypes.banner.sizes.push([500, 400])

      const floorInfo = { floor: 3.25, currency: 'USD' };
      bid.getFloor = function () {
        return floorInfo;
      };

      sinon.spy(bid, 'getFloor');

      const requestBidFloor = spec.buildRequests([bid])[0];
      // called getFloor with 300 x 250
      expect(bid.getFloor.getCall(0).args[0].mediaType).to.equal('banner');
      expect(bid.getFloor.getCall(0).args[0].size[0]).to.equal(300);
      expect(bid.getFloor.getCall(0).args[0].size[1]).to.equal(250);

      // called getFloor with 500 x 400
      expect(bid.getFloor.getCall(1).args[0].mediaType).to.equal('banner');
      expect(bid.getFloor.getCall(1).args[0].size[0]).to.equal(500);
      expect(bid.getFloor.getCall(1).args[0].size[1]).to.equal(400);

      // both will have same floors due to mock getFloor
      const imp1 = JSON.parse(requestBidFloor.data.r).imp[0];
      expect(imp1.bidfloor).to.equal(3.25);
      expect(imp1.bidfloorcur).to.equal('USD');

      const imp2 = JSON.parse(requestBidFloor.data.r).imp[1];
      expect(imp2.bidfloor).to.equal(3.25);
      expect(imp2.bidfloorcur).to.equal('USD');
    });

    it('#pricefloors inAdUnit, banner impressions should have floors', function () {
      const bid = utils.deepClone(ONE_BANNER[0]);

      const flr = 4.3
      bid.floors = {
        currency: 'USD',
        schema: {
          delimiter: '|',
          fields: ['mediaType', 'size']
        },
        values: {
          'banner|300x250': flr,
          'banner|600x500': 6.5,
          'banner|*': 7.5
        }
      };
      const floorInfo = { floor: flr, currency: 'USD' };
      bid.getFloor = function () {
        return floorInfo;
      };

      sinon.spy(bid, 'getFloor');

      const requestBidFloor = spec.buildRequests([bid])[0];
      // called getFloor with 300 x 250
      expect(bid.getFloor.getCall(0).args[0].mediaType).to.equal('banner');
      expect(bid.getFloor.getCall(0).args[0].size[0]).to.equal(300);
      expect(bid.getFloor.getCall(0).args[0].size[1]).to.equal(250);

      const imp1 = JSON.parse(requestBidFloor.data.r).imp[0];
      expect(imp1.bidfloor).to.equal(flr);
      expect(imp1.bidfloorcur).to.equal('USD');
    });

    it('payload without mediaType should have correct format and value', function () {
      const payload = JSON.parse(queryWithoutMediaType.r);

      expect(payload.id).to.equal(DEFAULT_BANNER_VALID_BID[0].bidderRequestId);
      expect(payload.site).to.exist;
      expect(payload.site.page).to.equal(DEFAULT_OPTION.refererInfo.referer);
      expect(payload.site.ref).to.equal(document.referrer);
      expect(payload.ext).to.exist;
      expect(payload.ext.source).to.equal('prebid');
      expect(payload.imp).to.exist;
      expect(payload.imp).to.be.an('array');
      expect(payload.imp).to.have.lengthOf(1);
    });

    it('impression without mediaType should have correct format and value', function () {
      const impression = JSON.parse(queryWithoutMediaType.r).imp[0];
      const sidValue = `${DEFAULT_BANNER_VALID_BID[0].params.size[0].toString()}x${DEFAULT_BANNER_VALID_BID[0].params.size[1].toString()}`;

      expect(impression.id).to.equal(DEFAULT_BANNER_VALID_BID[0].bidId);
      expect(impression.banner).to.exist;
      expect(impression.banner.w).to.equal(DEFAULT_BANNER_VALID_BID[0].params.size[0]);
      expect(impression.banner.h).to.equal(DEFAULT_BANNER_VALID_BID[0].params.size[1]);
      expect(impression.banner.topframe).to.exist;
      expect(impression.banner.topframe).to.be.oneOf([0, 1]);
      expect(impression.ext).to.exist;
      expect(impression.ext.siteID).to.equal(DEFAULT_BANNER_VALID_BID[0].params.siteId.toString());
      expect(impression.ext.sid).to.equal(sidValue);
    });

    it('impression should have sid if id is configured as number', function () {
      const bid = utils.deepClone(DEFAULT_BANNER_VALID_BID[0]);
      bid.params.id = 50;
      const requestBidFloor = spec.buildRequests([bid])[0];
      const impression = JSON.parse(requestBidFloor.data.r).imp[0];

      expect(impression.id).to.equal(DEFAULT_BANNER_VALID_BID[0].bidId);
      expect(impression.banner).to.exist;
      expect(impression.banner.w).to.equal(DEFAULT_BANNER_VALID_BID[0].params.size[0]);
      expect(impression.banner.h).to.equal(DEFAULT_BANNER_VALID_BID[0].params.size[1]);
      expect(impression.banner.topframe).to.exist;
      expect(impression.banner.topframe).to.be.oneOf([0, 1]);
      expect(impression.ext).to.exist;
      expect(impression.ext.siteID).to.equal(DEFAULT_BANNER_VALID_BID[0].params.siteId.toString());
      expect(impression.ext.sid).to.equal('50');
    });

    it('impression should have sid if id is configured as string', function () {
      const bid = utils.deepClone(DEFAULT_BANNER_VALID_BID[0]);
      bid.params.id = 'abc';
      const requestBidFloor = spec.buildRequests([bid])[0];
      const impression = JSON.parse(requestBidFloor.data.r).imp[0];
      expect(impression.id).to.equal(DEFAULT_BANNER_VALID_BID[0].bidId);
      expect(impression.banner).to.exist;
      expect(impression.banner.w).to.equal(DEFAULT_BANNER_VALID_BID[0].params.size[0]);
      expect(impression.banner.h).to.equal(DEFAULT_BANNER_VALID_BID[0].params.size[1]);
      expect(impression.banner.topframe).to.exist;
      expect(impression.banner.topframe).to.be.oneOf([0, 1]);
      expect(impression.ext).to.exist;
      expect(impression.ext.siteID).to.equal(DEFAULT_BANNER_VALID_BID[0].params.siteId.toString());
      expect(impression.ext.sid).to.equal('abc');
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
      const expectedPageUrl = DEFAULT_OPTION.refererInfo.referer + '?ab=123&cd=123%23ab&e%2Ff=456&h%3Fg=456%23cd';
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

      expect(pageUrl).to.equal(DEFAULT_OPTION.refererInfo.referer);
    });

    it('should not set first party or timeout if it is not present', function () {
      config.setConfig({
        ix: {}
      });

      const requestWithoutConfig = spec.buildRequests(DEFAULT_BANNER_VALID_BID, DEFAULT_OPTION)[0];
      const pageUrl = JSON.parse(requestWithoutConfig.data.r).site.page;

      expect(pageUrl).to.equal(DEFAULT_OPTION.refererInfo.referer);
      expect(requestWithoutConfig.data.t).to.be.undefined;
    });

    it('should not set first party or timeout if it is setConfig is not called', function () {
      const requestWithoutConfig = spec.buildRequests(DEFAULT_BANNER_VALID_BID, DEFAULT_OPTION)[0];
      const pageUrl = JSON.parse(requestWithoutConfig.data.r).site.page;

      expect(pageUrl).to.equal(DEFAULT_OPTION.refererInfo.referer);
      expect(requestWithoutConfig.data.t).to.be.undefined;
    });

    it('should set timeout if publisher set it through setConfig', function () {
      config.setConfig({
        ix: {
          timeout: 500
        }
      });
      const requestWithTimeout = spec.buildRequests(DEFAULT_BANNER_VALID_BID)[0];

      expect(requestWithTimeout.data.t).to.equal(500);
    });

    it('should set timeout if timeout is a string', function () {
      config.setConfig({
        ix: {
          timeout: '500'
        }
      });
      const requestStringTimeout = spec.buildRequests(DEFAULT_BANNER_VALID_BID)[0];

      expect(requestStringTimeout.data.t).to.be.undefined;
    });

    it('request should contain both banner and video requests', function () {
      const request = spec.buildRequests([DEFAULT_BANNER_VALID_BID[0], DEFAULT_VIDEO_VALID_BID[0]]);

      const bannerImp = JSON.parse(request[0].data.r).imp[0];
      expect(JSON.parse(request[0].data.r).imp).to.have.lengthOf(2);
      expect(JSON.parse(request[0].data.v)).to.equal(BANNER_ENDPOINT_VERSION);
      expect(bannerImp.id).to.equal(DEFAULT_BANNER_VALID_BID[0].bidId);
      expect(bannerImp.id).to.equal(DEFAULT_BANNER_VALID_BID[0].bidId);
      expect(bannerImp.banner).to.exist;
      expect(bannerImp.banner.w).to.equal(DEFAULT_BANNER_VALID_BID[0].params.size[0]);
      expect(bannerImp.banner.h).to.equal(DEFAULT_BANNER_VALID_BID[0].params.size[1]);

      const videoImp = JSON.parse(request[1].data.r).imp[0];
      expect(JSON.parse(request[1].data.v)).to.equal(VIDEO_ENDPOINT_VERSION);
      expect(videoImp.id).to.equal(DEFAULT_VIDEO_VALID_BID[0].bidId);
      expect(videoImp.video).to.exist;
      expect(videoImp.video.w).to.equal(DEFAULT_VIDEO_VALID_BID[0].params.size[0]);
      expect(videoImp.video.h).to.equal(DEFAULT_VIDEO_VALID_BID[0].params.size[1]);
    });

    it('single request under 8k size limit for large ad unit', function () {
      const options = {};
      const bid1 = utils.deepClone(DEFAULT_BANNER_VALID_BID[0]);
      bid1.mediaTypes.banner.sizes = div_many_sizes;
      const requests = spec.buildRequests([bid1], options);

      const reqSize = new Blob([`${requests[0].url}?${utils.parseQueryStringParameters(requests[0].data)}`]).size;
      expect(requests).to.be.an('array');
      expect(requests).to.have.lengthOf(1);
      expect(reqSize).to.be.lessThan(8000);
    });

    it('2 requests due to 2 ad units, one larger than url size', function () {
      const bid1 = utils.deepClone(DEFAULT_BANNER_VALID_BID[0]);
      bid1.mediaTypes.banner.sizes = div_many_sizes;
      bid1.params.siteId = '124';
      bid1.adUnitCode = 'div-gpt-1'
      bid1.transactionId = '152e36d1-1241-4242-t35e-y1dv34d12315';
      bid1.bidId = '2f6g5s5e';

      const requests = spec.buildRequests([bid1, DEFAULT_BANNER_VALID_BID[0]], DEFAULT_OPTION);
      expect(requests).to.be.an('array');
      expect(requests).to.have.lengthOf(2);
      expect(requests[0].data.sn).to.be.equal(0);
      expect(requests[1].data.sn).to.be.equal(1);
    });

    it('6 ad units should generate only 4 requests', function () {
      const bid1 = utils.deepClone(DEFAULT_BANNER_VALID_BID[0]);
      bid1.mediaTypes.banner.sizes = div_many_sizes;
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

      // check if seq number increases
      for (var i = 0; i < requests.length; i++) {
        const reqSize = new Blob([`${requests[i].url}?${utils.parseQueryStringParameters(requests[i].data)}`]).size;
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
      expect(impressions).to.have.lengthOf(9);
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
      const impressions = JSON.parse(request.data.r).imp;

      expect(impressions).to.be.an('array');
      expect(impressions).to.have.lengthOf(4);

      expect(impressions[0].ext.siteID).to.equal(DEFAULT_BANNER_VALID_BID[0].params.siteId.toString())
      expect(impressions[1].ext.siteID).to.equal(bid2.params.siteId)
      expect(impressions[2].ext.siteID).to.equal(DEFAULT_BANNER_VALID_BID[0].params.siteId.toString())
      expect(impressions[3].ext.siteID).to.equal(DEFAULT_BANNER_VALID_BID[0].params.siteId.toString())

      expect(impressions[0].banner.w).to.equal(DEFAULT_BANNER_VALID_BID[0].params.size[0]);
      expect(impressions[0].banner.h).to.equal(DEFAULT_BANNER_VALID_BID[0].params.size[1]);
      expect(impressions[1].banner.w).to.equal(bid2.params.size[0]);
      expect(impressions[1].banner.h).to.equal(bid2.params.size[1]);
      expect(impressions[2].banner.w).to.equal(bid.mediaTypes.banner.sizes[2][0]);
      expect(impressions[2].banner.h).to.equal(bid.mediaTypes.banner.sizes[2][1]);
      expect(impressions[3].banner.w).to.equal(bid.mediaTypes.banner.sizes[3][0]);
      expect(impressions[3].banner.h).to.equal(bid.mediaTypes.banner.sizes[3][1]);
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

      const request = spec.buildRequests([DEFAULT_BANNER_VALID_BID[0], bid], DEFAULT_OPTION)[0];

      const impressions = JSON.parse(request.data.r).imp;
      expect(impressions).to.be.an('array');
      expect(impressions).to.have.lengthOf(4);
      expect(impressions[0].ext.siteID).to.equal(DEFAULT_BANNER_VALID_BID[0].params.siteId.toString());
      expect(impressions[1].ext.siteID).to.equal(bid.params.siteId);
      expect(impressions[2].ext.siteID).to.equal(DEFAULT_BANNER_VALID_BID[0].params.siteId.toString());
      expect(impressions[3].ext.siteID).to.equal(bid.params.siteId);

      expect(impressions[0].banner.w).to.equal(DEFAULT_BANNER_VALID_BID[0].params.size[0]);
      expect(impressions[0].banner.h).to.equal(DEFAULT_BANNER_VALID_BID[0].params.size[1]);

      expect(impressions[1].banner.w).to.equal(bid.params.size[0]);
      expect(impressions[1].banner.h).to.equal(bid.params.size[1]);

      expect(impressions[2].banner.w).to.equal(DEFAULT_BANNER_VALID_BID[0].mediaTypes.banner.sizes[1][0]);
      expect(impressions[2].banner.h).to.equal(DEFAULT_BANNER_VALID_BID[0].mediaTypes.banner.sizes[1][1]);

      expect(impressions[3].banner.w).to.equal(bid.mediaTypes.banner.sizes[1][0]);
      expect(impressions[3].banner.h).to.equal(bid.mediaTypes.banner.sizes[1][1]);

      expect(impressions[0].ext.sid).to.equal(`${DEFAULT_BANNER_VALID_BID[0].params.size[0].toString()}x${DEFAULT_BANNER_VALID_BID[0].params.size[1].toString()}`);
      expect(impressions[1].ext.sid).to.equal(`${bid.params.size[0].toString()}x${bid.params.size[1].toString()}`);

      expect(impressions[2].ext.sid).to.equal(`${DEFAULT_BANNER_VALID_BID[0].mediaTypes.banner.sizes[1][0].toString()}x${DEFAULT_BANNER_VALID_BID[0].mediaTypes.banner.sizes[1][1].toString()}`);
      expect(impressions[3].ext.sid).to.equal(`${bid.mediaTypes.banner.sizes[1][0].toString()}x${bid.mediaTypes.banner.sizes[1][1].toString()}`);
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
        bid1.mediaTypes.banner.sizes = div_many_sizes;

        const requests = spec.buildRequests([bid1, DEFAULT_BANNER_VALID_BID[0]], DEFAULT_OPTION);

        const impressions = JSON.parse(requests[0].data.r).imp;

        expect(impressions).to.be.an('array');
        expect(impressions).to.have.lengthOf(2);
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

    it('impression should have correct format and value', function () {
      const impression = JSON.parse(query.r).imp[0];
      const sidValue = `${DEFAULT_VIDEO_VALID_BID[0].params.size[0].toString()}x${DEFAULT_VIDEO_VALID_BID[0].params.size[1].toString()}`;

      expect(impression.id).to.equal(DEFAULT_VIDEO_VALID_BID[0].bidId);
      expect(impression.video).to.exist;
      expect(impression.video.w).to.equal(DEFAULT_VIDEO_VALID_BID[0].params.size[0]);
      expect(impression.video.h).to.equal(DEFAULT_VIDEO_VALID_BID[0].params.size[1]);
      expect(impression.video.placement).to.exist;
      expect(impression.video.placement).to.equal(1);
      expect(impression.video.minduration).to.exist;
      expect(impression.video.minduration).to.equal(0);
      expect(impression.video.mimes).to.exist;
      expect(impression.video.mimes[0]).to.equal('video/mp4');
      expect(impression.video.mimes[1]).to.equal('video/webm');

      expect(impression.video.skippable).to.equal(false);
      expect(impression.ext).to.exist;
      expect(impression.ext.siteID).to.equal(DEFAULT_VIDEO_VALID_BID[0].params.siteId.toString());
      expect(impression.ext.sid).to.equal(sidValue);
    });

    it('impression should have correct format when mediaType is specified.', function () {
      const bid = utils.deepClone(DEFAULT_VIDEO_VALID_BID[0]);
      delete bid.mediaTypes;
      bid.mediaType = 'video';
      const requestBidFloor = spec.buildRequests([bid])[0];
      const impression = JSON.parse(requestBidFloor.data.r).imp[0];
      const sidValue = `${DEFAULT_VIDEO_VALID_BID[0].params.size[0].toString()}x${DEFAULT_VIDEO_VALID_BID[0].params.size[1].toString()}`;

      expect(impression.id).to.equal(DEFAULT_VIDEO_VALID_BID[0].bidId);
      expect(impression.video).to.exist;
      expect(impression.video.w).to.equal(DEFAULT_VIDEO_VALID_BID[0].params.size[0]);
      expect(impression.video.h).to.equal(DEFAULT_VIDEO_VALID_BID[0].params.size[1]);
      expect(impression.video.placement).to.not.exist;
      expect(impression.ext).to.exist;
      expect(impression.ext.siteID).to.equal(DEFAULT_VIDEO_VALID_BID[0].params.siteId.toString());
      expect(impression.ext.sid).to.equal(sidValue);
    });

    it('should set correct placement if context is outstream', function () {
      const bid = utils.deepClone(DEFAULT_VIDEO_VALID_BID[0]);
      bid.mediaTypes.video.context = 'outstream';
      const request = spec.buildRequests([bid])[0];
      const impression = JSON.parse(request.data.r).imp[0];

      expect(impression.id).to.equal(DEFAULT_VIDEO_VALID_BID[0].bidId);
      expect(impression.video).to.exist;
      expect(impression.video.placement).to.exist;
      expect(impression.video.placement).to.equal(4);
    });

    it('should not override video properties if they are already configured at the params video level', function () {
      const bid = utils.deepClone(DEFAULT_VIDEO_VALID_BID[0]);
      bid.mediaTypes.video.context = 'outstream';
      bid.mediaTypes.video.protocols = [1];
      bid.mediaTypes.video.mimes = ['video/override'];
      const request = spec.buildRequests([bid])[0];
      const impression = JSON.parse(request.data.r).imp[0];

      expect(impression.video.protocols[0]).to.equal(2);
      expect(impression.video.mimes[0]).to.not.equal('video/override');
    });

    it('should not add video adunit level properties in imp object if they are not allowlisted', function () {
      const bid = utils.deepClone(DEFAULT_VIDEO_VALID_BID[0]);
      bid.mediaTypes.video.context = 'outstream';
      bid.mediaTypes.video.random = true;
      const request = spec.buildRequests([bid])[0];
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
      const request = spec.buildRequests([bid])[0];
      const impression = JSON.parse(request.data.r).imp[0];

      expect(impression.video.protocols[0]).to.equal(6);
      expect(impression.video.api).to.equal(2);
      expect(impression.video.mimes[0]).to.equal('video/mp4');
    });
  });

  describe('buildRequestMultiFormat', function () {
    describe('only banner bidder params set', function () {
      const request = spec.buildRequests(DEFAULT_MULTIFORMAT_BANNER_VALID_BID)

      const bannerImp = JSON.parse(request[0].data.r).imp[0];
      expect(JSON.parse(request[0].data.r).imp).to.have.lengthOf(2);
      expect(JSON.parse(request[0].data.v)).to.equal(BANNER_ENDPOINT_VERSION);
      expect(bannerImp.id).to.equal(DEFAULT_MULTIFORMAT_BANNER_VALID_BID[0].bidId);
      expect(bannerImp.banner).to.exist;
      expect(bannerImp.banner.w).to.equal(DEFAULT_MULTIFORMAT_BANNER_VALID_BID[0].params.size[0]);
      expect(bannerImp.banner.h).to.equal(DEFAULT_MULTIFORMAT_BANNER_VALID_BID[0].params.size[1]);
    });

    describe('only video bidder params set', function () {
      const request = spec.buildRequests(DEFAULT_MULTIFORMAT_VIDEO_VALID_BID);

      const videoImp = JSON.parse(request[0].data.r).imp[0];
      expect(JSON.parse(request[0].data.r).imp).to.have.lengthOf(1);
      expect(JSON.parse(request[0].data.v)).to.equal(VIDEO_ENDPOINT_VERSION);
      expect(videoImp.id).to.equal(DEFAULT_MULTIFORMAT_VIDEO_VALID_BID[0].bidId);
      expect(videoImp.video).to.exist;
      expect(videoImp.video.w).to.equal(DEFAULT_MULTIFORMAT_VIDEO_VALID_BID[0].params.size[0]);
      expect(videoImp.video.h).to.equal(DEFAULT_MULTIFORMAT_VIDEO_VALID_BID[0].params.size[1]);
    });
    describe('both banner and video bidder params set', function () {
      const request = spec.buildRequests([DEFAULT_MULTIFORMAT_BANNER_VALID_BID[0], DEFAULT_MULTIFORMAT_VIDEO_VALID_BID[0]]);

      it('should return valid banner and video requests', function () {
        const bannerImp = JSON.parse(request[0].data.r).imp[0];
        expect(JSON.parse(request[0].data.r).imp).to.have.lengthOf(2);
        expect(JSON.parse(request[0].data.v)).to.equal(BANNER_ENDPOINT_VERSION);
        expect(bannerImp.id).to.equal(DEFAULT_MULTIFORMAT_BANNER_VALID_BID[0].bidId);
        expect(bannerImp.banner).to.exist;
        expect(bannerImp.banner.w).to.equal(DEFAULT_MULTIFORMAT_BANNER_VALID_BID[0].params.size[0]);
        expect(bannerImp.banner.h).to.equal(DEFAULT_MULTIFORMAT_BANNER_VALID_BID[0].params.size[1]);

        const videoImp = JSON.parse(request[1].data.r).imp[0];
        expect(JSON.parse(request[1].data.r).imp).to.have.lengthOf(1);
        expect(JSON.parse(request[1].data.v)).to.equal(VIDEO_ENDPOINT_VERSION);
        expect(videoImp.id).to.equal(DEFAULT_MULTIFORMAT_VIDEO_VALID_BID[0].bidId);
        expect(videoImp.video).to.exist;
        expect(videoImp.video.w).to.equal(DEFAULT_MULTIFORMAT_VIDEO_VALID_BID[0].params.size[0]);
        expect(videoImp.video.h).to.equal(DEFAULT_MULTIFORMAT_VIDEO_VALID_BID[0].params.size[1]);
      });

      it('should contain all correct IXdiag properties', function () {
        const diagObj = JSON.parse(request[0].data.r).ext.ixdiag;
        expect(diagObj.iu).to.equal(0);
        expect(diagObj.nu).to.equal(0);
        expect(diagObj.ou).to.equal(1);
        expect(diagObj.ren).to.equal(false);
        expect(diagObj.mfu).to.equal(1);
        expect(diagObj.allu).to.equal(1);
        expect(diagObj.version).to.equal('$prebid.version$');
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
          dealId: undefined,
          meta: {
            networkId: 50,
            brandId: 303325,
            brandName: 'OECTA',
            advertiserDomains: ['www.abc.com']
          }
        }
      ];
      const result = spec.interpretResponse({ body: DEFAULT_BANNER_BID_RESPONSE }, { data: DEFAULT_BIDDER_REQUEST_DATA });
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
          dealId: undefined,
          meta: {
            networkId: 50,
            brandId: 303325,
            brandName: 'OECTA'
          }
        }
      ];
      const result = spec.interpretResponse({ body: DEFAULT_BANNER_BID_RESPONSE_WITHOUT_ADOMAIN }, { data: DEFAULT_BIDDER_REQUEST_DATA });
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
          dealId: undefined,
          meta: {
            networkId: 50,
            brandId: 303325,
            brandName: 'OECTA',
            advertiserDomains: ['www.abc.com']
          }
        }
      ];
      const result = spec.interpretResponse({ body: bidResponse }, { data: DEFAULT_BIDDER_REQUEST_DATA });
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
          dealId: undefined,
          meta: {
            networkId: 50,
            brandId: 303325,
            brandName: 'OECTA',
            advertiserDomains: ['www.abc.com']
          }
        }
      ];
      const result = spec.interpretResponse({ body: bidResponse }, { data: DEFAULT_BIDDER_REQUEST_DATA });
      expect(result[0]).to.deep.equal(expectedParse[0]);
    });

    it('should set dealId correctly', function () {
      const bidResponse = utils.deepClone(DEFAULT_BANNER_BID_RESPONSE);
      bidResponse.seatbid[0].bid[0].ext.dealid = 'deal';
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
          dealId: 'deal',
          meta: {
            networkId: 50,
            brandId: 303325,
            brandName: 'OECTA',
            advertiserDomains: ['www.abc.com']
          }
        }
      ];
      const result = spec.interpretResponse({ body: bidResponse }, { data: DEFAULT_BIDDER_REQUEST_DATA });
      expect(result[0]).to.deep.equal(expectedParse[0]);
    });

    it('should get correct bid response for video ad', function () {
      const expectedParse = [
        {
          requestId: '1a2b3c4e',
          cpm: 1.1,
          creativeId: '12346',
          mediaType: 'video',
          width: 640,
          height: 480,
          currency: 'USD',
          ttl: 3600,
          netRevenue: true,
          dealId: undefined,
          vastUrl: 'www.abcd.com/vast',
          meta: {
            networkId: 51,
            brandId: 303326,
            brandName: 'OECTB',
            advertiserDomains: ['www.abcd.com']
          }
        }
      ];
      const result = spec.interpretResponse({ body: DEFAULT_VIDEO_BID_RESPONSE }, { data: DEFAULT_BIDDER_REQUEST_DATA });
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

      expect(requestWithoutreferInfo.site.page).to.equal(options.refererInfo.referer);
      expect(validBidWithoutreferInfo[0].url).to.equal(IX_SECURE_ENDPOINT);
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
  });
});
