/**
 * This modules adds support for the new Size Mapping spec described here. https://github.com/prebid/Prebid.js/issues/4129
 * This implementation replaces global sizeConfig with a adUnit/bidder level sizeConfig with support for labels.
 */

import {
  flatten,
  deepClone,
  deepAccess,
  getDefinedParams,
  getUniqueIdentifierStr,
  logInfo,
  logError,
  logWarn,
  isValidMediaTypes,
  isArrayOfNums
} from '../src/utils';
import { processNativeAdUnitParams } from '../src/native';
import { adunitCounter } from '../src/adUnits';
import includes from 'core-js/library/fn/array/includes';
import { getHook } from '../src/hook';
import {
  adUnitSetupChecks
} from '../src/prebid';

// Maps auctionId to a boolean value, value is set to true if Adunits are setup to use the new size mapping, else it's set to false.
const _sizeMappingUsageMap = {};

// returns "true" if atleast one of the adUnit in the adUnits array has declared a Ad Unit or(and) Bid level sizeConfig
// returns "false" otherwise
export function isUsingNewSizeMapping(adUnits) {
  let isUsingSizeMappingBool = false;
  adUnits.forEach(adUnit => {
    if (adUnit.mediaTypes) {
      // checks for the presence of sizeConfig property at the adUnit.mediaTypes object
      Object.keys(adUnit.mediaTypes).forEach(mediaType => {
        if (adUnit.mediaTypes[mediaType].sizeConfig) {
          if (isUsingSizeMappingBool === false) {
            isUsingSizeMappingBool = true;
          }
        }
      });

      // checks for the presence of sizeConfig property at the adUnit.bids[].bidder object
      adUnit.bids.forEach(bidder => {
        if (bidder.sizeConfig) {
          if (isUsingSizeMappingBool === false) {
            isUsingSizeMappingBool = true;
          }
        }
      });
    }
  });
  return isUsingSizeMappingBool;
}

