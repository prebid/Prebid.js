import { deepAccess, logInfo } from '../../src/utils.js';
import { NATIVE } from '../../src/mediaTypes.js';
import { macroReplace } from './bidUtils.js';

const TTL = 55;
// Codes defined by OpenRTB Native Ads 1.1 specification
export const OPENRTB = {
  NATIVE: {
    IMAGE_TYPE: {
      ICON: 1,
      MAIN: 3,
    },
    ASSET_ID: {
      TITLE: 1,
      IMAGE: 2,
      ICON: 3,
      BODY: 4,
      SPONSORED: 5,
      CTA: 6
    },
    DATA_ASSET_TYPE: {
      SPONSORED: 1,
      DESC: 2,
      CTA_TEXT: 12,
    },
  }
};

/**
 * @param {object} serverBid Bid by OpenRTB 2.5 §4.2.3
 * @returns {object} Prebid native bidObject
 */
export function interpretNativeBid(serverBid) {
  return {
    requestId: serverBid.impid,
    mediaType: NATIVE,
    cpm: serverBid.price,
    creativeId: serverBid.adid || serverBid.crid,
    width: 1,
    height: 1,
    ttl: TTL,
    meta: {
      advertiserDomains: serverBid.adomain
    },
    netRevenue: true,
    currency: 'USD',
    // native: interpretNativeAd(serverBid.adm)
    native: interpretNativeAd(macroReplace(serverBid.adm, serverBid.price))
  }
}

/**
 * @param {string} adm JSON-encoded Request by OpenRTB Native Ads 1.1 §4.1
 * @returns {object} Prebid bidObject.native
 */

export function interpretNativeAd(adm) {
  try {
    const native = JSON.parse(adm).native;
    if (native) {
      const result = {
        clickUrl: encodeURI(native.link.url),
        impressionTrackers: native.imptrackers || native.eventtrackers[0].url,
      };
      if (native.link.clicktrackers) {
        result.clickTrackers = native.link.clicktrackers[0];
      }

      native.assets.forEach(asset => {
        switch (asset.id) {
          case OPENRTB.NATIVE.ASSET_ID.TITLE:
            result.title = deepAccess(asset, 'title.text');
            break;
          case OPENRTB.NATIVE.ASSET_ID.IMAGE:
            result.image = {
              url: encodeURI(asset.img.url),
              width: deepAccess(asset, 'img.w'),
              height: deepAccess(asset, 'img.h')
            };
            break;
          case OPENRTB.NATIVE.ASSET_ID.ICON:
            result.icon = {
              url: encodeURI(asset.img.url),
              width: deepAccess(asset, 'img.w'),
              height: deepAccess(asset, 'img.h')
            };
            break;
          case OPENRTB.NATIVE.ASSET_ID.BODY:
            result.body = deepAccess(asset, 'data.value');
            break;
          case OPENRTB.NATIVE.ASSET_ID.SPONSORED:
            result.sponsoredBy = deepAccess(asset, 'data.value');
            break;
          case OPENRTB.NATIVE.ASSET_ID.CTA:
            result.cta = deepAccess(asset, 'data.value');
            break;
        }
      });
      return result;
    }
  } catch (error) {
    logInfo('Error in bidUtils interpretNativeAd' + error);
  }
}
