import { deepAccess, isArray, logWarn, triggerPixel, buildUrl, logInfo, getValue, getBidIdParameter } from '../src/utils.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { config } from '../src/config.js';
const BIDDER_CODE = 'beop';
const ENDPOINT_URL = 'https://hb.beop.io/bid';
const TCF_VENDOR_ID = 666;

const validIdRegExp = /^[0-9a-fA-F]{24}$/

export const spec = {
  code: BIDDER_CODE,
  gvlid: TCF_VENDOR_ID,
  aliases: ['bp'],
  /**
    * Test if the bid request is valid.
    *
    * @param {bid} : The Bid params
    * @return boolean true if the bid request is valid (aka contains a valid accountId or networkId and is open for BANNER), false otherwise.
    */
  isBidRequestValid: function(bid) {
    const id = bid.params.accountId || bid.params.networkId;
    if (id === null || typeof id === 'undefined') {
      return false
    }
    if (!validIdRegExp.test(id)) {
      return false
    }
    return bid.mediaTypes.banner !== null && typeof bid.mediaTypes.banner !== 'undefined';
  },
  /**
    * Create a BeOp server request from a list of BidRequest
    *
    * @param {validBidRequests[], ...} : The array of validated bidRequests
    * @param {... , bidderRequest} : Common params for each bidRequests
    * @return ServerRequest Info describing the request to the BeOp's server
    */
  buildRequests: function(validBidRequests, bidderRequest) {
    const slots = validBidRequests.map(beOpRequestSlotsMaker);
    let pageUrl = deepAccess(window, 'location.href') || deepAccess(bidderRequest, 'refererInfo.canonicalUrl') || config.getConfig('pageUrl');
    let fpd = config.getLegacyFpd(config.getConfig('ortb2'));
    let gdpr = bidderRequest.gdprConsent;
    let firstSlot = slots[0];
    let payloadObject = {
      at: new Date().toString(),
      nid: firstSlot.nid,
      nptnid: firstSlot.nptnid,
      pid: firstSlot.pid,
      url: pageUrl,
      lang: (window.navigator.language || window.navigator.languages[0]),
      kwds: (fpd && fpd.site && fpd.site.keywords) || [],
      dbg: false,
      slts: slots,
      is_amp: deepAccess(bidderRequest, 'referrerInfo.isAmp'),
      tc_string: (gdpr && gdpr.gdprApplies) ? gdpr.consentString : null,
    };
    const payloadString = JSON.stringify(payloadObject);
    return {
      method: 'POST',
      url: ENDPOINT_URL,
      data: payloadString
    }
  },
  interpretResponse: function(serverResponse, request) {
    if (serverResponse && serverResponse.body && isArray(serverResponse.body.bids) && serverResponse.body.bids.length > 0) {
      return serverResponse.body.bids;
    }
    return [];
  },
  onTimeout: function(timeoutData) {
    if (timeoutData === null || typeof timeoutData === 'undefined' || Object.keys(timeoutData).length === 0) {
      return;
    }

    let trackingParams = buildTrackingParams(timeoutData, 'timeout', timeoutData.timeout);

    logWarn(BIDDER_CODE + ': timed out request');
    triggerPixel(buildUrl({
      protocol: 'https',
      hostname: 't.beop.io',
      pathname: '/bid',
      search: trackingParams
    }));
  },
  onBidWon: function(bid) {
    if (bid === null || typeof bid === 'undefined' || Object.keys(bid).length === 0) {
      return;
    }
    let trackingParams = buildTrackingParams(bid, 'won', bid.cpm);

    logInfo(BIDDER_CODE + ': won request');
    triggerPixel(buildUrl({
      protocol: 'https',
      hostname: 't.beop.io',
      pathname: '/bid',
      search: trackingParams
    }));
  },
  onSetTargeting: function(bid) {}
}

function buildTrackingParams(data, info, value) {
  const accountId = data.params.accountId;
  return {
    pid: accountId === undefined ? data.ad.match(/account: \“([a-f\d]{24})\“/)[1] : accountId,
    nid: data.params.networkId,
    nptnid: data.params.networkPartnerId,
    bid: data.bidId || data.requestId,
    sl_n: data.adUnitCode,
    aid: data.auctionId,
    se_ca: 'bid',
    se_ac: info,
    se_va: value,
    url: window.location.href
  };
}

function beOpRequestSlotsMaker(bid) {
  const bannerSizes = deepAccess(bid, 'mediaTypes.banner.sizes');
  const publisherCurrency = config.getConfig('currency.adServerCurrency') || getValue(bid.params, 'currency') || 'EUR';
  let floor;
  if (typeof bid.getFloor === 'function') {
    const floorInfo = bid.getFloor({currency: publisherCurrency, mediaType: 'banner', size: [1, 1]});
    if (typeof floorInfo === 'object' && floorInfo.currency === publisherCurrency && !isNaN(parseFloat(floorInfo.floor))) {
      floor = parseFloat(floorInfo.floor);
    }
  }
  return {
    sizes: isArray(bannerSizes) ? bannerSizes : bid.sizes,
    flr: floor,
    pid: getValue(bid.params, 'accountId'),
    nid: getValue(bid.params, 'networkId'),
    nptnid: getValue(bid.params, 'networkPartnerId'),
    bid: getBidIdParameter('bidId', bid),
    brid: getBidIdParameter('bidderRequestId', bid),
    name: getBidIdParameter('adUnitCode', bid),
    aid: getBidIdParameter('auctionId', bid),
    tid: getBidIdParameter('transactionId', bid),
    brc: getBidIdParameter('bidRequestsCount', bid),
    bdrc: getBidIdParameter('bidderRequestCount', bid),
    bwc: getBidIdParameter('bidderWinsCount', bid),
  }
}

registerBidder(spec);
