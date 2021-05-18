import * as utils from '../src/utils.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { config } from '../src/config.js';
import { BANNER, VIDEO } from '../src/mediaTypes.js';
import { INSTREAM as VIDEO_INSTREAM } from '../src/video.js';
const { parseSizesInput, getKeys, logError, deepAccess } = utils;
const BIDDER_CODE = 'visx';
const BASE_URL = 'https://t.visx.net';
const ENDPOINT_URL = BASE_URL + '/hb';
const TIME_TO_LIVE = 360;
const DEFAULT_CUR = 'EUR';
const ADAPTER_SYNC_URL = BASE_URL + '/push_sync';
const TRACK_WIN_URL = BASE_URL + '/track/win';
const TRACK_PENDING_URL = BASE_URL + '/track/pending';
const TRACK_TIMEOUT_URL = BASE_URL + '/track/bid_timeout';
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
  currencyMismatch: 'Currency from the request is not match currency from the response - ',
  onlyVideoInstream: `Only video ${VIDEO_INSTREAM} supported`,
  videoMissing: 'Bid request videoType property is missing - '
};
const currencyWhiteList = ['EUR', 'USD', 'GBP', 'PLN'];
const RE_EMPTY_OR_ONLY_COMMAS = /^,*$/;
export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER, VIDEO],
  isBidRequestValid: function(bid) {
    if (_isVideoBid(bid)) {
      if (!_isValidVideoBid(bid)) {
        return false;
      }
    }
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
    let payloadSchain;
    let payloadUserId;
    const videoTypes = _initVideoTypes(bids);

    if (currencyWhiteList.indexOf(currency) === -1) {
      logError(LOG_ERROR_MESS.notAllowedCurrency + currency);
      return;
    }

    bids.forEach(bid => {
      reqId = bid.bidderRequestId;
      const {params: {uid}, adUnitCode, schain, userId} = bid;
      auids.push(uid);
      if (!payloadSchain && schain) {
        payloadSchain = schain;
      }
      if (!payloadUserId && userId) {
        payloadUserId = userId;
      }
      const sizesId = parseSizesInput(bid.sizes);

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
      sizes: getKeys(sizeMap).join(','),
      r: reqId,
      cur: currency,
      wrapperType: 'Prebid_js',
      wrapperVersion: '$prebid.version$',
      ...videoTypes
    };

    if (payloadSchain) {
      payload.schain = JSON.stringify(payloadSchain);
    }

    if (payloadUserId) {
      if (payloadUserId.tdid) {
        payload.tdid = payloadUserId.tdid;
      }
      if (payloadUserId.id5id && payloadUserId.id5id.uid) {
        payload.id5 = payloadUserId.id5id.uid;
      }
      if (payloadUserId.digitrustid && payloadUserId.digitrustid.data && payloadUserId.digitrustid.data.id) {
        payload.dtid = payloadUserId.digitrustid.data.id;
      }
    }

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
    if (errorMessage) logError(errorMessage);
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
  },
  onSetTargeting: function(bid) {
    // Call '/track/pending' with the corresponding bid.requestId
    utils.triggerPixel(TRACK_PENDING_URL + '?requestId=' + bid.requestId);
  },
  onBidWon: function(bid) {
    // Call '/track/win' with the corresponding bid.requestId
    utils.triggerPixel(TRACK_WIN_URL + '?requestId=' + bid.requestId);
  },
  onTimeout: function(timeoutData) {
    // Call '/track/bid_timeout' with timeout data
    utils.triggerPixel(TRACK_TIMEOUT_URL + '?data=' + JSON.stringify(timeoutData));
  }
};

