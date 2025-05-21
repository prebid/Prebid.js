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
export function cleanObject(obj, key, tempKey) {
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
export function getBidFloor (bid, currency, mediaType) {
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
export function getFloor(bid, mediaType, width, height, currency) {
  return bid.getFloor?.({ currency, mediaType, size: [width, height] })
    .floor || bid.params.bidfloor || -1;
}

/**
 * Generates a 14-char string id
 * @returns {string}
 */
export function makeId() {
  const length = 14;
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let counter = 0;
  let str = '';

  while (counter++ < length) {
    str += characters.charAt(Math.floor(Math.random() * characters.length));
  }

  return str;
}
