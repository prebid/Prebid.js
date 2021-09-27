import { expect } from 'chai';
import {
  init,
  MODULE_NAME,
  validateConfig
} from 'modules/yieldmoSyntheticInventoryModule';

const mockedYmConfig = {
  placementId: '123456',
  adUnitPath: '/6355419/ad_unit_name_used_in_gam'
};

describe('Yieldmo Synthetic Inventory Module', function() {
  let config = Object.assign({}, mockedYmConfig);

  it('should be enabled with valid required params', function() {
    expect(function () {
      init(mockedYmConfig);
    }).not.to.throw()
  });

  it('should throw an error if placementId is missed', function() {
    const {placementId, ...config} = mockedYmConfig;

    expect(function () {
      validateConfig(config);
    }).throw(`${MODULE_NAME}: placementId required`)
  });

  it('should throw an error if adUnitPath is missed', function() {
    const {adUnitPath, ...config} = mockedYmConfig;

    expect(function () {
      validateConfig(config);
    }).throw(`${MODULE_NAME}: adUnitPath required`)
  });
});