function _getBidFromResponse(respItem) {
  if (!respItem) {
    logError(LOG_ERROR_MESS.emptySeatbid);
  } else if (!respItem.bid) {
    logError(LOG_ERROR_MESS.hasNoArrayOfBids + JSON.stringify(respItem));
  } else if (!respItem.bid[0]) {
    logError(LOG_ERROR_MESS.noBid);
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
          const bidResponse = {
            requestId: bid.bidId,
            cpm: serverBid.price,
            width: serverBid.w,
            height: serverBid.h,
            creativeId: serverBid.auid,
            currency: reqCurrency,
            netRevenue: true,
            ttl: TIME_TO_LIVE,
            dealId: serverBid.dealid
          };

          if (!_isVideoBid(bid)) {
            bidResponse.ad = serverBid.adm;
          } else {
            bidResponse.vastXml = serverBid.adm;
            bidResponse.mediaType = 'video';
          }

          bidResponses.push(bidResponse);

          if (!slot.bids.length) {
            slot.parents.forEach(({parent, key, uid}) => {
              const index = parent[key].indexOf(slot);
              if (index > -1) {
                parent[key].splice(index, 1);
              }
              if (!parent[key].length) {
                delete parent[key];
                if (!getKeys(parent).length) {
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
    logError(errorMessage);
  }
}

function _isVideoBid(bid) {
  return bid.mediaType === VIDEO || deepAccess(bid, 'mediaTypes.video');
}

function _isValidVideoBid(bid) {
  let result = true;
  const videoMediaType = deepAccess(bid, 'mediaTypes.video');
  if (videoMediaType.context !== VIDEO_INSTREAM) {
    logError(LOG_ERROR_MESS.onlyVideoInstream)
    result = false;
  }
  if (!(videoMediaType.playerSize && parseSizesInput(deepAccess(videoMediaType, 'playerSize', [])))) {
    logError(LOG_ERROR_MESS.videoMissing + 'playerSize');
    result = false;
  }
  if (!videoMediaType.mimes) {
    logError(LOG_ERROR_MESS.videoMissing + 'mimes');
    result = false;
  }
  if (!videoMediaType.protocols) {
    logError(LOG_ERROR_MESS.videoMissing + 'protocols');
    result = false;
  }
  return result;
}

function _initVideoTypes(bids) {
  const result = {};
  let _playerSize = [];
  let _protocols = [];
  let _api = [];
  let _mimes = [];
  let _minduration = [];
  let _maxduration = [];
  let _skip = [];
  if (bids && bids.length) {
    bids.forEach(function (bid) {
      const mediaTypes = deepAccess(bid, 'mediaTypes.video', {});
      _playerSize.push(parseSizesInput(deepAccess(mediaTypes, 'playerSize', [])).join('|'));
      _protocols.push(deepAccess(mediaTypes, 'protocols', []).join('|'));
      _api.push(deepAccess(mediaTypes, 'api', []).join('|'));
      _mimes.push(deepAccess(mediaTypes, 'mimes', []).join('|'));
      _minduration.push(deepAccess(mediaTypes, 'minduration', null));
      _maxduration.push(deepAccess(mediaTypes, 'maxduration', null));
      _skip.push(deepAccess(mediaTypes, 'skip', null));
    });
  }
  _playerSize = _playerSize.join(',');
  _protocols = _protocols.join(',');
  _api = _api.join(',');
  _mimes = _mimes.join(',');
  _minduration = _minduration.join(',');
  _maxduration = _maxduration.join(',');
  _skip = _skip.join(',');

  if (!RE_EMPTY_OR_ONLY_COMMAS.test(_playerSize)) {
    result.playerSize = _playerSize;
  }
  if (!RE_EMPTY_OR_ONLY_COMMAS.test(_protocols)) {
    result.protocols = _protocols;
  }
  if (!RE_EMPTY_OR_ONLY_COMMAS.test(_api)) {
    result.api = _api;
  }
  if (!RE_EMPTY_OR_ONLY_COMMAS.test(_mimes)) {
    result.mimes = _mimes;
  }
  if (!RE_EMPTY_OR_ONLY_COMMAS.test(_minduration)) {
    result.minduration = _minduration;
  }
  if (!RE_EMPTY_OR_ONLY_COMMAS.test(_maxduration)) {
    result.maxduration = _maxduration;
  }
  if (!RE_EMPTY_OR_ONLY_COMMAS.test(_skip)) {
    result.skip = _skip;
  }

  return result;
}

registerBidder(spec);
