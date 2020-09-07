/**
 * This module adds support for the new size mapping spec, Advanced Size Mapping. It's documented here. https://github.com/prebid/Prebid.js/issues/4129
 * The implementation is an alternative to global sizeConfig. It introduces 'Ad Unit' & 'Bidder' level sizeConfigs and also supports 'labels' for conditional
 * rendering. Read full API documentation on Prebid.org, http://prebid.org/dev-docs/modules/sizeMappingV2.html
 */

import * as utils from '../src/utils.js';
import { processNativeAdUnitParams } from '../src/native.js';
import { adunitCounter } from '../src/adUnits.js';
import includes from 'core-js-pure/features/array/includes.js';
import { getHook } from '../src/hook.js';
import { adUnitSetupChecks } from '../src/prebid.js';

// Allows for stubbing of these functions while writing unit tests.
export const internal = {
  checkBidderSizeConfigFormat,
  getActiveSizeBucket,
  getFilteredMediaTypes,
  getAdUnitDetail,
  getRelevantMediaTypesForBidder,
  isLabelActivated
};

/*
  'sizeMappingInternalStore' contains information on, whether a particular auction is using size mapping V2 (the new size mapping spec),
  and it also contains additional information on each adUnit, such as, mediaTypes, activeViewport, etc. This information is required by
  the 'getBids' function.
*/

export const sizeMappingInternalStore = createSizeMappingInternalStore();

function createSizeMappingInternalStore() {
  const sizeMappingInternalStore = {};

  return {
    initializeStore: function (auctionId, isUsingSizeMappingBool) {
      sizeMappingInternalStore[auctionId] = {
        usingSizeMappingV2: isUsingSizeMappingBool,
        adUnits: []
      };
    },
    getAuctionDetail: function (auctionId) {
      return sizeMappingInternalStore[auctionId];
    },
    setAuctionDetail: function (auctionId, adUnitDetail) {
      sizeMappingInternalStore[auctionId].adUnits.push(adUnitDetail);
    }
  }
}

/*
  Returns "true" if at least one of the adUnits in the adUnits array is using an Ad Unit and/or Bidder level sizeConfig,
  otherwise, returns "false."
*/
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

