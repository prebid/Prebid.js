import {config} from 'src/config.js';
import {getRealTimeData, anonymisedRtdSubmodule, storage} from 'modules/anonymisedRtdProvider.js';

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
