import { isEmpty } from '../src/utils.js';

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

const NATIVE_ID_MAP = Object.entries(NATIVE_PARAMS).reduce((result, [key, asset]) => {
  result[asset.id] = key;
  return result;
}, {});

export function buildNativeRequest(nativeParams) {
  const assets = [];
  if (nativeParams) {
    Object.keys(nativeParams).forEach((key) => {
      if (NATIVE_PARAMS[key]) {
        const {name, type, id} = NATIVE_PARAMS[key];
        const assetObj = type ? {type} : {};
        let {len, sizes, required, aspect_ratios: aRatios} = nativeParams[key];
        if (len) {
          assetObj.len = len;
        }
        if (aRatios && aRatios[0]) {
          aRatios = aRatios[0];
          const wmin = aRatios.min_width || 0;
          const hmin = aRatios.ratio_height * wmin / aRatios.ratio_width | 0;
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
}

export function parseNativeResponse(native) {
  const {assets, link, imptrackers, jstracker} = native;
  const result = {
    clickUrl: link.url,
    clickTrackers: link.clicktrackers || [],
    impressionTrackers: imptrackers || [],
    javascriptTrackers: jstracker ? [jstracker] : []
  };

  (assets || []).forEach((asset) => {
    const {id, img, data, title} = asset;
    const key = NATIVE_ID_MAP[id];
    if (key) {
      if (!isEmpty(title)) {
        result.title = title.text;
      } else if (!isEmpty(img)) {
        result[key] = {
          url: img.url,
          height: img.h,
          width: img.w
        };
      } else if (!isEmpty(data)) {
        result[key] = data.value;
      }
    }
  });

  return result;
}
