import * as utils from '../src/utils';
import {registerBidder} from '../src/adapters/bidderFactory';
import { config } from '../src/config';
const BIDDER_CODE = 'visx';
const ENDPOINT_URL = '//t.visx.net/hb';
const TIME_TO_LIVE = 360;
const DEFAULT_CUR = 'EUR';
const ADAPTER_SYNC_URL = '//t.visx.net/push_sync';
const LOG_ERROR_MESS = {
  noAuid: 'Bid from response has no auid parameter - ',
  noAdm: 'Bid from response has no adm parameter - ',
  noBid: 'Array of bid objects is empty',
  noPlacementCode: 'Can\'t find in requested bids the bid with auid - ',
  emptyUids: 'Uids should not be empty',
  emptySeatbid: 'Seatbid array from response has an empty item',
  emptyResponse: 'Response is empty',
  hasEmptySeatbidArray: 'Response has empty seatbid array',
  hasNoArrayOfBids: 'Seatbid from response has no array of bid objects - ',
  notAllowedCurrency: 'Currency is not supported - ',
  currencyMismatch: 'Currency from the request is not match currency from the response - '
};
const currencyWhiteList = ['EUR', 'USD', 'GBP', 'PLN'];
export const spec = {
  code: BIDDER_CODE,
  isBidRequestValid: function(bid) {
    return !!bid.params.uid;
  },
  buildRequests: function(validBidRequests, bidderRequest) {
    const auids = [];
    const bidsMap = {};
    const slotsMapByUid = {};
    const sizeMap = {};
    const bids = validBidRequests || [];
    const currency =
      config.getConfig(`currency.bidderCurrencyDefault.${BIDDER_CODE}`) ||
      config.getConfig('currency.adServerCurrency') ||
      DEFAULT_CUR;
    let reqId;

    if (currencyWhiteList.indexOf(currency) === -1) {
      utils.logError(LOG_ERROR_MESS.notAllowedCurrency + currency);
      return;
    }

    bids.forEach(bid => {
      reqId = bid.bidderRequestId;
      const {params: {uid}, adUnitCode} = bid;
      auids.push(uid);
      const sizesId = utils.parseSizesInput(bid.sizes);

      if (!slotsMapByUid[uid]) {
        slotsMapByUid[uid] = {};
      }
      const slotsMap = slotsMapByUid[uid];
      if (!slotsMap[adUnitCode]) {
        slotsMap[adUnitCode] = {adUnitCode, bids: [bid], parents: []};
      } else {
        slotsMap[adUnitCode].bids.push(bid);
      }
      const slot = slotsMap[adUnitCode];

      sizesId.forEach((sizeId) => {
        sizeMap[sizeId] = true;
        if (!bidsMap[uid]) {
          bidsMap[uid] = {};
        }

        if (!bidsMap[uid][sizeId]) {
          bidsMap[uid][sizeId] = [slot];
        } else {
          bidsMap[uid][sizeId].push(slot);
        }
        slot.parents.push({parent: bidsMap[uid], key: sizeId, uid});
      });
    });

    const payload = {
      pt: 'net',
      auids: auids.join(','),
      sizes: utils.getKeys(sizeMap).join(','),
      r: reqId,
      cur: currency,
      wrapperType: 'Prebid_js',
      wrapperVersion: '$prebid.version$'
    };

    if (bidderRequest) {
      if (bidderRequest.refererInfo && bidderRequest.refererInfo.referer) {
        payload.u = bidderRequest.refererInfo.referer;
      }
      if (bidderRequest.gdprConsent) {
        if (bidderRequest.gdprConsent.consentString) {
          payload.gdpr_consent = bidderRequest.gdprConsent.consentString;
        }
        payload.gdpr_applies =
            (typeof bidderRequest.gdprConsent.gdprApplies === 'boolean')
              ? Number(bidderRequest.gdprConsent.gdprApplies) : 1;
      }
    }

    return {
      method: 'GET',
      url: ENDPOINT_URL,
      data: payload,
      bidsMap: bidsMap,
    };
  },
  interpretResponse: function(serverResponse, bidRequest) {
    serverResponse = serverResponse && serverResponse.body;
    const bidResponses = [];
    const bidsWithoutSizeMatching = [];
    const bidsMap = bidRequest.bidsMap;
    const currency = bidRequest.data.cur;

    let errorMessage;

    if (!serverResponse) errorMessage = LOG_ERROR_MESS.emptyResponse;
    else if (serverResponse.seatbid && !serverResponse.seatbid.length) {
      errorMessage = LOG_ERROR_MESS.hasEmptySeatbidArray;
    }

    if (!errorMessage && serverResponse.seatbid) {
      serverResponse.seatbid.forEach(respItem => {
        _addBidResponse(_getBidFromResponse(respItem), bidsMap, currency, bidResponses, bidsWithoutSizeMatching);
      });
      bidsWithoutSizeMatching.forEach(serverBid => {
        _addBidResponse(serverBid, bidsMap, currency, bidResponses);
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
};

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

function _addBidResponse(serverBid, bidsMap, currency, bidResponses, bidsWithoutSizeMatching) {
  if (!serverBid) return;
  let errorMessage;
  if (!serverBid.auid) errorMessage = LOG_ERROR_MESS.noAuid + JSON.stringify(serverBid);
  if (!serverBid.adm) errorMessage = LOG_ERROR_MESS.noAdm + JSON.stringify(serverBid);
  else {
    const reqCurrency = currency || DEFAULT_CUR;
    const awaitingBids = bidsMap[serverBid.auid];
    if (awaitingBids) {
      if (serverBid.cur && serverBid.cur !== reqCurrency) {
        errorMessage = LOG_ERROR_MESS.currencyMismatch + reqCurrency + ' - ' + serverBid.cur;
      } else {
        const sizeId = bidsWithoutSizeMatching ? `${serverBid.w}x${serverBid.h}` : Object.keys(awaitingBids)[0];
        if (awaitingBids[sizeId]) {
          const slot = awaitingBids[sizeId][0];

          const bid = slot.bids.shift();
          bidResponses.push({
            requestId: bid.bidId,
            bidderCode: spec.code,
            cpm: serverBid.price,
            width: serverBid.w,
            height: serverBid.h,
            creativeId: serverBid.auid,
            currency: reqCurrency,
            netRevenue: true,
            ttl: TIME_TO_LIVE,
            ad: serverBid.adm,
            dealId: serverBid.dealid
          });

          if (!slot.bids.length) {
            slot.parents.forEach(({parent, key, uid}) => {
              const index = parent[key].indexOf(slot);
              if (index > -1) {
                parent[key].splice(index, 1);
              }
              if (!parent[key].length) {
                delete parent[key];
                if (!utils.getKeys(parent).length) {
                  delete bidsMap[uid];
                }
              }
            });
          }
        } else {
          bidsWithoutSizeMatching && bidsWithoutSizeMatching.push(serverBid);
        }
      }
    } else {
      errorMessage = LOG_ERROR_MESS.noPlacementCode + serverBid.auid;
    }
  }
  if (errorMessage) {
    utils.logError(errorMessage);
  }
}

registerBidder(spec);