/**
  This hooked function executes before the function 'checkAdUnitSetup', that is defined in /src/prebid.js. It's necessary to run this funtion before
  because it applies a series of checks in order to determine the correctness of the 'sizeConfig' array, which, the original 'checkAdUnitSetup' function
  does not recognize.
  @params {Array<AdUnits>} adUnits
  @returns {Array<AdUnits>} validateAdUnits - Unrecognized properties are deleted.
*/
export function checkAdUnitSetupHook(adUnits) {
  const validateSizeConfig = function (mediaType, sizeConfig, adUnitCode) {
    let isValid = true;
    const associatedProperty = {
      banner: 'sizes',
      video: 'playerSize',
      native: 'active'
    }
    const propertyName = associatedProperty[mediaType];
    const conditionalLogMessages = {
      banner: 'Removing mediaTypes.banner from ad unit.',
      video: 'Removing mediaTypes.video.sizeConfig from ad unit.',
      native: 'Removing mediaTypes.native.sizeConfig from ad unit.'
    }
    if (Array.isArray(sizeConfig)) {
      sizeConfig.forEach((config, index) => {
        const keys = Object.keys(config);
        /*
          Check #1 (Applies to 'banner', 'video' and 'native' media types.)
          Verify that all config objects include 'minViewPort' and 'sizes' property.
          If they do not, return 'false'.
        */
        if (!(includes(keys, 'minViewPort') && includes(keys, propertyName))) {
          utils.logError(`Ad unit ${adUnitCode}: Missing required property 'minViewPort' or 'sizes' from 'mediaTypes.${mediaType}.sizeConfig[${index}]'. ${conditionalLogMessages[mediaType]}`);
          isValid = false;
          return;
        }
        /*
          Check #2 (Applies to 'banner', 'video' and 'native' media types.)
          Verify that 'config.minViewPort' property is in [width, height] format.
          If not, return false.
        */
        if (!utils.isArrayOfNums(config.minViewPort, 2)) {
          utils.logError(`Ad unit ${adUnitCode}: Invalid declaration of 'minViewPort' in 'mediaTypes.${mediaType}.sizeConfig[${index}]'. ${conditionalLogMessages[mediaType]}`);
          isValid = false
          return;
        }
        /*
          Check #3 (Applies only to 'banner' and 'video' media types.)
          Verify that 'config.sizes' (in case of banner) or 'config.playerSize' (in case of video)
          property is in [width, height] format. If not, return 'false'.
        */
        if (mediaType === 'banner' || mediaType === 'video') {
          let showError = false;
          if (Array.isArray(config[propertyName])) {
            const validatedSizes = adUnitSetupChecks.validateSizes(config[propertyName]);
            if (config[propertyName].length > 0 && validatedSizes.length === 0) {
              isValid = false;
              showError = true;
            }
          } else {
            // Either 'sizes' or 'playerSize' is not declared as an array, which makes it invalid by default.
            isValid = false;
            showError = true;
          }
          if (showError) {
            utils.logError(`Ad unit ${adUnitCode}: Invalid declaration of '${propertyName}' in 'mediaTypes.${mediaType}.sizeConfig[${index}]'. ${conditionalLogMessages[mediaType]}`);
            return;
          }
        }
        /*
          Check #4 (Applies only to 'native' media type)
          Verify that 'config.active' is a 'boolean'.
          If not, return 'false'.
        */
        if (mediaType === 'native') {
          if (typeof config[propertyName] !== 'boolean') {
            utils.logError(`Ad unit ${adUnitCode}: Invalid declaration of 'active' in 'mediaTypes.${mediaType}.sizeConfig[${index}]'. ${conditionalLogMessages[mediaType]}`);
            isValid = false;
          }
        }
      });
    } else {
      utils.logError(`Ad unit ${adUnitCode}: Invalid declaration of 'sizeConfig' in 'mediaTypes.${mediaType}.sizeConfig'. ${conditionalLogMessages[mediaType]}`);
      isValid = false;
      return isValid;
    }

    // If all checks have passed, isValid should equal 'true'
    return isValid;
  }
  const validatedAdUnits = [];
  adUnits.forEach(adUnit => {
    const mediaTypes = adUnit.mediaTypes;
    let validatedBanner, validatedVideo, validatedNative;
    if (!mediaTypes || Object.keys(mediaTypes).length === 0) {
      utils.logError(`Detected adUnit.code '${adUnit.code}' did not have a 'mediaTypes' object defined. This is a required field for the auction, so this adUnit has been removed.`);
      return;
    }
    if (mediaTypes.banner) {
      if (mediaTypes.banner.sizes) {
        // Ad unit is using 'mediaTypes.banner.sizes' instead of the new property 'sizeConfig'. Apply the old checks!
        validatedBanner = adUnitSetupChecks.validateBannerMediaType(adUnit);
      } else if (mediaTypes.banner.sizeConfig) {
        // Ad unit is using the 'sizeConfig' property, 'mediaTypes.banner.sizeConfig'. Apply the new checks!
        validatedBanner = utils.deepClone(adUnit);
        const isBannerValid = validateSizeConfig('banner', mediaTypes.banner.sizeConfig, adUnit.code);
        if (!isBannerValid) {
          delete validatedBanner.mediaTypes.banner;
        } else {
          /*
            Make sure 'sizes' field is always an array of arrays. If not, make it so.
            For example, [] becomes [[]], and [360, 400] becomes [[360, 400]]
          */
          validatedBanner.mediaTypes.banner.sizeConfig.forEach(config => {
            if (!Array.isArray(config.sizes[0])) {
              config.sizes = [config.sizes];
            }
          });
        }
      } else {
        // Ad unit is invalid since it's mediaType property does not have either 'sizes' or 'sizeConfig' declared.
        utils.logError(`Ad unit ${adUnit.code}: 'mediaTypes.banner' does not contain either 'sizes' or 'sizeConfig' property. Removing 'mediaTypes.banner' from ad unit.`);
        validatedBanner = utils.deepClone(adUnit);
        delete validatedBanner.mediaTypes.banner;
      }
    }

    if (mediaTypes.video) {
      if (mediaTypes.video.playerSize) {
        // Ad unit is using 'mediaTypes.video.playerSize' instead of the new property 'sizeConfig'. Apply the old checks!
        validatedVideo = validatedBanner ? adUnitSetupChecks.validateVideoMediaType(validatedBanner) : adUnitSetupChecks.validateVideoMediaType(adUnit);
      } else if (mediaTypes.video.sizeConfig) {
        // Ad unit is using the 'sizeConfig' property, 'mediaTypes.video.sizeConfig'. Apply the new checks!
        validatedVideo = validatedBanner || utils.deepClone(adUnit);
        const isVideoValid = validateSizeConfig('video', mediaTypes.video.sizeConfig, adUnit.code);
        if (!isVideoValid) {
          delete validatedVideo.mediaTypes.video.sizeConfig;
        } else {
          /*
            Make sure 'playerSize' field is always an array of arrays. If not, make it so.
            For example, [] becomes [[]], and [640, 400] becomes [[640, 400]]
          */
          validatedVideo.mediaTypes.video.sizeConfig.forEach(config => {
            if (!Array.isArray(config.playerSize[0])) {
              config.playerSize = [config.playerSize];
            }
          });
        }
      }
    }

    if (mediaTypes.native) {
      // Apply the old native checks
      validatedNative = validatedVideo ? adUnitSetupChecks.validateNativeMediaType(validatedVideo) : validatedBanner ? adUnitSetupChecks.validateNativeMediaType(validatedBanner) : adUnitSetupChecks.validateNativeMediaType(adUnit);

      // Apply the new checks if 'mediaTypes.native.sizeConfig' detected
      if (mediaTypes.native.sizeConfig) {
        const isNativeValid = validateSizeConfig('native', mediaTypes.native.sizeConfig, adUnit.code);
        if (!isNativeValid) {
          delete validatedNative.mediaTypes.native.sizeConfig;
        }
      }
    }

    const validatedAdUnit = Object.assign({}, validatedBanner, validatedVideo, validatedNative);
    validatedAdUnits.push(validatedAdUnit);
  });
  return validatedAdUnits;
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

// checks if the sizeConfig object declared at the Bidder level is in the right format or not.
export function checkBidderSizeConfigFormat(sizeConfig) {
  let didCheckPass = true;
  if (Array.isArray(sizeConfig) && sizeConfig.length > 0) {
    sizeConfig.forEach(config => {
      const keys = Object.keys(config);
      if ((includes(keys, 'minViewPort') &&
        includes(keys, 'relevantMediaTypes')) &&
        utils.isArrayOfNums(config.minViewPort, 2) &&
        Array.isArray(config.relevantMediaTypes) &&
        config.relevantMediaTypes.length > 0 &&
        (config.relevantMediaTypes.length > 1 ? (config.relevantMediaTypes.every(mt => (includes(['banner', 'video', 'native'], mt))))
          : (['none', 'banner', 'video', 'native'].indexOf(config.relevantMediaTypes[0]) > -1))) {
        didCheckPass = didCheckPass && true;
      } else {
        didCheckPass = false;
      }
    });
  } else {
    didCheckPass = false;
  }
  return didCheckPass;
}

getHook('getBids').before(function (fn, bidderInfo) {
  // check if the adUnit is using sizeMappingV2 specs and store the result in _sizeMappingUsageMap.
  if (typeof sizeMappingInternalStore.getAuctionDetail(bidderInfo.auctionId) === 'undefined') {
    const isUsingSizeMappingBool = isUsingNewSizeMapping(bidderInfo.adUnits);

    // initialize sizeMappingInternalStore for the first time for a particular auction
    sizeMappingInternalStore.initializeStore(bidderInfo.auctionId, isUsingSizeMappingBool);
  }
  if (sizeMappingInternalStore.getAuctionDetail(bidderInfo.auctionId).usingSizeMappingV2) {
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
 * @param {Object<BidOrAdUnit>} bidOrAdUnit - Either the Ad Unit object or the Bid object
 * @param {Array<string>} activeLabels - List of active labels passed as an argument to pbjs.requestBids function
 * @param {string} adUnitCode - Unique string identifier for an Ad Unit.
 * @param {number} adUnitInstance - Instance count of an 'Identical' ad unit.
 * @returns {boolean} Represents if the Ad Unit or the Bid is active or not
 */
export function isLabelActivated(bidOrAdUnit, activeLabels, adUnitCode, adUnitInstance) {
  let labelOperator;
  const labelsFound = Object.keys(bidOrAdUnit).filter(prop => prop === 'labelAny' || prop === 'labelAll');
  if (labelsFound && labelsFound.length > 1) {
    utils.logWarn(`Size Mapping V2:: ${(bidOrAdUnit.code)
      ? (`Ad Unit: ${bidOrAdUnit.code}(${adUnitInstance}) => Ad unit has multiple label operators. Using the first declared operator: ${labelsFound[0]}`)
      : (`Ad Unit: ${adUnitCode}(${adUnitInstance}), Bidder: ${bidOrAdUnit.bidder} => Bidder has multiple label operators. Using the first declared operator: ${labelsFound[0]}`)}`);
  }
  labelOperator = labelsFound[0];

  if (labelOperator && !activeLabels) {
    utils.logWarn(`Size Mapping V2:: ${(bidOrAdUnit.code)
      ? (`Ad Unit: ${bidOrAdUnit.code}(${adUnitInstance}) => Found '${labelOperator}' on ad unit, but 'labels' is not set. Did you pass 'labels' to pbjs.requestBids() ?`)
      : (`Ad Unit: ${adUnitCode}(${adUnitInstance}), Bidder: ${bidOrAdUnit.bidder} => Found '${labelOperator}' on bidder, but 'labels' is not set. Did you pass 'labels' to pbjs.requestBids() ?`)}`);
    return true;
  }

  if (labelOperator === 'labelAll' && Array.isArray(bidOrAdUnit[labelOperator])) {
    if (bidOrAdUnit.labelAll.length === 0) {
      utils.logWarn(`Size Mapping V2:: Ad Unit: ${bidOrAdUnit.code}(${adUnitInstance}) => Ad unit has declared property 'labelAll' with an empty array.`);
      return true;
    }
    return bidOrAdUnit.labelAll.every(label => includes(activeLabels, label));
  } else if (labelOperator === 'labelAny' && Array.isArray(bidOrAdUnit[labelOperator])) {
    if (bidOrAdUnit.labelAny.length === 0) {
      utils.logWarn(`Size Mapping V2:: Ad Unit: ${bidOrAdUnit.code}(${adUnitInstance}) => Ad unit has declared property 'labelAny' with an empty array.`);
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
export function getFilteredMediaTypes(mediaTypes) {
  let
    activeViewportWidth,
    activeViewportHeight,
    transformedMediaTypes;

  transformedMediaTypes = utils.deepClone(mediaTypes);

  let activeSizeBucket = {
    banner: undefined,
    video: undefined,
    native: undefined
  }

  try {
    activeViewportWidth = utils.getWindowTop().innerWidth;
    activeViewportHeight = utils.getWindowTop().innerHeight;
  } catch (e) {
    utils.logWarn(`SizeMappingv2:: Unfriendly iframe blocks viewport size to be evaluated correctly`);
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

  // filter out 'undefined' values from activeSizeBucket object and attach sizes/playerSize information against the active size bucket.
  const sizeBucketToSizeMap = Object
    .keys(activeSizeBucket)
    .filter(mediaType => activeSizeBucket[mediaType] !== undefined)
    .reduce((sizeBucketToSizeMap, mediaType) => {
      sizeBucketToSizeMap[mediaType] = {
        activeSizeBucket: activeSizeBucket[mediaType],
        activeSizeDimensions: (mediaType === 'banner') ? (
          // banner mediaType gets deleted incase no sizes are specified for a given size bucket, that's why this check is necessary
          (transformedMediaTypes.banner) ? (transformedMediaTypes.banner.sizes) : ([])
        ) : ((mediaType === 'video') ? (
          // video mediaType gets deleted incase no playerSize is specified for a given size bucket, that's why this check is necessary
          (transformedMediaTypes.video) ? (transformedMediaTypes.video.playerSize) : ([])
        ) : ('NA'))
      };
      return sizeBucketToSizeMap;
    }, {});

  return { mediaTypes, sizeBucketToSizeMap, activeViewport, transformedMediaTypes };
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
export function isSizeConfigActivated(mediaType, sizeConfig) {
  switch (mediaType) {
    case 'banner':
      // we need this check, sizeConfig.sizes[0].length > 0, in place because a sizeBucket can have sizes: [],
      // gets converted to sizes: [[]] in the checkAdUnitSetupHook function
      return sizeConfig.sizes && sizeConfig.sizes.length > 0 && sizeConfig.sizes[0].length > 0;
    case 'video':
      // for why we need the last check, read the above comment
      return sizeConfig.playerSize && sizeConfig.playerSize.length > 0 && sizeConfig.playerSize[0].length > 0;
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
 * @returns {Array} The active size bucket matching the activeViewPort, for example: [750, 0]
 */
export function getActiveSizeBucket(sizeConfig, activeViewport) {
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

export function getRelevantMediaTypesForBidder(sizeConfig, activeViewport) {
  if (internal.checkBidderSizeConfigFormat(sizeConfig)) {
    const activeSizeBucket = internal.getActiveSizeBucket(sizeConfig, activeViewport);
    return sizeConfig.filter(config => config.minViewPort === activeSizeBucket)[0]['relevantMediaTypes'];
  }
  return [];
}

// sets sizeMappingInternalStore for a given auctionId with relevant adUnit information returned from the call to 'getFilteredMediaTypes' function
// returns adUnit details object.
export function getAdUnitDetail(auctionId, adUnit, labels) {
  // fetch all adUnits for an auction from the sizeMappingInternalStore
  const adUnitsForAuction = sizeMappingInternalStore.getAuctionDetail(auctionId).adUnits;

  // check if the adUnit exists already in the sizeMappingInterStore (check for equivalence of 'code' && 'mediaTypes' properties)
  const adUnitDetail = adUnitsForAuction.filter(adUnitDetail => adUnitDetail.adUnitCode === adUnit.code && utils.deepEqual(adUnitDetail.mediaTypes, adUnit.mediaTypes));

  if (adUnitDetail.length > 0) {
    adUnitDetail[0].cacheHits++;
    return adUnitDetail[0];
  } else {
    const identicalAdUnit = adUnitsForAuction.filter(adUnitDetail => adUnitDetail.adUnitCode === adUnit.code);
    const adUnitInstance = identicalAdUnit.length > 0 && typeof identicalAdUnit[0].instance === 'number' ? identicalAdUnit[identicalAdUnit.length - 1].instance + 1 : 1;
    const isLabelActivated = internal.isLabelActivated(adUnit, labels, adUnit.code, adUnitInstance);
    const { mediaTypes = adUnit.mediaTypes, sizeBucketToSizeMap, activeViewport, transformedMediaTypes } = isLabelActivated && internal.getFilteredMediaTypes(adUnit.mediaTypes);

    const adUnitDetail = {
      adUnitCode: adUnit.code,
      mediaTypes,
      sizeBucketToSizeMap,
      activeViewport,
      transformedMediaTypes,
      instance: adUnitInstance,
      isLabelActivated,
      cacheHits: 0
    };

    // set adUnitDetail in sizeMappingInternalStore against the correct 'auctionId'.
    sizeMappingInternalStore.setAuctionDetail(auctionId, adUnitDetail);
    isLabelActivated && utils.logInfo(`Size Mapping V2:: Ad Unit: ${adUnit.code}(${adUnitInstance}) => Active size buckets after filtration: `, sizeBucketToSizeMap);

    return adUnitDetail;
  }
}

export function getBids({ bidderCode, auctionId, bidderRequestId, adUnits, labels, src }) {
  return adUnits.reduce((result, adUnit) => {
    if (adUnit.mediaTypes && utils.isValidMediaTypes(adUnit.mediaTypes)) {
      const { activeViewport, transformedMediaTypes, instance: adUnitInstance, isLabelActivated, cacheHits } = internal.getAdUnitDetail(auctionId, adUnit, labels);
      if (isLabelActivated) {
        // check if adUnit has any active media types remaining, if not drop the adUnit from auction,
        // else proceed to evaluate the bids object.
        if (Object.keys(transformedMediaTypes).length === 0) {
          cacheHits === 0 && utils.logInfo(`Size Mapping V2:: Ad Unit: ${adUnit.code}(${adUnitInstance}) => Ad unit disabled since there are no active media types after sizeConfig filtration.`);
          return result;
        }
        result
          .push(adUnit.bids.filter(bid => bid.bidder === bidderCode)
            .reduce((bids, bid) => {
              if (internal.isLabelActivated(bid, labels, adUnit.code, adUnitInstance)) {
                // handle native params
                const nativeParams = adUnit.nativeParams || utils.deepAccess(adUnit, 'mediaTypes.native');
                if (nativeParams) {
                  bid = Object.assign({}, bid, {
                    nativeParams: processNativeAdUnitParams(nativeParams)
                  });
                }

                bid = Object.assign({}, bid, utils.getDefinedParams(adUnit, ['mediaType', 'renderer']));

                if (bid.sizeConfig) {
                  const relevantMediaTypes = internal.getRelevantMediaTypesForBidder(bid.sizeConfig, activeViewport);
                  if (relevantMediaTypes.length === 0) {
                    utils.logError(`Size Mapping V2:: Ad Unit: ${adUnit.code}(${adUnitInstance}), Bidder: ${bidderCode} => 'sizeConfig' is not configured properly. This bidder won't be eligible for sizeConfig checks and will remail active.`);
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
                      utils.logInfo(`Size Mapping V2:: Ad Unit: ${adUnit.code}(${adUnitInstance}), Bidder: ${bid.bidder} => 'relevantMediaTypes' does not match with any of the active mediaTypes at the Ad Unit level. This bidder is disabled.`);
                      return bids;
                    }
                  } else {
                    utils.logInfo(`Size Mapping V2:: Ad Unit: ${adUnit.code}(${adUnitInstance}), Bidder: ${bid.bidder} => 'relevantMediaTypes' is set to 'none' in sizeConfig for current viewport size. This bidder is disabled.`);
                    return bids;
                  }
                }
                bids.push(Object.assign({}, bid, {
                  adUnitCode: adUnit.code,
                  transactionId: adUnit.transactionId,
                  sizes: utils.deepAccess(transformedMediaTypes, 'banner.sizes') || utils.deepAccess(transformedMediaTypes, 'video.playerSize') || [],
                  mediaTypes: bid.mediaTypes || transformedMediaTypes,
                  bidId: bid.bid_id || utils.getUniqueIdentifierStr(),
                  bidderRequestId,
                  auctionId,
                  src,
                  bidRequestsCount: adunitCounter.getRequestsCounter(adUnit.code),
                  bidderRequestsCount: adunitCounter.getBidderRequestsCounter(adUnit.code, bid.bidder),
                  bidderWinsCount: adunitCounter.getBidderWinsCounter(adUnit.code, bid.bidder)
                }));
                return bids;
              } else {
                utils.logInfo(`Size Mapping V2:: Ad Unit: ${adUnit.code}(${adUnitInstance}), Bidder: ${bid.bidder} => Label check for this bidder has failed. This bidder is disabled.`);
                return bids;
              }
            }, []));
      } else {
        cacheHits === 0 && utils.logInfo(`Size Mapping V2:: Ad Unit: ${adUnit.code}(${adUnitInstance}) => Ad unit is disabled due to failing label check.`);
      }
    } else {
      utils.logWarn(`Size Mapping V2:: Ad Unit: ${adUnit.code} => Ad unit has declared invalid 'mediaTypes' or has not declared a 'mediaTypes' property`);
      return result;
    }
    return result;
  }, []).reduce(utils.flatten, []).filter(val => val !== '');
}
