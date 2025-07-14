import { VIDEO } from '../../src/mediaTypes.js';
import { deepAccess, isFn } from '../../src/utils.js';

const DEFAULT_FLOOR = 0.0;

/**
 * Assigns values to new properties, removes temporary ones from an object
 * and remove temporary default bidfloor of -1
 * @param {*} obj An object
 * @param {string} key A name of the new property
 * @param {string} tempKey A name of the temporary property to be removed
 * @returns {*} An updated object
 */
function cleanObject(obj, key, tempKey) {
  const newObj = {};

  for (const prop in obj) {
    if (prop === key) {
      if (Object.prototype.hasOwnProperty.call(obj, tempKey)) {
        newObj[key] = obj[tempKey];
      }
    } else if (prop !== tempKey) {
      newObj[prop] = obj[prop];
    }
  }

  newObj.bidfloor === -1 && delete newObj.bidfloor;

  return newObj;
}

/**
 * Get floors from Prebid Price Floors module
 *
 * @param {object} bid Bid request object
 * @param {string} currency Ad server currency
 * @param {string} mediaType Bid media type
 * @return {number} Floor price
 */
export function getBidFloor(bid, currency, mediaType) {
  const floors = [];

  if (isFn(bid.getFloor)) {
    (deepAccess(bid, `mediaTypes.${mediaType}.${mediaType === VIDEO ? 'playerSize' : 'sizes'}`) || []).forEach(size => {
      const floor = bid.getFloor({
        currency: currency || 'USD',
        mediaType,
        size
      }).floor;

      floors.push(!isNaN(floor) ? floor : DEFAULT_FLOOR);
    });
  }

  return floors.length ? Math.min(...floors) : DEFAULT_FLOOR;
}

/**
 * Returns a floor price provided by the Price Floors module or the floor price set in the publisher parameters
 * @param {*} bid
 * @param {string} mediaType A media type
 * @param {number} width A width of the ad
 * @param {number} height A height of the ad
 * @param {string} currency A floor price currency
 * @returns {number} Floor price
 */
function getFloor(bid, mediaType, width, height, currency) {
  return bid.getFloor?.({ currency, mediaType, size: [width, height] })
    .floor || bid.params.bidfloor || -1;
}

/**
 * Generates a 14-char string id
 * @returns {string}
 */
function makeId() {
  const length = 14;
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let counter = 0;
  let str = '';

  while (counter++ < length) {
    str += characters.charAt(Math.floor(Math.random() * characters.length));
  }

  return str;
}

/**
 * Prepares impressions for the request
 *
 * @param {*} imps An imps array
 * @param {*} bid A bid
 * @param {string} currency A currency
 * @param {*} impIdMap An impIdMap
 * @param {string} adapter A type of adapter (may be 'stx' or 'eqtv')
 * @return {*}
 */
export function prepareSplitImps(imps, bid, currency, impIdMap, adapter) {
  const splitImps = [];

  imps.forEach(item => {
    const floorMap = {};

    const updateFloorMap = (type, name, width = 0, height = 0) => {
      const floor = getFloor(bid, type, width, height, currency);

      if (!floorMap[floor]) {
        floorMap[floor] = {
          ...item,
          bidfloor: floor
        };
      }

      if (!floorMap[floor][name]) {
        floorMap[floor][name] = type === 'banner' ? { format: [] } : item[type];
      }

      if (type === 'banner') {
        floorMap[floor][name].format.push({ w: width, h: height });
      }
    };

    if (item.banner?.format?.length) {
      item.banner.format.forEach(format => updateFloorMap('banner', 'bannerTemp', format?.w, format?.h));
    }

    updateFloorMap('native', 'nativeTemp');
    updateFloorMap('video', 'videoTemp', item.video?.w, item.video?.h);

    Object.values(floorMap).forEach(obj => {
      [
        ['banner', 'bannerTemp'],
        ['native', 'nativeTemp'],
        ['video', 'videoTemp']
      ].forEach(([name, tempName]) => obj = cleanObject(obj, name, tempName));

      if (obj.banner || obj.video || obj.native) {
        const id = makeId();
        impIdMap[id] = obj.id;
        obj.id = id;

        if (obj.banner && adapter === 'stx') {
          obj.banner.pos = item.banner.pos;
          obj.banner.topframe = item.banner.topframe;
        }

        splitImps.push(obj);
      }
    });
  });

  return splitImps;
}
