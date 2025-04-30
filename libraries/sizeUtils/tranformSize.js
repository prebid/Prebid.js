import * as utils from '../../src/utils.js';

/**
 * get sizes for rtb
 * @param  {Array|Object} requestSizes
 * @return {Object}
 */
export function transformSizes(requestSizes) {
  let sizes = [];
  let sizeObj = {};

  if (
    utils.isArray(requestSizes) &&
      requestSizes.length === 2 &&
      !utils.isArray(requestSizes[0])
  ) {
    sizeObj.width = parseInt(requestSizes[0], 10);
    sizeObj.height = parseInt(requestSizes[1], 10);
    sizes.push(sizeObj);
  } else if (typeof requestSizes === 'object') {
    for (let i = 0; i < requestSizes.length; i++) {
      let size = requestSizes[i];
      sizeObj = {};
      sizeObj.width = parseInt(size[0], 10);
      sizeObj.height = parseInt(size[1], 10);
      sizes.push(sizeObj);
    }
  }

  return sizes;
}

export const normalAdSize = [
  { w: 300, h: 250 },
  { w: 300, h: 600 },
  { w: 728, h: 90 },
  { w: 970, h: 250 },
  { w: 320, h: 50 },
  { w: 160, h: 600 },
  { w: 320, h: 180 },
  { w: 320, h: 100 },
  { w: 336, h: 280 },
];
