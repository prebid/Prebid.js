import { config } from 'src/config.js';
import { getRealTimeData, anonymisedRtdSubmodule, storage } from 'modules/anonymisedRtdProvider.js';
import { loadExternalScriptStub } from 'test/mocks/adloaderStub.js';

describe('anonymisedRtdProvider', function() {
  let getDataFromLocalStorageStub;
  let getDataFromSessionStorageStub;

  const testReqBidsConfigObj = {
    adUnits: [
      {
        bids: ['bid1', 'bid2']
      }
    ]
  };

  const onDone = function() { return true; };

  const cmoduleConfig = {
    'name': 'anonymised',
    'params': {
      'cohortStorageKey': 'cohort_ids'
    }
  };

  beforeEach(function() {
    config.resetConfig();
    getDataFromLocalStorageStub = sinon.stub(storage, 'getDataFromLocalStorage');
    getDataFromSessionStorageStub = sinon.stub(storage, 'getDataFromSessionStorage');
  });

  afterEach(function () {
    getDataFromLocalStorageStub.restore();
    getDataFromSessionStorageStub.restore();
  });

  describe('anonymisedRtdSubmodule', function() {
    let logWarnStub;
    beforeEach(function () {
      logWarnStub = sinon.stub(require('src/utils.js'), 'logWarn');
    });
    afterEach(function () {
      logWarnStub.restore();
      document.querySelectorAll('script[src*="static.anonymised.io"], script[src*="example.io"]').forEach(s => s.parentNode.removeChild(s));
    });

    it('successfully instantiates', function () {
      expect(anonymisedRtdSubmodule.init()).to.equal(true);
    });
    it('should load external script when params.tagConfig.clientId is set', function () {
      const rtdConfig = {
        params: {
          tagConfig: {
            clientId: 'testId'
          }
        }
      };
      anonymisedRtdSubmodule.init(rtdConfig, {});
      expect(loadExternalScriptStub.called).to.be.true;
    });
    it('should not load external script when params.tagConfig.clientId is not set', function () {
      const rtdConfig = {
        params: {
          tagConfig: {}
        }
      };
      anonymisedRtdSubmodule.init(rtdConfig, {});
      expect(loadExternalScriptStub.called).to.be.false;
    });
    it('should not load external script when params.tagConfig is not defined', function () {
      const rtdConfig = {
        params: {}
      };
      anonymisedRtdSubmodule.init(rtdConfig, {});
      expect(loadExternalScriptStub.called).to.be.false;
    });
    it('should not load external script when params.tagConfig.clientId is empty string', function () {
      const rtdConfig = {
        params: {
          tagConfig: {
            clientId: '  '
          }
        }
      };
      anonymisedRtdSubmodule.init(rtdConfig, {});
      expect(loadExternalScriptStub.called).to.be.false;
    });
    it('should not load external script when params.tagConfig.clientId is not a string', function () {
      const rtdConfig = {
        params: {
          tagConfig: {
            clientId: 123
          }
        }
      };
      anonymisedRtdSubmodule.init(rtdConfig, {});
      expect(loadExternalScriptStub.called).to.be.false;
    });
    it('should load external script with correct attributes', function () {
      const rtdConfig = {
        params: {
          tagConfig: {
            clientId: 'testId'
          }
        }
      };
      anonymisedRtdSubmodule.init(rtdConfig, {});
      const expected = `https://static.anonymised.io/light/loader.js?ref=prebid&d=${window.location.hostname}`;
      const expectedTagConfig = {
        idw_client_id: 'testId'
      };

      expect(loadExternalScriptStub.args[0][0]).to.deep.equal(expected);
      expect(loadExternalScriptStub.args[0][5]).to.deep.equal(expectedTagConfig);
    });
    it('should not load external script when it is already loaded', function () {
      const rtdConfig = {
        params: {
          tagConfig: {
            clientId: 'testId'
          }
        }
      };
      const script = document.createElement('script');
      script.src = 'https://static.anonymised.io/light/loader.js?random=quary';
      document.body.appendChild(script);
      anonymisedRtdSubmodule.init(rtdConfig, {});
      expect(loadExternalScriptStub.called).to.be.false;
    });
    it('should not load external script when it is already loaded via http://', function () {
      const rtdConfig = {
        params: {
          tagConfig: {
            clientId: 'testId'
          }
        }
      };
      const script = document.createElement('script');
      script.src = 'http://static.anonymised.io/light/loader.js';
      document.body.appendChild(script);
      anonymisedRtdSubmodule.init(rtdConfig, {});
      expect(loadExternalScriptStub.called).to.be.false;
    });
    it('should not load external script when it is already loaded via protocol-relative URL', function () {
      const rtdConfig = {
        params: {
          tagConfig: {
            clientId: 'testId'
          }
        }
      };
      const script = document.createElement('script');
      script.src = '//static.anonymised.io/light/loader.js';
      document.body.appendChild(script);
      anonymisedRtdSubmodule.init(rtdConfig, {});
      expect(loadExternalScriptStub.called).to.be.false;
    });
    it('should load external script from tagUrl when set and log a deprecation warning', function () {
      const rtdConfig = {
        params: {
          tagUrl: 'https://example.io/loader.js',
          tagConfig: {
            clientId: 'testId'
          }
        }
      };
      anonymisedRtdSubmodule.init(rtdConfig, {});
      const expected = `https://example.io/loader.js?ref=prebid&d=${window.location.hostname}`;

      expect(loadExternalScriptStub.args[0][0]).to.deep.equal(expected);
      expect(logWarnStub.calledWithMatch('params.tagUrl is deprecated')).to.be.true;
    });
    it('should not load external script from tagUrl when it is already loaded', function () {
      const rtdConfig = {
        params: {
          tagUrl: 'https://example.io/loader.js',
          tagConfig: {
            clientId: 'testId'
          }
        }
      };
      const script = document.createElement('script');
      script.src = 'https://example.io/loader.js';
      document.body.appendChild(script);
      anonymisedRtdSubmodule.init(rtdConfig, {});
      expect(loadExternalScriptStub.called).to.be.false;
    });
  });

  describe('Get Real-Time Data', function() {
    it('gets rtd from local storage and set to ortb2.user.data', function() {
      const rtdConfig = {
        params: {
          cohortStorageKey: 'cohort_ids',
          bidders: ['smartadserver'],
          segtax: 503
        }
      };

      const bidConfig = {
        ortb2Fragments: {
          global: {}
        }
      };

      const rtdUserObj1 = {
        name: 'anonymised.io',
        ext: {
          segtax: 503
        },
        segment: [
          {
            id: 'TCZPQOWPEJG3MJOTUQUF793A'
          },
          {
            id: '93SUG3H540WBJMYNT03KX8N3'
          }
        ]
      };

      getDataFromLocalStorageStub.withArgs('cohort_ids')
        .returns(JSON.stringify(['TCZPQOWPEJG3MJOTUQUF793A', '93SUG3H540WBJMYNT03KX8N3']));

      getRealTimeData(bidConfig, () => {}, rtdConfig, {});
      expect(bidConfig.ortb2Fragments.global.user.data).to.deep.include.members([rtdUserObj1]);
      expect(bidConfig.ortb2Fragments.global.user.keywords).to.be.undefined;
    });

    it('gets rtd from local storage and set to ortb2.user.keywords for appnexus bidders parameter', function() {
      const rtdConfig = {
        params: {
          cohortStorageKey: 'cohort_ids',
          bidders: ['smartadserver', 'appnexus'],
          segtax: 503
        }
      };

      const bidConfig = {
        ortb2Fragments: {
          global: {}
        }
      };

      const rtdUserObj1 = {
        name: 'anonymised.io',
        ext: {
          segtax: 503
        },
        segment: [
          {
            id: 'TCZPQOWPEJG3MJOTUQUF793A'
          },
          {
            id: '93SUG3H540WBJMYNT03KX8N3'
          }
        ]
      };

      getDataFromLocalStorageStub.withArgs('cohort_ids')
        .returns(JSON.stringify(['TCZPQOWPEJG3MJOTUQUF793A', '93SUG3H540WBJMYNT03KX8N3']));

      getRealTimeData(bidConfig, () => {}, rtdConfig, {});
      expect(bidConfig.ortb2Fragments.global.user.data).to.deep.include.members([rtdUserObj1]);
      expect(bidConfig.ortb2Fragments.global.user.keywords).to.include('perid=TCZPQOWPEJG3MJOTUQUF793A');
      expect(bidConfig.ortb2Fragments.global.user.keywords).to.include('perid=93SUG3H540WBJMYNT03KX8N3');
    });

    it('gets rtd from local storage and set to ortb2.user.data if `bidders` parameter undefined', function() {
      const rtdConfig = {
        params: {
          cohortStorageKey: 'cohort_ids',
          segtax: 503
        }
      };

      const bidConfig = {
        ortb2Fragments: {
          global: {}
        }
      };

      const rtdUserObj1 = {
        name: 'anonymised.io',
        ext: {
          segtax: 503
        },
        segment: [
          {
            id: 'TCZPQOWPEJG3MJOTUQUF793A'
          },
          {
            id: '93SUG3H540WBJMYNT03KX8N3'
          }
        ]
      };

      getDataFromLocalStorageStub.withArgs('cohort_ids')
        .returns(JSON.stringify(['TCZPQOWPEJG3MJOTUQUF793A', '93SUG3H540WBJMYNT03KX8N3']));

      getRealTimeData(bidConfig, () => {}, rtdConfig, {});
      expect(bidConfig.ortb2Fragments.global.user.data).to.deep.include.members([rtdUserObj1]);
      expect(bidConfig.ortb2Fragments.global.user.keywords).to.be.undefined;
    });

    it('do not set rtd if `cohortStorageKey` parameter undefined', function() {
      const rtdConfig = {
        params: {
          bidders: ['smartadserver']
        }
      };

      const bidConfig = {
        ortb2Fragments: {
          global: {}
        }
      };

      getDataFromLocalStorageStub.withArgs('cohort_ids')
        .returns(JSON.stringify(['randomsegmentid']));

      getRealTimeData(bidConfig, () => {}, rtdConfig, {});
      expect(bidConfig.ortb2Fragments.global.user).to.be.undefined;
    });

    it('do not set rtd if local storage empty', function() {
      const rtdConfig = {
        params: {
          cohortStorageKey: 'cohort_ids',
          segtax: 503
        }
      };

      const bidConfig = {};

      getDataFromLocalStorageStub.withArgs('cohort_ids')
        .returns(null);

      expect(config.getConfig().ortb2).to.be.undefined;
      getRealTimeData(bidConfig, () => {}, rtdConfig, {});
      expect(config.getConfig().ortb2).to.be.undefined;
    });

    it('do not set rtd if local storage has incorrect value', function() {
      const rtdConfig = {
        params: {
          cohortStorageKey: 'cohort_ids',
          segtax: 503
        }
      };

      const bidConfig = {};

      getDataFromLocalStorageStub.withArgs('cohort_ids')
        .returns('wrong cohort ids value');

      expect(config.getConfig().ortb2).to.be.undefined;
      getRealTimeData(bidConfig, () => {}, rtdConfig, {});
      expect(config.getConfig().ortb2).to.be.undefined;
    });

    it('should initialize and return with config', function () {
      expect(getRealTimeData(testReqBidsConfigObj, onDone, cmoduleConfig)).to.equal(undefined);
    });

    it('passes `segtax` through untouched when the parameter is undefined', function() {
      // Long-standing behaviour: there is no default. Publishers are expected to configure
      // segtax: 1000, and an omitted value is emitted as undefined rather than substituted.
      const rtdConfig = {
        params: {
          cohortStorageKey: 'cohort_ids'
        }
      };

      const bidConfig = { ortb2Fragments: { global: {} } };

      getDataFromLocalStorageStub.withArgs('cohort_ids')
        .returns(JSON.stringify(['TCZPQOWPEJG3MJOTUQUF793A']));

      getRealTimeData(bidConfig, () => {}, rtdConfig, {});
      expect(bidConfig.ortb2Fragments.global.user.data[0].ext).to.have.property('segtax', undefined);
    });

    it('emits an empty cohort segment when the stored array is empty', function() {
      // Long-standing behaviour, preserved deliberately: an empty array is truthy, so it still
      // produces a user.data entry (and empty appnexus keywords).
      const rtdConfig = {
        params: { cohortStorageKey: 'cohort_ids', segtax: 503, bidders: ['appnexus'] }
      };

      const bidConfig = { ortb2Fragments: { global: {} } };

      getDataFromLocalStorageStub.withArgs('cohort_ids').returns(JSON.stringify([]));

      getRealTimeData(bidConfig, () => {}, rtdConfig, {});
      expect(bidConfig.ortb2Fragments.global.user.data).to.deep.equal([{
        name: 'anonymised.io',
        ext: { segtax: 503 },
        segment: []
      }]);
      expect(bidConfig.ortb2Fragments.global.user.keywords).to.equal('');
    });

    it('calls onDone even when there is nothing to add', function() {
      const rtdConfig = { params: { cohortStorageKey: 'cohort_ids' } };
      const bidConfig = { ortb2Fragments: { global: {} } };
      const doneSpy = sinon.spy();

      getDataFromLocalStorageStub.withArgs('cohort_ids').returns(null);

      getRealTimeData(bidConfig, doneSpy, rtdConfig, {});
      expect(doneSpy.calledOnce).to.be.true;
    });

    it('calls onDone when config is missing', function() {
      const doneSpy = sinon.spy();
      getRealTimeData({ ortb2Fragments: { global: {} } }, doneSpy, undefined, {});
      expect(doneSpy.calledOnce).to.be.true;
    });

    it('still calls onDone when a corrupted cohort value throws', function() {
      // A non-array in cohort_ids has always thrown on .map, and that is left as-is here. What is
      // new is that the auction is released rather than left waiting on this submodule.
      const rtdConfig = { params: { cohortStorageKey: 'cohort_ids' } };
      const bidConfig = { ortb2Fragments: { global: {} } };
      const doneSpy = sinon.spy();

      getDataFromLocalStorageStub.withArgs('cohort_ids').returns(JSON.stringify({ not: 'an array' }));

      expect(() => getRealTimeData(bidConfig, doneSpy, rtdConfig, {})).to.throw();
      expect(doneSpy.calledOnce).to.be.true;
    });
  });

  describe('Publisher Provided Signals (SDA)', function() {
    const rtdConfig = {
      params: {
        cohortStorageKey: 'cohort_ids',
        segtax: 503
      }
    };

    const ppsUserObj = {
      name: 'anonymised.io',
      ext: {
        segtax: 4
      },
      segment: [
        { id: '522' },
        { id: '687' }
      ]
    };

    const signalLift = (overrides = {}) => JSON.stringify({
      clientId: 'NDEx',
      settings: { ppidEnabled: true, ppsEnabled: true, secureSignalsEnabled: false },
      iabAudience: ['522', '687'],
      ...overrides
    });

    let bidConfig;

    beforeEach(function() {
      bidConfig = { ortb2Fragments: { global: {} } };
    });

    it('sets the SDA segment with segtax 4 when PPS is enabled', function() {
      getDataFromLocalStorageStub.withArgs('anon-sl').returns(signalLift());

      getRealTimeData(bidConfig, () => {}, rtdConfig, {});
      expect(bidConfig.ortb2Fragments.global.user.data).to.deep.equal([ppsUserObj]);
    });

    it('sets the SDA segment alongside the cohort segment when both are present', function() {
      getDataFromLocalStorageStub.withArgs('cohort_ids')
        .returns(JSON.stringify(['TCZPQOWPEJG3MJOTUQUF793A']));
      getDataFromLocalStorageStub.withArgs('anon-sl').returns(signalLift());

      getRealTimeData(bidConfig, () => {}, rtdConfig, {});

      const userData = bidConfig.ortb2Fragments.global.user.data;
      expect(userData).to.have.lengthOf(2);
      expect(userData[0]).to.deep.equal({
        name: 'anonymised.io',
        ext: { segtax: 503 },
        segment: [{ id: 'TCZPQOWPEJG3MJOTUQUF793A' }]
      });
      expect(userData[1]).to.deep.equal(ppsUserObj);
    });

    it('sets the cohort segment when PPS data is absent', function() {
      getDataFromLocalStorageStub.withArgs('cohort_ids')
        .returns(JSON.stringify(['TCZPQOWPEJG3MJOTUQUF793A']));
      getDataFromLocalStorageStub.withArgs('anon-sl').returns(null);

      getRealTimeData(bidConfig, () => {}, rtdConfig, {});
      expect(bidConfig.ortb2Fragments.global.user.data).to.have.lengthOf(1);
      expect(bidConfig.ortb2Fragments.global.user.data[0].ext.segtax).to.equal(503);
    });

    it('does not set the SDA segment when `ppsEnabled` is false', function() {
      getDataFromLocalStorageStub.withArgs('anon-sl')
        .returns(signalLift({ settings: { ppsEnabled: false } }));

      getRealTimeData(bidConfig, () => {}, rtdConfig, {});
      expect(bidConfig.ortb2Fragments.global.user).to.be.undefined;
    });

    it('does not set the SDA segment when `settings` is missing', function() {
      getDataFromLocalStorageStub.withArgs('anon-sl')
        .returns(JSON.stringify({ iabAudience: ['522'] }));

      getRealTimeData(bidConfig, () => {}, rtdConfig, {});
      expect(bidConfig.ortb2Fragments.global.user).to.be.undefined;
    });

    it('does not set the SDA segment when `iabAudience` is missing', function() {
      getDataFromLocalStorageStub.withArgs('anon-sl')
        .returns(JSON.stringify({ settings: { ppsEnabled: true } }));

      getRealTimeData(bidConfig, () => {}, rtdConfig, {});
      expect(bidConfig.ortb2Fragments.global.user).to.be.undefined;
    });

    it('does not set the SDA segment when `iabAudience` is empty', function() {
      getDataFromLocalStorageStub.withArgs('anon-sl').returns(signalLift({ iabAudience: [] }));

      getRealTimeData(bidConfig, () => {}, rtdConfig, {});
      expect(bidConfig.ortb2Fragments.global.user).to.be.undefined;
    });

    it('does not set the SDA segment when `iabAudience` is not an array', function() {
      getDataFromLocalStorageStub.withArgs('anon-sl').returns(signalLift({ iabAudience: '522' }));

      getRealTimeData(bidConfig, () => {}, rtdConfig, {});
      expect(bidConfig.ortb2Fragments.global.user).to.be.undefined;
    });

    it('does not set the SDA segment when the stored value is malformed', function() {
      getDataFromLocalStorageStub.withArgs('anon-sl').returns('not json at all');

      expect(() => getRealTimeData(bidConfig, () => {}, rtdConfig, {})).to.not.throw();
      expect(bidConfig.ortb2Fragments.global.user).to.be.undefined;
    });

    it('does not set the SDA segment when the stored value parses to a non-object', function() {
      // Valid JSON that is not an object - a bare number, null, or an array - reaches the code
      // past the try/catch, so it needs rejecting separately from a parse failure.
      ['null', '42', '[]', '"a string"'].forEach(stored => {
        const cfg = { ortb2Fragments: { global: {} } };
        getDataFromLocalStorageStub.withArgs('anon-sl').returns(stored);

        getRealTimeData(cfg, () => {}, rtdConfig, {});
        expect(cfg.ortb2Fragments.global.user, `stored: ${stored}`).to.be.undefined;
      });
    });

    it('never logs the stored value, or an error quoting it, when parsing fails', function() {
      // anon-sl can hold the CUID and a hashed email, and logError/logWarn emit an AUCTION_DEBUG
      // event whatever the debug setting - so anything passed to them is readable by any
      // subscriber. A value malformed from the first character is the dangerous shape: V8 quotes
      // the opening characters of the input in the SyntaxError message, so logging the caught
      // error would leak them too.
      const logErrorSpy = sinon.spy(require('src/utils.js'), 'logError');
      const logWarnSpy = sinon.spy(require('src/utils.js'), 'logWarn');
      const logMessageSpy = sinon.spy(require('src/utils.js'), 'logMessage');
      const secret = 'SECRETCUID-and-a-hashed-email';

      try {
        getDataFromLocalStorageStub.withArgs('anon-sl').returns(secret);

        getRealTimeData(bidConfig, () => {}, rtdConfig, {});

        // Guard against a vacuous pass: if the spies caught nothing the loop below proves nothing.
        expect(logErrorSpy.called, 'expected a parse failure to be reported').to.be.true;

        const logged = [logErrorSpy, logWarnSpy, logMessageSpy]
          .flatMap(spy => spy.getCalls())
          .flatMap(call => call.args)
          .map(arg => (arg instanceof Error ? `${arg.name}: ${arg.message}` : String(arg)))
          .join(' | ');

        // Not just the whole value: no run of its opening characters may appear either.
        for (let end = secret.length; end >= 4; end--) {
          expect(logged, `leaked "${secret.slice(0, end)}"`).to.not.contain(secret.slice(0, end));
        }
      } finally {
        logErrorSpy.restore();
        logWarnSpy.restore();
        logMessageSpy.restore();
      }
    });

    it('drops entries that are not usable taxonomy IDs', function() {
      getDataFromLocalStorageStub.withArgs('anon-sl')
        .returns(signalLift({ iabAudience: ['522', '', null, { id: 6 }, 687] }));

      getRealTimeData(bidConfig, () => {}, rtdConfig, {});
      expect(bidConfig.ortb2Fragments.global.user.data[0].segment).to.deep.equal([
        { id: '522' },
        { id: '687' }
      ]);
    });

    it('never copies the CUID or hashed email out of anon-sl', function() {
      getDataFromLocalStorageStub.withArgs('anon-sl')
        .returns(signalLift({ cuid: 'a-cuid-value', hem: 'a-hashed-email' }));

      getRealTimeData(bidConfig, () => {}, rtdConfig, {});

      const serialised = JSON.stringify(bidConfig.ortb2Fragments.global);
      expect(serialised).to.not.contain('a-cuid-value');
      expect(serialised).to.not.contain('a-hashed-email');
      expect(bidConfig.ortb2Fragments.global.user.data).to.deep.equal([ppsUserObj]);
    });

    it('does not set the SDA segment when the persisted (localStorage) group is holdout', function() {
      getDataFromLocalStorageStub.withArgs('anon-sl').returns(signalLift());
      getDataFromLocalStorageStub.withArgs('anon-sl-group').returns('h');

      getRealTimeData(bidConfig, () => {}, rtdConfig, {});
      expect(bidConfig.ortb2Fragments.global.user).to.be.undefined;
    });

    it('leaves the cohort segment untouched for a holdout session', function() {
      getDataFromLocalStorageStub.withArgs('cohort_ids')
        .returns(JSON.stringify(['TCZPQOWPEJG3MJOTUQUF793A']));
      getDataFromLocalStorageStub.withArgs('anon-sl').returns(signalLift());
      getDataFromLocalStorageStub.withArgs('anon-sl-group').returns('h');

      getRealTimeData(bidConfig, () => {}, rtdConfig, {});
      expect(bidConfig.ortb2Fragments.global.user.data).to.have.lengthOf(1);
      expect(bidConfig.ortb2Fragments.global.user.data[0].ext.segtax).to.equal(503);
    });

    it('sets the SDA segment when the persisted (localStorage) group is treatment', function() {
      getDataFromLocalStorageStub.withArgs('anon-sl').returns(signalLift());
      getDataFromLocalStorageStub.withArgs('anon-sl-group').returns('t');

      getRealTimeData(bidConfig, () => {}, rtdConfig, {});
      expect(bidConfig.ortb2Fragments.global.user.data).to.deep.equal([ppsUserObj]);
    });

    it('treats a missing group assignment as treatment', function() {
      getDataFromLocalStorageStub.withArgs('anon-sl').returns(signalLift());
      getDataFromLocalStorageStub.withArgs('anon-sl-group').returns(null);
      getDataFromSessionStorageStub.withArgs('anon-sl-group-session').returns(null);

      getRealTimeData(bidConfig, () => {}, rtdConfig, {});
      expect(bidConfig.ortb2Fragments.global.user.data).to.deep.equal([ppsUserObj]);
    });

    it('prefers the persisted (localStorage) group over the sessionStorage group', function() {
      // A Marketing Tag that has run in this tab writes both; the persisted copy is what let this
      // module know the group before the tab had a session value (ANON-8367), so it must win any
      // disagreement rather than the two being merged or the session value taking precedence.
      getDataFromLocalStorageStub.withArgs('anon-sl').returns(signalLift());
      getDataFromLocalStorageStub.withArgs('anon-sl-group').returns('h');
      getDataFromSessionStorageStub.withArgs('anon-sl-group-session').returns('t');

      getRealTimeData(bidConfig, () => {}, rtdConfig, {});
      expect(bidConfig.ortb2Fragments.global.user).to.be.undefined;
    });

    it('falls back to the sessionStorage group for a Marketing Tag version that predates ANON-8367', function() {
      // Older tag versions only ever wrote anon-sl-group-session; anon-sl-group is absent, not 'h'
      // or 't', on every page view for those publishers until they upgrade.
      getDataFromLocalStorageStub.withArgs('anon-sl').returns(signalLift());
      getDataFromLocalStorageStub.withArgs('anon-sl-group').returns(null);
      getDataFromSessionStorageStub.withArgs('anon-sl-group-session').returns('h');

      getRealTimeData(bidConfig, () => {}, rtdConfig, {});
      expect(bidConfig.ortb2Fragments.global.user).to.be.undefined;
    });

    it('does not add appnexus keywords for the SDA segment', function() {
      getDataFromLocalStorageStub.withArgs('anon-sl').returns(signalLift());

      getRealTimeData(bidConfig, () => {}, {
        params: { ...rtdConfig.params, bidders: ['appnexus'] }
      }, {});
      expect(bidConfig.ortb2Fragments.global.user.keywords).to.be.undefined;
    });

    it('sets the SDA segment when the config has no `params` at all', function() {
      // params is optional in RTDProviderConfig, and the SDA segment takes no configuration here,
      // so a PPS-only publisher can legitimately supply nothing but `name`.
      getDataFromLocalStorageStub.withArgs('anon-sl').returns(signalLift());

      getRealTimeData(bidConfig, () => {}, { name: 'anonymised' }, {});
      expect(bidConfig.ortb2Fragments.global.user.data).to.deep.equal([ppsUserObj]);
    });

    it('sets the SDA segment when `params` is an empty object', function() {
      getDataFromLocalStorageStub.withArgs('anon-sl').returns(signalLift());

      getRealTimeData(bidConfig, () => {}, { name: 'anonymised', params: {} }, {});
      expect(bidConfig.ortb2Fragments.global.user.data).to.deep.equal([ppsUserObj]);
    });

    it('does not complain about `cohortStorageKey` when none is configured', function() {
      const logErrorSpy = sinon.spy(require('src/utils.js'), 'logError');
      try {
        getDataFromLocalStorageStub.withArgs('anon-sl').returns(signalLift());

        getRealTimeData(bidConfig, () => {}, { name: 'anonymised' }, {});
        expect(logErrorSpy.calledWithMatch('cohortStorageKey')).to.be.false;
      } finally {
        logErrorSpy.restore();
      }
    });

    it('still complains about a `cohortStorageKey` that is set to the wrong value', function() {
      const logErrorSpy = sinon.spy(require('src/utils.js'), 'logError');
      try {
        getDataFromLocalStorageStub.withArgs('anon-sl').returns(signalLift());

        getRealTimeData(bidConfig, () => {}, { params: { cohortStorageKey: 'wrong_key' } }, {});
        expect(logErrorSpy.calledWithMatch('cohortStorageKey')).to.be.true;
      } finally {
        logErrorSpy.restore();
      }
    });

    it('sets the SDA segment even when `cohortStorageKey` is misconfigured', function() {
      getDataFromLocalStorageStub.withArgs('anon-sl').returns(signalLift());

      getRealTimeData(bidConfig, () => {}, { params: { bidders: ['appnexus'] } }, {});
      expect(bidConfig.ortb2Fragments.global.user.data).to.deep.equal([ppsUserObj]);
    });
  });
});
