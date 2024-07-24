import {
  goldfishAdsSubModule,
  manageCallbackResponse,
} from 'modules/goldfishAdsRtdProvider.js';
import { getStorageManager } from '../../../src/storageManager.js';
import { expect } from 'chai';
import { server } from 'test/mocks/xhr.js';
import { config as _config } from 'src/config.js';
import { DATA_STORAGE_KEY, MODULE_NAME, MODULE_TYPE, getStorageData, updateUserData } from '../../../modules/goldfishAdsRtdProvider';

const responseHeader = { 'Content-Type': 'application/json' };

const sampleConfig = {
  name: 'golfishAds',
  waitForIt: true,
  params: {
    key: 'testkey'
  }
};

const sampleAdUnits = [
  {
    code: 'one-div-id',
    mediaTypes: {
      banner: {
        sizes: [970, 250]
      }
    },
    bids: [
      {
        bidder: 'appnexus',
        params: {
          placementId: 12345370,
        }
      }]
  },
  {
    code: 'two-div-id',
    mediaTypes: {
      banner: { sizes: [300, 250] }
    },
    bids: [
      {
        bidder: 'appnexus',
        params: {
          placementId: 12345370,
        }
      }]
  }];

const sampleOutputData = [1, 2, 3]

describe('goldfishAdsRtdProvider is a RTD provider that', function () {
  describe('has a method `init` that', function () {
    it('exists', function () {
      expect(goldfishAdsSubModule.init).to.be.a('function');
    });
    it('returns false missing config params', function () {
      const config = {
        name: 'goldfishAds',
        waitForIt: true,
      };
      const value = goldfishAdsSubModule.init(config);
      expect(value).to.equal(false);
    });
    it('returns false if missing providers param', function () {
      const config = {
        name: 'goldfishAds',
        waitForIt: true,
        params: {}
      };
      const value = goldfishAdsSubModule.init(config);
      expect(value).to.equal(false);
    });
    it('returns false if wrong providers param included', function () {
      const config = {
        name: 'goldfishAds',
        waitForIt: true,
        params: {
          account: 'test'
        }
      };
      const value = goldfishAdsSubModule.init(config);
      expect(value).to.equal(false);
    });
    it('returns true if good providers param included', function () {
      const config = {
        name: 'goldfishAds',
        waitForIt: true,
        params: {
          key: 'testkey'
        }
      };
      const value = goldfishAdsSubModule.init(config);
      expect(value).to.equal(true);
    });
  });

  describe('has a method `getBidRequestData` that', function () {
    it('exists', function () {
      expect(goldfishAdsSubModule.getBidRequestData).to.be.a('function');
    });

    it('send correct request', function () {
      const callback = sinon.spy();
      let request;
      const reqBidsConfigObj = { adUnits: sampleAdUnits };
      goldfishAdsSubModule.getBidRequestData(reqBidsConfigObj, callback, sampleConfig);
      request = server.requests[0];
      request.respond(200, responseHeader, JSON.stringify(sampleOutputData));
      expect(request.url).to.be.include(`?key=testkey`);
    });
  });

  describe('has a manageCallbackResponse that', function () {
    it('properly transforms the response', function () {
      const response = { response: '[\"1\", \"2\", \"3\"]' };
      const output = manageCallbackResponse(response);
      expect(output.name).to.be.equal('goldfishads.com');
    });
  });

  describe('has an updateUserData that', function () {
    it('properly transforms the response', function () {
      const userData = {
        segment: [{id: '1'}, {id: '2'}],
        ext: {
          segtax: 4,
        }
      };
      const reqBidsConfigObj = { ortb2Fragments: { bidder: { appnexus: { user: { data: [] } } } } };
      const output = updateUserData(userData, reqBidsConfigObj);
      expect(output.ortb2Fragments.bidder.appnexus.user.data[0].segment).to.be.length(2);
      expect(output.ortb2Fragments.bidder.appnexus.user.data[0].segment[0].id).to.be.eql('1');
    });
  });

  describe('uses Local Storage to ', function () {
    const sandbox = sinon.createSandbox();
    const storage = getStorageManager({ moduleType: MODULE_TYPE, moduleName: MODULE_NAME })
    beforeEach(() => {
      storage.setDataInLocalStorage(DATA_STORAGE_KEY, JSON.stringify({
        targeting: {
          name: 'goldfishads.com',
          segment: [{id: '1'}, {id: '2'}],
          ext: {
            segtax: 4,
          }
        },
        expiry: new Date().getTime() + 1000 * 60 * 60 * 24 * 30,
      }));
    });
    afterEach(() => {
      sandbox.restore();
    });
    it('get data from local storage', function () {
      const output = getStorageData();
      expect(output.name).to.be.equal('goldfishads.com');
      expect(output.segment).to.be.length(2);
      expect(output.ext.segtax).to.be.equal(4);
    });
  });
});
