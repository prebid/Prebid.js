import * as utils from '../src/utils';
import {registerBidder} from '../src/adapters/bidderFactory';
const BIDDER_CODE = 'danmarket';
const ENDPOINT_URL = 'https://ads.danmarketplace.com/hb';
const TIME_TO_LIVE = 360;
const ADAPTER_SYNC_URL = 'https://ads.danmarketplace.com/push_sync';
const LOG_ERROR_MESS = {
  noAuid: 'Bid from response has no auid parameter - ',
  noAdm: 'Bid from response has no adm parameter - ',
  noBid: 'Array of bid objects is empty',
  noPlacementCode: 'Can\'t find in requested bids the bid with auid - ',
  emptyUids: 'Uids should be not empty',
  emptySeatbid: 'Seatbid array from response has empty item',
  emptyResponse: 'Response is empty',
  hasEmptySeatbidArray: 'Response has empty seatbid array',
  hasNoArrayOfBids: 'Seatbid from response has no array of bid objects - '
};

/**
 * Dentsu Aegis Network Marketplace Bid Adapter.
 * Contact: niels@baarsma.net
 *
 */
export const spec = {
  code: BIDDER_CODE,

  aliases: ['DANMarketplace', 'DAN_Marketplace', 'danmarketplace'],

  isBidRequestValid: function(bid) {
    return !!bid.params.uid;
  },

  buildRequests: function(validBidRequests, bidderRequest) {
    const auids = [];
    const bidsMap = {};
    const bids = validBidRequests || [];
    let priceType = 'net';
    let reqId;

    bids.forEach(bid => {
      if (bid.params.priceType === 'gross') {
        priceType = 'gross';
      }
      if (!bidsMap[bid.params.uid]) {
        bidsMap[bid.params.uid] = [bid];
        auids.push(bid.params.uid);
      } else {
        bidsMap[bid.params.uid].push(bid);
      }
      reqId = bid.bidderRequestId;
    });

    const payload = {
      u: utils.getTopWindowUrl(),
      pt: priceType,
      auids: auids.join(','),
      r: reqId,
    };

    if (bidderRequest && bidderRequest.gdprConsent) {
      if (bidderRequest.gdprConsent.consentString) {
        payload.gdpr_consent = bidderRequest.gdprConsent.consentString;
      }
      payload.gdpr_applies =
        (typeof bidderRequest.gdprConsent.gdprApplies === 'boolean')
          ? Number(bidderRequest.gdprConsent.gdprApplies) : 1;
    }

    return {
      method: 'GET',
      url: ENDPOINT_URL,
      data: payload,
      bidsMap: bidsMap,
    };
  },

  interpretResponse: function(serverResponse, bidRequest) {
    serverResponse = serverResponse && serverResponse.body
    const bidResponses = [];
    const bidsMap = bidRequest.bidsMap;
    const priceType = bidRequest.data.pt;

    let errorMessage;

    if (!serverResponse) errorMessage = LOG_ERROR_MESS.emptyResponse;
    else if (serverResponse.seatbid && !serverResponse.seatbid.length) {
      errorMessage = LOG_ERROR_MESS.hasEmptySeatbidArray;
    }

    if (!errorMessage && serverResponse.seatbid) {
      serverResponse.seatbid.forEach(respItem => {
        _addBidResponse(_getBidFromResponse(respItem), bidsMap, priceType, bidResponses);
      });
    }
    if (errorMessage) utils.logError(errorMessage);
    return bidResponses;
  },

  getUserSyncs: function(syncOptions, serverResponses, gdprConsent) {
    if (syncOptions.pixelEnabled) {
      var query = [];
      if (gdprConsent) {
        if (gdprConsent.consentString) {
          query.push('gdpr_consent=' + encodeURIComponent(gdprConsent.consentString));
        }
        query.push('gdpr_applies=' + encodeURIComponent(
          (typeof gdprConsent.gdprApplies === 'boolean')
            ? Number(gdprConsent.gdprApplies) : 1));
      }
      return [{
        type: 'image',
        url: ADAPTER_SYNC_URL + (query.length ? '?' + query.join('&') : '')
      }];
    }
  }
}

function _getBidFromResponse(respItem) {
  if (!respItem) {
    utils.logError(LOG_ERROR_MESS.emptySeatbid);
  } else if (!respItem.bid) {
    utils.logError(LOG_ERROR_MESS.hasNoArrayOfBids + JSON.stringify(respItem));
  } else if (!respItem.bid[0]) {
    utils.logError(LOG_ERROR_MESS.noBid);
  }
  return respItem && respItem.bid && respItem.bid[0];
}

function _addBidResponse(serverBid, bidsMap, priceType, bidResponses) {
  if (!serverBid) return;
  let errorMessage;
  if (!serverBid.auid) errorMessage = LOG_ERROR_MESS.noAuid + JSON.stringify(serverBid);
  if (!serverBid.adm) errorMessage = LOG_ERROR_MESS.noAdm + JSON.stringify(serverBid);
  else {
    const awaitingBids = bidsMap[serverBid.auid];
    if (awaitingBids) {
      awaitingBids.forEach(bid => {
        const bidResponse = {
          requestId: bid.bidId, // bid.bidderRequestId,
          cpm: serverBid.price,
          width: serverBid.w,
          height: serverBid.h,
          creativeId: serverBid.auid, // bid.bidId,
          currency: 'USD',
          netRevenue: priceType !== 'gross',
          ttl: TIME_TO_LIVE,
          ad: serverBid.adm,
          dealId: serverBid.dealid
        };
        bidResponses.push(bidResponse);
      });
    } else {
      errorMessage = LOG_ERROR_MESS.noPlacementCode + serverBid.auid;
    }
  }
  if (errorMessage) {
    utils.logError(errorMessage);
  }
}

registerBidder(spec);
