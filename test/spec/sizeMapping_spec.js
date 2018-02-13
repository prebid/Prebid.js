import { expect } from 'chai';
import { resolveStatus, setSizeConfig } from 'src/sizeMapping';
import includes from 'core-js/library/fn/array/includes';

describe('sizeMapping', () => {
  var testSizes = [[970, 90], [728, 90], [300, 250], [300, 100], [80, 80]];

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
});
