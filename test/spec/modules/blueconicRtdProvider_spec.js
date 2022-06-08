import {config} from 'src/config.js';
import {RTD_LOCAL_NAME, addRealTimeData, getRealTimeData, blueconicSubmodule, storage} from 'modules/blueconicRtdProvider.js';

describe('blueconicRtdProvider', function() {
  let getDataFromLocalStorageStub;
  beforeEach(function() {
    config.resetConfig();
    getDataFromLocalStorageStub = sinon.stub(storage, 'getDataFromLocalStorage');
  });

  afterEach(function () {
    getDataFromLocalStorageStub.restore();
  });

  describe('blueconicSubmodule', function() {
    it('successfully instantiates', function () {
		  expect(blueconicSubmodule.init()).to.equal(true);
    });
  });

  describe('Add Blueconic Real-Time Data', function() {
    it('merges data', function() {
      const setConfigUserObj1 = {
        name: 'www.dataprovider1.com',
        blueconic_segment: ['189', '12']
      };

      const setConfigUserObj2 = {
        name: 'www.dataprovider2.com',
        blueconic_segment: ['152']
      };

      config.setConfig({
        ortb2: {
          user: {
            data: [setConfigUserObj1, setConfigUserObj2]
          }
        }
      });

      const rtdUserObj1 = {
        name: 'www.dataprovider4.com',
        blueconic_segment: ['188']
      };
      const rtd = {
        ortb2: {
          user: {
            data: [rtdUserObj1]
          }
        }
      };

      addRealTimeData(rtd);

      let ortb2Config = config.getConfig().ortb2;

      expect(ortb2Config.user.data).to.deep.include.members([setConfigUserObj1, setConfigUserObj2, rtdUserObj1]);
    });

    it('merges data without duplication', function() {
      const userObj1 = {
        name: 'www.dataprovider1.com',
        blueconic_segment: ['1776'
        ]
      };

      const userObj2 = {
        name: 'www.dataprovider2.com',
        blueconic_segment: ['1914'
        ]
      };

      config.setConfig({
        ortb2: {
          user: {
            data: [userObj1, userObj2]
          }
        }
      });

      const rtd = {
        ortb2: {
          user: {
            data: [userObj1]
          }
        }
      };

      addRealTimeData(rtd);

      let ortb2Config = config.getConfig().ortb2;

      expect(ortb2Config.user.data).to.deep.include.members([userObj1, userObj2]);
      expect(ortb2Config.user.data).to.have.lengthOf(2);
    });
  });

  describe('Get BlueConic Real-Time Data', function() {
    it('gets rtd from local storage cache', function() {
      const rtdConfig = {
        params: {
          requestParams: {
            publisherId: 'Publisher1',
            coppa: true
          }}
      };

      const bidConfig = {};

      const rtdUserObj1 = {
        name: 'blueconic',
        blueconic_segment: ['bf23d802-931d-4619-8266-ce9a6328aa2a'],
        bidId: '1234'
      };

      const cachedRtd = {'blueconic_segment': ['bf23d802-931d-4619-8266-ce9a6328aa2a'], 'bidId': '1234'}
      getDataFromLocalStorageStub.withArgs(RTD_LOCAL_NAME).returns(JSON.stringify(cachedRtd));

      expect(config.getConfig().ortb2).to.be.undefined;
      getRealTimeData(bidConfig, () => {}, rtdConfig, {});
      expect(config.getConfig().ortb2.user.data).to.deep.include.members([rtdUserObj1]);
    });
  });
});
