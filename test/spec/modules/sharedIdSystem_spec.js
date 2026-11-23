import { sharedIdSystemSubmodule, resetPixelStorageWarning } from 'modules/sharedIdSystem.js';
import { config } from 'src/config.js';

import sinon from 'sinon';
import * as utils from 'src/utils.js';
import { createEidsArray } from '../../../modules/userId/eids.js';
import { attachIdSystem } from '../../../modules/userId/index.js';
import { getGlobal } from '../../../src/prebidGlobal.js';

const expect = require('chai').expect;

describe('SharedId System', function () {
  const UUID = '15fde1dc-1861-4894-afdf-b757272f3568';

  before(function () {
    sinon.stub(utils, 'generateUUID').returns(UUID);
    sinon.stub(utils, 'logInfo');
  });

  after(function () {
    utils.generateUUID.restore();
    utils.logInfo.restore();
  });
  describe('SharedId System getId()', function () {
    const callbackSpy = sinon.spy();

    let sandbox;

    beforeEach(function () {
      sandbox = sinon.createSandbox();
      sandbox.stub(utils, 'hasDeviceAccess').returns(true);
      callbackSpy.resetHistory();
    });

    afterEach(function () {
      sandbox.restore();
    });

    it('should call UUID', function () {
      const config = {
        storage: {
          type: 'cookie',
          name: '_pubcid',
          expires: 10
        }
      };

      const submoduleCallback = sharedIdSystemSubmodule.getId(config, undefined).callback;
      submoduleCallback(callbackSpy);
      expect(callbackSpy.calledOnce).to.be.true;
      expect(callbackSpy.lastCall.lastArg).to.equal(UUID);
    });
    describe('with pixelUrl', function () {
      const config = {
        params: {
          pixelUrl: '/wp-json/pubcid/v1/extend/'
        },
        storage: {
          type: 'cookie',
          name: '_pubcid',
          expires: 10
        }
      };
      let pixelDone, clock;

      beforeEach(function () {
        pixelDone = null;
        clock = sandbox.useFakeTimers();
        sandbox.stub(utils, 'triggerPixel').callsFake((url, done) => { pixelDone = done; });
      });

      it('should still return the new id along with the callback', function () {
        const result = sharedIdSystemSubmodule.getId(config, undefined);
        expect(result.id).to.equal(UUID);
        expect(result.callback).to.be.a('function');
      });

      function storageHolding(read) {
        return { get: sinon.spy(read), manage: sinon.spy(), set: sinon.spy(), touch: sinon.spy(), remove: sinon.spy() };
      }

      function expectAdopted(storage, id) {
        sinon.assert.calledOnce(callbackSpy);
        sinon.assert.calledWithExactly(callbackSpy, id);
        sinon.assert.calledOnce(storage.touch);
        // the handle only accepts storage calls until the invocation reports its ID
        sinon.assert.callOrder(storage.touch, callbackSpy);
        sinon.assert.notCalled(storage.set);
        sinon.assert.notCalled(storage.remove);
      }

      it('should fire the pixel with the new id and complete once it has loaded', function () {
        sharedIdSystemSubmodule.getId(config, undefined, undefined, storageHolding(() => 'restored-by-server')).callback(callbackSpy);
        sinon.assert.calledOnce(utils.triggerPixel);
        expect(utils.triggerPixel.firstCall.args[0]).to.include('/wp-json/pubcid/v1/extend/');
        expect(utils.triggerPixel.firstCall.args[0]).to.include(UUID);
        sinon.assert.notCalled(callbackSpy);
        pixelDone();
        // storage is read on the next task, so the callback has not completed yet
        sinon.assert.notCalled(callbackSpy);
        clock.tick(0);
        sinon.assert.calledOnce(callbackSpy);
      });

      it('should keep the minted id without writing it again when storage still holds it after the re-check', function () {
        const storage = storageHolding(() => UUID);
        sharedIdSystemSubmodule.getId(config, undefined, undefined, storage).callback(callbackSpy);
        pixelDone();
        clock.tick(0);
        // storage still holds the minted id, so it is read again a little later
        sinon.assert.notCalled(callbackSpy);
        clock.tick(50);
        expectAdopted(storage, UUID);
      });

      it('should adopt the id the server generated when create is false and getId returned none', function () {
        const noCreate = { ...config, params: { ...config.params, create: false } };
        const storage = storageHolding(() => 'server-generated-id');
        const result = sharedIdSystemSubmodule.getId(noCreate, undefined, undefined, storage);
        expect(result.id).to.be.undefined;
        result.callback(callbackSpy);
        pixelDone();
        clock.tick(0);
        expectAdopted(storage, 'server-generated-id');
      });

      it('should adopt a different id the server set, for example one it restored, without writing it again', function () {
        const storage = storageHolding(() => 'restored-by-server');
        sharedIdSystemSubmodule.getId(config, undefined, undefined, storage).callback(callbackSpy);
        pixelDone();
        clock.tick(0);
        expectAdopted(storage, 'restored-by-server');
      });

      it('should adopt an id that only becomes visible in storage after the pixel load event', function () {
        // In some WebKit builds the pixel response's Set-Cookie is not yet applied at the load
        // event, so storage still holds the minted id synchronously; it shows the restored id
        // by the next task (see #16158).
        let storedId = UUID;
        const storage = storageHolding(() => storedId);
        sharedIdSystemSubmodule.getId(config, undefined, undefined, storage).callback(callbackSpy);
        pixelDone();
        storedId = 'restored-by-server';
        clock.tick(0);
        expectAdopted(storage, 'restored-by-server');
      });

      it('should adopt an id that only becomes visible in storage at the re-check', function () {
        let storedId = UUID;
        const storage = storageHolding(() => storedId);
        sharedIdSystemSubmodule.getId(config, undefined, undefined, storage).callback(callbackSpy);
        pixelDone();
        clock.tick(0);
        sinon.assert.notCalled(callbackSpy);
        storedId = 'restored-by-server';
        clock.tick(50);
        expectAdopted(storage, 'restored-by-server');
      });

      it('should drop the id when the server removed the cookie', function () {
        // e.g. the endpoint deleted it for Global Privacy Control or denied consent
        const storage = storageHolding(() => undefined);
        sharedIdSystemSubmodule.getId(config, undefined, undefined, storage).callback(callbackSpy);
        pixelDone();
        clock.tick(0);
        // nothing stored could be a cookie not visible yet, so it is read again a little later
        sinon.assert.notCalled(callbackSpy);
        clock.tick(50);
        sinon.assert.calledOnce(callbackSpy);
        sinon.assert.calledWithExactly(callbackSpy);
        sinon.assert.calledOnce(storage.remove);
        sinon.assert.callOrder(storage.remove, callbackSpy);
        sinon.assert.notCalled(storage.set);
        sinon.assert.notCalled(storage.touch);
      });

      describe('with create: false', function () {
        const noCreate = { ...config, params: { ...config.params, create: false } };

        it('should adopt a server id that only becomes visible at the re-check', function () {
          let storedId;
          const storage = storageHolding(() => storedId);
          sharedIdSystemSubmodule.getId(noCreate, undefined, undefined, storage).callback(callbackSpy);
          pixelDone();
          clock.tick(0);
          sinon.assert.notCalled(callbackSpy);
          storedId = 'server-generated-id';
          clock.tick(50);
          expectAdopted(storage, 'server-generated-id');
        });

        it('should not delete anything when the server set no id', function () {
          const storage = storageHolding(() => undefined);
          sharedIdSystemSubmodule.getId(noCreate, undefined, undefined, storage).callback(callbackSpy);
          pixelDone();
          clock.tick(50);
          sinon.assert.calledOnce(callbackSpy);
          sinon.assert.calledWithExactly(callbackSpy);
          sinon.assert.notCalled(storage.remove);
          sinon.assert.notCalled(storage.touch);
        });
      });

      it('should keep the id without following storage when no storage is configured', function () {
        const storage = storageHolding(() => 'restored-by-server');
        sharedIdSystemSubmodule.getId({ params: config.params }, undefined, undefined, storage).callback(callbackSpy);
        pixelDone();
        clock.tick(50);
        sinon.assert.calledOnce(callbackSpy);
        sinon.assert.calledWithExactly(callbackSpy);
        sinon.assert.notCalled(storage.get);
        sinon.assert.notCalled(storage.touch);
        sinon.assert.notCalled(storage.remove);
      });

      it('should keep an id that is already stored without writing it again before the pixel', function () {
        const storage = storageHolding(() => 'stored-id');
        const result = sharedIdSystemSubmodule.getId(config, undefined, 'stored-id', storage);
        expect(result.id).to.equal('stored-id');
        sinon.assert.calledOnce(storage.manage);
        sinon.assert.notCalled(storage.set);
        sinon.assert.notCalled(storage.touch);
      });

      it('should let the User ID module store a newly minted id before the pixel', function () {
        const storage = storageHolding(() => undefined);
        sharedIdSystemSubmodule.getId(config, undefined, undefined, storage);
        sinon.assert.notCalled(storage.manage);
        sinon.assert.notCalled(storage.touch);
      });
    });
    it('should abort if coppa is set', function () {
      const result = sharedIdSystemSubmodule.getId({}, { coppa: true });
      expect(result).to.be.undefined;
    });
  });
  describe('SharedId System extendId()', function () {
    const callbackSpy = sinon.spy();
    let sandbox;

    beforeEach(function () {
      sandbox = sinon.createSandbox();
      sandbox.stub(utils, 'hasDeviceAccess').returns(true);
      callbackSpy.resetHistory();
    });
    afterEach(function () {
      sandbox.restore();
    });
    it('should call UUID', function () {
      const config = {
        params: {
          extend: true
        },
        storage: {
          type: 'cookie',
          name: '_pubcid',
          expires: 10
        }
      };
      const pubcommId = sharedIdSystemSubmodule.extendId(config, undefined, 'TestId').id;
      expect(pubcommId).to.equal('TestId');
    });
    describe('with pixelUrl', function () {
      const config = {
        params: {
          extend: true,
          pixelUrl: '/wp-json/pubcid/v1/extend/'
        },
        storage: {
          type: 'cookie',
          name: '_pubcid',
          expires: 10
        }
      };
      let pixelDone, clock;

      beforeEach(function () {
        pixelDone = null;
        clock = sandbox.useFakeTimers();
        sandbox.stub(utils, 'triggerPixel').callsFake((url, done) => { pixelDone = done; });
      });

      function storageHolding(value) {
        return { get: sinon.stub().returns(value), manage: sinon.spy(), set: sinon.spy(), touch: sinon.spy(), remove: sinon.spy() };
      }

      it('should return only a callback, not the id', function () {
        const result = sharedIdSystemSubmodule.extendId(config, undefined, 'TestId');
        expect(result.id).to.be.undefined;
        expect(result.callback).to.be.a('function');
      });

      it('should fire the pixel with the stored id', function () {
        sharedIdSystemSubmodule.extendId(config, undefined, 'TestId', storageHolding('TestId')).callback(callbackSpy);
        sinon.assert.calledOnce(utils.triggerPixel);
        expect(utils.triggerPixel.firstCall.args[0]).to.include('/wp-json/pubcid/v1/extend/');
        expect(utils.triggerPixel.firstCall.args[0]).to.include('TestId');
      });

      it('should keep the id without writing it again once the pixel has loaded', function () {
        const storage = storageHolding('TestId');
        sharedIdSystemSubmodule.extendId(config, undefined, 'TestId', storage).callback(callbackSpy);
        sinon.assert.notCalled(callbackSpy);
        pixelDone();
        clock.tick(50);
        sinon.assert.calledOnce(callbackSpy);
        sinon.assert.calledWithExactly(callbackSpy, 'TestId');
        sinon.assert.calledOnce(storage.touch);
        sinon.assert.notCalled(storage.set);
      });

      it('should drop the stored id when the server removed the cookie', function () {
        const storage = storageHolding(undefined);
        sharedIdSystemSubmodule.extendId(config, undefined, 'TestId', storage).callback(callbackSpy);
        pixelDone();
        clock.tick(50);
        sinon.assert.calledOnce(callbackSpy);
        sinon.assert.calledWithExactly(callbackSpy);
        sinon.assert.calledOnce(storage.remove);
      });
    });
    it('should abort if coppa is set', function () {
      const result = sharedIdSystemSubmodule.extendId({ params: { extend: true } }, { coppa: true }, 'TestId');
      expect(result).to.be.undefined;
    });
  });
  describe('pixelConsent and pixelCookieDomain', function () {
    const PIXEL_URL = '/wp-json/pubcid/v1/extend/';
    const TC_STRING = 'CPx1VfLPx1VfLAcABBENC-CgAP_AAH_AAAAAJ5NV_H__bX9n-';
    const GPP_STRING = 'DBABMA~CPx1VfLPx1VfLAcABBENC-CgAP_AAH_AAAAAJ5NV_H__bX9n-';
    const FULL_CONSENT = {
      gdpr: { gdprApplies: true, consentString: TC_STRING },
      usp: '1YNN',
      gpp: { gppString: GPP_STRING, applicableSections: [2, 7] }
    };
    const PLAIN_URL = `${window.location.protocol}//${window.location.host}${PIXEL_URL}?id=pubcid%3A`;
    let sandbox;

    beforeEach(function () {
      sandbox = sinon.createSandbox();
      sandbox.stub(utils, 'hasDeviceAccess').returns(true);
      sandbox.useFakeTimers();
      sandbox.stub(utils, 'triggerPixel');
      sandbox.stub(sharedIdSystemSubmodule, 'domainOverride').returns('example.com');
    });

    afterEach(function () {
      sandbox.restore();
    });

    function getIdPixel(params, consentData) {
      sharedIdSystemSubmodule.getId({ params: { pixelUrl: PIXEL_URL, ...params } }, consentData).callback(sinon.stub());
      sinon.assert.calledOnce(utils.triggerPixel);
      return utils.triggerPixel.firstCall.args[0];
    }

    function extendIdPixel(params, consentData) {
      sharedIdSystemSubmodule.extendId({ params: { pixelUrl: PIXEL_URL, extend: true, ...params } }, consentData, 'TestId').callback(sinon.stub());
      sinon.assert.calledOnce(utils.triggerPixel);
      return utils.triggerPixel.firstCall.args[0];
    }

    function queryOf(url) {
      return Object.fromEntries(new URL(url).searchParams.entries());
    }

    Object.entries({ getId: [getIdPixel, UUID], extendId: [extendIdPixel, 'TestId'] }).forEach(([method, [firePixel, id]]) => {
      describe(`${method}'s pixel`, function () {
        ['restored-by-server', undefined].forEach(storedId => {
          it(`should follow the server cookie (${storedId}) with both pixel params enabled`, function () {
            const handle = {
              get: sinon.stub().returns(storedId),
              touch: sinon.spy(),
              remove: sinon.spy()
            };
            const setId = sinon.spy();
            const config = {
              params: { pixelUrl: PIXEL_URL, extend: true, pixelConsent: true, pixelCookieDomain: true },
              storage: { type: 'cookie', name: '_pubcid', expires: 10 }
            };
            const result = sharedIdSystemSubmodule[method](config, FULL_CONSENT, method === 'getId' ? undefined : id, handle);
            sinon.assert.notCalled(sharedIdSystemSubmodule.domainOverride);
            result.callback(setId);
            expect(queryOf(utils.triggerPixel.firstCall.args[0])).to.include({
              id: `pubcid:${id}`,
              gdpr_consent: TC_STRING,
              cookie_domain: 'example.com'
            });
            sinon.assert.notCalled(setId);
            utils.triggerPixel.firstCall.args[1]();
            sandbox.clock.tick(50);
            if (storedId) {
              sinon.assert.calledWithExactly(setId, storedId);
              sinon.assert.calledOnce(handle.touch);
              sinon.assert.notCalled(handle.remove);
            } else {
              sinon.assert.calledWithExactly(setId);
              sinon.assert.calledOnce(handle.remove);
              sinon.assert.notCalled(handle.touch);
            }
            sinon.assert.calledOnce(setId);
          });
        });

        it('should be unchanged without pixelConsent, even with consent data', function () {
          expect(firePixel({}, FULL_CONSENT)).to.equal(PLAIN_URL + id);
        });

        it('should be unchanged with pixelConsent: false', function () {
          expect(firePixel({ pixelConsent: false }, FULL_CONSENT)).to.equal(PLAIN_URL + id);
        });

        it('should be unchanged with pixelConsent but no consent data', function () {
          expect(firePixel({ pixelConsent: true }, undefined)).to.equal(PLAIN_URL + id);
          utils.triggerPixel.resetHistory();
          expect(firePixel({ pixelConsent: true }, { gdpr: null, usp: null, gpp: null, coppa: false })).to.equal(PLAIN_URL + id);
        });

        it('should carry every consent param with full consent data', function () {
          const url = firePixel({ pixelConsent: true }, FULL_CONSENT);
          expect(url).to.equal(PLAIN_URL + id +
            `&gdpr=1&gdpr_consent=${TC_STRING}&us_privacy=1YNN&gpp=${GPP_STRING}&gpp_sid=2,7`);
          expect(queryOf(url)).to.eql({
            id: `pubcid:${id}`,
            gdpr: '1',
            gdpr_consent: TC_STRING,
            us_privacy: '1YNN',
            gpp: GPP_STRING,
            gpp_sid: '2,7'
          });
        });

        it('should send gdpr=0 when GDPR does not apply', function () {
          expect(queryOf(firePixel({ pixelConsent: true }, { gdpr: { gdprApplies: false, consentString: TC_STRING } }))).to.eql({
            id: `pubcid:${id}`,
            gdpr: '0',
            gdpr_consent: TC_STRING
          });
        });

        it('should leave out gdpr when GDPR applicability is unknown, and an empty consent string', function () {
          expect(queryOf(firePixel({ pixelConsent: true }, { gdpr: { consentString: '' } }))).to.eql({
            id: `pubcid:${id}`
          });
        });

        it('should send only us_privacy with only USP data', function () {
          expect(queryOf(firePixel({ pixelConsent: true }, { usp: '1YNN' }))).to.eql({
            id: `pubcid:${id}`,
            us_privacy: '1YNN'
          });
        });

        it('should send only gpp and gpp_sid with only GPP data', function () {
          expect(queryOf(firePixel({ pixelConsent: true }, { gpp: { gppString: GPP_STRING, applicableSections: [7] } }))).to.eql({
            id: `pubcid:${id}`,
            gpp: GPP_STRING,
            gpp_sid: '7'
          });
        });

        it('should leave out an empty gpp_sid', function () {
          expect(queryOf(firePixel({ pixelConsent: true }, { gpp: { gppString: GPP_STRING, applicableSections: [] } }))).to.eql({
            id: `pubcid:${id}`,
            gpp: GPP_STRING
          });
        });

        it('should keep the query params already in pixelUrl', function () {
          const url = firePixel({ pixelUrl: `${PIXEL_URL}?site=1`, pixelConsent: true }, { usp: '1YNN' });
          expect(queryOf(url)).to.eql({
            site: '1',
            id: `pubcid:${id}`,
            us_privacy: '1YNN'
          });
        });

        it('should not look up the cookie domain without pixelCookieDomain', function () {
          firePixel({ pixelConsent: true }, FULL_CONSENT);
          utils.triggerPixel.resetHistory();
          expect(firePixel({ pixelCookieDomain: false }, FULL_CONSENT)).to.equal(PLAIN_URL + id);
          sinon.assert.notCalled(sharedIdSystemSubmodule.domainOverride);
        });

        it('should send cookie_domain with pixelCookieDomain', function () {
          const url = firePixel({ pixelCookieDomain: true }, FULL_CONSENT);
          expect(url).to.equal(PLAIN_URL + id + '&cookie_domain=example.com');
          sinon.assert.calledOnce(sharedIdSystemSubmodule.domainOverride);
        });

        it('should send both consent and cookie_domain with pixelConsent and pixelCookieDomain', function () {
          expect(queryOf(firePixel({ pixelConsent: true, pixelCookieDomain: true }, { usp: '1YNN', gdpr: { gdprApplies: false } }))).to.eql({
            id: `pubcid:${id}`,
            gdpr: '0',
            us_privacy: '1YNN',
            cookie_domain: 'example.com'
          });
        });

        it('should leave out cookie_domain when no domain is determined', function () {
          sharedIdSystemSubmodule.domainOverride.returns(undefined);
          expect(firePixel({ pixelCookieDomain: true }, undefined)).to.equal(PLAIN_URL + id);
        });

        it('should send the domain the module writes the cookie on', function () {
          const expected = sharedIdSystemSubmodule.domainOverride.wrappedMethod();
          sharedIdSystemSubmodule.domainOverride.callThrough();
          const query = queryOf(firePixel({ pixelCookieDomain: true }, undefined));
          expect(query.cookie_domain).to.equal(expected);
        });
      });
    });
  });

  describe('pixelUrl with storage other than cookies', function () {
    let sandbox;

    beforeEach(function () {
      sandbox = sinon.createSandbox();
      sandbox.stub(utils, 'hasDeviceAccess').returns(true);
      sandbox.stub(utils, 'triggerPixel');
      sandbox.stub(utils, 'logWarn');
      resetPixelStorageWarning();
    });

    afterEach(function () {
      sandbox.restore();
      resetPixelStorageWarning();
    });

    function cfg(type, params = { pixelUrl: '/wp-json/pubcid/v1/extend/' }) {
      return { params, storage: { type, name: '_pubcid', expires: 10 } };
    }

    ['html5', 'cookie&html5', 'html5 & cookie'].forEach(type => {
      it(`should warn from getId with type '${type}'`, function () {
        sharedIdSystemSubmodule.getId(cfg(type), undefined);
        sinon.assert.calledOnce(utils.logWarn);
        expect(utils.logWarn.firstCall.args[0]).to.include('pixelUrl').and.include(type);
      });
    });

    it('should warn from extendId when it fires the pixel', function () {
      sharedIdSystemSubmodule.extendId(cfg('cookie&html5', { pixelUrl: '/wp-json/pubcid/v1/extend/', extend: true }), undefined, 'TestId');
      sinon.assert.calledOnce(utils.logWarn);
    });

    it('should warn only once', function () {
      sharedIdSystemSubmodule.getId(cfg('html5'), undefined);
      sharedIdSystemSubmodule.getId(cfg('html5'), undefined);
      sinon.assert.calledOnce(utils.logWarn);
    });

    ['cookie', ' cookie '].forEach(type => {
      it(`should not warn with storage type '${type}'`, function () {
        sharedIdSystemSubmodule.getId(cfg(type), undefined);
        sharedIdSystemSubmodule.extendId(cfg(type, { pixelUrl: '/wp-json/pubcid/v1/extend/', extend: true }), undefined, 'TestId');
        sinon.assert.notCalled(utils.logWarn);
      });
    });

    it('should not warn without pixelUrl', function () {
      sharedIdSystemSubmodule.getId(cfg('html5', {}), undefined);
      sinon.assert.notCalled(utils.logWarn);
    });
  });

  describe('eid', () => {
    before(() => {
      attachIdSystem(sharedIdSystemSubmodule);
    });
    afterEach(() => {
      config.resetConfig();
    });
    it('pubCommonId', function() {
      const userId = {
        pubcid: 'some-random-id-value'
      };
      const newEids = createEidsArray(userId);
      expect(newEids.length).to.equal(1);
      expect(newEids[0]).to.deep.equal({
        source: 'pubcid.org',
        uids: [{ id: 'some-random-id-value', atype: 1 }]
      });
    });

    it('should set inserter, if provided in config', async () => {
      config.setConfig({
        userSync: {
          userIds: [{
            name: 'sharedId',
            params: {
              inserter: 'mock-inserter'
            },
            value: { pubcid: 'mock-id' }
          }]
        }
      });
      await getGlobal().refreshUserIds();
      const eids = getGlobal().getUserIdsAsEids();
      sinon.assert.match(eids[0], {
        source: 'pubcid.org',
        inserter: 'mock-inserter'
      });
    });
  });
});
