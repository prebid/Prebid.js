import { config } from './config';
import {logWarn, isPlainObject, deepAccess, deepClone, getWindowTop} from './utils';
import includes from 'core-js/library/fn/array/includes';

let sizeConfig = [];

/**
 * @typedef {object} SizeConfig
 *
 * @property {string} [mediaQuery] A CSS media query string that will to be interpreted by window.matchMedia.  If the
 *  media query matches then the this config will be active and sizesSupported will filter bid and adUnit sizes.  If
 *  this property is not present then this SizeConfig will only be active if triggered manually by a call to
 *  pbjs.setConfig({labels:['label']) specifying one of the labels present on this SizeConfig.
 * @property {Array<Array>} sizesSupported The sizes to be accepted if this SizeConfig is enabled.
 * @property {Array<string>} labels The active labels to match this SizeConfig to an adUnits and/or bidders.
 */

/**
 *
 * @param {Array<SizeConfig>} config
 */
export function setSizeConfig(config) {
  sizeConfig = config;
}
config.getConfig('sizeConfig', config => setSizeConfig(config.sizeConfig));

/**
 * Returns object describing the status of labels on the adUnit or bidder along with labels passed into requestBids
 * @param bidOrAdUnit the bidder or adUnit to get label info on
 * @param activeLabels the labels passed to requestBids
 * @returns {LabelDescriptor}
 */
export function getLabels(bidOrAdUnit, activeLabels) {
  if (bidOrAdUnit.labelAll) {
    return {labelAll: true, labels: bidOrAdUnit.labelAll, activeLabels};
  }
  return {labelAll: false, labels: bidOrAdUnit.labelAny, activeLabels};
}

/**
 * Determines whether a single size is valid given configured sizes
 * @param {Array} size [width, height]
 * @param {Array<SizeConfig>} configs
 * @returns {boolean}
 */
export function sizeSupported(size, configs = sizeConfig) {
  let maps = evaluateSizeConfig(configs);
  if (!maps.shouldFilter) {
    return true;
  }
  return !!maps.sizesSupported[size];
}

/**
 * Resolves the unique set of the union of all sizes and labels that are active from a SizeConfig.mediaQuery match
 * @param {Array<string>} labels Labels specified on adUnit or bidder
 * @param {boolean} labelAll if true, all labels must match to be enabled
 * @param {Array<string>} activeLabels Labels passed in through requestBids
 * @param {object} mediaTypes A mediaTypes object describing the various media types (banner, video, native)
 * @param {Array<Array<number>>} sizes Sizes specified on adUnit (deprecated)
 * @param {Array<SizeConfig>} configs
 * @returns {{labels: Array<string>, sizes: Array<Array<number>>}}
 */
export function resolveStatus({labels = [], labelAll = false, activeLabels = []} = {}, mediaTypes, sizes, configs = sizeConfig) {
  let maps = evaluateSizeConfig(configs);

  if (!isPlainObject(mediaTypes)) {
    // add support for deprecated adUnit.sizes by creating correct banner mediaTypes if they don't already exist
    if (sizes) {
      mediaTypes = {
        banner: {
          sizes
        }
      };
    } else {
      mediaTypes = {};
    }
  } else {
    mediaTypes = deepClone(mediaTypes);
  }

  let oldSizes = deepAccess(mediaTypes, 'banner.sizes');
  if (maps.shouldFilter && oldSizes) {
    mediaTypes.banner.sizes = oldSizes.filter(size => maps.sizesSupported[size]);
  }

  let allMediaTypes = Object.keys(mediaTypes);

  let results = {
    active: (
      allMediaTypes.every(type => type !== 'banner')
    ) || (
      allMediaTypes.some(type => type === 'banner') && deepAccess(mediaTypes, 'banner.sizes.length') > 0 && (
        labels.length === 0 || (
          (!labelAll && (
            labels.some(label => maps.labels[label]) ||
            labels.some(label => includes(activeLabels, label))
          )) ||
          (labelAll && (
            labels.reduce((result, label) => !result ? result : (
              maps.labels[label] || includes(activeLabels, label)
            ), true)
          ))
        )
      )
    ),
    mediaTypes
  };

  if (oldSizes && oldSizes.length !== mediaTypes.banner.sizes.length) {
    results.filterResults = {
      before: oldSizes,
      after: mediaTypes.banner.sizes
    }
  }

  return results;
}

function evaluateSizeConfig(configs) {
  return configs.reduce((results, config) => {
    if (
      typeof config === 'object' &&
      typeof config.mediaQuery === 'string'
    ) {
      let ruleMatch = false;

      try {
        ruleMatch = getWindowTop().matchMedia(config.mediaQuery).matches;
      } catch (e) {
        logWarn('Unfriendly iFrame blocks sizeConfig from being correctly evaluated');

        ruleMatch = matchMedia(config.mediaQuery).matches;
      }

      if (ruleMatch) {
        if (Array.isArray(config.sizesSupported)) {
          results.shouldFilter = true;
        }
        ['labels', 'sizesSupported'].forEach(
          type => (config[type] || []).forEach(
            thing => results[type][thing] = true
          )
        );
      }
    } else {
      logWarn('sizeConfig rule missing required property "mediaQuery"');
    }
    return results;
  }, {
    labels: {},
    sizesSupported: {},
    shouldFilter: false
  });
}
