import { triggerPixel, parseSizesInput, deepAccess, logError, getGptSlotInfoForAdUnitCode } from '../src/utils.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { config } from '../src/config.js';
import { BANNER, VIDEO } from '../src/mediaTypes.js';
import { INSTREAM as VIDEO_INSTREAM } from '../src/video.js';
const BIDDER_CODE = 'visx';
const GVLID = 154;
const BASE_URL = 'https://t.visx.net';
const DEBUG_URL = 'https://t-stage.visx.net';
const ENDPOINT_PATH = '/hb_post';
const TIME_TO_LIVE = 360;
const DEFAULT_CUR = 'EUR';
const ADAPTER_SYNC_PATH = '/push_sync';
const TRACK_TIMEOUT_PATH = '/track/bid_timeout';
const LOG_ERROR_MESS = {
  noAuid: 'Bid from response has no auid parameter - ',
  noAdm: 'Bid from response has no adm parameter - ',
  noBid: 'Array of bid objects is empty',
  noImpId: 'Bid from response has no impid parameter - ',
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
export const spec = {
  code: BIDDER_CODE,
  gvlid: GVLID,
  supportedMediaTypes: [BANNER, VIDEO],
  isBidRequestValid: function(bid) {
    if (_isVideoBid(bid)) {
      if (!_isValidVideoBid(bid, true)) {
        // in case if video bid configuration invalid will try to send bid request for banner
        if (!_isBannerBid(bid)) {
          return false;
        }
      }
    }
    return !!bid.params.uid && !isNaN(parseInt(bid.params.uid));
  },
  buildRequests: function(validBidRequests, bidderRequest) {
    const auids = [];
    const bidsMap = {};
    const bids = validBidRequests || [];
    const currency =
      config.getConfig(`currency.bidderCurrencyDefault.${BIDDER_CODE}`) ||
      config.getConfig('currency.adServerCurrency') ||
      DEFAULT_CUR;

    let reqId;
    let payloadSchain;
    let payloadUserId;
    let payloadUserEids;
    let timeout;

    if (currencyWhiteList.indexOf(currency) === -1) {
      logError(LOG_ERROR_MESS.notAllowedCurrency + currency);
      return;
    }

    const imp = [];

    bids.forEach(bid => {
      reqId = bid.bidderRequestId;

      const impObj = buildImpObject(bid);
      if (impObj) {
        imp.push(impObj);
        bidsMap[bid.bidId] = bid;
      }

      const { params: { uid }, schain, userId, userIdAsEids } = bid;

      if (!payloadSchain && schain) {
        payloadSchain = schain;
      }
      if (!payloadUserEids && userIdAsEids) {
        payloadUserEids = userIdAsEids;
      }

      if (!payloadUserId && userId) {
        payloadUserId = userId;
      }
      auids.push(uid);
    });

    const payload = {};

    if (bidderRequest) {
      timeout = bidderRequest.timeout;
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

    const bidderTimeout = Number(config.getConfig('bidderTimeout')) || timeout;
    const tmax = timeout ? Math.min(bidderTimeout, timeout) : bidderTimeout;
    const source = {
      ext: {
        wrapperType: 'Prebid_js',
        wrapperVersion: '$prebid.version$',
        ...(payloadSchain && { schain: payloadSchain })
      }
    };
    const user = {
      ext: {
        ...(payloadUserEids && { eids: payloadUserEids }),
        ...(payload.gdpr_consent && { consent: payload.gdpr_consent })
      }
    };
    const regs = ('gdpr_applies' in payload) && {
      ext: {
        gdpr: payload.gdpr_applies
      }
    };

    const request = {
      id: reqId,
      imp,
      tmax,
      cur: [currency],
      source,
      site: { page: payload.u },
      ...(Object.keys(user.ext).length && { user }),
      ...(regs && { regs })
    };

    return {
      method: 'POST',
      url: buildUrl(ENDPOINT_PATH) + '?auids=' + encodeURIComponent(auids.join(',')),
      data: request,
      bidsMap
    };
  },
  interpretResponse: function(serverResponse, bidRequest) {
    serverResponse = serverResponse && serverResponse.body;
    const bidResponses = [];
    const bidsMap = bidRequest.bidsMap;
    const currency = bidRequest.data.cur[0];

    let errorMessage;

    if (!serverResponse) errorMessage = LOG_ERROR_MESS.emptyResponse;
    else if (serverResponse.seatbid && !serverResponse.seatbid.length) {
      errorMessage = LOG_ERROR_MESS.hasEmptySeatbidArray;
    }

    if (!errorMessage && serverResponse.seatbid) {
      serverResponse.seatbid.forEach(respItem => {
        _addBidResponse(_getBidFromResponse(respItem), bidsMap, currency, bidResponses);
      });
    }
    if (errorMessage) logError(errorMessage);
    return bidResponses;
  },
  getUserSyncs: function(syncOptions, serverResponses, gdprConsent) {
    var query = [];
    if (gdprConsent) {
      if (gdprConsent.consentString) {
        query.push('gdpr_consent=' + encodeURIComponent(gdprConsent.consentString));
      }
      query.push('gdpr_applies=' + encodeURIComponent(
        (typeof gdprConsent.gdprApplies === 'boolean')
          ? Number(gdprConsent.gdprApplies) : 1));
    }
    if (syncOptions.iframeEnabled) {
      return [{
        type: 'iframe',
        url: buildUrl(ADAPTER_SYNC_PATH) + '?iframe=1' + (query.length ? '&' + query.join('&') : '')
      }];
    } else if (syncOptions.pixelEnabled) {
      return [{
        type: 'image',
        url: buildUrl(ADAPTER_SYNC_PATH) + (query.length ? '?' + query.join('&') : '')
      }];
    }
  },
  onSetTargeting: function(bid) {
    // Call '/track/pending' with the corresponding bid.requestId
    if (bid.ext && bid.ext.events && bid.ext.events.pending) {
      triggerPixel(bid.ext.events.pending);
    }
  },
  onBidWon: function(bid) {
    // Call '/track/win' with the corresponding bid.requestId
    if (bid.ext && bid.ext.events && bid.ext.events.win) {
      triggerPixel(bid.ext.events.win);
    }
  },
  onTimeout: function(timeoutData) {
    // Call '/track/bid_timeout' with timeout data
    timeoutData.forEach(({ params }) => {
      if (params) {
        params.forEach((item) => {
          if (item && item.uid) {
            item.uid = parseInt(item.uid);
          }
        });
      }
    });
    triggerPixel(buildUrl(TRACK_TIMEOUT_PATH) + '//' + JSON.stringify(timeoutData));
  }
};

function buildUrl(path) {
  return (config.getConfig('devMode') ? DEBUG_URL : BASE_URL) + path;
}

function makeBanner(bannerParams) {
  const bannerSizes = bannerParams && bannerParams.sizes;
  if (bannerSizes) {
    const sizes = parseSizesInput(bannerSizes);
    if (sizes.length) {
      const format = sizes.map(size => {
        const [ width, height ] = size.split('x');
        const w = parseInt(width, 10);
        const h = parseInt(height, 10);
        return { w, h };
      });

      return { format };
    }
  }
}

function makeVideo(videoParams = {}) {
  const video = Object.keys(videoParams).filter((param) => param !== 'context' && param !== 'playerSize')
    .reduce((result, param) => {
      result[param] = videoParams[param];
      return result;
    }, { w: deepAccess(videoParams, 'playerSize.0.0'), h: deepAccess(videoParams, 'playerSize.0.1') });

  if (video.w && video.h) {
    return video;
  }
}

function buildImpObject(bid) {
  const { params: { uid }, bidId, mediaTypes, sizes, adUnitCode } = bid;
  const video = mediaTypes && _isVideoBid(bid) && _isValidVideoBid(bid) && makeVideo(mediaTypes.video);
  const banner = makeBanner((mediaTypes && mediaTypes.banner) || (!video && { sizes }));
  const impObject = {
    id: bidId,
    ...(banner && { banner }),
    ...(video && { video }),
    ext: {
      bidder: { uid: parseInt(uid) },
    }
  };

  if (impObject.banner) {
    impObject.ext.bidder.adslotExists = _isAdSlotExists(adUnitCode);
  }

  if (impObject.ext.bidder.uid && (impObject.banner || impObject.video)) {
    return impObject;
  }
}

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

function _addBidResponse(serverBid, bidsMap, currency, bidResponses) {
  if (!serverBid) return;
  let errorMessage;
  if (!serverBid.auid) errorMessage = LOG_ERROR_MESS.noAuid + JSON.stringify(serverBid);
  if (!serverBid.impid) errorMessage = LOG_ERROR_MESS.noImpId + JSON.stringify(serverBid);
  if (!serverBid.adm) errorMessage = LOG_ERROR_MESS.noAdm + JSON.stringify(serverBid);
  else {
    const reqCurrency = currency || DEFAULT_CUR;
    const bid = bidsMap[serverBid.impid];
    if (bid) {
      if (serverBid.cur && serverBid.cur !== reqCurrency) {
        errorMessage = LOG_ERROR_MESS.currencyMismatch + reqCurrency + ' - ' + serverBid.cur;
      } else {
        const bidResponse = {
          requestId: bid.bidId,
          cpm: serverBid.price,
          width: serverBid.w,
          height: serverBid.h,
          creativeId: serverBid.auid,
          currency: reqCurrency,
          netRevenue: true,
          ttl: TIME_TO_LIVE,
          dealId: serverBid.dealid,
          meta: {
            advertiserDomains: serverBid.advertiserDomains ? serverBid.advertiserDomains : [],
            mediaType: serverBid.mediaType
          },
        };

        if (serverBid.ext && serverBid.ext.prebid) {
          bidResponse.ext = serverBid.ext.prebid;
        }

        const visxTargeting = deepAccess(serverBid, 'ext.prebid.targeting');
        if (visxTargeting) {
          bidResponse.adserverTargeting = visxTargeting;
        }

        if (!_isVideoInstreamBid(bid)) {
          bidResponse.ad = serverBid.adm;
        } else {
          bidResponse.vastXml = serverBid.adm;
          bidResponse.mediaType = 'video';
        }

        bidResponses.push(bidResponse);
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

function _isVideoInstreamBid(bid) {
  return _isVideoBid(bid) && deepAccess(bid, 'mediaTypes.video', {}).context === VIDEO_INSTREAM;
}

function _isBannerBid(bid) {
  return bid.mediaType === BANNER || deepAccess(bid, 'mediaTypes.banner');
}

function _isValidVideoBid(bid, logErrors = false) {
  let result = true;
  const videoMediaType = deepAccess(bid, 'mediaTypes.video');
  if (!_isVideoInstreamBid(bid)) {
    if (logErrors) {
      logError(LOG_ERROR_MESS.onlyVideoInstream);
    }
    result = false;
  }
  if (!(videoMediaType.playerSize && parseSizesInput(deepAccess(videoMediaType, 'playerSize', [])))) {
    if (logErrors) {
      logError(LOG_ERROR_MESS.videoMissing + 'playerSize');
    }
    result = false;
  }
  return result;
}

function _isAdSlotExists(adUnitCode) {
  if (document.getElementById(adUnitCode)) {
    return true;
  }

  const gptAdSlot = getGptSlotInfoForAdUnitCode(adUnitCode);
  if (gptAdSlot && gptAdSlot.divId && document.getElementById(gptAdSlot.divId)) {
    return true;
  }

  return false;
}

registerBidder(spec);