// returns "adUnits" array which have passed sizeConfig validation checks in addition to mediaTypes checks
// deletes properties from adUnit which fail validation.
export function checkAdUnitSetupHook(adUnits) {
  return adUnits.filter(adUnit => {
    const mediaTypes = adUnit.mediaTypes;
    if (!mediaTypes || Object.keys(mediaTypes).length === 0) {
      logError(`Detected adUnit.code '${adUnit.code}' did not have a 'mediaTypes' object defined. This is a required field for the auction, so this adUnit has been removed.`);
      return false;
    }

    if (mediaTypes.banner) {
      const banner = mediaTypes.banner;
      if (banner.sizes) {
        adUnit = adUnitSetupChecks.validateBannerMediaType(adUnit);
      } else if (banner.sizeConfig) {
        if (Array.isArray(banner.sizeConfig)) {
          let deleteBannerMediaType = false;
          banner.sizeConfig.forEach((config, index) => {
            // verify if all config objects include "minViewPort" and "sizes" property.
            // if not, remove the mediaTypes.banner object
            const keys = Object.keys(config);
            if (!(includes(keys, 'minViewPort') && includes(keys, 'sizes'))) {
              logError(`Ad Unit: ${adUnit.code}: mediaTypes.banner.sizeConfig[${index}] is missing required property minViewPort or sizes or both.`);
              deleteBannerMediaType = true;
              return;
            }

            // check if the config.sizes property is in [w, h] format, if yes, change it to [[w, h]] format.
            const bannerSizes = adUnitSetupChecks.validateSizes(config.sizes);
            if (isArrayOfNums(config.minViewPort, 2)) {
              if (config.sizes.length > 0 && bannerSizes.length > 0) {
                config.sizes = bannerSizes;
              } else if (config.sizes.length === 0) {
                // If a size bucket doesn't have any sizes, sizes is an empty array, i.e. sizes: []. This check takes care of that.
                config.sizes = [config.sizes];
              } else {
                logError(`Ad Unit: ${adUnit.code}: mediaTypes.banner.sizeConfig[${index}] has propery sizes declared with invalid value. Please ensure the sizes are listed like: [[300, 250], ...] or like: [] if no sizes are present for that size bucket.`);
                deleteBannerMediaType = true;
              }
            } else {
              logError(`Ad Unit: ${adUnit.code}: mediaTypes.banner.sizeConfig[${index}] has property minViewPort decalared with invalid value. Please ensure minViewPort is an Array and is listed like: [700, 0]. Declaring an empty array is not allowed, instead use: [0, 0].`);
              deleteBannerMediaType = true;
            }
          });
          if (deleteBannerMediaType) {
            logInfo(`Ad Unit: ${adUnit.code}: mediaTypes.banner has been removed due to error in sizeConfig.`);
            delete adUnit.mediaTypes.banner;
          }
        } else {
          logError(`Ad Unit: ${adUnit.code}: mediaTypes.banner.sizeConfig is NOT an Array. Removing the invalid object mediaTypes.banner from Ad Unit.`);
          delete adUnit.mediaTypes.banner;
        }
      } else {
        logError('Detected a mediaTypes.banner object did not include required property sizes or sizeConfig. Removing invalid mediaTypes.banner object from Ad Unit.');
        delete adUnit.mediaTypes.banner;
      }
    }

    if (mediaTypes.video) {
      const video = mediaTypes.video;
      if (video.playerSize) {
        adUnit = adUnitSetupChecks.validateVideoMediaType(adUnit);
      } else if (video.sizeConfig) {
        if (Array.isArray(video.sizeConfig)) {
          let deleteVideoMediaType = false;
          video.sizeConfig.forEach((config, index) => {
            // verify if all config objects include "minViewPort" and "playerSize" property.
            // if not, remove the mediaTypes.video object
            const keys = Object.keys(config);
            if (!(includes(keys, 'minViewPort') && includes(keys, 'playerSize'))) {
              logError(`Ad Unit: ${adUnit.code}: mediaTypes.video.sizeConfig[${index}] is missing required property minViewPort or playerSize or both. Removing the invalid property mediaTypes.video.sizeConfig from Ad Unit.`);
              deleteVideoMediaType = true;
              return;
            }
            // check if the config.playerSize property is in [w, h] format, if yes, change it to [[w, h]] format.
            let tarPlayerSizeLen = (typeof config.playerSize[0] === 'number') ? 2 : 1;
            const videoSizes = adUnitSetupChecks.validateSizes(config.playerSize, tarPlayerSizeLen);
            if (isArrayOfNums(config.minViewPort, 2)) {
              if (tarPlayerSizeLen === 2) {
                logInfo('Transforming video.playerSize from [640,480] to [[640,480]] so it\'s in the proper format.');
              }
              if (config.playerSize.length > 0 && videoSizes.length > 0) {
                config.playerSize = videoSizes;
              } else if (config.playerSize.length === 0) {
                // If a size bucket doesn't have any playerSize, playerSize is an empty array, i.e. playerSize: []. This check takes care of that.
                config.playerSize = [config.playerSize];
              } else {
                logError(`Ad Unit: ${adUnit.code}: mediaTypes.video.sizeConfig[${index}] has propery playerSize declared with invalid value. Please ensure the playerSize is listed like: [640, 480] or like: [] if no playerSize is present for that size bucket.`);
              }
            } else {
              logError(`Ad Unit: ${adUnit.code}: mediaTypes.video.sizeConfig[${index}] has property minViewPort decalared with invalid value. Please ensure minViewPort is an Array and is listed like: [700, 0]. Declaring an empty array is not allowed, instead use: [0, 0].`);
              deleteVideoMediaType = true;
            }
          });
          if (deleteVideoMediaType) {
            logInfo(`Ad Unit: ${adUnit.code}: mediaTypes.video.sizeConfig has been removed due to error in sizeConfig.`);
            delete adUnit.mediaTypes.video.sizeConfig;
          }
        } else {
          logError(`Ad Unit: ${adUnit.code}: mediaTypes.video.sizeConfig is NOT an Array. Removing the invalid property mediaTypes.video.sizeConfig from Ad Unit.`);
          return delete adUnit.mediaTypes.video.sizeConfig;
        }
      }
    }

    if (mediaTypes.native) {
      const native = mediaTypes.native;
      adUnit = adUnitSetupChecks.validateNativeMediaType(adUnit);

      if (mediaTypes.native.sizeConfig) {
        native.sizeConfig.forEach(config => {
          // verify if all config objects include "minViewPort" and "active" property.
          // if not, remove the mediaTypes.native object
          const keys = Object.keys(config);
          if (!(includes(keys, 'minViewPort') && includes(keys, 'active'))) {
            logError(`Ad Unit: ${adUnit.code}: mediaTypes.native.sizeConfig is missing required property minViewPort or active or both. Removing the invalid property mediaTypes.native.sizeConfig from Ad Unit.`);
            return delete adUnit.mediaTypes.native.sizeConfig;
          }

          if (!(isArrayOfNums(config.minViewPort, 2) && typeof config.active === 'boolean')) {
            logError(`Ad Unit: ${adUnit.code}: mediaTypes.native.sizeConfig has properties minViewPort or active decalared with invalid values. Removing the invalid property mediaTypes.native.sizeConfig from Ad Unit.`);
            return delete adUnit.mediaTypes.native.sizeConfig;
          }
        });
      }
    }

    return true;
  });
}

