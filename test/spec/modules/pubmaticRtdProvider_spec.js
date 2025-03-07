import { expect } from 'chai';
import * as priceFloors from '../../../modules/priceFloors';
import * as utils from '../../../src/utils.js';
import * as suaModule from '../../../src/fpd/sua.js';
import { config as conf } from '../../../src/config';
import * as hook from '../../../src/hook.js';
import {
  registerSubModule, pubmaticSubmodule, getFloorsConfig, setFloorsConfig, setPriceFloors, fetchFloorRules,
  getCurrentTimeOfDay, getBrowserType, getOs, getDeviceType, getCountry, getUtm, _country
} from '../../../modules/pubmaticRtdProvider.js';

let sandbox;

beforeEach(() => {
  sandbox = sinon.createSandbox();
});

afterEach(() => {
  sandbox.restore();
});

describe('Pubmatic RTD Provider', () => {
  describe('registerSubModule', () => {
    it('should register RTD submodule provider', () => {
      let submoduleStub = sinon.stub(hook, 'submodule');
      registerSubModule();
      assert(submoduleStub.calledOnceWith('realTimeData', pubmaticSubmodule));
      submoduleStub.restore();
    });
  });
  describe('submodule', () => {
    describe('name', () => {
      it('should be pubmatic', () => {
        expect(pubmaticSubmodule.name).to.equal('pubmatic');
      });
    });
  });

  describe('init', () => {
    let logErrorStub;
    let continueAuctionStub;

    const getConfig = () => ({
      params: {
        publisherId: 'test-publisher-id',
        profileId: 'test-profile-id'
      },
    });

    beforeEach(() => {
      logErrorStub = sandbox.stub(utils, 'logError');
      continueAuctionStub = sandbox.stub(priceFloors, 'continueAuction');
    });

    it('should return false if publisherId is missing', () => {
      const config = {
        params: {
          profileId: 'test-profile-id'
        }
      };
      expect(pubmaticSubmodule.init(config)).to.be.false;
    });

    it('should return false if profileId is missing', () => {
      const config = {
        params: {
          publisherId: 'test-publisher-id'
        }
      };
      expect(pubmaticSubmodule.init(config)).to.be.false;
    });

    it('should return false if publisherId is not a string', () => {
      const config = {
        params: {
          publisherId: 123,
          profileId: 'test-profile-id'
        }
      };
      expect(pubmaticSubmodule.init(config)).to.be.false;
    });

    it('should return false if profileId is not a string', () => {
      const config = {
        params: {
          publisherId: 'test-publisher-id',
          profileId: 345
        }
      };
      expect(pubmaticSubmodule.init(config)).to.be.false;
    });

    it('should initialize successfully with valid config', () => {
      expect(pubmaticSubmodule.init(getConfig())).to.be.true;
    });

    it('should handle empty config object', () => {
      expect(pubmaticSubmodule.init({})).to.be.false;
      expect(logErrorStub.calledWith(sinon.match(/Missing publisher Id/))).to.be.true;
    });

    it('should return false if continueAuction is not a function', () => {
      continueAuctionStub.value(undefined);
      expect(pubmaticSubmodule.init(getConfig())).to.be.false;
      expect(logErrorStub.calledWith(sinon.match(/continueAuction is not a function/))).to.be.true;
    });
  });

  describe('getCurrentTimeOfDay', () => {
    let clock;

    beforeEach(() => {
      clock = sandbox.useFakeTimers(new Date('2024-01-01T12:00:00')); // Set fixed time for testing
    });

    afterEach(() => {
      clock.restore();
    });

    const testTimes = [
      { hour: 6, expected: 'morning' },
      { hour: 13, expected: 'afternoon' },
      { hour: 18, expected: 'evening' },
      { hour: 22, expected: 'night' },
      { hour: 4, expected: 'night' }
    ];

    testTimes.forEach(({ hour, expected }) => {
      it(`should return ${expected} at ${hour}:00`, () => {
        clock.setSystemTime(new Date().setHours(hour));
        const result = getCurrentTimeOfDay();
        expect(result).to.equal(expected);
      });
    });
  });

  describe('getBrowserType', () => {
    let userAgentStub, getLowEntropySUAStub;

    const USER_AGENTS = {
      chrome: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      firefox: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0',
      edge: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Edg/91.0.864.67 Safari/537.36',
      safari: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0.6 Mobile/15E148 Safari/604.1',
      ie: 'Mozilla/5.0 (compatible; MSIE 10.0; Windows NT 6.1; Trident/6.0)',
      opera: 'Opera/9.80 (Windows NT 6.1; WOW64) Presto/2.12.388 Version/12.16',
      unknown: 'UnknownBrowser/1.0'
    };

    beforeEach(() => {
      userAgentStub = sandbox.stub(navigator, 'userAgent');
      getLowEntropySUAStub = sandbox.stub(suaModule, 'getLowEntropySUA').returns(undefined);
    });

    afterEach(() => {
      userAgentStub.restore();
      getLowEntropySUAStub.restore();
    });

    it('should detect Chrome', () => {
      userAgentStub.value(USER_AGENTS.chrome);
      expect(getBrowserType()).to.equal('9');
    });

    it('should detect Firefox', () => {
      userAgentStub.value(USER_AGENTS.firefox);
      expect(getBrowserType()).to.equal('12');
    });

    it('should detect Edge', () => {
      userAgentStub.value(USER_AGENTS.edge);
      expect(getBrowserType()).to.equal('2');
    });

    it('should detect Internet Explorer', () => {
      userAgentStub.value(USER_AGENTS.ie);
      expect(getBrowserType()).to.equal('4');
    });

    it('should detect Opera', () => {
      userAgentStub.value(USER_AGENTS.opera);
      expect(getBrowserType()).to.equal('3');
    });

    it('should return 0 for unknown browser', () => {
      userAgentStub.value(USER_AGENTS.unknown);
      expect(getBrowserType()).to.equal('0');
    });

    it('should return -1 when userAgent is null', () => {
      userAgentStub.value(null);
      expect(getBrowserType()).to.equal('-1');
    });
  });

  describe('Utility functions', () => {
    it('should set browser correctly', () => {
      expect(getBrowserType()).to.be.a('string');
    });

    it('should set OS correctly', () => {
      expect(getOs()).to.be.a('string');
    });

    it('should set device type correctly', () => {
      expect(getDeviceType()).to.be.a('string');
    });

    it('should set time of day correctly', () => {
      expect(getCurrentTimeOfDay()).to.be.a('string');
    });

    it('should set country correctly', () => {
      expect(getCountry()).to.satisfy(value => typeof value === 'string' || value === undefined);
    });

    it('should set UTM correctly', () => {
      expect(getUtm()).to.be.a('string');
      expect(getUtm()).to.be.oneOf(['0', '1']);
    });
  });

  describe('getFloorsConfig', () => {
    it('should return correct config structure', () => {
      const result = getFloorsConfig({});

      expect(result.floors.data).to.deep.equal({});

      // Verify the additionalSchemaFields structure
      expect(result.floors.additionalSchemaFields).to.have.all.keys([
        'deviceType',
        'timeOfDay',
        'browser',
        'os',
        'country',
        'utm'
      ]);

      Object.values(result.floors.additionalSchemaFields).forEach(field => {
        expect(field).to.be.a('function');
      });
    });

    it('should merge apiResponse data correctly', () => {
      const apiResponse = {
        currency: 'USD',
        schema: { fields: ['mediaType'] },
        values: { 'banner': 1.0 }
      };

      const result = getFloorsConfig(apiResponse);

      expect(result.floors.data).to.deep.equal(apiResponse);
    });

    it('should maintain correct function references', () => {
      const result = getFloorsConfig({});

      expect(result.floors.additionalSchemaFields.deviceType).to.equal(getDeviceType);
      expect(result.floors.additionalSchemaFields.timeOfDay).to.equal(getCurrentTimeOfDay);
      expect(result.floors.additionalSchemaFields.browser).to.equal(getBrowserType);
      expect(result.floors.additionalSchemaFields.os).to.equal(getOs);
      expect(result.floors.additionalSchemaFields.country).to.equal(getCountry);
      expect(result.floors.additionalSchemaFields.utm).to.equal(getUtm);
    });
  });

  describe('setFloorsConfig', () => {
    let logMessageStub;
    let confStub;

    beforeEach(() => {
      logMessageStub = sandbox.stub(utils, 'logMessage');
      confStub = sandbox.stub(conf, 'setConfig');
    });

    it('should set config when valid data is provided', () => {
      const validData = {
        currency: 'USD',
        schema: { fields: ['mediaType'] }
      };

      setFloorsConfig(validData);

      expect(confStub.calledOnce).to.be.true;
      const calledWith = confStub.getCall(0).args[0];
      expect(calledWith).to.have.nested.property('floors.data.currency', 'USD');
      expect(calledWith).to.have.nested.property('floors.data.schema.fields[0]', 'mediaType');
    });

    it('should log message when data is null', () => {
      setFloorsConfig(null);

      expect(confStub.called).to.be.false;
      expect(logMessageStub.calledOnce).to.be.true;
      expect(logMessageStub.getCall(0).args[0]).to.include('floors data is empty');
    });

    it('should log message when data is undefined', () => {
      setFloorsConfig(undefined);

      expect(confStub.called).to.be.false;
      expect(logMessageStub.calledOnce).to.be.true;
      expect(logMessageStub.getCall(0).args[0]).to.include('floors data is empty');
    });

    it('should log message when data is an empty object', () => {
      setFloorsConfig({});

      expect(confStub.called).to.be.false;
      expect(logMessageStub.calledOnce).to.be.true;
      expect(logMessageStub.getCall(0).args[0]).to.include('floors data is empty');
    });

    it('should log message when data is an array', () => {
      setFloorsConfig([]);

      expect(confStub.called).to.be.false;
      expect(logMessageStub.calledOnce).to.be.true;
      expect(logMessageStub.getCall(0).args[0]).to.include('floors data is empty');
    });

    it('should set config with complex floor data', () => {
      const floorData = {
        currency: 'USD',
        schema: {
          fields: ['mediaType', 'size'],
          delimiter: '|'
        },
        values: {
          'banner|300x250': 1.0,
          'banner|300x600': 2.0
        }
      };

      setFloorsConfig(floorData);

      expect(confStub.calledOnce).to.be.true;
      const calledWith = confStub.getCall(0).args[0];
      expect(calledWith.floors.data).to.deep.equal(floorData);
    });

    it('should handle non-object data types', () => {
      const invalidInputs = [
        'string',
        123,
        true,
        () => { },
        Symbol('test')
      ];

      invalidInputs.forEach(input => {
        setFloorsConfig(input);
        expect(confStub.called).to.be.false;
        expect(logMessageStub.called).to.be.true;
      });
    });
  });

  describe('Price Floor Functions', () => {
    let logErrorStub;
    let fetchStub;
    let confStub;

    beforeEach(() => {
      logErrorStub = sandbox.stub(utils, 'logError');
      fetchStub = sandbox.stub(window, 'fetch');
      confStub = sandbox.stub(conf, 'setConfig');
    });

    afterEach(() => {
      sandbox.restore();
    });

    describe('fetchFloorRules', () => {
      beforeEach(() => {
        global._country = undefined;
      });

      it('should successfully fetch and parse floor rules', async () => {
        const mockApiResponse = {
          data: {
            currency: 'USD',
            modelGroups: [],
            values: {}
          }
        };

        fetchStub.resolves(new Response(JSON.stringify(mockApiResponse), { status: 200, headers: { 'country_code': 'US' } }));

        const result = await fetchFloorRules('publisherId', 'profileId');
        expect(result).to.deep.equal(mockApiResponse);
        expect(_country).to.equal('US');
      });

      it('should correctly extract the first unique country code from response headers', async () => {
        fetchStub.resolves(new Response(JSON.stringify({}), {
          status: 200,
          headers: { 'country_code': 'US,IN,US' }
        }));

        await fetchFloorRules('publisherId', 'profileId');
        expect(_country).to.equal('US');
      });

      it('should set _country to undefined if country_code header is missing', async () => {
        fetchStub.resolves(new Response(JSON.stringify({}), {
          status: 200
        }));

        await fetchFloorRules('publisherId', 'profileId');
        expect(_country).to.be.undefined;
      });

      it('should log error when JSON parsing fails', async () => {
        fetchStub.resolves(new Response('Invalid JSON', { status: 200 }));

        await fetchFloorRules('publisherId', 'profileId');
        expect(logErrorStub.calledOnce).to.be.true;
        expect(logErrorStub.firstCall.args[0]).to.include('Error while fetching floors');
      });

      it('should log error when response is not ok', async () => {
        fetchStub.resolves(new Response(null, { status: 500 }));

        await fetchFloorRules('publisherId', 'profileId');
        expect(logErrorStub.calledWith(sinon.match(/Error while fetching floors: No response/))).to.be.true;
      });

      it('should log error on network failure', async () => {
        fetchStub.rejects(new Error('Network Error'));

        await fetchFloorRules('publisherId', 'profileId');
        expect(logErrorStub.calledOnce).to.be.true;
        expect(logErrorStub.firstCall.args[0]).to.include('Error while fetching floors');
      });
    });

    describe('setPriceFloors', () => {
      it('should log error for empty response', async () => {
        fetchStub.resolves(new Response(null, { status: 200 }));

        await setPriceFloors();
        expect(logErrorStub.calledWith(sinon.match(/Error while fetching floors/))).to.be.true;
      });

      it('should successfully process valid response', async () => {
        const mockApiResponse = {
          data: {
            currency: 'USD',
            modelGroups: [],
            values: {}
          }
        };

        fetchStub.resolves(new Response(JSON.stringify(mockApiResponse), { status: 200 }));
        await setPriceFloors('publisherId', 'profileId');

        expect(fetchStub.calledOnce).to.be.true;
        expect(confStub.calledOnce).to.be.true;
      });
    });
  });

  describe('getBidRequestData', () => {
    let _pubmaticFloorRulesPromiseMock;
    let continueAuctionStub;
    let callback = sinon.spy();

    const reqBidsConfigObj = {
      adUnits: [{ code: 'ad-slot-code-0' }],
      auctionId: 'auction-id-0',
      ortb2Fragments: {
        bidder: {
          user: {
            ext: {
              ctr: 'US',
            }
          }
        }
      }
    };

    const ortb2 = {
      user: {
        ext: {
          ctr: 'US',
        }
      }
    }

    const hookConfig = {
      reqBidsConfigObj,
      context: this,
      nextFn: () => true,
      haveExited: false,
      timer: null
    };

    beforeEach(() => {
      continueAuctionStub = sandbox.stub(priceFloors, 'continueAuction');
    });

    it('should call continueAuction once after _pubmaticFloorRulesPromise. Also getBidRequestData executed only once', async () => {
      _pubmaticFloorRulesPromiseMock = Promise.resolve();
      pubmaticSubmodule.getBidRequestData(reqBidsConfigObj, callback);
      await _pubmaticFloorRulesPromiseMock;
      expect(continueAuctionStub.calledOnce);
      expect(
        continueAuctionStub.alwaysCalledWith(
          hookConfig
        )
      );
      expect(reqBidsConfigObj.ortb2Fragments.bidder).to.deep.include(ortb2);
    });
  });
});
