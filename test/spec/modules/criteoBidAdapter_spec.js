import { expect } from 'chai';
import {
  tryGetCriteoFastBid,
  spec,
  storage,
  PROFILE_ID_PUBLISHERTAG,
  ADAPTER_VERSION,
  canFastBid, getFastBidUrl, FAST_BID_VERSION_CURRENT
} from 'modules/criteoBidAdapter.js';
import * as utils from 'src/utils.js';
import * as refererDetection from 'src/refererDetection.js';
import * as ajax from 'src/ajax.js';
import { config } from '../../../src/config.js';
import { BANNER, NATIVE, VIDEO } from '../../../src/mediaTypes.js';

describe('The Criteo bidding adapter', function () {
  let utilsMock, sandbox, ajaxStub;

  beforeEach(function () {
    $$PREBID_GLOBAL$$.bidderSettings = {
      criteo: {
        storageAllowed: true
      }
    };
    // Remove FastBid to avoid side effects
    localStorage.removeItem('criteo_fast_bid');
    utilsMock = sinon.mock(utils);

    sandbox = sinon.sandbox.create();
    ajaxStub = sandbox.stub(ajax, 'ajax');
  });

  afterEach(function () {
    $$PREBID_GLOBAL$$.bidderSettings = {};
    global.Criteo = undefined;
    utilsMock.restore();
    sandbox.restore();
    ajaxStub.restore();
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

    let randomStub,
      getConfigStub,
      getRefererInfoStub,
      cookiesAreEnabledStub,
      localStorageIsEnabledStub,
      getCookieStub,
      setCookieStub,
      getDataFromLocalStorageStub,
      removeDataFromLocalStorageStub;

    beforeEach(function () {
      getConfigStub = sinon.stub(config, 'getConfig');
      getConfigStub.withArgs('criteo.fastBidVersion').returns('none');

      randomStub = sinon.stub(Math, 'random');
      randomStub.returns(123456);

      getRefererInfoStub = sinon.stub(refererDetection, 'getRefererInfo');
      getRefererInfoStub.returns({
        domain: 'www.abc.com'
      });

      cookiesAreEnabledStub = sinon.stub(storage, 'cookiesAreEnabled');
      cookiesAreEnabledStub.returns(true);
      localStorageIsEnabledStub = sinon.stub(storage, 'localStorageIsEnabled');
      localStorageIsEnabledStub.returns(true);

      getCookieStub = sinon.stub(storage, 'getCookie');
      setCookieStub = sinon.stub(storage, 'setCookie');
      getDataFromLocalStorageStub = sinon.stub(storage, 'getDataFromLocalStorage');
      removeDataFromLocalStorageStub = sinon.stub(storage, 'removeDataFromLocalStorage');
    });

    afterEach(function () {
      randomStub.restore();
      getConfigStub.restore();
      getRefererInfoStub.restore();
      cookiesAreEnabledStub.restore();
      localStorageIsEnabledStub.restore();
      getCookieStub.restore();
      setCookieStub.restore();
      getDataFromLocalStorageStub.restore();
      removeDataFromLocalStorageStub.restore();
    });

    it('should not trigger sync if publisher is using fast bid', function () {
      getConfigStub.withArgs('criteo.fastBidVersion').returns('latest');

      const userSyncs = spec.getUserSyncs(syncOptionsIframeEnabled, undefined, undefined, undefined);

      expect(userSyncs).to.eql([]);
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
        gdprApplies: 1,
        consentString: 'concentDataString',
        vendorData: {
          vendorConsents: {
            '91': 1
          },
        },
        apiVersion: 1,
      },
    };

    let localStorageIsEnabledStub;

    this.beforeEach(function () {
      localStorageIsEnabledStub = sinon.stub(storage, 'localStorageIsEnabled');
      localStorageIsEnabledStub.returns(true);
    });

    afterEach(function () {
      localStorageIsEnabledStub.restore();
      config.resetConfig();
    });

    it('should properly build a request using random uuid as auction id', function () {
      const generateUUIDStub = sinon.stub(utils, 'generateUUID');
      generateUUIDStub.returns('def');
      const bidderRequest = {
      };
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
      const request = spec.buildRequests(bidRequests, bidderRequest);
      const ortbRequest = request.data;
      expect(ortbRequest.id).to.equal('def');
      generateUUIDStub.restore();
    });

    it('should properly transmit source.tid if available', function () {
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
          transactionId: 'transaction-123',
          mediaTypes: {
            banner: {
              sizes: [[728, 90]]
            }
          },
          params: {}
        },
      ];
      const request = spec.buildRequests(bidRequests, bidderRequest);
      const ortbRequest = request.data;
      expect(ortbRequest.source.tid).to.equal('abc');
    });

    it('should properly transmit tmax if available', function () {
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
      const request = spec.buildRequests(bidRequests, bidderRequest);
      const ortbRequest = request.data;
      expect(ortbRequest.tmax).to.equal(bidderRequest.timeout);
    });

    it('should properly transmit bidId if available', function () {
      const bidderRequest = {
        ortb2: {
          source: {
            tid: 'abc'
          }
        }
      };
      const bidRequests = [
        {
          bidId: 'bidId',
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
      const request = spec.buildRequests(bidRequests, bidderRequest);
      const ortbRequest = request.data;
      expect(ortbRequest.slots[0].slotid).to.equal('bidId');
    });

    it('should properly build a request if refererInfo is not provided', function () {
      const bidderRequest = {};
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
          params: {}
        },
      ];
      const request = spec.buildRequests(bidRequests, bidderRequest);
      const ortbRequest = request.data;
      expect(ortbRequest.publisher.url).to.equal('');
    });

    it('should properly build a zoneId request', function () {
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
            nativeCallback: function () { },
            integrationMode: 'amp'
          },
        },
      ];
      const request = spec.buildRequests(bidRequests, bidderRequest);
      expect(request.url).to.match(/^https:\/\/bidder\.criteo\.com\/cdb\?profileId=207&av=\d+&wv=[^&]+&cb=\d+&lsavail=1&im=1&debug=1&nolog=1/);
      expect(request.method).to.equal('POST');
      const ortbRequest = request.data;
      expect(ortbRequest.publisher.url).to.equal(refererUrl);
      expect(ortbRequest.slots).to.have.lengthOf(1);
      expect(ortbRequest.slots[0].impid).to.equal('bid-123');
      expect(ortbRequest.slots[0].transactionid).to.equal('transaction-123');
      expect(ortbRequest.slots[0].sizes).to.have.lengthOf(1);
      expect(ortbRequest.slots[0].sizes[0]).to.equal('728x90');
      expect(ortbRequest.slots[0].zoneid).to.equal(123);
      expect(ortbRequest.gdprConsent.consentData).to.equal('concentDataString');
      expect(ortbRequest.gdprConsent.gdprApplies).to.equal(true);
      expect(ortbRequest.gdprConsent.version).to.equal(1);
    });

    it('should keep undefined sizes for non native banner', function () {
      const bidRequests = [
        {
          mediaTypes: {
            banner: {
              sizes: [[undefined, undefined]]
            }
          },
          params: {},
        },
      ];
      const request = spec.buildRequests(bidRequests, bidderRequest);
      const ortbRequest = request.data;
      expect(ortbRequest.slots[0].sizes).to.have.lengthOf(1);
      expect(ortbRequest.slots[0].sizes[0]).to.equal('undefinedxundefined');
    });

    it('should keep undefined size for non native banner', function () {
      const bidRequests = [
        {
          mediaTypes: {
            banner: {
              sizes: [undefined, undefined]
            }
          },
          params: {},
        },
      ];
      const request = spec.buildRequests(bidRequests, bidderRequest);
      const ortbRequest = request.data;
      expect(ortbRequest.slots[0].sizes).to.have.lengthOf(1);
      expect(ortbRequest.slots[0].sizes[0]).to.equal('undefinedxundefined');
    });

    it('should properly detect and forward native flag', function () {
      const bidRequests = [
        {
          mediaTypes: {
            banner: {
              sizes: [[undefined, undefined]]
            }
          },
          params: {
            nativeCallback: function () { }
          },
        },
      ];
      const request = spec.buildRequests(bidRequests, bidderRequest);
      const ortbRequest = request.data;
      expect(ortbRequest.slots[0].native).to.equal(true);
    });

    it('should properly forward eids', function () {
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
          userIdAsEids: [
            {
              source: 'criteo.com',
              uids: [{
                id: 'abc',
                atype: 1
              }]
            }
          ],
          params: {}
        },
      ];
      const request = spec.buildRequests(bidRequests, bidderRequest);
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

    it('should properly detect and forward native flag', function () {
      const bidRequests = [
        {
          mediaTypes: {
            banner: {
              sizes: [undefined, undefined]
            }
          },
          params: {
            nativeCallback: function () { }
          },
        },
      ];
      const request = spec.buildRequests(bidRequests, bidderRequest);
      const ortbRequest = request.data;
      expect(ortbRequest.slots[0].native).to.equal(true);
    });

    it('should map ortb native assets to slot ext assets', function () {
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
          nativeOrtbRequest: {
            assets: assets
          },
          params: {
            nativeCallback: function () { }
          },
        },
      ];
      const request = spec.buildRequests(bidRequests, bidderRequest);
      const ortbRequest = request.data;
      expect(ortbRequest.slots[0].native).to.equal(true);
      expect(ortbRequest.slots[0].ext.assets).to.deep.equal(assets);
    });

    it('should properly build a networkId request', function () {
      const bidderRequest = {
        refererInfo: {
          page: refererUrl,
          topmostLocation: refererUrl,
        },
        timeout: 3000,
        gdprConsent: {
          gdprApplies: 0,
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
      const request = spec.buildRequests(bidRequests, bidderRequest);
      expect(request.url).to.match(/^https:\/\/bidder\.criteo\.com\/cdb\?profileId=207&av=\d+&wv=[^&]+&cb=\d/);
      expect(request.method).to.equal('POST');
      const ortbRequest = request.data;
      expect(ortbRequest.publisher.url).to.equal(refererUrl);
      expect(ortbRequest.publisher.networkid).to.equal(456);
      expect(ortbRequest.slots).to.have.lengthOf(1);
      expect(ortbRequest.slots[0].impid).to.equal('bid-123');
      expect(ortbRequest.slots[0].transactionid).to.equal('transaction-123');
      expect(ortbRequest.slots[0].sizes).to.have.lengthOf(2);
      expect(ortbRequest.slots[0].sizes[0]).to.equal('300x250');
      expect(ortbRequest.slots[0].sizes[1]).to.equal('728x90');
      expect(ortbRequest.gdprConsent.consentData).to.equal(undefined);
      expect(ortbRequest.gdprConsent.gdprApplies).to.equal(false);
    });

    it('should properly build a mixed request', function () {
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
      const request = spec.buildRequests(bidRequests, bidderRequest);
      expect(request.url).to.match(/^https:\/\/bidder\.criteo\.com\/cdb\?profileId=207&av=\d+&wv=[^&]+&cb=\d/);
      expect(request.method).to.equal('POST');
      const ortbRequest = request.data;
      expect(ortbRequest.publisher.url).to.equal(refererUrl);
      expect(ortbRequest.publisher.networkid).to.equal(456);
      expect(ortbRequest.slots).to.have.lengthOf(2);
      expect(ortbRequest.slots[0].impid).to.equal('bid-123');
      expect(ortbRequest.slots[0].transactionid).to.equal('transaction-123');
      expect(ortbRequest.slots[0].sizes).to.have.lengthOf(1);
      expect(ortbRequest.slots[0].sizes[0]).to.equal('728x90');
      expect(ortbRequest.slots[1].impid).to.equal('bid-234');
      expect(ortbRequest.slots[1].transactionid).to.equal('transaction-234');
      expect(ortbRequest.slots[1].sizes).to.have.lengthOf(2);
      expect(ortbRequest.slots[1].sizes[0]).to.equal('300x250');
      expect(ortbRequest.slots[1].sizes[1]).to.equal('728x90');
      expect(ortbRequest.gdprConsent).to.equal(undefined);
    });

    it('should properly build a request with undefined gdpr consent fields when they are not provided', function () {
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
          params: {
            zoneId: 123,
          },
        },
      ];
      const bidderRequest = {
        timeout: 3000,
        gdprConsent: {},
      };

      const ortbRequest = spec.buildRequests(bidRequests, bidderRequest).data;
      expect(ortbRequest.gdprConsent.consentData).to.equal(undefined);
      expect(ortbRequest.gdprConsent.gdprApplies).to.equal(undefined);
    });

    it('should properly build a request with ccpa consent field', function () {
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
          params: {
            zoneId: 123,
          },
        },
      ];
      const bidderRequest = {
        timeout: 3000,
        uspConsent: '1YNY',
      };

      const request = spec.buildRequests(bidRequests, bidderRequest);
      expect(request.data.user).to.not.be.null;
      expect(request.data.user.uspIab).to.equal('1YNY');
    });

    it('should properly build a request with site and app ortb fields', function () {
      const bidRequests = [];
      let app = {
        publisher: {
          id: 'appPublisherId'
        }
      };
      let site = {
        publisher: {
          id: 'sitePublisherId'
        }
      };
      const bidderRequest = {
        ortb2: {
          app: app,
          site: site
        }
      };
      const request = spec.buildRequests(bidRequests, bidderRequest);

      expect(request.data.app).to.equal(app);
      expect(request.data.site).to.equal(site);
    });

    it('should properly build a request with device sua field', function () {
      const sua = {}
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

      const request = spec.buildRequests(bidRequests, bidderRequest);
      expect(request.data.user.ext.sua).to.not.be.null;
      expect(request.data.user.ext.sua).to.equal(sua);
    });

    it('should properly build a request with gpp consent field', function () {
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

      const request = spec.buildRequests(bidRequests, { ...bidderRequest, ortb2 });
      expect(request.data.regs).to.not.be.null;
      expect(request.data.regs.gpp).to.equal('gpp_consent_string');
      expect(request.data.regs.gpp_sid).to.deep.equal([0, 1, 2]);
    });

    it('should properly build a request with dsa object', function () {
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
          params: {
            zoneId: 123,
          },
        },
      ];
      let dsa = {
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

      const request = spec.buildRequests(bidRequests, { ...bidderRequest, ortb2 });
      expect(request.data.regs).to.not.be.null;
      expect(request.data.regs.ext).to.not.be.null;
      expect(request.data.regs.ext.dsa).to.deep.equal(dsa);
    });

    it('should properly build a request with schain object', function () {
      const expectedSchain = {
        someProperty: 'someValue'
      };
      const bidRequests = [
        {
          bidder: 'criteo',
          schain: expectedSchain,
          adUnitCode: 'bid-123',
          transactionId: 'transaction-123',
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

      const request = spec.buildRequests(bidRequests, bidderRequest);
      expect(request.data.source.ext.schain).to.equal(expectedSchain);
    });

    it('should properly build a request with bcat field', function () {
      const bcat = ['IAB1', 'IAB2'];
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

      const request = spec.buildRequests(bidRequests, bidderRequest);
      expect(request.data.bcat).to.not.be.null;
      expect(request.data.bcat).to.equal(bcat);
    });

    it('should properly build a request with badv field', function () {
      const badv = ['ford.com'];
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

      const request = spec.buildRequests(bidRequests, bidderRequest);
      expect(request.data.badv).to.not.be.null;
      expect(request.data.badv).to.equal(badv);
    });

    it('should properly build a request with bapp field', function () {
      const bapp = ['com.foo.mygame'];
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

      const request = spec.buildRequests(bidRequests, bidderRequest);
      expect(request.data.bapp).to.not.be.null;
      expect(request.data.bapp).to.equal(bapp);
    });

    it('should properly build a request with if ccpa consent field is not provided', function () {
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
          params: {
            zoneId: 123,
          },
        },
      ];
      const bidderRequest = {
        timeout: 3000
      };

      const request = spec.buildRequests(bidRequests, bidderRequest);
      expect(request.data.user).to.not.be.null;
      expect(request.data.user.uspIab).to.equal(undefined);
    });

    it('should properly build a video request', function () {
      const bidRequests = [
        {
          bidder: 'criteo',
          adUnitCode: 'bid-123',
          transactionId: 'transaction-123',
          sizes: [[640, 480]],
          mediaTypes: {
            video: {
              context: 'instream',
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
      const request = spec.buildRequests(bidRequests, bidderRequest);
      expect(request.url).to.match(/^https:\/\/bidder\.criteo\.com\/cdb\?profileId=207&av=\d+&wv=[^&]+&cb=\d/);
      expect(request.method).to.equal('POST');
      const ortbRequest = request.data;
      expect(ortbRequest.slots[0].video.context).to.equal('instream');
      expect(ortbRequest.slots[0].video.mimes).to.deep.equal(['video/mp4', 'video/x-flv']);
      expect(ortbRequest.slots[0].sizes).to.deep.equal([]);
      expect(ortbRequest.slots[0].video.playersizes).to.deep.equal(['640x480']);
      expect(ortbRequest.slots[0].video.maxduration).to.equal(30);
      expect(ortbRequest.slots[0].video.api).to.deep.equal([1, 2]);
      expect(ortbRequest.slots[0].video.protocols).to.deep.equal([2, 3]);
      expect(ortbRequest.slots[0].video.skip).to.equal(1);
      expect(ortbRequest.slots[0].video.minduration).to.equal(5);
      expect(ortbRequest.slots[0].video.startdelay).to.equal(5);
      expect(ortbRequest.slots[0].video.playbackmethod).to.deep.equal([1, 3]);
      expect(ortbRequest.slots[0].video.placement).to.equal(2);
      expect(ortbRequest.slots[0].video.plcmt).to.equal(3);
      expect(ortbRequest.slots[0].video.w).to.equal(640);
      expect(ortbRequest.slots[0].video.h).to.equal(480);
      expect(ortbRequest.slots[0].video.linearity).to.equal(1);
      expect(ortbRequest.slots[0].video.skipmin).to.equal(30);
      expect(ortbRequest.slots[0].video.skipafter).to.equal(30);
      expect(ortbRequest.slots[0].video.minbitrate).to.equal(10000);
      expect(ortbRequest.slots[0].video.maxbitrate).to.equal(48000);
      expect(ortbRequest.slots[0].video.delivery).to.deep.equal([1, 2, 3]);
      expect(ortbRequest.slots[0].video.pos).to.equal(1);
      expect(ortbRequest.slots[0].video.playbackend).to.equal(1);
      expect(ortbRequest.slots[0].video.adPodDurationSec).to.equal(30);
      expect(ortbRequest.slots[0].video.durationRangeSec).to.deep.equal([1, 30]);
    });

    it('should properly build a video request with more than one player size', function () {
      const bidRequests = [
        {
          bidder: 'criteo',
          adUnitCode: 'bid-123',
          transactionId: 'transaction-123',
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
      const request = spec.buildRequests(bidRequests, bidderRequest);
      expect(request.url).to.match(/^https:\/\/bidder\.criteo\.com\/cdb\?profileId=207&av=\d+&wv=[^&]+&cb=\d/);
      expect(request.method).to.equal('POST');
      const ortbRequest = request.data;
      expect(ortbRequest.slots[0].sizes).to.deep.equal([]);
      expect(ortbRequest.slots[0].video.mimes).to.deep.equal(['video/mp4', 'video/x-flv']);
      expect(ortbRequest.slots[0].video.playersizes).to.deep.equal(['640x480', '800x600']);
      expect(ortbRequest.slots[0].video.maxduration).to.equal(30);
      expect(ortbRequest.slots[0].video.api).to.deep.equal([1, 2]);
      expect(ortbRequest.slots[0].video.protocols).to.deep.equal([2, 3]);
      expect(ortbRequest.slots[0].video.skip).to.equal(1);
      expect(ortbRequest.slots[0].video.minduration).to.equal(5);
      expect(ortbRequest.slots[0].video.startdelay).to.equal(5);
      expect(ortbRequest.slots[0].video.playbackmethod).to.deep.equal([1, 3]);
      expect(ortbRequest.slots[0].video.placement).to.equal(2);
    });

    it('should properly build a video request when mediaTypes.video.skip=0', function () {
      const bidRequests = [
        {
          bidder: 'criteo',
          adUnitCode: 'bid-123',
          transactionId: 'transaction-123',
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
            networkId: 123
          }
        }
      ];
      const request = spec.buildRequests(bidRequests, bidderRequest);
      expect(request.url).to.match(/^https:\/\/bidder\.criteo\.com\/cdb\?profileId=207&av=\d+&wv=[^&]+&cb=\d/);
      expect(request.method).to.equal('POST');
      const ortbRequest = request.data;
      expect(ortbRequest.slots[0].sizes).to.deep.equal([]);
      expect(ortbRequest.slots[0].video.playersizes).to.deep.equal(['300x250']);
      expect(ortbRequest.slots[0].video.mimes).to.deep.equal(['video/mp4', 'video/MPV', 'video/H264', 'video/webm', 'video/ogg']);
      expect(ortbRequest.slots[0].video.minduration).to.equal(1);
      expect(ortbRequest.slots[0].video.maxduration).to.equal(30);
      expect(ortbRequest.slots[0].video.playbackmethod).to.deep.equal([2, 3, 4, 5, 6]);
      expect(ortbRequest.slots[0].video.api).to.deep.equal([1, 2, 3, 4, 5, 6]);
      expect(ortbRequest.slots[0].video.protocols).to.deep.equal([1, 2, 3, 4, 5, 6, 7, 8]);
      expect(ortbRequest.slots[0].video.skip).to.equal(0);
    });

    it('should properly build a request with ceh', function () {
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
          params: {
            zoneId: 123,
          },
        },
      ];
      config.setConfig({
        criteo: {
          ceh: 'hashedemail'
        }
      });
      const request = spec.buildRequests(bidRequests, bidderRequest);
      expect(request.data.user).to.not.be.null;
      expect(request.data.user.ceh).to.equal('hashedemail');
    });

    it('should properly build a request without first party data', function () {
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
          params: {
            zoneId: 123
          }
        },
      ];

      const request = spec.buildRequests(bidRequests, { ...bidderRequest, ortb2: {} });
      expect(request.data.publisher.ext).to.equal(undefined);
      expect(request.data.user.ext).to.equal(undefined);
      expect(request.data.slots[0].ext).to.equal(undefined);
    });

    it('should properly build a request with criteo specific ad unit first party data', function () {
      // TODO: this test does not do what it says
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
          params: {
            zoneId: 123,
            ext: {
              bidfloor: 0.75
            }
          }
        },
      ];

      const request = spec.buildRequests(bidRequests, { ...bidderRequest, ortb2: {} });
      expect(request.data.slots[0].ext).to.deep.equal({
        bidfloor: 0.75,
      });
    });

    it('should properly build a request with first party data', function () {
      const siteData = {
        keywords: ['power tools'],
        content: {
          data: [{
            name: 'some_provider',
            ext: {
              segtax: 3
            },
            segment: [
              { 'id': '1001' },
              { 'id': '1002' }
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
            { 'id': '1001' },
            { 'id': '1002' }
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
          transactionId: 'transaction-123',
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

      const request = spec.buildRequests(bidRequests, { ...bidderRequest, ortb2 });
      expect(request.data.publisher.ext).to.deep.equal({ data: { pageType: 'article' } });
      expect(request.data.user).to.deep.equal(userData);
      expect(request.data.site).to.deep.equal(siteData);
      expect(request.data.slots[0].ext).to.deep.equal({
        bidfloor: 0.75,
        data: {
          someContextAttribute: 'abc'
        }
      });
    });

    it('should properly build a request when coppa flag is true', function () {
      const bidRequests = [];
      const bidderRequest = {};
      config.setConfig({ coppa: true });
      const request = spec.buildRequests(bidRequests, bidderRequest);
      expect(request.data.regs.coppa).to.not.be.undefined;
      expect(request.data.regs.coppa).to.equal(1);
    });

    it('should properly build a request when coppa flag is false', function () {
      const bidRequests = [];
      const bidderRequest = {};
      config.setConfig({ coppa: false });
      const request = spec.buildRequests(bidRequests, bidderRequest);
      expect(request.data.regs.coppa).to.not.be.undefined;
      expect(request.data.regs.coppa).to.equal(0);
    });

    it('should properly build a request when coppa flag is not defined', function () {
      const bidRequests = [];
      const bidderRequest = {};
      const request = spec.buildRequests(bidRequests, bidderRequest);
      expect(request.data.regs.coppa).to.be.undefined;
    });

    it('should properly build a banner request with floors', function () {
      const bidRequests = [
        {
          bidder: 'criteo',
          adUnitCode: 'bid-123',
          transactionId: 'transaction-123',
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
      const request = spec.buildRequests(bidRequests, bidderRequest);
      expect(request.data.slots[0].ext.floors).to.deep.equal({
        'banner': {
          '300x250': { 'currency': 'USD', 'floor': 1 },
          '728x90': { 'currency': 'USD', 'floor': 2 }
        }
      });
    });

    it('should properly build a request with static floors', function () {
      const bidRequests = [
        {
          bidder: 'criteo',
          adUnitCode: 'bid-123',
          transactionId: 'transaction-123',
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
      const request = spec.buildRequests(bidRequests, bidderRequest);
      expect(request.data.slots[0].ext.floors).to.deep.equal({
        'banner': {
          '300x250': { 'currency': 'EUR', 'floor': 1 },
          '728x90': { 'currency': 'EUR', 'floor': 1 }
        }
      });
    });

    it('should properly build a video request with several player sizes with floors', function () {
      const bidRequests = [
        {
          bidder: 'criteo',
          adUnitCode: 'bid-123',
          transactionId: 'transaction-123',
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
      const request = spec.buildRequests(bidRequests, bidderRequest);
      expect(request.data.slots[0].ext.floors).to.deep.equal({
        'video': {
          '300x250': { 'currency': 'USD', 'floor': 1 },
          '728x90': { 'currency': 'USD', 'floor': 2 }
        }
      });
    });

    it('should properly build a multi format request with floors', function () {
      const bidRequests = [
        {
          bidder: 'criteo',
          adUnitCode: 'bid-123',
          transactionId: 'transaction-123',
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
      const request = spec.buildRequests(bidRequests, bidderRequest);
      expect(request.data.slots[0].ext.data.someContextAttribute).to.deep.equal('abc');
      expect(request.data.slots[0].ext.floors).to.deep.equal({
        'banner': {
          '300x250': { 'currency': 'USD', 'floor': 1 },
          '728x90': { 'currency': 'USD', 'floor': 2 }
        },
        'video': {
          '640x480': { 'currency': 'EUR', 'floor': 3.2 }
        },
        'native': {
          '*': { 'currency': 'YEN', 'floor': 4.99 }
        }
      });
    });

    it('should properly build a request when imp.rwdd is present', function () {
      const bidderRequest = {};
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
          params: {
            zoneId: 123,
            ext: {
              bidfloor: 0.75
            }
          },
          ortb2Imp: {
            rwdd: 1,
            ext: {
              data: {
                someContextAttribute: 'abc'
              }
            }
          }
        },
      ];

      const request = spec.buildRequests(bidRequests, bidderRequest);
      expect(request.data.slots[0].rwdd).to.be.not.null;
      expect(request.data.slots[0].rwdd).to.equal(1);
    });

    it('should properly build a request when imp.rwdd is false', function () {
      const bidderRequest = {};
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
          params: {
            zoneId: 123,
            ext: {
              bidfloor: 0.75
            }
          },
          ortb2Imp: {
            rwdd: 0,
            ext: {
              data: {
                someContextAttribute: 'abc'
              }
            }
          }
        },
      ];

      const request = spec.buildRequests(bidRequests, bidderRequest);
      expect(request.data.slots[0].rwdd).to.be.undefined;
    });

    it('should properly build a request when FLEDGE is enabled', function () {
      const bidderRequest = {
        fledgeEnabled: true,
      };
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
          params: {
            zoneId: 123,
            ext: {
              bidfloor: 0.75
            }
          },
          ortb2Imp: {
            ext: {
              ae: 1
            }
          }
        },
      ];

      const request = spec.buildRequests(bidRequests, bidderRequest);
      expect(request.data.slots[0].ext.ae).to.equal(1);
    });

    it('should properly build a request when FLEDGE is disabled', function () {
      const bidderRequest = {
        fledgeEnabled: false,
      };
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
          params: {
            zoneId: 123,
            ext: {
              bidfloor: 0.75
            }
          },
          ortb2Imp: {
            ext: {
              ae: 1
            }
          }
        },
      ];

      const request = spec.buildRequests(bidRequests, bidderRequest);
      expect(request.data.slots[0].ext).to.not.have.property('ae');
    });

    it('should properly transmit the pubid and slot uid if available', function () {
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
      const request = spec.buildRequests(bidRequests, bidderRequest);
      const ortbRequest = request.data;
      expect(ortbRequest.publisher.id).to.be.undefined;
      expect(ortbRequest.site.publisher.id).to.equal('pub-888');
      expect(request.data.slots[0].ext.bidder).to.be.undefined;
      expect(request.data.slots[1].ext.bidder.uid).to.equal(888);
    });

    it('should properly transmit device.ext.cdep if available', function () {
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
      const request = spec.buildRequests(bidRequests, bidderRequest);
      const ortbRequest = request.data;
      expect(ortbRequest.device.ext.cdep).to.equal('cookieDeprecationLabel');
    });
  });

  describe('interpretResponse', function () {
    it('should return an empty array when parsing a no bid response', function () {
      const response = {};
      const request = { bidRequests: [] };
      const bids = spec.interpretResponse(response, request);
      expect(bids).to.have.lengthOf(0);
    });

    it('should properly parse a bid response with a networkId', function () {
      const response = {
        body: {
          slots: [{
            impid: 'test-requestId',
            cpm: 1.23,
            creative: 'test-ad',
            creativecode: 'test-crId',
            width: 728,
            height: 90,
            deal: 'myDealCode',
            adomain: ['criteo.com'],
            ext: {
              meta: {
                networkName: 'Criteo'
              }
            }
          }],
        },
      };
      const request = {
        bidRequests: [{
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
        }]
      };
      const bids = spec.interpretResponse(response, request);
      expect(bids).to.have.lengthOf(1);
      expect(bids[0].requestId).to.equal('test-bidId');
      expect(bids[0].cpm).to.equal(1.23);
      expect(bids[0].ad).to.equal('test-ad');
      expect(bids[0].creativeId).to.equal('test-crId');
      expect(bids[0].width).to.equal(728);
      expect(bids[0].height).to.equal(90);
      expect(bids[0].dealId).to.equal('myDealCode');
      expect(bids[0].meta.advertiserDomains[0]).to.equal('criteo.com');
      expect(bids[0].meta.networkName).to.equal('Criteo');
    });

    it('should properly parse a bid response with dsa', function () {
      const response = {
        body: {
          slots: [{
            impid: 'test-requestId',
            cpm: 1.23,
            creative: 'test-ad',
            creativecode: 'test-crId',
            width: 728,
            height: 90,
            deal: 'myDealCode',
            adomain: ['criteo.com'],
            ext: {
              dsa: {
                adrender: 1
              },
              meta: {
                networkName: 'Criteo'
              }
            }
          }],
        },
      };
      const request = {
        bidRequests: [{
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
        }]
      };
      const bids = spec.interpretResponse(response, request);
      expect(bids).to.have.lengthOf(1);
      expect(bids[0].meta.dsa.adrender).to.equal(1);
    });

    it('should properly parse a bid response with a networkId with twin ad unit banner win', function () {
      const response = {
        body: {
          slots: [{
            impid: 'test-requestId',
            cpm: 1.23,
            creative: 'test-ad',
            creativecode: 'test-crId',
            width: 728,
            height: 90,
            deal: 'myDealCode',
            adomain: ['criteo.com'],
            ext: {
              meta: {
                networkName: 'Criteo'
              }
            }
          }],
        },
      };
      const request = {
        bidRequests: [{
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
        }]
      };
      const bids = spec.interpretResponse(response, request);
      expect(bids).to.have.lengthOf(1);
      expect(bids[0].requestId).to.equal('test-bidId2');
      expect(bids[0].cpm).to.equal(1.23);
      expect(bids[0].ad).to.equal('test-ad');
      expect(bids[0].creativeId).to.equal('test-crId');
      expect(bids[0].width).to.equal(728);
      expect(bids[0].height).to.equal(90);
      expect(bids[0].dealId).to.equal('myDealCode');
      expect(bids[0].meta.advertiserDomains[0]).to.equal('criteo.com');
      expect(bids[0].meta.networkName).to.equal('Criteo');
    });

    it('should properly parse a bid response with a networkId with twin ad unit video win', function () {
      const response = {
        body: {
          slots: [{
            impid: 'test-requestId',
            bidId: 'abc123',
            cpm: 1.23,
            displayurl: 'http://test-ad',
            width: 728,
            height: 90,
            zoneid: 123,
            video: true,
            ext: {
              meta: {
                networkName: 'Criteo'
              }
            }
          }],
        },
      };
      const request = {
        bidRequests: [{
          adUnitCode: 'test-requestId',
          bidId: 'test-bidId',
          mediaTypes: {
            video: {
              context: 'instream',
              mimes: ['video/mpeg'],
              playerSize: [728, 90],
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
        }]
      };
      const bids = spec.interpretResponse(response, request);
      expect(bids).to.have.lengthOf(1);
      expect(bids[0].requestId).to.equal('test-bidId');
      expect(bids[0].cpm).to.equal(1.23);
      expect(bids[0].vastUrl).to.equal('http://test-ad');
      expect(bids[0].mediaType).to.equal(VIDEO);
    });

    it('should properly parse a bid response with a networkId with twin ad unit native win', function () {
      const response = {
        body: {
          slots: [{
            impid: 'test-requestId',
            cpm: 1.23,
            creative: 'test-ad',
            creativecode: 'test-crId',
            width: 728,
            height: 90,
            deal: 'myDealCode',
            adomain: ['criteo.com'],
            native: {
              'products': [{
                'sendTargetingKeys': false,
                'title': 'Product title',
                'description': 'Product desc',
                'price': '100',
                'click_url': 'https://product.click',
                'image': {
                  'url': 'https://publisherdirect.criteo.com/publishertag/preprodtest/creative.png',
                  'height': 300,
                  'width': 300
                },
                'call_to_action': 'Try it now!'
              }],
              'advertiser': {
                'description': 'sponsor',
                'domain': 'criteo.com',
                'logo': { 'url': 'https://www.criteo.com/images/criteo-logo.svg', 'height': 300, 'width': 300 }
              },
              'privacy': {
                'optout_click_url': 'https://info.criteo.com/privacy/informations',
                'optout_image_url': 'https://static.criteo.net/flash/icon/nai_small.png',
              },
              'impression_pixels': [{ 'url': 'https://my-impression-pixel/test/impression' }, { 'url': 'https://cas.com/lg.com' }]
            },
            ext: {
              meta: {
                networkName: 'Criteo'
              }
            }
          }],
        },
      };
      const request = {
        bidRequests: [{
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
        }]
      };
      const bids = spec.interpretResponse(response, request);
      expect(bids).to.have.lengthOf(1);
      expect(bids[0].requestId).to.equal('test-bidId');
      expect(bids[0].cpm).to.equal(1.23);
      expect(bids[0].mediaType).to.equal(NATIVE);
    });

    it('should properly parse a bid response with a zoneId', function () {
      const response = {
        body: {
          slots: [{
            impid: 'test-requestId',
            bidId: 'abc123',
            cpm: 1.23,
            creative: 'test-ad',
            width: 728,
            height: 90,
            zoneid: 123,
          }],
        },
      };
      const request = {
        bidRequests: [{
          adUnitCode: 'test-requestId',
          bidId: 'test-bidId',
          params: {
            zoneId: 123,
          },
        }]
      };
      const bids = spec.interpretResponse(response, request);
      expect(bids).to.have.lengthOf(1);
      expect(bids[0].requestId).to.equal('test-bidId');
      expect(bids[0].cpm).to.equal(1.23);
      expect(bids[0].ad).to.equal('test-ad');
      expect(bids[0].width).to.equal(728);
      expect(bids[0].height).to.equal(90);
    });

    it('should properly parse a bid response with a video', function () {
      const response = {
        body: {
          slots: [{
            impid: 'test-requestId',
            bidId: 'abc123',
            cpm: 1.23,
            displayurl: 'http://test-ad',
            width: 728,
            height: 90,
            zoneid: 123,
            video: true
          }],
        },
      };
      const request = {
        bidRequests: [{
          adUnitCode: 'test-requestId',
          bidId: 'test-bidId',
          params: {
            zoneId: 123,
          },
        }]
      };
      const bids = spec.interpretResponse(response, request);
      expect(bids).to.have.lengthOf(1);
      expect(bids[0].requestId).to.equal('test-bidId');
      expect(bids[0].cpm).to.equal(1.23);
      expect(bids[0].vastUrl).to.equal('http://test-ad');
      expect(bids[0].mediaType).to.equal(VIDEO);
    });

    it('should properly parse a bid response with a outstream video', function () {
      const response = {
        body: {
          slots: [{
            impid: 'test-requestId',
            bidId: 'abc123',
            cpm: 1.23,
            displayurl: 'http://test-ad',
            width: 728,
            height: 90,
            zoneid: 123,
            video: true,
            ext: {
              videoPlayerType: 'RadiantMediaPlayer',
              videoPlayerConfig: {

              }
            }
          }],
        },
      };
      const request = {
        bidRequests: [{
          adUnitCode: 'test-requestId',
          bidId: 'test-bidId',
          params: {
            zoneId: 123,
          },
          mediaTypes: {
            video: {
              context: 'outstream'
            }
          }
        }]
      };
      const bids = spec.interpretResponse(response, request);
      expect(bids).to.have.lengthOf(1);
      expect(bids[0].requestId).to.equal('test-bidId');
      expect(bids[0].cpm).to.equal(1.23);
      expect(bids[0].vastUrl).to.equal('http://test-ad');
      expect(bids[0].renderer.url).to.equal('https://static.criteo.net/js/ld/publishertag.renderer.js');
      expect(typeof bids[0].renderer.config.documentResolver).to.equal('function');
      expect(typeof bids[0].renderer._render).to.equal('function');
    });

    it('should properly parse a bid response with native', function () {
      const response = {
        body: {
          slots: [{
            impid: 'test-requestId',
            bidId: 'abc123',
            cpm: 1.23,
            width: 728,
            height: 90,
            zoneid: 123,
            native: {
              'products': [{
                'sendTargetingKeys': false,
                'title': 'Product title',
                'description': 'Product desc',
                'price': '100',
                'click_url': 'https://product.click',
                'image': {
                  'url': 'https://publisherdirect.criteo.com/publishertag/preprodtest/creative.png',
                  'height': 300,
                  'width': 300
                },
                'call_to_action': 'Try it now!'
              }],
              'advertiser': {
                'description': 'sponsor',
                'domain': 'criteo.com',
                'logo': { 'url': 'https://www.criteo.com/images/criteo-logo.svg', 'height': 300, 'width': 300 }
              },
              'privacy': {
                'optout_click_url': 'https://info.criteo.com/privacy/informations',
                'optout_image_url': 'https://static.criteo.net/flash/icon/nai_small.png',
              },
              'impression_pixels': [{ 'url': 'https://my-impression-pixel/test/impression' }, { 'url': 'https://cas.com/lg.com' }]
            }
          }],
        },
      };
      const request = {
        bidRequests: [{
          adUnitCode: 'test-requestId',
          bidId: 'test-bidId',
          params: {
            zoneId: 123,
          },
          native: true,
        }]
      };
      const bids = spec.interpretResponse(response, request);
      expect(bids).to.have.lengthOf(1);
      expect(bids[0].requestId).to.equal('test-bidId');
      expect(bids[0].cpm).to.equal(1.23);
      expect(bids[0].mediaType).to.equal(NATIVE);
    });

    it('should warn only once if sendTargetingKeys set to true on required fields for native bidRequest', () => {
      const bidderRequest = {};
      const bidRequests = [
        {
          bidder: 'criteo',
          adUnitCode: 'bid-123',
          transactionId: 'transaction-123',
          sizes: [[728, 90]],
          params: {
            zoneId: 123,
            publisherSubId: '123',
            nativeCallback: function () { }
          },
        },
        {
          bidder: 'criteo',
          adUnitCode: 'bid-456',
          transactionId: 'transaction-456',
          sizes: [[728, 90]],
          params: {
            zoneId: 456,
            publisherSubId: '456',
            nativeCallback: function () { }
          },
        },
      ];

      const nativeParamsWithSendTargetingKeys = [
        {
          nativeParams: {
            image: {
              sendTargetingKeys: true
            },
          }
        },
        {
          nativeParams: {
            icon: {
              sendTargetingKeys: true
            },
          }
        },
        {
          nativeParams: {
            clickUrl: {
              sendTargetingKeys: true
            },
          }
        },
        {
          nativeParams: {
            displayUrl: {
              sendTargetingKeys: true
            },
          }
        },
        {
          nativeParams: {
            privacyLink: {
              sendTargetingKeys: true
            },
          }
        },
        {
          nativeParams: {
            privacyIcon: {
              sendTargetingKeys: true
            },
          }
        }
      ];

      utilsMock.expects('logWarn')
        .withArgs('Criteo: all native assets containing URL should be sent as placeholders with sendId(icon, image, clickUrl, displayUrl, privacyLink, privacyIcon)')
        .exactly(nativeParamsWithSendTargetingKeys.length * bidRequests.length);
      nativeParamsWithSendTargetingKeys.forEach(nativeParams => {
        let transformedBidRequests = { ...bidRequests };
        transformedBidRequests = [Object.assign(transformedBidRequests[0], nativeParams), Object.assign(transformedBidRequests[1], nativeParams)];
        spec.buildRequests(transformedBidRequests, bidderRequest);
      });
      utilsMock.verify();
    });

    it('should properly parse a bid response with a zoneId passed as a string', function () {
      const response = {
        body: {
          slots: [{
            impid: 'test-requestId',
            cpm: 1.23,
            creative: 'test-ad',
            width: 728,
            height: 90,
            zoneid: 123,
          }],
        },
      };
      const request = {
        bidRequests: [{
          adUnitCode: 'test-requestId',
          bidId: 'test-bidId',
          params: {
            zoneId: '123',
          },
        }]
      };
      const bids = spec.interpretResponse(response, request);
      expect(bids).to.have.lengthOf(1);
      expect(bids[0].requestId).to.equal('test-bidId');
      expect(bids[0].cpm).to.equal(1.23);
      expect(bids[0].ad).to.equal('test-ad');
      expect(bids[0].width).to.equal(728);
      expect(bids[0].height).to.equal(90);
    });

    it('should properly parse a bid response with FLEDGE auction configs', function () {
      let auctionConfig1 = {
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
      let auctionConfig2 = {
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
      const response = {
        body: {
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
        },
      };
      const bidderRequest = {
        ortb2: {
          source: {
            tid: 'abc'
          }
        }
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
      const request = spec.buildRequests(bidRequests, bidderRequest);
      const interpretedResponse = spec.interpretResponse(response, request);
      expect(interpretedResponse).to.have.property('bids');
      expect(interpretedResponse).to.have.property('fledgeAuctionConfigs');
      expect(interpretedResponse.bids).to.have.lengthOf(0);
      expect(interpretedResponse.fledgeAuctionConfigs).to.have.lengthOf(2);
      expect(interpretedResponse.fledgeAuctionConfigs[0]).to.deep.equal({
        bidId: 'test-bidId',
        impid: 'test-bidId',
        config: auctionConfig1,
      });
      expect(interpretedResponse.fledgeAuctionConfigs[1]).to.deep.equal({
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
    }].forEach(testCase => {
      const bidPafContentId = 'abcdef';
      const pafTransmission = {
        version: '12'
      };
      const response = {
        slots: [
          {
            width: 300,
            height: 250,
            cpm: 10,
            impid: 'adUnitId',
            ext: (testCase.hasBidResponseBidLevelPafData ? {
              paf: {
                content_id: bidPafContentId
              }
            } : undefined)
          }
        ],
        ext: (testCase.hasBidResponseLevelPafData ? {
          paf: {
            transmission: pafTransmission
          }
        } : undefined)
      };

      const request = {
        bidRequests: [{
          adUnitCode: 'adUnitId',
          sizes: [[300, 250]],
          params: {
            networkId: 456,
          }
        }]
      };

      const bids = spec.interpretResponse(response, request);

      expect(bids).to.have.lengthOf(1);

      const theoreticalBidMetaPafData = {
        paf: {
          content_id: bidPafContentId,
          transmission: pafTransmission
        }
      };

      if (testCase.shouldContainsBidMetaPafData) {
        expect(bids[0].meta).to.deep.equal(theoreticalBidMetaPafData);
      } else {
        expect(bids[0].meta).not.to.deep.equal(theoreticalBidMetaPafData);
      }
    });
  });

  describe('canFastBid', function () {
    it('should properly detect if can do fastbid', function () {
      const testCasesAndExpectedResult = [['none', false], ['', true], [undefined, true], [123, true]];
      testCasesAndExpectedResult.forEach(testCase => {
        const result = canFastBid(testCase[0]);
        expect(result).to.equal(testCase[1]);
      })
    });
  });

  describe('getFastBidUrl', function () {
    it('should properly detect the version of fastbid', function () {
      const testCasesAndExpectedResult = [
        ['', 'https://static.criteo.net/js/ld/publishertag.prebid.' + FAST_BID_VERSION_CURRENT + '.js'],
        [undefined, 'https://static.criteo.net/js/ld/publishertag.prebid.' + FAST_BID_VERSION_CURRENT + '.js'],
        [null, 'https://static.criteo.net/js/ld/publishertag.prebid.' + FAST_BID_VERSION_CURRENT + '.js'],
        [NaN, 'https://static.criteo.net/js/ld/publishertag.prebid.' + FAST_BID_VERSION_CURRENT + '.js'],
        [123, 'https://static.criteo.net/js/ld/publishertag.prebid.123.js'],
        ['123', 'https://static.criteo.net/js/ld/publishertag.prebid.123.js'],
        ['latest', 'https://static.criteo.net/js/ld/publishertag.prebid.js']
      ];
      testCasesAndExpectedResult.forEach(testCase => {
        const result = getFastBidUrl(testCase[0]);
        expect(result).to.equal(testCase[1]);
      })
    });
  });

  describe('tryGetCriteoFastBid', function () {
    const VALID_HASH = 'vBeD8Q7GU6lypFbzB07W8hLGj7NL+p7dI9ro2tCxkrmyv0F6stNuoNd75Us33iNKfEoW+cFWypelr6OJPXxki2MXWatRhJuUJZMcK4VBFnxi3Ro+3a0xEfxE4jJm4eGe98iC898M+/YFHfp+fEPEnS6pEyw124ONIFZFrcejpHU=';
    const INVALID_HASH = 'invalid';
    const VALID_PUBLISHER_TAG = 'test';
    const INVALID_PUBLISHER_TAG = 'test invalid';

    const FASTBID_LOCAL_STORAGE_KEY = 'criteo_fast_bid';

    it('should verify valid hash with valid publisher tag', function () {
      localStorage.setItem(FASTBID_LOCAL_STORAGE_KEY, '// Hash: ' + VALID_HASH + '\n' + VALID_PUBLISHER_TAG);

      utilsMock.expects('logInfo').withExactArgs('Using Criteo FastBid').once();
      utilsMock.expects('logWarn').withExactArgs('No hash found in FastBid').never();
      utilsMock.expects('logWarn').withExactArgs('Invalid Criteo FastBid found').never();

      tryGetCriteoFastBid();

      expect(localStorage.getItem(FASTBID_LOCAL_STORAGE_KEY)).to.equals('// Hash: ' + VALID_HASH + '\n' + VALID_PUBLISHER_TAG);
      utilsMock.verify();
    });

    it('should verify valid hash with invalid publisher tag', function () {
      localStorage.setItem(FASTBID_LOCAL_STORAGE_KEY, '// Hash: ' + VALID_HASH + '\n' + INVALID_PUBLISHER_TAG);

      utilsMock.expects('logInfo').withExactArgs('Using Criteo FastBid').never();
      utilsMock.expects('logWarn').withExactArgs('No hash found in FastBid').never();
      utilsMock.expects('logWarn').withExactArgs('Invalid Criteo FastBid found').once();

      tryGetCriteoFastBid();

      expect(localStorage.getItem(FASTBID_LOCAL_STORAGE_KEY)).to.be.null;
      utilsMock.verify();
    });

    it('should verify invalid hash with valid publisher tag', function () {
      localStorage.setItem(FASTBID_LOCAL_STORAGE_KEY, '// Hash: ' + INVALID_HASH + '\n' + VALID_PUBLISHER_TAG);

      utilsMock.expects('logInfo').withExactArgs('Using Criteo FastBid').never();
      utilsMock.expects('logWarn').withExactArgs('No hash found in FastBid').never();
      utilsMock.expects('logWarn').withExactArgs('Invalid Criteo FastBid found').once();

      tryGetCriteoFastBid();

      expect(localStorage.getItem(FASTBID_LOCAL_STORAGE_KEY)).to.be.null;
      utilsMock.verify();
    });

    it('should verify missing hash', function () {
      localStorage.setItem(FASTBID_LOCAL_STORAGE_KEY, VALID_PUBLISHER_TAG);

      utilsMock.expects('logInfo').withExactArgs('Using Criteo FastBid').never();
      utilsMock.expects('logWarn').withExactArgs('No hash found in FastBid').once();
      utilsMock.expects('logWarn').withExactArgs('Invalid Criteo FastBid found').never();

      tryGetCriteoFastBid();

      expect(localStorage.getItem(FASTBID_LOCAL_STORAGE_KEY)).to.be.null;
      utilsMock.verify();
    });
  });

  describe('when pubtag prebid adapter is not available', function () {
    it('should not warn if sendId is provided on required fields for native bidRequest', () => {
      const bidderRequest = {};
      const bidRequestsWithSendId = [
        {
          bidder: 'criteo',
          adUnitCode: 'bid-123',
          transactionId: 'transaction-123',
          sizes: [[728, 90]],
          params: {
            zoneId: 123,
            publisherSubId: '123',
            nativeCallback: function () { }
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

      utilsMock.expects('logWarn').withArgs('Criteo: all native assets containing URL should be sent as placeholders with sendId(icon, image, clickUrl, displayUrl, privacyLink, privacyIcon)').never();
      const request = spec.buildRequests(bidRequestsWithSendId, bidderRequest);
      utilsMock.verify();
    });

    it('should warn only once if sendId is not provided on required fields for native bidRequest', () => {
      const bidderRequest = {};
      const bidRequests = [
        {
          bidder: 'criteo',
          adUnitCode: 'bid-123',
          transactionId: 'transaction-123',
          sizes: [[728, 90]],
          params: {
            zoneId: 123,
            publisherSubId: '123',
            nativeCallback: function () { }
          },
        },
        {
          bidder: 'criteo',
          adUnitCode: 'bid-456',
          transactionId: 'transaction-456',
          sizes: [[728, 90]],
          params: {
            zoneId: 456,
            publisherSubId: '456',
            nativeCallback: function () { }
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

      utilsMock.expects('logWarn')
        .withArgs('Criteo: all native assets containing URL should be sent as placeholders with sendId(icon, image, clickUrl, displayUrl, privacyLink, privacyIcon)')
        .exactly(nativeParamsWithoutSendId.length * bidRequests.length);
      nativeParamsWithoutSendId.forEach(nativeParams => {
        let transformedBidRequests = { ...bidRequests };
        transformedBidRequests = [Object.assign(transformedBidRequests[0], nativeParams), Object.assign(transformedBidRequests[1], nativeParams)];
        spec.buildRequests(transformedBidRequests, bidderRequest);
      });
      utilsMock.verify();
    });
  });

  describe('when pubtag prebid adapter is available', function () {
    it('should forward response to pubtag when calling interpretResponse', () => {
      const response = {};
      const request = {};

      const adapter = { interpretResponse: function () { } };
      const adapterMock = sinon.mock(adapter);
      adapterMock.expects('interpretResponse').withExactArgs(response, request).once().returns('ok');
      const prebidAdapter = { GetAdapter: function () { } };
      const prebidAdapterMock = sinon.mock(prebidAdapter);
      prebidAdapterMock.expects('GetAdapter').withExactArgs(request).once().returns(adapter);

      global.Criteo = {
        PubTag: {
          Adapters: {
            Prebid: prebidAdapter
          }
        }
      };

      expect(spec.interpretResponse(response, request)).equal('ok');
      adapterMock.verify();
      prebidAdapterMock.verify();
    });

    it('should forward bid to pubtag when calling onBidWon', () => {
      const bid = { auctionId: 123 };

      const adapter = { handleBidWon: function () { } };
      const adapterMock = sinon.mock(adapter);
      adapterMock.expects('handleBidWon').withExactArgs(bid).once();
      const prebidAdapter = { GetAdapter: function () { } };
      const prebidAdapterMock = sinon.mock(prebidAdapter);
      prebidAdapterMock.expects('GetAdapter').withExactArgs(bid.auctionId).once().returns(adapter);

      global.Criteo = {
        PubTag: {
          Adapters: {
            Prebid: prebidAdapter
          }
        }
      };

      spec.onBidWon(bid);
      adapterMock.verify();
      prebidAdapterMock.verify();
    });

    it('should forward bid to pubtag when calling onSetTargeting', () => {
      const bid = { auctionId: 123 };

      const adapter = { handleSetTargeting: function () { } };
      const adapterMock = sinon.mock(adapter);
      adapterMock.expects('handleSetTargeting').withExactArgs(bid).once();
      const prebidAdapter = { GetAdapter: function () { } };
      const prebidAdapterMock = sinon.mock(prebidAdapter);
      prebidAdapterMock.expects('GetAdapter').withExactArgs(bid.auctionId).once().returns(adapter);

      global.Criteo = {
        PubTag: {
          Adapters: {
            Prebid: prebidAdapter
          }
        }
      };

      spec.onSetTargeting(bid);
      adapterMock.verify();
      prebidAdapterMock.verify();
    });

    it('should forward bid to pubtag when calling onTimeout', () => {
      const timeoutData = [{ auctionId: 123 }];

      const adapter = { handleBidTimeout: function () { } };
      const adapterMock = sinon.mock(adapter);
      adapterMock.expects('handleBidTimeout').once();
      const prebidAdapter = { GetAdapter: function () { } };
      const prebidAdapterMock = sinon.mock(prebidAdapter);
      prebidAdapterMock.expects('GetAdapter').withExactArgs(timeoutData[0].auctionId).once().returns(adapter);

      global.Criteo = {
        PubTag: {
          Adapters: {
            Prebid: prebidAdapter
          }
        }
      };

      spec.onTimeout(timeoutData);
      adapterMock.verify();
      prebidAdapterMock.verify();
    });

    it('should return a POST method with url & data from pubtag', () => {
      const bidRequests = {};
      const bidderRequest = {};

      const prebidAdapter = { buildCdbUrl: function () { }, buildCdbRequest: function () { } };
      const prebidAdapterMock = sinon.mock(prebidAdapter);
      prebidAdapterMock.expects('buildCdbUrl').once().returns('cdbUrl');
      prebidAdapterMock.expects('buildCdbRequest').once().returns('cdbRequest');

      const adapters = { Prebid: function () { } };
      const adaptersMock = sinon.mock(adapters);
      adaptersMock.expects('Prebid').withExactArgs(PROFILE_ID_PUBLISHERTAG, ADAPTER_VERSION, bidRequests, bidderRequest, '$prebid.version$', sinon.match.any).once().returns(prebidAdapter);

      global.Criteo = {
        PubTag: {
          Adapters: adapters
        }
      };

      const buildRequestsResult = spec.buildRequests(bidRequests, bidderRequest);
      expect(buildRequestsResult.method).equal('POST');
      expect(buildRequestsResult.url).equal('cdbUrl');
      expect(buildRequestsResult.data).equal('cdbRequest');

      adaptersMock.verify();
      prebidAdapterMock.verify();
    });
  });
});
