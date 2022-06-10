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
    it('merges ortb2Fragment data', function() {
      const setConfigUserObj1 = {
        name: 'www.dataprovider1.com',
        ext: {segtax: 1},
        segment: [{id: '1776'}]
      };
      const setConfigUserObj2 = {
        name: 'www.dataprovider2.com',
        ext: {segtax: 1},
        segment: [{id: '1914'}
        ]
      };

      let bidConfig = {
        ortb2Fragments: {
          global: {
            user: {
              data: [setConfigUserObj1, setConfigUserObj2]
            }
          }
        }
      };

      const rtdUserObj1 = {
        name: 'www.dataprovider4.com',
        ext: {segtax: 1},
        segment: [{id: '1918'}, {id: '1939'}
        ]
      };

      const rtd = {
        ortb2: {
          user: {
            data: [rtdUserObj1]
          }
        }
      };

      addRealTimeData(bidConfig.ortb2Fragments.global, rtd);

      let ortb2Config = bidConfig.ortb2Fragments.global;
      expect(ortb2Config.user.data).to.deep.include.members([setConfigUserObj1, setConfigUserObj2, rtdUserObj1]);
    });

    it('merges data without duplication', function() {
      const userObj1 = {
        name: 'www.dataprovider1.com',
        ext: {segtax: 1},
        segment: [{id: '1776'}
        ]
      };

      const userObj2 = {
        ext: {segtax: 1},
        name: 'www.dataprovider2.com',
        segment: [{id: '1914'
        }]
      };

      const bidConfig = {
        ortb2Fragments:
        {
          global: {
            user: {
              data: [userObj1, userObj2]
            }
          }
        }
      };

      const rtd = {
        ortb2: {
          user: {
            data: [userObj1]
          }
        }
      };

      addRealTimeData(bidConfig.ortb2Fragments.global, rtd);

      let ortb2Config = bidConfig.ortb2Fragments.global;

      expect(ortb2Config.user.data).to.deep.include.members([userObj1, userObj2]);
      expect(bidConfig.ortb2Fragments.global.user.data).to.have.lengthOf(2);
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

      const bidConfig = {ortb2Fragments: {global: {}}};

      const rtdUserObj1 = {
        name: 'blueconic',
        ext: {segtax: 1},
        segment: [{id: 'bf23d802-931d-4619-8266-ce9a6328aa2a'}],
        bidId: '1234'
      };

      const cachedRtd = {ext: {segtax: 1}, 'segment': [{id: 'bf23d802-931d-4619-8266-ce9a6328aa2a'}], 'bidId': '1234'}
      getDataFromLocalStorageStub.withArgs(RTD_LOCAL_NAME).returns(JSON.stringify(cachedRtd));

      getRealTimeData(bidConfig, () => {}, rtdConfig, {});
      expect(bidConfig.ortb2Fragments.global.user.data).to.deep.include.members([rtdUserObj1]);
    });
  });
});
