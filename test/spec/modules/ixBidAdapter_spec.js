import * as utils from 'src/utils.js';
import { config } from 'src/config.js';
import { expect } from 'chai';
import { newBidder } from 'src/adapters/bidderFactory.js';
import { spec } from 'modules/ixBidAdapter.js';

describe('IndexexchangeAdapter', function () {
  const IX_SECURE_ENDPOINT = 'https://as-sec.casalemedia.com/cygnus';
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
          minduration: 0
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
      expect(payload.imp).to.have.lengthOf(1);
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

    it('impression should have bidFloor and bidFloorCur if configured', function () {
      const bid = utils.deepClone(DEFAULT_BANNER_VALID_BID[0]);
      bid.params.bidFloor = 50;
      bid.params.bidFloorCur = 'USD';
      const requestBidFloor = spec.buildRequests([bid])[0];
      const impression = JSON.parse(requestBidFloor.data.r).imp[0];

      expect(impression.bidfloor).to.equal(bid.params.bidFloor);
      expect(impression.bidfloorcur).to.equal(bid.params.bidFloorCur);
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
            brandName: 'OECTA'
          }
        }
      ];
      const result = spec.interpretResponse({ body: DEFAULT_BANNER_BID_RESPONSE }, { data: DEFAULT_BIDDER_REQUEST_DATA });
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
            brandName: 'OECTA'
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
            brandName: 'OECTA'
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
            brandName: 'OECTA'
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
            brandName: 'OECTB'
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
  });
});
