import { tncidSubModule } from 'modules/tncIdSystem';

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
      const res = tncidSubModule.getId(null, { gdprApplies: true });
      expect(res).to.be.undefined;
    });

    it('GDPR is OK and page has no TNC script on page, script goes in error, no TNCID is returned', function () {
      const completeCallback = sinon.spy();
      const {callback} = tncidSubModule.getId(null, consentData);

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
      const {callback} = tncidSubModule.getId(null, { gdprApplies: false });

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
      const {callback} = tncidSubModule.getId(null, { gdprApplies: false });

      return callback(completeCallback).then(() => {
        expect(completeCallback.calledOnce).to.be.true;
      })
    });

    it('GDPR is OK and page has TNC script with ns: __tncPbjs, TNCID is returned', function () {
      Object.defineProperty(window, '__tncPbjs', {
        value: {
          ready: (readyFunc) => { readyFunc() },
          on: (name, cb) => { cb() },
          providerId: 'TEST_PROVIDER_ID_1',
          options: {},
          tncid: 'TNCID_TEST_ID_2'
        },
        configurable: true,
        writable: true
      });

      const completeCallback = sinon.spy();
      const {callback} = tncidSubModule.getId({params: {providerId: 'TEST_PROVIDER_ID_2'}}, consentData);

      return callback(completeCallback).then(() => {
        expect(completeCallback.calledOnceWithExactly('TNCID_TEST_ID_2')).to.be.true;
        expect(window.__tncPbjs.providerId).to.be.eq('TEST_PROVIDER_ID_2');
      })
    });
  });
});
