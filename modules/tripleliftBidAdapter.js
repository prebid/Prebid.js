import { tryAppendQueryString, logMessage, logError, isEmpty, isStr, isPlainObject, isArray, logWarn } from '../src/utils.js';
import { BANNER, VIDEO } from '../src/mediaTypes.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { config } from '../src/config.js';
import { getStorageManager } from '../src/storageManager.js';

const GVLID = 28;
const BIDDER_CODE = 'triplelift';
const STR_ENDPOINT = 'https://tlx.3lift.com/header/auction?';
const BANNER_TIME_TO_LIVE = 300;
const VIDEO_TIME_TO_LIVE = 3600;
let gdprApplies = true;
let consentString = null;
export const storage = getStorageManager({gvlid: GVLID, bidderCode: BIDDER_CODE});

export const tripleliftAdapterSpec = {
  gvlid: GVLID,
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER, VIDEO],
  isBidRequestValid: function (bid) {
    return typeof bid.params.inventoryCode !== 'undefined';
  },

  buildRequests: function(bidRequests, bidderRequest) {
    let tlCall = STR_ENDPOINT;
    let data = _buildPostBody(bidRequests, bidderRequest);

    tlCall = tryAppendQueryString(tlCall, 'lib', 'prebid');
    tlCall = tryAppendQueryString(tlCall, 'v', '$prebid.version$');

    if (bidderRequest && bidderRequest.refererInfo) {
      let referrer = bidderRequest?.refererInfo?.topmostLocation || bidderRequest?.refererInfo?.page;
      tlCall = tryAppendQueryString(tlCall, 'referrer', referrer);
    }

    if (bidderRequest && bidderRequest.timeout) {
      tlCall = tryAppendQueryString(tlCall, 'tmax', bidderRequest.timeout);
    }

    if (bidderRequest && bidderRequest.gdprConsent) {
      if (typeof bidderRequest.gdprConsent.gdprApplies !== 'undefined') {
        gdprApplies = bidderRequest.gdprConsent.gdprApplies;
        tlCall = tryAppendQueryString(tlCall, 'gdpr', gdprApplies.toString());
      }
      if (typeof bidderRequest.gdprConsent.consentString !== 'undefined') {
        consentString = bidderRequest.gdprConsent.consentString;
        tlCall = tryAppendQueryString(tlCall, 'cmp_cs', consentString);
      }
    }

    if (bidderRequest && bidderRequest.uspConsent) {
      tlCall = tryAppendQueryString(tlCall, 'us_privacy', bidderRequest.uspConsent);
    }

    if (config.getConfig('coppa') === true) {
      tlCall = tryAppendQueryString(tlCall, 'coppa', true);
    }

    if (tlCall.lastIndexOf('&') === tlCall.length - 1) {
      tlCall = tlCall.substring(0, tlCall.length - 1);
    }
    logMessage('tlCall request built: ' + tlCall);

    return {
      method: 'POST',
      url: tlCall,
      data,
      bidderRequest
    };
  },

  interpretResponse: function(serverResponse, {bidderRequest}) {
    let bids = serverResponse.body.bids || [];
    return bids.map(function(bid) {
      return _buildResponseObject(bidderRequest, bid);
    });
  },

  getUserSyncs: function(syncOptions, responses, gdprConsent, usPrivacy) {
    let syncType = _getSyncType(syncOptions);
    if (!syncType) return;

    let syncEndpoint = 'https://eb2.3lift.com/sync?';

    if (syncType === 'image') {
      syncEndpoint = tryAppendQueryString(syncEndpoint, 'px', 1);
      syncEndpoint = tryAppendQueryString(syncEndpoint, 'src', 'prebid');
    }

    if (consentString !== null) {
      syncEndpoint = tryAppendQueryString(syncEndpoint, 'gdpr', gdprApplies);
      syncEndpoint = tryAppendQueryString(syncEndpoint, 'cmp_cs', consentString);
    }

    if (usPrivacy) {
      syncEndpoint = tryAppendQueryString(syncEndpoint, 'us_privacy', usPrivacy);
    }

    return [{
      type: syncType,
      url: syncEndpoint
    }];
  }
};

function _getSyncType(syncOptions) {
  if (!syncOptions) return;
  if (syncOptions.iframeEnabled) return 'iframe';
  if (syncOptions.pixelEnabled) return 'image';
}

