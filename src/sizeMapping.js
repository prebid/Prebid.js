import { config } from 'src/config';

let configuredLabels = [];
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
 * @param {Array<string>} labels
 */
export function setLabels(labels) {
  configuredLabels = labels;
}
config.getConfig('labels', config => setLabels(config.labels));

/**
 *
 * @param {Array<SizeConfig>} config
 */
export function setSizeConfig(config) {
  sizeConfig = config;
}
config.getConfig('sizeConfig', config => setSizeConfig(config.sizeConfig));

/**
 * This function will return all relevant sizes when resolving the labels passed in vs active labels (active labels
 * being either those enabled manually or specified and enabled by matchMedia queries)
 *
 * @param {Array} labels The set of labels
 * @param {Array<Array>} initialSizes starting set of sizes
 * @returns {Array<Array>} filtered set of sizes after resolving passed in labels against active labels
 */
export function resolveSizesFromLabels(labels, initialSizes = []) {
  if (!Array.isArray(labels)) {
    return initialSizes;
  }
  let hasMatch = false;
  let filteredSizes = configuredLabels
    .map(label => ({
      sizesSupported: initialSizes, // configured labels support all sizes that are passed in by default
      labels: [label]
    }))
    .concat(sizeConfig)
    .reduce((sizes, config) => {
      // does this sizeMapping config match passed-in labels?
      if (Array.isArray(config.labels) && labels.some(label => config.labels.includes(label))) {
        if (typeof config.mediaQuery !== 'string') {
          hasMatch = true;
        } else {
          // if no mediaQuery criteria or if matchMedia matches, filter sizes with sizesSupported
          if (matchMedia(config.mediaQuery).matches) {
            hasMatch = true;
            sizes = sizes.filter(
              size => (config.sizesSupported || initialSizes)
                .map(size => size.toString())
                .includes(size.toString())
            );
          }
        }
      }

      return sizes;
    }, initialSizes);

  // if none of the labels match, return no sizes to disable bidder; otherwise return supported sizes
  return hasMatch ? filteredSizes : [];
}
