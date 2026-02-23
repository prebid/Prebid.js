import { uniques, flatten, deepSetValue } from '../src/utils.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, VIDEO } from '../src/mediaTypes.js';
import { ajax } from '../src/ajax.js';
import { ortbConverter } from '../libraries/ortbConverter/converter.js';

/**
 * @typedef {import('../src/adapters/bidderFactory.js').BidRequest} BidRequest
 * @typedef {import('../src/adapters/bidderFactory.js').Bid} Bid
 * @typedef {import('../src/adapters/bidderFactory.js').ServerResponse} ServerResponse
 */

const BIDDER_CODE = 'limelightDigital';
const DEFAULT_NET_REVENUE = true;
const DEFAULT_TTL = 300;
const MTYPE_MAP = { 1: BANNER, 2: VIDEO };

/**
 * Determines whether or not the given bid response is valid.
 *
 * @param {object} bid The bid to validate.
 * @return boolean True if this is a valid bid, and false otherwise.
 */
function isBidResponseValid(bid) {
  if (!bid.requestId || !bid.cpm || !bid.creativeId || !bid.ttl || !bid.currency || !bid.meta.advertiserDomains) {
    return false;
  }
  switch (bid.mediaType) {
    case BANNER:
      return Boolean(bid.width && bid.height && bid.ad);
    case VIDEO:
      return Boolean(bid.vastXml || bid.vastUrl);
  }
  return false;
}

const converter = ortbConverter({
  context: {
    netRevenue: DEFAULT_NET_REVENUE,
    ttl: DEFAULT_TTL
  },
  imp(buildImp, bidRequest, context) {
    const imp = buildImp(bidRequest, context);
    for (let i = 1; i <= 5; i++) {
      const customValue = bidRequest.params[`custom${i}`];
      if (customValue !== undefined) {
        deepSetValue(imp, `ext.c${i}`, customValue);
      }
    }
    deepSetValue(imp, `ext.adUnitId`, bidRequest.params.adUnitId);
    return imp;
  },
  bidResponse(buildBidResponse, bid, context) {
    let mediaType;
    if (bid.mtype) {
      mediaType = MTYPE_MAP[bid.mtype];
    }
    if (!mediaType && bid.ext?.mediaType) {
      mediaType = bid.ext.mediaType;
    }
    if (!mediaType && context.imp) {
      if (context.imp.banner) mediaType = BANNER;
      else if (context.imp.video) mediaType = VIDEO;
    }
    if (mediaType) {
      context.mediaType = mediaType;
    }
    return buildBidResponse(bid, context);
  }
});

