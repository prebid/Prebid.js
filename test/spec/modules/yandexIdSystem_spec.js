import { yandexIdSubmodule, storage } from '../../../modules/yandexIdSystem.js';

const MIN_METRICA_ID_LEN = 17;

/**
 * @typedef {import('sinon').SinonStub} SinonStub
 * @typedef {import('sinon').SinonSandbox} SinonSandbox
 */

describe('YandexId module', () => {
  /** @type {SinonSandbox} */
  let sandbox;
  /** @type {SinonStub} */
  let setCookieStub;
  /** @type {SinonStub} */
  let getCookieStub;
  /** @type {SinonStub} */
  let getLocalStorageStub;
  /** @type {SinonStub} */
  let setLocalStorageStub;
  /** @type {SinonStub} */
  let cookiesAreEnabledStub;
  /** @type {SinonStub} */
  let getCryptoRandomValuesStub;
  /** @type {SinonStub} */
  let randomStub;

  beforeEach(() => {
    sandbox = sinon.sandbox.create();
    getCookieStub = sandbox.stub(storage, 'getCookie');
    setCookieStub = sandbox.stub(storage, 'setCookie');
    getLocalStorageStub = sandbox.stub(storage, 'getDataFromLocalStorage');
    setLocalStorageStub = sandbox.stub(storage, 'setDataInLocalStorage');
    cookiesAreEnabledStub = sandbox.stub(storage, 'cookiesAreEnabled');
    cookiesAreEnabledStub.returns(true);

    getCryptoRandomValuesStub = sandbox
      .stub(window.crypto, 'getRandomValues')
      .callsFake((bufferView) => {
        bufferView[0] = 10000;
      });
    randomStub = sandbox.stub(window.Math, 'random').returns(0.555);
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('getId()', () => {
    describe('user id format', () => {
      it('matches Yandex Metrica format', () => {
        const generatedId = yandexIdSubmodule.getId().id;
        expect(isNaN(generatedId)).to.be.false;
        expect(generatedId).to.have.length.greaterThanOrEqual(
          MIN_METRICA_ID_LEN
        );
      });
    });

    describe('when user id is set', () => {
      const dummyId = Array(MIN_METRICA_ID_LEN).fill(1).join('');

      beforeEach(() => {
        getCookieStub.returns(dummyId);
      });

      it('returns id', () => {
        const { id } = yandexIdSubmodule.getId();

        expect(id).to.equal(dummyId);
      });

      it('does not change existing id', () => {
        yandexIdSubmodule.getId();

        expect(setCookieStub.lastCall.args[1]).to.equal(dummyId);
      });
    });

    describe('when user id is not set', () => {
      beforeEach(() => {
        getCookieStub.returns(undefined);
      });

      it('returns id', () => {
        const id = yandexIdSubmodule.getId();

        expect(id).not.to.be.undefined;
      });

      it('sets id', () => {
        yandexIdSubmodule.getId()

        expect(setCookieStub.calledOnce).to.be.true;
      });
    });

    describe('storage interaction', () => {
      describe('when cookie storage is disabled', () => {
        it('should not use storage api', () => {
          cookiesAreEnabledStub.returns(false);

          yandexIdSubmodule.getId();

          expect(cookiesAreEnabledStub.called).to.be.true;
          expect(getCookieStub.called).to.be.false;
          expect(setCookieStub.called).to.be.false;
          expect(getLocalStorageStub.called).to.be.false;
          expect(setLocalStorageStub.called).to.be.false;
        });
      });

      it('should use cookie', () => {
        yandexIdSubmodule.getId();

        expect(cookiesAreEnabledStub.called).to.be.true;
        expect(getCookieStub.calledOnce).to.be.true;
        expect(setCookieStub.calledOnce).to.be.true;
      });

      it('should not use localStorage', () => {
        yandexIdSubmodule.getId();

        expect(getLocalStorageStub.called).to.be.false;
        expect(setLocalStorageStub.called).to.be.false;
      });
    });

    describe('crypto', () => {
      it('uses Math.random when crypto is not available', () => {
        sandbox.stub(window, 'crypto').value(undefined);

        yandexIdSubmodule.getId();

        expect(randomStub.calledOnce).to.be.true;
        expect(getCryptoRandomValuesStub.called).to.be.false;
      });

      it('uses crypto when it is available', () => {
        yandexIdSubmodule.getId();

        expect(randomStub.called).to.be.false;
        expect(getCryptoRandomValuesStub.calledOnce).to.be.true;
      });
    });
  });

  describe('decode()', () => {
    it('should not transform value', () => {
      const value = 'test value';

      expect(yandexIdSubmodule.decode(value).yandexId).to.equal(value);
    });
  });
});