getHook('checkAdUnitSetup').before(function (fn, adUnits) {
  const usingNewSizeMapping = isUsingNewSizeMapping(adUnits);
  if (usingNewSizeMapping) {
    // if adUnits are found using the sizeMappingV2 spec, we run additional checks on them for checking the validity of sizeConfig object
    // in addition to running the base checks on the mediaType object and return the adUnit without calling the base function.
    adUnits = checkAdUnitSetupHook(adUnits);
    return fn.bail(adUnits);
  } else {
    // if presence of sizeMappingV2 spec is not detected on adUnits, we default back to the original checks defined in the base function.
    return fn.call(this, adUnits);
  }
});

function checkBidderSizeConfigFormat(sizeConfig) {
  let didCheckPass = true;
  if (Array.isArray(sizeConfig)) {
    sizeConfig.forEach(config => {
      const keys = Object.keys(config);
      if ((includes(keys, 'minViewPort') &&
        includes(keys, 'relevantMediaTypes')) &&
        isArrayOfNums(config.minViewPort, 2) &&
        Array.isArray(config.relevantMediaTypes) &&
        config.relevantMediaTypes.every(mt => (includes(['banner', 'video', 'native'], mt)) || (mt === 'none'))) {
        didCheckPass = didCheckPass && true;
      } else {
        didCheckPass = false;
      }
    });
  }
  return didCheckPass;
}

getHook('getBids').before(function (fn, bidderInfo) {
  // check if the adUnit is using sizeMappingV2 specs and store the result in _sizeMappingUsageMap.
  if (typeof _sizeMappingUsageMap[bidderInfo.auctionId] === 'undefined') {
    const isUsingSizeMappingBool = isUsingNewSizeMapping(bidderInfo.adUnits);

    // populate _sizeMappingUsageMap for the first time for a particular auction
    _sizeMappingUsageMap[bidderInfo.auctionId] = isUsingSizeMappingBool;
  }
  if (_sizeMappingUsageMap[bidderInfo.auctionId]) {
    // if adUnit is found using sizeMappingV2 specs, run the getBids function which processes the sizeConfig object
    // and returns the bids array for a particular bidder.
    const bids = getBids(bidderInfo);
    return fn.bail(bids);
  } else {
    // if not using sizeMappingV2, default back to the getBids function defined in adapterManager.
    return fn.call(this, bidderInfo);
  }
});