export const spec = {
  code: BIDDER_CODE,
  aliases: [
    { code: 'pll' },
    { code: 'iionads', gvlid: 1358 },
    { code: 'apester' },
    { code: 'adsyield' },
    { code: 'tgm' },
    { code: 'adtg_org' },
    { code: 'velonium' },
    { code: 'orangeclickmedia', gvlid: 1148 },
    { code: 'streamvision' },
    { code: 'stellorMediaRtb' },
    { code: 'smootai' },
    { code: 'anzuExchange' },
    { code: 'adnimation' },
    { code: 'rtbdemand' },
    { code: 'altstar' },
    { code: 'vaayaMedia' },
    { code: 'performist' },
    { code: 'oveeo' }
  ],
  supportedMediaTypes: [BANNER, VIDEO],

  /**
   * Determines whether or not the given bid request is valid.
   *
   * @param {BidRequest} bid The bid params to validate.
   * @return boolean True if this is a valid bid, and false otherwise.
   */
  isBidRequestValid: (bid) => {
    return Boolean(bid.bidId && bid.params && bid.params.host && bid.params.adUnitType &&
      (bid.params.adUnitId || bid.params.adUnitId === 0));
  },

  /**
   * Make a server request from the list of BidRequests using OpenRTB format.
   *
   * @param {BidRequest[]} validBidRequests - Array of valid bid requests
   * @param {Object} bidderRequest - The bidder request object
   * @return {Object[]} Array of server requests
   */
  buildRequests: (validBidRequests, bidderRequest) => {
    const normalizedBids = validBidRequests.map(bid => {
      const adUnitType = bid.params.adUnitType || BANNER
      if (!bid.mediaTypes && bid.sizes) {
        if (adUnitType === BANNER) {
          return { ...bid, mediaTypes: { banner: { sizes: bid.sizes } } };
        } else {
          return { ...bid, mediaTypes: { video: { playerSize: bid.sizes } } };
        }
      }
      if (bid.mediaTypes && bid.sizes) {
        const mediaTypes = { ...bid.mediaTypes };
        if (adUnitType === BANNER && mediaTypes.banner) {
          mediaTypes.banner = {
            ...mediaTypes.banner,
            sizes: (mediaTypes.banner.sizes || []).concat(bid.sizes)
          };
        }
        if (adUnitType === VIDEO && mediaTypes.video) {
          mediaTypes.video = {
            ...mediaTypes.video,
            playerSize: (mediaTypes.video.playerSize || []).concat(bid.sizes)
          };
        }
        return { ...bid, mediaTypes };
      }
      return bid;
    });
    const bidRequestsByHost = normalizedBids.reduce((groups, bid) => {
      const host = bid.params.host;
      groups[host] = groups[host] || [];
      groups[host].push(bid);
      return groups;
    }, {});
    const enrichedBidderRequest = {
      ...bidderRequest,
      ortb2: {
        ...bidderRequest.ortb2,
        site: {
          ...bidderRequest.ortb2?.site,
          page: bidderRequest.ortb2?.site?.page || bidderRequest.refererInfo?.page
        }
      }
    };

    return Object.entries(bidRequestsByHost).map(([host, bids]) => ({
      method: 'POST',
      url: `https://${host}/ortbhb`,
      data: converter.toORTB({ bidRequests: bids, bidderRequest: enrichedBidderRequest })
    }));
  },

  /**
   * Register bidder specific code, which will execute if a bid from this bidder won the auction
   * @param {Object} bid The bid that won the auction
   */
  onBidWon: (bid) => {
    const cpm = bid.pbMg;
    if (bid.nurl !== '') {
      bid.nurl = bid.nurl.replace(
        /\$\{AUCTION_PRICE\}/,
        cpm
      );
      ajax(bid.nurl, null);
    }
  },

  /**
   * Unpack the OpenRTB response from the server into a list of bids.
   *
   * @param {ServerResponse} response - A successful response from the server
   * @param {Object} request - The request object that was sent
   * @return {Bid[]} An array of bids
   */
  interpretResponse: (response, request) => {
    if (!response.body) {
      return [];
    }
    return converter.fromORTB({
      response: response.body,
      request: request.data
    }).bids.filter(bid => isBidResponseValid(bid));
  },

  getUserSyncs: (syncOptions, serverResponses, gdprConsent, uspConsent) => {
    const iframeSyncs = [];
    const imageSyncs = [];
    for (let i = 0; i < serverResponses.length; i++) {
      const serverResponseHeaders = serverResponses[i].headers;
      const imgSync = (serverResponseHeaders != null && syncOptions.pixelEnabled) ? serverResponseHeaders.get('x-pll-usersync-image') : null
      const iframeSync = (serverResponseHeaders != null && syncOptions.iframeEnabled) ? serverResponseHeaders.get('x-pll-usersync-iframe') : null
      if (iframeSync != null) {
        iframeSyncs.push(iframeSync)
      } else if (imgSync != null) {
        imageSyncs.push(imgSync)
      }
    }
    return [iframeSyncs.filter(uniques).map(it => { return { type: 'iframe', url: it } }),
      imageSyncs.filter(uniques).map(it => { return { type: 'image', url: it } })].reduce(flatten, []).filter(uniques);
  }
};

registerBidder(spec);
