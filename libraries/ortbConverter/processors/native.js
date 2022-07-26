// TODO: this was summarily moved here from pbsBidAdapter, is untested except indirectly through it,
//  and waiting for  https://github.com/prebid/Prebid.js/pull/8086

import {cleanObj, deepAccess, isNumber, isPlainObject, logError} from '../../../src/utils.js';
import {NATIVE} from '../../../src/mediaTypes.js';
import {nativeMapper} from '../../../src/native.js';

const nativeImgIdMap = {
  icon: 1,
  image: 3
};

// https://iabtechlab.com/wp-content/uploads/2016/07/OpenRTB-Native-Ads-Specification-Final-1.2.pdf#page=40
const nativeDataIdMap = {
  sponsoredBy: 1, // sponsored
  body: 2, // desc
  rating: 3,
  likes: 4,
  downloads: 5,
  price: 6,
  salePrice: 7,
  phone: 8,
  address: 9,
  body2: 10, // desc2
  cta: 12 // ctatext
};

const nativeEventTrackerMethodMap = {
  img: 1,
  js: 2
};

const nativeEventTrackerEventMap = {
  impression: 1,
  'viewable-mrc50': 2,
  'viewable-mrc100': 3,
  'viewable-video50': 4,
};

if (FEATURES.NATIVE) {
  // enable reverse lookup
  [
    nativeDataIdMap,
    nativeImgIdMap,
    nativeEventTrackerEventMap,
    nativeEventTrackerMethodMap
  ].forEach(map => {
    Object.keys(map).forEach(key => {
      map[map[key]] = key;
    });
  });
}

export function fillNativeImp(imp, bidRequest, context) {
  const nativeParams = bidRequest.nativeParams;
  let nativeAssets = deepAccess(nativeParams, 'ortb.assets');
  if (nativeParams && !nativeAssets) {
    let idCounter = -1;
    try {
      nativeAssets = Object.keys(nativeParams).reduce((assets, type) => {
        let params = nativeParams[type];

        function newAsset(obj) {
          idCounter++;
          return Object.assign({
            required: params.required ? 1 : 0,
            id: (isNumber(params.id)) ? idCounter = params.id : idCounter
          }, obj ? cleanObj(obj) : {});
        }

        switch (type) {
          case 'image':
          case 'icon':
            let imgTypeId = nativeImgIdMap[type];
            let asset = cleanObj({
              type: imgTypeId,
              w: deepAccess(params, 'sizes.0'),
              h: deepAccess(params, 'sizes.1'),
              wmin: deepAccess(params, 'aspect_ratios.0.min_width'),
              hmin: deepAccess(params, 'aspect_ratios.0.min_height')
            });
            if (!((asset.w && asset.h) || (asset.hmin && asset.wmin))) {
              throw 'invalid img sizes (must provide sizes or min_height & min_width if using aspect_ratios)';
            }
            if (Array.isArray(params.aspect_ratios)) {
              // pass aspect_ratios as ext data I guess?
              const aspectRatios = params.aspect_ratios
                .filter((ar) => ar.ratio_width && ar.ratio_height)
                .map(ratio => `${ratio.ratio_width}:${ratio.ratio_height}`);
              if (aspectRatios.length > 0) {
                asset.ext = {
                  aspectratios: aspectRatios
                };
              }
            }
            assets.push(newAsset({
              img: asset
            }));
            break;
          case 'title':
            if (!params.len) {
              throw 'invalid title.len';
            }
            assets.push(newAsset({
              title: {
                len: params.len
              }
            }));
            break;
          default:
            let dataAssetTypeId = nativeDataIdMap[type];
            if (dataAssetTypeId) {
              assets.push(newAsset({
                data: {
                  type: dataAssetTypeId,
                  len: params.len
                }
              }));
            }
        }
        return assets;
      }, []);
    } catch (e) {
      logError('error creating native request: ' + String(e));
    }
  }
  if (nativeAssets) {
    const defaultRequest = {
      // TODO: determine best way to pass these and if we allow defaults
      context: 1,
      plcmttype: 1,
      eventtrackers: [
        {event: 1, methods: [1]}
      ],
      // TODO: figure out how to support privacy field
      // privacy: int
      assets: nativeAssets
    };
    const ortbRequest = deepAccess(nativeParams, 'ortb');
    try {
      const request = ortbRequest ? Object.assign(defaultRequest, ortbRequest) : defaultRequest;
      imp.native = {
        request: JSON.stringify(request),
        ver: '1.2'
      };
      context.nativeRequest = request;
    } catch (e) {
      logError('error creating native request: ' + String(e));
    }
  }
}

export function populateNativeMapper(imp, bidRequest, context) {
  // saving the converted ortb native request into the native mapper, so the Universal Creative
  // can render the native ad directly.
  nativeMapper.set(bidRequest.bidId, context.nativeRequest)
}

export function fillNativeResponse(bidObject, bid, context) {
  if (bidObject.mediaType === NATIVE) {
    let ortb;
    if (typeof bid.adm === 'string') {
      ortb = bidObject.adm = JSON.parse(bid.adm);
    } else {
      ortb = bidObject.adm = bid.adm;
    }

    // ortb.imptrackers and ortb.jstracker are going to be deprecated. So, when we find
    // those properties, we're creating the equivalent eventtrackers and let prebid universal
    //  creative deal with it
    for (const imptracker of ortb.imptrackers || []) {
      ortb.eventtrackers.push({
        event: nativeEventTrackerEventMap.impression,
        method: nativeEventTrackerMethodMap.img,
        url: imptracker
      })
    }
    if (ortb.jstracker) {
      ortb.eventtrackers.push({
        event: nativeEventTrackerEventMap.impression,
        method: nativeEventTrackerMethodMap.js,
        url: ortb.jstracker
      })
    }

    if (isPlainObject(ortb) && Array.isArray(ortb.assets)) {
      bidObject.native = {
        ortb,
      }
    } else {
      logError('prebid server native response contained no assets');
    }
  }
}
