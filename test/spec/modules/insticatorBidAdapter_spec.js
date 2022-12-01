import { expect } from 'chai';
import { spec, storage } from '../../../modules/insticatorBidAdapter.js';
import { newBidder } from 'src/adapters/bidderFactory.js'

const USER_ID_KEY = 'hb_insticator_uid';
const USER_ID_DUMMY_VALUE = '74f78609-a92d-4cf1-869f-1b244bbfb5d2';
const USER_ID_STUBBED = '12345678-1234-1234-1234-123456789abc';

let utils = require('src/utils.js');

describe('InsticatorBidAdapter', function () {
  const adapter = newBidder(spec);

  const bidderRequestId = '22edbae2733bf6';
  let bidRequest = {
    bidder: 'insticator',
    adUnitCode: 'adunit-code',
    params: {
      adUnitId: '1a2b3c4d5e6f1a2b3c4d',
      user: {
        yob: 1984,
        gender: 'M'
      },
    },
    sizes: [[300, 250], [300, 600]],
    mediaTypes: {
      banner: {
        sizes: [[300, 250], [300, 600]],
        pos: 4,
      },
      video: {
        mimes: [
          'video/mp4',
          'video/mpeg',
        ],
        w: 250,
        h: 300,
        placement: 2,
      },
    },
    bidId: '30b31c1838de1e',
    ortb2Imp: {
      instl: 1,
      ext: {
        gpid: '1111/homepage'
      }
    },
    schain: {
      ver: '1.0',
      complete: 1,
      nodes: [
        {
          asi: 'insticator.com',
          sid: '00001',
          hp: 1,
          rid: bidderRequestId
        }
      ]
    },
    userIdAsEids: [
      {
        source: 'criteo.com',
        uids: [
          {
            id: '123',
            atype: 1
          }
        ]
      }
    ],
  };

  let bidderRequest = {
    bidderRequestId,
    auctionId: '74f78609-a92d-4cf1-869f-1b244bbfb5d2',
    timeout: 300,
    gdprConsent: {
      consentString: 'BOJ/P2HOJ/P2HABABMAAAAAZ+A==',
      vendorData: {},
      gdprApplies: true
    },
    refererInfo: {
      numIframes: 0,
      reachedTop: true,
      page: 'https://example.com',
      domain: 'example.com',
      ref: 'https://referrer.com',
      stack: ['https://example.com']
    },
  };

  describe('.code', function () {
    it('should return a bidder code of insticator', function () {
      expect(spec.code).to.equal('insticator')
    })
  })

  describe('inherited functions', function () {
    it('should exist and be a function', function () {
      expect(adapter.callBids).to.exist.and.to.be.a('function')
    })
  })

  describe('isBidRequestValid', function () {
    it('should return true if the bid is valid', function () {
      expect(spec.isBidRequestValid(bidRequest)).to.be.true;
    });

    it('should return false if there is no adUnitId param', () => {
      expect(spec.isBidRequestValid({ ...bidRequest, ...{ params: {} } })).to.be.false;
    });

    it('should return false if there is no mediaTypes', () => {
      expect(spec.isBidRequestValid({ ...bidRequest, ...{ mediaTypes: {} } })).to.be.false;
    });

    it('should return false if there are no banner sizes and no sizes', () => {
      bidRequest.mediaTypes.banner = {};
      expect(spec.isBidRequestValid({ ...bidRequest, ...{ sizes: {} } })).to.be.false;
    });

    it('should return true if there is sizes and no banner sizes', () => {
      expect(spec.isBidRequestValid(bidRequest)).to.be.true;
    });

    it('should return true if there is banner sizes and no sizes', () => {
      bidRequest.mediaTypes.banner.sizes = [[300, 250], [300, 600]];
      expect(spec.isBidRequestValid({ ...bidRequest, ...{ sizes: {} } })).to.be.true;
    });

    it('should return true if there is video and video sizes', () => {
      expect(spec.isBidRequestValid({
        ...bidRequest,
        ...{
          mediaTypes: {
            video: {
              mimes: [
                'video/mp4',
                'video/mpeg',
              ],
              w: 250,
              h: 300,
            },
          }
        }
      })).to.be.true;
    });

    it('should return false if there is no video sizes', () => {
      expect(spec.isBidRequestValid({
        ...bidRequest,
        ...{
          mediaTypes: {
            video: {},
          }
        }
      })).to.be.false;
    });

    it('should return false if video placement is not a number', () => {
      expect(spec.isBidRequestValid({
        ...bidRequest,
        ...{
          mediaTypes: {
            video: {
              mimes: [
                'video/mp4',
                'video/mpeg',
              ],
              w: 250,
              h: 300,
              placement: 'NaN',
            },
          }
        }
      })).to.be.false;
    });
  });

  describe('buildRequests', function () {
    let getDataFromLocalStorageStub, localStorageIsEnabledStub;
    let getCookieStub, cookiesAreEnabledStub;
    let sandbox;

    beforeEach(() => {
      $$PREBID_GLOBAL$$.bidderSettings = {
        insticator: {
          storageAllowed: true
        }
      };
      getDataFromLocalStorageStub = sinon.stub(storage, 'getDataFromLocalStorage');
      localStorageIsEnabledStub = sinon.stub(storage, 'localStorageIsEnabled');
      getCookieStub = sinon.stub(storage, 'getCookie');
      cookiesAreEnabledStub = sinon.stub(storage, 'cookiesAreEnabled');

      sandbox = sinon.sandbox.create();
      sandbox.stub(utils, 'generateUUID').returns(USER_ID_STUBBED);
    });

    afterEach(() => {
      sandbox.restore();
      getDataFromLocalStorageStub.restore();
      localStorageIsEnabledStub.restore();
      getCookieStub.restore();
      cookiesAreEnabledStub.restore();
      $$PREBID_GLOBAL$$.bidderSettings = {};
    });

    const serverRequests = spec.buildRequests([bidRequest], bidderRequest);
    it('should create a request', function () {
      expect(serverRequests).to.have.length(1);
    });

    const serverRequest = serverRequests[0];
    it('should create a request object with method, URL, options and data', function () {
      expect(serverRequest).to.exist;
      expect(serverRequest.method).to.exist;
      expect(serverRequest.url).to.exist;
      expect(serverRequest.options).to.exist;
      expect(serverRequest.data).to.exist;
    });

    it('should return POST method', function () {
      expect(serverRequest.method).to.equal('POST');
    });

    it('should return valid URL', function () {
      expect(serverRequest.url).to.equal('https://ex.ingage.tech/v1/openrtb');
    });

    it('should return valid options', function () {
      expect(serverRequest.options).to.be.an('object');
      expect(serverRequest.options.contentType).to.equal('application/json');
      expect(serverRequest.options.withCredentials).to.be.true;
    });

    it('should return valid data if array of bids is valid', function () {
      localStorageIsEnabledStub.returns(true);
      cookiesAreEnabledStub.returns(false);
      localStorage.setItem(USER_ID_KEY, USER_ID_DUMMY_VALUE);

      const requests = spec.buildRequests([bidRequest], bidderRequest);
      const data = JSON.parse(requests[0].data);

      expect(data).to.be.an('object');
      expect(data).to.have.all.keys('id', 'tmax', 'source', 'site', 'device', 'regs', 'user', 'imp', 'ext');
      expect(data.id).to.equal(bidderRequest.bidderRequestId);
      expect(data.tmax).to.equal(bidderRequest.timeout);
      expect(data.source).to.have.all.keys('fd', 'tid', 'ext');
      expect(data.source.fd).to.equal(1);
      expect(data.source.tid).to.equal(bidderRequest.auctionId);
      expect(data.source.ext).to.have.property('schain').to.deep.equal({
        ver: '1.0',
        complete: 1,
        nodes: [
          {
            asi: 'insticator.com',
            sid: '00001',
            hp: 1,
            rid: bidderRequest.bidderRequestId
          }
        ]
      });
      expect(data.site).to.be.an('object');
      expect(data.site.domain).not.to.be.empty;
      expect(data.site.page).not.to.be.empty;
      expect(data.site.ref).to.equal(bidderRequest.refererInfo.ref);
      expect(data.device).to.be.an('object');
      expect(data.device.w).to.equal(window.innerWidth);
      expect(data.device.h).to.equal(window.innerHeight);
      expect(data.device.js).to.equal(true);
      expect(data.device.ext).to.be.an('object');
      expect(data.device.ext.localStorage).to.equal(true);
      expect(data.device.ext.cookies).to.equal(false);
      expect(data.regs).to.be.an('object');
      expect(data.regs.ext.gdpr).to.equal(1);
      expect(data.regs.ext.gdprConsentString).to.equal(bidderRequest.gdprConsent.consentString);
      expect(data.user).to.be.an('object');
      expect(data.user).to.have.property('yob');
      expect(data.user.yob).to.equal(1984);
      expect(data.user).to.have.property('gender');
      expect(data.user.gender).to.equal('M');
      expect(data.user.ext).to.have.property('eids');
      expect(data.user.ext.eids).to.deep.equal([
        {
          source: 'criteo.com',
          uids: [
            {
              id: '123',
              atype: 1
            }
          ]
        }
      ]);
      expect(data.imp).to.be.an('array').that.have.lengthOf(1);
      expect(data.imp).to.deep.equal([{
        id: bidRequest.bidId,
        tagid: bidRequest.adUnitCode,
        instl: 1,
        secure: 0,
        banner: {
          format: [
            { w: 300, h: 250 },
            { w: 300, h: 600 }
          ]
        },
        video: {
          mimes: [
            'video/mp4',
            'video/mpeg',
          ],
          h: 300,
          w: 250,
          placement: 2,
        },
        ext: {
          gpid: bidRequest.ortb2Imp.ext.gpid,
          insticator: {
            adUnitId: bidRequest.params.adUnitId,
          },
        }
      }]);
      expect(data.ext).to.be.an('object');
      expect(data.ext.insticator).to.be.an('object')
      expect(data.ext.insticator).to.deep.equal({
        adapter: {
          vendor: 'prebid',
          prebid: '$prebid.version$'
        }
      });
    });

    it('should generate new userId if not valid user is stored', function () {
      localStorageIsEnabledStub.returns(true);
      localStorage.setItem(USER_ID_KEY, 'fake-user-id');

      const requests = spec.buildRequests([bidRequest], bidderRequest);
      const data = JSON.parse(requests[0].data);

      expect(data.user.id).to.equal(USER_ID_STUBBED);
    });
    it('should return empty regs object if no gdprConsent is passed', function () {
      const requests = spec.buildRequests([bidRequest], { ...bidderRequest, ...{ gdprConsent: false } });
      const data = JSON.parse(requests[0].data);
      expect(data.regs).to.be.an('object').that.is.empty;
    });
    it('should return empty array if no valid requests are passed', function () {
      expect(spec.buildRequests([], bidderRequest)).to.be.an('array').that.have.lengthOf(0);
    });
  });

  describe('interpretResponse', function () {
    const bidRequests = {
      method: 'POST',
      url: 'https://ex.ingage.tech/v1/openrtb',
      options: {
        contentType: 'application/json',
        withCredentials: true,
      },
      data: '',
      bidderRequest: {
        bidderRequestId: '22edbae2733bf6',
        auctionId: '74f78609-a92d-4cf1-869f-1b244bbfb5d2',
        timeout: 300,
        bids: [
          {
            bidder: 'insticator',
            params: {
              adUnitId: '1a2b3c4d5e6f1a2b3c4d'
            },
            adUnitCode: 'adunit-code-1',
            sizes: [[300, 250], [300, 600]],
            mediaTypes: {
              banner: {
                sizes: [[300, 250], [300, 600]]
              }
            },
            bidId: 'bid1',
          },
          {
            bidder: 'insticator',
            params: {
              adUnitId: '1a2b3c4d5e6f1a2b3c4d'
            },
            adUnitCode: 'adunit-code-2',
            sizes: [[120, 600], [300, 600], [160, 600]],
            mediaTypes: {
              banner: {
                sizes: [[300, 250], [300, 600]]
              }
            },
            bidId: 'bid2',
          },
          {
            bidder: 'insticator',
            params: {
              adUnitId: '1a2b3c4d5e6f1a2b3c4d'
            },
            adUnitCode: 'adunit-code-3',
            sizes: [[120, 600], [300, 600], [160, 600]],
            mediaTypes: {
              banner: {
                sizes: [[300, 250], [300, 600]]
              }
            },
            bidId: 'bid3',
          }
        ]
      }
    };

    const bidResponse = {
      body: {
        id: '22edbae2733bf6',
        bidid: 'foo9876',
        cur: 'USD',
        seatbid: [
          {
            seat: 'some-dsp',
            bid: [
              {
                impid: 'bid1',
                crid: 'crid1',
                price: 0.5,
                w: 300,
                h: 200,
                adm: 'adm1',
                exp: 60,
                adomain: ['test1.com'],
                ext: {
                  meta: {
                    test: 1
                  }
                }
              },
              {
                impid: 'bid2',
                crid: 'crid2',
                price: 1.5,
                w: 600,
                h: 200,
                adm: 'adm2',
                adomain: ['test2.com'],
              },
              {
                impid: 'bid3',
                crid: 'crid3',
                price: 5.0,
                w: 300,
                h: 200,
                adm: 'adm3',
                adomain: ['test3.com'],
              }
            ],
          },
        ]
      }
    };

    const prebidResponse = [
      {
        requestId: 'bid1',
        creativeId: 'crid1',
        cpm: 0.5,
        currency: 'USD',
        netRevenue: true,
        ttl: 60,
        width: 300,
        height: 200,
        mediaType: 'banner',
        ad: 'adm1',
        adUnitCode: 'adunit-code-1',
        meta: {
          advertiserDomains: ['test1.com'],
          test: 1
        }
      },
      {
        requestId: 'bid2',
        creativeId: 'crid2',
        cpm: 1.5,
        currency: 'USD',
        netRevenue: true,
        ttl: 300,
        width: 600,
        height: 200,
        mediaType: 'banner',
        meta: {
          advertiserDomains: [
            'test2.com'
          ]
        },
        ad: 'adm2',
        adUnitCode: 'adunit-code-2',
      },
      {
        requestId: 'bid3',
        creativeId: 'crid3',
        cpm: 5.0,
        currency: 'USD',
        netRevenue: true,
        ttl: 300,
        width: 300,
        height: 200,
        mediaType: 'banner',
        meta: {
          advertiserDomains: [
            'test3.com'
          ]
        },
        ad: 'adm3',
        adUnitCode: 'adunit-code-3',
      },
    ];

    it('should map bidResponse to prebidResponse', function () {
      const response = spec.interpretResponse(bidResponse, bidRequests);
      response.forEach((resp, i) => {
        expect(resp).to.deep.equal(prebidResponse[i]);
      });
    });

    it('should return empty response if bidderRequestId is invalid', function () {
      const response = Object.assign({}, bidResponse);
      response.body.id = 'fake-id';
      expect(spec.interpretResponse(response, bidRequests)).to.have.length(0);
    });

    it('should return empty response if there is no seatbid array in response', function () {
      const response = Object.assign({}, bidResponse);
      delete response.body.seatbid;
      expect(spec.interpretResponse(response, bidRequests)).to.have.length(0);
    });
  });

  describe('getUserSyncs', function () {
    const bidResponse = [{
      body: {
        ext: {
          sync: [{
            code: 'so',
            delay: 0
          }]
        }
      }
    }];

    it('should return one user sync', function () {
      expect(spec.getUserSyncs({}, bidResponse)).to.deep.equal([{
        code: 'so',
        delay: 0
      }]);
    })

    it('should return an empty array when sync is enabled but there are no bidResponses', function () {
      expect(spec.getUserSyncs({}, [])).to.have.length(0);
    })

    it('should return an empty array when sync is enabled but no sync ext returned', function () {
      const response = Object.assign({}, bidResponse[0]);
      delete response.body.ext.sync;
      expect(spec.getUserSyncs({}, [response])).to.have.length(0);
    })
  });
});
