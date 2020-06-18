import * as utils from '../src/utils';
import { registerBidder } from '../src/adapters/bidderFactory';
import { config } from '../src/config';
import { BANNER } from '../src/mediaTypes';

// TODO: Native, Video
const SUPPORTED_AD_TYPES = [BANNER];
const BIDDER_CODE = 'truereach';
const BIDDER_URL = '//ads.momagic.com/exchange/openrtb23/';
// TODO: Report version
// const BIDDER_VERSION = '1.0.0';

// Start
export const spec = {
  code: BIDDER_CODE,
  aliases: ['tr_dev', 'tr_test'],
  supportedMediaTypes: SUPPORTED_AD_TYPES,

  // 1- Verify the the AdUnits.bids, respond with true (valid) or false (invalid)
  isBidRequestValid: function (bidRequest) {
    return (bidRequest.params.site_id && utils.deepAccess(bidRequest, 'mediaTypes.banner') && (utils.deepAccess(bidRequest, 'mediaTypes.banner.sizes.length') > 0));
  },

  // 2- Takes an array of valid bid requests, all of which are guaranteed to have passed the isBidRequestValid() test
  buildRequests: function (validBidRequests, bidderRequest) {
    if (validBidRequests.length === 0) {
      return [];
    }

    let queryParams = buildCommonQueryParamsFromBids(validBidRequests, bidderRequest);

    // TODO: DoNotTrack
    // if (validBidRequests.some(bid => bid.params.doNotTrack)) {
    //   queryParams.ns = 1;
    // }

    // TODO: COPPA
    // if (config.getConfig('coppa') === true || validBidRequests.some(bid => bid.params.coppa)) {
    //   queryParams.tfcd = 1;
    // }

    let siteId = utils.deepAccess(validBidRequests[0], 'params.site_id');
    let bidderUrl = utils.deepAccess(validBidRequests[0], 'params.bidderUrl');

    let url = (bidderUrl || BIDDER_URL) + siteId + '?hb=1';

    return {
      method: 'POST',
      url: url,
      data: queryParams,
      options: { withCredentials: true },
      // Arnav: if alias name used
      bidderName: bidderRequest.bidderCode
    };
  },

  // 3- Parse the response and generate one or more bid objects.
  interpretResponse: function ({ body: serverResponse }, serverRequest) {
    const bidResponses = [];

    // valid object?
    if ((!serverResponse || !serverResponse.id) ||
      (!serverResponse.seatbid || serverResponse.seatbid.length === 0 || !serverResponse.seatbid[0].bid || serverResponse.seatbid[0].bid.length === 0)) {
      return bidResponses;
    }

    let adUnits = serverResponse.seatbid[0].bid;
    // pick only one
    let bidderBid = adUnits[0];

    let responseCPM = parseFloat(bidderBid.price);
    if (responseCPM === 0) {
      return bidResponses;
    }

    let responseAd = bidderBid.adm;

    // TODO: replace AUCTION_PRICE and AUCTION_ID (use bp?)   //p=${AUCTION_PRICE:OXCRYPT} aid=${AUCTION_ID}
    let responseNurl = '<img src="' + bidderBid.nurl + '" height="0px" width="0px">';

    const bidResponse = {
      // TODO: check bid_id
      requestId: bidderBid.impid,
      cpm: responseCPM,
      width: parseInt(bidderBid.w),
      height: parseInt(bidderBid.h),
      creativeId: bidderBid.crid,
      // dealId: optional,
      currency: 'USD',
      // TODO: true is net, false is gross?
      netRevenue: true,
      // TODO: in sec
      ttl: 300,
      ad: decodeURIComponent(responseAd + responseNurl),

      // if alias name used
      bidderCode: serverRequest.bidderName
      //      bidderCode: BIDDER_CODE
    };

    bidResponses.push(bidResponse);

    return bidResponses;
  },

  // TODO: 4- If the publisher allows user-sync activity, the platform will call this function and the adapter may register pixels and/or iframe user syncs.
  //  getUserSyncs: function (syncOptions, responses, gdprConsent, uspConsent) {
  //    if (syncOptions.iframeEnabled || syncOptions.pixelEnabled) {
  //      let pixelType = syncOptions.iframeEnabled ? 'iframe' : 'image';
  //      let url = utils.deepAccess(responses, '0.body.ads.pixels') ||
  //        utils.deepAccess(responses, '0.body.pixels') ||
  //        generateDefaultSyncUrl(gdprConsent, uspConsent);
  //
  //      return [{
  //        type: pixelType,
  //        url: url
  //      }];
  //    }
  //  },

  // TODO: 5- onTimeout - If the adapter timed out for an auction, the platform will call this function and the adapter may register timeout.
  // onTimeout: function(timeoutData) {},

  // TODO: 6-
  // onBidWon: function(bid) {},

  // TODO: 7-
  // onSetTargeting: function(bid) {}

  transformBidParams: function (params, isOpenRtb) {
    return utils.convertTypes({
      'site_id': 'string'
    }, params);
  }
};

