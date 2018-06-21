import { expect } from 'chai';
import { resolveStatus, setSizeConfig, resolveBidOverrideSizes } from 'src/sizeMapping';
import includes from 'core-js/library/fn/array/includes';

let utils = require('src/utils');
let deepClone = utils.deepClone;

describe('sizeMapping', () => {
  var testSizes = [[970, 90], [728, 90], [300, 250], [300, 100], [80, 80]];

  // Should also handle sizes defined with Object format IE { w: 300, h: 250 }
  const testSizesDefinedWithObjs = [
    { w: 728, h: 90 }, { w: 300, h: 250 }, { w: 300, h: 100 }
  ]

  var sizeConfig = [{
    'mediaQuery': '(min-width: 1200px)',
    'sizesSupported': [
      [970, 90],
      [728, 90],
      [300, 250]
    ]
  }, {
    'mediaQuery': '(min-width: 768px) and (max-width: 1199px)',
    'sizesSupported': [
      [728, 90],
      [300, 250],
      [300, 100]
    ]
  }, {
    'mediaQuery': '(min-width: 0px) and (max-width: 767px)',
    'sizesSupported': []
  }];

  var sizeConfigWithLabels = [{
    'mediaQuery': '(min-width: 1200px)',
    'labels': ['desktop']
  }, {
    'mediaQuery': '(min-width: 768px) and (max-width: 1199px)',
    'sizesSupported': [
      [728, 90],
      [300, 250]
    ],
    'labels': ['tablet', 'phone']
  }, {
    'mediaQuery': '(min-width: 0px) and (max-width: 767px)',
    'sizesSupported': [
      [300, 250],
      [300, 100]
    ],
    'labels': ['phone']
  }];

  let sandbox,
    matchMediaOverride;

  beforeEach(() => {
    setSizeConfig(sizeConfig);

    sandbox = sinon.sandbox.create();

    matchMediaOverride = {matches: false};

    sandbox.stub(window, 'matchMedia').callsFake((...args) => {
      if (typeof matchMediaOverride === 'function') {
        return matchMediaOverride.apply(window, args);
      }
      return matchMediaOverride;
    });
  });

  afterEach(() => {
    setSizeConfig([]);

    sandbox.restore();
  });

  describe('when handling sizes', () => {
    it('should log a warning when mediaQuery property missing from sizeConfig', () => {
      let errorConfig = deepClone(sizeConfig);

      delete errorConfig[0].mediaQuery;

      sandbox.stub(utils, 'logWarn');

      resolveStatus(undefined, testSizes, errorConfig);
      expect(utils.logWarn.firstCall.args[0]).to.match(/missing.+?mediaQuery/);
    });

    it('when one mediaQuery block matches, it should filter the adUnit.sizes passed in', () => {
      matchMediaOverride = (str) => str === '(min-width: 1200px)' ? {matches: true} : {matches: false};

      let status = resolveStatus(undefined, testSizes, sizeConfig);

      expect(status).to.deep.equal({
        active: true,
        sizes: [[970, 90], [728, 90], [300, 250]]
      })
    });

    it('when multiple mediaQuery block matches, it should filter a union of the matched sizesSupported', () => {
      matchMediaOverride = (str) => includes([
        '(min-width: 1200px)',
        '(min-width: 768px) and (max-width: 1199px)'
      ], str) ? {matches: true} : {matches: false};

      let status = resolveStatus(undefined, testSizes, sizeConfig);
      expect(status).to.deep.equal({
        active: true,
        sizes: [[970, 90], [728, 90], [300, 250], [300, 100]]
      })
    });

    it('if no mediaQueries match, it should allow all sizes specified', () => {
      matchMediaOverride = () => ({matches: false});

      let status = resolveStatus(undefined, testSizes, sizeConfig);
      expect(status).to.deep.equal({
        active: true,
        sizes: testSizes
      })
    });

    it('if a mediaQuery matches and has sizesSupported: [], it should filter all sizes', () => {
      matchMediaOverride = (str) => str === '(min-width: 0px) and (max-width: 767px)' ? {matches: true} : {matches: false};

      let status = resolveStatus(undefined, testSizes, sizeConfig);
      expect(status).to.deep.equal({
        active: false,
        sizes: []
      })
    });

    it('if a mediaQuery matches and no sizesSupported specified, it should not effect adUnit.sizes', () => {
      matchMediaOverride = (str) => str === '(min-width: 1200px)' ? {matches: true} : {matches: false};

      let status = resolveStatus(undefined, testSizes, sizeConfigWithLabels);
      expect(status).to.deep.equal({
        active: true,
        sizes: testSizes
      })
    });

    it('when adUnit.sizes are defined using Objects, it should still filter sizes for matching mediaQuery block', () => {
      matchMediaOverride = (str) => str === '(min-width: 1200px)' ? {matches: true} : {matches: false};

      let statusObjFormatSizes = resolveStatus(undefined, testSizesDefinedWithObjs, sizeConfig);

      expect(statusObjFormatSizes).to.deep.equal({
        active: true,
        sizes: [{ w: 728, h: 90 }, { w: 300, h: 250 }]
      })
    });
  });

  describe('when handling labels', () => {
    it('should activate/deactivate adUnits/bidders based on sizeConfig.labels', () => {
      matchMediaOverride = (str) => str === '(min-width: 1200px)' ? {matches: true} : {matches: false};

      let status = resolveStatus({
        labels: ['desktop']
      }, testSizes, sizeConfigWithLabels);

      expect(status).to.deep.equal({
        active: true,
        sizes: testSizes
      });

      status = resolveStatus({
        labels: ['tablet']
      }, testSizes, sizeConfigWithLabels);

      expect(status).to.deep.equal({
        active: false,
        sizes: testSizes
      });
    });

    it('should active/deactivate adUnits/bidders based on requestBids labels', () => {
      let activeLabels = ['us-visitor', 'desktop', 'smart'];

      let status = resolveStatus({
        labels: ['uk-visitor'],
        activeLabels
      }, testSizes, sizeConfigWithLabels);

      expect(status).to.deep.equal({
        active: false,
        sizes: testSizes
      });

      status = resolveStatus({
        labels: ['us-visitor'],
        activeLabels
      }, testSizes, sizeConfigWithLabels);

      expect(status).to.deep.equal({
        active: true,
        sizes: testSizes
      });

      status = resolveStatus({
        labels: ['us-visitor', 'tablet'],
        labelAll: true,
        activeLabels
      }, testSizes, sizeConfigWithLabels);

      expect(status).to.deep.equal({
        active: false,
        sizes: testSizes
      });

      status = resolveStatus({
        labels: ['us-visitor', 'desktop'],
        labelAll: true,
        activeLabels
      }, testSizes, sizeConfigWithLabels);

      expect(status).to.deep.equal({
        active: true,
        sizes: testSizes
      });
    });
  });

  describe('when handling sizes defined on a bid', () => {
    it('should filter an intersection of adUnit sizes and bid sizes', () => {
      const testAdUnitSizes = deepClone(testSizes);

      const bidOneSize = {sizes: [[728, 90]]};
      const bidMultipleSizes = {sizes: [[728, 90], [300, 250], [300, 100]]};

      // Test single valid bid size, should return single valid size
      expect(resolveBidOverrideSizes(bidOneSize, testAdUnitSizes)).to.deep.equal(bidOneSize.sizes);
      // Test multiple valid bid sizes, should return valid sizes
      expect(resolveBidOverrideSizes(bidMultipleSizes, testAdUnitSizes)).to.deep.equal(bidMultipleSizes.sizes);
    });

    it('should filter bid sizes with adUnit sizes defined as a list of objects', () => {
      // adUnit sizes defined using w/h object structure Array.<{ w:number, h:number }>
      const testAdUnitSizesObjs = deepClone(testSizes).map(size => ({w: size[0], h: size[1]}));

      const bidOneSize = {sizes: [[728, 90]]};
      const bidMultipleSizes = {sizes: [[728, 90], [300, 250], [300, 100]]};

      // Test single valid bid size, should return single valid size but defined as Array.<{ w:number, h:number }>
      expect(resolveBidOverrideSizes(bidOneSize, testAdUnitSizesObjs, true)).to.deep.equal(bidOneSize.sizes.map(size => ({w: size[0], h: size[1]})));
      // Test multiple valid bid sizes, should return valid sizes but defined as Array.<{ w:number, h:number }>
      expect(resolveBidOverrideSizes(bidMultipleSizes, testAdUnitSizesObjs, true)).to.deep.equal(bidMultipleSizes.sizes.map(size => ({w: size[0], h: size[1]})));
    });

    it('should return unfiltered sizes when bid sizes are invalid', () => {
      sandbox.stub(utils, 'logWarn');
      const testAdUnitSizes = deepClone(testSizes);
      const bidInvalidSize = {sizes: [[728, 250]]};

      // Invalid bid sizes, should return unfiltered sizes and log warning
      expect(resolveBidOverrideSizes(bidInvalidSize, testAdUnitSizes)).to.deep.equal(testAdUnitSizes);
      expect(utils.logWarn.firstCall.args[0]).to.match(/Invalid bid override sizes/);
    });

    it('should return unfiltered sizes when bid sizes or adUnit sizes are empty', () => {
      const testAdUnitSizes = deepClone(testSizes);
      const bidOneSize = {sizes: [[728, 90]]};
      const bidEmptySizes = {sizes: []};

      // Empty bid sizes, should return unfiltered bids
      expect(resolveBidOverrideSizes(bidEmptySizes, testAdUnitSizes)).to.deep.equal(testAdUnitSizes);
      // Valid bid size and empty adUnit sizes, should return empty adUnit sizes
      expect(resolveBidOverrideSizes(bidOneSize, [])).to.deep.equal([]);
    });
  })
});
