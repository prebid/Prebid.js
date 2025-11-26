import {expect} from 'chai';
import {spec, storage} from 'modules/criteoBidAdapter.js';
import * as utils from 'src/utils.js';
import * as refererDetection from 'src/refererDetection.js';
import * as ajax from 'src/ajax.js';
import {config} from '../../../src/config.js';
import {BANNER, NATIVE, VIDEO} from '../../../src/mediaTypes.js';
import {addFPDToBidderRequest} from '../../helpers/fpd.js';
import 'modules/userId/index.js';
import 'modules/consentManagementTcf.js';
import 'modules/consentManagementUsp.js';
import 'modules/consentManagementGpp.js';

import {hook} from '../../../src/hook.js';
import {getGlobal} from '../../../src/prebidGlobal.js';

describe('The Criteo bidding adapter', function () {
  let sandbox, ajaxStub, logWarnStub;

  beforeEach(function () {
    getGlobal().bidderSettings = {
      criteo: {
        storageAllowed: true
      }
    };
    // Remove FastBid to avoid side effects
    localStorage.removeItem('criteo_fast_bid');
    sandbox = sinon.createSandbox();
    logWarnStub = sandbox.stub(utils, 'logWarn');
    ajaxStub = sandbox.stub(ajax, 'ajax');
  });

  afterEach(function () {
    getGlobal().bidderSettings = {};
    global.Criteo = undefined;
    try {
      sandbox?.restore();
    } catch (e) {
      // sinon sandbox restore may fail if a stubbed object went undefined
      // catch and ignore to avoid breaking unrelated tests
      // finding the bad stub is proving to be extremely difficult
      /* eslint-disable no-console */
      console.error('sandbox restore error:', e);
      /* eslint-enable no-console */
    }
  });

  describe('getUserSyncs in pixel mode', function () {
    const syncOptions = {
      pixelEnabled: true
    };

    it('should not trigger sync if publisher did not enable pixel based syncs', function () {
      const userSyncs = spec.getUserSyncs({
        iframeEnabled: false
      }, undefined, undefined, undefined);

      expect(userSyncs).to.eql([]);
    });

    it('should not trigger sync if purpose one is not granted', function () {
      const gdprConsent = {
        gdprApplies: true,
        consentString: 'ABC',
        vendorData: {
          purpose: {
            consents: {
              1: false
            }
          }
        }
      };
      const userSyncs = spec.getUserSyncs(syncOptions, undefined, gdprConsent, undefined);

      expect(userSyncs).to.eql([]);
    });

    it('should trigger sync with consent data', function () {
      const usPrivacy = 'usp_string';

      const gppConsent = {
        gppString: 'gpp_string',
        applicableSections: [ 1, 2 ]
      };

      const gdprConsent = {
        gdprApplies: true,
        consentString: 'ABC',
        vendorData: {
          purpose: {
            consents: {
              1: true
            }
          }
        }
      };

      const userSyncs = spec.getUserSyncs(syncOptions, undefined, gdprConsent, usPrivacy, gppConsent);

      expect(userSyncs).to.eql([{
        type: 'image',
        url: 'https://ssp-sync.criteo.com/user-sync/redirect?profile=207&gdprapplies=true&gdpr=ABC&ccpa=usp_string&gpp=gpp_string&gpp_sid=1&gpp_sid=2'
      }]);
    });
  });

  describe('getUserSyncs in iframe mode', function () {
    const syncOptionsIframeEnabled = {
      iframeEnabled: true
    };

    const expectedHash = {
      cw: true,
      lsw: true,
      origin: 'criteoPrebidAdapter',
      requestId: '123456',
      tld: 'www.abc.com',
      topUrl: 'www.abc.com',
      version: '$prebid.version$'.replace(/\./g, '_'),
    };

    let sandbox,
      randomStub,
      getConfigStub,
      getRefererInfoStub,
      cookiesAreEnabledStub,
      localStorageIsEnabledStub,
      getCookieStub,
      setCookieStub,
      getDataFromLocalStorageStub,
      setDataInLocalStorageStub,
      removeDataFromLocalStorageStub,
      triggerPixelStub;

    beforeEach(function () {
      sandbox = sinon.createSandbox();
      getConfigStub = sandbox.stub(config, 'getConfig');
      getConfigStub.withArgs('criteo.fastBidVersion').returns('none');

      randomStub = sandbox.stub(Math, 'random');
      randomStub.returns(123456);

      getRefererInfoStub = sandbox.stub(refererDetection, 'getRefererInfo');
      getRefererInfoStub.returns({
        domain: 'www.abc.com'
      });

      cookiesAreEnabledStub = sandbox.stub(storage, 'cookiesAreEnabled');
      cookiesAreEnabledStub.returns(true);
      localStorageIsEnabledStub = sandbox.stub(storage, 'localStorageIsEnabled');
      localStorageIsEnabledStub.returns(true);

      getCookieStub = sandbox.stub(storage, 'getCookie');
      setCookieStub = sandbox.stub(storage, 'setCookie');
      getDataFromLocalStorageStub = sandbox.stub(storage, 'getDataFromLocalStorage');
      setDataInLocalStorageStub = sandbox.stub(storage, 'setDataInLocalStorage');
      removeDataFromLocalStorageStub = sandbox.stub(storage, 'removeDataFromLocalStorage');

      triggerPixelStub = sandbox.stub(utils, 'triggerPixel');
    });

    afterEach(function () {
      sandbox?.restore();
    });

    it('should not trigger sync if publisher did not enable iframe based syncs', function () {
      const userSyncs = spec.getUserSyncs({
        iframeEnabled: false
      }, undefined, undefined, undefined);

      expect(userSyncs).to.eql([]);
    });

    it('should not trigger sync if purpose one is not granted', function () {
      const gdprConsent = {
        gdprApplies: true,
        consentString: 'ABC',
        vendorData: {
          purpose: {
            consents: {
              1: false
            }
          }
        }
      };
      const userSyncs = spec.getUserSyncs(syncOptionsIframeEnabled, undefined, gdprConsent, undefined);

      expect(userSyncs).to.eql([]);
    });

    it('forwards ids from cookies', function () {
      const cookieData = {
        'cto_bundle': 'a',
        'cto_optout': 'b'
      };

      const expectedHashWithCookieData = {
        ...expectedHash,
        ...{
          bundle: cookieData['cto_bundle'],
          optoutCookie: cookieData['cto_optout']
        }
      };

      getCookieStub.callsFake(cookieName => cookieData[cookieName]);

      const userSyncs = spec.getUserSyncs(syncOptionsIframeEnabled, undefined, undefined, undefined);

      expect(userSyncs).to.eql([{
        type: 'iframe',
        url: `https://gum.criteo.com/syncframe?origin=criteoPrebidAdapter&topUrl=www.abc.com&gpp=#${JSON.stringify(expectedHashWithCookieData, Object.keys(expectedHashWithCookieData).sort()).replace(/"/g, '%22')}`
      }]);
    });

    it('forwards ids from local storage', function () {
      const localStorageData = {
        'cto_bundle': 'a',
        'cto_optout': 'b'
      };

      const expectedHashWithLocalStorageData = {
        ...expectedHash,
        ...{
          bundle: localStorageData['cto_bundle'],
          optoutCookie: localStorageData['cto_optout']
        }
      };

      getDataFromLocalStorageStub.callsFake(localStorageName => localStorageData[localStorageName]);

      const userSyncs = spec.getUserSyncs(syncOptionsIframeEnabled, undefined, undefined, undefined);

      expect(userSyncs).to.eql([{
        type: 'iframe',
        url: `https://gum.criteo.com/syncframe?origin=criteoPrebidAdapter&topUrl=www.abc.com&gpp=#${JSON.stringify(expectedHashWithLocalStorageData, Object.keys(expectedHashWithLocalStorageData).sort()).replace(/"/g, '%22')}`
      }]);
    });

    it('forwards gdpr data', function () {
      const gdprConsent = {
        gdprApplies: true,
        consentString: 'ABC',
        vendorData: {
          purpose: {
            consents: {
              1: true
            }
          }
        }
      };
      const userSyncs = spec.getUserSyncs(syncOptionsIframeEnabled, undefined, gdprConsent, undefined);

      expect(userSyncs).to.eql([{
        type: 'iframe',
        url: `https://gum.criteo.com/syncframe?origin=criteoPrebidAdapter&topUrl=www.abc.com&gdpr=1&gdpr_consent=ABC&gpp=#${JSON.stringify(expectedHash).replace(/"/g, '%22')}`
      }]);
    });

    it('forwards usp data', function () {
      const userSyncs = spec.getUserSyncs(syncOptionsIframeEnabled, undefined, undefined, 'ABC');

      expect(userSyncs).to.eql([{
        type: 'iframe',
        url: `https://gum.criteo.com/syncframe?origin=criteoPrebidAdapter&topUrl=www.abc.com&us_privacy=ABC&gpp=#${JSON.stringify(expectedHash).replace(/"/g, '%22')}`
      }]);
    });

    it('should delete user data when calling onDataDeletionRequest', () => {
      const cookieData = {
        'cto_bundle': 'a'
      };
      const lsData = {
        'cto_bundle': 'a'
      }
      getCookieStub.callsFake(cookieName => cookieData[cookieName]);
      setCookieStub.callsFake((cookieName, value, expires) => cookieData[cookieName] = value);
      getDataFromLocalStorageStub.callsFake(name => lsData[name]);
      removeDataFromLocalStorageStub.callsFake(name => lsData[name] = '');
      spec.onDataDeletionRequest([]);
      expect(getCookieStub.calledOnce).to.equal(true);
      expect(setCookieStub.calledOnce).to.equal(true);
      expect(getDataFromLocalStorageStub.calledOnce).to.equal(true);
      expect(removeDataFromLocalStorageStub.calledOnce).to.equal(true);
      expect(cookieData.cto_bundle).to.equal('');
      expect(lsData.cto_bundle).to.equal('');
      expect(ajaxStub.calledOnce).to.equal(true);
    });

    it('should not call API when calling onDataDeletionRequest with no id', () => {
      const cookieData = {
        'cto_bundle': ''
      };
      const lsData = {
        'cto_bundle': ''
      }
      getCookieStub.callsFake(cookieName => cookieData[cookieName]);
      setCookieStub.callsFake((cookieName, value, expires) => cookieData[cookieName] = value);
      getDataFromLocalStorageStub.callsFake(name => lsData[name]);
      removeDataFromLocalStorageStub.callsFake(name => lsData[name] = '');
      spec.onDataDeletionRequest([]);
      expect(getCookieStub.calledOnce).to.be.true;
      expect(setCookieStub.called).to.be.false;
      expect(getDataFromLocalStorageStub.calledOnce).to.be.true
      expect(removeDataFromLocalStorageStub.called).to.be.false;
      expect(ajaxStub.called).to.be.false;
    });

    it('should trigger sync pixel from iframe response', function (done) {
      const userSyncs = spec.getUserSyncs(syncOptionsIframeEnabled, undefined, undefined, undefined);

      const event = new MessageEvent('message', {
        data: {
          requestId: '123456',
          callbacks: [
            'https://example.com/pixel1',
            'https://example.com/pixel2'
          ]
        },
        origin: 'https://gum.criteo.com'
      });

      window.dispatchEvent(event);
      setTimeout(() => {
        expect(triggerPixelStub.calledTwice).to.be.true;
        expect(triggerPixelStub.firstCall.calledWith('https://example.com/pixel1')).to.be.true;
        expect(triggerPixelStub.secondCall.calledWith('https://example.com/pixel2')).to.be.true;

        done();
      }, 0);
    });

    it('should write cookie only on TLD+1 level', function(done) {
      const cookies = {};

      const userSyncs = spec.getUserSyncs(syncOptionsIframeEnabled, undefined, undefined, undefined);

      setCookieStub.callsFake((name, value, expires, _, domain) => {
        if (domain !== '.com') {
          cookies[name] = value;
        }
      });

      getCookieStub.callsFake((name) => cookies[name]);

      const event = new MessageEvent('message', {
        data: {
          requestId: '123456',
          bundle: 'bundle'
        },
        origin: 'https://gum.criteo.com'
      });

      window.dispatchEvent(event);
      setTimeout(() => {
        expect(setCookieStub.calledWith('cto_bundle', 'bundle', sinon.match.string, null, '.com')).to.be.true;
        expect(setCookieStub.calledWith('cto_bundle', 'bundle', sinon.match.string, null, '.abc.com')).to.be.true;
        expect(setCookieStub.calledWith('cto_bundle', 'bundle', sinon.match.string, null, '.www.abc.com')).to.be.false;
        expect(cookies).to.deep.equal({ 'cto_bundle': 'bundle' });

        done();
      }, 0);
    });
  });

  describe('isBidRequestValid', function () {
    it('should return false when given an invalid bid', function () {
      const bid = {
        bidder: 'criteo',
      };
      const isValid = spec.isBidRequestValid(bid);
      expect(isValid).to.equal(false);
    });

    it('should return true when given a zoneId bid', function () {
      const bid = {
        bidder: 'criteo',
        params: {
          zoneId: 123,
        },
      };
      const isValid = spec.isBidRequestValid(bid);
      expect(isValid).to.equal(true);
    });

    it('should return true when given a networkId bid', function () {
      const bid = {
        bidder: 'criteo',
        params: {
          networkId: 456,
        },
      };
      const isValid = spec.isBidRequestValid(bid);
      expect(isValid).to.equal(true);
    });

    it('should return true when given a mixed bid with both a zoneId and a networkId', function () {
      const bid = {
        bidder: 'criteo',
        params: {
          zoneId: 123,
          networkId: 456,
        },
      };
      const isValid = spec.isBidRequestValid(bid);
      expect(isValid).to.equal(true);
    });

    it('should return true when given a valid video bid request using mix custom bidder video parameters', function () {
      expect(spec.isBidRequestValid({
        bidder: 'criteo',
        mediaTypes: {
          video: {
            context: 'instream',
            mimes: ['video/mpeg'],
            playerSize: [640, 480],
            protocols: [5, 6],
            maxduration: 30,
            api: [1, 2]
          }
        },
        params: {
          networkId: 456,
          video: {
            skip: 1,
            placement: 1,
            playbackmethod: 1
          }
        },
      })).to.equal(true);

      expect(spec.isBidRequestValid({
        bidder: 'criteo',
        mediaTypes: {
          video: {
            context: 'outstream',
            mimes: ['video/mpeg'],
            playerSize: [640, 480],
            protocols: [5, 6],
            maxduration: 30,
            api: [1, 2]
          }
        },
        params: {
          networkId: 456,
          video: {
            skip: 1,
            placement: 2,
            playbackmethod: 1
          }
        },
      })).to.equal(true);
    });

    it('should return true when given a valid video bid request using only mediaTypes.video parameters', function () {
      expect(spec.isBidRequestValid({
        bidder: 'criteo',
        mediaTypes: {
          video: {
            context: 'instream',
            mimes: ['video/mpeg'],
            playerSize: [640, 480],
            protocols: [5, 6],
            maxduration: 30,
            api: [1, 2],
            skip: 1,
            placement: 1,
            minduration: 0,
            playbackmethod: 1,
            startdelay: 0,
            plcmt: 1
          }
        },
        params: {
          networkId: 456
        },
      })).to.equal(true);
    });

    it('should return false when given an invalid video bid request', function () {
      expect(spec.isBidRequestValid({
        bidder: 'criteo',
        mediaTypes: {
          video: {
            context: 'instream',
            playerSize: [640, 480],
            protocols: [5, 6],
            maxduration: 30,
            api: [1, 2]
          }
        },
        params: {
          networkId: 456,
          video: {
            skip: 1,
            placement: 1,
            playbackmethod: 1
          }
        },
      })).to.equal(false);

      expect(spec.isBidRequestValid({
        bidder: 'criteo',
        mediaTypes: {
          video: {
            context: 'instream',
            mimes: ['video/mpeg'],
            protocols: [5, 6],
            maxduration: 30,
            api: [1, 2]
          }
        },
        params: {
          networkId: 456,
          video: {
            skip: 1,
            placement: 1,
            playbackmethod: 1
          }
        },
      })).to.equal(false);

      expect(spec.isBidRequestValid({
        bidder: 'criteo',
        mediaTypes: {
          video: {
            context: 'instream',
            mimes: ['video/mpeg'],
            playerSize: [640, 480],
            maxduration: 30,
            api: [1, 2]
          }
        },
        params: {
          networkId: 456,
          video: {
            skip: 1,
            placement: 1,
            playbackmethod: 1
          }
        },
      })).to.equal(false);

      expect(spec.isBidRequestValid({
        bidder: 'criteo',
        mediaTypes: {
          video: {
            context: 'instream',
            mimes: ['video/mpeg'],
            playerSize: [640, 480],
            protocols: [5, 6],
            api: [1, 2]
          }
        },
        params: {
          networkId: 456,
          video: {
            skip: 1,
            placement: 1,
            playbackmethod: 1
          }
        },
      })).to.equal(false);

      expect(spec.isBidRequestValid({
        bidder: 'criteo',
        mediaTypes: {
          video: {
            context: 'instream',
            mimes: ['video/mpeg'],
            playerSize: [640, 480],
            protocols: [5, 6],
            maxduration: 30
          }
        },
        params: {
          networkId: 456,
          video: {
            skip: 1,
            placement: 1,
            playbackmethod: 1
          }
        },
      })).to.equal(false);

      expect(spec.isBidRequestValid({
        bidder: 'criteo',
        mediaTypes: {
          video: {
            context: 'instream',
            mimes: ['video/mpeg'],
            playerSize: [640, 480],
            protocols: [5, 6],
            maxduration: 30,
            api: [1, 2]
          }
        },
        params: {
          networkId: 456,
          video: {
            placement: 1,
            playbackmethod: 1
          }
        },
      })).to.equal(false);

      expect(spec.isBidRequestValid({
        bidder: 'criteo',
        mediaTypes: {
          video: {
            context: 'instream',
            mimes: ['video/mpeg'],
            playerSize: [640, 480],
            protocols: [5, 6],
            maxduration: 30,
            api: [1, 2]
          }
        },
        params: {
          networkId: 456,
          video: {
            skip: 1,
            playbackmethod: 1
          }
        },
      })).to.equal(false);

      expect(spec.isBidRequestValid({
        bidder: 'criteo',
        mediaTypes: {
          video: {
            context: 'instream',
            mimes: ['video/mpeg'],
            playerSize: [640, 480],
            protocols: [5, 6],
            maxduration: 30,
            api: [1, 2]
          }
        },
        params: {
          networkId: 456,
          video: {
            skip: 1,
            placement: 1
          }
        },
      })).to.equal(false);
    });
  });

  describe('buildRequests', function () {
    const refererUrl = 'https://criteo.com?pbt_debug=1&pbt_nolog=1';
    const bidderRequest = {
      refererInfo: {
        page: refererUrl,
        topmostLocation: refererUrl
      },
      timeout: 3000,
      gdprConsent: {
        gdprApplies: true,
        consentString: 'consentDataString',
        vendorData: {
          vendorConsents: {
            '91': 1
          },
        },
        apiVersion: 1,
      },
    };
    const defaultBidRequests = [{
      bidder: 'criteo',
      adUnitCode: 'bid-123',
      mediaTypes: {
        banner: { sizes: [[728, 90]] }
      },
      params: {}
    }]

    let sandbox, localStorageIsEnabledStub, bidderConfigStub;

    before(() => {
      hook.ready();
    });

    this.beforeEach(function () {
      sandbox = sinon.createSandbox();
      localStorageIsEnabledStub = sandbox.stub(storage, 'localStorageIsEnabled');
      bidderConfigStub = sandbox.stub(config, "getBidderConfig")
      localStorageIsEnabledStub.returns(true);
    });

    afterEach(function () {
      sandbox?.restore();
      config.resetConfig();
    });

    it('should properly build a request using random uuid as auction id', async function () {
    // Re‐use the sandbox from beforeEach instead of creating a new one
      const generateUUIDStub = sandbox.stub(utils, 'generateUUID');
      generateUUIDStub.returns('def');

      const minimalBidderRequest = {};
      const bidRequests = [{
        bidder: 'criteo',
        adUnitCode: 'bid-123',
        mediaTypes: {
          banner: { sizes: [[728, 90]] }
        },
        params: {}
      }];

      const request = spec.buildRequests(bidRequests, await addFPDToBidderRequest(minimalBidderRequest));
      const ortbRequest = request.data;
      expect(ortbRequest.id).to.equal('def');
    });

    it('should properly transmit source.tid if available', async function () {
      const bidderRequest = {
        ortb2: {
          source: {
            tid: 'abc'
          }
        }
      };
      const bidRequests = [
        {
          bidder: 'criteo',
          adUnitCode: 'bid-123',
          mediaTypes: {
            banner: {
              sizes: [[728, 90]]
            }
          },
          params: {}
        },
      ];
      const request = spec.buildRequests(bidRequests, await addFPDToBidderRequest(bidderRequest));
      const ortbRequest = request.data;
      expect(ortbRequest.source.tid).to.equal('abc');
    });

    it('should properly transmit tmax if available', async function () {
      const bidRequests = [
        {
          bidder: 'criteo',
          adUnitCode: 'bid-123',
          transactionId: 'transaction-123',
          mediaTypes: {
            banner: {
              sizes: [[728, 90]]
            }
          },
          params: {}
        },
      ];
      const request = spec.buildRequests(bidRequests, await addFPDToBidderRequest(bidderRequest));
      const ortbRequest = request.data;
      expect(ortbRequest.tmax).to.equal(bidderRequest.timeout);
    });

    it('should properly transmit bidId if available', async function () {
      const bidderRequest = {};
      const bidRequests = [
        {
          bidId: 'bidId',
          bidder: 'criteo',
          adUnitCode: 'bid-123',
          mediaTypes: {
            banner: {
              sizes: [[728, 90]]
            }
          },
          params: {}
        },
      ];
      const request = spec.buildRequests(bidRequests, await addFPDToBidderRequest(bidderRequest));
      const ortbRequest = request.data;
      expect(ortbRequest.imp[0].id).to.equal('bidId');
    });

    it('should properly build a zoneId request', async function () {
      const bidRequests = [
        {
          bidder: 'criteo',
          adUnitCode: 'bid-123',
          ortb2Imp: {
            ext: {
              tid: 'transaction-123',
            },
          },
          mediaTypes: {
            banner: {
              sizes: [[728, 90]]
            }
          },
          params: {
            zoneId: 123,
            publisherSubId: '123',
            integrationMode: 'amp'
          },
        },
      ];
      const request = spec.buildRequests(bidRequests, await addFPDToBidderRequest(bidderRequest));
      expect(request.url).to.match(/^https:\/\/grid-bidder\.criteo\.com\/openrtb_2_5\/pbjs\/auction\/request\?profileId=207&av=\d+&wv=[^&]+&cb=\d+&lsavail=[01]&im=1&debug=[01]&nolog=[01]$/);
      expect(request.method).to.equal('POST');
      const ortbRequest = request.data;
      expect(ortbRequest.site.page).to.equal(refererUrl);
      expect(ortbRequest.imp).to.have.lengthOf(1);
      expect(ortbRequest.imp[0].tagid).to.equal('bid-123');
      expect(ortbRequest.imp[0].banner.format).to.have.lengthOf(1);
      expect(ortbRequest.imp[0].banner.format[0].w).to.equal(728);
      expect(ortbRequest.imp[0].banner.format[0].h).to.equal(90);
      expect(ortbRequest.imp[0].ext.bidder.zoneid).to.equal(123);
      expect(ortbRequest.user.ext.consent).to.equal('consentDataString');
      expect(ortbRequest.regs.ext.gdpr).to.equal(1);
      expect(ortbRequest.regs.ext.gdprversion).to.equal(1);
    });

    it('should properly forward eids', async function () {
      const bidRequests = [
        {
          bidder: 'criteo',
          adUnitCode: 'bid-123',
          mediaTypes: {
            banner: {
              sizes: [[728, 90]]
            }
          },
          params: {}
        },
      ];
      const br = {
        ...bidderRequest,
        ortb2: {
          user: {
            ext: {
              eids: [
                {
                  source: 'criteo.com',
                  uids: [{
                    id: 'abc',
                    atype: 1
                  }]
                }
              ]
            }
          }
        }
      }
      const request = spec.buildRequests(bidRequests, await addFPDToBidderRequest(br));
      const ortbRequest = request.data;
      expect(ortbRequest.user.ext.eids).to.deep.equal([
        {
          source: 'criteo.com',
          uids: [{
            id: 'abc',
            atype: 1
          }]
        }
      ]);
    });

    if (FEATURES.NATIVE) {
      it('should properly build a native request without assets', async function () {
        const bidRequests = [
          {
            mediaTypes: {
              native: {}
            },
            params: {}
          },
        ];
        const request = spec.buildRequests(bidRequests, await addFPDToBidderRequest(bidderRequest));
        const ortbRequest = request.data;
        expect(ortbRequest.imp[0].native.request_native).to.not.be.null;
        expect(ortbRequest.imp[0].native.request_native.assets).to.be.undefined;
      });
    }

    if (FEATURES.NATIVE) {
      it('should properly build a native request with assets', async function () {
        const assets = [{
          required: 1,
          id: 1,
          img: {
            type: 3,
            wmin: 100,
            hmin: 100,
          }
        },
        {
          required: 1,
          id: 2,
          title: {
            len: 140,
          }
        },
        {
          required: 1,
          id: 3,
          data: {
            type: 1,
          }
        },
        {
          required: 0,
          id: 4,
          data: {
            type: 2,
          }
        },
        {
          required: 0,
          id: 5,
          img: {
            type: 1,
            wmin: 20,
            hmin: 20,
          }
        }];
        const bidRequests = [
          {
            mediaTypes: {
              native: {}
            },
            nativeOrtbRequest: {
              assets: assets
            },
            params: {}
          },
        ];
        const request = spec.buildRequests(bidRequests, await addFPDToBidderRequest(bidderRequest));
        const ortbRequest = request.data;
        expect(ortbRequest.imp[0].native.request_native).to.not.be.null;
        expect(ortbRequest.imp[0].native.request_native.assets).to.deep.equal(assets);
      });
    }

    it('should properly build a networkId request', async function () {
      const bidderRequest = {
        refererInfo: {
          page: refererUrl,
          topmostLocation: refererUrl,
        },
        timeout: 3000,
        gdprConsent: {
          gdprApplies: false,
          consentString: undefined,
          vendorData: {
            vendorConsents: {
              '1': 0
            },
          },
        },
      };
      const bidRequests = [
        {
          bidder: 'criteo',
          adUnitCode: 'bid-123',
          ortb2Imp: {
            ext: {
              tid: 'transaction-123',
            },
          },
          mediaTypes: {
            banner: {
              sizes: [[300, 250], [728, 90]]
            }
          },
          params: {
            networkId: 456,
          },
        },
      ];
      const request = spec.buildRequests(bidRequests, await addFPDToBidderRequest(bidderRequest));
      expect(request.url).to.match(/^https:\/\/grid-bidder\.criteo\.com\/openrtb_2_5\/pbjs\/auction\/request\?profileId=207&av=\d+&wv=[^&]+&cb=\d+&lsavail=[01]&debug=[01]&nolog=[01]&networkId=456$/);
      expect(request.method).to.equal('POST');
      const ortbRequest = request.data;
      expect(ortbRequest.site.page).to.equal(refererUrl);
      expect(ortbRequest.imp).to.have.lengthOf(1);
      expect(ortbRequest.imp[0].tagid).to.equal('bid-123');
      expect(ortbRequest.imp[0].banner.format).to.have.lengthOf(2);
      expect(ortbRequest.imp[0].banner.format[0].w).to.equal(300);
      expect(ortbRequest.imp[0].banner.format[0].h).to.equal(250);
      expect(ortbRequest.imp[0].banner.format[1].w).to.equal(728);
      expect(ortbRequest.imp[0].banner.format[1].h).to.equal(90);
      expect(ortbRequest.user?.ext?.consent).to.equal(undefined);
      expect(ortbRequest.regs.ext.gdpr).to.equal(0);
    });

    it('should properly build a mixed request with both a zoneId and a networkId', async function () {
      const bidderRequest = {
        refererInfo: {
          page: refererUrl,
          topmostLocation: refererUrl,
        },
        timeout: 3000
      };
      const bidRequests = [
        {
          bidder: 'criteo',
          adUnitCode: 'bid-123',
          ortb2Imp: {
            ext: {
              tid: 'transaction-123',
            },
          },
          mediaTypes: {
            banner: {
              sizes: [[728, 90]]
            }
          },
          params: {
            zoneId: 123,
          },
        },
        {
          bidder: 'criteo',
          adUnitCode: 'bid-234',
          ortb2Imp: {
            ext: {
              tid: 'transaction-234',
            },
          },
          mediaTypes: {
            banner: {
              sizes: [[300, 250], [728, 90]]
            }
          },
          params: {
            networkId: 456,
          },
        },
      ];
      const request = spec.buildRequests(bidRequests, await addFPDToBidderRequest(bidderRequest));
      expect(request.url).to.match(/^https:\/\/grid-bidder\.criteo\.com\/openrtb_2_5\/pbjs\/auction\/request\?profileId=207&av=\d+&wv=[^&]+&cb=\d+&lsavail=[01]&debug=[01]&nolog=[01]&networkId=456$/);
      expect(request.method).to.equal('POST');
      const ortbRequest = request.data;
      expect(ortbRequest.site.page).to.equal(refererUrl);
      expect(ortbRequest.imp).to.have.lengthOf(2);
      expect(ortbRequest.imp[0].tagid).to.equal('bid-123');
      expect(ortbRequest.imp[0].banner.format).to.have.lengthOf(1);
      expect(ortbRequest.imp[0].banner.format[0].w).to.equal(728);
      expect(ortbRequest.imp[0].banner.format[0].h).to.equal(90);
      expect(ortbRequest.imp[0].ext.tid).to.equal('transaction-123');
      expect(ortbRequest.imp[0].ext.bidder.zoneid).to.equal(123);
      expect(ortbRequest.imp[1].tagid).to.equal('bid-234');
      expect(ortbRequest.imp[1].banner.format).to.have.lengthOf(2);
      expect(ortbRequest.imp[1].banner.format[0].w).to.equal(300);
      expect(ortbRequest.imp[1].banner.format[0].h).to.equal(250);
      expect(ortbRequest.imp[1].banner.format[1].w).to.equal(728);
      expect(ortbRequest.imp[1].banner.format[1].h).to.equal(90);
      expect(ortbRequest.imp[1].ext.tid).to.equal('transaction-234');
      expect(ortbRequest.user?.ext?.consent).to.equal(undefined);
    });

    it('should properly build a request with undefined gdpr consent fields when they are not provided', async function () {
      const bidRequests = [
        {
          bidder: 'criteo',
          adUnitCode: 'bid-123',
          mediaTypes: {
            banner: {
              sizes: [[728, 90]]
            }
          },
          params: {
            zoneId: 123,
          },
        },
      ];
      const bidderRequest = {
        timeout: 3000,
        gdprConsent: {},
      };

      const ortbRequest = spec.buildRequests(bidRequests, await addFPDToBidderRequest(bidderRequest)).data;
      expect(ortbRequest.user?.ext?.consent).to.equal(undefined);
      expect(ortbRequest.regs?.ext?.gdpr).to.equal(undefined);
    });

    it('should properly build a request with ccpa consent field', async function () {
      const bidRequests = [
        {
          bidder: 'criteo',
          adUnitCode: 'bid-123',
          mediaTypes: {
            banner: {
              sizes: [[728, 90]]
            }
          },
          params: {
            zoneId: 123,
          },
        },
      ];
      const bidderRequest = {
        timeout: 3000,
        uspConsent: '1YNY',
      };

      const ortbRequest = spec.buildRequests(bidRequests, await addFPDToBidderRequest(bidderRequest)).data;
      expect(ortbRequest.regs.ext.us_privacy).to.equal('1YNY');
    });

    it('should properly build a request with overridden tmax', async function () {
      const bidRequests = [
        {
          bidder: 'criteo',
          adUnitCode: 'bid-123',
          mediaTypes: {
            banner: {
              sizes: [[728, 90]]
            }
          },
          params: {
            zoneId: 123,
          },
        },
      ];
      const bidderRequest = {
        timeout: 1234
      };

      const ortbRequest = spec.buildRequests(bidRequests, await addFPDToBidderRequest(bidderRequest)).data;
      expect(ortbRequest.tmax).to.equal(1234);
    });

    it('should properly build a request with device sua field', async function () {
      const sua = {
        platform: {
          brand: 'abc'
        }
      }
      const bidRequests = [
        {
          bidder: 'criteo',
          adUnitCode: 'bid-123',
          mediaTypes: {
            banner: {
              sizes: [[728, 90]]
            }
          },
          params: {
            zoneId: 123,
          },
        },
      ];
      const bidderRequest = {
        timeout: 3000,
        uspConsent: '1YNY',
        ortb2: {
          device: {
            sua: sua
          }
        }
      };

      const ortbRequest = spec.buildRequests(bidRequests, await addFPDToBidderRequest(bidderRequest)).data;
      expect(ortbRequest.device.ext.sua).not.to.be.null;
      expect(ortbRequest.device.ext.sua.platform.brand).to.equal('abc');
    });

    it('should properly build a request with gpp consent field', async function () {
      const bidRequests = [
        {
          bidder: 'criteo',
          adUnitCode: 'bid-123',
          mediaTypes: {
            banner: {
              sizes: [[728, 90]]
            }
          },
          params: {
            zoneId: 123,
          },
        },
      ];
      const ortb2 = {
        regs: {
          gpp: 'gpp_consent_string',
          gpp_sid: [0, 1, 2],
        }
      };

      const ortbRequest = spec.buildRequests(bidRequests, await addFPDToBidderRequest({...bidderRequest, ortb2})).data;
      expect(ortbRequest.regs.ext.gpp).to.equal('gpp_consent_string');
      expect(ortbRequest.regs.ext.gpp_sid).to.deep.equal([0, 1, 2]);
    });

    it('should properly build a request with dsa object', async function () {
      const bidRequests = [
        {
          bidder: 'criteo',
          adUnitCode: 'bid-123',
          mediaTypes: {
            banner: {
              sizes: [[728, 90]]
            }
          },
          params: {
            zoneId: 123,
          },
        },
      ];
      const dsa = {
        required: 3,
        pubrender: 0,
        datatopub: 2,
        transparency: [{
          domain: 'platform1domain.com',
          params: [1]
        }, {
          domain: 'SSP2domain.com',
          params: [1, 2]
        }]
      };
      const ortb2 = {
        regs: {
          ext: {
            dsa: dsa
          }
        }
      };

      const ortbRequest = spec.buildRequests(bidRequests, await addFPDToBidderRequest({...bidderRequest, ortb2})).data;
      expect(ortbRequest.regs.ext.dsa).to.deep.equal(dsa);
    });

    it('should properly build a request with schain object', function () {
      const expectedSchain = {
        someProperty: 'someValue'
      };
      const bidRequests = [
        {
          bidder: 'criteo',
          ortb2: {
            source: {
              ext: {schain: expectedSchain}
            }
          },
          adUnitCode: 'bid-123',
          mediaTypes: {
            banner: {
              sizes: [[728, 90]]
            }
          },
          params: {
            zoneId: 123,
          },
        },
      ];

      // Create a modified bidderRequest with schain
      const modifiedBidderRequest = {
        ...bidderRequest,
        ortb2: {
          source: {
            ext: {schain: expectedSchain}
          }
        }
      };

      const ortbRequest = spec.buildRequests(bidRequests, modifiedBidderRequest).data;
      expect(ortbRequest.source.ext.schain).to.deep.equal(expectedSchain);
    });

    it('should properly build a request with bcat field', async function () {
      const bcat = ['IAB1', 'IAB2'];
      const bidRequests = [
        {
          bidder: 'criteo',
          adUnitCode: 'bid-123',
          mediaTypes: {
            banner: {
              sizes: [[728, 90]]
            }
          },
          params: {
            zoneId: 123,
          },
        },
      ];
      const bidderRequest = {
        ortb2: {
          bcat
        }
      };

      const ortbRequest = spec.buildRequests(bidRequests, await addFPDToBidderRequest(bidderRequest)).data;
      expect(ortbRequest.bcat).to.deep.equal(bcat);
    });

    it('should properly build a request with badv field', async function () {
      const badv = ['ford.com'];
      const bidRequests = [
        {
          bidder: 'criteo',
          adUnitCode: 'bid-123',
          mediaTypes: {
            banner: {
              sizes: [[728, 90]]
            }
          },
          params: {
            zoneId: 123,
          },
        },
      ];
      const bidderRequest = {
        ortb2: {
          badv
        }
      };

      const ortbRequest = spec.buildRequests(bidRequests, await addFPDToBidderRequest(bidderRequest)).data;
      expect(ortbRequest.badv).to.deep.equal(badv);
    });

    it('should properly build a request with bapp field', async function () {
      const bapp = ['com.foo.mygame'];
      const bidRequests = [
        {
          bidder: 'criteo',
          adUnitCode: 'bid-123',
          mediaTypes: {
            banner: {
              sizes: [[728, 90]]
            }
          },
          params: {
            zoneId: 123,
          },
        },
      ];
      const bidderRequest = {
        ortb2: {
          bapp
        }
      };

      const ortbRequest = spec.buildRequests(bidRequests, await addFPDToBidderRequest(bidderRequest)).data;
      expect(ortbRequest.bapp).to.deep.equal(bapp);
    });

    if (FEATURES.VIDEO) {
      it('should properly build a video request', async function () {
        const bidRequests = [
          {
            bidder: 'criteo',
            adUnitCode: 'bid-123',
            sizes: [[640, 480]],
            mediaTypes: {
              video: {
                context: 'inbanner',
                playerSize: [640, 480],
                mimes: ['video/mp4', 'video/x-flv'],
                maxduration: 30,
                api: [1, 2],
                protocols: [2, 3],
                plcmt: 3,
                w: 640,
                h: 480,
                linearity: 1,
                skipmin: 30,
                skipafter: 30,
                minbitrate: 10000,
                maxbitrate: 48000,
                delivery: [1, 2, 3],
                pos: 1,
                playbackend: 1,
                adPodDurationSec: 30,
                durationRangeSec: [1, 30],
              }
            },
            params: {
              zoneId: 123,
              video: {
                skip: 1,
                minduration: 5,
                startdelay: 5,
                playbackmethod: [1, 3],
                placement: 2
              }
            },
          },
        ];
        const request = spec.buildRequests(bidRequests, await addFPDToBidderRequest(bidderRequest));
        expect(request.url).to.match(/^https:\/\/grid-bidder\.criteo\.com\/openrtb_2_5\/pbjs\/auction\/request\?profileId=207&av=\d+&wv=[^&]+&cb=\d+&lsavail=[01]&debug=[01]&nolog=[01]$/);
        expect(request.method).to.equal('POST');
        const ortbRequest = request.data;
        expect(ortbRequest.imp).to.have.lengthOf(1);
        expect(ortbRequest.imp[0].video.mimes).to.deep.equal(['video/mp4', 'video/x-flv']);
        expect(ortbRequest.imp[0].video.maxduration).to.equal(30);
        expect(ortbRequest.imp[0].video.api).to.deep.equal([1, 2]);
        expect(ortbRequest.imp[0].video.protocols).to.deep.equal([2, 3]);
        expect(ortbRequest.imp[0].video.skip).to.equal(1);
        expect(ortbRequest.imp[0].video.minduration).to.equal(5);
        expect(ortbRequest.imp[0].video.startdelay).to.equal(5);
        expect(ortbRequest.imp[0].video.playbackmethod).to.deep.equal([1, 3]);
        expect(ortbRequest.imp[0].video.placement).to.equal(2);
        expect(ortbRequest.imp[0].video.w).to.equal(640);
        expect(ortbRequest.imp[0].video.h).to.equal(480);
        expect(ortbRequest.imp[0].video.linearity).to.equal(1);
        expect(ortbRequest.imp[0].video.skipmin).to.equal(30);
        expect(ortbRequest.imp[0].video.skipafter).to.equal(30);
        expect(ortbRequest.imp[0].video.minbitrate).to.equal(10000);
        expect(ortbRequest.imp[0].video.maxbitrate).to.equal(48000);
        expect(ortbRequest.imp[0].video.delivery).to.deep.equal([1, 2, 3]);
        expect(ortbRequest.imp[0].video.pos).to.equal(1);
        expect(ortbRequest.imp[0].video.playbackend).to.equal(1);
        expect(ortbRequest.imp[0].video.ext.context).to.equal('inbanner');
        expect(ortbRequest.imp[0].video.ext.playersizes).to.deep.equal(['640x480']);
        expect(ortbRequest.imp[0].video.ext.plcmt).to.equal(3);
        expect(ortbRequest.imp[0].video.ext.poddur).to.equal(30);
        expect(ortbRequest.imp[0].video.ext.rqddurs).to.deep.equal([1, 30]);
      });
    }

    if (FEATURES.VIDEO) {
      it('should properly build a video request with more than one player size', async function () {
        const bidRequests = [
          {
            bidder: 'criteo',
            adUnitCode: 'bid-123',
            sizes: [[640, 480], [800, 600]],
            mediaTypes: {
              video: {
                playerSize: [[640, 480], [800, 600]],
                mimes: ['video/mp4', 'video/x-flv'],
                maxduration: 30,
                api: [1, 2],
                protocols: [2, 3]
              }
            },
            params: {
              zoneId: 123,
              video: {
                skip: 1,
                minduration: 5,
                startdelay: 5,
                playbackmethod: [1, 3],
                placement: 2
              }
            },
          },
        ];
        const request = spec.buildRequests(bidRequests, await addFPDToBidderRequest(bidderRequest));
        expect(request.url).to.match(/^https:\/\/grid-bidder\.criteo\.com\/openrtb_2_5\/pbjs\/auction\/request\?profileId=207&av=\d+&wv=[^&]+&cb=\d+&lsavail=[01]&debug=[01]&nolog=[01]$/);
        expect(request.method).to.equal('POST');
        const ortbRequest = request.data;
        expect(ortbRequest.imp[0].video.mimes).to.deep.equal(['video/mp4', 'video/x-flv']);
        expect(ortbRequest.imp[0].video.maxduration).to.equal(30);
        expect(ortbRequest.imp[0].video.api).to.deep.equal([1, 2]);
        expect(ortbRequest.imp[0].video.protocols).to.deep.equal([2, 3]);
        expect(ortbRequest.imp[0].video.skip).to.equal(1);
        expect(ortbRequest.imp[0].video.minduration).to.equal(5);
        expect(ortbRequest.imp[0].video.startdelay).to.equal(5);
        expect(ortbRequest.imp[0].video.playbackmethod).to.deep.equal([1, 3]);
        expect(ortbRequest.imp[0].video.placement).to.equal(2);
        expect(ortbRequest.imp[0].video.w).to.equal(640);
        expect(ortbRequest.imp[0].video.h).to.equal(480);
        expect(ortbRequest.imp[0].video.ext.playersizes).to.deep.equal(['640x480', '800x600']);
        expect(ortbRequest.imp[0].ext.bidder.zoneid).to.equal(123);
      });
    }

    if (FEATURES.VIDEO) {
      it('should properly build a video request when mediaTypes.video.skip=0', async function () {
        const bidRequests = [
          {
            bidder: 'criteo',
            adUnitCode: 'bid-123',
            sizes: [[300, 250]],
            mediaTypes: {
              video: {
                playerSize: [[300, 250]],
                mimes: ['video/mp4', 'video/MPV', 'video/H264', 'video/webm', 'video/ogg'],
                minduration: 1,
                maxduration: 30,
                playbackmethod: [2, 3, 4, 5, 6],
                api: [1, 2, 3, 4, 5, 6],
                protocols: [1, 2, 3, 4, 5, 6, 7, 8],
                skip: 0
              }
            },
            params: {
              networkId: 456
            }
          }
        ];
        const request = spec.buildRequests(bidRequests, await addFPDToBidderRequest(bidderRequest));
        expect(request.url).to.match(/^https:\/\/grid-bidder\.criteo\.com\/openrtb_2_5\/pbjs\/auction\/request\?profileId=207&av=\d+&wv=[^&]+&cb=\d+&lsavail=[01]&debug=[01]&nolog=[01]&networkId=456$/);
        expect(request.method).to.equal('POST');
        const ortbRequest = request.data;
        expect(ortbRequest.imp[0].video.mimes).to.deep.equal(['video/mp4', 'video/MPV', 'video/H264', 'video/webm', 'video/ogg']);
        expect(ortbRequest.imp[0].video.minduration).to.equal(1);
        expect(ortbRequest.imp[0].video.maxduration).to.equal(30);
        expect(ortbRequest.imp[0].video.playbackmethod).to.deep.equal([2, 3, 4, 5, 6]);
        expect(ortbRequest.imp[0].video.api).to.deep.equal([1, 2, 3, 4, 5, 6]);
        expect(ortbRequest.imp[0].video.protocols).to.deep.equal([1, 2, 3, 4, 5, 6, 7, 8]);
        expect(ortbRequest.imp[0].video.skip).to.equal(0);
        expect(ortbRequest.imp[0].video.w).to.equal(300);
        expect(ortbRequest.imp[0].video.h).to.equal(250);
        expect(ortbRequest.imp[0].video.ext.playersizes).to.deep.equal(['300x250']);
      });
    }

    it('should properly build a request without first party data', async function () {
      const bidRequests = [
        {
          bidder: 'criteo',
          adUnitCode: 'bid-123',
          mediaTypes: {
            banner: {
              sizes: [[728, 90]]
            }
          },
          params: {
            zoneId: 123
          }
        },
      ];

      const ortbRequest = spec.buildRequests(bidRequests, await addFPDToBidderRequest({
        ...bidderRequest,
        ortb2: {}
      })).data;
      expect(ortbRequest.site.page).to.equal(refererUrl);
      expect(ortbRequest.imp).to.have.lengthOf(1);
      expect(ortbRequest.imp[0].tagid).to.equal('bid-123');
      expect(ortbRequest.imp[0].banner.format).to.have.lengthOf(1);
      expect(ortbRequest.imp[0].banner.format[0].w).to.equal(728);
      expect(ortbRequest.imp[0].banner.format[0].h).to.equal(90);
      expect(ortbRequest.imp[0].ext.bidder.zoneid).to.equal(123);
      expect(ortbRequest.user.ext.consent).to.equal('consentDataString');
      expect(ortbRequest.regs.ext.gdpr).to.equal(1);
      expect(ortbRequest.regs.ext.gdprversion).to.equal(1);
    });

    it('should properly build a request with first party data', async function () {
      const siteData = {
        keywords: ['power tools'],
        content: {
          data: [{
            name: 'some_provider',
            ext: {
              segtax: 3
            },
            segment: [
              {'id': '1001'},
              {'id': '1002'}
            ]
          }]
        },
        ext: {
          data: {
            pageType: 'article'
          }
        }
      };
      const userData = {
        gender: 'M',
        data: [{
          name: 'some_provider',
          ext: {
            segtax: 3
          },
          segment: [
            {'id': '1001'},
            {'id': '1002'}
          ]
        }],
        ext: {
          data: {
            registered: true
          }
        }
      };
      const bidRequests = [
        {
          bidder: 'criteo',
          adUnitCode: 'bid-123',
          mediaTypes: {
            banner: {
              sizes: [[728, 90]]
            }
          },
          params: {
            zoneId: 123,
            ext: {
              bidfloor: 0.75
            }
          },
          ortb2Imp: {
            ext: {
              data: {
                someContextAttribute: 'abc'
              }
            }
          }
        },
      ];

      const ortb2 = {
        site: siteData,
        user: userData
      };

      const ortbRequest = spec.buildRequests(bidRequests, await addFPDToBidderRequest({...bidderRequest, ortb2})).data;
      expect(ortbRequest.user).to.deep.equal({...userData, ext: {...userData.ext, consent: 'consentDataString'}});
      expect(ortbRequest.site).to.deep.equal({
        ...siteData,
        page: refererUrl,
        domain: 'criteo.com',
        publisher: {...ortbRequest.site.publisher, domain: 'criteo.com'}
      });
      expect(ortbRequest.imp[0].ext.bidfloor).to.equal(0.75);
      expect(ortbRequest.imp[0].ext.data.someContextAttribute).to.equal('abc')
    });

    it('should properly build a request when coppa flag is true', async function () {
      const bidRequests = [];
      const bidderRequest = {};
      config.setConfig({coppa: true});
      const ortbRequest = spec.buildRequests(bidRequests, await addFPDToBidderRequest(bidderRequest)).data;
      expect(ortbRequest.regs.coppa).to.equal(1);
    });

    it('should properly build a request when coppa flag is false', async function () {
      const bidRequests = [];
      const bidderRequest = {};
      config.setConfig({coppa: false});
      const ortbRequest = spec.buildRequests(bidRequests, await addFPDToBidderRequest(bidderRequest)).data;
      expect(ortbRequest.regs.coppa).to.equal(0);
    });

    it('should properly build a request when coppa flag is not defined', async function () {
      const bidRequests = [];
      const bidderRequest = {};
      const ortbRequest = spec.buildRequests(bidRequests, await addFPDToBidderRequest(bidderRequest)).data;
      expect(ortbRequest.regs?.coppa).to.be.undefined;
    });

    it('should properly build a banner request with floors', async function () {
      const bidRequests = [
        {
          bidder: 'criteo',
          adUnitCode: 'bid-123',
          mediaTypes: {
            banner: {
              sizes: [[300, 250], [728, 90]]
            }
          },
          params: {
            networkId: 456,
          },

          getFloor: inputParams => {
            if (inputParams.mediaType === BANNER && inputParams.size[0] === 300 && inputParams.size[1] === 250) {
              return {
                currency: 'USD',
                floor: 1.0
              };
            } else if (inputParams.mediaType === BANNER && inputParams.size[0] === 728 && inputParams.size[1] === 90) {
              return {
                currency: 'USD',
                floor: 2.0
              };
            } else {
              return {}
            }
          }
        },
      ];
      const bidderRequest = {};
      const ortbRequest = spec.buildRequests(bidRequests, await addFPDToBidderRequest(bidderRequest)).data;
      expect(ortbRequest.imp[0].ext.floors).to.deep.equal({
        'banner': {
          '300x250': {'currency': 'USD', 'floor': 1},
          '728x90': {'currency': 'USD', 'floor': 2}
        }
      });
    });

    it('should properly build a request with static floors', async function () {
      const bidRequests = [
        {
          bidder: 'criteo',
          adUnitCode: 'bid-123',
          mediaTypes: {
            banner: {
              sizes: [[300, 250], [728, 90]]
            }
          },
          params: {
            networkId: 456,
            bidFloor: 1,
            bidFloorCur: 'EUR'
          },
        },
      ];
      const bidderRequest = {};
      const ortbRequest = spec.buildRequests(bidRequests, await addFPDToBidderRequest(bidderRequest)).data;
      expect(ortbRequest.imp[0].ext.floors).to.deep.equal({
        'banner': {
          '300x250': {'currency': 'EUR', 'floor': 1},
          '728x90': {'currency': 'EUR', 'floor': 1}
        }
      });
    });

    it('should properly build a video request with several player sizes with floors', async function () {
      const bidRequests = [
        {
          bidder: 'criteo',
          adUnitCode: 'bid-123',
          mediaTypes: {
            video: {
              playerSize: [[300, 250], [728, 90]]
            }
          },
          params: {
            networkId: 456,
          },

          getFloor: inputParams => {
            if (inputParams.mediaType === VIDEO && inputParams.size[0] === 300 && inputParams.size[1] === 250) {
              return {
                currency: 'USD',
                floor: 1.0
              };
            } else if (inputParams.mediaType === VIDEO && inputParams.size[0] === 728 && inputParams.size[1] === 90) {
              return {
                currency: 'USD',
                floor: 2.0
              };
            } else {
              return {}
            }
          }
        },
      ];
      const bidderRequest = {};
      const ortbRequest = spec.buildRequests(bidRequests, await addFPDToBidderRequest(bidderRequest)).data;
      expect(ortbRequest.imp[0].ext.floors).to.deep.equal({
        'video': {
          '300x250': {'currency': 'USD', 'floor': 1},
          '728x90': {'currency': 'USD', 'floor': 2}
        }
      });
    });

    if (FEATURES.VIDEO && FEATURES.NATIVE) {
      it('should properly build a multi format request with floors', async function () {
        const bidRequests = [
          {
            bidder: 'criteo',
            adUnitCode: 'bid-123',
            mediaTypes: {
              banner: {
                sizes: [[300, 250], [728, 90]]
              },
              video: {
                playerSize: [640, 480],
              },
              native: {}
            },
            params: {
              networkId: 456,
            },
            ortb2Imp: {
              ext: {
                data: {
                  someContextAttribute: 'abc'
                }
              }
            },

            getFloor: inputParams => {
              if (inputParams.mediaType === BANNER && inputParams.size[0] === 300 && inputParams.size[1] === 250) {
                return {
                  currency: 'USD',
                  floor: 1.0
                };
              } else if (inputParams.mediaType === BANNER && inputParams.size[0] === 728 && inputParams.size[1] === 90) {
                return {
                  currency: 'USD',
                  floor: 2.0
                };
              } else if (inputParams.mediaType === VIDEO && inputParams.size[0] === 640 && inputParams.size[1] === 480) {
                return {
                  currency: 'EUR',
                  floor: 3.2
                };
              } else if (inputParams.mediaType === NATIVE && inputParams.size === '*') {
                return {
                  currency: 'YEN',
                  floor: 4.99
                };
              } else {
                return {}
              }
            }
          },
        ];
        const bidderRequest = {};
        const ortbRequest = spec.buildRequests(bidRequests, await addFPDToBidderRequest(bidderRequest)).data;
        expect(ortbRequest.imp[0].banner).not.to.be.null;
        expect(ortbRequest.imp[0].video).not.to.be.null;
        expect(ortbRequest.imp[0].native.request_native).not.to.be.null;
        expect(ortbRequest.imp[0].ext.data.someContextAttribute).to.deep.equal('abc');
        expect(ortbRequest.imp[0].ext.floors).to.deep.equal({
          'banner': {
            '300x250': {'currency': 'USD', 'floor': 1},
            '728x90': {'currency': 'USD', 'floor': 2}
          },
          'video': {
            '640x480': {'currency': 'EUR', 'floor': 3.2}
          },
          'native': {
            '*': {'currency': 'YEN', 'floor': 4.99}
          }
        });
      });
    }

    it('should properly build a request when imp.rwdd is present', async function () {
      const bidderRequest = {};
      const bidRequests = [
        {
          bidder: 'criteo',
          adUnitCode: 'bid-123',
          mediaTypes: {
            banner: {
              sizes: [[728, 90]]
            }
          },
          params: {
            zoneId: 123
          },
          ortb2Imp: {
            rwdd: 1
          }
        },
      ];

      const ortbRequest = spec.buildRequests(bidRequests, await addFPDToBidderRequest(bidderRequest)).data;
      expect(ortbRequest.imp[0].ext.rwdd).to.equal(1);
    });

    it('should properly build a request when imp.rwdd is false', async function () {
      const bidderRequest = {};
      const bidRequests = [
        {
          bidder: 'criteo',
          adUnitCode: 'bid-123',
          mediaTypes: {
            banner: {
              sizes: [[728, 90]]
            }
          },
          params: {
            zoneId: 123
          },
          ortb2Imp: {
            rwdd: 0
          }
        },
      ];

      const ortbRequest = spec.buildRequests(bidRequests, await addFPDToBidderRequest(bidderRequest)).data;
      expect(ortbRequest.imp[0].ext?.rwdd).to.equal(0);
    });

    it('should properly build a request when FLEDGE is enabled', async function () {
      const bidderRequest = {
        paapi: {
          enabled: true
        }
      };
      const bidRequests = [
        {
          bidder: 'criteo',
          adUnitCode: 'bid-123',
          mediaTypes: {
            banner: {
              sizes: [[728, 90]]
            }
          },
          params: {
            zoneId: 123
          },
          ortb2Imp: {
            ext: {
              igs: {
                ae: 1
              }
            }
          }
        },
      ];

      const ortbRequest = spec.buildRequests(bidRequests, await addFPDToBidderRequest(bidderRequest)).data;
      expect(ortbRequest.imp[0].ext.igs.ae).to.equal(1);
    });

    it('should properly build a request when FLEDGE is disabled', async function () {
      const bidderRequest = {
        paapi: {
          enabled: false
        },
      };
      const bidRequests = [
        {
          bidder: 'criteo',
          adUnitCode: 'bid-123',
          mediaTypes: {
            banner: {
              sizes: [[728, 90]]
            }
          },
          params: {
            zoneId: 123
          },
          ortb2Imp: {
            ext: {
              igs: {
                ae: 1
              }
            }
          }
        },
      ];

      const ortbRequest = spec.buildRequests(bidRequests, await addFPDToBidderRequest(bidderRequest)).data;
      expect(ortbRequest.imp[0].ext.igs?.ae).to.be.undefined;
    });

    it('should properly transmit the pubid and slot uid if available', async function () {
      const bidderRequest = {
        ortb2: {
          site: {
            publisher: {
              id: 'pub-777'
            }
          }
        }
      };
      const bidRequests = [
        {
          bidder: 'criteo',
          adUnitCode: 'bid-123',
          ortb2Imp: {
            ext: {
              tid: 'transaction-123',
            },
          },
          mediaTypes: {
            banner: {
              sizes: [[728, 90]]
            }
          },
          params: {
            zoneId: 123,
          },
        },
        {
          bidder: 'criteo',
          adUnitCode: 'bid-234',
          ortb2Imp: {
            ext: {
              tid: 'transaction-234',
            },
          },
          mediaTypes: {
            banner: {
              sizes: [[300, 250], [728, 90]]
            }
          },
          params: {
            networkId: 456,
            pubid: 'pub-888',
            uid: 888
          },
        },
      ];
      const request = spec.buildRequests(bidRequests, await addFPDToBidderRequest(bidderRequest));
      const ortbRequest = request.data;
      expect(ortbRequest.site.publisher.id).to.equal('pub-888');
      expect(ortbRequest.imp[0].ext.bidder.uid).to.be.undefined;
      expect(ortbRequest.imp[1].ext.bidder.uid).to.equal(888);
    });

    it('should properly transmit device.ext.cdep if available', async function () {
      const bidderRequest = {
        ortb2: {
          device: {
            ext: {
              cdep: 'cookieDeprecationLabel'
            }
          }
        }
      };
      const bidRequests = [];
      const request = spec.buildRequests(bidRequests, await addFPDToBidderRequest(bidderRequest));
      const ortbRequest = request.data;
      expect(ortbRequest.device.ext.cdep).to.equal('cookieDeprecationLabel');
    });

    it('should interpret correctly gzip configuration given as a string', async function() {
      bidderConfigStub.returns({criteo: {gzipEnabled: 'false'}});

      const request = spec.buildRequests(defaultBidRequests, await addFPDToBidderRequest(bidderRequest));
      expect(request.options.endpointCompression).to.be.false;
    });

    it('should interpret correctly gzip configuration given as a boolean', async function () {
      bidderConfigStub.returns({criteo: {gzipEnabled: false}});

      const request = spec.buildRequests(defaultBidRequests, await addFPDToBidderRequest(bidderRequest));
      expect(request.options.endpointCompression).to.be.false;
    });

    it('should default to true when it receives an invalid configuration', async function () {
      bidderConfigStub.returns({criteo: {gzipEnabled: 'randomString'}});

      const request = spec.buildRequests(defaultBidRequests, await addFPDToBidderRequest(bidderRequest));
      expect(request.options.endpointCompression).to.be.true;
    })
  });

  describe('interpretResponse', function () {
    const refererUrl = 'https://criteo.com?pbt_debug=1&pbt_nolog=1';
    const bidderRequest = {
      refererInfo: {
        page: refererUrl,
        topmostLocation: refererUrl
      },
      timeout: 3000,
      gdprConsent: {
        gdprApplies: true,
        consentString: 'consentDataString',
        vendorData: {
          vendorConsents: {
            '91': 1
          },
        },
        apiVersion: 1,
      },
    };

    function mockResponse(winningBidId, mediaType) {
      return {
        id: 'test-requestId',
        seatbid: [
          {
            seat: 'criteo',
            bid: [
              {
                id: 'test-bidderId',
                impid: winningBidId,
                price: 1.23,
                adomain: ['criteo.com'],
                bundle: '',
                iurl: 'http://some_image/',
                cid: '123456',
                crid: 'test-crId',
                dealid: 'deal-code',
                w: 728,
                h: 90,
                adm: 'test-ad',
                adm_native: mediaType === NATIVE ? {
                  ver: '1.2',
                  assets: [
                    {
                      id: 10,
                      title: {
                        text: 'Some product'
                      }
                    },
                    {
                      id: 11,
                      img: {
                        type: 3,
                        url: 'https://main_image_url.com',
                        w: 400,
                        h: 400
                      }
                    },
                    {
                      id: 12,
                      data: {
                        value: 'Some product'
                      }
                    },
                    {
                      id: 13,
                      data: {
                        value: '1,499 TL'
                      }
                    },
                    {
                      id: 15,
                      data: {
                        value: 'CTA'
                      },
                      link: {
                        url: 'https://cta_url.com'
                      }
                    },
                    {
                      id: 17,
                      img: {
                        type: 1,
                        url: 'https://main_image_url.com',
                        w: 200,
                        h: 200
                      },
                      link: {
                        url: 'https://icon_image_url.com'
                      }
                    },
                    {
                      id: 16,
                      data: {
                        value: 'Some brand'
                      }
                    }
                  ],
                  eventtrackers: [
                    {
                      event: 1,
                      method: 1,
                      url: 'https://eventtrackers.com'
                    },
                    {
                      event: 1,
                      method: 1,
                      url: 'https://test_in_isolation.criteo.com/tpd?dd=HTlW9l9xTEZqRHVlSHFiSWx5Q2VQMlEwSTJhNCUyQkxNazQ1Y29LR3ZmS2VTSDFsUGdkRHNoWjQ2UWp0SGtVZ1RTbHI0TFRpTlVqNWxiUkZOeGVFNjVraW53R0loRVJQNDJOY2R1eWxVdjBBQ1BEdVFvTyUyRlg3aWJaeUFha3UyemNNVGpmJTJCS1prc0FwRjZRJTJCQ2dpaFBJeVhZRmQlMkZURVZocUFRdm03OTdFZHZSbURNZWt4Uzh2M1NSUUxmTmhaTnNnRXd4VkZlOTdJOXdnNGZjaVolMkZWYmdYVjJJMkQ0eGxQaFIwQmVtWk1sQ09tNXlGY0Nwc09GTDladzExJTJGVExGNXJsdGpneERDeTMlMkJuNUlUcEU4NDFLMTZPc2ZoWFUwMmpGbDFpVjBPZUVtTlEwaWNOeHRyRFYyenRKd0lpJTJGTTElMkY1WGZ3Smo3aTh0bUJzdzZRdlZUSXppanNkamo3ekZNZjhKdjl2VDJ5eHV1YnVzdmdRdk5iWnprNXVFMVdmbGs0QU1QY0ozZQ'
                    }
                  ],
                  privacy: 'https://cta_url.com',
                  ext: {
                    privacy: {
                      imageurl: 'https://icon_image_url.com',
                      clickurl: 'https://cta_url.com',
                      longlegaltext: ''
                    }
                  }
                } : undefined,
                ext: {
                  mediatype: mediaType,
                  displayurl: mediaType === VIDEO ? 'http://test-ad' : undefined,
                  dsa: {
                    adrender: 1
                  },
                  meta: {
                    networkName: 'Criteo'
                  },
                  videoPlayerType: mediaType === VIDEO ? 'RadiantMediaPlayer' : undefined,
                  videoPlayerConfig: mediaType === VIDEO ? {} : undefined,
                  cur: 'CUR'
                }
              }
            ]
          }
        ]
      };
    }

    it('should return an empty array when parsing an empty bid response', async function () {
      const bidRequests = [];
      const response = {};
      const request = spec.buildRequests(bidRequests, await addFPDToBidderRequest(bidderRequest));
      const bids = spec.interpretResponse(response, request);
      expect(bids).to.have.lengthOf(0);
    });

    it('should return an empty array when parsing a well-formed no bid response', async function () {
      const bidRequests = [];
      const response = {seatbid: []};
      const request = spec.buildRequests(bidRequests, await addFPDToBidderRequest(bidderRequest));
      const bids = spec.interpretResponse({body: response}, request);
      expect(bids).to.have.lengthOf(0);
    });

    it('should properly parse a banner bid response', async function () {
      const bidRequests = [{
        adUnitCode: 'test-requestId',
        bidId: 'test-bidId',
        mediaTypes: {
          banner: {
            sizes: [[728, 90]]
          }
        },
        params: {
          networkId: 456,
        }
      }];
      const response = mockResponse('test-bidId', BANNER);
      const request = spec.buildRequests(bidRequests, await addFPDToBidderRequest(bidderRequest));
      const bids = spec.interpretResponse({body: response}, request);
      expect(bids).to.have.lengthOf(1);
      expect(bids[0].mediaType).to.equal(BANNER);
      expect(bids[0].requestId).to.equal('test-bidId');
      expect(bids[0].seatBidId).to.equal('test-bidderId')
      expect(bids[0].cpm).to.equal(1.23);
      expect(bids[0].currency).to.equal('CUR');
      expect(bids[0].width).to.equal(728);
      expect(bids[0].height).to.equal(90);
      expect(bids[0].ad).to.equal('test-ad');
      expect(bids[0].creativeId).to.equal('test-crId');
      expect(bids[0].dealId).to.equal('deal-code');
      expect(bids[0].meta.advertiserDomains[0]).to.equal('criteo.com');
      expect(bids[0].meta.networkName).to.equal('Criteo');
      expect(bids[0].meta.dsa.adrender).to.equal(1);
    });

    if (FEATURES.VIDEO) {
      it('should properly parse a bid response with a video', async function () {
        const bidRequests = [{
          adUnitCode: 'test-requestId',
          bidId: 'test-bidId',
          mediaTypes: {
            video: {
              context: 'instream',
              mimes: ['video/mpeg'],
              playerSize: [640, 480],
              protocols: [5, 6],
              maxduration: 30,
              api: [1, 2]
            }
          },
          params: {
            zoneId: 123,
          },
        }];
        const response = mockResponse('test-bidId', VIDEO);
        const request = spec.buildRequests(bidRequests, await addFPDToBidderRequest(bidderRequest));
        const bids = spec.interpretResponse({body: response}, request);
        expect(bids).to.have.lengthOf(1);
        expect(bids[0].mediaType).to.equal(VIDEO);
        expect(bids[0].requestId).to.equal('test-bidId');
        expect(bids[0].seatBidId).to.equal('test-bidderId')
        expect(bids[0].cpm).to.equal(1.23);
        expect(bids[0].currency).to.equal('CUR');
        expect(bids[0].vastUrl).to.equal('http://test-ad');
        expect(bids[0].vastXml).to.equal('test-ad');
        expect(bids[0].playerWidth).to.equal(640);
        expect(bids[0].playerHeight).to.equal(480);
        expect(bids[0].renderer).to.equal(undefined);
      });
    }

    if (FEATURES.VIDEO) {
      it('should properly parse a bid response with an outstream video', async function () {
        const bidRequests = [{
          adUnitCode: 'test-requestId',
          bidId: 'test-bidId',
          mediaTypes: {
            video: {
              context: 'outstream',
              mimes: ['video/mpeg'],
              playerSize: [640, 480],
              protocols: [5, 6],
              maxduration: 30,
              api: [1, 2]
            }
          },
          params: {
            networkId: 456,
          },
        }];
        const response = mockResponse('test-bidId', VIDEO);
        const request = spec.buildRequests(bidRequests, await addFPDToBidderRequest(bidderRequest));
        const bids = spec.interpretResponse({body: response}, request);
        expect(bids).to.have.lengthOf(1);
        expect(bids[0].mediaType).to.equal(VIDEO);
        expect(bids[0].requestId).to.equal('test-bidId');
        expect(bids[0].seatBidId).to.equal('test-bidderId')
        expect(bids[0].cpm).to.equal(1.23);
        expect(bids[0].currency).to.equal('CUR');
        expect(bids[0].vastUrl).to.equal('http://test-ad');
        expect(bids[0].vastXml).to.equal('test-ad');
        expect(bids[0].playerWidth).to.equal(640);
        expect(bids[0].playerHeight).to.equal(480);
        expect(bids[0].renderer.url).to.equal('https://static.criteo.net/js/ld/publishertag.renderer.js');
        expect(typeof bids[0].renderer.config.documentResolver).to.equal('function');
        expect(typeof bids[0].renderer._render).to.equal('function');
      });
    }

    if (FEATURES.NATIVE) {
      it('should properly parse a native bid response', async function () {
        const bidRequests = [{
          adUnitCode: 'test-requestId',
          bidId: 'test-bidId',
          params: {
            zoneId: '123',
          },
          native: true,
        }];
        const response = mockResponse('test-bidId', NATIVE);
        const request = spec.buildRequests(bidRequests, await addFPDToBidderRequest(bidderRequest));
        const bids = spec.interpretResponse({body: response}, request);
        expect(bids).to.have.lengthOf(1);
        expect(bids[0].mediaType).to.equal(NATIVE);
        expect(bids[0].requestId).to.equal('test-bidId');
        expect(bids[0].seatBidId).to.equal('test-bidderId')
        expect(bids[0].cpm).to.equal(1.23);
        expect(bids[0].currency).to.equal('CUR');
        expect(bids[0].width).to.equal(728);
        expect(bids[0].height).to.equal(90);
        expect(bids[0].ad).to.equal(undefined);
        expect(bids[0].native.ortb).not.to.be.null;
        expect(bids[0].native.ortb).to.equal(response.seatbid[0].bid[0].adm); // adm_native field was moved to adm
        expect(bids[0].creativeId).to.equal('test-crId');
        expect(bids[0].dealId).to.equal('deal-code');
        expect(bids[0].meta.advertiserDomains[0]).to.equal('criteo.com');
        expect(bids[0].meta.networkName).to.equal('Criteo');
        expect(bids[0].meta.dsa.adrender).to.equal(1);
      });
    }

    it('should properly parse a bid response when banner win with twin ad units', async function () {
      const bidRequests = [{
        adUnitCode: 'test-requestId',
        bidId: 'test-bidId',
        mediaTypes: {
          video: {
            context: 'instream',
            mimes: ['video/mpeg'],
            playerSize: [640, 480],
            protocols: [5, 6],
            maxduration: 30,
            api: [1, 2]
          }
        },
        params: {
          networkId: 456,
        },
      }, {
        adUnitCode: 'test-requestId',
        bidId: 'test-bidId2',
        mediaTypes: {
          banner: {
            sizes: [[728, 90]]
          }
        },
        params: {
          networkId: 456,
        }
      }];
      const response = mockResponse('test-bidId2', BANNER);
      const request = spec.buildRequests(bidRequests, await addFPDToBidderRequest(bidderRequest));
      const bids = spec.interpretResponse({body: response}, request);
      expect(bids).to.have.lengthOf(1);
      expect(bids[0].mediaType).to.equal(BANNER);
      expect(bids[0].requestId).to.equal('test-bidId2');
      expect(bids[0].seatBidId).to.equal('test-bidderId')
      expect(bids[0].cpm).to.equal(1.23);
      expect(bids[0].currency).to.equal('CUR');
      expect(bids[0].width).to.equal(728);
      expect(bids[0].height).to.equal(90);
      expect(bids[0].ad).to.equal('test-ad');
      expect(bids[0].creativeId).to.equal('test-crId');
      expect(bids[0].dealId).to.equal('deal-code');
      expect(bids[0].meta.advertiserDomains[0]).to.equal('criteo.com');
      expect(bids[0].meta.networkName).to.equal('Criteo');
      expect(bids[0].meta.dsa.adrender).to.equal(1);
    });

    if (FEATURES.VIDEO) {
      it('should properly parse a bid response when video win with twin ad units', async function () {
        const bidRequests = [{
          adUnitCode: 'test-requestId',
          bidId: 'test-bidId',
          mediaTypes: {
            video: {
              context: 'instream',
              mimes: ['video/mpeg'],
              playerSize: [640, 480],
              protocols: [5, 6],
              maxduration: 30,
              api: [1, 2]
            }
          },
          params: {
            zoneId: '123'
          },
        }, {
          adUnitCode: 'test-requestId',
          bidId: 'test-bidId2',
          mediaTypes: {
            banner: {
              sizes: [[728, 90]]
            }
          },
          params: {
            networkId: 456,
          }
        }];
        const response = mockResponse('test-bidId', VIDEO);
        const request = spec.buildRequests(bidRequests, await addFPDToBidderRequest(bidderRequest));
        const bids = spec.interpretResponse({body: response}, request);
        expect(bids).to.have.lengthOf(1);
        expect(bids[0].mediaType).to.equal(VIDEO);
        expect(bids[0].requestId).to.equal('test-bidId');
        expect(bids[0].seatBidId).to.equal('test-bidderId')
        expect(bids[0].cpm).to.equal(1.23);
        expect(bids[0].currency).to.equal('CUR');
        expect(bids[0].vastUrl).to.equal('http://test-ad');
        expect(bids[0].vastXml).to.equal('test-ad');
        expect(bids[0].playerWidth).to.equal(640);
        expect(bids[0].playerHeight).to.equal(480);
        expect(bids[0].renderer).to.equal(undefined);
      });
    }

    if (FEATURES.NATIVE) {
      it('should properly parse a bid response when native win with twin ad units', async function () {
        const bidRequests = [{
          adUnitCode: 'test-requestId',
          bidId: 'test-bidId',
          mediaTypes: {
            native: {}
          },
          params: {
            networkId: 456,
          },
        }, {
          adUnitCode: 'test-requestId',
          bidId: 'test-bidId2',
          mediaTypes: {
            banner: {
              sizes: [[728, 90]]
            }
          },
          params: {
            networkId: 456,
          }
        }];
        const response = mockResponse('test-bidId', NATIVE);
        const request = spec.buildRequests(bidRequests, await addFPDToBidderRequest(bidderRequest));
        const bids = spec.interpretResponse({body: response}, request);
        expect(bids).to.have.lengthOf(1);
        expect(bids[0].mediaType).to.equal(NATIVE);
        expect(bids[0].requestId).to.equal('test-bidId');
        expect(bids[0].seatBidId).to.equal('test-bidderId')
        expect(bids[0].cpm).to.equal(1.23);
        expect(bids[0].currency).to.equal('CUR');
        expect(bids[0].width).to.equal(728);
        expect(bids[0].height).to.equal(90);
        expect(bids[0].ad).to.equal(undefined);
        expect(bids[0].native.ortb).not.to.be.null;
        expect(bids[0].native.ortb).to.equal(response.seatbid[0].bid[0].adm); // adm_native field was moved to adm
        expect(bids[0].creativeId).to.equal('test-crId');
        expect(bids[0].dealId).to.equal('deal-code');
        expect(bids[0].meta.advertiserDomains[0]).to.equal('criteo.com');
        expect(bids[0].meta.networkName).to.equal('Criteo');
        expect(bids[0].meta.dsa.adrender).to.equal(1);
      });
    }

    it('should properly parse a bid response with FLEDGE auction configs', async function () {
      const auctionConfig1 = {
        auctionSignals: {},
        decisionLogicUrl: 'https://grid-mercury.criteo.com/fledge/decision',
        interestGroupBuyers: ['https://first-buyer-domain.com', 'https://second-buyer-domain.com'],
        perBuyerSignals: {
          'https://first-buyer-domain.com': {
            foo: 'bar',
          },
          'https://second-buyer-domain.com': {
            foo: 'baz'
          },
        },
        perBuyerTimeout: {
          '*': 500,
          'buyer1': 100,
          'buyer2': 200
        },
        perBuyerGroupLimits: {
          '*': 60,
          'buyer1': 300,
          'buyer2': 400
        },
        seller: 'https://seller-domain.com',
        sellerTimeout: 500,
        sellerSignals: {
          foo: 'bar',
          foo2: 'bar2',
          floor: 1,
          currency: 'USD',
          perBuyerTimeout: {
            'buyer1': 100,
            'buyer2': 200
          },
          perBuyerGroupLimits: {
            'buyer1': 300,
            'buyer2': 400
          },
        },
        sellerCurrency: 'USD',
      };
      const auctionConfig2 = {
        auctionSignals: {},
        decisionLogicUrl: 'https://grid-mercury.criteo.com/fledge/decision',
        interestGroupBuyers: ['https://first-buyer-domain.com', 'https://second-buyer-domain.com'],
        perBuyerSignals: {
          'https://first-buyer-domain.com': {
            foo: 'bar',
          },
          'https://second-buyer-domain.com': {
            foo: 'baz'
          },
        },
        perBuyerTimeout: {
          '*': 500,
          'buyer1': 100,
          'buyer2': 200
        },
        perBuyerGroupLimits: {
          '*': 60,
          'buyer1': 300,
          'buyer2': 400
        },
        seller: 'https://seller-domain.com',
        sellerTimeout: 500,
        sellerSignals: {
          foo: 'bar',
          floor: 1,
          perBuyerTimeout: {
            'buyer1': 100,
            'buyer2': 200
          },
          perBuyerGroupLimits: {
            'buyer1': 300,
            'buyer2': 400
          },
        },
        sellerCurrency: '???'
      };
      const bidRequests = [
        {
          bidId: 'test-bidId',
          bidder: 'criteo',
          adUnitCode: 'bid-123',
          transactionId: 'transaction-123',
          mediaTypes: {
            banner: {
              sizes: [[728, 90]]
            }
          },
          params: {
            bidFloor: 1,
            bidFloorCur: 'EUR'
          }
        },
        {
          bidId: 'test-bidId-2',
          bidder: 'criteo',
          adUnitCode: 'bid-123',
          transactionId: 'transaction-123',
          mediaTypes: {
            banner: {
              sizes: [[728, 90]]
            }
          },
          params: {
            bidFloor: 1,
            bidFloorCur: 'EUR'
          }
        },
      ];
      const response = {
        ext: {
          igi: [{
            impid: 'test-bidId',
            igs: [{
              impid: 'test-bidId',
              bidId: 'test-bidId',
              config: auctionConfig1
            }]
          }, {
            impid: 'test-bidId-2',
            igs: [{
              impid: 'test-bidId-2',
              bidId: 'test-bidId-2',
              config: auctionConfig2
            }]
          }]
        },
      };
      const request = spec.buildRequests(bidRequests, await addFPDToBidderRequest(bidderRequest));
      const interpretedResponse = spec.interpretResponse({body: response}, request);
      expect(interpretedResponse).to.have.property('bids');
      expect(interpretedResponse).to.have.property('paapi');
      expect(interpretedResponse.bids).to.have.lengthOf(0);
      expect(interpretedResponse.paapi).to.have.lengthOf(2);
      expect(interpretedResponse.paapi[0]).to.deep.equal({
        bidId: 'test-bidId',
        impid: 'test-bidId',
        config: auctionConfig1,
      });
      expect(interpretedResponse.paapi[1]).to.deep.equal({
        bidId: 'test-bidId-2',
        impid: 'test-bidId-2',
        config: auctionConfig2,
      });
    });

    [{
      hasBidResponseLevelPafData: true,
      hasBidResponseBidLevelPafData: true,
      shouldContainsBidMetaPafData: true
    },
    {
      hasBidResponseLevelPafData: false,
      hasBidResponseBidLevelPafData: true,
      shouldContainsBidMetaPafData: false
    },
    {
      hasBidResponseLevelPafData: true,
      hasBidResponseBidLevelPafData: false,
      shouldContainsBidMetaPafData: false
    },
    {
      hasBidResponseLevelPafData: false,
      hasBidResponseBidLevelPafData: false,
      shouldContainsBidMetaPafData: false
    }].forEach(testCase =>
      it('should properly forward or not meta paf data', async () => {
        const bidPafContentId = 'abcdef';
        const pafTransmission = {
          version: '12'
        };
        const bidRequests = [{
          bidId: 'test-bidId',
          adUnitCode: 'adUnitId',
          sizes: [[300, 250]],
          params: {
            networkId: 456,
          }
        }];
        const response = {
          id: 'test-requestId',
          seatbid: [{
            seat: 'criteo',
            bid: [
              {
                id: 'test-bidderId',
                impid: 'test-bidId',
                w: 728,
                h: 90,
                ext: {
                  mediatype: BANNER,
                  paf: testCase.hasBidResponseBidLevelPafData ? {
                    content_id: bidPafContentId
                  } : undefined
                }
              }
            ]
          }],
          ext: (testCase.hasBidResponseLevelPafData ? {
            paf: {
              transmission: pafTransmission
            }
          } : undefined)
        };

        const request = spec.buildRequests(bidRequests, await addFPDToBidderRequest(bidderRequest));
        const bids = spec.interpretResponse({body: response}, request);

        expect(bids).to.have.lengthOf(1);

        const expectedBidMetaPafData = {
          paf: {
            content_id: bidPafContentId,
            transmission: pafTransmission
          }
        };

        if (testCase.shouldContainsBidMetaPafData) {
          expect(bids[0].meta).to.deep.equal(expectedBidMetaPafData);
        } else {
          expect(bids[0].meta).not.to.deep.equal(expectedBidMetaPafData);
        }
      })
    )
  });

  describe('when pubtag prebid adapter is not available', function () {
    it('should not warn if sendId is provided on required fields for native bidRequest', async () => {
      const bidderRequest = {};
      const bidRequestsWithSendId = [
        {
          bidder: 'criteo',
          adUnitCode: 'bid-123',
          sizes: [[728, 90]],
          mediaTypes: {
            native: {}
          },
          nativeOrtbRequest: {
            assets: [{
              required: 1,
              id: 1,
              img: {
                type: 3,
                wmin: 100,
                hmin: 100,
              }
            }]
          },
          params: {
            zoneId: 123,
            publisherSubId: '123'
          },
          nativeParams: {
            image: {
              sendId: true
            },
            icon: {
              sendId: true
            },
            clickUrl: {
              sendId: true
            },
            displayUrl: {
              sendId: true
            },
            privacyLink: {
              sendId: true
            },
            privacyIcon: {
              sendId: true
            }
          }
        }
      ];

      const request = spec.buildRequests(bidRequestsWithSendId, await addFPDToBidderRequest(bidderRequest));
      expect(logWarnStub.withArgs('Criteo: all native assets containing URL should be sent as placeholders with sendId(icon, image, clickUrl, displayUrl, privacyLink, privacyIcon)').notCalled).to.be.true;
    });

    it('should warn only once if sendId is not provided on required fields for native bidRequest', async () => {
      const bidderRequest = {};
      const bidRequests = [
        {
          bidder: 'criteo',
          adUnitCode: 'bid-123',
          mediaTypes: {
            native: {}
          },
          nativeOrtbRequest: {
            assets: [{
              required: 1,
              id: 1,
              img: {
                type: 3,
                wmin: 100,
                hmin: 100,
              }
            }]
          },
          params: {
            zoneId: 123,
            publisherSubId: '123'
          },
        },
        {
          bidder: 'criteo',
          adUnitCode: 'bid-456',
          transactionId: 'transaction-456',
          mediaTypes: {
            native: {}
          },
          nativeOrtbRequest: {
            assets: [{
              required: 1,
              id: 1,
              img: {
                type: 3,
                wmin: 100,
                hmin: 100,
              }
            }]
          },
          params: {
            zoneId: 456,
            publisherSubId: '456'
          },
        },
      ];

      const nativeParamsWithoutSendId = [
        {
          nativeParams: {
            image: {
              sendId: false
            },
          }
        },
        {
          nativeParams: {
            icon: {
              sendId: false
            },
          }
        },
        {
          nativeParams: {
            clickUrl: {
              sendId: false
            },
          }
        },
        {
          nativeParams: {
            displayUrl: {
              sendId: false
            },
          }
        },
        {
          nativeParams: {
            privacyLink: {
              sendId: false
            },
          }
        },
        {
          nativeParams: {
            privacyIcon: {
              sendId: false
            },
          }
        }
      ];

      for (const nativeParams of nativeParamsWithoutSendId) {
        let transformedBidRequests = {...bidRequests};
        transformedBidRequests = [Object.assign(transformedBidRequests[0], nativeParams), Object.assign(transformedBidRequests[1], nativeParams)];
        spec.buildRequests(transformedBidRequests, await addFPDToBidderRequest(bidderRequest));
      }
      expect(logWarnStub.withArgs('Criteo: all native assets containing URL should be sent as placeholders with sendId(icon, image, clickUrl, displayUrl, privacyLink, privacyIcon)').callCount).to.equal(nativeParamsWithoutSendId.length * bidRequests.length);
    });
  });
});
