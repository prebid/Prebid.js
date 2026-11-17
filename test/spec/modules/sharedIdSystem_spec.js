import { sharedIdSystemSubmodule } from 'modules/sharedIdSystem.js';
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

      it('should fire the pixel with the new id and complete once it has loaded', function () {
        sharedIdSystemSubmodule.getId(config, undefined).callback(callbackSpy, () => 'restored-by-server');
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

      it('should complete without an id when storage still holds the minted one after the re-check, so the server-set cookie is not rewritten', function () {
        sharedIdSystemSubmodule.getId(config, undefined).callback(callbackSpy, () => UUID);
        pixelDone();
        clock.tick(0);
        // storage still holds the minted id, so it is read again a little later
        sinon.assert.notCalled(callbackSpy);
        clock.tick(50);
        sinon.assert.calledOnce(callbackSpy);
        expect(callbackSpy.firstCall.args[0]).to.be.undefined;
      });

      it('should adopt the id the server generated when create is false and getId returned none', function () {
        const noCreate = { ...config, params: { ...config.params, create: false } };
        const result = sharedIdSystemSubmodule.getId(noCreate, undefined);
        expect(result.id).to.be.undefined;
        result.callback(callbackSpy, () => 'server-generated-id');
        pixelDone();
        clock.tick(0);
        sinon.assert.calledOnce(callbackSpy);
        expect(callbackSpy.firstCall.args[0]).to.equal('server-generated-id');
      });

      it('should adopt a different id the server set, for example one it restored', function () {
        sharedIdSystemSubmodule.getId(config, undefined).callback(callbackSpy, () => 'restored-by-server');
        pixelDone();
        clock.tick(0);
        sinon.assert.calledOnce(callbackSpy);
        expect(callbackSpy.firstCall.args[0]).to.equal('restored-by-server');
      });

      it('should adopt an id that only becomes visible in storage after the pixel load event', function () {
        // In some WebKit builds the pixel response's Set-Cookie is not yet applied at the load
        // event, so storage still holds the minted id synchronously; it shows the restored id
        // by the next task (see #16158).
        let storedId = UUID;
        sharedIdSystemSubmodule.getId(config, undefined).callback(callbackSpy, () => storedId);
        pixelDone();
        storedId = 'restored-by-server';
        clock.tick(0);
        sinon.assert.calledOnce(callbackSpy);
        expect(callbackSpy.firstCall.args[0]).to.equal('restored-by-server');
      });

      it('should adopt an id that only becomes visible in storage at the re-check', function () {
        let storedId = UUID;
        sharedIdSystemSubmodule.getId(config, undefined).callback(callbackSpy, () => storedId);
        pixelDone();
        clock.tick(0);
        sinon.assert.notCalled(callbackSpy);
        storedId = 'restored-by-server';
        clock.tick(50);
        sinon.assert.calledOnce(callbackSpy);
        expect(callbackSpy.firstCall.args[0]).to.equal('restored-by-server');
      });

      it('should complete without an id when the server removed the cookie, so script does not write it back', function () {
        // e.g. the endpoint deleted it for Global Privacy Control or denied consent
        sharedIdSystemSubmodule.getId(config, undefined).callback(callbackSpy, () => undefined);
        pixelDone();
        clock.tick(0);
        sinon.assert.calledOnce(callbackSpy);
        expect(callbackSpy.firstCall.args[0]).to.be.undefined;
      });

      it('should still complete, without an id, when reading storage throws', function () {
        sandbox.stub(utils, 'logError');
        sharedIdSystemSubmodule.getId(config, undefined).callback(callbackSpy, () => { throw new Error('storage unavailable'); });
        pixelDone();
        clock.tick(0);
        sinon.assert.calledOnce(callbackSpy);
        expect(callbackSpy.firstCall.args[0]).to.be.undefined;
        sinon.assert.calledOnce(utils.logError);
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
      let pixelDone;

      beforeEach(function () {
        pixelDone = null;
        sandbox.stub(utils, 'triggerPixel').callsFake((url, done) => { pixelDone = done; });
      });

      it('should return only a callback, not the id', function () {
        const result = sharedIdSystemSubmodule.extendId(config, undefined, 'TestId');
        expect(result.id).to.be.undefined;
        expect(result.callback).to.be.a('function');
      });

      it('should fire the pixel with the stored id', function () {
        sharedIdSystemSubmodule.extendId(config, undefined, 'TestId').callback(callbackSpy);
        sinon.assert.calledOnce(utils.triggerPixel);
        expect(utils.triggerPixel.firstCall.args[0]).to.include('/wp-json/pubcid/v1/extend/');
        expect(utils.triggerPixel.firstCall.args[0]).to.include('TestId');
      });

      it('should complete the callback once the pixel has loaded', function () {
        sharedIdSystemSubmodule.extendId(config, undefined, 'TestId').callback(callbackSpy);
        sinon.assert.notCalled(callbackSpy);
        expect(pixelDone).to.be.a('function');
        pixelDone();
        sinon.assert.calledOnce(callbackSpy);
      });

      it('should complete the callback without an id, so the server-set cookie is not rewritten', function () {
        sharedIdSystemSubmodule.extendId(config, undefined, 'TestId').callback(callbackSpy);
        pixelDone();
        expect(callbackSpy.firstCall.args[0]).to.be.undefined;
      });
    });
    it('should abort if coppa is set', function () {
      const result = sharedIdSystemSubmodule.extendId({ params: { extend: true } }, { coppa: true }, 'TestId');
      expect(result).to.be.undefined;
    });
  });
  describe('pixelConsent', function () {
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
    });

    afterEach(function () {
      sandbox.restore();
    });

    function getIdPixel(params, consentData) {
      sharedIdSystemSubmodule.getId({ params: { pixelUrl: PIXEL_URL, ...params } }, consentData).callback(sinon.stub(), () => UUID);
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

        it('should carry every consent param, URL-encoded, with full consent data', function () {
          const url = firePixel({ pixelConsent: true }, FULL_CONSENT);
          expect(url).to.equal(PLAIN_URL + id +
            `&gdpr=1&gdpr_consent=${TC_STRING}&us_privacy=1YNN&gpp=${encodeURIComponent(GPP_STRING)}&gpp_sid=2%2C7`);
          expect(queryOf(url)).to.eql({
            id: `pubcid:${id}`,
            gdpr: '1',
            gdpr_consent: TC_STRING,
            us_privacy: '1YNN',
            gpp: GPP_STRING,
            gpp_sid: '2,7'
          });
        });

        it('should encode characters that are not URL-safe', function () {
          const url = firePixel({ pixelConsent: true }, {
            gdpr: { gdprApplies: true, consentString: 'a&b=c d' },
            usp: '1Y&N',
            gpp: { gppString: 'x#y', applicableSections: [2] }
          });
          expect(queryOf(url)).to.eql({
            id: `pubcid:${id}`,
            gdpr: '1',
            gdpr_consent: 'a&b=c d',
            us_privacy: '1Y&N',
            gpp: 'x#y',
            gpp_sid: '2'
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
      });
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