function _buildPostBody(bidRequests, bidderRequest) {
  let data = {};
  let { schain } = bidRequests[0];
  const globalFpd = _getGlobalFpd(bidderRequest);

  data.imp = bidRequests.map(function(bidRequest, index) {
    let imp = {
      id: index,
      tagid: bidRequest.params.inventoryCode,
      floor: _getFloor(bidRequest)
    };
    // Check for video bidrequest
    if (_isVideoBidRequest(bidRequest)) {
      imp.video = _getORTBVideo(bidRequest);
    }
    // append banner if applicable and request is not for instream
    if (bidRequest.mediaTypes.banner && !_isInstream(bidRequest)) {
      imp.banner = { format: _sizes(bidRequest.sizes) };
    }

    if (!isEmpty(bidRequest.ortb2Imp)) {
      imp.fpd = _getAdUnitFpd(bidRequest.ortb2Imp);
    }
    return imp;
  });

  let eids = [
    ...getUnifiedIdEids([bidRequests[0]]),
    ...getIdentityLinkEids([bidRequests[0]]),
    ...getCriteoEids([bidRequests[0]]),
    ...getPubCommonEids([bidRequests[0]]),
    ...getUniversalEids(bidRequests[0])
  ];

  if (eids.length > 0) {
    data.user = {
      ext: {eids}
    };
  }

  let ext = _getExt(schain, globalFpd);

  if (!isEmpty(ext)) {
    data.ext = ext;
  }
  return data;
}

function _isVideoBidRequest(bidRequest) {
  return _isValidVideoObject(bidRequest) && (_isInstream(bidRequest) || _isOutstream(bidRequest));
}

function _isOutstream(bidRequest) {
  return _isValidVideoObject(bidRequest) && bidRequest.mediaTypes.video.context.toLowerCase() === 'outstream';
}

function _isInstream(bidRequest) {
  return _isValidVideoObject(bidRequest) && bidRequest.mediaTypes.video.context.toLowerCase() === 'instream';
}

function _isValidVideoObject(bidRequest) {
  return bidRequest.mediaTypes.video && bidRequest.mediaTypes.video.context;
}

function _getORTBVideo(bidRequest) {
  // give precedent to mediaTypes.video
  let video = { ...bidRequest.params.video, ...bidRequest.mediaTypes.video };
  try {
    if (!video.w) video.w = video.playerSize[0][0];
    if (!video.h) video.h = video.playerSize[0][1];
  } catch (err) {
    logWarn('Video size not defined', err);
  }
  if (video.context === 'instream') video.placement = 1;
  if (video.context === 'outstream') {
    if (!video.placement) {
      video.placement = 3
    } else if ([3, 4, 5].indexOf(video.placement) === -1) {
      logMessage(`video.placement value of ${video.placement} is invalid for outstream context. Setting placement to 3`)
      video.placement = 3
    }
  }

  // clean up oRTB object
  delete video.playerSize;
  return video;
}

function _getFloor (bid) {
  let floor = null;
  if (typeof bid.getFloor === 'function') {
    try {
      const floorInfo = bid.getFloor({
        currency: 'USD',
        mediaType: _isVideoBidRequest(bid) ? 'video' : 'banner',
        size: '*'
      });
      if (typeof floorInfo === 'object' &&
      floorInfo.currency === 'USD' && !isNaN(parseFloat(floorInfo.floor))) {
        floor = parseFloat(floorInfo.floor);
      }
    } catch (err) {
      logError('Triplelift: getFloor threw an error: ', err);
    }
  }
  return floor !== null ? floor : bid.params.floor;
}

function _getGlobalFpd(bidderRequest) {
  const fpd = {};
  const context = {}
  const user = {};
  const ortbData = bidderRequest.ortb2 || {};
  const opeCloudStorage = _fetchOpeCloud();

  const fpdContext = Object.assign({}, ortbData.site);
  const fpdUser = Object.assign({}, ortbData.user);

  if (opeCloudStorage) {
    fpdUser.data = fpdUser.data || []
    try {
      fpdUser.data.push({
        name: 'www.1plusx.com',
        ext: opeCloudStorage
      })
    } catch (err) {
      logError('Triplelift: error adding 1plusX segments: ', err);
    }
  }

  _addEntries(context, fpdContext);
  _addEntries(user, fpdUser);

  if (!isEmpty(context)) {
    fpd.context = context;
  }
  if (!isEmpty(user)) {
    fpd.user = user;
  }
  return fpd;
}

function _fetchOpeCloud() {
  const opeCloud = storage.getDataFromLocalStorage('opecloud_ctx');
  if (!opeCloud) return null;
  try {
    const parsedJson = JSON.parse(opeCloud);
    return parsedJson
  } catch (err) {
    logError('Triplelift: error parsing JSON: ', err);
    return null
  }
}

function _getAdUnitFpd(adUnitFpd) {
  const fpd = {};
  const context = {};

  _addEntries(context, adUnitFpd.ext);

  if (!isEmpty(context)) {
    fpd.context = context;
  }

  return fpd;
}

