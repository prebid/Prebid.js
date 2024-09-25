// @ts-check

import {
  BIDDER_EID_KEY,
  YANDEX_ID_KEY,
  YANDEX_EXT_COOKIE_NAMES,
  BIDDER_CODE,
  YANDEX_USER_ID_KEY,
  YANDEX_STORAGE_TYPE,
  YANDEX_MIN_EXPIRE_DAYS,
  PREBID_STORAGE,
  yandexIdSubmodule,
} from '../../../modules/yandexIdSystem.js';
import {attachIdSystem} from '../../../modules/userId/index.js';
import {createEidsArray} from '../../../modules/userId/eids.js';
import {createSandbox} from 'sinon'
import * as utils from '../../../src/utils.js';

/**
 * @typedef {import('sinon').SinonStub} SinonStub
 * @typedef {import('sinon').SinonSpy} SinonSpy
 * @typedef {import('sinon').SinonSandbox} SinonSandbox
 */

const MIN_METRICA_ID_LEN = 17;

/** @satisfies {import('../../../modules/userId/index.js').SubmoduleConfig} */
const CORRECT_SUBMODULE_CONFIG = {
  name: BIDDER_CODE,
  storage: {
    expires: YANDEX_MIN_EXPIRE_DAYS,
    name: YANDEX_USER_ID_KEY,
    type: YANDEX_STORAGE_TYPE,
    refreshInSeconds: undefined,
  },
  params: undefined,
  value: undefined,
};

/** @type {import('../../../modules/userId/index.js').SubmoduleConfig[]} */
const INCORRECT_SUBMODULE_CONFIGS = [
  {
    ...CORRECT_SUBMODULE_CONFIG,
    storage: {
      ...CORRECT_SUBMODULE_CONFIG.storage,
      expires: 0,
    }
  },
  {
    ...CORRECT_SUBMODULE_CONFIG,
    storage: {
      ...CORRECT_SUBMODULE_CONFIG.storage,
      type: 'html5'
    }
  },
  {
    ...CORRECT_SUBMODULE_CONFIG,
    storage: {
      ...CORRECT_SUBMODULE_CONFIG.storage,
      name: 'custom_key'
    }
  },
];

const YANDEX_EXT_COOKIE_VALUE = 'ext_cookie_value';

describe('YandexId module', () => {
  /** @type {SinonSandbox} */
  let sandbox;
  /** @type {SinonStub} */
  let getCryptoRandomValuesStub;
  /** @type {SinonStub} */
  let randomStub;
  /** @type {SinonStub} */
  let getCookieStub;
  /** @type {SinonStub} */
  let cookiesAreEnabledStub;
  /** @type {SinonSpy} */
  let logErrorSpy;

  beforeEach(() => {
    sandbox = createSandbox();
    getCookieStub = sandbox.stub(PREBID_STORAGE, 'getCookie').returns(YANDEX_EXT_COOKIE_VALUE);
    cookiesAreEnabledStub = sandbox.stub(PREBID_STORAGE, 'cookiesAreEnabled');
    logErrorSpy = sandbox.spy(utils, 'logError');

    getCryptoRandomValuesStub = sandbox
      .stub(window.crypto, 'getRandomValues')
      .callsFake((bufferView) => {
        if (bufferView != null) {
          bufferView[0] = 10000;
        }

        return null;
      });
    randomStub = sandbox.stub(window.Math, 'random').returns(0.555);
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('getId()', () => {
    it('user id matches Yandex Metrica format', () => {
      const generatedId = yandexIdSubmodule.getId(CORRECT_SUBMODULE_CONFIG)?.id;

      expect(isNaN(Number(generatedId))).to.be.false;
      expect(generatedId).to.have.length.greaterThanOrEqual(
        MIN_METRICA_ID_LEN
      );
    });

    it('uses stored id', () => {
      const storedId = '11111111111111111';
      const generatedId = yandexIdSubmodule.getId(CORRECT_SUBMODULE_CONFIG, undefined, storedId)?.id;

      expect(generatedId).to.be.equal(storedId);
    })

    describe('config validation', () => {
      INCORRECT_SUBMODULE_CONFIGS.forEach((config, i) => {
        it(`invalid config #${i} fails`, () => {
          const generatedId = yandexIdSubmodule.getId(config)?.id;

          expect(generatedId).to.be.undefined;
          expect(logErrorSpy.called).to.be.true;
        })
      })
    })

    describe('crypto', () => {
      it('uses Math.random when crypto is not available', () => {
        const cryptoTmp = window.crypto;

        // @ts-expect-error -- Crypto is always defined in modern JS. TS yells when trying to delete non-nullable property.
        delete window.crypto;

        yandexIdSubmodule.getId(CORRECT_SUBMODULE_CONFIG);

        expect(randomStub.calledOnce).to.be.true;
        expect(getCryptoRandomValuesStub.called).to.be.false;

        window.crypto = cryptoTmp;
      });

      it('uses crypto when it is available', () => {
        yandexIdSubmodule.getId(CORRECT_SUBMODULE_CONFIG);

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

  describe('eid', () => {
    const id = '11111111111111111';
    const userId = { [YANDEX_ID_KEY]: id };

    before(() => {
      attachIdSystem(yandexIdSubmodule);
    });

    it('with enabled cookies', () => {
      cookiesAreEnabledStub.returns(true);
      const [eid] = createEidsArray(userId);

      expect(eid).to.deep.equal({
        source: BIDDER_EID_KEY,
        uids: [{
          id,
          atype: 1,
          ext: YANDEX_EXT_COOKIE_NAMES.reduce((acc, cookieName) => ({
            ...acc,
            [cookieName]: YANDEX_EXT_COOKIE_VALUE,
          }), {}),
        }]
      });
    });

    it('with disabled cookies', () => {
      cookiesAreEnabledStub.returns(false);
      const [eid] = createEidsArray(userId);

      expect(eid).to.deep.equal({
        source: BIDDER_EID_KEY,
        uids: [{
          id,
          atype: 1,
        }]
      });
    });
  });
});
