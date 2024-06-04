import {config} from '../src/config.js';
import {deepAccess, deepClone, deepSetValue, getWindowTop, logInfo, logWarn} from '../src/utils.js';
import {includes} from '../src/polyfill.js';
import {BANNER, VIDEO} from '../src/mediaTypes.js';
import {setupAdUnitMediaTypes} from '../src/adapterManager.js';

let installed = false;
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
  if (!installed) {
    setupAdUnitMediaTypes.before((next, adUnit, labels) => next(processAdUnitsForLabels(adUnit, labels), labels));
    installed = true;
  }
}
config.getConfig('sizeConfig', config => setSizeConfig(config.sizeConfig));

/**
 * Returns object describing the status of labels on the adUnit or bidder along with labels passed into requestBids
 * @param bidOrAdUnit the bidder or adUnit to get label info on
 * @param activeLabels the labels passed to requestBids
 * @returns {object}
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

const SIZE_PROPS = {
  [BANNER]: 'banner.sizes'
}
if (FEATURES.VIDEO) {
  SIZE_PROPS[VIDEO] = 'video.playerSize'
}

/**
 * Resolves the unique set of the union of all sizes and labels that are active from a SizeConfig.mediaQuery match.
 *
 * @param {Object} options - The options object.
 * @param {Array<string>} [options.labels=[]] - Labels specified on adUnit or bidder.
 * @param {boolean} [options.labelAll=false] - If true, all labels must match to be enabled.
 * @param {Array<string>} [options.activeLabels=[]] - Labels passed in through requestBids.
 * @param {Object} mediaTypes - A mediaTypes object describing the various media types (banner, video, native).
 * @param {Array<SizeConfig>} configs - An array of SizeConfig objects.
 * @returns {Object} - An object containing the active status, media types, and filter results.
 * @returns {boolean} return.active - Whether the media types are active.
 * @returns {Object} return.mediaTypes - The media types object.
 * @returns {Object} [return.filterResults] - The filter results before and after applying size filtering.
 */
export function resolveStatus({labels = [], labelAll = false, activeLabels = []} = {}, mediaTypes, configs = sizeConfig) {
  let maps = evaluateSizeConfig(configs);

  let filtered = false;
  let hasSize = false;
  const filterResults = {before: {}, after: {}};

  if (maps.shouldFilter) {
    Object.entries(SIZE_PROPS).forEach(([mediaType, sizeProp]) => {
      const oldSizes = deepAccess(mediaTypes, sizeProp);
      if (oldSizes) {
        if (!filtered) {
          mediaTypes = deepClone(mediaTypes);
          filtered = true;
        }
        const newSizes = oldSizes.filter(size => maps.sizesSupported[size]);
        deepSetValue(mediaTypes, sizeProp, newSizes);
        hasSize = hasSize || newSizes.length > 0;
        if (oldSizes.length !== newSizes.length) {
          filterResults.before[mediaType] = oldSizes;
          filterResults.after[mediaType] = newSizes
        }
      }
    })
  } else {
    hasSize = Object.values(SIZE_PROPS).find(prop => deepAccess(mediaTypes, prop)?.length) != null
  }

  let results = {
    active: (
      !Object.keys(SIZE_PROPS).find(mediaType => mediaTypes.hasOwnProperty(mediaType))
    ) || (
      hasSize && (
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

  if (Object.keys(filterResults.before).length > 0) {
    results.filterResults = filterResults;
  }
  return results;
}

function evaluateSizeConfig(configs) {
  return configs.reduce((results, config) => {
    if (
      typeof config === 'object' &&
      typeof config.mediaQuery === 'string' &&
      config.mediaQuery.length > 0
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

export function processAdUnitsForLabels(adUnits, activeLabels) {
  return adUnits.reduce((adUnits, adUnit) => {
    let {
      active,
      mediaTypes,
      filterResults
    } = resolveStatus(
      getLabels(adUnit, activeLabels),
      adUnit.mediaTypes,
    );

    if (!active) {
      logInfo(`Size mapping disabled adUnit "${adUnit.code}"`);
    } else {
      if (filterResults) {
        logInfo(`Size mapping filtered adUnit "${adUnit.code}" sizes from `, filterResults.before, 'to ', filterResults.after);
      }

      adUnit.mediaTypes = mediaTypes;

      adUnit.bids = adUnit.bids.reduce((bids, bid) => {
        let {
          active,
          mediaTypes,
          filterResults
        } = resolveStatus(getLabels(bid, activeLabels), adUnit.mediaTypes);

        if (!active) {
          logInfo(`Size mapping deactivated adUnit "${adUnit.code}" bidder "${bid.bidder}"`);
        } else {
          if (filterResults) {
            logInfo(`Size mapping filtered adUnit "${adUnit.code}" bidder "${bid.bidder}" sizes from `, filterResults.before, 'to ', filterResults.after);
            bid.mediaTypes = mediaTypes;
          }
          bids.push(bid);
        }
        return bids;
      }, []);
      adUnits.push(adUnit);
    }
    return adUnits;
  }, []);
}
