import * as raynRTD from 'modules/raynRtdProvider.js';
import { config } from 'src/config.js';
import * as utils from 'src/utils.js';

const TEST_CHECKSUM = '-1135402174';
const TEST_URL = 'http://localhost:9876/context.html';
const TEST_SEGMENTS = {
  [TEST_CHECKSUM]: {
    7: {
      2: ['51', '246', '652', '48', '324']
    }
  }
};

const RTD_CONFIG = {
  auctionDelay: 250,
  dataProviders: [
    {
      name: 'rayn',
      waitForIt: true,
      params: {
        bidders: [],
        integration: {
          iabAudienceCategories: {
            v1_1: {
              tier: 6,
              enabled: true,
            },
          },
          iabContentCategories: {
            v3_0: {
              tier: 4,
              enabled: true,
            },
            v2_2: {
              tier: 4,
              enabled: true,
            },
          },
        }
      },
    },
  ],
};

describe('rayn RTD Submodule', function () {
  let getDataFromLocalStorageStub;

  beforeEach(function () {
    config.resetConfig();
    getDataFromLocalStorageStub = sinon.stub(
      raynRTD.storage,
      'getDataFromLocalStorage',
    );
  });

  afterEach(function () {
    getDataFromLocalStorageStub.restore();
  });

  describe('Initialize module', function () {
    it('should initialize and return true', function () {
      expect(raynRTD.raynSubmodule.init(RTD_CONFIG.dataProviders[0])).to.equal(
        true,
      );
    });
  });

  describe('Generate ortb data object', function () {
    it('should set empty segment array', function () {
      expect(raynRTD.generateOrtbDataObject(7, 'invalid', 2).segment).to.be.instanceOf(Array).and.lengthOf(0);
    });

    it('should set segment array', function () {
      const expectedSegmentIdsMap = TEST_SEGMENTS[TEST_CHECKSUM][7][2].map((id) => {
        return { id };
      });
      expect(raynRTD.generateOrtbDataObject(7, TEST_SEGMENTS[TEST_CHECKSUM][7], 4)).to.deep.equal({
        name: raynRTD.SEGMENTS_RESOLVER,
        ext: {
          segtax: 7,
        },
        segment: expectedSegmentIdsMap,
      });
    });
  });

  describe('Generate checksum', function () {
    it('should generate checksum', function () {
      expect(raynRTD.generateChecksum(TEST_URL)).to.equal(TEST_CHECKSUM);
    });
  });

  describe('Get segments', function () {
    it('should get segments from local storage', function () {
      getDataFromLocalStorageStub
        .withArgs(raynRTD.RAYN_LOCAL_STORAGE_KEY)
        .returns(JSON.stringify(TEST_SEGMENTS));

      const segments = raynRTD.readSegments(raynRTD.RAYN_LOCAL_STORAGE_KEY);

      expect(segments).to.deep.equal(TEST_SEGMENTS);
    });

    it('should return null if unable to read and parse data from local storage', function () {
      const testString = 'test';
      getDataFromLocalStorageStub
        .withArgs(raynRTD.RAYN_LOCAL_STORAGE_KEY)
        .returns(testString);

      const segments = raynRTD.readSegments(raynRTD.RAYN_LOCAL_STORAGE_KEY);

      expect(segments).to.equal(null);
    });
  });

  describe('Set segments as bidder ortb2', function () {
    it('should set global ortb2 config', function () {
      const globalOrtb2 = {};
      const bidders = RTD_CONFIG.dataProviders[0].params.bidders;
      const integrationConfig = RTD_CONFIG.dataProviders[0].params.integration;

      raynRTD.setSegmentsAsBidderOrtb2({ ortb2Fragments: { global: globalOrtb2 } }, bidders, integrationConfig, TEST_SEGMENTS, TEST_CHECKSUM);

      TEST_SEGMENTS[TEST_CHECKSUM]['7']['2'].forEach((id) => {
        expect(globalOrtb2.site.content.data[0].segment.find(segment => segment.id === id)).to.exist;
      })
    });

    it('should set bidder specific ortb2 config', function () {
      RTD_CONFIG.dataProviders[0].params.bidders = ['appnexus'];

      const bidderOrtb2 = {};
      const bidders = RTD_CONFIG.dataProviders[0].params.bidders;
      const integrationConfig = RTD_CONFIG.dataProviders[0].params.integration;

      raynRTD.setSegmentsAsBidderOrtb2({ ortb2Fragments: { bidder: bidderOrtb2 } }, bidders, integrationConfig, TEST_SEGMENTS, TEST_CHECKSUM);

      bidders.forEach((bidder) => {
        const ortb2 = bidderOrtb2[bidder];
        TEST_SEGMENTS[TEST_CHECKSUM]['7']['2'].forEach((id) => {
          expect(ortb2.site.content.data[0].segment.find(segment => segment.id === id)).to.exist;
        })
      });
    });

    it('should set bidder specific ortb2 config with all segments', function () {
      TEST_SEGMENTS['4'] = {
        3: ['4', '17', '72', '612']
      };
      TEST_SEGMENTS[TEST_CHECKSUM]['6'] = {
        2: ['71', '313'],
        4: ['33', '145', '712']
      };

      const bidderOrtb2 = {};
      const bidders = RTD_CONFIG.dataProviders[0].params.bidders;
      const integrationConfig = RTD_CONFIG.dataProviders[0].params.integration;

      raynRTD.setSegmentsAsBidderOrtb2({ ortb2Fragments: { bidder: bidderOrtb2 } }, bidders, integrationConfig, TEST_SEGMENTS, TEST_CHECKSUM);

      bidders.forEach((bidder) => {
        const ortb2 = bidderOrtb2[bidder];

        TEST_SEGMENTS[TEST_CHECKSUM]['6']['2'].forEach((id) => {
          expect(ortb2.site.content.data[0].segment.find(segment => segment.id === id)).to.exist;
        });
        TEST_SEGMENTS[TEST_CHECKSUM]['6']['4'].forEach((id) => {
          expect(ortb2.site.content.data[0].segment.find(segment => segment.id === id)).to.exist;
        });
        TEST_SEGMENTS[TEST_CHECKSUM]['7']['2'].forEach((id) => {
          expect(ortb2.site.content.data[1].segment.find(segment => segment.id === id)).to.exist;
        });
        TEST_SEGMENTS['4']['3'].forEach((id) => {
          expect(ortb2.user.data[0].segment.find(segment => segment.id === id)).to.exist;
        });
      });
    });
  });

  describe('Alter Bid Requests', function () {
    it('should update reqBidsConfigObj and execute callback', function () {
      const callbackSpy = sinon.spy();
      const logMessageSpy = sinon.spy(utils, 'logMessage');

      getDataFromLocalStorageStub
        .withArgs(raynRTD.RAYN_LOCAL_STORAGE_KEY)
        .returns(JSON.stringify(TEST_SEGMENTS));

      const reqBidsConfigObj = { ortb2Fragments: { bidder: {} } };

      raynRTD.raynSubmodule.getBidRequestData(reqBidsConfigObj, callbackSpy, RTD_CONFIG);

      expect(callbackSpy.calledOnce).to.be.true;
      expect(logMessageSpy.lastCall.lastArg).to.equal(`Segtax data from localStorage: ${JSON.stringify(TEST_SEGMENTS)}`);

      logMessageSpy.restore();
    });

    it('should update reqBidsConfigObj and execute callback using user segments from localStorage', function () {
      const callbackSpy = sinon.spy();
      const logMessageSpy = sinon.spy(utils, 'logMessage');
      const testSegments = {
        4: {
          3: ['4', '17', '72', '612']
        }
      };

      getDataFromLocalStorageStub
        .withArgs(raynRTD.RAYN_LOCAL_STORAGE_KEY)
        .returns(JSON.stringify(testSegments));

      RTD_CONFIG.dataProviders[0].params.integration.iabContentCategories = {
        v3_0: {
          enabled: false,
        },
        v2_2: {
          enabled: false,
        },
      };

      const reqBidsConfigObj = { ortb2Fragments: { bidder: {} } };

      raynRTD.raynSubmodule.getBidRequestData(reqBidsConfigObj, callbackSpy, RTD_CONFIG.dataProviders[0]);

      expect(callbackSpy.calledOnce).to.be.true;
      expect(logMessageSpy.lastCall.lastArg).to.equal(`Segtax data from localStorage: ${JSON.stringify(testSegments)}`);

      logMessageSpy.restore();
    });

    it('should update reqBidsConfigObj and execute callback using segments from raynJS', function () {
      const callbackSpy = sinon.spy();
      const logMessageSpy = sinon.spy(utils, 'logMessage');

      getDataFromLocalStorageStub
        .withArgs(raynRTD.RAYN_LOCAL_STORAGE_KEY)
        .returns(null);

      const reqBidsConfigObj = { ortb2Fragments: { bidder: {} } };

      raynRTD.raynSubmodule.getBidRequestData(reqBidsConfigObj, callbackSpy, RTD_CONFIG.dataProviders[0]);

      expect(callbackSpy.calledOnce).to.be.true;
      expect(logMessageSpy.lastCall.lastArg).to.equal(`No segtax data`);

      logMessageSpy.restore();
    });

    it('should update reqBidsConfigObj and execute callback using audience from localStorage', function (done) {
      const callbackSpy = sinon.spy();
      const logMessageSpy = sinon.spy(utils, 'logMessage');
      const testSegments = {
        6: {
          4: ['3', '27', '177']
        }
      };

      global.window.raynJS = {
        getSegtax: function () {
          return Promise.resolve(testSegments);
        }
      };

      getDataFromLocalStorageStub
        .withArgs(raynRTD.RAYN_LOCAL_STORAGE_KEY)
        .returns(null);

      const reqBidsConfigObj = { ortb2Fragments: { bidder: {} } };

      raynRTD.raynSubmodule.getBidRequestData(reqBidsConfigObj, callbackSpy, RTD_CONFIG.dataProviders[0]);

      setTimeout(() => {
        expect(callbackSpy.calledOnce).to.be.true;
        expect(logMessageSpy.lastCall.lastArg).to.equal(`Segtax data from RaynJS: ${JSON.stringify(testSegments)}`);
        logMessageSpy.restore();
        done();
      }, 0)
    });

    it('should execute callback if log error', function (done) {
      const callbackSpy = sinon.spy();
      const logErrorSpy = sinon.spy(utils, 'logError');
      const rejectError = 'Error';

      global.window.raynJS = {
        getSegtax: function () {
          return Promise.reject(rejectError);
        }
      };

      getDataFromLocalStorageStub
        .withArgs(raynRTD.RAYN_LOCAL_STORAGE_KEY)
        .returns(null);

      const reqBidsConfigObj = { ortb2Fragments: { bidder: {} } };

      raynRTD.raynSubmodule.getBidRequestData(reqBidsConfigObj, callbackSpy, RTD_CONFIG.dataProviders[0]);

      setTimeout(() => {
        expect(callbackSpy.calledOnce).to.be.true;
        expect(logErrorSpy.lastCall.lastArg).to.equal(rejectError);
        logErrorSpy.restore();
        done();
      }, 0)
    });
  });
});