/**
 * Given an Ad Unit or a Bid as an input, returns a boolean telling if the Ad Unit/ Bid is active based on label checks
 * @param {Object<BidOrAdUnit>} bidOrAdUnit Either the Ad Unit object or the Bid object
 * @param {Array<string>} activeLabels List of active labels passed as an argument to pbjs.requestBids function
 * @param {string} adUnitCode Unique string identifier for an Ad Unit.
 * @returns {boolean} Represents if the Ad Unit or the Bid is active or not
 */
function isLabelActivated(bidOrAdUnit, activeLabels, adUnitCode) {
  let labelOperator;
  const labelsFound = Object.keys(bidOrAdUnit).filter(prop => prop === 'labelAny' || prop === 'labelAll');
  if (labelsFound && labelsFound.length > 1) {
    logWarn(`SizeMappingV2:: ${(bidOrAdUnit.code)
      ? (`Ad Unit: ${bidOrAdUnit.code} has multiple label operators. Using the first declared operator: ${labelsFound[0]}`)
      : (`Bidder: ${bidOrAdUnit.bidder} in Ad Unit: ${adUnitCode} has multiple label operators. Using the first declared operator: ${labelsFound[0]}`)}`);
  }
  labelOperator = labelsFound[0];

  if (labelOperator === 'labelAll') {
    if (bidOrAdUnit.labelAll.length === 0) {
      logWarn(`SizeMappingV2:: Ad Unit: ${bidOrAdUnit.code} has declared property labelAll with an empty array. Ad Unit is still enabled!`);
      return true;
    }
    return bidOrAdUnit.labelAll.every(label => includes(activeLabels, label));
  } else if (labelOperator === 'labelAny') {
    if (bidOrAdUnit.labelAny.length === 0) {
      logWarn(`SizeMappingV2:: Ad Unit: ${bidOrAdUnit.code} has declared property labelAny with an empty array. Ad Unit is still enabled!`);
      return true;
    }
    return bidOrAdUnit.labelAny.some(label => includes(activeLabels, label));
  }
  return true;
}

/**
 * Processes the MediaTypes object and calculates the active size buckets for each Media Type. Uses `window.innerWidth` and `window.innerHeight`
 * to calculate the width and height of the active Viewport.
 * @param {MediaTypes} mediaTypes Contains information about supported media types for an Ad Unit and size information for each of those types
 * @returns {FilteredMediaTypes} Filtered mediaTypes object with relevant media types filtered by size buckets based on activeViewPort size
 */
function getFilteredMediaTypes(mediaTypes) {
  let
    activeViewportWidth,
    activeViewportHeight,
    transformedMediaTypes;

  transformedMediaTypes = deepClone(mediaTypes);

  let activeSizeBucket = {
    banner: undefined,
    video: undefined,
    native: undefined
  }

  try {
    activeViewportWidth = getWindowTop().innerWidth;
    activeViewportHeight = getWindowTop().innerHeight;
  } catch (e) {
    logWarn(`SizeMappingv2:: Unfriendly iframe blocks viewport size to be evaluated correctly`);
    activeViewportWidth = window.innerWidth;
    activeViewportHeight = window.innerHeight;
  }
  const activeViewport = [activeViewportWidth, activeViewportHeight];
  Object.keys(mediaTypes).map(mediaType => {
    const sizeConfig = mediaTypes[mediaType].sizeConfig;
    if (sizeConfig) {
      activeSizeBucket[mediaType] = getActiveSizeBucket(sizeConfig, activeViewport);
      const filteredSizeConfig = sizeConfig.filter(config => config.minViewPort === activeSizeBucket[mediaType] && isSizeConfigActivated(mediaType, config));
      transformedMediaTypes[mediaType] = Object.assign({ filteredSizeConfig }, mediaTypes[mediaType]);

      // transform mediaTypes object
      const config = {
        banner: 'sizes',
        video: 'playerSize'
      };

      if (transformedMediaTypes[mediaType].filteredSizeConfig.length > 0) {
        // map sizes or playerSize property in filteredSizeConfig object to transformedMediaTypes.banner.sizes if mediaType is banner
        // or transformedMediaTypes.video.playerSize if the mediaType in video.
        // doesn't apply to native mediaType since native doesn't have any property defining 'sizes' or 'playerSize'.
        if (mediaType !== 'native') {
          transformedMediaTypes[mediaType][config[mediaType]] = transformedMediaTypes[mediaType].filteredSizeConfig[0][config[mediaType]];
        }
      } else {
        delete transformedMediaTypes[mediaType];
      }
    }
  })
  return { mediaTypes, activeSizeBucket, activeViewport, transformedMediaTypes };
};

