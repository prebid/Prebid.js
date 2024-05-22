import {expect} from 'chai';
import * as utils from 'src/utils.js';
import { getGlobal } from 'src/prebidGlobal.js';
import { EVENTS, STATUS } from 'src/constants.js';
import {
  FLOOR_SKIPPED_REASON,
  _floorDataForAuction,
  getFloorsDataForAuction,
  getFirstMatchingFloor,
  getFloor,
  handleSetFloorsConfig,
  requestBidsHook,
  isFloorsDataValid,
  addBidResponseHook,
  fieldMatchingFunctions,
  allowedFields, parseFloorData, normalizeDefault, getFloorDataFromAdUnits, updateAdUnitsForAuction, createFloorsDataForAuction
} from 'modules/priceFloors.js';
import * as events from 'src/events.js';
import * as mockGpt from '../integration/faker/googletag.js';
import 'src/prebid.js';
import {createBid} from '../../../src/bidfactory.js';
import {auctionManager} from '../../../src/auctionManager.js';
import {stubAuctionIndex} from '../../helpers/indexStub.js';
import {guardTids} from '../../../src/adapters/bidderFactory.js';
import * as activities from '../../../src/activities/rules.js';
import {server} from '../../mocks/xhr.js';

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
    transactionId: 'tr_test_div_1',
    adUnitId: 'tr_test_div_1',
  };

  function getAdUnitMock(code = 'adUnit-code') {
    return {
      code,
      mediaTypes: {banner: { sizes: [[300, 200], [300, 600]] }, native: {}},
      bids: [{bidder: 'someBidder', adUnitCode: code}, {bidder: 'someOtherBidder', adUnitCode: code}]
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

  describe('parseFloorData', () => {
    it('should accept just a default floor', () => {
      const fd = parseFloorData({
        default: 1.23
      });
      expect(getFirstMatchingFloor(fd, {}, {}).matchingFloor).to.eql(1.23);
    });
  });

  describe('getFloorDataFromAdUnits', () => {
    let adUnits;

    function setFloorValues(rule) {
      adUnits.forEach((au, i) => {
        au.floors = {
          values: {
            [rule]: i + 1
          }
        }
      })
    }

    beforeEach(() => {
      adUnits = ['au1', 'au2', 'au3'].map(getAdUnitMock);
    })

    it('should use one schema for all adUnits', () => {
      setFloorValues('*;*')
      adUnits[1].floors.schema = {
        fields: ['mediaType', 'gptSlot'],
        delimiter: ';'
      }
      sinon.assert.match(getFloorDataFromAdUnits(adUnits), {
        schema: {
          fields: ['adUnitCode', 'mediaType', 'gptSlot'],
          delimiter: ';'
        },
        values: {
          'au1;*;*': 1,
          'au2;*;*': 2,
          'au3;*;*': 3
        }
      })
    });
    it('should ignore adUnits that declare different schema', () => {
      setFloorValues('*|*');
      adUnits[0].floors.schema = {
        fields: ['mediaType', 'gptSlot']
      };
      adUnits[2].floors.schema = {
        fields: ['gptSlot', 'mediaType']
      };
      expect(getFloorDataFromAdUnits(adUnits).values).to.eql({
        'au1|*|*': 1,
        'au2|*|*': 2
      })
    });
    it('should ignore adUnits that declare no values', () => {
      setFloorValues('*');
      adUnits[0].floors.schema = {
        fields: ['mediaType']
      };
      delete adUnits[2].floors.values;
      expect(getFloorDataFromAdUnits(adUnits).values).to.eql({
        'au1|*': 1,
        'au2|*': 2,
      })
    })
  })

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
    it('uses a 0 floor as override', function () {
      let inputFloorData = normalizeDefault({
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
      });

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
      utils.deepSetValue(myBidRequest, 'ortb2Imp.ext.prebid.floors.floorMin', 2.2);
      expect(getFirstMatchingFloor(inputFloorData, myBidRequest, { mediaType: 'banner', size: '*' })).to.deep.equal({
        floorMin: 2.2,
        floorRuleValue: 1.0,
        matchingFloor: 2.2,
        matchingData: 'test_div_1',
        matchingRule: 'test_div_1'
      });
      delete inputFloorData.matchingInputs;

      // should take adunit floormin if higher
      utils.deepSetValue(myBidRequest, 'ortb2Imp.ext.prebid.floors.floorMin', 3.0);
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
      let inputFloorData = normalizeDefault({
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
      });
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
      inputFloorData = normalizeDefault({ default: 5.0 });
      expect(getFirstMatchingFloor(inputFloorData, basicBidRequest, {mediaType: 'banner', size: '*'}).matchingFloor).to.equal(5.0);
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
        const newBidRequest1 = { ...basicBidRequest, adUnitId: 'au1' };
        adUnits = [{code: newBidRequest1.adUnitCode, adUnitId: 'au1'}];
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

        const newBidRequest2 = { ...basicBidRequest, adUnitCode: 'test_div_2', adUnitId: 'au2' };
        adUnits = [{code: newBidRequest2.adUnitCode, adUnitId: newBidRequest2.adUnitId}];
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

  describe('updateAdUnitsForAuction', function() {
    let inputFloorData;
    let adUnits;

    beforeEach(function() {
      adUnits = [getAdUnitMock()];
      inputFloorData = utils.deepClone(minFloorConfigLow);
      inputFloorData.skipRate = 0.5;
    });

    it('should set the skipRate to the skipRate from the data property before using the skipRate from floorData directly', function() {
      utils.deepSetValue(inputFloorData, 'data', {
        skipRate: 0.7
      });
      updateAdUnitsForAuction(adUnits, inputFloorData, 'id');

      const skipRate = utils.deepAccess(adUnits, '0.bids.0.floorData.skipRate');
      expect(skipRate).to.equal(0.7);
    });

    it('should set the skipRate to the skipRate from floorData directly if it does not exist in the data property of floorData', function() {
      updateAdUnitsForAuction(adUnits, inputFloorData, 'id');

      const skipRate = utils.deepAccess(adUnits, '0.bids.0.floorData.skipRate');
      expect(skipRate).to.equal(0.5);
    });

    it('should set the skipRate in the bid floorData to undefined if both skipRate and skipRate in the data property are undefined', function() {
      inputFloorData.skipRate = undefined;
      utils.deepSetValue(inputFloorData, 'data', {
        skipRate: undefined,
      });
      updateAdUnitsForAuction(adUnits, inputFloorData, 'id');

      const skipRate = utils.deepAccess(adUnits, '0.bids.0.floorData.skipRate');
      expect(skipRate).to.equal(undefined);
    });
  });

  describe('createFloorsDataForAuction', function() {
    let adUnits;
    let floorConfig;

    beforeEach(function() {
      adUnits = [getAdUnitMock()];
      floorConfig = utils.deepClone(basicFloorConfig);
    });

    it('should return skipRate as 0 if both skipRate and skipRate in the data property are undefined', function() {
      floorConfig.skipRate = undefined;
      floorConfig.data.skipRate = undefined;
      handleSetFloorsConfig(floorConfig);

      const floorData = createFloorsDataForAuction(adUnits, 'id');

      expect(floorData.skipRate).to.equal(0);
      expect(floorData.skipped).to.equal(false);
    });

    it('should properly set skipRate if it is available in the data property', function() {
      // this will force skipped to be true
      floorConfig.skipRate = 101;
      floorConfig.data.skipRate = 201;
      handleSetFloorsConfig(floorConfig);

      const floorData = createFloorsDataForAuction(adUnits, 'id');

      expect(floorData.data.skipRate).to.equal(201);
      expect(floorData.skipped).to.equal(true);
    });

    it('should should use the skipRate if its not available in the data property ', function() {
      // this will force skipped to be true
      floorConfig.skipRate = 101;
      handleSetFloorsConfig(floorConfig);

      const floorData = createFloorsDataForAuction(adUnits, 'id');

      expect(floorData.skipRate).to.equal(101);
      expect(floorData.skipped).to.equal(true);
    });

    it('should have skippedReason set to "not_found" if there is no valid floor data', function() {
      floorConfig.data = {}
      handleSetFloorsConfig(floorConfig);

      const floorData = createFloorsDataForAuction(adUnits, 'id');
      expect(floorData.skippedReason).to.equal(FLOOR_SKIPPED_REASON.NOT_FOUND);
    });

    it('should have skippedReason set to "random" if there is floor data and skipped is true', function() {
      // this will force skipped to be true
      floorConfig.skipRate = 101;
      handleSetFloorsConfig(floorConfig);

      const floorData = createFloorsDataForAuction(adUnits, 'id');
      expect(floorData.skippedReason).to.equal(FLOOR_SKIPPED_REASON.RANDOM);
    });
  });

  describe('pre-auction tests', function () {
    let exposedAdUnits;
    const validateBidRequests = (getFloorExpected, FloorDataExpected) => {
      exposedAdUnits.forEach(adUnit => adUnit.bids.forEach(bid => {
        expect(bid.hasOwnProperty('getFloor')).to.equal(getFloorExpected);
        sinon.assert.match(bid.floorData, FloorDataExpected);
      }));
    };
    const runStandardAuction = (adUnits = [getAdUnitMock('test_div_1')]) => {
      requestBidsHook(config => exposedAdUnits = config.adUnits, {
        auctionId: basicBidRequest.auctionId,
        adUnits,
      });
    };
    let actualAllowedFields = allowedFields;
    let actualFieldMatchingFunctions = fieldMatchingFunctions;
    const defaultAllowedFields = [...allowedFields];
    const defaultMatchingFunctions = {...fieldMatchingFunctions};
    afterEach(function() {
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
    it('should not do floor stuff if floors.data is defined by noFloorSignalBidders[]', function() {
      handleSetFloorsConfig({
        ...basicFloorConfig,
        data: {
          ...basicFloorDataLow,
          noFloorSignalBidders: ['someBidder', 'someOtherBidder']
        }});
      runStandardAuction();
      validateBidRequests(false, {
        skipped: false,
        floorMin: undefined,
        modelVersion: 'basic model',
        modelWeight: 10,
        modelTimestamp: undefined,
        location: 'setConfig',
        skipRate: 0,
        fetchStatus: undefined,
        floorProvider: undefined,
        noFloorSignaled: true
      })
    });
    it('should not do floor stuff if floors.enforcement is defined by noFloorSignalBidders[]', function() {
      handleSetFloorsConfig({ ...basicFloorConfig,
        enforcement: {
          enforceJS: true,
          noFloorSignalBidders: ['someBidder', 'someOtherBidder']
        },
        data: basicFloorDataLow
      });
      runStandardAuction();
      validateBidRequests(false, {
        skipped: false,
        floorMin: undefined,
        modelVersion: 'basic model',
        modelWeight: 10,
        modelTimestamp: undefined,
        location: 'setConfig',
        skipRate: 0,
        fetchStatus: undefined,
        floorProvider: undefined,
        noFloorSignaled: true
      })
    });
    it('should not do floor stuff and use first floors.data.noFloorSignalBidders if its defined betwen enforcement.noFloorSignalBidders', function() {
      handleSetFloorsConfig({ ...basicFloorConfig,
        enforcement: {
          enforceJS: true,
          noFloorSignalBidders: ['someBidder']
        },
        data: {
          ...basicFloorDataLow,
          noFloorSignalBidders: ['someBidder', 'someOtherBidder']
        }
      });
      runStandardAuction();
      validateBidRequests(false, {
        skipped: false,
        floorMin: undefined,
        modelVersion: 'basic model',
        modelWeight: 10,
        modelTimestamp: undefined,
        location: 'setConfig',
        skipRate: 0,
        fetchStatus: undefined,
        floorProvider: undefined,
        noFloorSignaled: true
      })
    });
    it('it shouldn`t return floor stuff for bidder in the noFloorSignalBidders list', function() {
      handleSetFloorsConfig({ ...basicFloorConfig,
        enforcement: {
          enforceJS: true,
        },
        data: {
          ...basicFloorDataLow,
          noFloorSignalBidders: ['someBidder']
        }
      });
      runStandardAuction()
      const bidRequestData = exposedAdUnits[0].bids.find(bid => bid.bidder === 'someBidder');
      expect(bidRequestData.hasOwnProperty('getFloor')).to.equal(false);
      sinon.assert.match(bidRequestData.floorData, {
        skipped: false,
        floorMin: undefined,
        modelVersion: 'basic model',
        modelWeight: 10,
        modelTimestamp: undefined,
        location: 'setConfig',
        skipRate: 0,
        fetchStatus: undefined,
        floorProvider: undefined,
        noFloorSignaled: true
      });
    })
    it('it should return floor stuff if we defined wrong bidder name in data.noFloorSignalBidders', function() {
      handleSetFloorsConfig({ ...basicFloorConfig,
        enforcement: {
          enforceJS: true,
        },
        data: {
          ...basicFloorDataLow,
          noFloorSignalBidders: ['randomBiider']
        }
      });
      runStandardAuction();
      validateBidRequests(true, {
        skipped: false,
        floorMin: undefined,
        modelVersion: 'basic model',
        modelWeight: 10,
        modelTimestamp: undefined,
        location: 'setConfig',
        skipRate: 0,
        fetchStatus: undefined,
        floorProvider: undefined,
        noFloorSignaled: false
      })
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
    describe('default floor', () => {
      let adUnits;
      beforeEach(() => {
        adUnits = ['au1', 'au2'].map(getAdUnitMock);
      })
      function expectFloors(floors) {
        runStandardAuction(adUnits);
        adUnits.forEach((au, i) => {
          au.bids.forEach(bid => {
            expect(bid.getFloor().floor).to.eql(floors[i]);
          })
        })
      }
      describe('should be sufficient by itself', () => {
        it('globally', () => {
          handleSetFloorsConfig({
            ...basicFloorConfig,
            data: {
              default: 1.23
            }
          });
          expectFloors([1.23, 1.23])
        });
        it('on adUnits', () => {
          handleSetFloorsConfig({
            ...basicFloorConfig,
            data: undefined
          });
          adUnits[0].floors = {default: 1};
          adUnits[1].floors = {default: 2};
          expectFloors([1, 2])
        });
        it('on an adUnit with hidden schema', () => {
          handleSetFloorsConfig({
            ...basicFloorConfig,
            data: undefined
          });
          adUnits[0].floors = {
            schema: {
              fields: ['mediaType', 'gptSlot'],
            },
            default: 1
          }
          adUnits[1].floors = {
            default: 2
          }
          expectFloors([1, 2]);
        })
      });
      describe('should NOT be used when a star rule exists', () => {
        it('globally', () => {
          handleSetFloorsConfig({
            ...basicFloorConfig,
            data: {
              schema: {
                fields: ['mediaType', 'gptSlot'],
              },
              values: {
                '*|*': 2
              },
              default: 3,
            }
          });
          expectFloors([2, 2]);
        });
        it('on adUnits', () => {
          handleSetFloorsConfig({
            ...basicFloorConfig,
            data: undefined
          });
          adUnits[0].floors = {
            schema: {
              fields: ['mediaType', 'gptSlot'],
            },
            values: {
              '*|*': 1
            },
            default: 3
          };
          adUnits[1].floors = {
            values: {
              '*|*': 2
            },
            default: 4
          }
          expectFloors([1, 2]);
        })
      });
    })
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
    it('should ignore and reset floor data when provided with invalid data', function () {
      handleSetFloorsConfig({...basicFloorConfig});
      handleSetFloorsConfig({
        ...basicFloorConfig,
        data: {
          schema: {fields: ['thisIsNotAllowedSoShouldFail']},
          values: {'*': 1.2},
          modelVersion: 'FAIL'
        }
      });
      runStandardAuction();
      validateBidRequests(false, sinon.match({location: 'noData', skipped: true}));
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
      handleSetFloorsConfig({...basicFloorConfig, auctionDelay: 250, endpoint: {url: 'http://www.fakefloorprovider.json//'}});

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
      server.respond();
    });
    it('It should fetch if config has url and bidRequests have fetch level flooring meta data', function () {
      // init the fake server with response stuff
      let fetchFloorData = {
        ...basicFloorData,
        modelVersion: 'fetch model name', // change the model name
      };
      server.respondWith(JSON.stringify(fetchFloorData));

      // run setConfig indicating fetch
      handleSetFloorsConfig({...basicFloorConfig, floorProvider: 'floorprovider', auctionDelay: 250, endpoint: {url: 'http://www.fakefloorprovider.json/'}});

      // floor provider should be called
      expect(server.requests.length).to.equal(1);
      expect(server.requests[0].url).to.equal('http://www.fakefloorprovider.json/');

      // start the auction it should delay and not immediately call `continueAuction`
      runStandardAuction();

      // exposedAdUnits should be undefined if the auction has not continued
      expect(exposedAdUnits).to.be.undefined;

      // make the fetch respond
      server.respond();
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
      server.respondWith(JSON.stringify(fetchFloorData));

      // run setConfig indicating fetch
      handleSetFloorsConfig({...basicFloorConfig, floorProvider: 'floorproviderC', auctionDelay: 250, endpoint: {url: 'http://www.fakefloorprovider.json/'}});

      // floor provider should be called
      expect(server.requests.length).to.equal(1);
      expect(server.requests[0].url).to.equal('http://www.fakefloorprovider.json/');

      // start the auction it should delay and not immediately call `continueAuction`
      runStandardAuction();

      // exposedAdUnits should be undefined if the auction has not continued
      expect(exposedAdUnits).to.be.undefined;

      // make the fetch respond
      server.respond();

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
      server.respondWith(JSON.stringify(fetchFloorData));

      // run setConfig indicating fetch
      handleSetFloorsConfig({...basicFloorConfig, floorProvider: 'floorprovider', auctionDelay: 250, endpoint: {url: 'http://www.fakefloorprovider.json/'}});

      // floor provider should be called
      expect(server.requests.length).to.equal(1);
      expect(server.requests[0].url).to.equal('http://www.fakefloorprovider.json/');

      // start the auction it should delay and not immediately call `continueAuction`
      runStandardAuction();

      // exposedAdUnits should be undefined if the auction has not continued
      expect(exposedAdUnits).to.be.undefined;

      // make the fetch respond
      server.respond();
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
      handleSetFloorsConfig({...basicFloorConfig, auctionDelay: 250, endpoint: {url: 'http://www.fakefloorprovider.json/'}});

      // run the auction and make server respond with 404
      server.respond();
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
      server.respondWith('Not valid response');

      // run setConfig indicating fetch
      handleSetFloorsConfig({...basicFloorConfig, auctionDelay: 250, endpoint: {url: 'http://www.fakefloorprovider.json/'}});

      // run the auction and make server respond
      server.respond();
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
      server.respondWith(JSON.stringify(basicFloorData));
      handleSetFloorsConfig({...basicFloorConfig, auctionDelay: 250, endpoint: {url: 'http://www.fakefloorprovider.json/'}});
      handleSetFloorsConfig({...basicFloorConfig, auctionDelay: 250, endpoint: {url: 'http://www.fakefloorprovider.json/'}});

      // log warn should be called and server only should have one request
      expect(logWarnSpy.calledOnce).to.equal(true);
      expect(server.requests.length).to.equal(1);
      expect(server.requests[0].url).to.equal('http://www.fakefloorprovider.json/');

      // now we respond and then run again it should work and make another request
      server.respond();
      handleSetFloorsConfig({...basicFloorConfig, auctionDelay: 250, endpoint: {url: 'http://www.fakefloorprovider.json/'}});
      server.respond();

      // now warn still only called once and server called twice
      expect(logWarnSpy.calledOnce).to.equal(true);
      expect(server.requests.length).to.equal(2);

      // should log error if method is not GET for now
      expect(logErrorSpy.calledOnce).to.equal(false);
      handleSetFloorsConfig({...basicFloorConfig, endpoint: {url: 'http://www.fakefloorprovider.json/', method: 'POST'}});
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

      it('works when TIDs are disabled', () => {
        sandbox.stub(activities, 'isActivityAllowed').returns(false);
        const req = utils.deepClone(bidRequest);
        _floorDataForAuction[req.auctionId] = utils.deepClone(basicFloorConfig);

        expect(guardTids('mock-bidder').bidRequest(req).getFloor({})).to.deep.equal({
          currency: 'USD',
          floor: 1.0
        });
      });

      it('picks the right rule with more complex rules', function () {
        _floorDataForAuction[bidRequest.auctionId] = {
          ...basicFloorConfig,
          data: normalizeDefault({
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
          })
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

      it('should use inverseFloorAdjustment function before bidder cpm adjustment', function () {
        let functionUsed;
        getGlobal().bidderSettings = {
          rubicon: {
            bidCpmAdjustment: function (bidCpm, bidResponse) {
              functionUsed = 'Rubicon Adjustment';
              bidCpm *= 0.5;
              if (bidResponse.mediaType === 'video') bidCpm -= 0.18;
              return bidCpm;
            },
            inverseBidAdjustment: function (bidCpm, bidRequest) {
              functionUsed = 'Rubicon Inverse';
              // if video is the only mediaType on Bid Request => add 0.18
              if (bidRequest.mediaTypes.video && Object.keys(bidRequest.mediaTypes).length === 1) bidCpm += 0.18;
              return bidCpm / 0.5;
            },
          },
          appnexus: {
            bidCpmAdjustment: function (bidCpm, bidResponse) {
              functionUsed = 'Appnexus Adjustment';
              bidCpm *= 0.75;
              if (bidResponse.mediaType === 'video') bidCpm -= 0.18;
              return bidCpm;
            },
            inverseBidAdjustment: function (bidCpm, bidRequest) {
              functionUsed = 'Appnexus Inverse';
              // if video is the only mediaType on Bid Request => add 0.18
              if (bidRequest.mediaTypes.video && Object.keys(bidRequest.mediaTypes).length === 1) bidCpm += 0.18;
              return bidCpm / 0.75;
            },
          }
        };

        _floorDataForAuction[bidRequest.auctionId] = utils.deepClone(basicFloorConfig);

        _floorDataForAuction[bidRequest.auctionId].data.values = { '*': 1.0 };

        // start with banner as only mediaType
        bidRequest.mediaTypes = { banner: { sizes: [[300, 250]] } };
        let appnexusBid = {
          ...bidRequest,
          bidder: 'appnexus',
        };

        // should be same as the adjusted calculated inverses above test (banner)
        expect(bidRequest.getFloor()).to.deep.equal({
          currency: 'USD',
          floor: 2.0
        });

        // should use rubicon inverse
        expect(functionUsed).to.equal('Rubicon Inverse');

        // appnexus just using banner should be same
        expect(appnexusBid.getFloor()).to.deep.equal({
          currency: 'USD',
          floor: 1.3334
        });

        expect(functionUsed).to.equal('Appnexus Inverse');

        // now since asking for 'video' only mediaType inverse function should include the .18
        bidRequest.mediaTypes = { video: { context: 'instream' } };
        expect(bidRequest.getFloor({ mediaType: 'video' })).to.deep.equal({
          currency: 'USD',
          floor: 2.36
        });

        expect(functionUsed).to.equal('Rubicon Inverse');

        // now since asking for 'video' inverse function should include the .18
        appnexusBid.mediaTypes = { video: { context: 'instream' } };
        expect(appnexusBid.getFloor({ mediaType: 'video' })).to.deep.equal({
          currency: 'USD',
          floor: 1.5734
        });

        expect(functionUsed).to.equal('Appnexus Inverse');
      });

      it('should pass inverseFloorAdjustment the bidRequest object so it can be used', function () {
        // Adjustment factors based on Bid Media Type
        const mediaTypeFactors = {
          banner: 0.5,
          native: 0.7,
          video: 0.9
        }
        getGlobal().bidderSettings = {
          rubicon: {
            bidCpmAdjustment: function (bidCpm, bidResponse) {
              return bidCpm * mediaTypeFactors[bidResponse.mediaType];
            },
            inverseBidAdjustment: function (bidCpm, bidRequest) {
              // For the inverse we add up each mediaType in the request and divide by number of Mt's to get the inverse number
              let factor = Object.keys(bidRequest.mediaTypes).reduce((sum, mediaType) => sum += mediaTypeFactors[mediaType], 0);
              factor = factor / Object.keys(bidRequest.mediaTypes).length;
              return bidCpm / factor;
            },
          }
        };

        _floorDataForAuction[bidRequest.auctionId] = utils.deepClone(basicFloorConfig);

        _floorDataForAuction[bidRequest.auctionId].data.values = { '*': 1.0 };

        // banner only should be 2
        bidRequest.mediaTypes = { banner: {} };
        expect(bidRequest.getFloor()).to.deep.equal({
          currency: 'USD',
          floor: 2.0
        });

        // native only should be 1.4286
        bidRequest.mediaTypes = { native: {} };
        expect(bidRequest.getFloor()).to.deep.equal({
          currency: 'USD',
          floor: 1.4286
        });

        // video only should be 1.1112
        bidRequest.mediaTypes = { video: {} };
        expect(bidRequest.getFloor()).to.deep.equal({
          currency: 'USD',
          floor: 1.1112
        });

        // video and banner should even out to 0.7 factor so 1.4286
        bidRequest.mediaTypes = { video: {}, banner: {} };
        expect(bidRequest.getFloor()).to.deep.equal({
          currency: 'USD',
          floor: 1.4286
        });

        // video and native should even out to 0.8 factor so -- 1.25
        bidRequest.mediaTypes = { video: {}, native: {} };
        expect(bidRequest.getFloor()).to.deep.equal({
          currency: 'USD',
          floor: 1.25
        });

        // banner and native should even out to 0.6 factor so -- 1.6667
        bidRequest.mediaTypes = { banner: {}, native: {} };
        expect(bidRequest.getFloor()).to.deep.equal({
          currency: 'USD',
          floor: 1.6667
        });

        // all 3 banner video and native should even out to 0.7 factor so -- 1.4286
        bidRequest.mediaTypes = { banner: {}, native: {}, video: {} };
        expect(bidRequest.getFloor()).to.deep.equal({
          currency: 'USD',
          floor: 1.4286
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
    let returnedBidResponse, indexStub, reject;
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
      returnedBidResponse = null;
      reject = sinon.stub().returns({status: 'rejected'});
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
      addBidResponseHook(next, bidResp.adUnitCode, Object.assign(createBid(STATUS.GOOD, { auctionId: AUCTION_ID }), bidResp), reject);
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
    it('if it finds a rule with a floor price of zero it should not call log warn', function () {
      _floorDataForAuction[AUCTION_ID] = utils.deepClone(basicFloorConfig);
      _floorDataForAuction[AUCTION_ID].data.values = { '*': 0 };
      runBidResponse();
      expect(logWarnSpy.calledOnce).to.equal(false);
    });
    it('if it finds a rule and floors should update the bid accordingly', function () {
      _floorDataForAuction[AUCTION_ID] = utils.deepClone(basicFloorConfig);
      _floorDataForAuction[AUCTION_ID].data.values = { 'banner': 1.0 };
      runBidResponse();
      expect(reject.calledOnce).to.be.true;
      expect(returnedBidResponse).to.not.exist;
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
      events.emit(EVENTS.AUCTION_END, AUCTION_END_EVENT);
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
      adUnitId: req.adUnitId,
      size: [100, 100],
      mediaType: 'banner',
    }

    beforeEach(() => {
      sandbox = sinon.sandbox.create();
      sandbox.stub(auctionManager, 'index').get(() => stubAuctionIndex({
        adUnits: [
          {
            code: req.adUnitCode,
            adUnitId: req.adUnitId,
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
