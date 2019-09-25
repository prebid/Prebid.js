import { BANNER } from '../src/mediaTypes';
import { registerBidder } from '../src/adapters/bidderFactory';
import * as utils from '../src/utils';

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
    let data = _buildPostBody(bidRequests, bidderRequest);

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

  getUserSyncs: function(syncOptions) {
    let ibCall = '//ib.3lift.com/sync?';
    if (consentString !== null) {
      ibCall = utils.tryAppendQueryString(ibCall, 'gdpr', gdprApplies);
      ibCall = utils.tryAppendQueryString(ibCall, 'cmp_cs', consentString);
    }

    if (syncOptions.iframeEnabled) {
      return [{
        type: 'iframe',
        url: ibCall
      }];
    }
  }
}

function _buildPostBody(bidRequests, bidderRequest) {
  let data = {};
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

  let eids = handleConsortiaUserIds(bidderRequest);
  if (eids.length > 0) {
    data.user = {
      ext: {eids}
    };
  }

  return data;
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

function handleConsortiaUserIds(bidderRequest) {
  let eids = [];
  if (bidderRequest.userId && bidderRequest.userId.tdid) {
    eids.push({
      source: 'adserver.org',
      uids: [{
        id: bidderRequest.userId.tdid,
        ext: {
          rtiPartner: 'TDID'
        }
      }]
    });
  }

  return eids;
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
