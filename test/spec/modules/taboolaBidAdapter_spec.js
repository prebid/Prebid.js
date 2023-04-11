import {expect} from 'chai';
import {spec, internal, END_POINT_URL, userData} from 'modules/taboolaBidAdapter.js';
import {config} from '../../../src/config'
import * as utils from '../../../src/utils'
import {server} from '../../mocks/xhr'

describe('Taboola Adapter', function () {
  let hasLocalStorage, cookiesAreEnabled, getDataFromLocalStorage, localStorageIsEnabled, getCookie, commonBidRequest;

  beforeEach(() => {
    hasLocalStorage = sinon.stub(userData.storageManager, 'hasLocalStorage');
    cookiesAreEnabled = sinon.stub(userData.storageManager, 'cookiesAreEnabled');
    getCookie = sinon.stub(userData.storageManager, 'getCookie');
    getDataFromLocalStorage = sinon.stub(userData.storageManager, 'getDataFromLocalStorage');
    localStorageIsEnabled = sinon.stub(userData.storageManager, 'localStorageIsEnabled');
    commonBidRequest = createBidRequest();
    $$PREBID_GLOBAL$$.bidderSettings = {
      taboola: {
        storageAllowed: true
      }
    };
  });

  afterEach(() => {
    hasLocalStorage.restore();
    cookiesAreEnabled.restore();
    getCookie.restore();
    getDataFromLocalStorage.restore();
    localStorageIsEnabled.restore();

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

  describe('buildRequests', function () {
    const defaultBidRequest = {
      ...createBidRequest(),
      ...displayBidRequestParams,
    }

    const commonBidderRequest = {
      refererInfo: {
        page: 'https://example.com/ref',
        ref: 'https://ref',
        domain: 'example.com',
      }
    }

    it('should build display request', function () {
      const expectedData = {
        'imp': [{
          'id': 1,
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
        'ext': {}
      };

      const res = spec.buildRequests([defaultBidRequest], commonBidderRequest);

      expect(res.url).to.equal(`${END_POINT_URL}/${commonBidRequest.params.publisherId}`);
      expect(res.data).to.deep.equal(JSON.stringify(expectedData));
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
      const resData = JSON.parse(res.data);
      expect(resData.imp[0].bidfloor).to.deep.equal(0.25);
      expect(resData.imp[0].bidfloorcur).to.deep.equal('EUR');
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
      const resData = JSON.parse(res.data);
      expect(resData.imp[0].bidfloor).to.deep.equal(2.7);
      expect(resData.imp[0].bidfloorcur).to.deep.equal('USD');
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
      const resData = JSON.parse(res.data);
      expect(resData.imp[0].bidfloor).to.deep.equal(2.7);
      expect(resData.imp[0].bidfloorcur).to.deep.equal('USD');
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
      const resData = JSON.parse(res.data);
      expect(resData.imp[0].banner.pos).to.deep.equal(2);
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
      const resData = JSON.parse(res.data);
      expect(resData.imp[0].ext.gpid).to.deep.equal('/homepage/#1');
    });

    it('should pass bidder timeout', function () {
      const bidderRequest = {
        ...commonBidderRequest,
        timeout: 500
      }
      const res = spec.buildRequests([defaultBidRequest], bidderRequest);
      const resData = JSON.parse(res.data);
      expect(resData.tmax).to.equal(500);
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
        const resData = JSON.parse(res.data);
        expect(resData.bcat).to.deep.equal(bidderRequest.ortb2.bcat)
        expect(resData.badv).to.deep.equal(bidderRequest.ortb2.badv)
        expect(resData.wlang).to.deep.equal(bidderRequest.ortb2.wlang)
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
        const resData = JSON.parse(res.data);
        expect(resData.ext.pageType).to.deep.equal(bidderRequest.ortb2.ext.data.pageType);
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
        const resData = JSON.parse(res.data)
        expect(resData.user.ext.consent).to.equal('consentString')
        expect(resData.regs.ext.gdpr).to.equal(1)
      });

      it('should pass GPP consent if exist in ortb2', function () {
        const ortb2 = {
          regs: {
            gpp: 'testGpp',
            gpp_sid: [1, 2, 3]
          }
        }

        const res = spec.buildRequests([defaultBidRequest], {...commonBidderRequest, ortb2})
        const resData = JSON.parse(res.data)
        expect(resData.regs.ext.gpp).to.equal('testGpp')
        expect(resData.regs.ext.gpp_sid).to.deep.equal([1, 2, 3])
      });

      it('should pass us privacy consent', function () {
        const bidderRequest = {
          refererInfo: {
            referer: 'https://example.com/'
          },
          uspConsent: 'consentString'
        }
        const res = spec.buildRequests([defaultBidRequest], bidderRequest);
        const resData = JSON.parse(res.data);
        expect(resData.regs.ext.us_privacy).to.equal('consentString');
      });

      it('should pass coppa consent', function () {
        config.setConfig({coppa: true})

        const res = spec.buildRequests([defaultBidRequest], commonBidderRequest)
        const resData = JSON.parse(res.data);
        expect(resData.regs.coppa).to.equal(1)

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
        const resData = JSON.parse(res.data);
        expect(resData.user.buyeruid).to.equal(51525152);
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
        const resData = JSON.parse(res.data);

        expect(resData.user.buyeruid).to.equal('12121212');
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
        const resData = JSON.parse(res.data);
        expect(resData.user.buyeruid).to.equal(window.TRC.user_id);

        delete window.TRC;
      });

      it('should get user id to be 0 if cookie, local storage, TRC isn`t defined', function () {
        hasLocalStorage.returns(false);
        cookiesAreEnabled.returns(false);

        const bidderRequest = {
          ...commonBidderRequest
        }
        const res = spec.buildRequests([defaultBidRequest], bidderRequest);
        const resData = JSON.parse(res.data);
        expect(resData.user.buyeruid).to.equal(0);
      });

      it('should set buyeruid to be 0 if it`s a new user', function () {
        const bidderRequest = {
          ...commonBidderRequest
        }
        const res = spec.buildRequests([defaultBidRequest], bidderRequest);
        const resData = JSON.parse(res.data);
        expect(resData.user.buyeruid).to.equal(0);
      });
    });
  })

  describe('interpretResponse', function () {
    const serverResponse = {
      body: {
        'id': '49ffg4d58ef9a163a69fhgfghd4fad03621b9e036f24f7_15',
        'seatbid': [
          {
            'bid': [
              {
                'id': '0b3dd94348-134b-435f-8db5-6bf5afgfc39e86c',
                'impid': '1',
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

    const request = {
      bids: [
        {
          ...commonBidRequest,
          ...displayBidRequestParams
        }
      ]
    }

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
      const multiRequest = {
        bids: [
          {
            ...createBidRequest(),
            ...displayBidRequestParams
          },
          {
            ...createBidRequest(),
            ...displayBidRequestParams
          }
        ]
      }

      const multiServerResponse = {
        body: {
          'id': '49ffg4d58ef9a163a69fhgfghd4fad03621b9e036f24f7_15',
          'seatbid': [
            {
              'bid': [
                {
                  'id': '0b3dd94348-134b-435f-8db5-6bf5afgfc39e86c',
                  'impid': '2',
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
                  'impid': '1',
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
          cpm: bid.price,
          creativeId: bid.crid,
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

    it('should set the correct ttl form the response', function () {
      // set exp-ttl to be 125
      const [bid] = serverResponse.body.seatbid[0].bid;
      serverResponse.body.seatbid[0].bid[0].exp = 125;
      const expectedRes = [
        {
          requestId: request.bids[0].bidId,
          cpm: bid.price,
          creativeId: bid.crid,
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
      const multiRequest = {
        bids: [
          {
            ...createBidRequest(),
            ...displayBidRequestParams
          },
          {
            ...createBidRequest(),
            ...displayBidRequestParams
          }
        ]
      }
      const multiServerResponseWithMacro = {
        body: {
          'id': '49ffg4d58ef9a163a69fhgfghd4fad03621b9e036f24f7_15',
          'seatbid': [
            {
              'bid': [
                {
                  'id': '0b3dd94348-134b-435f-8db5-6bf5afgfc39e86c',
                  'impid': '2',
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
                  'impid': '1',
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

    it('should not return user sync if pixelEnabled is false', function () {
      const res = spec.getUserSyncs({pixelEnabled: false});
      expect(res).to.be.an('array').that.is.empty;
    });

    it('should return user sync if pixelEnabled is true', function () {
      const res = spec.getUserSyncs({pixelEnabled: true});
      expect(res).to.deep.equal([{type: 'image', url: usersyncUrl}]);
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
      expect(spec.getUserSyncs({ pixelEnabled: true }, {}, undefined, 'USP_CONSENT', 'GPP_STRING')).to.deep.equal([{
        type: 'image', url: `${usersyncUrl}?us_privacy=USP_CONSENT&gpp=GPP_STRING`
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
