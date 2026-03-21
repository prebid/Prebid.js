import {
  agenticAudienceAdapterSubmodule,
  DEFAULT_PROVIDERS,
  storage
} from 'modules/agenticAudienceAdapter.js';

describe('agenticAudienceAdapter', function () {
  let sandbox;
  let reqBidsConfigObj;
  let storageGetLocalStub;
  let storageGetCookieStub;
  let storageLocalEnabledStub;
  let storageCookiesEnabledStub;

  const validEntry = {
    ver: '1.0',
    vector: [0.1, -0.2, 0.3],
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

  describe('init', function () {
    it('returns true when params.providers is configured', function () {
      const config = { params: { providers: { liveRamp: { storageKey: '_lr_agentic_audience_' } } } };
      expect(agenticAudienceAdapterSubmodule.init(config)).to.equal(true);
    });

    it('returns true when params is omitted (uses DEFAULT_PROVIDERS)', function () {
      const config = {};
      expect(agenticAudienceAdapterSubmodule.init(config)).to.equal(true);
    });

    it('returns true when params.providers is undefined (uses DEFAULT_PROVIDERS)', function () {
      const config = { params: {} };
      expect(agenticAudienceAdapterSubmodule.init(config)).to.equal(true);
    });

    it('returns true when params.providers is empty object (falls back to DEFAULT_PROVIDERS)', function () {
      const config = { params: { providers: {} } };
      expect(agenticAudienceAdapterSubmodule.init(config)).to.equal(true);
    });

    it('returns true when params.providers is null (falls back to DEFAULT_PROVIDERS)', function () {
      const config = { params: { providers: null } };
      expect(agenticAudienceAdapterSubmodule.init(config)).to.equal(true);
    });

    it('uses params.providers to override DEFAULT_PROVIDERS when passed', function () {
      const config = { params: { providers: { customProvider: { storageKey: '_custom_key_' } } } };
      expect(agenticAudienceAdapterSubmodule.init(config)).to.equal(true);
    });
  });

  describe('getBidRequestData', function () {
    it('calls callback when DEFAULT_PROVIDERS have no data in storage', function () {
      const config = {};
      const callback = sinon.spy();
      storageGetLocalStub.returns(null);
      storageGetCookieStub.returns(null);

      agenticAudienceAdapterSubmodule.getBidRequestData(reqBidsConfigObj, callback, config);

      expect(callback.calledOnce).to.be.true;
      expect(reqBidsConfigObj.ortb2Fragments.global.user).to.be.undefined;
    });

    it('merges params.providers with DEFAULT_PROVIDERS; custom provider adds to defaults', function () {
      const config = { params: { providers: { customProvider: { storageKey: '_custom_agentic_' } } } };
      const callback = sinon.spy();
      storageGetLocalStub.withArgs('_custom_agentic_').returns(encodeData({ entries: [validEntry] }));
      storageGetCookieStub.returns(null);

      agenticAudienceAdapterSubmodule.getBidRequestData(reqBidsConfigObj, callback, config);

      expect(reqBidsConfigObj.ortb2Fragments.global.user.data[0].name).to.equal('custom_provider');
      expect(reqBidsConfigObj.ortb2Fragments.global.user.data[0].segment).to.deep.equal([validEntry]);
    });

    it('overrides default provider storageKey when passed in params.providers', function () {
      const config = { params: { providers: { liveRamp: { storageKey: '_custom_lr_key_' } } } };
      const callback = sinon.spy();
      storageGetLocalStub.withArgs('_custom_lr_key_').returns(encodeData({ entries: [validEntry] }));
      storageGetCookieStub.returns(null);

      agenticAudienceAdapterSubmodule.getBidRequestData(reqBidsConfigObj, callback, config);

      expect(reqBidsConfigObj.ortb2Fragments.global.user.data[0].name).to.equal('live_ramp');
      expect(reqBidsConfigObj.ortb2Fragments.global.user.data[0].segment).to.deep.equal([validEntry]);
    });

    it('calls callback and does not inject when storage has no data', function () {
      const config = { params: { providers: { liveRamp: { storageKey: '_lr_agentic_audience_' } } } };
      const callback = sinon.spy();
      storageGetLocalStub.returns(null);
      storageGetCookieStub.returns(null);

      agenticAudienceAdapterSubmodule.getBidRequestData(reqBidsConfigObj, callback, config);

      expect(callback.calledOnce).to.be.true;
      expect(reqBidsConfigObj.ortb2Fragments.global.user).to.be.undefined;
    });

    it('injects user.data from LiveRamp when storage has valid base64 entries', function () {
      const config = { params: { providers: { liveRamp: { storageKey: '_lr_agentic_audience_' } } } };
      const callback = sinon.spy();
      const storedData = encodeData({ entries: [validEntry] });
      storageGetLocalStub.withArgs('_lr_agentic_audience_').returns(storedData);
      storageGetCookieStub.returns(null);

      agenticAudienceAdapterSubmodule.getBidRequestData(reqBidsConfigObj, callback, config);

      expect(callback.calledOnce).to.be.true;
      expect(reqBidsConfigObj.ortb2Fragments.global.user.data).to.have.length(1);
      expect(reqBidsConfigObj.ortb2Fragments.global.user.data[0].name).to.equal('live_ramp');
      expect(reqBidsConfigObj.ortb2Fragments.global.user.data[0].segment).to.deep.equal([validEntry]);
    });

    it('injects user.data from multiple providers (LiveRamp and Optable)', function () {
      const config = {
        params: {
          providers: {
            liveRamp: { storageKey: '_lr_agentic_audience_' },
            optable: { storageKey: '_optable_agentic_audience_' }
          }
        }
      };
      const callback = sinon.spy();
      const liveRampEntry = { ...validEntry, model: 'sbert-mini-ctx-001' };
      const optableEntry = { ...validEntry, vector: [0.5, 0.6, -0.1], model: 'optable-embed-v1', type: [2] };
      storageGetLocalStub.withArgs('_lr_agentic_audience_').returns(encodeData({ entries: [liveRampEntry] }));
      storageGetLocalStub.withArgs('_optable_agentic_audience_').returns(encodeData({ entries: [optableEntry] }));
      storageGetCookieStub.returns(null);

      agenticAudienceAdapterSubmodule.getBidRequestData(reqBidsConfigObj, callback, config);

      expect(callback.calledOnce).to.be.true;
      expect(reqBidsConfigObj.ortb2Fragments.global.user.data).to.have.length(2);
      expect(reqBidsConfigObj.ortb2Fragments.global.user.data[0]).to.deep.equal({
        name: 'live_ramp',
        segment: [liveRampEntry]
      });
      expect(reqBidsConfigObj.ortb2Fragments.global.user.data[1]).to.deep.equal({
        name: 'optable',
        segment: [optableEntry]
      });
    });

    it('uses DEFAULT_PROVIDERS when params.providers is omitted', function () {
      const config = { params: {} };
      const callback = sinon.spy();
      storageGetLocalStub.withArgs('_lr_agentic_audience_').returns(encodeData({ entries: [validEntry] }));
      storageGetCookieStub.returns(null);

      agenticAudienceAdapterSubmodule.getBidRequestData(reqBidsConfigObj, callback, config);

      expect(reqBidsConfigObj.ortb2Fragments.global.user.data[0].name).to.equal('live_ramp');
    });

    it('skips provider when storageKey is missing', function () {
      const config = {
        params: {
          providers: {
            liveRamp: { storageKey: '_lr_agentic_audience_' },
            badProvider: {}
          }
        }
      };
      const callback = sinon.spy();
      storageGetLocalStub.withArgs('_lr_agentic_audience_').returns(encodeData({ entries: [validEntry] }));
      storageGetCookieStub.returns(null);

      agenticAudienceAdapterSubmodule.getBidRequestData(reqBidsConfigObj, callback, config);

      expect(reqBidsConfigObj.ortb2Fragments.global.user.data).to.have.length(1);
      expect(reqBidsConfigObj.ortb2Fragments.global.user.data[0].name).to.equal('live_ramp');
    });

    it('does not inject when stored data has empty entries array', function () {
      const config = { params: { providers: { liveRamp: { storageKey: '_lr_agentic_audience_' } } } };
      const callback = sinon.spy();
      storageGetLocalStub.withArgs('_lr_agentic_audience_').returns(encodeData({ entries: [] }));
      storageGetCookieStub.returns(null);

      agenticAudienceAdapterSubmodule.getBidRequestData(reqBidsConfigObj, callback, config);

      expect(callback.calledOnce).to.be.true;
      expect(reqBidsConfigObj.ortb2Fragments.global.user).to.be.undefined;
    });

    it('reads from cookie when localStorage returns null', function () {
      const config = { params: { providers: { liveRamp: { storageKey: '_lr_agentic_audience_' } } } };
      const callback = sinon.spy();
      storageGetLocalStub.returns(null);
      storageGetCookieStub.withArgs('_lr_agentic_audience_').returns(encodeData({ entries: [validEntry] }));

      agenticAudienceAdapterSubmodule.getBidRequestData(reqBidsConfigObj, callback, config);

      expect(reqBidsConfigObj.ortb2Fragments.global.user.data[0].segment).to.deep.equal([validEntry]);
    });
  });

  describe('DEFAULT_PROVIDERS', function () {
    it('includes liveRamp and optable with expected storage keys', function () {
      expect(DEFAULT_PROVIDERS.liveRamp.storageKey).to.equal('_lr_agentic_audience_');
      expect(DEFAULT_PROVIDERS.optable.storageKey).to.equal('_optable_agentic_audience_');
    });
  });

  describe('generates valid OpenRTB user object', function () {
    it('produces valid OpenRTB user object for single provider', function () {
      const config = { params: { providers: { liveRamp: { storageKey: '_lr_agentic_audience_' } } } };
      const callback = sinon.spy();
      storageGetLocalStub.withArgs('_lr_agentic_audience_').returns(encodeData({ entries: [validEntry] }));
      storageGetCookieStub.returns(null);

      agenticAudienceAdapterSubmodule.getBidRequestData(reqBidsConfigObj, callback, config);

      const expectedUser = {
        user: {
          data: [
            {
              name: 'live_ramp',
              segment: [
                {
                  ver: '1.0',
                  vector: [0.1, -0.2, 0.3],
                  model: 'sbert-mini-ctx-001',
                  dimension: 3,
                  type: [1, 2]
                }
              ]
            }
          ]
        }
      };
      expect(reqBidsConfigObj.ortb2Fragments.global).to.deep.include(expectedUser);
      expect(reqBidsConfigObj.ortb2Fragments.global.user.data).to.be.an('array');
      expect(reqBidsConfigObj.ortb2Fragments.global.user.data[0]).to.have.property('name', 'live_ramp');
      expect(reqBidsConfigObj.ortb2Fragments.global.user.data[0]).to.have.property('segment');
      expect(reqBidsConfigObj.ortb2Fragments.global.user.data[0].segment[0]).to.have.keys('ver', 'vector', 'model', 'dimension', 'type');
    });

    it('produces valid OpenRTB user object for multiple providers', function () {
      const config = {
        params: {
          providers: {
            liveRamp: { storageKey: '_lr_agentic_audience_' },
            optable: { storageKey: '_optable_agentic_audience_' }
          }
        }
      };
      const callback = sinon.spy();
      const liveRampEntry = { ver: '1.0', vector: [0.1, -0.2, 0.3], model: 'sbert-mini-ctx-001', dimension: 3, type: [1] };
      const optableEntry = { ver: '1.0', vector: [0.5, 0.6, -0.1], model: 'optable-embed-v1', dimension: 3, type: [2] };
      storageGetLocalStub.withArgs('_lr_agentic_audience_').returns(encodeData({ entries: [liveRampEntry] }));
      storageGetLocalStub.withArgs('_optable_agentic_audience_').returns(encodeData({ entries: [optableEntry] }));
      storageGetCookieStub.returns(null);

      agenticAudienceAdapterSubmodule.getBidRequestData(reqBidsConfigObj, callback, config);

      const expectedUser = {
        user: {
          data: [
            { name: 'live_ramp', segment: [liveRampEntry] },
            { name: 'optable', segment: [optableEntry] }
          ]
        }
      };
      expect(reqBidsConfigObj.ortb2Fragments.global).to.deep.include(expectedUser);
      expect(reqBidsConfigObj.ortb2Fragments.global.user.data).to.have.length(2);
      expect(reqBidsConfigObj.ortb2Fragments.global.user.data[0].name).to.equal('live_ramp');
      expect(reqBidsConfigObj.ortb2Fragments.global.user.data[1].name).to.equal('optable');
      reqBidsConfigObj.ortb2Fragments.global.user.data.forEach((dataObj) => {
        expect(dataObj).to.have.keys('name', 'segment');
        expect(dataObj.segment).to.be.an('array');
        dataObj.segment.forEach((seg) => {
          expect(seg).to.have.keys('ver', 'vector', 'model', 'dimension', 'type');
        });
      });
    });
  });
});