function _addEntries(target, source) {
  if (!isEmpty(source)) {
    Object.keys(source).forEach(key => {
      if (source[key] != null) {
        target[key] = source[key];
      }
    });
  }
}

function _getExt(schain, fpd) {
  let ext = {};
  if (!isEmpty(schain)) {
    ext.schain = { ...schain };
  }
  if (!isEmpty(fpd)) {
    ext.fpd = { ...fpd };
  }
  return ext;
}

function getUnifiedIdEids(bidRequest) {
  return getEids(bidRequest, 'tdid', 'adserver.org', 'TDID');
}

function getIdentityLinkEids(bidRequest) {
  return getEids(bidRequest, 'idl_env', 'liveramp.com', 'idl');
}

function getCriteoEids(bidRequest) {
  return getEids(bidRequest, 'criteoId', 'criteo.com', 'criteoId');
}

function getPubCommonEids(bidRequest) {
  return getEids(bidRequest, 'pubcid', 'pubcid.org', 'pubcid');
}

function getUniversalEids(bidRequest) {
  let common = ['adserver.org', 'liveramp.com', 'criteo.com', 'pubcid.org'];
  let eids = [];
  if (bidRequest.userIdAsEids) {
    bidRequest.userIdAsEids.forEach(id => {
      try {
        if (common.indexOf(id.source) === -1) {
          let uids = id.uids.map(uid => ({ id: uid.id, ext: { rtiPartner: id.source } }));
          eids.push({ source: id.source, uids });
        }
      } catch (err) {
        logWarn(`Triplelift: Error attempting to add ${id} to bid request`, err);
      }
    });
  }
  return eids;
}

function getEids(bidRequest, type, source, rtiPartner) {
  return bidRequest
    .map(getUserId(type)) // bids -> userIds of a certain type
    .filter(filterEids(type)) // filter out unqualified userIds
    .map(formatEid(source, rtiPartner)); // userIds -> eid objects
}

const filterEids = type => (userId, i, arr) => {
  let isValidUserId =
    !!userId && // is not null nor empty
    (isStr(userId)
      ? !!userId
      : isPlainObject(userId) && // or, is object
        !isArray(userId) && // not an array
        !isEmpty(userId) && // is not empty
        userId.id && // contains nested id field
        isStr(userId.id) && // nested id field is a string
        !!userId.id); // that is not empty
  if (!isValidUserId && arr[0] !== undefined) {
    logWarn(`Triplelift: invalid ${type} userId format`);
  }
  return isValidUserId;
};

function getUserId(type) {
  return bid => bid && bid.userId && bid.userId[type];
}

function formatEid(source, rtiPartner) {
  return (userId) => ({
    source,
    uids: [{
      id: userId.id ? userId.id : userId,
      ext: { rtiPartner }
    }]
  });
}

function _sizes(sizeArray) {
  let sizes = sizeArray.filter(_isValidSize);
  return sizes.map(function(size) {
    return {
      w: size[0],
      h: size[1]
    };
  });
}

function _isValidSize(size) {
  return (size.length === 2 && typeof size[0] === 'number' && typeof size[1] === 'number');
}

function _buildResponseObject(bidderRequest, bid) {
  let bidResponse = {};
  let width = bid.width || 1;
  let height = bid.height || 1;
  let dealId = bid.deal_id || '';
  let creativeId = bid.crid || '';
  let breq = bidderRequest.bids[bid.imp_id];

  if (bid.cpm != 0 && bid.ad) {
    bidResponse = {
      requestId: breq.bidId,
      cpm: bid.cpm,
      width: width,
      height: height,
      netRevenue: true,
      ad: bid.ad,
      creativeId: creativeId,
      dealId: dealId,
      currency: 'USD',
      ttl: BANNER_TIME_TO_LIVE,
      tl_source: bid.tl_source,
      meta: {}
    };

    if (_isVideoBidRequest(breq) && bid.media_type === 'video') {
      bidResponse.vastXml = bid.ad;
      bidResponse.mediaType = 'video';
      bidResponse.ttl = VIDEO_TIME_TO_LIVE;
    };

    if (bid.advertiser_name) {
      bidResponse.meta.advertiserName = bid.advertiser_name;
    }

    if (bid.adomain && bid.adomain.length) {
      bidResponse.meta.advertiserDomains = bid.adomain;
    }

    if (bid.tl_source && bid.tl_source == 'hdx') {
      if (_isVideoBidRequest(breq) && bid.media_type === 'video') {
        bidResponse.meta.mediaType = 'video'
      } else {
        bidResponse.meta.mediaType = 'banner'
      }
    }

    if (bid.tl_source && bid.tl_source == 'tlx') {
      bidResponse.meta.mediaType = 'native';
    }
  };
  return bidResponse;
}

registerBidder(tripleliftAdapterSpec);
