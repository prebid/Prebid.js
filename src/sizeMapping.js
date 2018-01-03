import { config } from 'src/config';
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
 * Resolves the unique set of the union of all sizes and labels that are active from a SizeConfig.mediaQuery match
 * @param {Array<string>} labels Labels specified on adUnit or bidder
 * @param {boolean} labelAll if true, all labels must match to be enabled
 * @param {Array<string>} activeLabels Labels passed in through requestBids
 * @param {Array<Array<number>>} sizes Sizes specified on adUnit
 * @param {Array<SizeConfig>} configs
 * @returns {{labels: Array<string>, sizes: Array<Array<number>>}}
 */
export function resolveStatus({labels = [], labelAll = false, activeLabels = []} = {}, sizes = [], configs = sizeConfig) {
  let maps = evaluateSizeConfig(configs);

  let filteredSizes;
  if (maps.shouldFilter) {
    filteredSizes = sizes.filter(size => maps.sizesSupported[size]);
  } else {
    filteredSizes = sizes;
  }

  return {
    active: filteredSizes.length > 0 && (
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
    ),
    sizes: filteredSizes
  };
}

function evaluateSizeConfig(configs) {
  return configs.reduce((results, config) => {
    if (
      typeof config === 'object' &&
      typeof config.mediaQuery === 'string' &&
      matchMedia(config.mediaQuery).matches
    ) {
      if (Array.isArray(config.sizesSupported)) {
        results.shouldFilter = true;
      }
      ['labels', 'sizesSupported'].forEach(
        type => (config[type] || []).forEach(
          thing => results[type][thing] = true
        )
      );
    }
    return results;
  }, {
    labels: {},
    sizesSupported: {},
    shouldFilter: false
  });
}
