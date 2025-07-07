import {config} from 'src/config.js';
import {getRealTimeData, anonymisedRtdSubmodule, storage} from 'modules/anonymisedRtdProvider.js';
import { loadExternalScriptStub } from 'test/mocks/adloaderStub.js';

describe('anonymisedRtdProvider', function() {
  let getDataFromLocalStorageStub;

  const testReqBidsConfigObj = {
    adUnits: [
      {
        bids: ['bid1', 'bid2']
      }
    ]
  };

  const onDone = function() { return true };

  const cmoduleConfig = {
    'name': 'anonymised',
    'params': {
      'cohortStorageKey': 'cohort_ids'
    }
  }

  beforeEach(function() {
    config.resetConfig();
    getDataFromLocalStorageStub = sinon.stub(storage, 'getDataFromLocalStorage')
  });

  afterEach(function () {
    getDataFromLocalStorageStub.restore();
  });

  describe('anonymisedRtdSubmodule', function() {
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
      const expected = 'https://static.anonymised.io/light/loader.js?ref=prebid';
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
    it('should load external script from tagUrl when it is set', function () {
      const rtdConfig = {
        params: {
          tagUrl: 'https://example.io/loader.js',
          tagConfig: {
            clientId: 'testId'
          }
        }
      };
      anonymisedRtdSubmodule.init(rtdConfig, {});
      const expected = 'https://example.io/loader.js';

      expect(loadExternalScriptStub.args[0][0]).to.deep.equal(expected);
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
      expect(getRealTimeData(testReqBidsConfigObj, onDone, cmoduleConfig)).to.equal(undefined)
    });
  });
});
