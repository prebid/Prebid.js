import {
  agenticAudienceAdapterSubmodule,
  mapEntryToOpenRtbSegment,
  storage
} from 'modules/agenticAudienceAdapter.js';

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

describe('agenticAudienceAdapter', function () {
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
      expect(seg.ext.ver).to.equal('1.0');
      expect(seg.ext.vector).to.equal(validEntry.vector);
      expect(seg.ext.dimension).to.equal(3);
      expect(seg.ext.model).to.equal('sbert-mini-ctx-001');
      expect(seg.ext.type).to.deep.equal([1, 2]);
    });

    it('passes vector through without coercion (e.g. array storage)', function () {
      const arr = [0.1, 0.2, 0.3];
      const seg = mapEntryToOpenRtbSegment({ ...validEntry, vector: arr });
      expect(seg.ext.vector).to.equal(arr);
    });

    it('passes type through without normalizing number to array', function () {
      const seg = mapEntryToOpenRtbSegment({ ...validEntry, type: 1 });
      expect(seg.ext.type).to.equal(1);
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
        ver: undefined,
        vector: undefined,
        dimension: undefined,
        model: undefined,
        type: undefined
      });
    });
  });

  describe('init', function () {
    it('returns true when params.providers is configured with at least one provider', function () {
      const config = { params: { providers: { liveramp: { storageKey: '_lr_agentic_audience_' } } } };
      expect(agenticAudienceAdapterSubmodule.init(config)).to.equal(true);
    });

    it('returns false when params is omitted', function () {
      const config = {};
      expect(agenticAudienceAdapterSubmodule.init(config)).to.equal(false);
    });

    it('returns false when params.providers is undefined', function () {
      const config = { params: {} };
      expect(agenticAudienceAdapterSubmodule.init(config)).to.equal(false);
    });

    it('returns false when params.providers is empty object', function () {
      const config = { params: { providers: {} } };
      expect(agenticAudienceAdapterSubmodule.init(config)).to.equal(false);
    });

    it('returns false when params.providers is null', function () {
      const config = { params: { providers: null } };
      expect(agenticAudienceAdapterSubmodule.init(config)).to.equal(false);
    });

    it('returns true when custom provider is passed', function () {
      const config = { params: { providers: { customProvider: { storageKey: '_custom_key_' } } } };
      expect(agenticAudienceAdapterSubmodule.init(config)).to.equal(true);
    });
  });

  describe('getBidRequestData', function () {
    it('calls callback and does not inject when params.providers is omitted', function () {
      const config = {};
      const callback = sinon.spy();
      storageGetLocalStub.returns(null);
      storageGetCookieStub.returns(null);

      agenticAudienceAdapterSubmodule.getBidRequestData(reqBidsConfigObj, callback, config);

      expect(callback.calledOnce).to.be.true;
      expect(reqBidsConfigObj.ortb2Fragments.global.user).to.be.undefined;
    });

    it('injects user.data from custom provider when configured', function () {
      const config = { params: { providers: { customProvider: { storageKey: '_custom_agentic_' } } } };
      const callback = sinon.spy();
      storageGetLocalStub.withArgs('_custom_agentic_').returns(encodeData({ entries: [validEntry] }));
      storageGetCookieStub.returns(null);

      agenticAudienceAdapterSubmodule.getBidRequestData(reqBidsConfigObj, callback, config);

      expect(reqBidsConfigObj.ortb2Fragments.global.user.data[0].name).to.equal('customProvider');
      expect(reqBidsConfigObj.ortb2Fragments.global.user.data[0].segment).to.deep.equal([
        mapEntryToOpenRtbSegment(validEntry)
      ]);
    });

    it('uses custom storageKey when passed in params.providers', function () {
      const config = { params: { providers: { liveramp: { storageKey: '_custom_lr_key_' } } } };
      const callback = sinon.spy();
      storageGetLocalStub.withArgs('_custom_lr_key_').returns(encodeData({ entries: [validEntry] }));
      storageGetCookieStub.returns(null);

      agenticAudienceAdapterSubmodule.getBidRequestData(reqBidsConfigObj, callback, config);

      expect(reqBidsConfigObj.ortb2Fragments.global.user.data[0].name).to.equal('liveramp');
      expect(reqBidsConfigObj.ortb2Fragments.global.user.data[0].segment).to.deep.equal([
        mapEntryToOpenRtbSegment(validEntry)
      ]);
    });

    it('calls callback and does not inject when storage has no data', function () {
      const config = { params: { providers: { liveramp: { storageKey: '_lr_agentic_audience_' } } } };
      const callback = sinon.spy();
      storageGetLocalStub.returns(null);
      storageGetCookieStub.returns(null);

      agenticAudienceAdapterSubmodule.getBidRequestData(reqBidsConfigObj, callback, config);

      expect(callback.calledOnce).to.be.true;
      expect(reqBidsConfigObj.ortb2Fragments.global.user).to.be.undefined;
    });

    it('injects user.data from liveramp when storage has valid base64 entries', function () {
      const config = { params: { providers: { liveramp: { storageKey: '_lr_agentic_audience_' } } } };
      const callback = sinon.spy();
      const storedData = encodeData({ entries: [validEntry] });
      storageGetLocalStub.withArgs('_lr_agentic_audience_').returns(storedData);
      storageGetCookieStub.returns(null);

      agenticAudienceAdapterSubmodule.getBidRequestData(reqBidsConfigObj, callback, config);

      expect(callback.calledOnce).to.be.true;
      expect(reqBidsConfigObj.ortb2Fragments.global.user.data).to.have.length(1);
      expect(reqBidsConfigObj.ortb2Fragments.global.user.data[0].name).to.equal('liveramp');
      expect(reqBidsConfigObj.ortb2Fragments.global.user.data[0].segment).to.deep.equal([
        mapEntryToOpenRtbSegment(validEntry)
      ]);
    });

    it('injects user.data from multiple providers (liveramp and raptive)', function () {
      const config = {
        params: {
          providers: {
            liveramp: { storageKey: '_lr_agentic_audience_' },
            raptive: { storageKey: '_raptive_agentic_audience_' }
          }
        }
      };
      const callback = sinon.spy();
      const liverampEntry = { ...validEntry, model: 'sbert-mini-ctx-001' };
      const raptiveEntry = { ...validEntry, vector: vectorBase64Fixture([0.5, 0.6, -0.1]), model: 'raptive-embed-v1', type: [2] };
      storageGetLocalStub.withArgs('_lr_agentic_audience_').returns(encodeData({ entries: [liverampEntry] }));
      storageGetLocalStub.withArgs('_raptive_agentic_audience_').returns(encodeData({ entries: [raptiveEntry] }));
      storageGetCookieStub.returns(null);

      agenticAudienceAdapterSubmodule.getBidRequestData(reqBidsConfigObj, callback, config);

      expect(callback.calledOnce).to.be.true;
      expect(reqBidsConfigObj.ortb2Fragments.global.user.data).to.have.length(2);
      expect(reqBidsConfigObj.ortb2Fragments.global.user.data[0]).to.deep.equal({
        name: 'liveramp',
        segment: [mapEntryToOpenRtbSegment(liverampEntry)]
      });
      expect(reqBidsConfigObj.ortb2Fragments.global.user.data[1]).to.deep.equal({
        name: 'raptive',
        segment: [mapEntryToOpenRtbSegment(raptiveEntry)]
      });
    });

    it('skips provider when storageKey is missing', function () {
      const config = {
        params: {
          providers: {
            liveramp: { storageKey: '_lr_agentic_audience_' },
            badProvider: {}
          }
        }
      };
      const callback = sinon.spy();
      storageGetLocalStub.withArgs('_lr_agentic_audience_').returns(encodeData({ entries: [validEntry] }));
      storageGetCookieStub.returns(null);

      agenticAudienceAdapterSubmodule.getBidRequestData(reqBidsConfigObj, callback, config);

      expect(reqBidsConfigObj.ortb2Fragments.global.user.data).to.have.length(1);
      expect(reqBidsConfigObj.ortb2Fragments.global.user.data[0].name).to.equal('liveramp');
    });

    it('does not inject when stored data has empty entries array', function () {
      const config = { params: { providers: { liveramp: { storageKey: '_lr_agentic_audience_' } } } };
      const callback = sinon.spy();
      storageGetLocalStub.withArgs('_lr_agentic_audience_').returns(encodeData({ entries: [] }));
      storageGetCookieStub.returns(null);

      agenticAudienceAdapterSubmodule.getBidRequestData(reqBidsConfigObj, callback, config);

      expect(callback.calledOnce).to.be.true;
      expect(reqBidsConfigObj.ortb2Fragments.global.user).to.be.undefined;
    });

    it('reads from cookie when localStorage returns null', function () {
      const config = { params: { providers: { liveramp: { storageKey: '_lr_agentic_audience_' } } } };
      const callback = sinon.spy();
      storageGetLocalStub.returns(null);
      storageGetCookieStub.withArgs('_lr_agentic_audience_').returns(encodeData({ entries: [validEntry] }));

      agenticAudienceAdapterSubmodule.getBidRequestData(reqBidsConfigObj, callback, config);

      expect(reqBidsConfigObj.ortb2Fragments.global.user.data[0].segment).to.deep.equal([
        mapEntryToOpenRtbSegment(validEntry)
      ]);
    });
  });

  describe('generates valid OpenRTB user object (Agentic Audiences extension)', function () {
    it('produces valid structure for single provider', function () {
      const config = { params: { providers: { liveramp: { storageKey: '_lr_agentic_audience_' } } } };
      const callback = sinon.spy();
      storageGetLocalStub.withArgs('_lr_agentic_audience_').returns(encodeData({ entries: [validEntry] }));
      storageGetCookieStub.returns(null);

      agenticAudienceAdapterSubmodule.getBidRequestData(reqBidsConfigObj, callback, config);

      const seg = reqBidsConfigObj.ortb2Fragments.global.user.data[0].segment[0];
      expect(seg).to.have.keys('id', 'name', 'ext');
      expect(seg.ext).to.have.keys('ver', 'vector', 'dimension', 'model', 'type');
      expect(seg.ext.vector).to.equal(validEntry.vector);
      expect(seg).to.deep.equal(mapEntryToOpenRtbSegment(validEntry));
    });

    it('produces valid structure for multiple providers', function () {
      const config = {
        params: {
          providers: {
            liveramp: { storageKey: '_lr_agentic_audience_' },
            raptive: { storageKey: '_raptive_agentic_audience_' }
          }
        }
      };
      const callback = sinon.spy();
      const liverampEntry = { ver: '1.0', vector: vectorBase64Fixture([0.1, -0.2, 0.3]), model: 'sbert-mini-ctx-001', dimension: 3, type: [1] };
      const raptiveEntry = { ver: '1.0', vector: vectorBase64Fixture([0.5, 0.6, -0.1]), model: 'raptive-embed-v1', dimension: 3, type: [2] };
      storageGetLocalStub.withArgs('_lr_agentic_audience_').returns(encodeData({ entries: [liverampEntry] }));
      storageGetLocalStub.withArgs('_raptive_agentic_audience_').returns(encodeData({ entries: [raptiveEntry] }));
      storageGetCookieStub.returns(null);

      agenticAudienceAdapterSubmodule.getBidRequestData(reqBidsConfigObj, callback, config);

      expect(reqBidsConfigObj.ortb2Fragments.global.user.data).to.have.length(2);
      reqBidsConfigObj.ortb2Fragments.global.user.data.forEach((dataObj) => {
        expect(dataObj).to.have.keys('name', 'segment');
        expect(dataObj.segment).to.be.an('array');
        dataObj.segment.forEach((segment) => {
          expect(segment).to.have.keys('id', 'name', 'ext');
          expect(segment.ext).to.have.keys('ver', 'vector', 'dimension', 'model', 'type');
        });
      });
    });
  });
});
