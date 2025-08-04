import sinon from 'sinon';
import * as floorProvider from 'libraries/pubmaticUtils/plugins/floorProvider.js';
import * as priceFloors from 'modules/priceFloors.js';
import * as utils from 'src/utils.js';
import * as configModule from 'src/config.js';
import * as pubmaticUtils from 'libraries/pubmaticUtils/pubmaticUtils.js';
import {expect} from 'chai';

describe('FloorProvider', () => {
  const floorsobj = {
    enabled: true,
    pmTargetingKeys: {
      enabled: true,
      multiplier: { win: 4, floored: 10, nobid: 100 }
    },
    config: {
      endpoint: 'https://pubmatic.com/floor',
      enforcement: { floorDeals: false, enforceJS: false },
      floorMin: 0.22,
      skipRate: 0,
      defaultValues: { '*|*': 0.22 }
    },
    data: {
      currency: 'USD',
      skipRate: 0,
      modelVersion: 'Mock API model version',
      multiplier: { win: 1.1, floored: 0.9, nobid: 1.3 },
      schema: {
        fields: ['mediaType','size','domain','adUnitCode','deviceType','timeOfDay','browser','os','utm', 'country','bidder']
      },
      values: {
        "banner|728x90|localhost|div1|0|afternoon|9|1|0|IN|pubmatic": 9.234,
      },
      default: 0.23,
      userIds: ['id5id']
    }
  };

  it('should initialize floor provider and set config correctly', async () => {
    const pluginName = 'dynamicFloors';
    const configJsonManager = {
      getConfigByName: (name) => name === pluginName ? floorsobj : undefined
    };

    const originalContinueAuction = priceFloors.continueAuction;
    priceFloors.continueAuction = function() { return true; };

    const result = await floorProvider.init(pluginName, configJsonManager);

    expect(result).to.be.true;
    expect(floorProvider.getFloorConfig()).to.deep.equal(floorsobj);

    priceFloors.continueAuction = originalContinueAuction;
  });

  it('should return input unchanged if floor config is missing or disabled', async () => {
    floorProvider.init('dynamicFloors', {
      getConfigByName: () => ({...floorsobj, enabled: false})
    });
    expect(await floorProvider.processBidRequest({bar: 2})).to.deep.equal({bar: 2});
  });

  it('should call continueAuction and log when config is enabled', async () => {
    let called = false;
    const originalContinueAuction = priceFloors.continueAuction;
    priceFloors.continueAuction = (hookConfig) => { called = true; };

    floorProvider.init('dynamicFloors', {
      getConfigByName: () => floorsobj
    });

    const req = {baz: 3};
    const result = await floorProvider.processBidRequest(req);

    expect(result).to.equal(req);
    expect(called).to.be.true;

    priceFloors.continueAuction = originalContinueAuction;
  });

  it('should handle errors in continueAuction gracefully', async () => {
    const originalContinueAuction = priceFloors.continueAuction;
    priceFloors.continueAuction = () => { throw new Error('fail!'); };

    floorProvider.init('dynamicFloors', {
      getConfigByName: () => floorsobj
    });

    const req = {err: 4};
    const result = await floorProvider.processBidRequest(req);

    expect(result).to.equal(req);

    priceFloors.continueAuction = originalContinueAuction;
  });

  it('getTargeting should return undefined or do nothing', () => {
    expect(floorProvider.getTargeting([], {}, {}, {})).to.be.undefined;
  });

  // Additional test cases for one-liner exports
  it('should return correct floor config using getFloorConfig', () => {
    floorProvider.init('dynamicFloors', {
      getConfigByName: () => floorsobj
    });
    expect(floorProvider.getFloorConfig()).to.deep.equal(floorsobj);
  });
  describe('Utility Exports', () => {
    afterEach(() => {
      sinon.restore();
    });

    it('getTimeOfDay should return result from getCurrentTimeOfDay', () => {
      const stub = sinon.stub(pubmaticUtils, 'getCurrentTimeOfDay').returns('evening');
      expect(floorProvider.getTimeOfDay()).to.equal('evening');

    });


    it('getBrowser should return result from getBrowser', () => {
      const stub = sinon.stub(pubmaticUtils, 'getBrowserType').returns('Chrome');
      expect(floorProvider.getBrowser()).to.equal('Chrome');
  
    });

    it('getUtm should return result from getUtmValue', () => {
      const stub = sinon.stub(pubmaticUtils, 'getUtmValue').returns('evening');
      expect(floorProvider.getUtm()).to.equal('evening');

    });
   
    it('getBidder should return bidder from request', () => {
      expect(floorProvider.getBidder({ bidder: 'pubmatic' })).to.equal('pubmatic');
      expect(floorProvider.getBidder({})).to.equal(undefined);
      expect(floorProvider.getBidder(undefined)).to.equal(undefined);
    });

  });

});
