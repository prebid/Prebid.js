// TODO: this was summarily moved here from pbsBidAdapter, is untested except indirectly through it,
//  and waiting for  https://github.com/prebid/Prebid.js/pull/8086

import {cleanObj, deepAccess, isNumber, isPlainObject, logError, pick} from '../../../src/utils.js';
import {NATIVE} from '../../../src/mediaTypes.js';
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

const nativeDataNames = Object.keys(nativeDataIdMap);

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
  if (nativeParams) {
    let idCounter = -1;
    let nativeAssets;
    try {
      nativeAssets = context.nativeAssets = Object.keys(nativeParams).reduce((assets, type) => {
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
    try {
      imp.native = {
        request: JSON.stringify({
          // TODO: determine best way to pass these and if we allow defaults
          context: 1,
          plcmttype: 1,
          eventtrackers: [
            {event: 1, methods: [1]}
          ],
          // TODO: figure out how to support privacy field
          // privacy: int
          assets: nativeAssets
        }),
        ver: '1.2'
      }
    } catch (e) {
      logError('error creating native request: ' + String(e))
    }
  }
}

export function fillNativeResponse(bidObject, bid, context) {
  if (bidObject.mediaType === NATIVE) {
    let adm;
    if (typeof bid.adm === 'string') {
      adm = bidObject.adm = JSON.parse(bid.adm);
    } else {
      adm = bidObject.adm = bid.adm;
    }

    let trackers = {
      [nativeEventTrackerMethodMap.img]: adm.imptrackers || [],
      [nativeEventTrackerMethodMap.js]: adm.jstracker ? [adm.jstracker] : []
    };
    if (adm.eventtrackers) {
      adm.eventtrackers.forEach(tracker => {
        switch (tracker.method) {
          case nativeEventTrackerMethodMap.img:
            trackers[nativeEventTrackerMethodMap.img].push(tracker.url);
            break;
          case nativeEventTrackerMethodMap.js:
            trackers[nativeEventTrackerMethodMap.js].push(tracker.url);
            break;
        }
      });
    }

    if (isPlainObject(adm) && Array.isArray(adm.assets)) {
      let origAssets = context.nativeAssets;
      bidObject.native = cleanObj(adm.assets.reduce((native, asset) => {
        let origAsset = origAssets[asset.id];
        if (isPlainObject(asset.img)) {
          native[origAsset.img.type ? nativeImgIdMap[origAsset.img.type] : 'image'] = pick(
            asset.img,
            ['url', 'w as width', 'h as height']
          );
        } else if (isPlainObject(asset.title)) {
          native['title'] = asset.title.text
        } else if (isPlainObject(asset.data)) {
          nativeDataNames.forEach(dataType => {
            if (nativeDataIdMap[dataType] === origAsset.data.type) {
              native[dataType] = asset.data.value;
            }
          });
        }
        return native;
      }, cleanObj({
        clickUrl: adm.link,
        clickTrackers: deepAccess(adm, 'link.clicktrackers'),
        impressionTrackers: trackers[nativeEventTrackerMethodMap.img],
        javascriptTrackers: trackers[nativeEventTrackerMethodMap.js]
      })));
    } else {
      logError('prebid server native response contained no assets');
    }
  }
}
