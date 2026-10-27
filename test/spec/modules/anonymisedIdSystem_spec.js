import { anonymisedIdSubmodule, storage, STORAGE_KEY, MAX_ID_LENGTH } from 'modules/anonymisedIdSystem.js';
import { createEidsArray } from 'modules/userId/eids.js';
import * as utils from 'src/utils.js';

const CUID = '01f6a483-86fa-406b-a7c2-45f6d4a89469';

describe('anonymisedId submodule', function () {
  let getDataFromLocalStorageStub;

  beforeEach(function () {
    getDataFromLocalStorageStub = sinon.stub(storage, 'getDataFromLocalStorage');
  });

  afterEach(function () {
    getDataFromLocalStorageStub.restore();
  });

  it('is registered with the expected name and GVL ID', function () {
    expect(anonymisedIdSubmodule.name).to.equal('anonymisedId');
    expect(anonymisedIdSubmodule.gvlid).to.equal(1116);
  });

  describe('getId()', function () {
    it('returns the CUID stored by the Marketing Tag', function () {
      getDataFromLocalStorageStub.withArgs(STORAGE_KEY).returns(CUID);
      expect(anonymisedIdSubmodule.getId()).to.deep.equal({ id: CUID });
    });

    it('trims surrounding whitespace', function () {
      getDataFromLocalStorageStub.withArgs(STORAGE_KEY).returns(`  ${CUID}\n`);
      expect(anonymisedIdSubmodule.getId()).to.deep.equal({ id: CUID });
    });

    it('does not read any key other than anon-cuid', function () {
      getDataFromLocalStorageStub.returns(CUID);
      anonymisedIdSubmodule.getId();
      expect(getDataFromLocalStorageStub.calledOnceWith(STORAGE_KEY)).to.equal(true);
    });

    [undefined, null, '', '   ', 0, {}].forEach(function (stored) {
      it(`returns undefined when localStorage holds ${JSON.stringify(stored)}`, function () {
        getDataFromLocalStorageStub.withArgs(STORAGE_KEY).returns(stored);
        expect(anonymisedIdSubmodule.getId()).to.equal(undefined);
      });
    });

    it('rejects a JSON blob left by another writer', function () {
      getDataFromLocalStorageStub.withArgs(STORAGE_KEY).returns(`{"cuid":"${CUID}"}`);
      expect(anonymisedIdSubmodule.getId()).to.equal(undefined);
    });

    it('rejects a JSON-stringified CUID rather than passing on its quotes', function () {
      getDataFromLocalStorageStub.withArgs(STORAGE_KEY).returns(JSON.stringify(CUID));
      expect(anonymisedIdSubmodule.getId()).to.equal(undefined);
    });

    it('rejects a JSON array', function () {
      getDataFromLocalStorageStub.withArgs(STORAGE_KEY).returns(`["${CUID}"]`);
      expect(anonymisedIdSubmodule.getId()).to.equal(undefined);
    });

    it('rejects either bracket on its own, not just a well-formed array', function () {
      getDataFromLocalStorageStub.withArgs(STORAGE_KEY).returns(`${CUID}]`);
      expect(anonymisedIdSubmodule.getId()).to.equal(undefined);
    });

    it('rejects a value containing whitespace', function () {
      getDataFromLocalStorageStub.withArgs(STORAGE_KEY).returns('not an id');
      expect(anonymisedIdSubmodule.getId()).to.equal(undefined);
    });

    it('rejects a value longer than the maximum length', function () {
      getDataFromLocalStorageStub.withArgs(STORAGE_KEY).returns('a'.repeat(MAX_ID_LENGTH + 1));
      expect(anonymisedIdSubmodule.getId()).to.equal(undefined);
    });

    it('accepts a value at the maximum length', function () {
      const id = 'a'.repeat(MAX_ID_LENGTH);
      getDataFromLocalStorageStub.withArgs(STORAGE_KEY).returns(id);
      expect(anonymisedIdSubmodule.getId()).to.deep.equal({ id });
    });

    it('does not pin the identifier to a UUID format', function () {
      getDataFromLocalStorageStub.withArgs(STORAGE_KEY).returns('AbC_123.456');
      expect(anonymisedIdSubmodule.getId()).to.deep.equal({ id: 'AbC_123.456' });
    });

    // Prebid.js caches whatever `getId` returns when `storage` is configured, and that copy would
    // outlive the Marketing Tag's removal of the key. Refusing to return an ID is what keeps a
    // signed-out user's CUID out of the bid stream; a warning alone would not.
    it('provides no ID at all when the publisher configured storage', function () {
      const logWarnStub = sinon.stub(utils, 'logWarn');
      getDataFromLocalStorageStub.withArgs(STORAGE_KEY).returns(CUID);

      try {
        const id = anonymisedIdSubmodule.getId({ storage: { type: 'html5', name: 'anonymisedId', expires: 30 } });
        expect(id).to.equal(undefined);
        expect(logWarnStub.calledWithMatch(/must be configured without "storage"/)).to.equal(true);
      } finally {
        logWarnStub.restore();
      }
    });

    it('does not read storage at all when the publisher configured storage', function () {
      const logWarnStub = sinon.stub(utils, 'logWarn');
      getDataFromLocalStorageStub.withArgs(STORAGE_KEY).returns(CUID);

      try {
        anonymisedIdSubmodule.getId({ storage: { type: 'html5', name: 'anonymisedId' } });
        expect(getDataFromLocalStorageStub.called).to.equal(false);
      } finally {
        logWarnStub.restore();
      }
    });

    it('does not warn about storage when none is configured', function () {
      const logWarnStub = sinon.stub(utils, 'logWarn');
      getDataFromLocalStorageStub.withArgs(STORAGE_KEY).returns(CUID);

      try {
        anonymisedIdSubmodule.getId({});
        expect(logWarnStub.called).to.equal(false);
      } finally {
        logWarnStub.restore();
      }
    });

    it('does not warn when the user is simply signed out', function () {
      const logWarnStub = sinon.stub(utils, 'logWarn');
      getDataFromLocalStorageStub.withArgs(STORAGE_KEY).returns(null);

      try {
        expect(anonymisedIdSubmodule.getId()).to.equal(undefined);
        expect(logWarnStub.called).to.equal(false);
      } finally {
        logWarnStub.restore();
      }
    });

    it('warns when the stored value is malformed', function () {
      const logWarnStub = sinon.stub(utils, 'logWarn');
      getDataFromLocalStorageStub.withArgs(STORAGE_KEY).returns('{"cuid":"x"}');

      try {
        expect(anonymisedIdSubmodule.getId()).to.equal(undefined);
        expect(logWarnStub.calledWithMatch(/malformed/)).to.equal(true);
      } finally {
        logWarnStub.restore();
      }
    });
  });

  describe('decode()', function () {
    it('decodes a stored CUID', function () {
      expect(anonymisedIdSubmodule.decode(CUID)).to.deep.equal({ anonymisedId: CUID });
    });

    [undefined, null, '', ' ', 42, {}, { anonymisedId: CUID }].forEach(function (value) {
      it(`returns undefined for ${JSON.stringify(value)}`, function () {
        expect(anonymisedIdSubmodule.decode(value)).to.equal(undefined);
      });
    });

    // The User ID module skips getId entirely while a cached value is still fresh, and decodes
    // that copy instead - so refusing in getId alone would still let a stale cached ID through.
    it('refuses a value cached by Prebid.js when storage is configured', function () {
      const logWarnStub = sinon.stub(utils, 'logWarn');

      try {
        const decoded = anonymisedIdSubmodule.decode(CUID, { storage: { type: 'html5', name: 'anonymisedId', expires: 30 } });
        expect(decoded).to.equal(undefined);
        expect(logWarnStub.calledWithMatch(/must be configured without "storage"/)).to.equal(true);
      } finally {
        logWarnStub.restore();
      }
    });

    it('decodes normally when no storage is configured', function () {
      expect(anonymisedIdSubmodule.decode(CUID, {})).to.deep.equal({ anonymisedId: CUID });
    });
  });

  describe('eids', function () {
    it('produces an anonymised.io EID with atype 1', function () {
      const eids = createEidsArray(
        { anonymisedId: CUID },
        new Map([['anonymisedId', anonymisedIdSubmodule.eids.anonymisedId]])
      );
      expect(eids).to.deep.equal([{
        source: 'anonymised.io',
        uids: [{ id: CUID, atype: 1 }]
      }]);
    });

    it('declares atype as a number, as OpenRTB requires', function () {
      expect(anonymisedIdSubmodule.eids.anonymisedId.atype).to.be.a('number');
    });
  });
});
