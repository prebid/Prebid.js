import {config} from 'src/config.js';
import {getRealTimeData, idWardRtdSubmodule, storage} from 'modules/idWardRtdProvider.js';

describe('idWardRtdProvider', function() {
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
    'name': 'idWard',
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

  describe('idWardRtdSubmodule', function() {
    it('successfully instantiates', function () {
		  expect(idWardRtdSubmodule.init()).to.equal(true);
    });
  });

  describe('Get Real-Time Data', function() {
    it('gets rtd from local storage', function() {
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
        name: 'id-ward.com',
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

    it('should initalise and return with config', function () {
      expect(getRealTimeData(testReqBidsConfigObj, onDone, cmoduleConfig)).to.equal(undefined)
    });
  });
});
