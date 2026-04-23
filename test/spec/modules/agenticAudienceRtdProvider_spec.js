import {
  agenticAudienceRtdProviderSubmodule,
  DEFAULT_STORAGE_KEY,
  mapEntryToOpenRtbSegment,
  storage
} from 'modules/agenticAudienceRtdProvider.js';

/** Test fixture: OpenRTB Float32 LE base64 (module expects pre-encoded storage only). */
function vectorBase64Fixture(arr) {
  const buffer = new ArrayBuffer(arr.length * 4);
  const view = new DataView(buffer);
  arr.forEach((x, i) => view.setFloat32(i * 4, x, true));
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

describe('agenticAudienceRtdProvider', function () {
  let sandbox;
  let reqBidsConfigObj;
  let storageGetLocalStub;
  let storageGetCookieStub;
  let storageLocalEnabledStub;
  let storageCookiesEnabledStub;

  const validEntry = {
    ver: '1.0',
    vector: vectorBase64Fixture([0.1, -0.2, 0.3]),
    model: 'sbert-mini-ctx-001',
    dimension: 3,
    type: [1, 2]
  };

  const encodeData = (obj) => btoa(JSON.stringify(obj));

  beforeEach(function () {
    sandbox = sinon.createSandbox();
    reqBidsConfigObj = { ortb2Fragments: { global: {} } };
    storageGetLocalStub = sandbox.stub(storage, 'getDataFromLocalStorage');
    storageGetCookieStub = sandbox.stub(storage, 'getCookie');
    storageLocalEnabledStub = sandbox.stub(storage, 'localStorageIsEnabled').returns(true);
    storageCookiesEnabledStub = sandbox.stub(storage, 'cookiesAreEnabled').returns(true);
  });

  afterEach(function () {
    sandbox.restore();
  });

  describe('mapEntryToOpenRtbSegment', function () {
    it('maps stored Base64 vector to Segment unchanged', function () {
      const seg = mapEntryToOpenRtbSegment(validEntry);
      expect(seg.id).to.be.undefined;
      expect(seg.name).to.be.undefined;
      expect(seg.ext.aa.ver).to.equal('1.0');
      expect(seg.ext.aa.vector).to.equal(validEntry.vector);
      expect(seg.ext.aa.dimension).to.equal(3);
      expect(seg.ext.aa.model).to.equal('sbert-mini-ctx-001');
      expect(seg.ext.aa.type).to.deep.equal([1, 2]);
    });

    it('passes vector through without coercion (e.g. array storage)', function () {
      const arr = [0.1, 0.2, 0.3];
      const seg = mapEntryToOpenRtbSegment({ ...validEntry, vector: arr });
      expect(seg.ext.aa.vector).to.equal(arr);
    });

    it('passes type through without normalizing number to array', function () {
      const seg = mapEntryToOpenRtbSegment({ ...validEntry, type: 1 });
      expect(seg.ext.aa.type).to.equal(1);
    });

    it('uses custom id and name when provided', function () {
      const seg = mapEntryToOpenRtbSegment({
        ...validEntry,
        id: 'seg-1',
        name: 'identity-contextual'
      });
      expect(seg.id).to.equal('seg-1');
      expect(seg.name).to.equal('identity-contextual');
    });

    it('returns null only for non-object entry', function () {
      expect(mapEntryToOpenRtbSegment(null)).to.equal(null);
      expect(mapEntryToOpenRtbSegment(undefined)).to.equal(null);
    });

    it('maps empty object to segment with id, name, and ext fields undefined', function () {
      const seg = mapEntryToOpenRtbSegment({});
      expect(seg.id).to.be.undefined;
      expect(seg.name).to.be.undefined;
      expect(seg.ext).to.deep.equal({
        aa: {
          ver: undefined,
          vector: undefined,
          dimension: undefined,
          model: undefined,
          type: undefined
        }
      });
    });
  });

  describe('init', function () {
    it('returns true regardless of params', function () {
      expect(agenticAudienceRtdProviderSubmodule.init({})).to.equal(true);
      expect(agenticAudienceRtdProviderSubmodule.init({ params: { storageKey: '_custom_' } })).to.equal(true);
    });
  });

  describe('getBidRequestData', function () {
    it('uses default storage key when params omitted', function () {
      const config = {};
      const callback = sinon.spy();
      storageGetLocalStub.withArgs(DEFAULT_STORAGE_KEY).returns(encodeData({ entries: [validEntry] }));
      storageGetCookieStub.returns(null);

      agenticAudienceRtdProviderSubmodule.getBidRequestData(reqBidsConfigObj, callback, config);

      expect(callback.calledOnce).to.be.true;
      expect(reqBidsConfigObj.ortb2Fragments.global.user.data).to.have.length(1);
      expect(reqBidsConfigObj.ortb2Fragments.global.user.data[0].name).to.equal('agenticAudience');
      expect(reqBidsConfigObj.ortb2Fragments.global.user.data[0].segment).to.deep.equal([
        mapEntryToOpenRtbSegment(validEntry)
      ]);
    });

    it('uses params.storageKey when provided', function () {
      const config = { params: { storageKey: '_custom_agentic_' } };
      const callback = sinon.spy();
      storageGetLocalStub.withArgs('_custom_agentic_').returns(encodeData({ entries: [validEntry] }));
      storageGetCookieStub.returns(null);

      agenticAudienceRtdProviderSubmodule.getBidRequestData(reqBidsConfigObj, callback, config);

      expect(reqBidsConfigObj.ortb2Fragments.global.user.data[0].name).to.equal('agenticAudience');
      expect(reqBidsConfigObj.ortb2Fragments.global.user.data[0].segment).to.deep.equal([
        mapEntryToOpenRtbSegment(validEntry)
      ]);
    });

    it('falls back to default key when storageKey is empty string', function () {
      const config = { params: { storageKey: '' } };
      const callback = sinon.spy();
      storageGetLocalStub.withArgs(DEFAULT_STORAGE_KEY).returns(encodeData({ entries: [validEntry] }));
      storageGetCookieStub.returns(null);

      agenticAudienceRtdProviderSubmodule.getBidRequestData(reqBidsConfigObj, callback, config);

      expect(reqBidsConfigObj.ortb2Fragments.global.user.data[0].segment).to.deep.equal([
        mapEntryToOpenRtbSegment(validEntry)
      ]);
    });

    it('calls callback and does not inject when storage has no data', function () {
      const config = {};
      const callback = sinon.spy();
      storageGetLocalStub.withArgs(DEFAULT_STORAGE_KEY).returns(null);
      storageGetCookieStub.returns(null);

      agenticAudienceRtdProviderSubmodule.getBidRequestData(reqBidsConfigObj, callback, config);

      expect(callback.calledOnce).to.be.true;
      expect(reqBidsConfigObj.ortb2Fragments.global.user).to.be.undefined;
    });

    it('does not inject when stored data has empty entries array', function () {
      const config = {};
      const callback = sinon.spy();
      storageGetLocalStub.withArgs(DEFAULT_STORAGE_KEY).returns(encodeData({ entries: [] }));
      storageGetCookieStub.returns(null);

      agenticAudienceRtdProviderSubmodule.getBidRequestData(reqBidsConfigObj, callback, config);

      expect(callback.calledOnce).to.be.true;
      expect(reqBidsConfigObj.ortb2Fragments.global.user).to.be.undefined;
    });

    it('reads from cookie when localStorage returns null', function () {
      const config = {};
      const callback = sinon.spy();
      storageGetLocalStub.returns(null);
      storageGetCookieStub.withArgs(DEFAULT_STORAGE_KEY).returns(encodeData({ entries: [validEntry] }));

      agenticAudienceRtdProviderSubmodule.getBidRequestData(reqBidsConfigObj, callback, config);

      expect(reqBidsConfigObj.ortb2Fragments.global.user.data[0].segment).to.deep.equal([
        mapEntryToOpenRtbSegment(validEntry)
      ]);
    });
  });

  describe('generates valid OpenRTB user object (Agentic Audiences extension)', function () {
    it('produces valid structure under user.data[0]', function () {
      const config = {};
      const callback = sinon.spy();
      storageGetLocalStub.withArgs(DEFAULT_STORAGE_KEY).returns(encodeData({ entries: [validEntry] }));
      storageGetCookieStub.returns(null);

      agenticAudienceRtdProviderSubmodule.getBidRequestData(reqBidsConfigObj, callback, config);

      expect(reqBidsConfigObj.ortb2Fragments.global.user.data).to.have.length(1);
      const dataObj = reqBidsConfigObj.ortb2Fragments.global.user.data[0];
      expect(dataObj).to.have.keys('name', 'segment');
      expect(dataObj.name).to.equal('agenticAudience');
      const seg = dataObj.segment[0];
      expect(seg).to.have.keys('id', 'name', 'ext');
      expect(seg.ext).to.have.keys('aa');
      expect(seg.ext.aa).to.have.keys('ver', 'vector', 'dimension', 'model', 'type');
      expect(seg.ext.aa.vector).to.equal(validEntry.vector);
      expect(seg).to.deep.equal(mapEntryToOpenRtbSegment(validEntry));
    });
  });
});
