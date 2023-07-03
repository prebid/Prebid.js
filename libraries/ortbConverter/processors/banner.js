import {createTrackPixelHtml, deepAccess, inIframe, mergeDeep} from '../../../src/utils.js';
import {BANNER} from '../../../src/mediaTypes.js';
import {sizesToFormat} from '../lib/sizes.js';

/**
 * fill in a request `imp` with banner parameters from `bidRequest`.
 */
export function fillBannerImp(imp, bidRequest, context) {
  if (context.mediaType && context.mediaType !== BANNER) return;

  const bannerParams = deepAccess(bidRequest, 'mediaTypes.banner');
  if (bannerParams) {
    const banner = {
      topframe: inIframe() === true ? 0 : 1
    };
    if (bannerParams.sizes) {
      banner.format = sizesToFormat(bannerParams.sizes);
    }
    if (bannerParams.hasOwnProperty('pos')) {
      banner.pos = bannerParams.pos;
    }

    imp.banner = mergeDeep(banner, imp.banner);
  }
}

export function bannerResponseProcessor({createPixel = (url) => createTrackPixelHtml(decodeURIComponent(url))} = {}) {
  return function fillBannerResponse(bidResponse, bid) {
    if (bidResponse.mediaType === BANNER) {
      if (bid.adm && bid.nurl) {
        bidResponse.ad = bid.adm;
        bidResponse.ad += createPixel(bid.nurl);
      } else if (bid.adm) {
        bidResponse.ad = bid.adm;
      } else if (bid.nurl) {
        bidResponse.adUrl = bid.nurl;
      }
    }
  };
}
