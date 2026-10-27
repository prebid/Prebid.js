import { expect } from 'chai';
import { newConfig } from 'src/config.js';

describe('mergeConfig priceGranularity regression', function () {
  let config;
  let getConfig;
  let mergeConfig;

  beforeEach(function () {
    config = newConfig();
    getConfig = config.getAnyConfig;
    mergeConfig = config.mergeConfig;
  });

  it('should overwrite string priceGranularity with custom object via mergeConfig', function () {
    // 1. Initial state is the default string 'medium'
    expect(getConfig('priceGranularity')).to.equal('medium');

    // 2. Attempt to apply a custom granularity object via mergeConfig
    const customGranularity = {
      buckets: [{
        precision: 2,
        min: 0,
        max: 5,
        increment: 0.01
      }]
    };

    mergeConfig({
      priceGranularity: customGranularity
    });

    // 3. Verify it changed to 'custom' (internal state)
    // In Prebid, when a custom object is set to priceGranularity,
    // the property itself becomes 'custom' and the buckets are stored in customPriceBucket.
    expect(getConfig('priceGranularity')).to.equal('custom');
    expect(getConfig('customPriceBucket')).to.deep.equal(customGranularity);
  });

  it('should correctly merge mediaTypePriceGranularity with custom objects', function () {
    const customGranularity = {
      buckets: [{
        precision: 2,
        min: 0,
        max: 5,
        increment: 0.01
      }]
    };

    mergeConfig({
      mediaTypePriceGranularity: {
        video: customGranularity
      }
    });

    const result = getConfig('mediaTypePriceGranularity');
    expect(result.video).to.deep.equal(customGranularity);
  });
});