/**
 * Evaluates the given sizeConfig object and checks for various properties to determine if the sizeConfig is active or not. For example,
 * let's suppose the sizeConfig is for a Banner media type. Then, if the sizes property is found empty, it returns false, else returns true.
 * In case of a Video media type, it checks the playerSize property. If found empty, returns false, else returns true.
 * In case of a Native media type, it checks the active property. If found false, returns false, if found true, returns true.
 * @param {string} mediaType It can be 'banner', 'native' or 'video'
 * @param {Object<SizeConfig>} sizeConfig Represents the sizeConfig object which is active based on the current viewport size
 * @returns {boolean} Represents if the size config is active or not
 */
function isSizeConfigActivated(mediaType, sizeConfig) {
  switch (mediaType) {
    case 'banner':
      return sizeConfig.sizes && sizeConfig.sizes.length > 0;
    case 'video':
      return sizeConfig.playerSize && sizeConfig.playerSize.length > 0;
    case 'native':
      return sizeConfig.active;
    default:
      return false;
  }
}

/**
 * Returns the active size bucket for a given media type
 * @param {Array<SizeConfig>} sizeConfig SizeConfig defines the characteristics of an Ad Unit categorised into multiple size buckets per media type
 * @param {Array} activeViewport Viewport size of the browser in the form [w, h] (w -> width, h -> height)
 * Calculated at the time of making call to pbjs.requestBids function
 * @returns {Array} The active size bucket matching the activeViewPort
 */
function getActiveSizeBucket(sizeConfig, activeViewport) {
  let activeSizeBucket = [];
  sizeConfig
    .sort((a, b) => a.minViewPort[0] - b.minViewPort[0])
    .forEach(config => {
      if (activeViewport[0] >= config.minViewPort[0]) {
        if (activeViewport[1] >= config.minViewPort[1]) {
          activeSizeBucket = config.minViewPort;
        } else {
          activeSizeBucket = [];
        }
      }
    })
  return activeSizeBucket;
}

function getRelevantMediaTypesForBidder(sizeConfig, activeViewport) {
  if (checkBidderSizeConfigFormat(sizeConfig)) {
    const activeSizeBucket = getActiveSizeBucket(sizeConfig, activeViewport);
    return sizeConfig.filter(config => config.minViewPort === activeSizeBucket)[0]['relevantMediaTypes'];
  }
  return [];
}

