import { tncidSubModule } from 'modules/tncIdSystem';
import {attachIdSystem} from '../../../modules/userId/index.js';
import {createEidsArray} from '../../../modules/userId/eids.js';
import {expect} from 'chai/index.mjs';

const consentData = {
  gdprApplies: true,
  consentString: 'GDPR_CONSENT_STRING'
};

describe('TNCID tests', function () {
  describe('name', () => {
    it('should expose the name of the submodule', () => {
      expect(tncidSubModule.name).to.equal('tncId');
    });
  });

  describe('gvlid', () => {
    it('should expose the vendor id', () => {
      expect(tncidSubModule.gvlid).to.equal(750);
    });
  });

  describe('decode', () => {
    it('should wrap the given value inside an object literal', () => {
      expect(tncidSubModule.decode('TNCID_TEST_ID')).to.deep.equal({
        tncid: 'TNCID_TEST_ID'
      });
    });
  });

  describe('getId', () => {
    afterEach(function () {
      Object.defineProperty(window, '__tnc', {value: undefined, configurable: true});
      Object.defineProperty(window, '__tncPbjs', {value: undefined, configurable: true});
    });

    it('Should NOT give TNCID if GDPR applies but consent string is missing', function () {
      const res = tncidSubModule.getId({}, { gdprApplies: true });
      expect(res).to.be.undefined;
    });

    it('GDPR is OK and page has no TNC script on page, script goes in error, no TNCID is returned', function () {
      const completeCallback = sinon.spy();
      const {callback} = tncidSubModule.getId({}, consentData);

      return callback(completeCallback).then(() => {
        expect(completeCallback.calledOnce).to.be.true;
      })
    });

    it('GDPR is OK and page has TNC script with ns: __tnc, present TNCID is returned', function () {
      Object.defineProperty(window, '__tnc', {
        value: {
          ready: (readyFunc) => { readyFunc() },
          on: (name, cb) => { cb() },
          tncid: 'TNCID_TEST_ID_1',
          providerId: 'TEST_PROVIDER_ID_1',
        },
        configurable: true
      });

      const completeCallback = sinon.spy();
      const {callback} = tncidSubModule.getId({}, { gdprApplies: false });

      return callback(completeCallback).then(() => {
        expect(completeCallback.calledOnceWithExactly('TNCID_TEST_ID_1')).to.be.true;
      })
    });

    it('GDPR is OK and page has TNC script with ns: __tnc but not loaded, TNCID is assigned and returned', function () {
      Object.defineProperty(window, '__tnc', {
        value: {
          ready: (readyFunc) => { readyFunc() },
          on: (name, cb) => { cb() },
          providerId: 'TEST_PROVIDER_ID_1',
        },
        configurable: true
      });

      const completeCallback = sinon.spy();
      const {callback} = tncidSubModule.getId({}, { gdprApplies: false });

      return callback(completeCallback).then(() => {
        expect(completeCallback.calledOnceWithExactly(undefined)).to.be.true;
      })
    });

    it('GDPR is OK and page has TNC script with ns: __tncPbjs, TNCID is returned', function () {
      Object.defineProperty(window, '__tncPbjs', {
        value: {
          ready: (readyFunc) => { readyFunc() },
          on: (name, cb) => {
            window.__tncPbjs.tncid = 'TNCID_TEST_ID_2';
            cb();
          },
          providerId: 'TEST_PROVIDER_ID_1',
          options: {},
        },
        configurable: true,
        writable: true
      });

      const completeCallback = sinon.spy();
      const {callback} = tncidSubModule.getId({params: {url: 'TEST_URL'}}, consentData);

      return callback(completeCallback).then(() => {
        expect(completeCallback.calledOnceWithExactly('TNCID_TEST_ID_2')).to.be.true;
      })
    });
  });
  describe('eid', () => {
    before(() => {
      attachIdSystem(tncidSubModule);
    });
    it('tncid', function() {
      const userId = {
        tncid: 'TEST_TNCID'
      };
      const newEids = createEidsArray(userId);
      expect(newEids.length).to.equal(1);
      expect(newEids[0]).to.deep.equal({
        source: 'thenewco.it',
        uids: [{
          id: 'TEST_TNCID',
          atype: 3
        }]
      });
    });
  });
});
