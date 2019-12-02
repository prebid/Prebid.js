import { flatten, deepAccess, getDefinedParams, getUniqueIdentifierStr, logInfo, logWarn } from '../src/utils';
import { processNativeAdUnitParams } from '../src/native';
import { adunitCounter } from '../src/adUnits';

import { getHook } from '../src/hook';

getHook('getBids').before(function (fn, obj) {
  return fn(obj, true, getBids(obj));
});

/**
 * Given an Ad Unit or a Bid as an input, returns a boolean telling if the Ad Unit/ Bid is active based on label checks on the Ad unit/Bid object
 * @param {Object<BidOrAdUnit>} bidOrAdUnit Either the Ad Unit object or the Bid object
 * @param {Array<string>} activeLabels List of active labels passed as an argument to pbjs.requestBids function
 * @returns {boolean} Represents if the Ad Unit or the Bid is active or not
 */
function isLabelActivated(bidOrAdUnit, activeLabels) {
  let labelOperator;
  const labelsFound = Object.keys(bidOrAdUnit).filter(prop => prop === 'labelAny' || prop === 'labelAll');
  if (labelsFound && labelsFound.length > 1) {
    const lastDeclaredOperator = labelsFound[labelsFound.length - 1];
    logWarn(`SizeMappingV2:: Ad Unit: ${bidOrAdUnit.code} has multiple label operators. Using the last declared operator ${lastDeclaredOperator}`);
    labelOperator = lastDeclaredOperator;
  } else {
    labelOperator = labelsFound[0];
  }
  if (labelOperator === 'labelAll') {
    if (bidOrAdUnit.labelAll.length === 0) {
      logWarn(`SizeMappingV2:: Ad Unit: ${bidOrAdUnit.code} has declared property labelAll with an empty array. Ad Unit is still enabled!`);
      return true;
    }
    return bidOrAdUnit.labelAll.every(label => activeLabels.includes(label));
  } else if (labelOperator === 'labelAny') {
    if (bidOrAdUnit.labelAny.length === 0) {
      logWarn(`SizeMappingV2:: Ad Unit: ${bidOrAdUnit.code} has declared property labelAny with an empty array. Ad Unit is still enabled!`);
      return true;
    }
    return bidOrAdUnit.labelAny.some(label => activeLabels.includes(label));
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

  transformedMediaTypes = Object.assign({}, mediaTypes);

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

function getBids({ bidderCode, auctionId, bidderRequestId, adUnits, labels, src }) {
  return adUnits.reduce((result, adUnit) => {
    if (isLabelActivated(adUnit, labels)) {
      if (adUnit.mediaTypes) {
        const { mediaTypes, activeSizeBucket, activeViewport, transformedMediaTypes } = getFilteredMediaTypes(adUnit.mediaTypes);
        logInfo(`SizeMappingV2:: Size of the viewport detected: `, activeViewport);
        logInfo(`SizeMappingV2:: Active size buckets after filtration: `, activeSizeBucket);
        logInfo(`SizeMappingV2:: Transformed mediaTypes after filtration: `, transformedMediaTypes);
        logInfo(`SizeMappingV2:: mediaTypes that got filtered out: `, Object.keys(mediaTypes).filter(mt => Object.keys(transformedMediaTypes).indexOf(mt) === -1));
        result
          .push(adUnit.bids.filter(bid => bid.bidder === bidderCode)
            .reduce((bids, bid) => {
              if (isLabelActivated(bid, labels)) {
                // handle native params
                const nativeParams = adUnit.nativeParams || deepAccess(adUnit, 'mediaTypes.native');
                if (nativeParams) {
                  bid = Object.assign({}, bid, {
                    nativeParams: processNativeAdUnitParams(nativeParams)
                  });
                }

                bid = Object.assign({}, bid, getDefinedParams(adUnit, ['mediaType', 'renderer']));

                if (bid.sizeConfig) {
                  const relevantMediaTypes = bid.sizeConfig.filter(config => config.minViewPort === activeViewPort)[0].relevantMediaTypes;
                  if (relevantMediaTypes[0] !== 'none') {
                    const bidderMediaTypes = Object
                      .keys(transformedMediaTypes)
                      .filter(mt => relevantMediaTypes.indexOf(mt) > -1)
                      .reduce((mediaTypes, mediaType) => {
                        mediaTypes[mediaType] = transformedMediaTypes[mediaType];
                        return mediaTypes;
                      }, {});

                    if (Object.keys(bidderMediaTypes).length > 0) {
                      bid = Object.assign({}, bid, bidderMediaTypes);
                    } else {
                      return logInfo(`SizeMappingV2:: Bidder: ${bid.bidder} in Ad Unit: ${adUnit.code} is disabled.`);
                    }
                  } else {
                    return logInfo(`SizeMappingV2:: Bidder: ${bid.bidder} in Ad Unit: ${adUnit.code} is disabled due to failing sizeConfig check.`);
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
                  bidRequestsCound: adunitCounter.getCounter(adUnit.code)
                }));
                return bids;
              } else {
                return logInfo(`SizeMappingV2:: Bidder: ${bid.bidder} in Ad Unit: ${adUnit.code} is disabled due to failing label check.`);
              }
            }, []));
      }
    } else {
      return logInfo(`SizeMappingV2:: Ad Unit: ${adUnit.code} is disabled due to failing label check.`);
    }
    return result;
  }, []).reduce(flatten, []).filter(val => val !== '');
}
