import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER } from '../src/mediaTypes.js';
import { isBidRequestValid } from '../libraries/teqblazeUtils/bidderUtils.js';
import { ortbConverter } from '../libraries/ortbConverter/converter.js';

const BIDDER_CODE = 'adbro';
const GVLID = 1316;
const ENDPOINT_URL = 'https://jp.bidbro.me/pbjs';

const updateBannerImp = (bannerObj, adSlot) => {
  const slot = adSlot.split(':');
  let splits = slot[0]?.split('@');
  splits = splits?.length == 2 ? splits[1].split('x') : splits.length == 3 ? splits[2].split('x') : [];
  const primarySize = bannerObj.format[0];
  if (splits.length !== 2 || (parseInt(splits[0]) == 0 && parseInt(splits[1]) == 0)) {
    bannerObj.w = primarySize.w;
    bannerObj.h = primarySize.h;
  } else {
    bannerObj.w = parseInt(splits[0]);
    bannerObj.h = parseInt(splits[1]);
  }

  bannerObj.format = bannerObj.format.filter(
    (item) => !(item.w === bannerObj.w && item.h === bannerObj.h)
  );
  if (!bannerObj.format?.length) delete bannerObj.format;
  bannerObj.pos ??= 0;
}

const setImpTagId = (imp, adSlot, hashedKey) => {
  const splits = adSlot.split(':')[0].split('@');
  imp.tagid = hashedKey || splits[0];
}

const converter = ortbConverter({
  context: {
    netRevenue: true,
    ttl: 30,
    mediaType: BANNER,
    currency: 'USD',
  },
  imp(buildImp, bidRequest, context) {
    const { adSlot = '', hashedKey } = bidRequest.params;
    const imp = buildImp(bidRequest, context);
    if (!imp.hasOwnProperty('banner')) return null;

    imp.displaymanager ||= 'Prebid.js';
    imp.displaymanagerver ||= '$prebid.version$';
    setImpTagId(imp, adSlot.trim(), hashedKey);
    updateBannerImp(imp.banner, adSlot);

    return imp;
  },
});

export const spec = {
  code: BIDDER_CODE,
  gvlid: GVLID,
  supportedMediaTypes: [BANNER],
  isBidRequestValid: isBidRequestValid(),
  onError: console.error,
  buildRequests(bidRequests, bidderRequest) {
    const placementId = bidRequests[0].params.placementId;
    const data = converter.toORTB({bidRequests, bidderRequest});
    data.device.js = 1;
    return [{
      method: 'POST',
      url: ENDPOINT_URL + '?placementId=' + placementId,
      data
    }];
  },
  interpretResponse(response, request) {
    response.body.seatbid.forEach(sb => sb.bid.forEach(bid => {
      bid.crid = 'test-prebidjs-adbro.com';
      bid.adomain = ['adbro.com'];
      bid.price = 0.1;
    }));
    const result = converter.fromORTB({request: request.data, response: response.body}).bids;
    return result;
  },
};

registerBidder(spec);
