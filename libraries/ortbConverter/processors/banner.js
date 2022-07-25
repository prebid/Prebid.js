import {createTrackPixelHtml, deepAccess, inIframe, mergeDeep, parseSizesInput} from '../../../src/utils.js';
import {BANNER} from '../../../src/mediaTypes.js';

/**
 * fill in a request `imp` with banner parameters from `bidRequest`.
 */
export function fillBannerImp(imp, bidRequest) {
  const bannerParams = deepAccess(bidRequest, 'mediaTypes.banner');
  if (bannerParams && bannerParams.sizes) {
    const sizes = parseSizesInput(bannerParams.sizes);

    // get banner sizes in form [{ w: <int>, h: <int> }, ...]
    const format = sizes.map(size => {
      const [width, height] = size.split('x');
      return {
        w: parseInt(width, 10),
        h: parseInt(height, 10)
      };
    });

    const banner = {format, topframe: inIframe() === true ? 0 : 1};

    if (bannerParams.hasOwnProperty('pos')) {
      banner.pos = bannerParams.pos;
    }

    // TODO: there are other properties we could set, such as topframe
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