function getBids({ bidderCode, auctionId, bidderRequestId, adUnits, labels, src }) {
  return adUnits.reduce((result, adUnit) => {
    if (isLabelActivated(adUnit, labels, adUnit.code)) {
      if (adUnit.mediaTypes && isValidMediaTypes(adUnit.mediaTypes)) {
        const { mediaTypes, activeSizeBucket, activeViewport, transformedMediaTypes } = getFilteredMediaTypes(adUnit.mediaTypes);
        logInfo(`SizeMappingV2:: AdUnit: ${adUnit.code}, Bidder: ${bidderCode} - Active size buckets after filtration: `, activeSizeBucket);
        logInfo(`SizeMappingV2:: AdUnit: ${adUnit.code}, Bidder: ${bidderCode} - Transformed mediaTypes after filtration: `, transformedMediaTypes);
        logInfo(`SizeMappingV2:: AdUnit: ${adUnit.code}, Bidder: ${bidderCode} - mediaTypes that got filtered out: `, Object.keys(mediaTypes).filter(mt => Object.keys(transformedMediaTypes).indexOf(mt) === -1));

        // check if adUnit has any active media types remaining, if not drop the adUnit from auction,
        // else proceed to evaluate the bids object.
        if (Object.keys(transformedMediaTypes).length === 0) {
          logInfo(`SizeMappingV2:: Ad Unit: ${adUnit.code} is disabled since there are no active media types after sizeConfig filtration.`);
          return result;
        }
        result
          .push(adUnit.bids.filter(bid => bid.bidder === bidderCode)
            .reduce((bids, bid) => {
              if (isLabelActivated(bid, labels, adUnit.code)) {
                // handle native params
                const nativeParams = adUnit.nativeParams || deepAccess(adUnit, 'mediaTypes.native');
                if (nativeParams) {
                  bid = Object.assign({}, bid, {
                    nativeParams: processNativeAdUnitParams(nativeParams)
                  });
                }

                bid = Object.assign({}, bid, getDefinedParams(adUnit, ['mediaType', 'renderer']));

                if (bid.sizeConfig) {
                  const relevantMediaTypes = getRelevantMediaTypesForBidder(bid.sizeConfig, activeViewport);
                  if (relevantMediaTypes.length === 0) {
                    logError(`SizeMappingV2:: Bidder: ${bid.bidder} in Ad Unit: ${adUnit.code} has not configured sizeConfig property correctly. This bidder won't be eligible for sizeConfig checks and will remain active.`);
                    bid = Object.assign({}, bid);
                  } else if (relevantMediaTypes[0] !== 'none') {
                    const bidderMediaTypes = Object
                      .keys(transformedMediaTypes)
                      .filter(mt => relevantMediaTypes.indexOf(mt) > -1)
                      .reduce((mediaTypes, mediaType) => {
                        mediaTypes[mediaType] = transformedMediaTypes[mediaType];
                        return mediaTypes;
                      }, {});

                    if (Object.keys(bidderMediaTypes).length > 0) {
                      bid = Object.assign({}, bid, { mediaTypes: bidderMediaTypes });
                    } else {
                      logInfo(`SizeMappingV2:: Bidder: ${bid.bidder} in Ad Unit: ${adUnit.code} is disabled.`);
                      return bids;
                    }
                  } else {
                    logInfo(`SizeMappingV2:: Bidder: ${bid.bidder} in Ad Unit: ${adUnit.code} is disabled due to failing sizeConfig check.`);
                    return bids;
                  }
                }
                bids.push(Object.assign({}, bid, {
                  adUnitCode: adUnit.code,
                  transactionId: adUnit.transactionId,
                  sizes: deepAccess(transformedMediaTypes, 'banner.sizes') || deepAccess(transformedMediaTypes, 'video.playerSize') || [],
                  mediaTypes: bid.mediaTypes || transformedMediaTypes,
                  bidId: bid.bid_id || getUniqueIdentifierStr(),
                  bidderRequestId,
                  auctionId,
                  src,
                  bidRequestsCount: adunitCounter.getRequestsCounter(adUnit.code),
                  bidderRequestsCount: adunitCounter.getBidderRequestsCounter(adUnit.code, bid.bidder),
                  bidderWinsCount: adunitCounter.getBidderWinsCounter(adUnit.code, bid.bidder)
                }));
                return bids;
              } else {
                logInfo(`SizeMappingV2:: Bidder: ${bid.bidder} in Ad Unit: ${adUnit.code} is disabled due to failing label check.`);
                return bids;
              }
            }, []));
      } else {
        logWarn(`SizeMappingV2:: Ad Unit: ${adUnit.code} has declared invalid mediaTypes or has not declared a mediaTypes property`);
      }
    } else {
      logInfo(`SizeMappingV2:: Ad Unit: ${adUnit.code} is disabled due to failing label check.`);
      return result;
    }
    return result;
  }, []).reduce(flatten, []).filter(val => val !== '');
}
