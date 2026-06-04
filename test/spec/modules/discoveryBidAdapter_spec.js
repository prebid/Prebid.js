import { expect } from 'chai';
import {
  spec,
  getPmgUID,
  storage,
  THIRD_PARTY_COOKIE_ORIGIN,
  COOKIE_KEY_MGUID,
  getCookieTimeToUTCString,
  buildUTMTagData,
} from 'modules/discoveryBidAdapter.js';
import { getPageTitle, getPageDescription, getPageKeywords, getConnectionDownLink } from '../../../libraries/fpdUtils/pageInfo.js';
import * as utils from 'src/utils.js';
import { getHLen } from '../../../libraries/navigatorData/navigatorData.js';

describe('discovery:BidAdapterTests', function () {
  let sandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    sandbox.stub(storage, 'getCookie');
    sandbox.stub(storage, 'setCookie');
    sandbox.stub(storage, 'getDataFromLocalStorage');
    sandbox.stub(utils, 'generateUUID').returns('new-uuid');
    sandbox.stub(utils, 'parseUrl').returns({
      search: {
        utm_source: 'example.com'
      }
    });
    sandbox.stub(storage, 'cookiesAreEnabled');
  })

  afterEach(() => {
    sandbox.restore();
  });

  const bidRequestData = {
    bidderCode: 'discovery',
    auctionId: 'ff66e39e-4075-4d18-9854-56fde9b879ac',
    bidderRequestId: '4fec04e87ad785',
    bids: [
      {
        bidder: 'discovery',
        params: {
          token: 'd0f4902b616cc5c38cbe0a08676d0ed9',
          siteId: 'siteId_01',
          zoneId: 'zoneId_01',
          publisher: '52',
          position: 'left',
          referrer: 'https://discovery.popin.cc',
        },
        refererInfo: {
          page: 'https://discovery.popin.cc',
          stack: [
            'a.com',
            'b.com'
          ]
        },
        mediaTypes: {
          banner: {
            sizes: [[300, 250]],
            pos: 'left',
          },
        },
        ortb2: {
          user: {
            ext: {
              data: {
                CxSegments: []
              }
            }
          },
          site: {
            domain: 'discovery.popin.cc',
            publisher: {
              domain: 'discovery.popin.cc'
            },
            page: 'https://discovery.popin.cc',
            cat: ['IAB-19', 'IAB-20'],
          },
        },
        ortb2Imp: {
          ext: {
            gpid: 'adslot_gpid',
            tid: 'tid_01',
            data: {
              browsi: {
                browsiViewability: 'NA',
              },
              adserver: {
                name: 'adserver_name',
                adslot: 'adslot_name',
              },
              keywords: ['travel', 'sport'],
              pbadslot: '202309999'
            }
          }
        },
        adUnitCode: 'regular_iframe',
        transactionId: 'd163f9e2-7ecd-4c2c-a3bd-28ceb52a60ee',
        sizes: [[300, 250]],
        bidId: '276092a19e05eb',
        bidderRequestId: '1fadae168708b',
        auctionId: 'ff66e39e-4075-4d18-9854-56fde9b879ac',
        src: 'client',
        bidRequestsCount: 1,
        bidderRequestsCount: 1,
        bidderWinsCount: 0,
      },
    ],
    ortb2: {
      user: {
        data: {
          segment: [
            {
              id: '412'
            }
          ],
          name: 'test.popin.cc',
          ext: {
            segclass: '1',
            segtax: 503
          }
        }
      }
    }
  };
  let request = [];

  const bidRequestDataNoParams = {
    bidderCode: 'discovery',
    auctionId: 'ff66e39e-4075-4d18-9854-56fde9b879ac',
    bidderRequestId: '4fec04e87ad785',
    bids: [
      {
        bidder: 'discovery',
        params: {
          referrer: 'https://discovery.popin.cc',
        },
        refererInfo: {
          page: 'https://discovery.popin.cc',
          stack: [
            'a.com',
            'b.com'
          ]
        },
        mediaTypes: {
          banner: {
            sizes: [[300, 250]],
            pos: 'left',
          },
        },
        ortb2: {
          user: {
            ext: {
              data: {
                CxSegments: []
              }
            }
          },
          site: {
            domain: 'discovery.popin.cc',
            publisher: {
              domain: 'discovery.popin.cc'
            },
            page: 'https://discovery.popin.cc',
            cat: ['IAB-19', 'IAB-20'],
          },
        },
        ortb2Imp: {
          ext: {
            gpid: 'adslot_gpid',
            tid: 'tid_01',
            data: {
              browsi: {
                browsiViewability: 'NA',
              },
              adserver: {
                name: 'adserver_name',
                adslot: 'adslot_name',
              },
              keywords: ['travel', 'sport'],
              pbadslot: '202309999'
            }
          }
        },
        adUnitCode: 'regular_iframe',
        transactionId: 'd163f9e2-7ecd-4c2c-a3bd-28ceb52a60ee',
        sizes: [[300, 250]],
        bidId: '276092a19e05eb',
        bidderRequestId: '1fadae168708b',
        auctionId: 'ff66e39e-4075-4d18-9854-56fde9b879ac',
        src: 'client',
        bidRequestsCount: 1,
        bidderRequestsCount: 1,
        bidderWinsCount: 0,
      },
    ],
  };

  it('discovery:validate_pub_params', function () {
    expect(
      spec.isBidRequestValid({
        bidder: 'discovery',
        params: {
          token: ['d0f4902b616cc5c38cbe0a08676d0ed9'],
          tagid: ['test_tagid'],
          publisher: ['test_publisher']
        },
      })
    ).to.equal(true);
  });

  it('isBidRequestValid:no_params', function () {
    expect(
      spec.isBidRequestValid({
        bidder: 'discovery',
        params: {},
      })
    ).to.equal(true);
  });
  it('discovery:validate_generated_params', function () {
    storage.getCookie.withArgs('_ss_pp_utm').callsFake(() => '{"utm_source":"example.com","utm_medium":"123","utm_campaign":"456"}');
    request = spec.buildRequests(bidRequestData.bids, bidRequestData);
    const req_data = JSON.parse(request.data);
    expect(req_data.imp).to.have.lengthOf(1);
  });
  describe('first party data', function () {
    it('should pass additional parameter in request for topics', function () {
      const request = spec.buildRequests(bidRequestData.bids, bidRequestData);
      const res = JSON.parse(request.data);
      expect(res.ext.tpData).to.deep.equal(bidRequestData.ortb2.user.data);
    });
  });

  describe('discovery: buildRequests', function() {
    describe('getPmgUID function', function() {
      it('should generate new UUID and set cookie if not exists', () => {
        storage.cookiesAreEnabled.callsFake(() => true);
        storage.getCookie.callsFake(() => null);
        const uid = getPmgUID();
        expect(uid).to.equal('new-uuid');
        expect(storage.setCookie.calledOnce).to.be.true;
      });

      it('should return existing UUID from cookie', () => {
        storage.cookiesAreEnabled.callsFake(() => true);
        storage.getCookie.callsFake(() => 'existing-uuid');
        const uid = getPmgUID();
        expect(uid).to.equal('existing-uuid');
        expect(storage.setCookie.called).to.be.true;
      });

      it('should not set new UUID when cookies are not enabled', () => {
        storage.cookiesAreEnabled.callsFake(() => false);
        storage.getCookie.callsFake(() => null);
        getPmgUID();
        expect(storage.setCookie.calledOnce).to.be.false;
      });
      it('should return other ID from storage and cookie', () => {
        spec.buildRequests(bidRequestData.bids, bidRequestData);
        expect(storage.getCookie.called).to.be.true;
        expect(storage.getDataFromLocalStorage.called).to.be.true;
      });
    })
    describe('buildUTMTagData function', function() {
      it('should set UTM cookie', () => {
        storage.cookiesAreEnabled.callsFake(() => true);
        storage.getCookie.callsFake(() => null);
        buildUTMTagData();
        expect(storage.setCookie.calledOnce).to.be.true;
      });

      it('should not set UTM when cookies are not enabled', () => {
        storage.cookiesAreEnabled.callsFake(() => false);
        storage.getCookie.callsFake(() => null);
        buildUTMTagData();
        expect(storage.setCookie.calledOnce).to.be.false;
      });
    })
  });

  it('discovery:validate_response_params', function () {
    const tempAdm = '<div class="discovery-adm">Simple discovery test creative</div>';
    const serverResponse = {
      body: {
        id: 'pp_hbjs_2405029787417735524',
        seatbid: [
          {
            bid: [
              {
                id: '3f6700b5e61e1476bed629b6ea6c7a4d',
                impid: '1',
                price: 0.2,
                adm: tempAdm,
                cid: '1366258',
                adid: '373310507',
                nurl: 'https://trace.mediago.cc/api/log/winnotice?tn=d0f4902b616cc5c38cbe0a08676d0ed9&winloss=1&id=3f6700b5e61e1476bed629b6ea6c7a4d&seat_id=${AUCTION_SEAT_ID}&currency=${AUCTION_CURRENCY}&bid_id=${AUCTION_BID_ID}&ad_id=${AUCTION_AD_ID}&loss=&imp_id=1&price=${AUCTION_PRICE}&test=0&time=1660811542&dp=wvO7WSz-cc9cIMKfTKLEV4Wxq2bmfn3b7m1-eCXRY1g&dsp_id=22&url=GDlAk_HBNSXBOzdKhhvt8xajglRd4lKSZa1p6n_jRygw27m5Zfp-B5yN7ofsn9N-9LkOtOK9HmnrRW-rhROSzRkQdNNrbPQDXeiO2eRi_gVHuZ0AXrxvU4hnGLTR8qeXxFVQkDpzI1_GRaZgcHjPXyhf_Thj5s6oTdKWCPj5Bui8R-ED5NNPv0KH8jhaA_LFXaaa89e8yoi04RX7ouASR_JB6LKofkZEpl2333zEMxl_FatV9NKzCWyZeYMR7m9VVRtkvNv-TUpN61y5cUGMVBfBHPe47sN773IM2Lys3iWP-p-dY1sE0bMrgEFiXHL_E5Y2kydBncLHV9cjzLsjnDtHUd5ourda_bzVApcQYtJn58m_3-_hz_04vjAqLuL1A4dVlorZq65NCWzR6vTN-xemSRp1D4ZQAR2nRU3YVNyubFAeSFyBgUBEx2t8u76oKLz_luOXvFm1I81mRqI-HhDEg827PW51xmrJT9TpLU3i16ULlbcKfoKk3C4RrFLNsC8fLGWcqky0T7Ese0o2BMcGBVXBxlnbkvabzFN6h4Y0-vYDvVRWWm_G3YzfApqhCnTgcaGCDsyLIptJuX36N4GltCTBcpQvhprn5VA_kZop5G8uhHGOE2oJ8g4HyVF5N752EZMFSe5H6Wz2pvH2gmm0KpYOdcGR1PopuJ-M9NaneEl6_cKiCtizBUxdSnxa-WADwkTJ-WwnTP2acy4M0r9puv1rk6myLl32TFmcCgd-6BtT7m9QRZiVOhlvxfWIHbyNgdb-BZ0GHwiKOVd5jMDj4hsDWqNq4hEtBlKDDpYXbdgpB-mK3z24wS_VgsgB1vnMw0yLekWK5_yDqqb_n8VEV6N7LLHyb-Ry5X-0EyRQw-IlXLjjfC7MqZwfMCTTElx2lt9Xd1DYbWM43q2EVEI0j6Vn8pITBBIfg-ygthG26htPBxgIDh8qXQaTkbldLyX_don-BYhs7U3TPv9u2FYE6ACLjvo9iUnMj_8MSD4&sp=wvO7WSz-cc9cIMKfTKLEV4Wxq2bmfn3b7m1-eCXRY1g',
                w: 300,
                h: 250,
              },
            ],
          },
        ],
        cur: 'USD',
      },
    };

    const bids = spec.interpretResponse(serverResponse);

    expect(bids).to.have.lengthOf(1);

    const bid = bids[0];
    expect(bid.creativeId).to.equal('1366258');
    expect(bid.width).to.equal(300);
    expect(bid.height).to.equal(250);
    expect(bid.currency).to.equal('USD');
  });

  describe('discovery: getUserSyncs', function() {
    const COOKY_SYNC_IFRAME_URL = 'https://asset.popin.cc/js/cookieSync.html';
    const IFRAME_ENABLED = {
      iframeEnabled: true,
      pixelEnabled: false,
    };
    const IFRAME_DISABLED = {
      iframeEnabled: false,
      pixelEnabled: false,
    };
    const GDPR_CONSENT = {
      consentString: 'gdprConsentString',
      gdprApplies: true
    };
    const USP_CONSENT = {
      consentString: 'uspConsentString'
    }

    let syncParamUrl = `dm=${encodeURIComponent(location.origin || `https://${location.host}`)}`;
    syncParamUrl += '&gdpr=1&gdpr_consent=gdprConsentString&ccpa_consent=uspConsentString';
    const expectedIframeSyncs = [
      {
        type: 'iframe',
        url: `${COOKY_SYNC_IFRAME_URL}?${syncParamUrl}`
      }
    ];

    it('should return nothing if iframe is disabled', () => {
      const userSyncs = spec.getUserSyncs(IFRAME_DISABLED, undefined, GDPR_CONSENT, USP_CONSENT, undefined);
      expect(userSyncs).to.be.undefined;
    });

    it('should do userSyncs if iframe is enabled', () => {
      const userSyncs = spec.getUserSyncs(IFRAME_ENABLED, undefined, GDPR_CONSENT, USP_CONSENT, undefined);
      expect(userSyncs).to.deep.equal(expectedIframeSyncs);
    });
  });
});

