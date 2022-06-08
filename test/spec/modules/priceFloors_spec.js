import {expect} from 'chai';
import * as utils from 'src/utils.js';
import { getGlobal } from 'src/prebidGlobal.js';
import CONSTANTS from 'src/constants.json';
import {
  _floorDataForAuction,
  getFloorsDataForAuction,
  getFirstMatchingFloor,
  getFloor,
  handleSetFloorsConfig,
  requestBidsHook,
  isFloorsDataValid,
  addBidResponseHook,
  fieldMatchingFunctions,
  allowedFields
} from 'modules/priceFloors.js';
import * as events from 'src/events.js';
import * as mockGpt from '../integration/faker/googletag.js';
import 'src/prebid.js';
import {createBid} from '../../../src/bidfactory.js';
import {auctionManager} from '../../../src/auctionManager.js';
import {stubAuctionIndex} from '../../helpers/indexStub.js';

describe('the price floors module', function () {
  let logErrorSpy;
  let logWarnSpy;
  let sandbox;
  let clock;
  const basicFloorData = {
    modelVersion: 'basic model',
    modelWeight: 10,
    modelTimestamp: 1606772895,
    currency: 'USD',
    schema: {
      delimiter: '|',
      fields: ['mediaType']
    },
    values: {
      'banner': 1.0,
      'video': 5.0,
      '*': 2.5
    }
  };
  const basicFloorDataHigh = {
    floorMin: 7.0,
    modelVersion: 'basic model',
    modelWeight: 10,
    currency: 'USD',
    schema: {
      delimiter: '|',
      fields: ['mediaType']
    },
    values: {
      'banner': 1.0,
      'video': 5.0,
      '*': 2.5
    }
  };
  const basicFloorDataLow = {
    floorMin: 2.3,
    modelVersion: 'basic model',
    modelWeight: 10,
    currency: 'USD',
    schema: {
      delimiter: '|',
      fields: ['mediaType']
    },
    values: {
      'banner': 1.0,
      'video': 5.0,
      '*': 2.5
    }
  };
  const basicFloorConfig = {
    enabled: true,
    auctionDelay: 0,
    endpoint: {},
    enforcement: {
      enforceJS: true,
      enforcePBS: false,
      floorDeals: false,
      bidAdjustment: true
    },
    data: basicFloorData
  }
  const minFloorConfigHigh = {
    enabled: true,
    auctionDelay: 0,
    floorMin: 7,
    endpoint: {},
    enforcement: {
      enforceJS: true,
      enforcePBS: false,
      floorDeals: false,
      bidAdjustment: true
    },
    data: basicFloorDataHigh
  }
  const minFloorConfigLow = {
    enabled: true,
    auctionDelay: 0,
    floorMin: 2.3,
    endpoint: {},
    enforcement: {
      enforceJS: true,
      enforcePBS: false,
      floorDeals: false,
      bidAdjustment: true
    },
    data: basicFloorDataLow
  }
  const basicBidRequest = {
    bidder: 'rubicon',
    adUnitCode: 'test_div_1',
    auctionId: '1234-56-789',
    transactionId: 'tr_test_div_1'
  };

  function getAdUnitMock(code = 'adUnit-code') {
    return {
      code,
      mediaTypes: {banner: { sizes: [[300, 200], [300, 600]] }, native: {}},
      bids: [{bidder: 'someBidder'}, {bidder: 'someOtherBidder'}]
    };
  }
  beforeEach(function() {
    clock = sinon.useFakeTimers();
    sandbox = sinon.sandbox.create();
    logErrorSpy = sinon.spy(utils, 'logError');
    logWarnSpy = sinon.spy(utils, 'logWarn');
  });

  afterEach(function() {
    clock.restore();
    handleSetFloorsConfig({enabled: false});
    sandbox.restore();
    utils.logError.restore();
    utils.logWarn.restore();
    // reset global bidder settings so no weird test side effects
    getGlobal().bidderSettings = {};
  });

  describe('getFloorsDataForAuction', function () {
    it('converts basic input floor data into a floorData map for the auction correctly', function () {
      // basic input where nothing needs to be updated
      expect(getFloorsDataForAuction(basicFloorData)).to.deep.equal(basicFloorData);

      // if cur and delim not defined then default to correct ones (usd and |)
      let inputFloorData = utils.deepClone(basicFloorData);
      delete inputFloorData.currency;
      delete inputFloorData.schema.delimiter;
      expect(getFloorsDataForAuction(inputFloorData)).to.deep.equal(basicFloorData);

      // should not use defaults if differing values
      inputFloorData.currency = 'EUR'
      inputFloorData.schema.delimiter = '^'
      let resultingData = getFloorsDataForAuction(inputFloorData);
      expect(resultingData.currency).to.equal('EUR');
      expect(resultingData.schema.delimiter).to.equal('^');
    });

    it('converts more complex floor data correctly', function () {
      let inputFloorData = {
        schema: {
          fields: ['mediaType', 'size', 'domain']
        },
        values: {
          'banner|300x250|prebid.org': 1.0,
          'video|640x480|prebid.org': 5.0,
          'banner|728x90|rubicon.com': 3.5,
          'video|600x300|appnexus.com': 3.5,
          '*|*|prebid.org': 3.5,
        }
      };
      let resultingData = getFloorsDataForAuction(inputFloorData);
      expect(resultingData).to.deep.equal({
        currency: 'USD',
        schema: {
          delimiter: '|',
          fields: ['mediaType', 'size', 'domain']
        },
        values: {
          'banner|300x250|prebid.org': 1.0,
          'video|640x480|prebid.org': 5.0,
          'banner|728x90|rubicon.com': 3.5,
          'video|600x300|appnexus.com': 3.5,
          '*|*|prebid.org': 3.5,
        }
      });
    });

    it('adds adUnitCode to the schema if the floorData comes from adUnit level to maintain scope', function () {
      let inputFloorData = utils.deepClone(basicFloorData);
      let resultingData = getFloorsDataForAuction(inputFloorData, 'test_div_1');
      expect(resultingData).to.deep.equal({
        modelVersion: 'basic model',
        modelWeight: 10,
        modelTimestamp: 1606772895,
        currency: 'USD',
        schema: {
          delimiter: '|',
          fields: ['adUnitCode', 'mediaType']
        },
        values: {
          'test_div_1|banner': 1.0,
          'test_div_1|video': 5.0,
          'test_div_1|*': 2.5
        }
      });

      // uses the right delim if not |
      inputFloorData.schema.delimiter = '^';
      resultingData = getFloorsDataForAuction(inputFloorData, 'this_is_a_div');
      expect(resultingData).to.deep.equal({
        modelVersion: 'basic model',
        modelWeight: 10,
        modelTimestamp: 1606772895,
        currency: 'USD',
        schema: {
          delimiter: '^',
          fields: ['adUnitCode', 'mediaType']
        },
        values: {
          'this_is_a_div^banner': 1.0,
          'this_is_a_div^video': 5.0,
          'this_is_a_div^*': 2.5
        }
      });
    });
  });

  describe('getFirstMatchingFloor', function () {
    it('uses a 0 floor as overrite', function () {
      let inputFloorData = {
        currency: 'USD',
        schema: {
          delimiter: '|',
          fields: ['adUnitCode']
        },
        values: {
          'test_div_1': 0,
          'test_div_2': 2
        },
        default: 0.5
      };

      expect(getFirstMatchingFloor(inputFloorData, basicBidRequest, {mediaType: 'banner', size: '*'})).to.deep.equal({
        floorMin: 0,
        floorRuleValue: 0,
        matchingFloor: 0,
        matchingData: 'test_div_1',
        matchingRule: 'test_div_1'
      });

      expect(getFirstMatchingFloor(inputFloorData, {...basicBidRequest, adUnitCode: 'test_div_2'}, {mediaType: 'banner', size: '*'})).to.deep.equal({
        floorMin: 0,
        floorRuleValue: 2,
        matchingFloor: 2,
        matchingData: 'test_div_2',
        matchingRule: 'test_div_2'
      });

      expect(getFirstMatchingFloor(inputFloorData, {...basicBidRequest, adUnitCode: 'test_div_3'}, {mediaType: 'banner', size: '*'})).to.deep.equal({
        floorMin: 0,
        floorRuleValue: 0.5,
        matchingFloor: 0.5,
        matchingData: 'test_div_3',
        matchingRule: undefined
      });
    });
    it('correctly applies floorMin if on adunit', function () {
      let inputFloorData = {
        floorMin: 2.6,
        currency: 'USD',
        schema: {
          delimiter: '|',
          fields: ['adUnitCode']
        },
        values: {
          'test_div_1': 1.0,
          'test_div_2': 2.0
        },
        default: 0.5
      };

      let myBidRequest = { ...basicBidRequest };

      // should take adunit floormin first even if lower
      utils.deepSetValue(myBidRequest, 'ortb2Imp.ext.prebid.floorMin', 2.2);
      expect(getFirstMatchingFloor(inputFloorData, myBidRequest, { mediaType: 'banner', size: '*' })).to.deep.equal({
        floorMin: 2.2,
        floorRuleValue: 1.0,
        matchingFloor: 2.2,
        matchingData: 'test_div_1',
        matchingRule: 'test_div_1'
      });
      delete inputFloorData.matchingInputs;

      // should take adunit floormin if higher
      utils.deepSetValue(myBidRequest, 'ortb2Imp.ext.prebid.floorMin', 3.0);
      expect(getFirstMatchingFloor(inputFloorData, myBidRequest, { mediaType: 'banner', size: '*' })).to.deep.equal({
        floorMin: 3.0,
        floorRuleValue: 1.0,
        matchingFloor: 3.0,
        matchingData: 'test_div_1',
        matchingRule: 'test_div_1'
      });
      delete inputFloorData.matchingInputs;

      // should take top floormin if no adunit floor min
      delete myBidRequest.ortb2Imp;
      expect(getFirstMatchingFloor(inputFloorData, myBidRequest, { mediaType: 'banner', size: '*' })).to.deep.equal({
        floorMin: 2.6,
        floorRuleValue: 1.0,
        matchingFloor: 2.6,
        matchingData: 'test_div_1',
        matchingRule: 'test_div_1'
      });
      delete inputFloorData.matchingInputs;
    });
    it('selects the right floor for different mediaTypes', function () {
      // banner with * size (not in rule file so does not do anything)
      expect(getFirstMatchingFloor({...basicFloorData}, basicBidRequest, {mediaType: 'banner', size: '*'})).to.deep.equal({
        floorMin: 0,
        floorRuleValue: 1.0,
        matchingFloor: 1.0,
        matchingData: 'banner',
        matchingRule: 'banner'
      });
      // video with * size (not in rule file so does not do anything)
      expect(getFirstMatchingFloor({...basicFloorData}, basicBidRequest, {mediaType: 'video', size: '*'})).to.deep.equal({
        floorMin: 0,
        floorRuleValue: 5.0,
        matchingFloor: 5.0,
        matchingData: 'video',
        matchingRule: 'video'
      });
      // native (not in the rule list) with * size (not in rule file so does not do anything)
      expect(getFirstMatchingFloor({...basicFloorData}, basicBidRequest, {mediaType: 'native', size: '*'})).to.deep.equal({
        floorMin: 0,
        floorRuleValue: 2.5,
        matchingFloor: 2.5,
        matchingData: 'native',
        matchingRule: '*'
      });
      // banner with floorMin higher than matching rule
      handleSetFloorsConfig({
        ...minFloorConfigHigh
      });
      expect(getFirstMatchingFloor({...basicFloorDataHigh}, basicBidRequest, {mediaType: 'banner', size: '*'})).to.deep.equal({
        floorMin: 7,
        floorRuleValue: 1.0,
        matchingFloor: 7,
        matchingData: 'banner',
        matchingRule: 'banner'
      });
      // banner with floorMin higher than matching rule
      handleSetFloorsConfig({
        ...minFloorConfigLow
      });
      expect(getFirstMatchingFloor({...basicFloorDataLow}, basicBidRequest, {mediaType: 'video', size: '*'})).to.deep.equal({
        floorMin: 2.3,
        floorRuleValue: 5,
        matchingFloor: 5,
        matchingData: 'video',
        matchingRule: 'video'
      });
    });
    it('does not alter cached matched input if conversion occurs', function () {
      let inputData = {...basicFloorData};
      [0.2, 0.4, 0.6, 0.8].forEach(modifier => {
        let result = getFirstMatchingFloor(inputData, basicBidRequest, {mediaType: 'banner', size: '*'});
        // result should always be the same
        expect(result).to.deep.equal({
          floorMin: 0,
          floorRuleValue: 1.0,
          matchingFloor: 1.0,
          matchingData: 'banner',
          matchingRule: 'banner'
        });
        // make sure a post retrieval adjustment does not alter the cached floor
        result.matchingFloor = result.matchingFloor * modifier;
      });
    });
    it('selects the right floor for different sizes', function () {
      let inputFloorData = {
        currency: 'USD',
        schema: {
          delimiter: '|',
          fields: ['size']
        },
        values: {
          '300x250': 1.1,
          '640x480': 2.2,
          '728x90': 3.3,
          '600x300': 4.4,
          '*': 5.5,
        }
      }
      // banner with 300x250 size
      expect(getFirstMatchingFloor(inputFloorData, basicBidRequest, {mediaType: 'banner', size: [300, 250]})).to.deep.equal({
        floorMin: 0,
        floorRuleValue: 1.1,
        matchingFloor: 1.1,
        matchingData: '300x250',
        matchingRule: '300x250'
      });
      // video with 300x250 size
      expect(getFirstMatchingFloor(inputFloorData, basicBidRequest, {mediaType: 'video', size: [300, 250]})).to.deep.equal({
        floorMin: 0,
        floorRuleValue: 1.1,
        matchingFloor: 1.1,
        matchingData: '300x250',
        matchingRule: '300x250'
      });
      // native (not in the rule list) with 300x600 size
      expect(getFirstMatchingFloor(inputFloorData, basicBidRequest, {mediaType: 'native', size: [600, 300]})).to.deep.equal({
        floorMin: 0,
        floorRuleValue: 4.4,
        matchingFloor: 4.4,
        matchingData: '600x300',
        matchingRule: '600x300'
      });
      // n/a mediaType with a size not in file should go to catch all
      expect(getFirstMatchingFloor(inputFloorData, basicBidRequest, {mediaType: undefined, size: [1, 1]})).to.deep.equal({
        floorMin: 0,
        floorRuleValue: 5.5,
        matchingFloor: 5.5,
        matchingData: '1x1',
        matchingRule: '*'
      });
    });
    it('selects the right floor for more complex rules', function () {
      let inputFloorData = {
        currency: 'USD',
        schema: {
          delimiter: '^',
          fields: ['adUnitCode', 'mediaType', 'size']
        },
        values: {
          'test_div_1^banner^300x250': 1.1,
          'test_div_1^video^640x480': 2.2,
          'test_div_2^*^*': 3.3,
          '*^banner^300x250': 4.4,
          'weird_div^*^300x250': 5.5
        },
        default: 0.5
      };
      // banner with 300x250 size
      expect(getFirstMatchingFloor(inputFloorData, basicBidRequest, {mediaType: 'banner', size: [300, 250]})).to.deep.equal({
        floorMin: 0,
        floorRuleValue: 1.1,
        matchingFloor: 1.1,
        matchingData: 'test_div_1^banner^300x250',
        matchingRule: 'test_div_1^banner^300x250'
      });
      // video with 300x250 size -> No matching rule so should use default
      expect(getFirstMatchingFloor(inputFloorData, basicBidRequest, {mediaType: 'video', size: [300, 250]})).to.deep.equal({
        floorMin: 0,
        floorRuleValue: 0.5,
        matchingFloor: 0.5,
        matchingData: 'test_div_1^video^300x250',
        matchingRule: undefined
      });
      // remove default and should still return the same floor as above since matches are cached
      delete inputFloorData.default;
      expect(getFirstMatchingFloor(inputFloorData, basicBidRequest, {mediaType: 'video', size: [300, 250]})).to.deep.equal({
        floorMin: 0,
        floorRuleValue: 0.5,
        matchingFloor: 0.5,
        matchingData: 'test_div_1^video^300x250',
        matchingRule: undefined
      });
      // update adUnitCode to test_div_2 with weird other params
      let newBidRequest = { ...basicBidRequest, adUnitCode: 'test_div_2' }
      expect(getFirstMatchingFloor(inputFloorData, newBidRequest, {mediaType: 'badmediatype', size: [900, 900]})).to.deep.equal({
        floorMin: 0,
        floorRuleValue: 3.3,
        matchingFloor: 3.3,
        matchingData: 'test_div_2^badmediatype^900x900',
        matchingRule: 'test_div_2^*^*'
      });
    });
    it('it does not break if floorData has bad values', function () {
      let inputFloorData = {};
      expect(getFirstMatchingFloor(inputFloorData, basicBidRequest, {mediaType: 'banner', size: '*'})).to.deep.equal({
        matchingFloor: undefined
      });
      // if default is there use it
      inputFloorData = { default: 5.0 };
      expect(getFirstMatchingFloor(inputFloorData, basicBidRequest, {mediaType: 'banner', size: '*'})).to.deep.equal({
        matchingFloor: 5.0
      });
    });
    describe('with gpt enabled', function () {
      let gptFloorData;
      let indexStub, adUnits;
      beforeEach(function () {
        gptFloorData = {
          currency: 'USD',
          schema: {
            fields: ['gptSlot']
          },
          values: {
            '/12345/sports/soccer': 1.1,
            '/12345/sports/basketball': 2.2,
            '/12345/news/politics': 3.3,
            '/12345/news/weather': 4.4,
            '*': 5.5,
          },
          default: 0.5
        };
        // reset it so no lingering stuff from other test specs
        mockGpt.reset();
        mockGpt.makeSlot({
          code: '/12345/sports/soccer',
          divId: 'test_div_1'
        });
        mockGpt.makeSlot({
          code: '/12345/sports/basketball',
          divId: 'test_div_2'
        });
        indexStub = sinon.stub(auctionManager, 'index');
        indexStub.get(() => stubAuctionIndex({adUnits}))
      });
      afterEach(function () {
        // reset it so no lingering stuff from other test specs
        mockGpt.reset();
        indexStub.restore();
      });
      it('picks the right rule when looking for gptSlot', function () {
        expect(getFirstMatchingFloor(gptFloorData, basicBidRequest)).to.deep.equal({
          floorMin: 0,
          floorRuleValue: 1.1,
          matchingFloor: 1.1,
          matchingData: '/12345/sports/soccer',
          matchingRule: '/12345/sports/soccer'
        });

        let newBidRequest = { ...basicBidRequest, adUnitCode: 'test_div_2' }
        expect(getFirstMatchingFloor(gptFloorData, newBidRequest)).to.deep.equal({
          floorMin: 0,
          floorRuleValue: 2.2,
          matchingFloor: 2.2,
          matchingData: '/12345/sports/basketball',
          matchingRule: '/12345/sports/basketball'
        });
      });
      it('picks the gptSlot from the adUnit and does not call the slotMatching', function () {
        const newBidRequest1 = { ...basicBidRequest, transactionId: 'au1' };
        adUnits = [{code: newBidRequest1.code, transactionId: 'au1'}];
        utils.deepSetValue(adUnits[0], 'ortb2Imp.ext.data.adserver', {
          name: 'gam',
          adslot: '/12345/news/politics'
        })
        expect(getFirstMatchingFloor(gptFloorData, newBidRequest1)).to.deep.equal({
          floorMin: 0,
          floorRuleValue: 3.3,
          matchingFloor: 3.3,
          matchingData: '/12345/news/politics',
          matchingRule: '/12345/news/politics'
        });

        const newBidRequest2 = { ...basicBidRequest, adUnitCode: 'test_div_2', transactionId: 'au2' };
        adUnits = [{code: newBidRequest2.adUnitCode, transactionId: newBidRequest2.transactionId}];
        utils.deepSetValue(adUnits[0], 'ortb2Imp.ext.data.adserver', {
          name: 'gam',
          adslot: '/12345/news/weather'
        })
        expect(getFirstMatchingFloor(gptFloorData, newBidRequest2)).to.deep.equal({
          floorMin: 0,
          floorRuleValue: 4.4,
          matchingFloor: 4.4,
          matchingData: '/12345/news/weather',
          matchingRule: '/12345/news/weather'
        });
      });
    });
  });
  describe('pre-auction tests', function () {
    let exposedAdUnits;
    const validateBidRequests = (getFloorExpected, FloorDataExpected) => {
      exposedAdUnits.forEach(adUnit => adUnit.bids.forEach(bid => {
        expect(bid.hasOwnProperty('getFloor')).to.equal(getFloorExpected);
        expect(bid.floorData).to.deep.equal(FloorDataExpected);
      }));
    };
    const runStandardAuction = (adUnits = [getAdUnitMock('test_div_1')]) => {
      requestBidsHook(config => exposedAdUnits = config.adUnits, {
        auctionId: basicBidRequest.auctionId,
        adUnits,
      });
    };
    let fakeFloorProvider;
    let actualAllowedFields = allowedFields;
    let actualFieldMatchingFunctions = fieldMatchingFunctions;
    const defaultAllowedFields = [...allowedFields];
    const defaultMatchingFunctions = {...fieldMatchingFunctions};
    beforeEach(function() {
      fakeFloorProvider = sinon.fakeServer.create();
    });
    afterEach(function() {
      fakeFloorProvider.restore();
      exposedAdUnits = undefined;
      actualAllowedFields = [...defaultAllowedFields];
      actualFieldMatchingFunctions = {...defaultMatchingFunctions};
    });
    it('should not do floor stuff if no resulting floor object can be resolved for auciton', function () {
      handleSetFloorsConfig({
        ...basicFloorConfig,
        data: undefined
      });
      runStandardAuction();
      validateBidRequests(false, {
        skipped: true,
        floorMin: undefined,
        modelVersion: undefined,
        modelWeight: undefined,
        modelTimestamp: undefined,
        location: 'noData',
        skipRate: 0,
        fetchStatus: undefined,
        floorProvider: undefined
      });
    });
    it('should use adUnit level data if not setConfig or fetch has occured', function () {
      handleSetFloorsConfig({
        ...basicFloorConfig,
        data: undefined
      });
      // attach floor data onto an adUnit and run an auction
      let adUnitWithFloors1 = {
        ...getAdUnitMock('adUnit-Div-1'),
        floors: {
          ...basicFloorData,
          modelVersion: 'adUnit Model Version', // change the model name
        }
      };
      let adUnitWithFloors2 = {
        ...getAdUnitMock('adUnit-Div-2'),
        floors: {
          ...basicFloorData,
          values: {
            'banner': 5.0,
            '*': 10.4
          }
        }
      };
      runStandardAuction([adUnitWithFloors1, adUnitWithFloors2]);
      validateBidRequests(true, {
        skipped: false,
        floorMin: undefined,
        modelVersion: 'adUnit Model Version',
        modelWeight: 10,
        modelTimestamp: 1606772895,
        location: 'adUnit',
        skipRate: 0,
        fetchStatus: undefined,
        floorProvider: undefined
      });
    });
    it('should use adUnit level data and minFloor should be set', function () {
      handleSetFloorsConfig({
        ...minFloorConfigHigh,
        data: undefined
      });
      // attach floor data onto an adUnit and run an auction
      let adUnitWithFloors1 = {
        ...getAdUnitMock('adUnit-Div-1'),
        floors: {
          ...basicFloorData,
          modelVersion: 'adUnit Model Version', // change the model name
        }
      };
      let adUnitWithFloors2 = {
        ...getAdUnitMock('adUnit-Div-2'),
        floors: {
          ...basicFloorData,
          values: {
            'banner': 5.0,
            '*': 10.4
          }
        }
      };
      runStandardAuction([adUnitWithFloors1, adUnitWithFloors2]);
      validateBidRequests(true, {
        skipped: false,
        modelVersion: 'adUnit Model Version',
        modelWeight: 10,
        modelTimestamp: 1606772895,
        location: 'adUnit',
        skipRate: 0,
        floorMin: 7,
        fetchStatus: undefined,
        floorProvider: undefined
      });
    });
    it('bidRequests should have getFloor function and flooring meta data when setConfig occurs', function () {
      handleSetFloorsConfig({...basicFloorConfig, floorProvider: 'floorprovider'});
      runStandardAuction();
      validateBidRequests(true, {
        skipped: false,
        floorMin: undefined,
        modelVersion: 'basic model',
        modelWeight: 10,
        modelTimestamp: 1606772895,
        location: 'setConfig',
        skipRate: 0,
        fetchStatus: undefined,
        floorProvider: 'floorprovider'
      });
    });
    it('should pick the right floorProvider', function () {
      let inputFloors = {
        ...basicFloorConfig,
        floorProvider: 'providerA',
        data: {
          ...basicFloorData,
          floorProvider: 'providerB',
        }
      };
      handleSetFloorsConfig(inputFloors);
      runStandardAuction();
      validateBidRequests(true, {
        skipped: false,
        floorMin: undefined,
        modelVersion: 'basic model',
        modelWeight: 10,
        modelTimestamp: 1606772895,
        location: 'setConfig',
        skipRate: 0,
        fetchStatus: undefined,
        floorProvider: 'providerB'
      });

      // if not at data level take top level
      delete inputFloors.data.floorProvider;
      handleSetFloorsConfig(inputFloors);
      runStandardAuction();
      validateBidRequests(true, {
        skipped: false,
        floorMin: undefined,
        modelVersion: 'basic model',
        modelWeight: 10,
        modelTimestamp: 1606772895,
        location: 'setConfig',
        skipRate: 0,
        fetchStatus: undefined,
        floorProvider: 'providerA'
      });

      // if none should be undefined
      delete inputFloors.floorProvider;
      handleSetFloorsConfig(inputFloors);
      runStandardAuction();
      validateBidRequests(true, {
        skipped: false,
        floorMin: undefined,
        modelVersion: 'basic model',
        modelWeight: 10,
        modelTimestamp: 1606772895,
        location: 'setConfig',
        skipRate: 0,
        fetchStatus: undefined,
        floorProvider: undefined
      });
    });
    it('should take the right skipRate depending on input', function () {
      // first priority is data object
      sandbox.stub(Math, 'random').callsFake(() => 0.99);
      let inputFloors = {
        ...basicFloorConfig,
        skipRate: 10,
        data: {
          ...basicFloorData,
          skipRate: 50
        }
      };
      handleSetFloorsConfig(inputFloors);
      runStandardAuction();
      validateBidRequests(true, {
        skipped: false,
        floorMin: undefined,
        modelVersion: 'basic model',
        modelWeight: 10,
        modelTimestamp: 1606772895,
        location: 'setConfig',
        skipRate: 50,
        fetchStatus: undefined,
        floorProvider: undefined
      });

      // if that does not exist uses topLevel skipRate setting
      delete inputFloors.data.skipRate;
      handleSetFloorsConfig(inputFloors);
      runStandardAuction();
      validateBidRequests(true, {
        skipped: false,
        floorMin: undefined,
        modelVersion: 'basic model',
        modelWeight: 10,
        modelTimestamp: 1606772895,
        location: 'setConfig',
        skipRate: 10,
        fetchStatus: undefined,
        floorProvider: undefined
      });

      // if that is not there defaults to zero
      delete inputFloors.skipRate;
      handleSetFloorsConfig(inputFloors);
      runStandardAuction();
      validateBidRequests(true, {
        skipped: false,
        floorMin: undefined,
        modelVersion: 'basic model',
        modelWeight: 10,
        modelTimestamp: 1606772895,
        location: 'setConfig',
        skipRate: 0,
        fetchStatus: undefined,
        floorProvider: undefined
      });
    });
    it('should randomly pick a model if floorsSchemaVersion is 2', function () {
      let inputFloors = {
        ...basicFloorConfig,
        floorProvider: 'floorprovider',
        data: {
          floorsSchemaVersion: 2,
          currency: 'USD',
          modelGroups: [
            {
              modelVersion: 'model-1',
              modelWeight: 10,
              schema: {
                delimiter: '|',
                fields: ['mediaType']
              },
              values: {
                'banner': 1.0,
                '*': 2.5
              }
            }, {
              modelVersion: 'model-2',
              modelWeight: 40,
              schema: {
                delimiter: '|',
                fields: ['size']
              },
              values: {
                '300x250': 1.0,
                '*': 2.5
              }
            }, {
              modelVersion: 'model-3',
              modelWeight: 50,
              schema: {
                delimiter: '|',
                fields: ['domain']
              },
              values: {
                'www.prebid.org': 1.0,
                '*': 2.5
              }
            }
          ]
        }
      };
      handleSetFloorsConfig(inputFloors);

      // stub random to give us wanted vals
      let randValue;
      sandbox.stub(Math, 'random').callsFake(() => randValue);

      // 0 - 10 should use first model
      randValue = 0.05;
      runStandardAuction();
      validateBidRequests(true, {
        skipped: false,
        floorMin: undefined,
        modelVersion: 'model-1',
        modelWeight: 10,
        modelTimestamp: undefined,
        location: 'setConfig',
        skipRate: 0,
        fetchStatus: undefined,
        floorProvider: 'floorprovider'
      });

      // 11 - 50 should use second model
      randValue = 0.40;
      runStandardAuction();
      validateBidRequests(true, {
        skipped: false,
        floorMin: undefined,
        modelVersion: 'model-2',
        modelWeight: 40,
        modelTimestamp: undefined,
        location: 'setConfig',
        skipRate: 0,
        fetchStatus: undefined,
        floorProvider: 'floorprovider'
      });

      // 51 - 100 should use third model
      randValue = 0.75;
      runStandardAuction();
      validateBidRequests(true, {
        skipped: false,
        floorMin: undefined,
        modelVersion: 'model-3',
        modelWeight: 50,
        modelTimestamp: undefined,
        location: 'setConfig',
        skipRate: 0,
        fetchStatus: undefined,
        floorProvider: 'floorprovider'
      });
    });
    it('should not overwrite previous data object if the new one is bad', function () {
      handleSetFloorsConfig({...basicFloorConfig});
      handleSetFloorsConfig({
        ...basicFloorConfig,
        data: undefined
      });
      handleSetFloorsConfig({
        ...basicFloorConfig,
        data: 5
      });
      handleSetFloorsConfig({
        ...basicFloorConfig,
        data: {
          schema: {fields: ['thisIsNotAllowedSoShouldFail']},
          values: {'*': 1.2},
          modelVersion: 'FAIL'
        }
      });
      runStandardAuction();
      validateBidRequests(true, {
        skipped: false,
        floorMin: undefined,
        modelVersion: 'basic model',
        modelWeight: 10,
        modelTimestamp: 1606772895,
        location: 'setConfig',
        skipRate: 0,
        fetchStatus: undefined,
        floorProvider: undefined
      });
    });
    it('should dynamically add new schema fileds and functions if added via setConfig', function () {
      let deviceSpoof;
      handleSetFloorsConfig({
        ...basicFloorConfig,
        data: {
          schema: {fields: ['deviceType']},
          values: {
            'mobile': 1.0,
            'desktop': 2.0,
            'tablet': 3.0,
            '*': 4.0
          }
        },
        additionalSchemaFields: {
          deviceType: () => deviceSpoof
        }
      });
      expect(allowedFields).to.contain('deviceType');
      expect(fieldMatchingFunctions['deviceType']).to.be.a('function');

      // run getFloor to make sure it selcts right stuff! (other params do not matter since we only are testing deviceType)
      runStandardAuction();

      // set deviceType to mobile;
      deviceSpoof = 'mobile';
      exposedAdUnits[0].bids[0].auctionId = basicBidRequest.auctionId
      expect(exposedAdUnits[0].bids[0].getFloor()).to.deep.equal({
        currency: 'USD',
        floor: 1.0 // 'mobile': 1.0,
      });

      // set deviceType to desktop;
      deviceSpoof = 'desktop';
      expect(exposedAdUnits[0].bids[0].getFloor()).to.deep.equal({
        currency: 'USD',
        floor: 2.0 // 'desktop': 2.0,
      });

      // set deviceType to tablet;
      deviceSpoof = 'tablet';
      expect(exposedAdUnits[0].bids[0].getFloor()).to.deep.equal({
        currency: 'USD',
        floor: 3.0 // 'tablet': 3.0
      });

      // set deviceType to unknown;
      deviceSpoof = 'unknown';
      expect(exposedAdUnits[0].bids[0].getFloor()).to.deep.equal({
        currency: 'USD',
        floor: 4.0 // '*': 4.0
      });
    });
    it('Should continue auction of delay is hit without a response from floor provider', function () {
      handleSetFloorsConfig({...basicFloorConfig, auctionDelay: 250, endpoint: {url: 'http://www.fakeFloorProvider.json'}});

      // start the auction it should delay and not immediately call `continueAuction`
      runStandardAuction();

      // exposedAdUnits should be undefined if the auction has not continued
      expect(exposedAdUnits).to.be.undefined;

      // hit the delay
      clock.tick(250);

      // log warn should be called and adUnits not undefined
      expect(logWarnSpy.calledOnce).to.equal(true);
      expect(exposedAdUnits).to.not.be.undefined;

      // the exposedAdUnits should be from the fetch not setConfig level data
      validateBidRequests(true, {
        skipped: false,
        floorMin: undefined,
        modelVersion: 'basic model',
        modelWeight: 10,
        modelTimestamp: 1606772895,
        location: 'setConfig',
        skipRate: 0,
        fetchStatus: 'timeout',
        floorProvider: undefined
      });
      fakeFloorProvider.respond();
    });
    it('It should fetch if config has url and bidRequests have fetch level flooring meta data', function () {
      // init the fake server with response stuff
      let fetchFloorData = {
        ...basicFloorData,
        modelVersion: 'fetch model name', // change the model name
      };
      fakeFloorProvider.respondWith(JSON.stringify(fetchFloorData));

      // run setConfig indicating fetch
      handleSetFloorsConfig({...basicFloorConfig, floorProvider: 'floorprovider', auctionDelay: 250, endpoint: {url: 'http://www.fakeFloorProvider.json'}});

      // floor provider should be called
      expect(fakeFloorProvider.requests.length).to.equal(1);
      expect(fakeFloorProvider.requests[0].url).to.equal('http://www.fakeFloorProvider.json');

      // start the auction it should delay and not immediately call `continueAuction`
      runStandardAuction();

      // exposedAdUnits should be undefined if the auction has not continued
      expect(exposedAdUnits).to.be.undefined;

      // make the fetch respond
      fakeFloorProvider.respond();
      expect(exposedAdUnits).to.not.be.undefined;

      // the exposedAdUnits should be from the fetch not setConfig level data
      // and fetchStatus is success since fetch worked
      validateBidRequests(true, {
        skipped: false,
        floorMin: undefined,
        modelVersion: 'fetch model name',
        modelWeight: 10,
        modelTimestamp: 1606772895,
        location: 'fetch',
        skipRate: 0,
        fetchStatus: 'success',
        floorProvider: 'floorprovider'
      });
    });
    it('it should correctly overwrite floorProvider with fetch provider', function () {
      // init the fake server with response stuff
      let fetchFloorData = {
        ...basicFloorData,
        floorProvider: 'floorProviderD', // change the floor provider
        modelVersion: 'fetch model name', // change the model name
      };
      fakeFloorProvider.respondWith(JSON.stringify(fetchFloorData));

      // run setConfig indicating fetch
      handleSetFloorsConfig({...basicFloorConfig, floorProvider: 'floorproviderC', auctionDelay: 250, endpoint: {url: 'http://www.fakeFloorProvider.json'}});

      // floor provider should be called
      expect(fakeFloorProvider.requests.length).to.equal(1);
      expect(fakeFloorProvider.requests[0].url).to.equal('http://www.fakeFloorProvider.json');

      // start the auction it should delay and not immediately call `continueAuction`
      runStandardAuction();

      // exposedAdUnits should be undefined if the auction has not continued
      expect(exposedAdUnits).to.be.undefined;

      // make the fetch respond
      fakeFloorProvider.respond();

      // the exposedAdUnits should be from the fetch not setConfig level data
      // and fetchStatus is success since fetch worked
      validateBidRequests(true, {
        skipped: false,
        floorMin: undefined,
        modelVersion: 'fetch model name',
        modelWeight: 10,
        modelTimestamp: 1606772895,
        location: 'fetch',
        skipRate: 0,
        fetchStatus: 'success',
        floorProvider: 'floorProviderD'
      });
    });
    it('it should correctly overwrite skipRate with fetch skipRate', function () {
      // so floors does not skip
      sandbox.stub(Math, 'random').callsFake(() => 0.99);
      // init the fake server with response stuff
      let fetchFloorData = {
        ...basicFloorData,
        modelVersion: 'fetch model name', // change the model name
      };
      fetchFloorData.skipRate = 95;
      fakeFloorProvider.respondWith(JSON.stringify(fetchFloorData));

      // run setConfig indicating fetch
      handleSetFloorsConfig({...basicFloorConfig, floorProvider: 'floorprovider', auctionDelay: 250, endpoint: {url: 'http://www.fakeFloorProvider.json'}});

      // floor provider should be called
      expect(fakeFloorProvider.requests.length).to.equal(1);
      expect(fakeFloorProvider.requests[0].url).to.equal('http://www.fakeFloorProvider.json');

      // start the auction it should delay and not immediately call `continueAuction`
      runStandardAuction();

      // exposedAdUnits should be undefined if the auction has not continued
      expect(exposedAdUnits).to.be.undefined;

      // make the fetch respond
      fakeFloorProvider.respond();
      expect(exposedAdUnits).to.not.be.undefined;

      // the exposedAdUnits should be from the fetch not setConfig level data
      // and fetchStatus is success since fetch worked
      validateBidRequests(true, {
        skipped: false,
        floorMin: undefined,
        modelVersion: 'fetch model name',
        modelWeight: 10,
        modelTimestamp: 1606772895,
        location: 'fetch',
        skipRate: 95,
        fetchStatus: 'success',
        floorProvider: 'floorprovider'
      });
    });
    it('Should not break if floor provider returns 404', function () {
      // run setConfig indicating fetch
      handleSetFloorsConfig({...basicFloorConfig, auctionDelay: 250, endpoint: {url: 'http://www.fakeFloorProvider.json'}});

      // run the auction and make server respond with 404
      fakeFloorProvider.respond();
      runStandardAuction();

      // error should have been called for fetch error
      expect(logErrorSpy.calledOnce).to.equal(true);
      // should have caught the response error and still used setConfig data
      // and fetch failed is true
      validateBidRequests(true, {
        skipped: false,
        floorMin: undefined,
        modelVersion: 'basic model',
        modelWeight: 10,
        modelTimestamp: 1606772895,
        location: 'setConfig',
        skipRate: 0,
        fetchStatus: 'error',
        floorProvider: undefined
      });
    });
    it('Should not break if floor provider returns non json', function () {
      fakeFloorProvider.respondWith('Not valid response');

      // run setConfig indicating fetch
      handleSetFloorsConfig({...basicFloorConfig, auctionDelay: 250, endpoint: {url: 'http://www.fakeFloorProvider.json'}});

      // run the auction and make server respond
      fakeFloorProvider.respond();
      runStandardAuction();

      // error should have been called for response floor data not being valid
      expect(logErrorSpy.calledOnce).to.equal(true);
      // should have caught the response error and still used setConfig data
      // and fetchStatus is 'success' but location is setConfig since it had bad data
      validateBidRequests(true, {
        skipped: false,
        floorMin: undefined,
        modelVersion: 'basic model',
        modelWeight: 10,
        modelTimestamp: 1606772895,
        location: 'setConfig',
        skipRate: 0,
        fetchStatus: 'success',
        floorProvider: undefined
      });
    });
    it('should handle not using fetch correctly', function () {
      // run setConfig twice indicating fetch
      fakeFloorProvider.respondWith(JSON.stringify(basicFloorData));
      handleSetFloorsConfig({...basicFloorConfig, auctionDelay: 250, endpoint: {url: 'http://www.fakeFloorProvider.json'}});
      handleSetFloorsConfig({...basicFloorConfig, auctionDelay: 250, endpoint: {url: 'http://www.fakeFloorProvider.json'}});

      // log warn should be called and server only should have one request
      expect(logWarnSpy.calledOnce).to.equal(true);
      expect(fakeFloorProvider.requests.length).to.equal(1);
      expect(fakeFloorProvider.requests[0].url).to.equal('http://www.fakeFloorProvider.json');

      // now we respond and then run again it should work and make another request
      fakeFloorProvider.respond();
      handleSetFloorsConfig({...basicFloorConfig, auctionDelay: 250, endpoint: {url: 'http://www.fakeFloorProvider.json'}});
      fakeFloorProvider.respond();

      // now warn still only called once and server called twice
      expect(logWarnSpy.calledOnce).to.equal(true);
      expect(fakeFloorProvider.requests.length).to.equal(2);

      // should log error if method is not GET for now
      expect(logErrorSpy.calledOnce).to.equal(false);
      handleSetFloorsConfig({...basicFloorConfig, endpoint: {url: 'http://www.fakeFloorProvider.json', method: 'POST'}});
      expect(logErrorSpy.calledOnce).to.equal(true);
    });
    describe('isFloorsDataValid', function () {
      it('should return false if unknown floorsSchemaVersion', function () {
        let inputFloorData = utils.deepClone(basicFloorData);
        inputFloorData.floorsSchemaVersion = 3;
        expect(isFloorsDataValid(inputFloorData)).to.to.equal(false);
      });
      it('should work correctly for fields array', function () {
        let inputFloorData = utils.deepClone(basicFloorData);
        expect(isFloorsDataValid(inputFloorData)).to.to.equal(true);

        // no fields array
        delete inputFloorData.schema.fields;
        expect(isFloorsDataValid(inputFloorData)).to.to.equal(false);

        // Fields is not an array
        inputFloorData.schema.fields = {};
        expect(isFloorsDataValid(inputFloorData)).to.to.equal(false);
        inputFloorData.schema.fields = undefined;
        expect(isFloorsDataValid(inputFloorData)).to.to.equal(false);
        inputFloorData.schema.fields = 'adUnitCode';
        expect(isFloorsDataValid(inputFloorData)).to.to.equal(false);

        // fields has a value that is not one of the "allowed" fields
        inputFloorData.schema.fields = ['adUnitCode', 'notValidMapping'];
        expect(isFloorsDataValid(inputFloorData)).to.to.equal(false);
      });
      it('should work correctly for values object', function () {
        let inputFloorData = utils.deepClone(basicFloorData);
        expect(isFloorsDataValid(inputFloorData)).to.to.equal(true);

        // no values object
        delete inputFloorData.values;
        expect(isFloorsDataValid(inputFloorData)).to.to.equal(false);

        // values is not correct type
        inputFloorData.values = [];
        expect(isFloorsDataValid(inputFloorData)).to.to.equal(false);
        inputFloorData.values = '123455/slot';
        expect(isFloorsDataValid(inputFloorData)).to.to.equal(false);

        // is an object but structure is wrong
        inputFloorData.values = {
          'banner': 'not a floor value'
        };
        expect(isFloorsDataValid(inputFloorData)).to.to.equal(false);
        inputFloorData.values = {
          'banner': undefined
        };
        expect(isFloorsDataValid(inputFloorData)).to.to.equal(false);

        // should be true if at least one rule is valid
        inputFloorData.schema.fields = ['adUnitCode', 'mediaType'];
        inputFloorData.values = {
          'banner': 1.0,
          'test-div-1|native': 1.0, // only valid rule should still work and delete the other rules
          'video': 1.0,
          '*': 1.0
        };
        expect(isFloorsDataValid(inputFloorData)).to.to.equal(true);
        expect(inputFloorData.values).to.deep.equal({ 'test-div-1|native': 1.0 });
      });
      it('should work correctly for floorsSchemaVersion 2', function () {
        let inputFloorData = {
          floorsSchemaVersion: 2,
          currency: 'USD',
          modelGroups: [
            {
              modelVersion: 'model-1',
              modelWeight: 10,
              schema: {
                delimiter: '|',
                fields: ['mediaType']
              },
              values: {
                'banner': 1.0,
                '*': 2.5
              }
            }, {
              modelVersion: 'model-2',
              modelWeight: 40,
              schema: {
                delimiter: '|',
                fields: ['size']
              },
              values: {
                '300x250': 1.0,
                '*': 2.5
              }
            }, {
              modelVersion: 'model-3',
              modelWeight: 50,
              schema: {
                delimiter: '|',
                fields: ['domain']
              },
              values: {
                'www.prebid.org': 1.0,
                '*': 2.5
              }
            }
          ]
        };
        expect(isFloorsDataValid(inputFloorData)).to.to.equal(true);

        // remove one of the modelWeight's and it should be false
        delete inputFloorData.modelGroups[1].modelWeight;
        expect(isFloorsDataValid(inputFloorData)).to.to.equal(false);
        inputFloorData.modelGroups[1].modelWeight = 40;

        // remove values from a model and it should not validate
        const tempValues = {...inputFloorData.modelGroups[0].values};
        delete inputFloorData.modelGroups[0].values;
        expect(isFloorsDataValid(inputFloorData)).to.to.equal(false);
        inputFloorData.modelGroups[0].values = tempValues;

        // modelGroups should be an array and have at least one entry
        delete inputFloorData.modelGroups;
        expect(isFloorsDataValid(inputFloorData)).to.to.equal(false);
        inputFloorData.modelGroups = [];
        expect(isFloorsDataValid(inputFloorData)).to.to.equal(false);
      });
    });
    describe('getFloor', function () {
      let bidRequest = {
        ...basicBidRequest,
        getFloor
      };
      it('returns empty if no matching data for auction is found', function () {
        expect(bidRequest.getFloor({})).to.deep.equal({});
      });
      it('picks the right rule depending on input', function () {
        _floorDataForAuction[bidRequest.auctionId] = utils.deepClone(basicFloorConfig);

        // empty params into getFloor should use default of banner * FloorData Curr
        let inputParams = {};
        expect(bidRequest.getFloor(inputParams)).to.deep.equal({
          currency: 'USD',
          floor: 1.0
        });

        // ask for banner
        inputParams = {mediaType: 'banner'};
        expect(bidRequest.getFloor(inputParams)).to.deep.equal({
          currency: 'USD',
          floor: 1.0
        });

        // ask for video
        inputParams = {mediaType: 'video'};
        expect(bidRequest.getFloor(inputParams)).to.deep.equal({
          currency: 'USD',
          floor: 5.0
        });

        // ask for *
        inputParams = {mediaType: '*'};
        expect(bidRequest.getFloor(inputParams)).to.deep.equal({
          currency: 'USD',
          floor: 2.5
        });
      });
      it('picks the right rule with more complex rules', function () {
        _floorDataForAuction[bidRequest.auctionId] = {
          ...basicFloorConfig,
          data: {
            currency: 'USD',
            schema: { fields: ['mediaType', 'size'], delimiter: '|' },
            values: {
              'banner|300x250': 0.5,
              'banner|300x600': 1.5,
              'banner|728x90': 2.5,
              'banner|*': 3.5,
              'video|640x480': 4.5,
              'video|*': 5.5
            },
            default: 10.0
          }
        };

        // assumes banner *
        let inputParams = {};
        expect(bidRequest.getFloor(inputParams)).to.deep.equal({
          currency: 'USD',
          floor: 3.5
        });

        // ask for banner with a size
        inputParams = {mediaType: 'banner', size: [300, 600]};
        expect(bidRequest.getFloor(inputParams)).to.deep.equal({
          currency: 'USD',
          floor: 1.5
        });

        // ask for video with a size
        inputParams = {mediaType: 'video', size: [640, 480]};
        expect(bidRequest.getFloor(inputParams)).to.deep.equal({
          currency: 'USD',
          floor: 4.5
        });

        // ask for video with a size not in rules (should pick rule which has video and *)
        inputParams = {mediaType: 'video', size: [111, 222]};
        expect(bidRequest.getFloor(inputParams)).to.deep.equal({
          currency: 'USD',
          floor: 5.5
        });

        // ask for native * but no native rule so should use default value if there
        inputParams = {mediaType: 'native', size: '*'};
        expect(bidRequest.getFloor(inputParams)).to.deep.equal({
          currency: 'USD',
          floor: 10.0
        });
      });
      it('should round up to 4 decimal places', function () {
        _floorDataForAuction[bidRequest.auctionId] = utils.deepClone(basicFloorConfig);
        _floorDataForAuction[bidRequest.auctionId].data.values = {
          'banner': 1.777777,
          'video': 1.1111111,
        };

        // assumes banner *
        let inputParams = {mediaType: 'banner'};
        expect(bidRequest.getFloor(inputParams)).to.deep.equal({
          currency: 'USD',
          floor: 1.7778
        });

        // assumes banner *
        inputParams = {mediaType: 'video'};
        expect(bidRequest.getFloor(inputParams)).to.deep.equal({
          currency: 'USD',
          floor: 1.1112
        });
      });
      it('should return the adjusted floor if bidder has cpm adjustment function', function () {
        getGlobal().bidderSettings = {
          rubicon: {
            bidCpmAdjustment: function (bidCpm) {
              return bidCpm * 0.5;
            },
          },
          appnexus: {
            bidCpmAdjustment: function (bidCpm) {
              return bidCpm * 0.75;
            },
          }
        };
        _floorDataForAuction[bidRequest.auctionId] = utils.deepClone(basicFloorConfig);
        _floorDataForAuction[bidRequest.auctionId].data.values = { '*': 1.0 };
        let appnexusBid = {
          ...bidRequest,
          bidder: 'appnexus'
        };

        // the conversion should be what the bidder would need to return in order to match the actual floor
        // rubicon
        expect(bidRequest.getFloor()).to.deep.equal({
          currency: 'USD',
          floor: 2.0 // a 2.0 bid after rubicons cpm adjustment would be 1.0 and thus is the floor after adjust
        });

        // appnexus
        expect(appnexusBid.getFloor()).to.deep.equal({
          currency: 'USD',
          floor: 1.3334 // 1.3334 * 0.75 = 1.000005 which is the floor (we cut off getFloor at 4 decimal points)
        });
      });

      it('should use standard cpmAdjustment if no bidder cpmAdjustment', function () {
        getGlobal().bidderSettings = {
          rubicon: {
            bidCpmAdjustment: function (bidCpm, bidResponse) {
              return bidResponse.cpm * 0.5;
            },
          },
          standard: {
            bidCpmAdjustment: function (bidCpm, bidResponse) {
              return bidResponse.cpm * 0.75;
            },
          }
        };
        _floorDataForAuction[bidRequest.auctionId] = utils.deepClone(basicFloorConfig);
        _floorDataForAuction[bidRequest.auctionId].data.values = { '*': 1.0 };
        let appnexusBid = {
          ...bidRequest,
          bidder: 'appnexus'
        };

        // the conversion should be what the bidder would need to return in order to match the actual floor
        // rubicon
        expect(bidRequest.getFloor()).to.deep.equal({
          currency: 'USD',
          floor: 2.0 // a 2.0 bid after rubicons cpm adjustment would be 1.0 and thus is the floor after adjust
        });

        // appnexus
        expect(appnexusBid.getFloor()).to.deep.equal({
          currency: 'USD',
          floor: 1.3334 // 1.3334 * 0.75 = 1.000005 which is the floor (we cut off getFloor at 4 decimal points)
        });
      });

      it('should work when cpmAdjust function uses bid object', function () {
        getGlobal().bidderSettings = {
          rubicon: {
            bidCpmAdjustment: function (bidCpm, bidResponse) {
              return bidResponse.cpm * 0.5;
            },
          },
          appnexus: {
            bidCpmAdjustment: function (bidCpm, bidResponse) {
              return bidResponse.cpm * 0.75;
            },
          }
        };
        _floorDataForAuction[bidRequest.auctionId] = utils.deepClone(basicFloorConfig);
        _floorDataForAuction[bidRequest.auctionId].data.values = { '*': 1.0 };
        let appnexusBid = {
          ...bidRequest,
          bidder: 'appnexus'
        };

        // the conversion should be what the bidder would need to return in order to match the actual floor
        // rubicon
        expect(bidRequest.getFloor()).to.deep.equal({
          currency: 'USD',
          floor: 2.0 // a 2.0 bid after rubicons cpm adjustment would be 1.0 and thus is the floor after adjust
        });

        // appnexus
        expect(appnexusBid.getFloor()).to.deep.equal({
          currency: 'USD',
          floor: 1.3334 // 1.3334 * 0.75 = 1.000005 which is the floor (we cut off getFloor at 4 decimal points)
        });
      });
      it('should correctly pick the right attributes if * is passed in and context can be assumed', function () {
        let inputBidReq = {
          bidder: 'rubicon',
          adUnitCode: 'test_div_2',
          auctionId: '987654321',
          mediaTypes: {
            video: {}
          },
          getFloor
        };
        _floorDataForAuction[inputBidReq.auctionId] = utils.deepClone(basicFloorConfig);
        _floorDataForAuction[inputBidReq.auctionId].data.values = {
          '*': 1.0,
          'banner': 3.0,
          'video': 5.0
        };

        // because bid req only has video, if a bidder asks for a floor for * we can actually give them the right mediaType
        expect(inputBidReq.getFloor({mediaType: '*'})).to.deep.equal({
          currency: 'USD',
          floor: 5.0 // 'video': 5.0
        });
        delete _floorDataForAuction[inputBidReq.auctionId].data.matchingInputs;

        // Same for if only banner is in the input bid
        inputBidReq.mediaTypes = {banner: {}};
        expect(inputBidReq.getFloor({mediaType: '*'})).to.deep.equal({
          currency: 'USD',
          floor: 3.0 // 'banner': 3.0,
        });
        delete _floorDataForAuction[inputBidReq.auctionId].data.matchingInputs;

        // if both are present then it will really use the *
        inputBidReq.mediaTypes = {banner: {}, video: {}};
        expect(inputBidReq.getFloor({mediaType: '*'})).to.deep.equal({
          currency: 'USD',
          floor: 1.0 // '*': 1.0,
        });
        delete _floorDataForAuction[inputBidReq.auctionId].data.matchingInputs;

        // now if size can be inferred (meaning only one size is in the specified mediaType, it will use it)
        _floorDataForAuction[inputBidReq.auctionId].data.schema.fields = ['mediaType', 'size'];
        _floorDataForAuction[inputBidReq.auctionId].data.values = {
          '*|*': 1.0,
          'banner|300x250': 2.0,
          'banner|728x90': 3.0,
          'banner|*': 4.0,
          'video|300x250': 5.0,
          'video|728x90': 6.0,
          'video|*': 7.0
        };
        // mediaType is banner and only one size, so if someone asks for banner * we should give them banner 300x250
        // instead of banner|*
        inputBidReq.mediaTypes = {banner: {sizes: [[300, 250]]}};
        expect(inputBidReq.getFloor({mediaType: 'banner', size: '*'})).to.deep.equal({
          currency: 'USD',
          floor: 2.0 // 'banner|300x250': 2.0,
        });
        delete _floorDataForAuction[inputBidReq.auctionId].data.matchingInputs;

        // now for video it should look at playersize (prebid core translates playersize into typical array of size arrays)
        inputBidReq.mediaTypes = {video: {playerSize: [[728, 90]]}};
        expect(inputBidReq.getFloor({mediaType: 'video', size: '*'})).to.deep.equal({
          currency: 'USD',
          floor: 6.0 // 'video|728x90': 6.0,
        });
        delete _floorDataForAuction[inputBidReq.auctionId].data.matchingInputs;

        // Now if multiple sizes are there, it will actually use * since can't infer
        inputBidReq.mediaTypes = {banner: {sizes: [[300, 250], [728, 90]]}};
        expect(inputBidReq.getFloor({mediaType: 'banner', size: '*'})).to.deep.equal({
          currency: 'USD',
          floor: 4.0 // 'banner|*': 4.0,
        });
        delete _floorDataForAuction[inputBidReq.auctionId].data.matchingInputs;

        // lastly, if you pass in * mediaType and * size it should resolve both if possble
        inputBidReq.mediaTypes = {banner: {sizes: [[300, 250]]}};
        expect(inputBidReq.getFloor({mediaType: '*', size: '*'})).to.deep.equal({
          currency: 'USD',
          floor: 2.0 // 'banner|300x250': 2.0,
        });
        delete _floorDataForAuction[inputBidReq.auctionId].data.matchingInputs;

        inputBidReq.mediaTypes = {video: {playerSize: [[300, 250]]}};
        expect(inputBidReq.getFloor({mediaType: '*', size: '*'})).to.deep.equal({
          currency: 'USD',
          floor: 5.0 // 'video|300x250': 5.0,
        });
        delete _floorDataForAuction[inputBidReq.auctionId].data.matchingInputs;

        // now it has both mediaTypes so will use * mediaType and thus not use sizes either
        inputBidReq.mediaTypes = {video: {playerSize: [[300, 250]]}, banner: {sizes: [[300, 250]]}};
        expect(inputBidReq.getFloor({mediaType: '*', size: '*'})).to.deep.equal({
          currency: 'USD',
          floor: 1.0 // '*|*': 1.0,
        });
        delete _floorDataForAuction[inputBidReq.auctionId].data.matchingInputs;
      });
    });
  });
  describe('bidResponseHook tests', function () {
    const AUCTION_ID = '123456';
    let returnedBidResponse, indexStub;
    let adUnit = {
      transactionId: 'au',
      code: 'test_div_1'
    }
    let basicBidResponse = {
      bidderCode: 'appnexus',
      width: 300,
      height: 250,
      cpm: 0.5,
      mediaType: 'banner',
      requestId: '1111',
      transactionId: 'au',
    };
    beforeEach(function () {
      returnedBidResponse = {};
      indexStub = sinon.stub(auctionManager, 'index');
      indexStub.get(() => stubAuctionIndex({adUnits: [adUnit]}));
    });

    afterEach(() => {
      indexStub.restore();
    });

    function runBidResponse(bidResp = basicBidResponse) {
      let next = (adUnitCode, bid) => {
        returnedBidResponse = bid;
      };
      addBidResponseHook(next, bidResp.adUnitCode, Object.assign(createBid(CONSTANTS.STATUS.GOOD, {auctionId: AUCTION_ID}), bidResp));
    };
    it('continues with the auction if not floors data is present without any flooring', function () {
      runBidResponse();
      expect(returnedBidResponse).to.not.haveOwnProperty('floorData');
    });
    it('if no matching rule it should not floor and should call log warn', function () {
      _floorDataForAuction[AUCTION_ID] = utils.deepClone(basicFloorConfig);
      _floorDataForAuction[AUCTION_ID].data.values = { 'video': 1.0 };
      runBidResponse();
      expect(returnedBidResponse).to.not.haveOwnProperty('floorData');
      expect(logWarnSpy.calledOnce).to.equal(true);
    });
    it('if it finds a rule and floors should update the bid accordingly', function () {
      _floorDataForAuction[AUCTION_ID] = utils.deepClone(basicFloorConfig);
      _floorDataForAuction[AUCTION_ID].data.values = { 'banner': 1.0 };
      runBidResponse();
      expect(returnedBidResponse).to.haveOwnProperty('floorData');
      expect(returnedBidResponse.status).to.equal(CONSTANTS.BID_STATUS.BID_REJECTED);
      expect(returnedBidResponse.cpm).to.equal(0);
    });
    it('if it finds a rule and does not floor should update the bid accordingly', function () {
      _floorDataForAuction[AUCTION_ID] = utils.deepClone(basicFloorConfig);
      _floorDataForAuction[AUCTION_ID].data.values = { 'banner': 0.3 };
      runBidResponse();
      expect(returnedBidResponse).to.haveOwnProperty('floorData');
      expect(returnedBidResponse.floorData).to.deep.equal({
        floorRuleValue: 0.3,
        floorValue: 0.3,
        floorCurrency: 'USD',
        floorRule: 'banner',
        cpmAfterAdjustments: 0.5,
        enforcements: {
          bidAdjustment: true,
          enforceJS: true,
          enforcePBS: false,
          floorDeals: false
        },
        matchedFields: {
          mediaType: 'banner'
        }
      });
      expect(returnedBidResponse.cpm).to.equal(0.5);
    });
    it('if should work with more complex rules and update accordingly', function () {
      _floorDataForAuction[AUCTION_ID] = {
        ...basicFloorConfig,
        data: {
          currency: 'USD',
          schema: { fields: ['mediaType', 'size'], delimiter: '|' },
          values: {
            'banner|300x250': 0.5,
            'banner|300x600': 1.5,
            'banner|728x90': 2.5,
            'banner|*': 3.5,
            'video|640x480': 4.5,
            'video|*': 5.5
          },
          default: 10.0
        }
      };
      runBidResponse();
      expect(returnedBidResponse).to.haveOwnProperty('floorData');
      expect(returnedBidResponse.floorData).to.deep.equal({
        floorValue: 0.5,
        floorRuleValue: 0.5,
        floorCurrency: 'USD',
        floorRule: 'banner|300x250',
        cpmAfterAdjustments: 0.5,
        enforcements: {
          bidAdjustment: true,
          enforceJS: true,
          enforcePBS: false,
          floorDeals: false
        },
        matchedFields: {
          mediaType: 'banner',
          size: '300x250'
        }
      });
      expect(returnedBidResponse.cpm).to.equal(0.5);

      // update bidResponse to have different combinations (should pick video|*)
      runBidResponse({
        width: 300,
        height: 250,
        cpm: 7.5,
        mediaType: 'video',
        requestId: '1111',
      });
      expect(returnedBidResponse).to.haveOwnProperty('floorData');
      expect(returnedBidResponse.floorData).to.deep.equal({
        floorRuleValue: 5.5,
        floorValue: 5.5,
        floorCurrency: 'USD',
        floorRule: 'video|*',
        cpmAfterAdjustments: 7.5,
        enforcements: {
          bidAdjustment: true,
          enforceJS: true,
          enforcePBS: false,
          floorDeals: false
        },
        matchedFields: {
          mediaType: 'video',
          size: '300x250'
        }
      });
      expect(returnedBidResponse.cpm).to.equal(7.5);
    });
  });

  describe('Post Auction Tests', function () {
    let AUCTION_END_EVENT;
    beforeEach(function () {
      AUCTION_END_EVENT = {
        auctionId: '123-45-6789'
      };
    });
    it('should wait 3 seconds before deleting auction floor data', function () {
      handleSetFloorsConfig({enabled: true});
      _floorDataForAuction[AUCTION_END_EVENT.auctionId] = utils.deepClone(basicFloorConfig);
      events.emit(CONSTANTS.EVENTS.AUCTION_END, AUCTION_END_EVENT);
      // should still be here
      expect(_floorDataForAuction[AUCTION_END_EVENT.auctionId]).to.not.be.undefined;
      // tick for 4 seconds
      clock.tick(4000);
      // should be undefined now
      expect(_floorDataForAuction[AUCTION_END_EVENT.auctionId]).to.be.undefined;
    });
  });

  describe('fieldMatchingFunctions', () => {
    let sandbox;

    const req = {
      ...basicBidRequest,
    }

    const resp = {
      transactionId: req.transactionId,
      size: [100, 100],
      mediaType: 'banner',
    }

    beforeEach(() => {
      sandbox = sinon.sandbox.create();
      sandbox.stub(auctionManager, 'index').get(() => stubAuctionIndex({
        adUnits: [
          {
            code: req.adUnitCode,
            transactionId: req.transactionId,
            ortb2Imp: {ext: {data: {adserver: {name: 'gam', adslot: 'slot'}}}}
          }
        ]
      }));
    });

    afterEach(() => {
      sandbox.restore();
    })

    Object.entries({
      size: '100x100',
      mediaType: resp.mediaType,
      gptSlot: 'slot',
      domain: 'localhost',
      adUnitCode: req.adUnitCode,
    }).forEach(([test, expected]) => {
      describe(`${test}`, () => {
        it('should work with only bidResponse', () => {
          expect(fieldMatchingFunctions[test](undefined, resp)).to.eql(expected)
        })
      });
    })
  });
});