// function generateDefaultSyncUrl(gdprConsent, uspConsent) {
//  let url = 'https://u.openx.net/w/1.0/pd';
//  let queryParamStrings = [];
//
//  if (gdprConsent) {
//    queryParamStrings.push('gdpr=' + (gdprConsent.gdprApplies ? 1 : 0));
//    queryParamStrings.push('gdpr_consent=' + encodeURIComponent(gdprConsent.consentString || ''));
//  }
//
//  // CCPA
//  if (uspConsent) {
//    queryParamStrings.push('us_privacy=' + encodeURIComponent(uspConsent));
//  }
//
//  return `${url}${queryParamStrings.length > 0 ? '?' + queryParamStrings.join('&') : ''}`;
// }

// 2.1- build bid request object
function buildCommonQueryParamsFromBids(validBidRequests, bidderRequest) {
  let adW = 0;
  let adH = 0;
  let adSizes = Array.isArray(validBidRequests[0].params.sizes) ? validBidRequests[0].params.sizes : validBidRequests[0].sizes;
  let sizeArrayLength = adSizes.length;
  if (sizeArrayLength === 2 && typeof adSizes[0] === 'number' && typeof adSizes[1] === 'number') {
    adW = adSizes[0];
    adH = adSizes[1];
  } else {
    adW = adSizes[0][0];
    adH = adSizes[0][1];
  }

  let bidFloor = Number(utils.deepAccess(validBidRequests[0], 'params.bidfloor'));

  // TODO: Referrer information is included on the bidderRequest.refererInfo property
  let domain = window.location.host;
  let page = window.location.host + window.location.pathname + location.search + location.hash;

  // TODO:  Transaction ID: bidderRequest.bids[].transactionId should be sent to your server and forwarded to any Demand Side Platforms your server communicates with.

  let defaultParams = {
    id: utils.getUniqueIdentifierStr(),
    imp: [
      {
        id: validBidRequests[0].bidId,
        banner: {
          w: adW,
          h: adH
        },
        bidfloor: bidFloor
      }
    ],
    site: {
      domain: domain,
      page: page
    },
    device: {
      ua: window.navigator.userAgent
    },
    tmax:config.getConfig('bidderTimeout')
  };

  // TODO: GDPR
  // if (bidderRequest.gdprConsent) {
  //   let gdprConsentConfig = bidderRequest.gdprConsent;

  //   if (gdprConsentConfig.consentString !== undefined) {
  //     defaultParams.gdpr_consent = gdprConsentConfig.consentString;
  //   }

  //   if (gdprConsentConfig.gdprApplies !== undefined) {
  //     defaultParams.gdpr = gdprConsentConfig.gdprApplies ? 1 : 0;
  //   }

  //   if (config.getConfig('consentManagement.cmpApi') === 'iab') {
  //     defaultParams.x_gdpr_f = 1;
  //   }
  // }

  // TODO: US privacy
  // if (bidderRequest && bidderRequest.uspConsent) {
  //   defaultParams.us_privacy = bidderRequest.uspConsent;
  // }

  // TODO: supply chain support
  // if (validBidRequests[0].schain) {
  //   defaultParams.schain = serializeSupplyChain(validBidRequests[0].schain);
  // }

  return defaultParams;
}

// function appendUserIdsToQueryParams(queryParams, userIds) {
//   utils._each(userIds, (userIdValue, userIdProviderKey) => {
//     if (USER_ID_CODE_TO_QUERY_ARG.hasOwnProperty(userIdProviderKey)) {
//       queryParams[USER_ID_CODE_TO_QUERY_ARG[userIdProviderKey]] = userIdValue;
//     }
//   });
//   return queryParams;
// }

// function serializeSupplyChain(supplyChain) {
//   return `${supplyChain.ver},${supplyChain.complete}!${serializeSupplyChainNodes(supplyChain.nodes)}`;
// }

// function serializeSupplyChainNodes(supplyChainNodes) {
//   const supplyChainNodePropertyOrder = ['asi', 'sid', 'hp', 'rid', 'name', 'domain'];

//   return supplyChainNodes.map(supplyChainNode => {
//     return supplyChainNodePropertyOrder.map(property => supplyChainNode[property] || '')
//       .join(',');
//   }).join('!');
// }

// final
registerBidder(spec);