describe('discovery Bid Adapter Tests', function () {
  describe('buildRequests', () => {
    describe('getPageTitle function', function() {
      let sandbox;

      beforeEach(() => {
        sandbox = sinon.createSandbox();
      });

      afterEach(() => {
        sandbox.restore();
      });

      it('should return the top document title if available', function() {
        const fakeTopDocument = {
          title: 'Top Document Title',
          querySelector: () => ({ content: 'Top Document Title test' })
        };
        const fakeTopWindow = {
          document: fakeTopDocument
        };
        const result = getPageTitle({ top: fakeTopWindow });
        expect(result).to.equal('Top Document Title');
      });

      it('should return the content of top og:title meta tag if title is empty', function() {
        const ogTitleContent = 'Top OG Title Content';
        const fakeTopWindow = {
          document: {
            title: '',
            querySelector: sandbox.stub().withArgs('meta[property="og:title"]').returns({ content: ogTitleContent })
          }
        };

        const result = getPageTitle({ top: fakeTopWindow });
        expect(result).to.equal(ogTitleContent);
      });

      it('should return the document title if no og:title meta tag is present', function() {
        document.title = 'Test Page Title';
        sandbox.stub(document, 'querySelector').withArgs('meta[property="og:title"]').returns(null);

        const result = getPageTitle({ top: undefined });
        expect(result).to.equal('Test Page Title');
      });

      it('should return the content of og:title meta tag if present', function() {
        document.title = '';
        const ogTitleContent = 'Top OG Title Content';
        sandbox.stub(document, 'querySelector').withArgs('meta[property="og:title"]').returns({ content: ogTitleContent });
        const result = getPageTitle({ top: undefined });
        expect(result).to.equal(ogTitleContent);
      });

      it('should return an empty string if no title or og:title meta tag is found', function() {
        document.title = '';
        sandbox.stub(document, 'querySelector').withArgs('meta[property="og:title"]').returns(null);
        const result = getPageTitle({ top: undefined });
        expect(result).to.equal('');
      });

      it('should handle exceptions when accessing top.document and fallback to current document', function() {
        const fakeWindow = {
          get top() {
            throw new Error('Access denied');
          }
        };
        const ogTitleContent = 'Current OG Title Content';
        document.title = 'Current Document Title';
        sandbox.stub(document, 'querySelector').withArgs('meta[property="og:title"]').returns({ content: ogTitleContent });
        const result = getPageTitle(fakeWindow);
        expect(result).to.equal('Current Document Title');
      });
    });

    describe('getPageDescription function', function() {
      let sandbox;

      beforeEach(() => {
        sandbox = sinon.createSandbox();
      });

      afterEach(() => {
        sandbox.restore();
      });

      it('should return the top document description if available', function() {
        const descriptionContent = 'Top Document Description';
        const fakeTopDocument = {
          querySelector: sandbox.stub().withArgs('meta[name="description"]').returns({ content: descriptionContent })
        };
        const fakeTopWindow = { document: fakeTopDocument };
        const result = getPageDescription({ top: fakeTopWindow });
        expect(result).to.equal(descriptionContent);
      });

      it('should return the top document og:description if description is not present', function() {
        const ogDescriptionContent = 'Top OG Description';
        const fakeTopDocument = {
          querySelector: sandbox.stub().withArgs('meta[property="og:description"]').returns({ content: ogDescriptionContent })
        };
        const fakeTopWindow = { document: fakeTopDocument };
        const result = getPageDescription({ top: fakeTopWindow });
        expect(result).to.equal(ogDescriptionContent);
      });

      it('should return the current document description if top document is not accessible', function() {
        const descriptionContent = 'Current Document Description';
        sandbox.stub(document, 'querySelector')
          .withArgs('meta[name="description"]').returns({ content: descriptionContent })
        const fakeWindow = {
          get top() {
            throw new Error('Access denied');
          }
        };
        const result = getPageDescription(fakeWindow);
        expect(result).to.equal(descriptionContent);
      });

      it('should return the current document og:description if description is not present and top document is not accessible', function() {
        const ogDescriptionContent = 'Current OG Description';
        sandbox.stub(document, 'querySelector')
          .withArgs('meta[property="og:description"]').returns({ content: ogDescriptionContent });

        const fakeWindow = {
          get top() {
            throw new Error('Access denied');
          }
        };
        const result = getPageDescription(fakeWindow);
        expect(result).to.equal(ogDescriptionContent);
      });
    });

    describe('getPageKeywords function', function() {
      let sandbox;

      beforeEach(() => {
        sandbox = sinon.createSandbox();
      });

      afterEach(() => {
        sandbox.restore();
      });

      it('should return the top document keywords if available', function() {
        const keywordsContent = 'keyword1, keyword2, keyword3';
        const fakeTopDocument = {
          querySelector: sandbox.stub()
            .withArgs('meta[name="keywords"]').returns({ content: keywordsContent })
        };
        const fakeTopWindow = { document: fakeTopDocument };

        const result = getPageKeywords({ top: fakeTopWindow });
        expect(result).to.equal(keywordsContent);
      });

      it('should return the current document keywords if top document is not accessible', function() {
        const keywordsContent = 'keyword1, keyword2, keyword3';
        sandbox.stub(document, 'querySelector')
          .withArgs('meta[name="keywords"]').returns({ content: keywordsContent });

        // 模拟顶层窗口访问异常
        const fakeWindow = {
          get top() {
            throw new Error('Access denied');
          }
        };

        const result = getPageKeywords(fakeWindow);
        expect(result).to.equal(keywordsContent);
      });

      it('should return an empty string if no keywords meta tag is found', function() {
        sandbox.stub(document, 'querySelector').withArgs('meta[name="keywords"]').returns(null);

        const result = getPageKeywords();
        expect(result).to.equal('');
      });
    });
    describe('getConnectionDownLink function', function() {
      let sandbox;

      beforeEach(() => {
        sandbox = sinon.createSandbox();
      });

      afterEach(() => {
        sandbox.restore();
      });

      it('should return the downlink value as a string if available', function() {
        const downlinkValue = 2.5;
        const fakeNavigator = {
          connection: {
            downlink: downlinkValue
          }
        };

        const result = getConnectionDownLink({ navigator: fakeNavigator });
        expect(result).to.equal(downlinkValue.toString());
      });

      it('should return undefined if downlink is not available', function() {
        const fakeNavigator = {
          connection: {}
        };

        const result = getConnectionDownLink({ navigator: fakeNavigator });
        expect(result).to.be.undefined;
      });

      it('should return undefined if connection is not available', function() {
        const fakeNavigator = {};

        const result = getConnectionDownLink({ navigator: fakeNavigator });
        expect(result).to.be.undefined;
      });

      it('should handle cases where navigator is not defined', function() {
        const result = getConnectionDownLink({});
        expect(result).to.be.undefined;
      });
    });

    describe('getUserSyncs with message event listener', function() {
      function messageHandler(event) {
        if (!event.data || event.origin !== THIRD_PARTY_COOKIE_ORIGIN) {
          return;
        }

        window.removeEventListener('message', messageHandler, true);
        event.stopImmediatePropagation();

        const response = event.data;
        if (!response.optout && response.mguid) {
          storage.setCookie(COOKIE_KEY_MGUID, response.mguid, getCookieTimeToUTCString());
        }
      }

      let sandbox;

      beforeEach(() => {
        sandbox = sinon.createSandbox();
        sandbox.stub(storage, 'setCookie');
        sandbox.stub(window, 'removeEventListener');
      });

      afterEach(() => {
        sandbox.restore();
      });

      it('should set a cookie when a valid message is received', () => {
        const fakeEvent = {
          data: { optout: '', mguid: '12345' },
          origin: THIRD_PARTY_COOKIE_ORIGIN,
          stopImmediatePropagation: sinon.spy()
        };

        messageHandler(fakeEvent);

        expect(fakeEvent.stopImmediatePropagation.calledOnce).to.be.true;
        expect(window.removeEventListener.calledWith('message', messageHandler, true)).to.be.true;
        expect(storage.setCookie.calledWith(COOKIE_KEY_MGUID, '12345', sinon.match.string)).to.be.true;
      });
      it('should not do anything when an invalid message is received', () => {
        const fakeEvent = {
          data: null,
          origin: 'http://invalid-origin.com',
          stopImmediatePropagation: sinon.spy()
        };

        messageHandler(fakeEvent);

        expect(fakeEvent.stopImmediatePropagation.notCalled).to.be.true;
        expect(window.removeEventListener.notCalled).to.be.true;
        expect(storage.setCookie.notCalled).to.be.true;
      });
    });
    describe('getHLen', () => {
      it('should return the correct length of history when accessible', () => {
        const mockWindow = {
          top: {
            history: {
              length: 3
            }
          }
        };
        const result = getHLen(mockWindow);
        expect(result).to.equal(3);
      });

      it('should return undefined when accessing win.top.history.length throws an error', () => {
        const mockWindow = {
          get top() {
            throw new Error('Access denied');
          }
        };
        const result = getHLen(mockWindow);
        expect(result).be.undefined;
      });
    });
  });
});
