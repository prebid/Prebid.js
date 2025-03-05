import { tncidSubModule } from 'modules/tncIdSystem';
import { attachIdSystem } from '../../../modules/userId/index.js';
import { createEidsArray } from '../../../modules/userId/eids.js';

const consentData = {
  gdpr: {
    gdprApplies: true,
    consentString: 'GDPR_CONSENT_STRING'
  }
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
      const res = tncidSubModule.getId({}, { gdpr: {gdprApplies: true} });
      expect(res).to.be.undefined;
    });

    it('Should NOT give TNCID if there is no TNC script on page and no fallback url in configuration', async function () {
      const completeCallback = sinon.spy();
      const {callback} = tncidSubModule.getId({}, consentData);

      await callback(completeCallback);
      expect(callback).to.be.an('function');
      expect(completeCallback.calledOnceWithExactly()).to.be.true;
    });

    it('Should NOT give TNCID if fallback script is not loaded correctly', async function () {
      const completeCallback = sinon.spy();
      const {callback} = tncidSubModule.getId({
        params: { url: 'www.thenewco.tech' }
      }, consentData);

      await callback(completeCallback);
      expect(completeCallback.calledOnceWithExactly()).to.be.true;
    });

    it(`Should call external script if TNC is not loaded on page`, async function() {
      const completeCallback = sinon.spy();
      const {callback} = tncidSubModule.getId({params: {url: 'https://www.thenewco.tech?providerId=test'}}, { gdprApplies: false });

      await callback(completeCallback);
      expect(window).to.contain.property('__tncPbjs');
    });

    it('TNCID is returned if page has TNC script with ns: __tnc', async function () {
      Object.defineProperty(window, '__tnc', {
        value: {
          ready: (readyFunc) => { readyFunc() },
          getTNCID: async (name) => { return 'TNCID_TEST_ID_1' },
        },
        configurable: true
      });

      const completeCallback = sinon.spy();
      const {callback} = tncidSubModule.getId({}, { gdprApplies: false });

      await callback(completeCallback);
      expect(completeCallback.calledOnceWithExactly('TNCID_TEST_ID_1')).to.be.true;
    });

    it('TNC script with ns __tncPbjs is created', async function () {
      const completeCallback = sinon.spy();
      const {callback} = tncidSubModule.getId({params: {url: 'TEST_URL'}}, consentData);

      await callback(completeCallback);
      expect(window).to.contain.property('__tncPbjs');
    });

    it('TNCID is returned if page has TNC script with ns: __tncPbjs', async function () {
      Object.defineProperty(window, '__tncPbjs', {
        value: {
          ready: (readyFunc) => { readyFunc() },
          getTNCID: async (name) => { return 'TNCID_TEST_ID_2' },
          options: {},
        },
        configurable: true,
        writable: true
      });

      const completeCallback = sinon.spy();
      const {callback} = tncidSubModule.getId({params: {url: 'www.thenewco.tech'}}, consentData);

      await callback(completeCallback);
      expect(completeCallback.calledOnceWithExactly('TNCID_TEST_ID_2')).to.be.true;
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
