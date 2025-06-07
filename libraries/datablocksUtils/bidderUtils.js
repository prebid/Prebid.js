// Placeholder for bidder utility functions
// This file will contain shared utility functions for bidders.

export const NATIVE_PARAMS = {
  title: {
    id: 1,
    name: 'title'
  },
  icon: {
    id: 2,
    type: 1,
    name: 'img'
  },
  image: {
    id: 3,
    type: 3,
    name: 'img'
  },
  body: {
    id: 4,
    name: 'data',
    type: 2
  },
  sponsoredBy: {
    id: 5,
    name: 'data',
    type: 1
  },
  cta: {
    id: 6,
    type: 12,
    name: 'data'
  },
  body2: {
    id: 7,
    name: 'data',
    type: 10
  },
  rating: {
    id: 8,
    name: 'data',
    type: 3
  },
  likes: {
    id: 9,
    name: 'data',
    type: 4
  },
  downloads: {
    id: 10,
    name: 'data',
    type: 5
  },
  displayUrl: {
    id: 11,
    name: 'data',
    type: 11
  },
  price: {
    id: 12,
    name: 'data',
    type: 6
  },
  salePrice: {
    id: 13,
    name: 'data',
    type: 7
  },
  address: {
    id: 14,
    name: 'data',
    type: 9
  },
  phone: {
    id: 15,
    name: 'data',
    type: 8
  }
};

export const NATIVE_ID_MAP = {};
Object.keys(NATIVE_PARAMS).forEach((key) => {
  NATIVE_ID_MAP[NATIVE_PARAMS[key].id] = key;
});

/**
 * @namespace bidderUtils
 * @description A collection of utility functions for bidders.
 */
const bidderUtils = {
  /**
   * @function sayHello
   * @memberof bidderUtils
   * @description A simple placeholder function.
   * @returns {string} A greeting message.
   */
  sayHello: function() {
    return "Hello from bidderUtils!";
  },

  /**
   * @function createNativeRequest
   * @memberof bidderUtils
   * @description Converts Prebid native request object into an RTB native request object.
   * @param {object} nativeParams - The native parameters from the bid request.
   * @param {object} NATIVE_PARAMS_CONST - The NATIVE_PARAMS constant.
   * @returns {object} The RTB native request object.
   */
  createNativeRequest: function(nativeParams, NATIVE_PARAMS_CONST) {
    const assets = [];
    if (nativeParams) {
      Object.keys(nativeParams).forEach((key) => {
        if (NATIVE_PARAMS_CONST[key]) {
          const {name, type, id} = NATIVE_PARAMS_CONST[key];
          const assetObj = type ? {type} : {};
          let {len, sizes, required, aspect_ratios: aRatios} = nativeParams[key];
          if (len) {
            assetObj.len = len;
          }
          if (aRatios && aRatios[0]) {
            aRatios = aRatios[0];
            let wmin = aRatios.min_width || 0;
            let hmin = aRatios.ratio_height * wmin / aRatios.ratio_width | 0;
            assetObj.wmin = wmin;
            assetObj.hmin = hmin;
          }
          if (sizes && sizes.length) {
            sizes = [].concat(...sizes);
            assetObj.w = sizes[0];
            assetObj.h = sizes[1];
          }
          const asset = {required: required ? 1 : 0, id};
          asset[name] = assetObj;
          assets.push(asset);
        }
      });
    }
    return {
      ver: '1.2',
      request: {
        assets: assets,
        context: 1,
        plcmttype: 1,
        ver: '1.2'
      }
    };
  },

  /**
   * @function parseNative
   * @memberof bidderUtils
   * @description Converts an RTB native response into a Prebid native response object.
   * @param {object} native - The native object from the RTB response.
   * @param {object} NATIVE_ID_MAP_CONST - The NATIVE_ID_MAP constant.
   * @returns {object} The Prebid native response object.
   */
  parseNative: function(native, NATIVE_ID_MAP_CONST) {
    const {assets, link, imptrackers, jstracker} = native;
    const result = {
      clickUrl: link.url,
      clickTrackers: link.clicktrackers || [],
      impressionTrackers: imptrackers || [],
      javascriptTrackers: jstracker ? [jstracker] : []
    };

    (assets || []).forEach((asset) => {
      const {id, img, data, title} = asset;
      // Directly use NATIVE_ID_MAP_CONST passed as an argument
      const key = NATIVE_ID_MAP_CONST[id];
      if (key) {
        // Assuming isEmpty is available in this scope or using a simplified check
        const isEmpty = value => value === undefined || value === null || (typeof value === 'object' && Object.keys(value).length === 0) || (typeof value === 'string' && value.trim().length === 0);

        // Handle title asset specifically
        if (title) { // Check if the 'title' property exists on the asset
          if (!isEmpty(title.text)) { // Then check if title.text is not empty
            result.title = title.text;
          }
        } else if (!isEmpty(img)) { // For img assets, the existing check is fine
          result[key] = {
            url: img.url,
            height: img.h,
            width: img.w
          }
        } else if (!isEmpty(data)) {
          result[key] = data.value;
        }
      }
    });
    return result;
  }
};

// Export the bidderUtils object if using a module system (e.g., CommonJS or ES6 modules)
// For CommonJS:
// module.exports = bidderUtils;

// For ES6 modules:
export default bidderUtils;
