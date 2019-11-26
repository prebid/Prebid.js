// import { deepAccess, getDefinedParams, console.log } from '../src/utils';
// import { processNativeAdUnitParams } from '../src/native';

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
    console.log(`Ad Unit ${bidOrAdUnit.code} has multiple label operators. Using the last declared operator ${lastDeclaredOperator}`);
    labelOperator = lastDeclaredOperator;
  } else {
    labelOperator = labelsFound[0];
  }
  if (labelOperator === 'labelAll') {
    if (bidOrAdUnit.labelAll.length === 0) {
      console.log(`Ad Unit ${bidOrAdUnit.code} has property labelAll with an empty array. Ad Unit is still enabled!`);
      return true;
    }
    return bidOrAdUnit.labelAll.every(label => activeLabels.includes(label));
  } else if (labelOperator === 'labelAny') {
    if (bidOrAdUnit.labelAny.length === 0) {
      console.log(`Ad Unit ${bidOrAdUnit.code} has property labelAny with an empty array. Ad Unit is still enabled!`);
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
 * @returns {MediaTypes} Filtered mediaTypes object with relevant media types filterer by size buckets based on activeViewPort size
 */

// WIP: Functionality of transforming the mediaTypes object is still pending
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
    // activeViewportWidth = getWindowTop().innerWidth;
    // activeViewportHeight = getWindowTop().innerHeight;
    activeViewportWidth = 820;
    activeViewportHeight = 300;
  } catch (e) {
    console.log('Unfriendly iFrame blocks Viewport size to be evaluated correctly');
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
 * let's suppose the sizeConfig is for a Banner media type. Then, if the sizes property is found empty, it return false, else returns true.
 * In case of a Video media type, it checks the playerSize property. If found empty, returns false, else returns true.
 * In case of a Native media type, it checks the active property. If found false, returns false, if found true, returns true.
 * @param {string} mediaType It can be 'banner', 'native' or 'video'
 * @param {Object<SizeConfig>} sizeConfig Represents the sizeConfig object which is active based on the current viewport size
 * @returns {boolean} Represents if the size config active or not
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

// const mediaTypes = {
//   banner: {
//     sizeConfig: [
//       { minViewPort: [0, 0], sizes: [] },
//       { minViewPort: [800, 0], sizes: [[300, 250], [300, 600]] },
//       { minViewPort: [850, 0], sizes: [[200, 200], [400, 400]] }
//     ]
//   },
//   video: {
//     context: 'outstream',
//     sizeConfig: [
//       { minViewPort: [0, 0], playerSize: [] },    // no video if < 800px
//       { minViewPort: [800, 0], playerSize: [640, 480] },
//       { minViewPort: [1000, 1200], playerSize: [700, 600] }
//     ],
//     renderer: {}
//   },
//   native: {
//     sizeConfig: [
//       { minViewPort: [0, 0], active: false },
//       { minViewPort: [900, 0], active: true }
//     ],
//     image: { sizes: [[150, 50]] }
//   }
// };

// console.log('getFilteredMediaTypes', JSON.stringify(getFilteredMediaTypes(mediaTypes)));

// WIP
// function getBids({ bidderCode, auctionId, bidderRequestId, adUnits, labels, src }) {
//   return adUnits.reduce((result, adUnit) => {
//     if (isLabelActivated(adUnit)) {
//       if (adUnit.mediaTypes) {
//         const filteredMediaTypes = getFilteredMediaTypes(adUnit.mediaTypes);
//         const transformMediaTypes = getTransformedMediaTypes(filteredMediaTypes);
//         adUnit.mediaTypes = transformMediaTypes;
//         result
//           .push(adUnit.bids.filter(bid => bid.bidder === bidderCode))
//           .reduce((bids, bid) => {
//             const nativeParams = adUnit.nativeParams || deepAccess(adUnit, 'mediaTypes.native');
//             if (nativeParams) {
//               bid = Object.assign({}, bid, {
//                 nativeParams: processNativeAdUnitParams(nativeParams)
//               });
//             }

//             bid = Object.assign({}, bid, getDefinedParams(adUnit, ['mediaType', 'renderer']));

//             if (bid.sizeConfig) {

//             }
//           }, []);
//       }
//     } else {
//       logInfo(`Ad Unit ${adUnit.code} is disabled due to a failing label check.`);
//     }
//   }, []);
// }
