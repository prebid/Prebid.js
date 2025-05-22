import { logMessage, groupBy, flatten, uniques } from '../src/utils.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, VIDEO } from '../src/mediaTypes.js';
import { ajax } from '../src/ajax.js';

/**
 * @typedef {import('../src/adapters/bidderFactory.js').BidRequest} BidRequest
 * @typedef {import('../src/adapters/bidderFactory.js').Bid} Bid
 * @typedef {import('../src/adapters/bidderFactory.js').ServerResponse} ServerResponse
 */

const BIDDER_CODE = 'vdoai';

/**
 * Determines whether or not the given bid response is valid.
 *
 * @param {object} vdoresponse The bid to validate.
 * @return boolean True if this is a valid bid, and false otherwise.
 */
function vdoIsBidResponseValid(vdoresponse) {
  if (!vdoresponse.requestId || !vdoresponse.cpm || !vdoresponse.creativeId || !vdoresponse.ttl || !vdoresponse.currency || !vdoresponse.meta.advertiserDomains) {
    return false;
  }
  switch (vdoresponse.meta.mediaType) {
    case BANNER:
      return Boolean(vdoresponse.width && vdoresponse.height && vdoresponse.ad);
    case VIDEO:
      return Boolean(vdoresponse.vastXml || vdoresponse.vastUrl);
  }
  return false;
}

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER, VIDEO],

  /**
   * Determines whether or not the given bid request is valid.
   *
   * @param {BidRequest} vdobid The bid params to validate.
   * @return boolean True if this is a valid bid, and false otherwise.
   */
  isBidRequestValid: (vdobid) => {
    logMessage('vdobid', vdobid);
    return Boolean(vdobid.bidId && vdobid.params && vdobid.params.host && vdobid.params.adUnitType &&
      (vdobid.params.adUnitId || vdobid.params.adUnitId === 0));
  },

  /**
   * Make a server request from the list of BidRequests.
   *
   * @return ServerRequest Info describing the request to the server.
   */
  buildRequests: (vdoValidBidRequests, bidderRequest) => {
    let winTop;
    try {
      winTop = window.top;
      winTop.location.toString();
    } catch (e) {
      logMessage(e);
      winTop = window;
    }
    const placements = groupBy(vdoValidBidRequests.map(bidRequest => vdoBuildPlacement(bidRequest)), 'host')
    return Object.keys(placements)
      .map(host => vdoBuildRequest(winTop, host, placements[host].map(placement => placement.adUnit), bidderRequest));
  },

  /**
   * Register bidder specific code, which will execute if a bid from this bidder won the auction
   * @param {Bid} vdobid The bid that won the auction
   */
  onBidWon: (vdobid) => {
    const cpm = vdobid.pbMg;
    if (vdobid.nurl !== '') {
      vdobid.nurl = vdobid.nurl.replace(
        /\$\{AUCTION_PRICE\}/,
        cpm
      );
      ajax(vdobid.nurl, null);
    }
  },

  /**
   * Unpack the response from the server into a list of bids.
   *
   * @param {ServerResponse} vdoServerResponse A successful response from the server.
   * @return {Bid[]} An array of bids which were nested inside the server.
   */
  interpretResponse: (vdoServerResponse, vdoBidRequest) => {
    const bidResponses = [];
    const serverBody = vdoServerResponse.body;
    const len = serverBody.length;
    for (let i = 0; i < len; i++) {
      const bidResponse = serverBody[i];
      if (vdoIsBidResponseValid(bidResponse)) {
        bidResponses.push(bidResponse);
      }
    }
    return bidResponses;
  },

  getUserSyncs: (userSyncOptions, vdoServerResponses, userGdprConsent, UserUspConsent) => {
    const allIframeSyncs = [];
    const allImageSyncs = [];
    for (let i = 0; i < vdoServerResponses.length; i++) {
      const serverResponseHeaders = vdoServerResponses[i].headers;
      const vdoImgSync = (serverResponseHeaders != null && userSyncOptions.pixelEnabled) ? serverResponseHeaders.get('X-PLL-UserSync-Image') : null
      const vdoIframeSync = (serverResponseHeaders != null && userSyncOptions.iframeEnabled) ? serverResponseHeaders.get('X-PLL-UserSync-Iframe') : null
      if (vdoIframeSync != null) {
        allIframeSyncs.push(vdoIframeSync)
      } else if (vdoImgSync != null) {
        allImageSyncs.push(vdoImgSync)
      }
    }
    return [allIframeSyncs.filter(uniques).map(it => { return { type: 'iframe', url: it } }),
      allImageSyncs.filter(uniques).map(it => { return { type: 'image', url: it } })].reduce(flatten, []).filter(uniques);
  }
};

registerBidder(spec);

function vdoBuildRequest(windowTop, hostname, vdoAdUnits, bidderRequest) {
  return {
    url: `https://${hostname}/hb`,
    method: 'POST',
    data: {
      secure: (location.protocol === 'https:'),
      deviceWidth: windowTop.screen.width,
      deviceHeight: windowTop.screen.height,
      adUnits: vdoAdUnits,
      ortb2: bidderRequest?.ortb2,
      refererInfo: bidderRequest?.refererInfo,
      sua: bidderRequest?.ortb2?.device?.sua,
      page: bidderRequest?.ortb2?.site?.page || bidderRequest?.refererInfo?.page
    }
  }
}

function vdoBuildPlacement(vdoBidRequest) {
  let sizes;
  if (vdoBidRequest.mediaTypes) {
    switch (vdoBidRequest.params.adUnitType) {
      case BANNER:
        if (vdoBidRequest.mediaTypes.banner && vdoBidRequest.mediaTypes.banner.sizes) {
          sizes = vdoBidRequest.mediaTypes.banner.sizes;
        }
        break;
      case VIDEO:
        if (vdoBidRequest.mediaTypes.video && vdoBidRequest.mediaTypes.video.playerSize) {
          sizes = [vdoBidRequest.mediaTypes.video.playerSize];
        }
        break;
    }
  }
  sizes = (sizes || []).concat(vdoBidRequest.sizes || []);
  return {
    host: vdoBidRequest.params.host,
    adUnit: {
      id: vdoBidRequest.params.adUnitId,
      bidId: vdoBidRequest.bidId,
      transactionId: vdoBidRequest.ortb2Imp?.ext?.tid,
      sizes: sizes.map(size => {
        return {
          width: size[0],
          height: size[1]
        }
      }),
      type: vdoBidRequest.params.adUnitType.toUpperCase(),
      ortb2Imp: vdoBidRequest.ortb2Imp,
      publisherId: vdoBidRequest.params.publisherId,
      userIdAsEids: vdoBidRequest.userIdAsEids,
      supplyChain: vdoBidRequest.schain,
      custom1: vdoBidRequest.params.custom1,
      custom2: vdoBidRequest.params.custom2,
      custom3: vdoBidRequest.params.custom3,
      custom4: vdoBidRequest.params.custom4,
      custom5: vdoBidRequest.params.custom5
    }
  }
}
