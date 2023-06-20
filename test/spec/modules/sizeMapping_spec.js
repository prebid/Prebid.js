import {expect} from 'chai';
import {resolveStatus, setSizeConfig, sizeSupported} from 'modules/sizeMapping.js';
import {includes} from 'src/polyfill.js';

let utils = require('src/utils.js');
let deepClone = utils.deepClone;

describe('sizeMapping', function () {
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

  describe('sizeConfig', () => {
    it('should allow us to validate a single size', function () {
      matchMediaOverride = (str) => str === '(min-width: 1200px)' ? {matches: true} : {matches: false};

      expect(sizeSupported([300, 250])).to.equal(true);
      expect(sizeSupported([80, 80])).to.equal(false);
    });

    it('should log a warning when mediaQuery property missing from sizeConfig', function () {
      let errorConfig = deepClone(sizeConfig);

      delete errorConfig[0].mediaQuery;

      sandbox.stub(utils, 'logWarn');

      resolveStatus(undefined, {}, errorConfig);
      expect(utils.logWarn.firstCall.args[0]).to.match(/missing.+?mediaQuery/);
    });

    it('should log a warning message when mediaQuery property is declared as an empty string', function () {
      const errorConfig = deepClone(sizeConfig);
      errorConfig[0].mediaQuery = '';

      sandbox.stub(utils, 'logWarn');
      resolveStatus(undefined, {}, errorConfig);
      expect(utils.logWarn.firstCall.args[0]).to.match(/missing.+?mediaQuery/);
    });
  });

  const TEST_SIZES = [[970, 90], [728, 90], [300, 250], [300, 100], [80, 80]];

  const suites = {
    banner: {
      mediaTypes: {
        banner: {
          sizes: TEST_SIZES
        }
      },
      getSizes(mediaTypes) {
        return mediaTypes.banner.sizes;
      },
    }
  }
  if (FEATURES.VIDEO) {
    suites.video = {
      mediaTypes: {
        video: {
          playerSize: TEST_SIZES
        }
      },
      getSizes(mediaTypes) {
        return mediaTypes.video.playerSize;
      }
    }
  }
  Object.entries(suites).forEach(([mediaType, {mediaTypes, getSizes}]) => {
    describe(`for ${mediaType}`, () => {
      describe('when handling sizes', function () {
        it('when one mediaQuery block matches, it should filter the adUnit.sizes passed in', function () {
          matchMediaOverride = (str) => str === '(min-width: 1200px)' ? {matches: true} : {matches: false};

          let status = resolveStatus(undefined, mediaTypes, sizeConfig);

          expect(status.active).to.equal(true);
          expect(getSizes(status.mediaTypes)).to.deep.equal(
            [[970, 90], [728, 90], [300, 250]]
          );
        });

        it('when multiple mediaQuery block matches, it should filter a union of the matched sizesSupported', function () {
          matchMediaOverride = (str) => includes([
            '(min-width: 1200px)',
            '(min-width: 768px) and (max-width: 1199px)'
          ], str) ? {matches: true} : {matches: false};

          let status = resolveStatus(undefined, mediaTypes, sizeConfig);
          expect(status.active).to.equal(true);
          expect(getSizes(status.mediaTypes)).to.deep.equal(
            [[970, 90], [728, 90], [300, 250], [300, 100]]
          );
        });

        it('if no mediaQueries match, it should allow all sizes specified', function () {
          matchMediaOverride = () => ({matches: false});

          let status = resolveStatus(undefined, mediaTypes, sizeConfig);
          expect(status.active).to.equal(true);
          expect(status.mediaTypes).to.deep.equal(mediaTypes);
        });

        it('if a mediaQuery matches and has sizesSupported: [], it should filter all sizes', function () {
          matchMediaOverride = (str) => str === '(min-width: 0px) and (max-width: 767px)' ? {matches: true} : {matches: false};

          let status = resolveStatus(undefined, mediaTypes, sizeConfig);
          expect(status.active).to.equal(false);
          expect(getSizes(status.mediaTypes)).to.deep.equal([]);
        });

        it('should filter all banner sizes and should disable the adUnit even if other mediaTypes are present', function () {
          matchMediaOverride = (str) => str === '(min-width: 0px) and (max-width: 767px)' ? {matches: true} : {matches: false};
          let status = resolveStatus(undefined, Object.assign({}, mediaTypes, {
            native: {
              type: 'image'
            }
          }), sizeConfig);
          expect(status.active).to.equal(false);
          expect(getSizes(status.mediaTypes)).to.deep.equal([]);
          expect(status.mediaTypes.native).to.deep.equal({
            type: 'image'
          });
        });

        it('if a mediaQuery matches and no sizesSupported specified, it should not affect adUnit.sizes', function () {
          matchMediaOverride = (str) => str === '(min-width: 1200px)' ? {matches: true} : {matches: false};

          let status = resolveStatus(undefined, mediaTypes, sizeConfigWithLabels);
          expect(status.active).to.equal(true);
          expect(status.mediaTypes).to.deep.equal(mediaTypes);
        });
      });

      describe('when handling labels', function () {
        it('should activate/deactivate adUnits/bidders based on sizeConfig.labels', function () {
          matchMediaOverride = (str) => str === '(min-width: 1200px)' ? {matches: true} : {matches: false};

          let status = resolveStatus({
            labels: ['desktop']
          }, mediaTypes, sizeConfigWithLabels);

          expect(status).to.deep.equal({
            active: true,
            mediaTypes: mediaTypes
          });

          status = resolveStatus({
            labels: ['tablet']
          }, mediaTypes, sizeConfigWithLabels);

          expect(status.active).to.equal(false);
          expect(status.mediaTypes).to.deep.equal(mediaTypes);
        });

        it('should active/deactivate adUnits/bidders based on requestBids labels', function () {
          let activeLabels = ['us-visitor', 'desktop', 'smart'];

          let status = resolveStatus({
            labels: ['uk-visitor'], // from adunit
            activeLabels // from requestBids.labels
          }, mediaTypes, sizeConfigWithLabels);

          expect(status.active).to.equal(false);
          expect(status.mediaTypes).to.deep.equal(mediaTypes);

          status = resolveStatus({
            labels: ['us-visitor'],
            activeLabels
          }, mediaTypes, sizeConfigWithLabels);

          expect(status.active).to.equal(true);
          expect(status.mediaTypes).to.deep.equal(mediaTypes);

          status = resolveStatus({
            labels: ['us-visitor', 'tablet'],
            labelAll: true,
            activeLabels
          }, mediaTypes, sizeConfigWithLabels);

          expect(status.active).to.equal(false);
          expect(status.mediaTypes).to.deep.equal(mediaTypes);

          status = resolveStatus({
            labels: ['us-visitor', 'desktop'],
            labelAll: true,
            activeLabels
          }, mediaTypes, undefined, sizeConfigWithLabels);

          expect(status.active).to.equal(true);
          expect(status.mediaTypes).to.deep.equal(mediaTypes);
        });
      });
    });
  });

  if (FEATURES.VIDEO) {
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
          playerSize: [[728, 90], [300, 300]]
        }
      };

      let status = resolveStatus({
        labels: ['tablet', 'test'],
        labelAll: true
      }, multiFormatSizes, sizeConfigWithLabels);

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
          playerSize: [[728, 90]]
        }
      });

      status = resolveStatus({
        labels: ['tablet']
      }, multiFormatSizes, sizeConfigWithLabels);

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
          playerSize: [[728, 90]]
        }
      });

      [multiFormatSizes.banner.sizes, multiFormatSizes.video.playerSize].forEach(sz => sz.splice(0, 1, [728, 80]))
      status = resolveStatus({
        labels: ['tablet']
      }, multiFormatSizes, sizeConfigWithLabels);

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
          playerSize: []
        }
      });

      delete multiFormatSizes.banner;
      delete multiFormatSizes.video;

      status = resolveStatus({
        labels: ['tablet']
      }, multiFormatSizes, sizeConfigWithLabels);

      expect(status.active).to.equal(true);
      expect(status.mediaTypes).to.deep.equal({
        native: {
          type: 'image'
        }
      });
    });
  }
});
