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
        "banner|728x90|127.0.0.1|div1|1|morning|IN|MH|0|1|0": 1.1111,
        "banner|728x90|127.0.0.1|div1|1|morning|IN|MH|0|1|1": 2.2222,
        "banner|300x250|localhost|div1|0|afternoon|9|1|1|IN|pubmatic": 0.321,
        "banner|728x90|localhost|div1|0|afternoon|9|1|0|IN|pubmatic": 9.234,
        "banner|728x90|localhost|div1|0|afternoon|9|1|1|IN|pubmatic": 9.432,
        "banner|300x250|localhost|div1|0|afternoon|9|1|0|IN|pubmatic": 3.1,
        "banner|300x250|localhost|div-gpt-ad-1460505748561-0|0|morning|3|1|0": 0.123,
        "banner|300x250|localhost|div-gpt-ad-1460505748561-0|0|morning|2|1|0": 0.123456,
        "banner|300x250|localhost|div-gpt-ad-1460505748561-0|0|morning|11|1|1|US|pubmatic": 0.321,
        "banner|728x90|localhost|div-gpt-ad-1460505748561-1|0|morning|11|1|0|US|pubmatic": 9.234,
        "banner|728x90|localhost|div-gpt-ad-1460505748561-1|0|morning|11|1|1|US|pubmatic": 9.432,
        "banner|300x250|localhost|div-gpt-ad-1460505748561-0|0|morning|11|1|0|US|pubmatic": 3.1,
        "banner|300x250|localhost|div-gpt-ad-1460505748561-0|0|afternoon|11|1|1|US|pubmatic": 0.321,
        "banner|728x90|localhost|div-gpt-ad-1460505748561-1|0|afternoon|11|1|0|US|pubmatic": 9.234,
        "banner|728x90|localhost|div-gpt-ad-1460505748561-1|0|afternoon|11|1|1|US|pubmatic": 9.432,
        "banner|300x250|localhost|div-gpt-ad-1460505748561-0|0|afternoon|11|1|0|US|pubmatic": 3.1
      },
      default: 0.23,
      userIds: ['id5id', 'pubcid', 'criteoId', 'tdid', 'lotamePanoramaId', '33acrossId', 'idl_env', 'pairId', 'uid2', 'publinkId']
    }
  };

  it('should initialize floor provider and set config correctly', async () => {
    const pluginName = 'dynamicFloors';
    const configJsonManager = {
      getConfigByName: (name) => name === pluginName ? floorsobj : undefined
    };

    // Ensure continueAuction is a function
    const originalContinueAuction = priceFloors.continueAuction;
    priceFloors.continueAuction = function() { return true; };

    // Act
    const result = await floorProvider.init(pluginName, configJsonManager);

    // Assert
    expect(result).to.be.true;
    expect(floorProvider.getFloorConfig()).to.deep.equal(floorsobj);

    // Restore
    priceFloors.continueAuction = originalContinueAuction;
  });

  it('should return input unchanged if floor config is missing or disabled', async () => {

    // Disabled config
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
});
