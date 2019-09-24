import { expect } from 'chai';
import { resolveStatus, setSizeConfig, sizeSupported } from 'src/sizeMapping';
import includes from 'core-js/library/fn/array/includes';

let utils = require('src/utils');
let deepClone = utils.deepClone;

describe('sizeMapping', function () {
  var testSizes = {
    banner: {
      sizes: [[970, 90], [728, 90], [300, 250], [300, 100], [80, 80]]
    }
  };

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

  beforeEach(function () {
    setSizeConfig(sizeConfig);

    sandbox = sinon.sandbox.create();

    matchMediaOverride = {matches: false};

    sandbox.stub(utils.getWindowTop(), 'matchMedia').callsFake((...args) => {
      if (typeof matchMediaOverride === 'function') {
        return matchMediaOverride.apply(utils.getWindowTop(), args);
      }
      return matchMediaOverride;
    });
  });

  afterEach(function () {
    setSizeConfig([]);

    sandbox.restore();
  });

  describe('when handling sizes', function () {
    it('should allow us to validate a single size', function() {
      matchMediaOverride = (str) => str === '(min-width: 1200px)' ? {matches: true} : {matches: false};

      expect(sizeSupported([300, 250])).to.equal(true);
      expect(sizeSupported([80, 80])).to.equal(false);
    });

    it('should log a warning when mediaQuery property missing from sizeConfig', function () {
      let errorConfig = deepClone(sizeConfig);

      delete errorConfig[0].mediaQuery;

      sandbox.stub(utils, 'logWarn');

      resolveStatus(undefined, testSizes, undefined, errorConfig);
      expect(utils.logWarn.firstCall.args[0]).to.match(/missing.+?mediaQuery/);
    });

    it('should allow deprecated adUnit.sizes', function() {
      matchMediaOverride = (str) => str === '(min-width: 1200px)' ? {matches: true} : {matches: false};

      let status = resolveStatus(undefined, undefined, testSizes.banner.sizes, sizeConfig);

      expect(status.active).to.equal(true);
      expect(status.mediaTypes).to.deep.equal({
        banner: {
          sizes: [[970, 90], [728, 90], [300, 250]]
        }
      });
    });

    it('when one mediaQuery block matches, it should filter the adUnit.sizes passed in', function () {
      matchMediaOverride = (str) => str === '(min-width: 1200px)' ? {matches: true} : {matches: false};

      let status = resolveStatus(undefined, testSizes, undefined, sizeConfig);

      expect(status.active).to.equal(true);
      expect(status.mediaTypes).to.deep.equal({
        banner: {
          sizes: [[970, 90], [728, 90], [300, 250]]
        }
      });
    });

    it('when multiple mediaQuery block matches, it should filter a union of the matched sizesSupported', function () {
      matchMediaOverride = (str) => includes([
        '(min-width: 1200px)',
        '(min-width: 768px) and (max-width: 1199px)'
      ], str) ? {matches: true} : {matches: false};

      let status = resolveStatus(undefined, testSizes, undefined, sizeConfig);
      expect(status.active).to.equal(true);
      expect(status.mediaTypes).to.deep.equal({
        banner: {
          sizes: [[970, 90], [728, 90], [300, 250], [300, 100]]
        }
      });
    });

    it('if no mediaQueries match, it should allow all sizes specified', function () {
      matchMediaOverride = () => ({matches: false});

      let status = resolveStatus(undefined, testSizes, undefined, sizeConfig);
      expect(status.active).to.equal(true);
      expect(status.mediaTypes).to.deep.equal(testSizes);
    });

    it('if a mediaQuery matches and has sizesSupported: [], it should filter all sizes', function () {
      matchMediaOverride = (str) => str === '(min-width: 0px) and (max-width: 767px)' ? {matches: true} : {matches: false};

      let status = resolveStatus(undefined, testSizes, undefined, sizeConfig);
      expect(status.active).to.equal(false);
      expect(status.mediaTypes).to.deep.equal({
        banner: {
          sizes: []
        }
      });
    });

    it('should filter all banner sizes and should disable the adUnit even if other mediaTypes are present', function () {
      matchMediaOverride = (str) => str === '(min-width: 0px) and (max-width: 767px)' ? {matches: true} : {matches: false};
      let status = resolveStatus(undefined, Object.assign({}, testSizes, {
        native: {
          type: 'image'
        }
      }), undefined, sizeConfig);
      expect(status.active).to.equal(false);
      expect(status.mediaTypes).to.deep.equal({
        banner: {
          sizes: []
        },
        native: {
          type: 'image'
        }
      });
    });

    it('if a mediaQuery matches and no sizesSupported specified, it should not affect adUnit.sizes', function () {
      matchMediaOverride = (str) => str === '(min-width: 1200px)' ? {matches: true} : {matches: false};

      let status = resolveStatus(undefined, testSizes, undefined, sizeConfigWithLabels);
      expect(status.active).to.equal(true);
      expect(status.mediaTypes).to.deep.equal(testSizes);
    });
  });

  describe('when handling labels', function () {
    it('should activate/deactivate adUnits/bidders based on sizeConfig.labels', function () {
      matchMediaOverride = (str) => str === '(min-width: 1200px)' ? {matches: true} : {matches: false};

      let status = resolveStatus({
        labels: ['desktop']
      }, testSizes, undefined, sizeConfigWithLabels);

      expect(status).to.deep.equal({
        active: true,
        mediaTypes: testSizes
      });

      status = resolveStatus({
        labels: ['tablet']
      }, testSizes, undefined, sizeConfigWithLabels);

      expect(status.active).to.equal(false);
      expect(status.mediaTypes).to.deep.equal(testSizes);
    });

    it('should activate/decactivate adUnits/bidders based on labels with multiformat ads', function () {
      matchMediaOverride = (str) => str === '(min-width: 768px) and (max-width: 1199px)' ? {matches: true} : {matches: false};

      let multiFormatSizes = {
        banner: {
          sizes: [[728, 90], [300, 300]]
        },
        native: {
          type: 'image'
        },
        video: {
          context: 'outstream',
          playerSize: [300, 300]
        }
      };

      let status = resolveStatus({
        labels: ['tablet', 'test'],
        labelAll: true
      }, multiFormatSizes, undefined, sizeConfigWithLabels);

      expect(status.active).to.equal(false);
      expect(status.mediaTypes).to.deep.equal({
        banner: {
          sizes: [[728, 90]]
        },
        native: {
          type: 'image'
        },
        video: {
          context: 'outstream',
          playerSize: [300, 300]
        }
      });

      status = resolveStatus({
        labels: ['tablet']
      }, multiFormatSizes, undefined, sizeConfigWithLabels);

      expect(status.active).to.equal(true);
      expect(status.mediaTypes).to.deep.equal({
        banner: {
          sizes: [[728, 90]]
        },
        native: {
          type: 'image'
        },
        video: {
          context: 'outstream',
          playerSize: [300, 300]
        }
      });

      multiFormatSizes.banner.sizes.splice(0, 1, [728, 80]);
      status = resolveStatus({
        labels: ['tablet']
      }, multiFormatSizes, undefined, sizeConfigWithLabels);

      expect(status.active).to.equal(false);
      expect(status.mediaTypes).to.deep.equal({
        banner: {
          sizes: []
        },
        native: {
          type: 'image'
        },
        video: {
          context: 'outstream',
          playerSize: [300, 300]
        }
      });

      delete multiFormatSizes.banner;
      status = resolveStatus({
        labels: ['tablet']
      }, multiFormatSizes, undefined, sizeConfigWithLabels);

      expect(status.active).to.equal(true);
      expect(status.mediaTypes).to.deep.equal({
        native: {
          type: 'image'
        },
        video: {
          context: 'outstream',
          playerSize: [300, 300]
        }
      });
    });

    it('should active/deactivate adUnits/bidders based on requestBids labels', function () {
      let activeLabels = ['us-visitor', 'desktop', 'smart'];

      let status = resolveStatus({
        labels: ['uk-visitor'], // from adunit
        activeLabels // from requestBids.labels
      }, testSizes, undefined, sizeConfigWithLabels);

      expect(status.active).to.equal(false);
      expect(status.mediaTypes).to.deep.equal(testSizes);

      status = resolveStatus({
        labels: ['us-visitor'],
        activeLabels
      }, testSizes, undefined, sizeConfigWithLabels);

      expect(status.active).to.equal(true);
      expect(status.mediaTypes).to.deep.equal(testSizes);

      status = resolveStatus({
        labels: ['us-visitor', 'tablet'],
        labelAll: true,
        activeLabels
      }, testSizes, undefined, sizeConfigWithLabels);

      expect(status.active).to.equal(false);
      expect(status.mediaTypes).to.deep.equal(testSizes);

      status = resolveStatus({
        labels: ['us-visitor', 'desktop'],
        labelAll: true,
        activeLabels
      }, testSizes, undefined, sizeConfigWithLabels);

      expect(status.active).to.equal(true);
      expect(status.mediaTypes).to.deep.equal(testSizes);
    });
  });
});
