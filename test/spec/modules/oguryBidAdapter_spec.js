import { expect } from 'chai';
import { spec } from 'modules/oguryBidAdapter';
import * as utils from 'src/utils.js';

const BID_URL = 'https://mweb-hb.presage.io/api/header-bidding-request';
const TIMEOUT_URL = 'https://ms-ads-monitoring-events.presage.io/bid_timeout'

describe('OguryBidAdapter', function () {
  let bidRequests;
  let bidderRequest;

  bidRequests = [
    {
      adUnitCode: 'adUnitCode',
      auctionId: 'auctionId',
      bidId: 'bidId',
      bidder: 'ogury',
      params: {
        assetKey: 'OGY-assetkey',
        adUnitId: 'adunitId',
        xMargin: 20,
        yMarging: 20,
        gravity: 'TOP_LEFT',
      },
      mediaTypes: {
        banner: {
          sizes: [[300, 250]]
        }
      },
      getFloor: ({ size, currency, mediaType }) => {
        const floorResult = {
          currency: 'USD',
          floor: 0
        };

        if (mediaType === 'banner') {
          floorResult.floor = 4;
        } else {
          floorResult.floor = 1000;
        }

        return floorResult;
      },
      transactionId: 'transactionId'
    },
    {
      adUnitCode: 'adUnitCode2',
      auctionId: 'auctionId',
      bidId: 'bidId2',
      bidder: 'ogury',
      params: {
        assetKey: 'OGY-assetkey',
        adUnitId: 'adunitId2'
      },
      mediaTypes: {
        banner: {
          sizes: [[600, 500]]
        }
      },
      transactionId: 'transactionId2'
    },
  ];

  bidderRequest = {
    auctionId: bidRequests[0].auctionId,
    gdprConsent: {consentString: 'myConsentString', vendorData: {}, gdprApplies: true},
  };

  describe('isBidRequestValid', function () {
    it('should validate correct bid', () => {
      let validBid = utils.deepClone(bidRequests[0]);

      let isValid = spec.isBidRequestValid(validBid);
      expect(isValid).to.equal(true);
    });

    it('should not validate incorrect bid', () => {
      let invalidBid = utils.deepClone(bidRequests[0]);
      delete invalidBid.sizes;
      delete invalidBid.mediaTypes;

      let isValid = spec.isBidRequestValid(invalidBid);
      expect(isValid).to.equal(false);
    });

    it('should not validate bid if adunit is not present', () => {
      let invalidBid = utils.deepClone(bidRequests[0]);
      delete invalidBid.params.adUnitId;

      let isValid = spec.isBidRequestValid(invalidBid);
      expect(isValid).to.equal(false);
    });

    it('should not validate bid if assetKet is not present', () => {
      let invalidBid = utils.deepClone(bidRequests[0]);
      delete invalidBid.params.assetKey;

      let isValid = spec.isBidRequestValid(invalidBid);
      expect(isValid).to.equal(false);
    });

    it('should validate bid if getFloor is not present', () => {
      let invalidBid = utils.deepClone(bidRequests[1]);
      delete invalidBid.getFloor;

      let isValid = spec.isBidRequestValid(invalidBid);
      expect(isValid).to.equal(true);
    });
  });

  describe('getUserSyncs', function() {
    let syncOptions, gdprConsent;

    beforeEach(() => {
      syncOptions = {pixelEnabled: true};
      gdprConsent = {
        gdprApplies: true,
        consentString: 'CPJl4C8PJl4C8OoAAAENAwCMAP_AAH_AAAAAAPgAAAAIAPgAAAAIAAA.IGLtV_T9fb2vj-_Z99_tkeYwf95y3p-wzhheMs-8NyZeH_B4Wv2MyvBX4JiQKGRgksjLBAQdtHGlcTQgBwIlViTLMYk2MjzNKJrJEilsbO2dYGD9Pn8HT3ZCY70-vv__7v3ff_3g'
      };
    });

    it('should return syncs array with two elements of type image', () => {
      const userSyncs = spec.getUserSyncs(syncOptions, [], gdprConsent);

      expect(userSyncs).to.have.lengthOf(2);
      expect(userSyncs[0].type).to.equal('image');
      expect(userSyncs[0].url).to.contain('https://ms-cookie-sync.presage.io/v1/init-sync/bid-switch');
      expect(userSyncs[1].type).to.equal('image');
      expect(userSyncs[1].url).to.contain('https://ms-cookie-sync.presage.io/ttd/init-sync');
    });

    it('should set the source as query param', () => {
      const userSyncs = spec.getUserSyncs(syncOptions, [], gdprConsent);
      expect(userSyncs[0].url).to.contain('source=prebid');
      expect(userSyncs[1].url).to.contain('source=prebid');
    });

    it('should set the tcString as query param', () => {
      const userSyncs = spec.getUserSyncs(syncOptions, [], gdprConsent);
      expect(userSyncs[0].url).to.contain(`iab_string=${gdprConsent.consentString}`);
      expect(userSyncs[1].url).to.contain(`iab_string=${gdprConsent.consentString}`);
    });

    it('should return an empty array when pixel is disable', () => {
      syncOptions.pixelEnabled = false;
      expect(spec.getUserSyncs(syncOptions, [], gdprConsent)).to.have.lengthOf(0);
    });

    it('should return syncs array with two elements of type image when consentString is undefined', () => {
      gdprConsent = {
        gdprApplies: true,
        consentString: undefined
      };

      const userSyncs = spec.getUserSyncs(syncOptions, [], gdprConsent);
      expect(userSyncs).to.have.lengthOf(2);
      expect(userSyncs[0].type).to.equal('image');
      expect(userSyncs[0].url).to.equal('https://ms-cookie-sync.presage.io/v1/init-sync/bid-switch?iab_string=&source=prebid')
      expect(userSyncs[1].type).to.equal('image');
      expect(userSyncs[1].url).to.equal('https://ms-cookie-sync.presage.io/ttd/init-sync?iab_string=&source=prebid')
    });

    it('should return syncs array with two elements of type image when consentString is null', () => {
      gdprConsent = {
        gdprApplies: true,
        consentString: null
      };

      const userSyncs = spec.getUserSyncs(syncOptions, [], gdprConsent);
      expect(userSyncs).to.have.lengthOf(2);
      expect(userSyncs[0].type).to.equal('image');
      expect(userSyncs[0].url).to.equal('https://ms-cookie-sync.presage.io/v1/init-sync/bid-switch?iab_string=&source=prebid')
      expect(userSyncs[1].type).to.equal('image');
      expect(userSyncs[1].url).to.equal('https://ms-cookie-sync.presage.io/ttd/init-sync?iab_string=&source=prebid')
    });

    it('should return syncs array with two elements of type image when gdprConsent is undefined', () => {
      gdprConsent = undefined;

      const userSyncs = spec.getUserSyncs(syncOptions, [], gdprConsent);
      expect(userSyncs).to.have.lengthOf(2);
      expect(userSyncs[0].type).to.equal('image');
      expect(userSyncs[0].url).to.equal('https://ms-cookie-sync.presage.io/v1/init-sync/bid-switch?iab_string=&source=prebid')
      expect(userSyncs[1].type).to.equal('image');
      expect(userSyncs[1].url).to.equal('https://ms-cookie-sync.presage.io/ttd/init-sync?iab_string=&source=prebid')
    });

    it('should return syncs array with two elements of type image when gdprConsent is null', () => {
      gdprConsent = null;

      const userSyncs = spec.getUserSyncs(syncOptions, [], gdprConsent);
      expect(userSyncs).to.have.lengthOf(2);
      expect(userSyncs[0].type).to.equal('image');
      expect(userSyncs[0].url).to.equal('https://ms-cookie-sync.presage.io/v1/init-sync/bid-switch?iab_string=&source=prebid')
      expect(userSyncs[1].type).to.equal('image');
      expect(userSyncs[1].url).to.equal('https://ms-cookie-sync.presage.io/ttd/init-sync?iab_string=&source=prebid')
    });

    it('should return syncs array with two elements of type image when gdprConsent is null and gdprApplies is false', () => {
      gdprConsent = {
        gdprApplies: false,
        consentString: null
      };

      const userSyncs = spec.getUserSyncs(syncOptions, [], gdprConsent);
      expect(userSyncs).to.have.lengthOf(2);
      expect(userSyncs[0].type).to.equal('image');
      expect(userSyncs[0].url).to.equal('https://ms-cookie-sync.presage.io/v1/init-sync/bid-switch?iab_string=&source=prebid')
      expect(userSyncs[1].type).to.equal('image');
      expect(userSyncs[1].url).to.equal('https://ms-cookie-sync.presage.io/ttd/init-sync?iab_string=&source=prebid')
    });

    it('should return syncs array with two elements of type image when gdprConsent is empty string and gdprApplies is false', () => {
      gdprConsent = {
        gdprApplies: false,
        consentString: ''
      };

      const userSyncs = spec.getUserSyncs(syncOptions, [], gdprConsent);
      expect(userSyncs).to.have.lengthOf(2);
      expect(userSyncs[0].type).to.equal('image');
      expect(userSyncs[0].url).to.equal('https://ms-cookie-sync.presage.io/v1/init-sync/bid-switch?iab_string=&source=prebid')
      expect(userSyncs[1].type).to.equal('image');
      expect(userSyncs[1].url).to.equal('https://ms-cookie-sync.presage.io/ttd/init-sync?iab_string=&source=prebid')
    });
  });

  describe('buildRequests', function () {
    const stubbedWidth = 200
    const stubbedHeight = 600
    const stubbedWidthMethod = sinon.stub(window.top.document.documentElement, 'clientWidth').get(function() {
      return stubbedWidth;
    });
    const stubbedHeightMethod = sinon.stub(window.top.document.documentElement, 'clientHeight').get(function() {
      return stubbedHeight;
    });

    const defaultTimeout = 1000;
    const expectedRequestObject = {
      id: bidRequests[0].auctionId,
      at: 1,
      tmax: defaultTimeout,
      imp: [{
        id: bidRequests[0].bidId,
        tagid: bidRequests[0].params.adUnitId,
        bidfloor: 4,
        banner: {
          format: [{
            w: 300,
            h: 250
          }]
        },
        ext: bidRequests[0].params
      }, {
        id: bidRequests[1].bidId,
        tagid: bidRequests[1].params.adUnitId,
        banner: {
          format: [{
            w: 600,
            h: 500
          }]
        },
        ext: bidRequests[1].params
      }],
      regs: {
        ext: {
          gdpr: 1
        },
      },
      site: {
        id: bidRequests[0].params.assetKey,
        domain: window.location.hostname,
        page: window.location.href
      },
      user: {
        ext: {
          consent: bidderRequest.gdprConsent.consentString
        },
      },
      ext: {
        prebidversion: '$prebid.version$',
        adapterversion: '1.2.12'
      },
      device: {
        w: stubbedWidth,
        h: stubbedHeight
      }
    };

    after(function() {
      stubbedWidthMethod.restore();
      stubbedHeightMethod.restore();
    });

    it('sends bid request to ENDPOINT via POST', function () {
      const validBidRequests = utils.deepClone(bidRequests)

      const request = spec.buildRequests(validBidRequests, bidderRequest);
      expect(request.url).to.equal(BID_URL);
      expect(request.method).to.equal('POST');
    });

    it('bid request object should be conform', function () {
      const validBidRequests = utils.deepClone(bidRequests)

      const request = spec.buildRequests(validBidRequests, bidderRequest);
      expect(request.data).to.deep.equal(expectedRequestObject);
      expect(request.data.regs.ext.gdpr).to.be.a('number');
    });

    describe('getClientWidth', () => {
      function testGetClientWidth(testGetClientSizeParams) {
        const stubbedClientWidth = sinon.stub(window.top.document.documentElement, 'clientWidth').get(function() {
          return testGetClientSizeParams.docClientSize
        })

        const stubbedInnerWidth = sinon.stub(window.top, 'innerWidth').get(function() {
          return testGetClientSizeParams.innerSize
        })

        const stubbedOuterWidth = sinon.stub(window.top, 'outerWidth').get(function() {
          return testGetClientSizeParams.outerSize
        })

        const stubbedWidth = sinon.stub(window.top.screen, 'width').get(function() {
          return testGetClientSizeParams.screenSize
        })

        const validBidRequests = utils.deepClone(bidRequests)

        const request = spec.buildRequests(validBidRequests, bidderRequest);
        expect(request.data.device.w).to.equal(testGetClientSizeParams.expectedSize);

        stubbedClientWidth.restore();
        stubbedInnerWidth.restore();
        stubbedOuterWidth.restore();
        stubbedWidth.restore();
      }

      it('should get documentElementClientWidth by default', () => {
        testGetClientWidth({
          docClientSize: 22,
          innerSize: 50,
          outerSize: 45,
          screenSize: 10,
          expectedSize: 22,
        })
      })

      it('should get innerWidth as first fallback', () => {
        testGetClientWidth({
          docClientSize: undefined,
          innerSize: 700,
          outerSize: 650,
          screenSize: 10,
          expectedSize: 700,
        })
      })

      it('should get outerWidth as second fallback', () => {
        testGetClientWidth({
          docClientSize: undefined,
          innerSize: undefined,
          outerSize: 650,
          screenSize: 10,
          expectedSize: 650,
        })
      })

      it('should get screenWidth as last fallback', () => {
        testGetClientWidth({
          docClientSize: undefined,
          innerSize: undefined,
          outerSize: undefined,
          screenSize: 10,
          expectedSize: 10,
        });
      });

      it('should return 0 if all window width values are undefined', () => {
        testGetClientWidth({
          docClientSize: undefined,
          innerSize: undefined,
          outerSize: undefined,
          screenSize: undefined,
          expectedSize: 0,
        });
      });
    });

    describe('getClientHeight', () => {
      function testGetClientHeight(testGetClientSizeParams) {
        const stubbedClientHeight = sinon.stub(window.top.document.documentElement, 'clientHeight').get(function() {
          return testGetClientSizeParams.docClientSize
        })

        const stubbedInnerHeight = sinon.stub(window.top, 'innerHeight').get(function() {
          return testGetClientSizeParams.innerSize
        })

        const stubbedOuterHeight = sinon.stub(window.top, 'outerHeight').get(function() {
          return testGetClientSizeParams.outerSize
        })

        const stubbedHeight = sinon.stub(window.top.screen, 'height').get(function() {
          return testGetClientSizeParams.screenSize
        })

        const validBidRequests = utils.deepClone(bidRequests)

        const request = spec.buildRequests(validBidRequests, bidderRequest);
        expect(request.data.device.h).to.equal(testGetClientSizeParams.expectedSize);

        stubbedClientHeight.restore();
        stubbedInnerHeight.restore();
        stubbedOuterHeight.restore();
        stubbedHeight.restore();
      }

      it('should get documentElementClientHeight by default', () => {
        testGetClientHeight({
          docClientSize: 420,
          innerSize: 500,
          outerSize: 480,
          screenSize: 230,
          expectedSize: 420,
        });
      });

      it('should get innerHeight as first fallback', () => {
        testGetClientHeight({
          docClientSize: undefined,
          innerSize: 500,
          outerSize: 480,
          screenSize: 230,
          expectedSize: 500,
        });
      });

      it('should get outerHeight as second fallback', () => {
        testGetClientHeight({
          docClientSize: undefined,
          innerSize: undefined,
          outerSize: 480,
          screenSize: 230,
          expectedSize: 480,
        });
      });

      it('should get screenHeight as last fallback', () => {
        testGetClientHeight({
          docClientSize: undefined,
          innerSize: undefined,
          outerSize: undefined,
          screenSize: 230,
          expectedSize: 230,
        });
      });

      it('should return 0 if all window height values are undefined', () => {
        testGetClientHeight({
          docClientSize: undefined,
          innerSize: undefined,
          outerSize: undefined,
          screenSize: undefined,
          expectedSize: 0,
        });
      });
    });

    it('should not add gdpr infos if not present', () => {
      const bidderRequestWithoutGdpr = {
        ...bidderRequest,
        gdprConsent: {},
      }
      const expectedRequestObjectWithoutGdpr = {
        ...expectedRequestObject,
        regs: {
          ext: {
            gdpr: 0
          },
        },
        user: {
          ext: {
            consent: ''
          },
        }
      };

      const validBidRequests = bidRequests

      const request = spec.buildRequests(validBidRequests, bidderRequestWithoutGdpr);
      expect(request.data).to.deep.equal(expectedRequestObjectWithoutGdpr);
      expect(request.data.regs.ext.gdpr).to.be.a('number');
    });

    it('should not add gdpr infos if gdprConsent is undefined', () => {
      const bidderRequestWithoutGdpr = {
        ...bidderRequest,
        gdprConsent: undefined,
      }
      const expectedRequestObjectWithoutGdpr = {
        ...expectedRequestObject,
        regs: {
          ext: {
            gdpr: 0
          },
        },
        user: {
          ext: {
            consent: ''
          },
        }
      };

      const validBidRequests = bidRequests

      const request = spec.buildRequests(validBidRequests, bidderRequestWithoutGdpr);
      expect(request.data).to.deep.equal(expectedRequestObjectWithoutGdpr);
      expect(request.data.regs.ext.gdpr).to.be.a('number');
    });

    it('should not add tcString and turn off gdpr-applies if consentString and gdprApplies are undefined', () => {
      const bidderRequestWithoutGdpr = {
        ...bidderRequest,
        gdprConsent: { consentString: undefined, gdprApplies: undefined },
      }
      const expectedRequestObjectWithoutGdpr = {
        ...expectedRequestObject,
        regs: {
          ext: {
            gdpr: 0
          },
        },
        user: {
          ext: {
            consent: ''
          },
        }
      };

      const validBidRequests = bidRequests

      const request = spec.buildRequests(validBidRequests, bidderRequestWithoutGdpr);
      expect(request.data).to.deep.equal(expectedRequestObjectWithoutGdpr);
      expect(request.data.regs.ext.gdpr).to.be.a('number');
    });

    it('should handle bidFloor undefined', () => {
      const expectedRequestWithUndefinedFloor = {
        ...expectedRequestObject
      };

      const validBidRequests = utils.deepClone(bidRequests);
      validBidRequests[1] = {
        ...validBidRequests[1],
        getFloor: undefined
      };

      const request = spec.buildRequests(validBidRequests, bidderRequest);
      expect(request.data).to.deep.equal(expectedRequestWithUndefinedFloor);
    });

    it('should handle bidFloor when is not function', () => {
      const expectedRequestWithNotAFunctionFloor = {
        ...expectedRequestObject
      };

      let validBidRequests = utils.deepClone(bidRequests);
      validBidRequests[1] = {
        ...validBidRequests[1],
        getFloor: 'getFloor'
      };

      const request = spec.buildRequests(validBidRequests, bidderRequest);
      expect(request.data).to.deep.equal(expectedRequestWithNotAFunctionFloor);
    });

    it('should handle bidFloor when currency is not USD', () => {
      const expectedRequestWithUnsupportedFloorCurrency = utils.deepClone(expectedRequestObject)
      delete expectedRequestWithUnsupportedFloorCurrency.imp[0].bidfloor;
      let validBidRequests = utils.deepClone(bidRequests);
      validBidRequests[0] = {
        ...validBidRequests[0],
        getFloor: ({ size, currency, mediaType }) => {
          return {
            currency: 'EUR',
            floor: 4
          }
        }
      };
      const request = spec.buildRequests(validBidRequests, bidderRequest);
      expect(request.data).to.deep.equal(expectedRequestWithUnsupportedFloorCurrency);
    });
  });

  describe('interpretResponse', function () {
    let openRtbBidResponse = {
      body: {
        id: 'id_of_bid_response',
        seatbid: [{
          bid: [{
            id: 'advertId',
            impid: 'bidId',
            price: 100,
            nurl: 'url',
            adm: `<html><head><title>test creative</title></head><body style="margin: 0;"><div><img style="width: 300px; height: 250px;" src="https://assets.afcdn.com/recipe/20190529/93153_w1024h768c1cx2220cy1728cxt0cyt0cxb4441cyb3456.jpg" alt="cookies" /></div></body></html>`,
            adomain: ['renault.fr'],
            ext: {
              adcontent: 'sample_creative',
              advertid: '1a278c48-b79a-4bbf-b69f-3824803e7d87',
              campaignid: '31724',
              mediatype: 'image',
              userid: 'ab4aabed-5230-49d9-9f1a-f06280d28366',
              usersync: true,
              advertiserid: '1',
              isomidcompliant: false
            },
            w: 180,
            h: 101
          }, {
            id: 'advertId2',
            impid: 'bidId2',
            price: 150,
            nurl: 'url2',
            adm: `<html><head><title>test creative</title></head><body style="margin: 0;"><div><img style="width: 600px; height: 500px;" src="https://assets.afcdn.com/recipe/20190529/93153_w1024h768c1cx2220cy1728cxt0cyt0cxb4441cyb3456.jpg" alt="cookies" /></div></body></html>`,
            adomain: ['peugeot.fr'],
            ext: {
              adcontent: 'sample_creative',
              advertid: '2a278c48-b79a-4bbf-b69f-3824803e7d87',
              campaignid: '41724',
              userid: 'bb4aabed-5230-49d9-9f1a-f06280d28366',
              usersync: false,
              advertiserid: '2',
              isomidcompliant: true,
              mediatype: 'image',
              landingpageurl: 'https://ogury.com'
            },
            w: 600,
            h: 500
          }],
        }]
      }
    };

    it('should correctly interpret bidResponse', () => {
      let expectedInterpretedBidResponse = [{
        requestId: openRtbBidResponse.body.seatbid[0].bid[0].impid,
        cpm: openRtbBidResponse.body.seatbid[0].bid[0].price,
        currency: 'USD',
        width: openRtbBidResponse.body.seatbid[0].bid[0].w,
        height: openRtbBidResponse.body.seatbid[0].bid[0].h,
        ad: openRtbBidResponse.body.seatbid[0].bid[0].adm,
        ttl: 60,
        ext: openRtbBidResponse.body.seatbid[0].bid[0].ext,
        creativeId: openRtbBidResponse.body.seatbid[0].bid[0].id,
        netRevenue: true,
        meta: {
          advertiserDomains: openRtbBidResponse.body.seatbid[0].bid[0].adomain
        },
        nurl: openRtbBidResponse.body.seatbid[0].bid[0].nurl,
        adapterVersion: '1.2.12',
        prebidVersion: '$prebid.version$'
      }, {
        requestId: openRtbBidResponse.body.seatbid[0].bid[1].impid,
        cpm: openRtbBidResponse.body.seatbid[0].bid[1].price,
        currency: 'USD',
        width: openRtbBidResponse.body.seatbid[0].bid[1].w,
        height: openRtbBidResponse.body.seatbid[0].bid[1].h,
        ad: openRtbBidResponse.body.seatbid[0].bid[1].adm,
        ttl: 60,
        ext: openRtbBidResponse.body.seatbid[0].bid[1].ext,
        creativeId: openRtbBidResponse.body.seatbid[0].bid[1].id,
        netRevenue: true,
        meta: {
          advertiserDomains: openRtbBidResponse.body.seatbid[0].bid[1].adomain
        },
        nurl: openRtbBidResponse.body.seatbid[0].bid[1].nurl,
        adapterVersion: '1.2.12',
        prebidVersion: '$prebid.version$'
      }]

      let request = spec.buildRequests(bidRequests, bidderRequest);
      let result = spec.interpretResponse(openRtbBidResponse, request);

      expect(result).to.deep.equal(expectedInterpretedBidResponse)
    });

    it('should return empty array if error during parsing', () => {
      const wrongOpenRtbBidReponse = 'wrong data'
      let request = spec.buildRequests(bidRequests, bidderRequest);
      let result = spec.interpretResponse(wrongOpenRtbBidReponse, request);

      expect(result).to.be.instanceof(Array);
      expect(result.length).to.equal(0)
    })
  });

  describe('onBidWon', function() {
    const nurl = 'https://fakewinurl.test';
    let xhr;
    let requests;

    beforeEach(function() {
      xhr = sinon.useFakeXMLHttpRequest();
      requests = [];
      xhr.onCreate = (xhr) => {
        requests.push(xhr);
      };
    })

    afterEach(function() {
      xhr.restore()
    })

    it('Should not create nurl request if bid is undefined', function() {
      spec.onBidWon()
      expect(requests.length).to.equal(0);
    })

    it('Should not create nurl request if bid does not contains nurl', function() {
      spec.onBidWon({})
      expect(requests.length).to.equal(0);
    })

    it('Should not create nurl request if bid contains undefined nurl', function() {
      spec.onBidWon({ nurl: undefined })
      expect(requests.length).to.equal(0);
    })

    it('Should create nurl request if bid nurl', function() {
      spec.onBidWon({ nurl })
      expect(requests.length).to.equal(1);
      expect(requests[0].url).to.equal(nurl);
      expect(requests[0].method).to.equal('GET')
    })

    it('Should trigger getWindowContext method', function() {
      const bidSample = {
        id: 'advertId',
        impid: 'bidId',
        price: 100,
        nurl: 'url',
        adm: `<html><head><title>test creative</title></head><body style="margin: 0;"><div><img style="width: 300px; height: 250px;" src="https://assets.afcdn.com/recipe/20190529/93153_w1024h768c1cx2220cy1728cxt0cyt0cxb4441cyb3456.jpg" alt="cookies" /></div></body></html>`,
        adomain: ['renault.fr'],
        ext: {
          adcontent: 'sample_creative',
          advertid: '1a278c48-b79a-4bbf-b69f-3824803e7d87',
          campaignid: '31724',
          mediatype: 'image',
          userid: 'ab4aabed-5230-49d9-9f1a-f06280d28366',
          usersync: true,
          advertiserid: '1',
          isomidcompliant: false
        },
        w: 180,
        h: 101
      }
      spec.onBidWon(bidSample)
      expect(window.top.OG_PREBID_BID_OBJECT).to.deep.equal(bidSample)
    })
  })

  describe('getWindowContext', function() {
    it('Should return top window if exist', function() {
      const res = spec.getWindowContext()
      expect(res).to.equal(window.top)
      expect(res).to.not.be.undefined;
    })

    it('Should return self window if getting top window throw an error', function() {
      const stub = sinon.stub(utils, 'getWindowTop')
      stub.throws()
      const res = spec.getWindowContext()
      expect(res).to.equal(window.self)
      utils.getWindowTop.restore()
    })
  })

  describe('onTimeout', function () {
    let xhr;
    let requests;

    beforeEach(function() {
      xhr = sinon.useFakeXMLHttpRequest();
      requests = [];
      xhr.onCreate = (xhr) => {
        requests.push(xhr);
      };
    })

    afterEach(function() {
      xhr.restore()
    })

    it('should send on bid timeout notification', function() {
      const bid = {
        ad: '<img style="width: 300px; height: 250px;" src="https://assets.afcdn.com/recipe/20190529/93153_w1024h768c1cx2220cy1728cxt0cyt0cxb4441cyb3456.jpg" alt="cookies" />',
        cpm: 3
      }
      spec.onTimeout(bid);
      expect(requests).to.not.be.undefined;
      expect(requests.length).to.equal(1);
      expect(requests[0].url).to.equal(TIMEOUT_URL);
      expect(requests[0].method).to.equal('POST');
      expect(JSON.parse(requests[0].requestBody).location).to.equal(window.location.href);
    })
  });
});
