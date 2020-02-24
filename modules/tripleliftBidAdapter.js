import { BANNER } from '../src/mediaTypes.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import * as utils from '../src/utils.js';
import { config } from '../src/config.js';

const BIDDER_CODE = 'triplelift';
const STR_ENDPOINT = 'https://tlx.3lift.com/header/auction?';
let gdprApplies = true;
let consentString = null;

export const tripleliftAdapterSpec = {

  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER],
  isBidRequestValid: function(bid) {
    return (typeof bid.params.inventoryCode !== 'undefined');
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
  data.imp = bidRequests.map(function(bid, index) {
    return {
      id: index,
      tagid: bid.params.inventoryCode,
      floor: bid.params.floor,
      banner: {
        format: _sizes(bid.sizes)
      }
    };
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

  if (schain) {
    data.ext = {
      schain
    }
  }
  return data;
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

  if (bid.cpm != 0 && bid.ad) {
    bidResponse = {
      requestId: bidderRequest.bids[bid.imp_id].bidId,
      cpm: bid.cpm,
      width: width,
      height: height,
      netRevenue: true,
      ad: bid.ad,
      creativeId: creativeId,
      dealId: dealId,
      currency: 'USD',
      ttl: 33,
    };
  };
  return bidResponse;
}

registerBidder(tripleliftAdapterSpec);
