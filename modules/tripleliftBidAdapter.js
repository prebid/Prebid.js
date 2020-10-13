import { BANNER, VIDEO } from '../src/mediaTypes.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import * as utils from '../src/utils.js';
import { config } from '../src/config.js';

const BIDDER_CODE = 'triplelift';
const STR_ENDPOINT = 'https://tlx.3lift.com/header/auction?';
let gdprApplies = true;
let consentString = null;

export const tripleliftAdapterSpec = {

  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER, VIDEO],
  isBidRequestValid: function (bid) {
    if (bid.mediaTypes.video) {
      let video = _getORTBVideo(bid);
      if (!video.w || !video.h) return false;
    }
    return typeof bid.params.inventoryCode !== 'undefined';
  },

  buildRequests: function(bidRequests, bidderRequest) {
    let tlCall = STR_ENDPOINT;
    let data = _buildPostBody(bidRequests);

    tlCall = utils.tryAppendQueryString(tlCall, 'lib', 'prebid');
    tlCall = utils.tryAppendQueryString(tlCall, 'v', '$prebid.version$');

    if (bidderRequest && bidderRequest.refererInfo) {
      let referrer = bidderRequest.refererInfo.referer;
      tlCall = utils.tryAppendQueryString(tlCall, 'referrer', referrer);
    }

    if (bidderRequest && bidderRequest.timeout) {
      tlCall = utils.tryAppendQueryString(tlCall, 'tmax', bidderRequest.timeout);
    }

    if (bidderRequest && bidderRequest.gdprConsent) {
      if (typeof bidderRequest.gdprConsent.gdprApplies !== 'undefined') {
        gdprApplies = bidderRequest.gdprConsent.gdprApplies;
        tlCall = utils.tryAppendQueryString(tlCall, 'gdpr', gdprApplies.toString());
      }
      if (typeof bidderRequest.gdprConsent.consentString !== 'undefined') {
        consentString = bidderRequest.gdprConsent.consentString;
        tlCall = utils.tryAppendQueryString(tlCall, 'cmp_cs', consentString);
      }
    }

    if (bidderRequest && bidderRequest.uspConsent) {
      tlCall = utils.tryAppendQueryString(tlCall, 'us_privacy', bidderRequest.uspConsent);
    }

    if (config.getConfig('coppa') === true) {
      tlCall = utils.tryAppendQueryString(tlCall, 'coppa', true);
    }

    if (tlCall.lastIndexOf('&') === tlCall.length - 1) {
      tlCall = tlCall.substring(0, tlCall.length - 1);
    }
    utils.logMessage('tlCall request built: ' + tlCall);

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
      syncEndpoint = utils.tryAppendQueryString(syncEndpoint, 'px', 1);
      syncEndpoint = utils.tryAppendQueryString(syncEndpoint, 'src', 'prebid');
    }

    if (consentString !== null) {
      syncEndpoint = utils.tryAppendQueryString(syncEndpoint, 'gdpr', gdprApplies);
      syncEndpoint = utils.tryAppendQueryString(syncEndpoint, 'cmp_cs', consentString);
    }

    if (usPrivacy) {
      syncEndpoint = utils.tryAppendQueryString(syncEndpoint, 'us_privacy', usPrivacy);
    }

    return [{
      type: syncType,
      url: syncEndpoint
    }];
  }
}

function _getSyncType(syncOptions) {
  if (!syncOptions) return;
  if (syncOptions.iframeEnabled) return 'iframe';
  if (syncOptions.pixelEnabled) return 'image';
}

function _buildPostBody(bidRequests) {
  let data = {};
  let { schain } = bidRequests[0];
  const globalFpd = _getGlobalFpd();

  data.imp = bidRequests.map(function(bidRequest, index) {
    let imp = {
      id: index,
      tagid: bidRequest.params.inventoryCode,
      floor: _getFloor(bidRequest)
    };
    if (bidRequest.mediaTypes.video) {
      imp.video = _getORTBVideo(bidRequest);
    } else if (bidRequest.mediaTypes.banner) {
      imp.banner = { format: _sizes(bidRequest.sizes) };
    };
    return imp;
  });

  let eids = [
    ...getUnifiedIdEids(bidRequests),
    ...getIdentityLinkEids(bidRequests),
    ...getCriteoEids(bidRequests)
  ];

  if (eids.length > 0) {
    data.user = {
      ext: {eids}
    };
  }

  let ext = _getExt(schain, globalFpd);

  if (!utils.isEmpty(ext)) {
    data.ext = ext;
  }
  return data;
}

function _getORTBVideo(bidRequest) {
  // give precedent to mediaTypes.video
  let video = { ...bidRequest.params.video, ...bidRequest.mediaTypes.video };
  if (!video.w) video.w = video.playerSize[0][0];
  if (!video.h) video.h = video.playerSize[0][1];
  if (video.context === 'instream') video.placement = 1;
  // clean up oRTB object
  delete video.playerSize;
  return video;
}

function _getFloor (bid) {
  let floor = null;
  if (typeof bid.getFloor === 'function') {
    const floorInfo = bid.getFloor({
      currency: 'USD',
      mediaType: 'banner',
      size: _sizes(bid.sizes)
    });
    if (typeof floorInfo === 'object' &&
    floorInfo.currency === 'USD' && !isNaN(parseFloat(floorInfo.floor))) {
      floor = parseFloat(floorInfo.floor);
    }
  }
  return floor !== null ? floor : bid.params.floor;
}

function _getGlobalFpd() {
  let fpd = {};
  const fpdContext = Object.assign({}, config.getConfig('fpd.context'));
  const fpdUser = Object.assign({}, config.getConfig('fpd.user'));

  _addEntries(fpd, fpdContext);
  _addEntries(fpd, fpdUser);

  return fpd;
}

function _addEntries(target, source) {
  if (!utils.isEmpty(source)) {
    Object.keys(source).forEach(key => {
      if (source[key] != null) {
        target[key] = source[key];
      }
    });
  }
}

function _getExt(schain, fpd) {
  let ext = {};
  if (!utils.isEmpty(schain)) {
    ext.schain = { ...schain };
  }
  if (!utils.isEmpty(fpd)) {
    ext.fpd = { ...fpd };
  }
  return ext;
}

function getUnifiedIdEids(bidRequests) {
  return getEids(bidRequests, 'tdid', 'adserver.org', 'TDID');
}

function getIdentityLinkEids(bidRequests) {
  return getEids(bidRequests, 'idl_env', 'liveramp.com', 'idl');
}

function getCriteoEids(bidRequests) {
  return getEids(bidRequests, 'criteoId', 'criteo.com', 'criteoId');
}

function getEids(bidRequests, type, source, rtiPartner) {
  return bidRequests
    .map(getUserId(type)) // bids -> userIds of a certain type
    .filter((x) => !!x) // filter out null userIds
    .map(formatEid(source, rtiPartner)); // userIds -> eid objects
}

function getUserId(type) {
  return (bid) => (bid && bid.userId && bid.userId[type]);
}

function formatEid(source, rtiPartner) {
  return (id) => ({
    source,
    uids: [{
      id,
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
      ttl: 300,
      tl_source: bid.tl_source,
      meta: {}
    };

    if (breq.mediaTypes.video) {
      bidResponse.vastXml = bid.ad;
      bidResponse.mediaType = 'video';
    };

    if (bid.advertiser_name) {
      bidResponse.meta.advertiserName = bid.advertiser_name;
    }
  };
  return bidResponse;
}

registerBidder(tripleliftAdapterSpec);
