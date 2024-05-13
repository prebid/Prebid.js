import {expect} from 'chai';
import {spec, internal, END_POINT_URL, userData, EVENT_ENDPOINT} from 'modules/taboolaBidAdapter.js';
import {config} from '../../../src/config'
import * as utils from '../../../src/utils'
import {server} from '../../mocks/xhr'

describe('Taboola Adapter', function () {
  let sandbox, hasLocalStorage, cookiesAreEnabled, getDataFromLocalStorage, localStorageIsEnabled, getCookie, commonBidRequest;
  const COOKIE_KEY = 'trc_cookie_storage';
  const TGID_COOKIE_KEY = 't_gid';
  const TGID_PT_COOKIE_KEY = 't_pt_gid';
  const TBLA_ID_COOKIE_KEY = 'tbla_id';

  beforeEach(() => {
    sandbox = sinon.sandbox.create();
    hasLocalStorage = sandbox.stub(userData.storageManager, 'hasLocalStorage');
    cookiesAreEnabled = sandbox.stub(userData.storageManager, 'cookiesAreEnabled');
    getCookie = sandbox.stub(userData.storageManager, 'getCookie');
    getDataFromLocalStorage = sandbox.stub(userData.storageManager, 'getDataFromLocalStorage');
    localStorageIsEnabled = sandbox.stub(userData.storageManager, 'localStorageIsEnabled');
    commonBidRequest = createBidRequest();
    $$PREBID_GLOBAL$$.bidderSettings = {
      taboola: {
        storageAllowed: true
      }
    };
  });

  afterEach(() => {
    sandbox.restore();
    $$PREBID_GLOBAL$$.bidderSettings = {};
  })

  const displayBidRequestParams = {
    sizes: [[300, 250], [300, 600]]
  }

  const createBidRequest = () => ({
    bidder: 'taboola',
    params: {
      publisherId: 'publisherId',
      tagId: 'placement name'
    },
    bidId: utils.generateUUID(),
    auctionId: utils.generateUUID(),
  });

  describe('isBidRequestValid', function () {
    it('should fail when bid is invalid - tagId isn`t defined', function () {
      const bid = {
        bidder: 'taboola',
        params: {
          publisherId: 'publisherId'
        },
        ...displayBidRequestParams
      }
      expect(spec.isBidRequestValid(bid)).to.equal(false)
    })

    it('should fail when bid is invalid - publisherId isn`t defined', function () {
      const bid = {
        bidder: 'taboola',
        params: {
          tagId: 'below the article'
        },
        ...displayBidRequestParams
      }
      expect(spec.isBidRequestValid(bid)).to.equal(false)
    })

    it('should fail when bid is invalid - sizes isn`t defined', function () {
      const bid = {
        bidder: 'taboola',
        params: {
          publisherId: 'publisherId',
          tagId: 'below the article'
        },
      }
      expect(spec.isBidRequestValid(bid)).to.equal(false)
    })

    it('should succeed when bid contains valid', function () {
      const bid = {
        bidder: 'taboola',
        params: {
          publisherId: 'publisherId',
          tagId: 'below the article'
        },
        ...displayBidRequestParams,
      }
      expect(spec.isBidRequestValid(bid)).to.equal(true)
    })
  })

  describe('onBidWon', function () {
    it('onBidWon exist as a function', () => {
      expect(spec.onBidWon).to.exist.and.to.be.a('function');
    });

    it('should resolve price macro in nurl', function () {
      const nurl = 'http://win.example.com/${AUCTION_PRICE}';
      const bid = {
        requestId: 1,
        cpm: 2,
        originalCpm: 3.4,
        creativeId: 1,
        ttl: 60,
        netRevenue: true,
        mediaType: 'banner',
        ad: '...',
        width: 300,
        height: 250,
        nurl: nurl
      }
      spec.onBidWon(bid);
      expect(server.requests[0].url).to.equals('http://win.example.com/3.4')
    });
  });

  describe('onTimeout', function () {
    it('onTimeout exist as a function', () => {
      expect(spec.onTimeout).to.exist.and.to.be.a('function');
    });
    it('should send timeout', function () {
      const timeoutData = [{
        bidder: 'taboola',
        bidId: 'da43860a-4644-442a-b5e0-93f268cf8d19',
        params: [{
          publisherId: 'publisherId'
        }],
        adUnitCode: 'adUnit-code',
        timeout: 3000,
        auctionId: '12a34b56c'
      }]
      spec.onTimeout(timeoutData);
      expect(server.requests[0].method).to.equal('POST');
      expect(server.requests[0].url).to.equal(EVENT_ENDPOINT + '/timeout');
      expect(JSON.parse(server.requests[0].requestBody)).to.deep.equal(timeoutData);
    });
  });

  describe('onBidderError', function () {
    it('onBidderError exist as a function', () => {
      expect(spec.onBidderError).to.exist.and.to.be.a('function');
    });
    it('should send bidder error', function () {
      const error = {
        status: 204,
        statusText: 'No Content'
      };
      const bidderRequest = {
        bidder: 'taboola',
        params: {
          publisherId: 'publisherId'
        }
      }
      spec.onBidderError({error, bidderRequest});
      expect(server.requests[0].method).to.equal('POST');
      expect(server.requests[0].url).to.equal(EVENT_ENDPOINT + '/bidError');
      expect(JSON.parse(server.requests[0].requestBody)).to.deep.equal({error, bidderRequest});
    });
  });

  describe('buildRequests', function () {
    const defaultBidRequest = {
      ...createBidRequest(),
      ...displayBidRequestParams,
    }

    const commonBidderRequest = {
      bidderRequestId: 'mock-uuid',
      refererInfo: {
        page: 'https://example.com/ref',
        ref: 'https://ref',
        domain: 'example.com',
      }
    }

    it('should build display request', function () {
      const res = spec.buildRequests([defaultBidRequest], commonBidderRequest);
      const expectedData = {
        'imp': [{
          'id': res.data.imp[0].id,
          'banner': {
            format: [{
              w: displayBidRequestParams.sizes[0][0],
              h: displayBidRequestParams.sizes[0][1]
            },
            {
              w: displayBidRequestParams.sizes[1][0],
              h: displayBidRequestParams.sizes[1][1]
            }
            ]
          },
          'tagid': commonBidRequest.params.tagId,
          'bidfloor': null,
          'bidfloorcur': 'USD',
          'ext': {}
        }],
        id: 'mock-uuid',
        'test': 0,
        'site': {
          'id': commonBidRequest.params.publisherId,
          'name': commonBidRequest.params.publisherId,
          'domain': commonBidderRequest.refererInfo.domain,
          'page': commonBidderRequest.refererInfo.page,
          'ref': commonBidderRequest.refererInfo.ref,
          'publisher': {'id': commonBidRequest.params.publisherId},
          'content': {'language': navigator.language}
        },
        'device': {'ua': navigator.userAgent},
        'source': {'fd': 1},
        'bcat': [],
        'badv': [],
        'wlang': [],
        'user': {
          'buyeruid': 0,
          'ext': {},
        },
        'regs': {'coppa': 0, 'ext': {}},
        'ext': {
          'prebid': {
            'version': '$prebid.version$'
          }
        }
      };

      expect(res.url).to.equal(`${END_POINT_URL}?publisher=${commonBidRequest.params.publisherId}`);
      expect(JSON.stringify(res.data)).to.deep.equal(JSON.stringify(expectedData));
    });

    it('should pass optional parameters in request', function () {
      const optionalParams = {
        bidfloor: 0.25,
        bidfloorcur: 'EUR'
      };

      const bidRequest = {
        ...defaultBidRequest,
        params: {...commonBidRequest.params, ...optionalParams}
      };

      const res = spec.buildRequests([bidRequest], commonBidderRequest);
      expect(res.data.imp[0].bidfloor).to.deep.equal(0.25);
      expect(res.data.imp[0].bidfloorcur).to.deep.equal('EUR');
    });

    it('should pass bid floor', function () {
      const bidRequest = {
        ...defaultBidRequest,
        params: {...commonBidRequest.params},
        getFloor: function() {
          return {
            currency: 'USD',
            floor: 2.7,
          }
        }
      };
      const res = spec.buildRequests([bidRequest], commonBidderRequest);
      expect(res.data.imp[0].bidfloor).to.deep.equal(2.7);
      expect(res.data.imp[0].bidfloorcur).to.deep.equal('USD');
    });

    it('should pass bid floor even if it is a bid floor param', function () {
      const optionalParams = {
        bidfloor: 0.25,
        bidfloorcur: 'EUR'
      };

      const bidRequest = {
        ...defaultBidRequest,
        params: {...commonBidRequest.params, ...optionalParams},
        getFloor: function() {
          return {
            currency: 'USD',
            floor: 2.7,
          }
        }
      };
      const res = spec.buildRequests([bidRequest], commonBidderRequest);
      expect(res.data.imp[0].bidfloor).to.deep.equal(2.7);
      expect(res.data.imp[0].bidfloorcur).to.deep.equal('USD');
    });

    it('should pass impression position', function () {
      const optionalParams = {
        position: 2
      };

      const bidRequest = {
        ...defaultBidRequest,
        params: {...commonBidRequest.params, ...optionalParams}
      };

      const res = spec.buildRequests([bidRequest], commonBidderRequest);
      expect(res.data.imp[0].banner.pos).to.deep.equal(2);
    });

    it('should pass gpid if configured', function () {
      const ortb2Imp = {
        ext: {
          gpid: '/homepage/#1'
        }
      }
      const bidRequest = {
        ...defaultBidRequest,
        ortb2Imp: ortb2Imp,
        params: {...commonBidRequest.params}
      };

      const res = spec.buildRequests([bidRequest], commonBidderRequest);
      expect(res.data.imp[0].ext.gpid).to.deep.equal('/homepage/#1');
    });

    it('should pass new parameter to imp ext', function () {
      const ortb2Imp = {
        ext: {
          example: 'example'
        }
      }
      const bidRequest = {
        ...defaultBidRequest,
        ortb2Imp: ortb2Imp,
        params: {...commonBidRequest.params}
      };

      const res = spec.buildRequests([bidRequest], commonBidderRequest);
      expect(res.data.imp[0].ext.example).to.deep.equal('example');
    });

    it('should pass bidder timeout', function () {
      const bidderRequest = {
        ...commonBidderRequest,
        timeout: 500
      }
      const res = spec.buildRequests([defaultBidRequest], bidderRequest);
      expect(res.data.tmax).to.equal(500);
    });

    it('should pass bidder tmax as int', function () {
      const bidderRequest = {
        ...commonBidderRequest,
        timeout: '500'
      }
      const res = spec.buildRequests([defaultBidRequest], bidderRequest);
      expect(res.data.tmax).to.equal(500);
    });

    it('should pass bidder timeout as null', function () {
      const bidderRequest = {
        ...commonBidderRequest,
        timeout: null
      }
      const res = spec.buildRequests([defaultBidRequest], bidderRequest);
      expect(res.data.tmax).to.equal(undefined);
    });

    describe('first party data', function () {
      it('should parse first party data', function () {
        const bidderRequest = {
          ...commonBidderRequest,
          ortb2: {
            bcat: ['EX1', 'EX2', 'EX3'],
            badv: ['site.com'],
            wlang: ['de'],
          }
        }
        const res = spec.buildRequests([defaultBidRequest], bidderRequest);
        expect(res.data.bcat).to.deep.equal(bidderRequest.ortb2.bcat)
        expect(res.data.badv).to.deep.equal(bidderRequest.ortb2.badv)
        expect(res.data.wlang).to.deep.equal(bidderRequest.ortb2.wlang)
      });

      it('should pass pageType if exists in ortb2', function () {
        const bidderRequest = {
          ...commonBidderRequest,
          ortb2: {
            ext: {
              data: {
                pageType: 'news'
              }
            }
          }
        }
        const res = spec.buildRequests([defaultBidRequest], bidderRequest);
        expect(res.data.ext.pageType).to.deep.equal(bidderRequest.ortb2.ext.data.pageType);
      });

      it('should pass additional parameter in request', function () {
        const bidderRequest = {
          ...commonBidderRequest,
          ortb2: {
            ext: {
              example: 'example'
            }
          }
        }
        const res = spec.buildRequests([defaultBidRequest], bidderRequest);
        expect(res.data.ext.example).to.deep.equal(bidderRequest.ortb2.ext.example);
      });

      it('should pass additional parameter in request for topics', function () {
        const ortb2 = {
          ...commonBidderRequest,
          ortb2: {
            user: {
              data: {
                segment: [
                  {
                    id: '243'
                  }
                ],
                name: 'pa.taboola.com',
                ext: {
                  segclass: '4',
                  segtax: 601
                }
              }
            }
          }
        }
        const res = spec.buildRequests([defaultBidRequest], {...ortb2})
        expect(res.data.user.data).to.deep.equal(ortb2.ortb2.user.data);
      });
    });

    describe('handle privacy segments when building request', function () {
      it('should pass GDPR consent', function () {
        const bidderRequest = {
          refererInfo: {
            referer: 'https://example.com/'
          },
          gdprConsent: {
            gdprApplies: true,
            consentString: 'consentString',
          }
        };

        const res = spec.buildRequests([defaultBidRequest], bidderRequest)
        expect(res.data.user.ext.consent).to.equal('consentString')
        expect(res.data.regs.ext.gdpr).to.equal(1)
      });

      it('should pass GPP consent if exist in ortb2', function () {
        const ortb2 = {
          regs: {
            gpp: 'testGpp',
            gpp_sid: [1, 2, 3]
          }
        }

        const res = spec.buildRequests([defaultBidRequest], {...commonBidderRequest, ortb2})
        expect(res.data.regs.ext.gpp).to.equal('testGpp')
        expect(res.data.regs.ext.gpp_sid).to.deep.equal([1, 2, 3])
      });

      it('should pass us privacy consent', function () {
        const bidderRequest = {
          refererInfo: {
            referer: 'https://example.com/'
          },
          uspConsent: 'consentString'
        }
        const res = spec.buildRequests([defaultBidRequest], bidderRequest);
        expect(res.data.regs.ext.us_privacy).to.equal('consentString');
      });

      it('should pass coppa consent', function () {
        config.setConfig({coppa: true})

        const res = spec.buildRequests([defaultBidRequest], commonBidderRequest)
        expect(res.data.regs.coppa).to.equal(1)

        config.resetConfig()
      });
    })

    describe('handle userid ', function () {
      it('should get user id from local storage', function () {
        getDataFromLocalStorage.returns(51525152);
        hasLocalStorage.returns(true);
        localStorageIsEnabled.returns(true);

        const bidderRequest = {
          ...commonBidderRequest,
          timeout: 500
        }
        const res = spec.buildRequests([defaultBidRequest], bidderRequest);
        expect(res.data.user.buyeruid).to.equal(51525152);
      });

      it('should get user id from cookie if local storage isn`t defined', function () {
        getDataFromLocalStorage.returns(51525152);
        hasLocalStorage.returns(false);
        localStorageIsEnabled.returns(false);
        cookiesAreEnabled.returns(true);
        getCookie.returns('taboola%20global%3Auser-id=12121212');

        const bidderRequest = {
          ...commonBidderRequest
        };
        const res = spec.buildRequests([defaultBidRequest], bidderRequest);
        expect(res.data.user.buyeruid).to.equal('12121212');
      });

      it('should get user id from cookie if local storage isn`t defined, only TGID_COOKIE_KEY exists', function () {
        getDataFromLocalStorage.returns(51525152);
        hasLocalStorage.returns(false);
        localStorageIsEnabled.returns(false);
        cookiesAreEnabled.returns(true);
        getCookie.callsFake(function (cookieKey) {
          if (cookieKey === COOKIE_KEY) {
            return 'should:not:return:this';
          }
          if (cookieKey === TGID_COOKIE_KEY) {
            return 'user:12121212';
          }
          return undefined;
        });
        const bidderRequest = {
          ...commonBidderRequest
        };
        const res = spec.buildRequests([defaultBidRequest], bidderRequest);
        expect(res.data.user.buyeruid).to.equal('user:12121212');
      });

      it('should get user id from cookie if local storage isn`t defined, only TGID_PT_COOKIE_KEY exists', function () {
        getDataFromLocalStorage.returns(51525152);
        hasLocalStorage.returns(false);
        localStorageIsEnabled.returns(false);
        cookiesAreEnabled.returns(true);
        getCookie.callsFake(function (cookieKey) {
          if (cookieKey === TGID_PT_COOKIE_KEY) {
            return 'user:12121212';
          }
          return undefined;
        });
        const bidderRequest = {
          ...commonBidderRequest
        };
        const res = spec.buildRequests([defaultBidRequest], bidderRequest);
        expect(res.data.user.buyeruid).to.equal('user:12121212');
      });

      it('should get user id from cookie if local storage isn`t defined, only TBLA_ID_COOKIE_KEY exists', function () {
        getDataFromLocalStorage.returns(51525152);
        hasLocalStorage.returns(false);
        localStorageIsEnabled.returns(false);
        cookiesAreEnabled.returns(true);
        getCookie.callsFake(function (cookieKey) {
          if (cookieKey === TBLA_ID_COOKIE_KEY) {
            return 'user:tbla:12121212';
          }
          return undefined;
        });
        const bidderRequest = {
          ...commonBidderRequest
        };
        const res = spec.buildRequests([defaultBidRequest], bidderRequest);
        expect(res.data.user.buyeruid).to.equal('user:tbla:12121212');
      });

      it('should get user id from cookie if local storage isn`t defined, all cookie keys exist', function () {
        getDataFromLocalStorage.returns(51525152);
        hasLocalStorage.returns(false);
        localStorageIsEnabled.returns(false);
        cookiesAreEnabled.returns(true);
        getCookie.callsFake(function (cookieKey) {
          if (cookieKey === COOKIE_KEY) {
            return 'taboola%20global%3Auser-id=cookie:1';
          }
          if (cookieKey === TGID_COOKIE_KEY) {
            return 'cookie:2';
          }
          if (cookieKey === TGID_PT_COOKIE_KEY) {
            return 'cookie:3';
          }
          if (cookieKey === TBLA_ID_COOKIE_KEY) {
            return 'cookie:4';
          }
          return undefined;
        });
        const bidderRequest = {
          ...commonBidderRequest
        };
        const res = spec.buildRequests([defaultBidRequest], bidderRequest);
        expect(res.data.user.buyeruid).to.equal('cookie:1');
      });

      it('should get user id from tgid cookie if local storage isn`t defined', function () {
        getDataFromLocalStorage.returns(51525152);
        hasLocalStorage.returns(false);
        localStorageIsEnabled.returns(false);
        cookiesAreEnabled.returns(true);
        getCookie.returns('d966c5be-c49f-4f73-8cd1-37b6b5790653-tuct9f7bf10');

        const bidderRequest = {
          ...commonBidderRequest
        };
        const res = spec.buildRequests([defaultBidRequest], bidderRequest);

        expect(res.data.user.buyeruid).to.equal('d966c5be-c49f-4f73-8cd1-37b6b5790653-tuct9f7bf10');
      });

      it('should get user id from TRC if local storage and cookie isn`t defined', function () {
        hasLocalStorage.returns(false);
        cookiesAreEnabled.returns(false);
        localStorageIsEnabled.returns(false);

        window.TRC = {
          user_id: 31313132
        };

        const bidderRequest = {
          ...commonBidderRequest
        }
        const res = spec.buildRequests([defaultBidRequest], bidderRequest);
        expect(res.data.user.buyeruid).to.equal(window.TRC.user_id);

        delete window.TRC;
      });

      it('should get user id to be 0 if cookie, local storage, TRC isn`t defined', function () {
        hasLocalStorage.returns(false);
        cookiesAreEnabled.returns(false);

        const bidderRequest = {
          ...commonBidderRequest
        }
        const res = spec.buildRequests([defaultBidRequest], bidderRequest);
        expect(res.data.user.buyeruid).to.equal(0);
      });

      it('should set buyeruid to be 0 if it`s a new user', function () {
        const bidderRequest = {
          ...commonBidderRequest
        }
        const res = spec.buildRequests([defaultBidRequest], bidderRequest);
        expect(res.data.user.buyeruid).to.equal(0);
      });
    });
  })

  describe('interpretResponse', function () {
    const defaultBidRequest = {
      ...createBidRequest(),
      ...displayBidRequestParams,
    };
    const commonBidderRequest = {
      bidderRequestId: 'mock-uuid',
      refererInfo: {
        page: 'https://example.com/ref',
        ref: 'https://ref',
        domain: 'example.com',
      }
    };
    const bidderRequest = {
      ...commonBidderRequest
    };
    const request = spec.buildRequests([defaultBidRequest], bidderRequest);

    const serverResponse = {
      body: {
        'id': '49ffg4d58ef9a163a69fhgfghd4fad03621b9e036f24f7_15',
        'seatbid': [
          {
            'bid': [
              {
                'id': '0b3dd94348-134b-435f-8db5-6bf5afgfc39e86c',
                'impid': request.data.imp[0].id,
                'price': 0.342068,
                'adid': '2785119545551083381',
                'adm': '\u003chtml\u003e\n\u003chead\u003e\n\u003cmeta charset\u003d"UTF-8"\u003e\n\u003cmeta http-equiv\u003d"Content-Type" content\u003d"text/html; charset\u003dutf-8"/\u003e\u003c/head\u003e\n\u003cbody style\u003d"margin: 0px; overflow:hidden;"\u003e \n\u003cscript type\u003d"text/javascript"\u003e\nwindow.tbl_trc_domain \u003d \u0027us-trc.taboola.com\u0027;\nwindow._taboola \u003d window._taboola || [];\n_taboola.push({article:\u0027auto\u0027});\n!function (e, f, u, i) {\nif (!document.getElementById(i)){\ne.async \u003d 1;\ne.src \u003d u;\ne.id \u003d i;\nf.parentNode.insertBefore(e, f);\n}\n}(document.createElement(\u0027script\u0027),\ndocument.getElementsByTagName(\u0027script\u0027)[0],\n\u0027//cdn.taboola.com/libtrc/wattpad-placement-255/loader.js\u0027,\n\u0027tb_loader_script\u0027);\nif(window.performance \u0026\u0026 typeof window.performance.mark \u003d\u003d \u0027function\u0027)\n{window.performance.mark(\u0027tbl_ic\u0027);}\n\u003c/script\u003e\n\n\u003cdiv id\u003d"taboola-below-article-thumbnails" style\u003d"height: 250px; width: 300px;"\u003e\u003c/div\u003e\n\u003cscript type\u003d"text/javascript"\u003e\nwindow._taboola \u003d window._taboola || [];\n_taboola.push({\nmode: \u0027Rbox_300x250_1x1\u0027,\ncontainer: \u0027taboola-below-article-thumbnails\u0027,\nplacement: \u0027wattpad.com_P18694_S257846_W300_H250_N1_TB\u0027,\ntarget_type: \u0027mix\u0027,\n"rtb-win":{ \nbi:\u002749ff4d58ef9a163a696d4fad03621b9e036f24f7_15\u0027,\ncu:\u0027USD\u0027,\nwp:\u0027${AUCTION_PRICE:BF}\u0027,\nwcb:\u0027~!audex-display-impression!~\u0027,\nrt:\u00271643227025284\u0027,\nrdc:\u0027us.taboolasyndication.com\u0027,\nti:\u00274212\u0027,\nex:\u0027MagniteSCoD\u0027,\nbs:\u0027xapi:257846:lvvSm6Ak7_wE\u0027,\nbp:\u002718694\u0027,\nbd:\u0027wattpad.com\u0027,\nsi:\u00279964\u0027\n} \n,\nrec: {"trc":{"si":"a69c7df43b2334f0aa337c37e2d80c21","sd":"v2_a69c7df43b2334f0aa337c37e2d80c21_3c70f7c7d64a65b15e4a4175c9a2cfa51072f04bMagniteSCoD_1643227025_1643227025_CJS1tQEQ5NdWGPLA0d76xo-9ngEgASgEMCY4iegHQIroB0iB09kDUKPPB1gAYABop-G2i_Hl-eVucAA","ui":"3c70f7c7d64a65b15e4a4175c9a2cfa51072f04bMagniteSCoD","plc":"PHON","wi":"-643136642229425433","cc":"CA","route":"US:US:V","el2r":["bulk-metrics","debug","social","metrics","perf"],"uvpw":"1","pi":"1420260","cpb":"GNO629MGIJz__________wEqGXVzLnRhYm9vbGFzeW5kaWNhdGlvbi5jb20yC3RyYy1zY29kMTI5OIDwmrUMQInoB0iK6AdQgdPZA1ijzwdjCN3__________wEQ3f__________ARgjZGMI3AoQoBAYFmRjCNIDEOAGGAhkYwiWFBCcHBgYZGMI9AUQiwoYC2RjCNkUEPkcGB1kYwj0FBCeHRgfZGorNDlmZjRkNThlZjlhMTYzYTY5NmQ0ZmFkMDM2MjFiOWUwMzZmMjRmN18xNXgCgAHpbIgBrPvTxQE","dcga":{"pubConfigOverride":{"border-color":"black","font-weight":"bold","inherit-title-color":"true","module-name":"cta-lazy-module","enable-call-to-action-creative-component":"true","disable-cta-on-custom-module":"true"}},"tslt":{"p-video-overlay":{"cancel":"סגור","goto":"עבור לדף"},"read-more":{"DEFAULT_CAPTION":"%D7%A7%D7%A8%D7%90%20%D7%A2%D7%95%D7%93"},"next-up":{"BTN_TEXT":"לקריאת התוכן הבא"},"time-ago":{"now":"עכשיו","today":"היום","yesterday":"אתמול","minutes":"לפני {0} דקות","hour":"לפני שעה","hours":"לפני {0} שעות","days":"לפני {0} ימים"},"explore-more":{"TITLE_TEXT":"המשיכו לקרוא","POPUP_TEXT":"אל תפספסו הזדמנות לקרוא עוד תוכן מעולה, רגע לפני שתעזבו"}},"evh":"-1964913910","vl":[{"ri":"185db6d274ce94b27caaabd9eed7915b","uip":"wattpad.com_P18694_S257846_W300_H250_N1_TB","ppb":"COIF","estimation_method":"EcpmEstimationMethodType_ESTIMATION","baseline_variant":"false","original_ecpm":"0.4750949889421463","v":[{"thumbnail":"https://cdn.taboola.com/libtrc/static/thumbnails/a2b272be514ca3ebe3f97a4a32a41db5.jpg","all-thumbnails":"https://cdn.taboola.com/libtrc/static/thumbnails/a2b272be514ca3ebe3f97a4a32a41db5.jpg!-#@1600x1000","origin":"default","thumb-size":"1600x1000","title":"Get Roofing Services At Prices You Can Afford In Edmonton","type":"text","published-date":"1641997069","branding-text":"Roofing Services | Search Ads","url":"https://inneth-conded.xyz/9ad2e613-8777-4fe7-9a52-386c88879289?site\u003dwattpad-placement-255\u0026site_id\u003d1420260\u0026title\u003dGet+Roofing+Services+At+Prices+You+Can+Afford+In+Edmonton\u0026platform\u003dSmartphone\u0026campaign_id\u003d15573949\u0026campaign_item_id\u003d3108610633\u0026thumbnail\u003dhttp%3A%2F%2Fcdn.taboola.com%2Flibtrc%2Fstatic%2Fthumbnails%2Fa2b272be514ca3ebe3f97a4a32a41db5.jpg\u0026cpc\u003d{cpc}\u0026click_id\u003dGiCIypnAQogsMTFL3e_mPaVM2qLvK3KRU6LWzEMUgeB6piCit1Uox6CNr5v5n-x1\u0026tblci\u003dGiCIypnAQogsMTFL3e_mPaVM2qLvK3KRU6LWzEMUgeB6piCit1Uox6CNr5v5n-x1#tblciGiCIypnAQogsMTFL3e_mPaVM2qLvK3KRU6LWzEMUgeB6piCit1Uox6CNr5v5n-x1","duration":"0","sig":"328243c4127ff16e3fdcd7270bab908f6f3fc5b4c98d","item-id":"~~V1~~2785119550041083381~~PnBkfBE9JnQxpahv0adkcuIcmMhroRAHXwLZd-7zhunTxvAnL2wqac4MyzR7uD46gj3kUkbS3FhelBtnsiJV6MhkDZRZzzIqDobN6rWmCPA3hYz5D3PLat6nhIftiT1lwdxwdlxkeV_Mfb3eos_TQavImGhxk0e7psNAZxHJ9RKL2w3lppALGgQJoy2o6lkf-pOqODtX1VkgWpEEM4WsVoWOnUTAwdyGd-8yrze8CWNp752y28hl7lleicyO1vByRdbgwlJdnqyroTPEQNNEn1JRxBOSYSWt-Xm3vkPm-G4","uploader":"","is-syndicated":"true","publisher":"search","id":"~~V1~~2785119550041083381~~PnBkfBE9JnQxpahv0adkcuIcmMhroRAHXwLZd-7zhunTxvAnL2wqac4MyzR7uD46gj3kUkbS3FhelBtnsiJV6MhkDZRZzzIqDobN6rWmCPA3hYz5D3PLat6nhIftiT1lwdxwdlxkeV_Mfb3eos_TQavImGhxk0e7psNAZxHJ9RKL2w3lppALGgQJoy2o6lkf-pOqODtX1VkgWpEEM4WsVoWOnUTAwdyGd-8yrze8CWNp752y28hl7lleicyO1vByRdbgwlJdnqyroTPEQNNEn1JRxBOSYSWt-Xm3vkPm-G4","category":"home","views":"0","itp":[{"u":"https://trc.taboola.com/1326786/log/3/unip?en\u003dclickersusa","t":"c"}],"description":""}]}],"cpcud":{"upc":"0.0","upr":"0.0"}}}\n});\n\u003c/script\u003e\n\n\u003cscript type\u003d"text/javascript"\u003e\nwindow._taboola \u003d window._taboola || [];\n_taboola.push({flush: true});\n\u003c/script\u003e\n\n\u003c/body\u003e\n\u003c/html\u003e',
                'adomain': [
                  'example.xyz'
                ],
                'cid': '15744349',
                'crid': '278195503434041083381',
                'w': 300,
                'h': 250,
                'exp': 60,
                'lurl': 'http://us-trc.taboola.com/sample',
                'nurl': 'http://win.example.com/',

              }
            ],
            'seat': '14204545260'
          }
        ],
        'bidid': 'da43860a-4644-442a-b5e0-93f268cf8d19',
        'cur': 'USD'
      }
    };

    const serverResponseWithPa = {
      body: {
        'id': '49ffg4d58ef9a163a69fhgfghd4fad03621b9e036f24f7_15',
        'seatbid': [
          {
            'bid': [
              {
                'id': '0b3dd94348-134b-435f-8db5-6bf5afgfc39e86c',
                'impid': request.data.imp[0].id,
                'price': 0.342068,
                'adid': '2785119545551083381',
                'adm': '\u003chtml\u003e\n\u003chead\u003e\n\u003cmeta charset\u003d"UTF-8"\u003e\n\u003cmeta http-equiv\u003d"Content-Type" content\u003d"text/html; charset\u003dutf-8"/\u003e\u003c/head\u003e\n\u003cbody style\u003d"margin: 0px; overflow:hidden;"\u003e \n\u003cscript type\u003d"text/javascript"\u003e\nwindow.tbl_trc_domain \u003d \u0027us-trc.taboola.com\u0027;\nwindow._taboola \u003d window._taboola || [];\n_taboola.push({article:\u0027auto\u0027});\n!function (e, f, u, i) {\nif (!document.getElementById(i)){\ne.async \u003d 1;\ne.src \u003d u;\ne.id \u003d i;\nf.parentNode.insertBefore(e, f);\n}\n}(document.createElement(\u0027script\u0027),\ndocument.getElementsByTagName(\u0027script\u0027)[0],\n\u0027//cdn.taboola.com/libtrc/wattpad-placement-255/loader.js\u0027,\n\u0027tb_loader_script\u0027);\nif(window.performance \u0026\u0026 typeof window.performance.mark \u003d\u003d \u0027function\u0027)\n{window.performance.mark(\u0027tbl_ic\u0027);}\n\u003c/script\u003e\n\n\u003cdiv id\u003d"taboola-below-article-thumbnails" style\u003d"height: 250px; width: 300px;"\u003e\u003c/div\u003e\n\u003cscript type\u003d"text/javascript"\u003e\nwindow._taboola \u003d window._taboola || [];\n_taboola.push({\nmode: \u0027Rbox_300x250_1x1\u0027,\ncontainer: \u0027taboola-below-article-thumbnails\u0027,\nplacement: \u0027wattpad.com_P18694_S257846_W300_H250_N1_TB\u0027,\ntarget_type: \u0027mix\u0027,\n"rtb-win":{ \nbi:\u002749ff4d58ef9a163a696d4fad03621b9e036f24f7_15\u0027,\ncu:\u0027USD\u0027,\nwp:\u0027${AUCTION_PRICE:BF}\u0027,\nwcb:\u0027~!audex-display-impression!~\u0027,\nrt:\u00271643227025284\u0027,\nrdc:\u0027us.taboolasyndication.com\u0027,\nti:\u00274212\u0027,\nex:\u0027MagniteSCoD\u0027,\nbs:\u0027xapi:257846:lvvSm6Ak7_wE\u0027,\nbp:\u002718694\u0027,\nbd:\u0027wattpad.com\u0027,\nsi:\u00279964\u0027\n} \n,\nrec: {"trc":{"si":"a69c7df43b2334f0aa337c37e2d80c21","sd":"v2_a69c7df43b2334f0aa337c37e2d80c21_3c70f7c7d64a65b15e4a4175c9a2cfa51072f04bMagniteSCoD_1643227025_1643227025_CJS1tQEQ5NdWGPLA0d76xo-9ngEgASgEMCY4iegHQIroB0iB09kDUKPPB1gAYABop-G2i_Hl-eVucAA","ui":"3c70f7c7d64a65b15e4a4175c9a2cfa51072f04bMagniteSCoD","plc":"PHON","wi":"-643136642229425433","cc":"CA","route":"US:US:V","el2r":["bulk-metrics","debug","social","metrics","perf"],"uvpw":"1","pi":"1420260","cpb":"GNO629MGIJz__________wEqGXVzLnRhYm9vbGFzeW5kaWNhdGlvbi5jb20yC3RyYy1zY29kMTI5OIDwmrUMQInoB0iK6AdQgdPZA1ijzwdjCN3__________wEQ3f__________ARgjZGMI3AoQoBAYFmRjCNIDEOAGGAhkYwiWFBCcHBgYZGMI9AUQiwoYC2RjCNkUEPkcGB1kYwj0FBCeHRgfZGorNDlmZjRkNThlZjlhMTYzYTY5NmQ0ZmFkMDM2MjFiOWUwMzZmMjRmN18xNXgCgAHpbIgBrPvTxQE","dcga":{"pubConfigOverride":{"border-color":"black","font-weight":"bold","inherit-title-color":"true","module-name":"cta-lazy-module","enable-call-to-action-creative-component":"true","disable-cta-on-custom-module":"true"}},"tslt":{"p-video-overlay":{"cancel":"סגור","goto":"עבור לדף"},"read-more":{"DEFAULT_CAPTION":"%D7%A7%D7%A8%D7%90%20%D7%A2%D7%95%D7%93"},"next-up":{"BTN_TEXT":"לקריאת התוכן הבא"},"time-ago":{"now":"עכשיו","today":"היום","yesterday":"אתמול","minutes":"לפני {0} דקות","hour":"לפני שעה","hours":"לפני {0} שעות","days":"לפני {0} ימים"},"explore-more":{"TITLE_TEXT":"המשיכו לקרוא","POPUP_TEXT":"אל תפספסו הזדמנות לקרוא עוד תוכן מעולה, רגע לפני שתעזבו"}},"evh":"-1964913910","vl":[{"ri":"185db6d274ce94b27caaabd9eed7915b","uip":"wattpad.com_P18694_S257846_W300_H250_N1_TB","ppb":"COIF","estimation_method":"EcpmEstimationMethodType_ESTIMATION","baseline_variant":"false","original_ecpm":"0.4750949889421463","v":[{"thumbnail":"https://cdn.taboola.com/libtrc/static/thumbnails/a2b272be514ca3ebe3f97a4a32a41db5.jpg","all-thumbnails":"https://cdn.taboola.com/libtrc/static/thumbnails/a2b272be514ca3ebe3f97a4a32a41db5.jpg!-#@1600x1000","origin":"default","thumb-size":"1600x1000","title":"Get Roofing Services At Prices You Can Afford In Edmonton","type":"text","published-date":"1641997069","branding-text":"Roofing Services | Search Ads","url":"https://inneth-conded.xyz/9ad2e613-8777-4fe7-9a52-386c88879289?site\u003dwattpad-placement-255\u0026site_id\u003d1420260\u0026title\u003dGet+Roofing+Services+At+Prices+You+Can+Afford+In+Edmonton\u0026platform\u003dSmartphone\u0026campaign_id\u003d15573949\u0026campaign_item_id\u003d3108610633\u0026thumbnail\u003dhttp%3A%2F%2Fcdn.taboola.com%2Flibtrc%2Fstatic%2Fthumbnails%2Fa2b272be514ca3ebe3f97a4a32a41db5.jpg\u0026cpc\u003d{cpc}\u0026click_id\u003dGiCIypnAQogsMTFL3e_mPaVM2qLvK3KRU6LWzEMUgeB6piCit1Uox6CNr5v5n-x1\u0026tblci\u003dGiCIypnAQogsMTFL3e_mPaVM2qLvK3KRU6LWzEMUgeB6piCit1Uox6CNr5v5n-x1#tblciGiCIypnAQogsMTFL3e_mPaVM2qLvK3KRU6LWzEMUgeB6piCit1Uox6CNr5v5n-x1","duration":"0","sig":"328243c4127ff16e3fdcd7270bab908f6f3fc5b4c98d","item-id":"~~V1~~2785119550041083381~~PnBkfBE9JnQxpahv0adkcuIcmMhroRAHXwLZd-7zhunTxvAnL2wqac4MyzR7uD46gj3kUkbS3FhelBtnsiJV6MhkDZRZzzIqDobN6rWmCPA3hYz5D3PLat6nhIftiT1lwdxwdlxkeV_Mfb3eos_TQavImGhxk0e7psNAZxHJ9RKL2w3lppALGgQJoy2o6lkf-pOqODtX1VkgWpEEM4WsVoWOnUTAwdyGd-8yrze8CWNp752y28hl7lleicyO1vByRdbgwlJdnqyroTPEQNNEn1JRxBOSYSWt-Xm3vkPm-G4","uploader":"","is-syndicated":"true","publisher":"search","id":"~~V1~~2785119550041083381~~PnBkfBE9JnQxpahv0adkcuIcmMhroRAHXwLZd-7zhunTxvAnL2wqac4MyzR7uD46gj3kUkbS3FhelBtnsiJV6MhkDZRZzzIqDobN6rWmCPA3hYz5D3PLat6nhIftiT1lwdxwdlxkeV_Mfb3eos_TQavImGhxk0e7psNAZxHJ9RKL2w3lppALGgQJoy2o6lkf-pOqODtX1VkgWpEEM4WsVoWOnUTAwdyGd-8yrze8CWNp752y28hl7lleicyO1vByRdbgwlJdnqyroTPEQNNEn1JRxBOSYSWt-Xm3vkPm-G4","category":"home","views":"0","itp":[{"u":"https://trc.taboola.com/1326786/log/3/unip?en\u003dclickersusa","t":"c"}],"description":""}]}],"cpcud":{"upc":"0.0","upr":"0.0"}}}\n});\n\u003c/script\u003e\n\n\u003cscript type\u003d"text/javascript"\u003e\nwindow._taboola \u003d window._taboola || [];\n_taboola.push({flush: true});\n\u003c/script\u003e\n\n\u003c/body\u003e\n\u003c/html\u003e',
                'adomain': [
                  'example.xyz'
                ],
                'cid': '15744349',
                'crid': '278195503434041083381',
                'w': 300,
                'h': 250,
                'exp': 60,
                'lurl': 'http://us-trc.taboola.com/sample',
                'nurl': 'http://win.example.com/',

              }
            ],
            'seat': '14204545260'
          }
        ],
        'bidid': 'da43860a-4644-442a-b5e0-93f268cf8d19',
        'cur': 'USD',
        'ext': {
          'igbid': [
            {
              'impid': request.data.imp[0].id,
              'igbuyer': [
                {
                  'origin': 'https://pa.taboola.com',
                  'buyerdata': '{\"seller\":\"pa.taboola.com\",\"resolveToConfig\":false,\"perBuyerSignals\":{\"https://pa.taboola.com\":{\"country\":\"US\",\"route\":\"AM\",\"cct\":[0.02241223,-0.8686833,0.96153843],\"vct\":\"-1967600173\",\"ccv\":null,\"ect\":[-0.13584597,2.5825605],\"ri\":\"100fb73d4064bc\",\"vcv\":\"165229814\",\"ecv\":[-0.39882636,-0.05216012],\"publisher\":\"test-headerbidding\",\"platform\":\"DESK\"}},\"decisionLogicUrl\":\"https://pa.taboola.com/score/decisionLogic.js\",\"sellerTimeout\":100,\"interestGroupBuyers\":[\"https://pa.taboola.com\"],\"perBuyerTimeouts\":{\"*\":50}}'
                }
              ]
            }
          ]
        }
      }
    };

    const serverResponseWithPartialPa = {
      body: {
        'id': '49ffg4d58ef9a163a69fhgfghd4fad03621b9e036f24f7_15',
        'seatbid': [
          {
            'bid': [
              {
                'id': '0b3dd94348-134b-435f-8db5-6bf5afgfc39e86c',
                'impid': request.data.imp[0].id,
                'price': 0.342068,
                'adid': '2785119545551083381',
                'adm': '\u003chtml\u003e\n\u003chead\u003e\n\u003cmeta charset\u003d"UTF-8"\u003e\n\u003cmeta http-equiv\u003d"Content-Type" content\u003d"text/html; charset\u003dutf-8"/\u003e\u003c/head\u003e\n\u003cbody style\u003d"margin: 0px; overflow:hidden;"\u003e \n\u003cscript type\u003d"text/javascript"\u003e\nwindow.tbl_trc_domain \u003d \u0027us-trc.taboola.com\u0027;\nwindow._taboola \u003d window._taboola || [];\n_taboola.push({article:\u0027auto\u0027});\n!function (e, f, u, i) {\nif (!document.getElementById(i)){\ne.async \u003d 1;\ne.src \u003d u;\ne.id \u003d i;\nf.parentNode.insertBefore(e, f);\n}\n}(document.createElement(\u0027script\u0027),\ndocument.getElementsByTagName(\u0027script\u0027)[0],\n\u0027//cdn.taboola.com/libtrc/wattpad-placement-255/loader.js\u0027,\n\u0027tb_loader_script\u0027);\nif(window.performance \u0026\u0026 typeof window.performance.mark \u003d\u003d \u0027function\u0027)\n{window.performance.mark(\u0027tbl_ic\u0027);}\n\u003c/script\u003e\n\n\u003cdiv id\u003d"taboola-below-article-thumbnails" style\u003d"height: 250px; width: 300px;"\u003e\u003c/div\u003e\n\u003cscript type\u003d"text/javascript"\u003e\nwindow._taboola \u003d window._taboola || [];\n_taboola.push({\nmode: \u0027Rbox_300x250_1x1\u0027,\ncontainer: \u0027taboola-below-article-thumbnails\u0027,\nplacement: \u0027wattpad.com_P18694_S257846_W300_H250_N1_TB\u0027,\ntarget_type: \u0027mix\u0027,\n"rtb-win":{ \nbi:\u002749ff4d58ef9a163a696d4fad03621b9e036f24f7_15\u0027,\ncu:\u0027USD\u0027,\nwp:\u0027${AUCTION_PRICE:BF}\u0027,\nwcb:\u0027~!audex-display-impression!~\u0027,\nrt:\u00271643227025284\u0027,\nrdc:\u0027us.taboolasyndication.com\u0027,\nti:\u00274212\u0027,\nex:\u0027MagniteSCoD\u0027,\nbs:\u0027xapi:257846:lvvSm6Ak7_wE\u0027,\nbp:\u002718694\u0027,\nbd:\u0027wattpad.com\u0027,\nsi:\u00279964\u0027\n} \n,\nrec: {"trc":{"si":"a69c7df43b2334f0aa337c37e2d80c21","sd":"v2_a69c7df43b2334f0aa337c37e2d80c21_3c70f7c7d64a65b15e4a4175c9a2cfa51072f04bMagniteSCoD_1643227025_1643227025_CJS1tQEQ5NdWGPLA0d76xo-9ngEgASgEMCY4iegHQIroB0iB09kDUKPPB1gAYABop-G2i_Hl-eVucAA","ui":"3c70f7c7d64a65b15e4a4175c9a2cfa51072f04bMagniteSCoD","plc":"PHON","wi":"-643136642229425433","cc":"CA","route":"US:US:V","el2r":["bulk-metrics","debug","social","metrics","perf"],"uvpw":"1","pi":"1420260","cpb":"GNO629MGIJz__________wEqGXVzLnRhYm9vbGFzeW5kaWNhdGlvbi5jb20yC3RyYy1zY29kMTI5OIDwmrUMQInoB0iK6AdQgdPZA1ijzwdjCN3__________wEQ3f__________ARgjZGMI3AoQoBAYFmRjCNIDEOAGGAhkYwiWFBCcHBgYZGMI9AUQiwoYC2RjCNkUEPkcGB1kYwj0FBCeHRgfZGorNDlmZjRkNThlZjlhMTYzYTY5NmQ0ZmFkMDM2MjFiOWUwMzZmMjRmN18xNXgCgAHpbIgBrPvTxQE","dcga":{"pubConfigOverride":{"border-color":"black","font-weight":"bold","inherit-title-color":"true","module-name":"cta-lazy-module","enable-call-to-action-creative-component":"true","disable-cta-on-custom-module":"true"}},"tslt":{"p-video-overlay":{"cancel":"סגור","goto":"עבור לדף"},"read-more":{"DEFAULT_CAPTION":"%D7%A7%D7%A8%D7%90%20%D7%A2%D7%95%D7%93"},"next-up":{"BTN_TEXT":"לקריאת התוכן הבא"},"time-ago":{"now":"עכשיו","today":"היום","yesterday":"אתמול","minutes":"לפני {0} דקות","hour":"לפני שעה","hours":"לפני {0} שעות","days":"לפני {0} ימים"},"explore-more":{"TITLE_TEXT":"המשיכו לקרוא","POPUP_TEXT":"אל תפספסו הזדמנות לקרוא עוד תוכן מעולה, רגע לפני שתעזבו"}},"evh":"-1964913910","vl":[{"ri":"185db6d274ce94b27caaabd9eed7915b","uip":"wattpad.com_P18694_S257846_W300_H250_N1_TB","ppb":"COIF","estimation_method":"EcpmEstimationMethodType_ESTIMATION","baseline_variant":"false","original_ecpm":"0.4750949889421463","v":[{"thumbnail":"https://cdn.taboola.com/libtrc/static/thumbnails/a2b272be514ca3ebe3f97a4a32a41db5.jpg","all-thumbnails":"https://cdn.taboola.com/libtrc/static/thumbnails/a2b272be514ca3ebe3f97a4a32a41db5.jpg!-#@1600x1000","origin":"default","thumb-size":"1600x1000","title":"Get Roofing Services At Prices You Can Afford In Edmonton","type":"text","published-date":"1641997069","branding-text":"Roofing Services | Search Ads","url":"https://inneth-conded.xyz/9ad2e613-8777-4fe7-9a52-386c88879289?site\u003dwattpad-placement-255\u0026site_id\u003d1420260\u0026title\u003dGet+Roofing+Services+At+Prices+You+Can+Afford+In+Edmonton\u0026platform\u003dSmartphone\u0026campaign_id\u003d15573949\u0026campaign_item_id\u003d3108610633\u0026thumbnail\u003dhttp%3A%2F%2Fcdn.taboola.com%2Flibtrc%2Fstatic%2Fthumbnails%2Fa2b272be514ca3ebe3f97a4a32a41db5.jpg\u0026cpc\u003d{cpc}\u0026click_id\u003dGiCIypnAQogsMTFL3e_mPaVM2qLvK3KRU6LWzEMUgeB6piCit1Uox6CNr5v5n-x1\u0026tblci\u003dGiCIypnAQogsMTFL3e_mPaVM2qLvK3KRU6LWzEMUgeB6piCit1Uox6CNr5v5n-x1#tblciGiCIypnAQogsMTFL3e_mPaVM2qLvK3KRU6LWzEMUgeB6piCit1Uox6CNr5v5n-x1","duration":"0","sig":"328243c4127ff16e3fdcd7270bab908f6f3fc5b4c98d","item-id":"~~V1~~2785119550041083381~~PnBkfBE9JnQxpahv0adkcuIcmMhroRAHXwLZd-7zhunTxvAnL2wqac4MyzR7uD46gj3kUkbS3FhelBtnsiJV6MhkDZRZzzIqDobN6rWmCPA3hYz5D3PLat6nhIftiT1lwdxwdlxkeV_Mfb3eos_TQavImGhxk0e7psNAZxHJ9RKL2w3lppALGgQJoy2o6lkf-pOqODtX1VkgWpEEM4WsVoWOnUTAwdyGd-8yrze8CWNp752y28hl7lleicyO1vByRdbgwlJdnqyroTPEQNNEn1JRxBOSYSWt-Xm3vkPm-G4","uploader":"","is-syndicated":"true","publisher":"search","id":"~~V1~~2785119550041083381~~PnBkfBE9JnQxpahv0adkcuIcmMhroRAHXwLZd-7zhunTxvAnL2wqac4MyzR7uD46gj3kUkbS3FhelBtnsiJV6MhkDZRZzzIqDobN6rWmCPA3hYz5D3PLat6nhIftiT1lwdxwdlxkeV_Mfb3eos_TQavImGhxk0e7psNAZxHJ9RKL2w3lppALGgQJoy2o6lkf-pOqODtX1VkgWpEEM4WsVoWOnUTAwdyGd-8yrze8CWNp752y28hl7lleicyO1vByRdbgwlJdnqyroTPEQNNEn1JRxBOSYSWt-Xm3vkPm-G4","category":"home","views":"0","itp":[{"u":"https://trc.taboola.com/1326786/log/3/unip?en\u003dclickersusa","t":"c"}],"description":""}]}],"cpcud":{"upc":"0.0","upr":"0.0"}}}\n});\n\u003c/script\u003e\n\n\u003cscript type\u003d"text/javascript"\u003e\nwindow._taboola \u003d window._taboola || [];\n_taboola.push({flush: true});\n\u003c/script\u003e\n\n\u003c/body\u003e\n\u003c/html\u003e',
                'adomain': [
                  'example.xyz'
                ],
                'cid': '15744349',
                'crid': '278195503434041083381',
                'w': 300,
                'h': 250,
                'exp': 60,
                'lurl': 'http://us-trc.taboola.com/sample',
                'nurl': 'http://win.example.com/',

              }
            ],
            'seat': '14204545260'
          }
        ],
        'bidid': 'da43860a-4644-442a-b5e0-93f268cf8d19',
        'cur': 'USD',
        'ext': {
          'igbid': [
            {
              'impid': request.data.imp[0].id,
              'igbuyer': [
                {
                  'origin': 'https://pa.taboola.com',
                  'buyerdata': '{}'
                }
              ]
            }
          ]
        }
      }
    };

    const serverResponseWithWrongPa = {
      body: {
        'id': '49ffg4d58ef9a163a69fhgfghd4fad03621b9e036f24f7_15',
        'seatbid': [
          {
            'bid': [
              {
                'id': '0b3dd94348-134b-435f-8db5-6bf5afgfc39e86c',
                'impid': request.data.imp[0].id,
                'price': 0.342068,
                'adid': '2785119545551083381',
                'adm': '\u003chtml\u003e\n\u003chead\u003e\n\u003cmeta charset\u003d"UTF-8"\u003e\n\u003cmeta http-equiv\u003d"Content-Type" content\u003d"text/html; charset\u003dutf-8"/\u003e\u003c/head\u003e\n\u003cbody style\u003d"margin: 0px; overflow:hidden;"\u003e \n\u003cscript type\u003d"text/javascript"\u003e\nwindow.tbl_trc_domain \u003d \u0027us-trc.taboola.com\u0027;\nwindow._taboola \u003d window._taboola || [];\n_taboola.push({article:\u0027auto\u0027});\n!function (e, f, u, i) {\nif (!document.getElementById(i)){\ne.async \u003d 1;\ne.src \u003d u;\ne.id \u003d i;\nf.parentNode.insertBefore(e, f);\n}\n}(document.createElement(\u0027script\u0027),\ndocument.getElementsByTagName(\u0027script\u0027)[0],\n\u0027//cdn.taboola.com/libtrc/wattpad-placement-255/loader.js\u0027,\n\u0027tb_loader_script\u0027);\nif(window.performance \u0026\u0026 typeof window.performance.mark \u003d\u003d \u0027function\u0027)\n{window.performance.mark(\u0027tbl_ic\u0027);}\n\u003c/script\u003e\n\n\u003cdiv id\u003d"taboola-below-article-thumbnails" style\u003d"height: 250px; width: 300px;"\u003e\u003c/div\u003e\n\u003cscript type\u003d"text/javascript"\u003e\nwindow._taboola \u003d window._taboola || [];\n_taboola.push({\nmode: \u0027Rbox_300x250_1x1\u0027,\ncontainer: \u0027taboola-below-article-thumbnails\u0027,\nplacement: \u0027wattpad.com_P18694_S257846_W300_H250_N1_TB\u0027,\ntarget_type: \u0027mix\u0027,\n"rtb-win":{ \nbi:\u002749ff4d58ef9a163a696d4fad03621b9e036f24f7_15\u0027,\ncu:\u0027USD\u0027,\nwp:\u0027${AUCTION_PRICE:BF}\u0027,\nwcb:\u0027~!audex-display-impression!~\u0027,\nrt:\u00271643227025284\u0027,\nrdc:\u0027us.taboolasyndication.com\u0027,\nti:\u00274212\u0027,\nex:\u0027MagniteSCoD\u0027,\nbs:\u0027xapi:257846:lvvSm6Ak7_wE\u0027,\nbp:\u002718694\u0027,\nbd:\u0027wattpad.com\u0027,\nsi:\u00279964\u0027\n} \n,\nrec: {"trc":{"si":"a69c7df43b2334f0aa337c37e2d80c21","sd":"v2_a69c7df43b2334f0aa337c37e2d80c21_3c70f7c7d64a65b15e4a4175c9a2cfa51072f04bMagniteSCoD_1643227025_1643227025_CJS1tQEQ5NdWGPLA0d76xo-9ngEgASgEMCY4iegHQIroB0iB09kDUKPPB1gAYABop-G2i_Hl-eVucAA","ui":"3c70f7c7d64a65b15e4a4175c9a2cfa51072f04bMagniteSCoD","plc":"PHON","wi":"-643136642229425433","cc":"CA","route":"US:US:V","el2r":["bulk-metrics","debug","social","metrics","perf"],"uvpw":"1","pi":"1420260","cpb":"GNO629MGIJz__________wEqGXVzLnRhYm9vbGFzeW5kaWNhdGlvbi5jb20yC3RyYy1zY29kMTI5OIDwmrUMQInoB0iK6AdQgdPZA1ijzwdjCN3__________wEQ3f__________ARgjZGMI3AoQoBAYFmRjCNIDEOAGGAhkYwiWFBCcHBgYZGMI9AUQiwoYC2RjCNkUEPkcGB1kYwj0FBCeHRgfZGorNDlmZjRkNThlZjlhMTYzYTY5NmQ0ZmFkMDM2MjFiOWUwMzZmMjRmN18xNXgCgAHpbIgBrPvTxQE","dcga":{"pubConfigOverride":{"border-color":"black","font-weight":"bold","inherit-title-color":"true","module-name":"cta-lazy-module","enable-call-to-action-creative-component":"true","disable-cta-on-custom-module":"true"}},"tslt":{"p-video-overlay":{"cancel":"סגור","goto":"עבור לדף"},"read-more":{"DEFAULT_CAPTION":"%D7%A7%D7%A8%D7%90%20%D7%A2%D7%95%D7%93"},"next-up":{"BTN_TEXT":"לקריאת התוכן הבא"},"time-ago":{"now":"עכשיו","today":"היום","yesterday":"אתמול","minutes":"לפני {0} דקות","hour":"לפני שעה","hours":"לפני {0} שעות","days":"לפני {0} ימים"},"explore-more":{"TITLE_TEXT":"המשיכו לקרוא","POPUP_TEXT":"אל תפספסו הזדמנות לקרוא עוד תוכן מעולה, רגע לפני שתעזבו"}},"evh":"-1964913910","vl":[{"ri":"185db6d274ce94b27caaabd9eed7915b","uip":"wattpad.com_P18694_S257846_W300_H250_N1_TB","ppb":"COIF","estimation_method":"EcpmEstimationMethodType_ESTIMATION","baseline_variant":"false","original_ecpm":"0.4750949889421463","v":[{"thumbnail":"https://cdn.taboola.com/libtrc/static/thumbnails/a2b272be514ca3ebe3f97a4a32a41db5.jpg","all-thumbnails":"https://cdn.taboola.com/libtrc/static/thumbnails/a2b272be514ca3ebe3f97a4a32a41db5.jpg!-#@1600x1000","origin":"default","thumb-size":"1600x1000","title":"Get Roofing Services At Prices You Can Afford In Edmonton","type":"text","published-date":"1641997069","branding-text":"Roofing Services | Search Ads","url":"https://inneth-conded.xyz/9ad2e613-8777-4fe7-9a52-386c88879289?site\u003dwattpad-placement-255\u0026site_id\u003d1420260\u0026title\u003dGet+Roofing+Services+At+Prices+You+Can+Afford+In+Edmonton\u0026platform\u003dSmartphone\u0026campaign_id\u003d15573949\u0026campaign_item_id\u003d3108610633\u0026thumbnail\u003dhttp%3A%2F%2Fcdn.taboola.com%2Flibtrc%2Fstatic%2Fthumbnails%2Fa2b272be514ca3ebe3f97a4a32a41db5.jpg\u0026cpc\u003d{cpc}\u0026click_id\u003dGiCIypnAQogsMTFL3e_mPaVM2qLvK3KRU6LWzEMUgeB6piCit1Uox6CNr5v5n-x1\u0026tblci\u003dGiCIypnAQogsMTFL3e_mPaVM2qLvK3KRU6LWzEMUgeB6piCit1Uox6CNr5v5n-x1#tblciGiCIypnAQogsMTFL3e_mPaVM2qLvK3KRU6LWzEMUgeB6piCit1Uox6CNr5v5n-x1","duration":"0","sig":"328243c4127ff16e3fdcd7270bab908f6f3fc5b4c98d","item-id":"~~V1~~2785119550041083381~~PnBkfBE9JnQxpahv0adkcuIcmMhroRAHXwLZd-7zhunTxvAnL2wqac4MyzR7uD46gj3kUkbS3FhelBtnsiJV6MhkDZRZzzIqDobN6rWmCPA3hYz5D3PLat6nhIftiT1lwdxwdlxkeV_Mfb3eos_TQavImGhxk0e7psNAZxHJ9RKL2w3lppALGgQJoy2o6lkf-pOqODtX1VkgWpEEM4WsVoWOnUTAwdyGd-8yrze8CWNp752y28hl7lleicyO1vByRdbgwlJdnqyroTPEQNNEn1JRxBOSYSWt-Xm3vkPm-G4","uploader":"","is-syndicated":"true","publisher":"search","id":"~~V1~~2785119550041083381~~PnBkfBE9JnQxpahv0adkcuIcmMhroRAHXwLZd-7zhunTxvAnL2wqac4MyzR7uD46gj3kUkbS3FhelBtnsiJV6MhkDZRZzzIqDobN6rWmCPA3hYz5D3PLat6nhIftiT1lwdxwdlxkeV_Mfb3eos_TQavImGhxk0e7psNAZxHJ9RKL2w3lppALGgQJoy2o6lkf-pOqODtX1VkgWpEEM4WsVoWOnUTAwdyGd-8yrze8CWNp752y28hl7lleicyO1vByRdbgwlJdnqyroTPEQNNEn1JRxBOSYSWt-Xm3vkPm-G4","category":"home","views":"0","itp":[{"u":"https://trc.taboola.com/1326786/log/3/unip?en\u003dclickersusa","t":"c"}],"description":""}]}],"cpcud":{"upc":"0.0","upr":"0.0"}}}\n});\n\u003c/script\u003e\n\n\u003cscript type\u003d"text/javascript"\u003e\nwindow._taboola \u003d window._taboola || [];\n_taboola.push({flush: true});\n\u003c/script\u003e\n\n\u003c/body\u003e\n\u003c/html\u003e',
                'adomain': [
                  'example.xyz'
                ],
                'cid': '15744349',
                'crid': '278195503434041083381',
                'w': 300,
                'h': 250,
                'exp': 60,
                'lurl': 'http://us-trc.taboola.com/sample',
                'nurl': 'http://win.example.com/',

              }
            ],
            'seat': '14204545260'
          }
        ],
        'bidid': 'da43860a-4644-442a-b5e0-93f268cf8d19',
        'cur': 'USD',
        'ext': {
          'igbid': [
            {
              'impid': request.data.imp[0].id,
              'igbuyer': [
                {
                }
              ]
            }
          ]
        }
      }
    };

    const serverResponseWithEmptyIgbidWIthWrongPa = {
      body: {
        'id': '49ffg4d58ef9a163a69fhgfghd4fad03621b9e036f24f7_15',
        'seatbid': [
          {
            'bid': [
              {
                'id': '0b3dd94348-134b-435f-8db5-6bf5afgfc39e86c',
                'impid': request.data.imp[0].id,
                'price': 0.342068,
                'adid': '2785119545551083381',
                'adm': '\u003chtml\u003e\n\u003chead\u003e\n\u003cmeta charset\u003d"UTF-8"\u003e\n\u003cmeta http-equiv\u003d"Content-Type" content\u003d"text/html; charset\u003dutf-8"/\u003e\u003c/head\u003e\n\u003cbody style\u003d"margin: 0px; overflow:hidden;"\u003e \n\u003cscript type\u003d"text/javascript"\u003e\nwindow.tbl_trc_domain \u003d \u0027us-trc.taboola.com\u0027;\nwindow._taboola \u003d window._taboola || [];\n_taboola.push({article:\u0027auto\u0027});\n!function (e, f, u, i) {\nif (!document.getElementById(i)){\ne.async \u003d 1;\ne.src \u003d u;\ne.id \u003d i;\nf.parentNode.insertBefore(e, f);\n}\n}(document.createElement(\u0027script\u0027),\ndocument.getElementsByTagName(\u0027script\u0027)[0],\n\u0027//cdn.taboola.com/libtrc/wattpad-placement-255/loader.js\u0027,\n\u0027tb_loader_script\u0027);\nif(window.performance \u0026\u0026 typeof window.performance.mark \u003d\u003d \u0027function\u0027)\n{window.performance.mark(\u0027tbl_ic\u0027);}\n\u003c/script\u003e\n\n\u003cdiv id\u003d"taboola-below-article-thumbnails" style\u003d"height: 250px; width: 300px;"\u003e\u003c/div\u003e\n\u003cscript type\u003d"text/javascript"\u003e\nwindow._taboola \u003d window._taboola || [];\n_taboola.push({\nmode: \u0027Rbox_300x250_1x1\u0027,\ncontainer: \u0027taboola-below-article-thumbnails\u0027,\nplacement: \u0027wattpad.com_P18694_S257846_W300_H250_N1_TB\u0027,\ntarget_type: \u0027mix\u0027,\n"rtb-win":{ \nbi:\u002749ff4d58ef9a163a696d4fad03621b9e036f24f7_15\u0027,\ncu:\u0027USD\u0027,\nwp:\u0027${AUCTION_PRICE:BF}\u0027,\nwcb:\u0027~!audex-display-impression!~\u0027,\nrt:\u00271643227025284\u0027,\nrdc:\u0027us.taboolasyndication.com\u0027,\nti:\u00274212\u0027,\nex:\u0027MagniteSCoD\u0027,\nbs:\u0027xapi:257846:lvvSm6Ak7_wE\u0027,\nbp:\u002718694\u0027,\nbd:\u0027wattpad.com\u0027,\nsi:\u00279964\u0027\n} \n,\nrec: {"trc":{"si":"a69c7df43b2334f0aa337c37e2d80c21","sd":"v2_a69c7df43b2334f0aa337c37e2d80c21_3c70f7c7d64a65b15e4a4175c9a2cfa51072f04bMagniteSCoD_1643227025_1643227025_CJS1tQEQ5NdWGPLA0d76xo-9ngEgASgEMCY4iegHQIroB0iB09kDUKPPB1gAYABop-G2i_Hl-eVucAA","ui":"3c70f7c7d64a65b15e4a4175c9a2cfa51072f04bMagniteSCoD","plc":"PHON","wi":"-643136642229425433","cc":"CA","route":"US:US:V","el2r":["bulk-metrics","debug","social","metrics","perf"],"uvpw":"1","pi":"1420260","cpb":"GNO629MGIJz__________wEqGXVzLnRhYm9vbGFzeW5kaWNhdGlvbi5jb20yC3RyYy1zY29kMTI5OIDwmrUMQInoB0iK6AdQgdPZA1ijzwdjCN3__________wEQ3f__________ARgjZGMI3AoQoBAYFmRjCNIDEOAGGAhkYwiWFBCcHBgYZGMI9AUQiwoYC2RjCNkUEPkcGB1kYwj0FBCeHRgfZGorNDlmZjRkNThlZjlhMTYzYTY5NmQ0ZmFkMDM2MjFiOWUwMzZmMjRmN18xNXgCgAHpbIgBrPvTxQE","dcga":{"pubConfigOverride":{"border-color":"black","font-weight":"bold","inherit-title-color":"true","module-name":"cta-lazy-module","enable-call-to-action-creative-component":"true","disable-cta-on-custom-module":"true"}},"tslt":{"p-video-overlay":{"cancel":"סגור","goto":"עבור לדף"},"read-more":{"DEFAULT_CAPTION":"%D7%A7%D7%A8%D7%90%20%D7%A2%D7%95%D7%93"},"next-up":{"BTN_TEXT":"לקריאת התוכן הבא"},"time-ago":{"now":"עכשיו","today":"היום","yesterday":"אתמול","minutes":"לפני {0} דקות","hour":"לפני שעה","hours":"לפני {0} שעות","days":"לפני {0} ימים"},"explore-more":{"TITLE_TEXT":"המשיכו לקרוא","POPUP_TEXT":"אל תפספסו הזדמנות לקרוא עוד תוכן מעולה, רגע לפני שתעזבו"}},"evh":"-1964913910","vl":[{"ri":"185db6d274ce94b27caaabd9eed7915b","uip":"wattpad.com_P18694_S257846_W300_H250_N1_TB","ppb":"COIF","estimation_method":"EcpmEstimationMethodType_ESTIMATION","baseline_variant":"false","original_ecpm":"0.4750949889421463","v":[{"thumbnail":"https://cdn.taboola.com/libtrc/static/thumbnails/a2b272be514ca3ebe3f97a4a32a41db5.jpg","all-thumbnails":"https://cdn.taboola.com/libtrc/static/thumbnails/a2b272be514ca3ebe3f97a4a32a41db5.jpg!-#@1600x1000","origin":"default","thumb-size":"1600x1000","title":"Get Roofing Services At Prices You Can Afford In Edmonton","type":"text","published-date":"1641997069","branding-text":"Roofing Services | Search Ads","url":"https://inneth-conded.xyz/9ad2e613-8777-4fe7-9a52-386c88879289?site\u003dwattpad-placement-255\u0026site_id\u003d1420260\u0026title\u003dGet+Roofing+Services+At+Prices+You+Can+Afford+In+Edmonton\u0026platform\u003dSmartphone\u0026campaign_id\u003d15573949\u0026campaign_item_id\u003d3108610633\u0026thumbnail\u003dhttp%3A%2F%2Fcdn.taboola.com%2Flibtrc%2Fstatic%2Fthumbnails%2Fa2b272be514ca3ebe3f97a4a32a41db5.jpg\u0026cpc\u003d{cpc}\u0026click_id\u003dGiCIypnAQogsMTFL3e_mPaVM2qLvK3KRU6LWzEMUgeB6piCit1Uox6CNr5v5n-x1\u0026tblci\u003dGiCIypnAQogsMTFL3e_mPaVM2qLvK3KRU6LWzEMUgeB6piCit1Uox6CNr5v5n-x1#tblciGiCIypnAQogsMTFL3e_mPaVM2qLvK3KRU6LWzEMUgeB6piCit1Uox6CNr5v5n-x1","duration":"0","sig":"328243c4127ff16e3fdcd7270bab908f6f3fc5b4c98d","item-id":"~~V1~~2785119550041083381~~PnBkfBE9JnQxpahv0adkcuIcmMhroRAHXwLZd-7zhunTxvAnL2wqac4MyzR7uD46gj3kUkbS3FhelBtnsiJV6MhkDZRZzzIqDobN6rWmCPA3hYz5D3PLat6nhIftiT1lwdxwdlxkeV_Mfb3eos_TQavImGhxk0e7psNAZxHJ9RKL2w3lppALGgQJoy2o6lkf-pOqODtX1VkgWpEEM4WsVoWOnUTAwdyGd-8yrze8CWNp752y28hl7lleicyO1vByRdbgwlJdnqyroTPEQNNEn1JRxBOSYSWt-Xm3vkPm-G4","uploader":"","is-syndicated":"true","publisher":"search","id":"~~V1~~2785119550041083381~~PnBkfBE9JnQxpahv0adkcuIcmMhroRAHXwLZd-7zhunTxvAnL2wqac4MyzR7uD46gj3kUkbS3FhelBtnsiJV6MhkDZRZzzIqDobN6rWmCPA3hYz5D3PLat6nhIftiT1lwdxwdlxkeV_Mfb3eos_TQavImGhxk0e7psNAZxHJ9RKL2w3lppALGgQJoy2o6lkf-pOqODtX1VkgWpEEM4WsVoWOnUTAwdyGd-8yrze8CWNp752y28hl7lleicyO1vByRdbgwlJdnqyroTPEQNNEn1JRxBOSYSWt-Xm3vkPm-G4","category":"home","views":"0","itp":[{"u":"https://trc.taboola.com/1326786/log/3/unip?en\u003dclickersusa","t":"c"}],"description":""}]}],"cpcud":{"upc":"0.0","upr":"0.0"}}}\n});\n\u003c/script\u003e\n\n\u003cscript type\u003d"text/javascript"\u003e\nwindow._taboola \u003d window._taboola || [];\n_taboola.push({flush: true});\n\u003c/script\u003e\n\n\u003c/body\u003e\n\u003c/html\u003e',
                'adomain': [
                  'example.xyz'
                ],
                'cid': '15744349',
                'crid': '278195503434041083381',
                'w': 300,
                'h': 250,
                'exp': 60,
                'lurl': 'http://us-trc.taboola.com/sample',
                'nurl': 'http://win.example.com/',

              }
            ],
            'seat': '14204545260'
          }
        ],
        'bidid': 'da43860a-4644-442a-b5e0-93f268cf8d19',
        'cur': 'USD',
        'ext': {
          'igbid': [
            {
            }
          ]
        }
      }
    };

    it('should return empty array if no valid bids', function () {
      const res = spec.interpretResponse(serverResponse, [])
      expect(res).to.be.an('array').that.is.empty
    });

    it('should return empty array if no server response', function () {
      const res = spec.interpretResponse({}, request)
      expect(res).to.be.an('array').that.is.empty
    });

    it('should return empty array if server response without seatbid', function () {
      const overriddenServerResponse = {...serverResponse};
      const seatbid = {...serverResponse.body.seatbid[0]};
      overriddenServerResponse.body.seatbid[0] = {};

      const res = spec.interpretResponse(overriddenServerResponse, request)
      expect(res).to.be.an('array').that.is.empty

      overriddenServerResponse.body.seatbid[0] = seatbid;
    });

    it('should return empty array if server response without bids', function () {
      const overriddenServerResponse = {...serverResponse};
      const bid = [...serverResponse.body.seatbid[0].bid];
      overriddenServerResponse.body.seatbid[0].bid = {};

      const res = spec.interpretResponse(overriddenServerResponse, request)
      expect(res).to.be.an('array').that.is.empty

      overriddenServerResponse.body.seatbid[0].bid = bid;
    });

    it('should interpret multi impression request', function () {
      const multiRequest = spec.buildRequests([defaultBidRequest, defaultBidRequest], bidderRequest);

      const multiServerResponse = {
        body: {
          'id': '49ffg4d58ef9a163a69fhgfghd4fad03621b9e036f24f7_15',
          'seatbid': [
            {
              'bid': [
                {
                  'id': '0b3dd94348-134b-435f-8db5-6bf5afgfc39e86c',
                  'impid': multiRequest.data.imp[0].id,
                  'price': 0.342068,
                  'adid': '2785119545551083381',
                  'adm': 'ADM2',
                  'adomain': [
                    'example.xyz'
                  ],
                  'cid': '15744349',
                  'crid': '278195503434041083381',
                  'w': 300,
                  'h': 250,
                  'exp': 60,
                  'lurl': 'http://us-trc.taboola.com/sample',
                  'nurl': 'http://win.example.com/'
                },
                {
                  'id': '0b3dd94348-134b-435f-8db5-6bf5afgfc39e86c',
                  'impid': multiRequest.data.imp[1].id,
                  'price': 0.342068,
                  'adid': '2785119545551083381',
                  'adm': 'ADM1',
                  'adomain': [
                    'example.xyz'
                  ],
                  'cid': '15744349',
                  'crid': '278195503434041083381',
                  'w': 300,
                  'h': 250,
                  'exp': 60,
                  'lurl': 'http://us-trc.taboola.com/sample',
                  'nurl': 'http://win.example.com/'

                }
              ],
              'seat': '14204545260'
            }
          ],
          'bidid': 'da43860a-4644-442a-b5e0-93f268cf8d19',
          'cur': 'USD'
        }
      };

      const [bid] = multiServerResponse.body.seatbid[0].bid;
      const expectedRes = [
        {
          requestId: multiRequest.bids[1].bidId,
          cpm: bid.price,
          creativeId: bid.crid,
          creative_id: bid.crid,
          seatBidId: multiServerResponse.body.seatbid[0].bid[0].id,
          ttl: 60,
          netRevenue: true,
          currency: multiServerResponse.body.cur,
          mediaType: 'banner',
          ad: multiServerResponse.body.seatbid[0].bid[0].adm,
          width: bid.w,
          height: bid.h,
          nurl: 'http://win.example.com/',
          meta: {
            'advertiserDomains': bid.adomain
          },
        },
        {
          requestId: multiRequest.bids[0].bidId,
          cpm: bid.price,
          creativeId: bid.crid,
          creative_id: bid.crid,
          seatBidId: multiServerResponse.body.seatbid[0].bid[1].id,
          ttl: 60,
          netRevenue: true,
          currency: multiServerResponse.body.cur,
          mediaType: 'banner',
          ad: multiServerResponse.body.seatbid[0].bid[1].adm,
          width: bid.w,
          height: bid.h,
          nurl: 'http://win.example.com/',
          meta: {
            'advertiserDomains': bid.adomain
          },
        }
      ]

      const res = spec.interpretResponse(multiServerResponse, multiRequest)
      expect(res).to.deep.equal(expectedRes)
    });

    it('should interpret display response', function () {
      const [bid] = serverResponse.body.seatbid[0].bid;
      const expectedRes = [
        {
          requestId: request.bids[0].bidId,
          seatBidId: serverResponse.body.seatbid[0].bid[0].id,
          cpm: bid.price,
          creativeId: bid.crid,
          creative_id: bid.crid,
          ttl: 60,
          netRevenue: true,
          currency: serverResponse.body.cur,
          mediaType: 'banner',
          ad: bid.adm,
          width: bid.w,
          height: bid.h,
          nurl: 'http://win.example.com/',
          meta: {
            'advertiserDomains': bid.adomain
          },
        }
      ]

      const res = spec.interpretResponse(serverResponse, request)
      expect(res).to.deep.equal(expectedRes)
    });

    it('should interpret display response with PA', function () {
      const [bid] = serverResponse.body.seatbid[0].bid;

      const expectedRes = {
        'bids': [
          {
            requestId: request.bids[0].bidId,
            seatBidId: serverResponse.body.seatbid[0].bid[0].id,
            cpm: bid.price,
            creativeId: bid.crid,
            creative_id: bid.crid,
            ttl: 60,
            netRevenue: true,
            currency: serverResponse.body.cur,
            mediaType: 'banner',
            ad: bid.adm,
            width: bid.w,
            height: bid.h,
            nurl: 'http://win.example.com/',
            meta: {
              'advertiserDomains': bid.adomain
            },
          }
        ],
        'fledgeAuctionConfigs': [
          {
            'impId': request.bids[0].bidId,
            'config': {
              'seller': 'pa.taboola.com',
              'resolveToConfig': false,
              'sellerSignals': {},
              'sellerTimeout': 100,
              'perBuyerSignals': {
                'https://pa.taboola.com': {
                  'country': 'US',
                  'route': 'AM',
                  'cct': [
                    0.02241223,
                    -0.8686833,
                    0.96153843
                  ],
                  'vct': '-1967600173',
                  'ccv': null,
                  'ect': [
                    -0.13584597,
                    2.5825605
                  ],
                  'ri': '100fb73d4064bc',
                  'vcv': '165229814',
                  'ecv': [
                    -0.39882636,
                    -0.05216012
                  ],
                  'publisher': 'test-headerbidding',
                  'platform': 'DESK'
                }
              },
              'auctionSignals': {},
              'decisionLogicUrl': 'https://pa.taboola.com/score/decisionLogic.js',
              'interestGroupBuyers': [
                'https://pa.taboola.com'
              ],
              'perBuyerTimeouts': {
                '*': 50
              }
            }
          }
        ]
      }

      const res = spec.interpretResponse(serverResponseWithPa, request)
      expect(res).to.deep.equal(expectedRes)
    });

    it('should interpret display response with partialPA', function () {
      const [bid] = serverResponse.body.seatbid[0].bid;
      const expectedRes = {
        'bids': [
          {
            requestId: request.bids[0].bidId,
            seatBidId: serverResponse.body.seatbid[0].bid[0].id,
            cpm: bid.price,
            creativeId: bid.crid,
            creative_id: bid.crid,
            ttl: 60,
            netRevenue: true,
            currency: serverResponse.body.cur,
            mediaType: 'banner',
            ad: bid.adm,
            width: bid.w,
            height: bid.h,
            nurl: 'http://win.example.com/',
            meta: {
              'advertiserDomains': bid.adomain
            },
          }
        ],
        'fledgeAuctionConfigs': [
          {
            'impId': request.bids[0].bidId,
            'config': {
              'seller': undefined,
              'resolveToConfig': undefined,
              'sellerSignals': {},
              'sellerTimeout': undefined,
              'perBuyerSignals': {},
              'auctionSignals': {},
              'decisionLogicUrl': undefined,
              'interestGroupBuyers': undefined,
              'perBuyerTimeouts': undefined
            }
          }
        ]
      }

      const res = spec.interpretResponse(serverResponseWithPartialPa, request)
      expect(res).to.deep.equal(expectedRes)
    });

    it('should interpret display response with wrong PA', function () {
      const [bid] = serverResponse.body.seatbid[0].bid;

      const expectedRes = [
        {
          requestId: request.bids[0].bidId,
          seatBidId: serverResponse.body.seatbid[0].bid[0].id,
          cpm: bid.price,
          creativeId: bid.crid,
          creative_id: bid.crid,
          ttl: 60,
          netRevenue: true,
          currency: serverResponse.body.cur,
          mediaType: 'banner',
          ad: bid.adm,
          width: bid.w,
          height: bid.h,
          nurl: 'http://win.example.com/',
          meta: {
            'advertiserDomains': bid.adomain
          },
        }
      ]

      const res = spec.interpretResponse(serverResponseWithWrongPa, request)
      expect(res).to.deep.equal(expectedRes)
    });

    it('should interpret display response with empty igbid wrong PA', function () {
      const [bid] = serverResponse.body.seatbid[0].bid;

      const expectedRes = [
        {
          requestId: request.bids[0].bidId,
          seatBidId: serverResponse.body.seatbid[0].bid[0].id,
          cpm: bid.price,
          creativeId: bid.crid,
          creative_id: bid.crid,
          ttl: 60,
          netRevenue: true,
          currency: serverResponse.body.cur,
          mediaType: 'banner',
          ad: bid.adm,
          width: bid.w,
          height: bid.h,
          nurl: 'http://win.example.com/',
          meta: {
            'advertiserDomains': bid.adomain
          },
        }
      ]

      const res = spec.interpretResponse(serverResponseWithEmptyIgbidWIthWrongPa, request)
      expect(res).to.deep.equal(expectedRes)
    });

    it('should set the correct ttl form the response', function () {
      // set exp-ttl to be 125
      const [bid] = serverResponse.body.seatbid[0].bid;
      serverResponse.body.seatbid[0].bid[0].exp = 125;
      const expectedRes = [
        {
          requestId: request.bids[0].bidId,
          seatBidId: serverResponse.body.seatbid[0].bid[0].id,
          cpm: bid.price,
          creativeId: bid.crid,
          creative_id: bid.crid,
          ttl: 125,
          netRevenue: true,
          currency: serverResponse.body.cur,
          mediaType: 'banner',
          ad: bid.adm,
          width: bid.w,
          height: bid.h,
          nurl: 'http://win.example.com/',
          meta: {
            'advertiserDomains': bid.adomain
          },
        }
      ];
      const res = spec.interpretResponse(serverResponse, request);
      expect(res).to.deep.equal(expectedRes);
    });

    it('should replace AUCTION_PRICE macro in adm', function () {
      const multiRequest = spec.buildRequests([defaultBidRequest, defaultBidRequest], bidderRequest);
      const multiServerResponseWithMacro = {
        body: {
          'id': '49ffg4d58ef9a163a69fhgfghd4fad03621b9e036f24f7_15',
          'seatbid': [
            {
              'bid': [
                {
                  'id': '0b3dd94348-134b-435f-8db5-6bf5afgfc39e86c',
                  'impid': multiRequest.data.imp[0].id,
                  'price': 0.34,
                  'adid': '2785119545551083381',
                  'adm': 'ADM2,\\nwp:\'${AUCTION_PRICE}\'',
                  'adomain': [
                    'example.xyz'
                  ],
                  'cid': '15744349',
                  'crid': '278195503434041083381',
                  'w': 300,
                  'h': 250,
                  'exp': 60,
                  'lurl': 'http://us-trc.taboola.com/sample',
                  'nurl': 'http://win.example.com/'
                },
                {
                  'id': '0b3dd94348-134b-435f-8db5-6bf5afgfc39e86c',
                  'impid': multiRequest.data.imp[1].id,
                  'price': 0.35,
                  'adid': '2785119545551083381',
                  'adm': 'ADM2,\\nwp:\'${AUCTION_PRICE}\'',
                  'adomain': [
                    'example.xyz'
                  ],
                  'cid': '15744349',
                  'crid': '278195503434041083381',
                  'w': 300,
                  'h': 250,
                  'exp': 60,
                  'lurl': 'http://us-trc.taboola.com/sample',
                  'nurl': 'http://win.example.com/'

                }
              ],
              'seat': '14204545260'
            }
          ],
          'bidid': 'da43860a-4644-442a-b5e0-93f268cf8d19',
          'cur': 'USD'
        }
      };
      const [bid] = multiServerResponseWithMacro.body.seatbid[0].bid;
      const expectedRes = [
        {
          requestId: multiRequest.bids[1].bidId,
          cpm: multiServerResponseWithMacro.body.seatbid[0].bid[0].price,
          creativeId: bid.crid,
          creative_id: bid.crid,
          seatBidId: multiServerResponseWithMacro.body.seatbid[0].bid[0].id,
          ttl: 60,
          netRevenue: true,
          currency: multiServerResponseWithMacro.body.cur,
          mediaType: 'banner',
          ad: 'ADM2,\\nwp:\'0.34\'',
          width: bid.w,
          height: bid.h,
          nurl: 'http://win.example.com/',
          meta: {
            'advertiserDomains': bid.adomain
          },
        },
        {
          requestId: multiRequest.bids[0].bidId,
          cpm: multiServerResponseWithMacro.body.seatbid[0].bid[1].price,
          creativeId: bid.crid,
          creative_id: bid.crid,
          seatBidId: multiServerResponseWithMacro.body.seatbid[0].bid[1].id,
          ttl: 60,
          netRevenue: true,
          currency: multiServerResponseWithMacro.body.cur,
          mediaType: 'banner',
          ad: 'ADM2,\\nwp:\'0.35\'',
          width: bid.w,
          height: bid.h,
          nurl: 'http://win.example.com/',
          meta: {
            'advertiserDomains': bid.adomain
          },
        }
      ];
      const res = spec.interpretResponse(multiServerResponseWithMacro, multiRequest);
      expect(res).to.deep.equal(expectedRes);
    });
  })

  describe('getUserSyncs', function () {
    const usersyncUrl = 'https://trc.taboola.com/sg/prebidJS/1/cm';
    const iframeUrl = 'https://cdn.taboola.com/scripts/prebid_iframe_sync.html';

    it('should not return user sync if pixelEnabled is false and iframe disabled', function () {
      const res = spec.getUserSyncs({pixelEnabled: false, iframeEnabled: false});
      expect(res).to.be.an('array').that.is.empty;
    });

    it('should return user sync if pixelEnabled is true', function () {
      const res = spec.getUserSyncs({pixelEnabled: true, iframeEnabled: false});
      expect(res).to.deep.equal([{type: 'image', url: usersyncUrl}]);
    });

    it('should return user sync if iframeEnabled is true', function () {
      const res = spec.getUserSyncs({iframeEnabled: true, pixelEnabled: false});
      expect(res).to.deep.equal([{type: 'iframe', url: iframeUrl}]);
    });

    it('should return both user syncs if iframeEnabled is true and pixelEnabled is true', function () {
      const res = spec.getUserSyncs({iframeEnabled: true, pixelEnabled: true});
      expect(res).to.deep.equal([{type: 'iframe', url: iframeUrl}, {type: 'image', url: usersyncUrl}]);
    });

    it('should pass consent tokens values', function() {
      expect(spec.getUserSyncs({ pixelEnabled: true }, {}, {gdprApplies: true, consentString: 'GDPR_CONSENT'}, 'USP_CONSENT')).to.deep.equal([{
        type: 'image', url: `${usersyncUrl}?gdpr=1&gdpr_consent=GDPR_CONSENT&us_privacy=USP_CONSENT`
      }]);
      expect(spec.getUserSyncs({ pixelEnabled: true }, {}, {gdprApplies: false, consentString: undefined}, undefined)).to.deep.equal([{
        type: 'image', url: `${usersyncUrl}?gdpr=0&gdpr_consent=`
      }]);
      expect(spec.getUserSyncs({ pixelEnabled: true }, {}, {gdprApplies: false, consentString: undefined}, undefined)).to.deep.equal([{
        type: 'image', url: `${usersyncUrl}?gdpr=0&gdpr_consent=`
      }]);
      expect(spec.getUserSyncs({ pixelEnabled: true }, {}, undefined, 'USP_CONSENT')).to.deep.equal([{
        type: 'image', url: `${usersyncUrl}?us_privacy=USP_CONSENT`
      }]);
      expect(spec.getUserSyncs({ pixelEnabled: true }, {}, undefined, 'USP_CONSENT', {gppString: 'GPP_STRING', applicableSections: []})).to.deep.equal([{
        type: 'image', url: `${usersyncUrl}?us_privacy=USP_CONSENT&gpp=GPP_STRING&gpp_sid=`
      }]);
      expect(spec.getUserSyncs({ pixelEnabled: true }, {}, undefined, 'USP_CONSENT', {gppString: 'GPP_STRING', applicableSections: [32, 51]})).to.deep.equal([{
        type: 'image', url: `${usersyncUrl}?us_privacy=USP_CONSENT&gpp=GPP_STRING&gpp_sid=32%2C51`
      }]);
    });
  })

  describe('internal functions', function () {
    describe('getPageUrl', function () {
      const bidderRequest = {
        refererInfo: {
          page: 'http://canonical.url'
        }
      };

      it('should handle empty or missing data', function () {
        expect(internal.getPageUrl(undefined)).to.equal(utils.getWindowSelf().location.href);
        expect(internal.getPageUrl('')).to.equal(utils.getWindowSelf().location.href);
      });

      it('should use bidderRequest.refererInfo.page', function () {
        expect(internal.getPageUrl(bidderRequest.refererInfo)).to.equal(bidderRequest.refererInfo.page);
      });
    });

    describe('getReferrer', function () {
      it('should handle empty or missing data', function () {
        expect(internal.getReferrer(undefined)).to.equal(utils.getWindowSelf().document.referrer);
        expect(internal.getReferrer('')).to.equal(utils.getWindowSelf().document.referrer);
      });

      it('should use bidderRequest.refererInfo.ref', () => {
        const bidderRequest = {
          refererInfo: {
            ref: 'foobar'
          }
        };

        expect(internal.getReferrer(bidderRequest.refererInfo)).to.equal(bidderRequest.refererInfo.ref);
      });
    });
  })
})
