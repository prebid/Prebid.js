import { isEmpty, parseUrl, isStr, triggerPixel } from '../src/utils.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, NATIVE, VIDEO } from '../src/mediaTypes.js';
import { config } from '../src/config.js';
import { createNativeRequest, createBannerRequest, createVideoRequest, parseNative } from '../libraries/braveUtils/index.js';

/**
 * @typedef {import('../src/adapters/bidderFactory.js').BidRequest} BidRequest
 * @typedef {import('../src/adapters/bidderFactory.js').Bid} Bid
 */

const BIDDER_CODE = 'videoheroes';
const DEFAULT_CUR = 'USD';
const ENDPOINT_URL = `https://point.contextualadv.com/?t=2&partner=hash`;

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER, VIDEO, NATIVE],

  isBidRequestValid: (bid) => {
    return !!(bid.params.placementId && bid.params.placementId.toString().length === 32);
  },

  buildRequests: (validBidRequests, bidderRequest) => {
    validBidRequests = convertOrtbRequestToProprietaryNative(validBidRequests);
    if (!validBidRequests.length || !bidderRequest) return [];

    const endpointURL = ENDPOINT_URL.replace('hash', validBidRequests[0].params.placementId);

    let imp = validBidRequests.map((br) => {
      let impObject = { id: br.bidId, secure: 1 };
      if (br.mediaTypes.banner) impObject.banner = createBannerRequest(br);
      else if (br.mediaTypes.video) impObject.video = createVideoRequest(br);
      else if (br.mediaTypes.native) impObject.native = { id: br.transactionId, ver: '1.2', request: createNativeRequest(br) };
      return impObject;
    });

    let page = bidderRequest.refererInfo.page || bidderRequest.refererInfo.topmostLocation;

    let data = {
      id: bidderRequest.bidderRequestId,
      cur: [DEFAULT_CUR],
      device: { w: screen.width, h: screen.height, language: navigator.language?.split('-')[0], ua: navigator.userAgent },
      site: { domain: parseUrl(page).hostname, page: page },
      tmax: bidderRequest.timeout,
      imp,
    };

    if (bidderRequest.refererInfo.ref) data.site.ref = bidderRequest.refererInfo.ref;

    if (bidderRequest.gdprConsent) {
      data['regs'] = {'ext': {'gdpr': bidderRequest.gdprConsent.gdprApplies ? 1 : 0}};
      data['user'] = {'ext': {'consent': bidderRequest.gdprConsent.consentString ? bidderRequest.gdprConsent.consentString : ''}};
    }

    if (bidderRequest.uspConsent !== undefined) {
      if (!data['regs'])data['regs'] = {'ext': {}};
      data['regs']['ext']['us_privacy'] = bidderRequest.uspConsent;
    }

    if (config.getConfig('coppa') === true) {
      if (!data['regs'])data['regs'] = {'coppa': 1};
      else data['regs']['coppa'] = 1;
    }

    if (validBidRequests[0].schain) {
      data['source'] = {'ext': {'schain': validBidRequests[0].schain}};
    }

    return { method: 'POST', url: endpointURL, data: data };
  },

  interpretResponse: (serverResponse) => {
    if (!serverResponse || isEmpty(serverResponse.body)) return [];
    return serverResponse.body.seatbid.flatMap((response) => response.bid.map((bid) => {
      const bidObj = { requestId: bid.impid, cpm: bid.price, width: bid.w, height: bid.h, ttl: 1200, currency: DEFAULT_CUR, netRevenue: true, creativeId: bid.crid, dealId: bid.dealid || null };
      if (bid.ext?.mediaType === 'video') bidObj.vastUrl = bid.adm;
      else if (bid.ext?.mediaType === 'native') bidObj.native = parseNative(bid.adm);
      else bidObj.ad = bid.adm;
      return bidObj;
    }));
  },

  onBidWon: (bid) => { if (isStr(bid.nurl)) triggerPixel(bid.nurl); }
};

registerBidder(spec);
