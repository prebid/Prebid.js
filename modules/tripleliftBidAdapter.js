import { BANNER } from 'src/mediaTypes';
import { registerBidder } from 'src/adapters/bidderFactory';
import * as utils from 'src/utils';

const BIDDER_CODE = 'triplelift';
const STR_ENDPOINT = document.location.protocol + '//tlx.3lift.com/header/auction?';
var applies = true;
var consentString = null;

export const tripleliftAdapterSpec = {

  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER],
  aliases: ['triplelift'],
  isBidRequestValid: function(bid) {
    return (typeof bid.params.inventoryCode !== 'undefined');
  },

  buildRequests: function(bidRequests, bidderRequest) {
    var tlCall = STR_ENDPOINT;
    var referrer = utils.getTopWindowUrl();
    var data = _buildPostBody(bidRequests);

    tlCall = utils.tryAppendQueryString(tlCall, 'lib', 'prebid');
    tlCall = utils.tryAppendQueryString(tlCall, 'v', '$prebid.version$');
    tlCall = utils.tryAppendQueryString(tlCall, 'fe', _isFlashEnabled().toString());
    tlCall = utils.tryAppendQueryString(tlCall, 'referrer', referrer);

    if (bidderRequest && bidderRequest.timeout) {
      tlCall = utils.tryAppendQueryString(tlCall, 'tmax', bidderRequest.timeout);
    }

    if (bidderRequest && bidderRequest.gdprConsent) {
      if (typeof bidderRequest.gdprConsent.gdprApplies !== 'undefined') {
        applies = bidderRequest.gdprConsent.gdprApplies;
        tlCall = utils.tryAppendQueryString(tlCall, 'gdpr', applies.toString());
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
    var bids = serverResponse.body.bids || [];
    return bids.map(function(bid) {
      return _buildResponseObject(bidderRequest, bid);
    });
  },

  getUserSyncs: function(syncOptions) {
    var ibCall = '//ib.3lift.com/sync?';
    if (consentString !== null) {
      ibCall = utils.tryAppendQueryString(ibCall, 'gdpr', applies);
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

function _buildPostBody(bidRequests) {
  var data = {};
  data.imp = bidRequests.map(function(bid, index) {
    return {
      id: index,
      tagid: bid.params.inventoryCode,
      floor: bid.params.floor,
      banner: {
        format: _sizes(bid.sizes)
      }
    }
  });

  return data;
}

function _sizes(sizeArray) {
  return sizeArray.map(function(size) {
    return {
      w: size[0],
      h: size[1]
    };
  });
}

function _buildResponseObject(bidderRequest, bid) {
  var bidResponse = {};
  var width = bid.width || 1;
  var height = bid.height || 1;
  var dealId = bid.deal_id || '';
  var creativeId = bid.imp_id;

  if (bid.cpm != 0 && bid.ad) {
    bidResponse = {
      requestId: bidderRequest.bids[creativeId].bidId,
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

function _isFlashEnabled() {
  var flash;
  try {
    flash = Boolean(new ActiveXObject('ShockwaveFlash.ShockwaveFlash'));
  } catch (e) {
    flash = navigator.mimeTypes &&
      navigator.mimeTypes['application/x-shockwave-flash'] !== undefined &&
      navigator.mimeTypes['application/x-shockwave-flash'].enabledPlugin ? 1 : 0
  }
  return flash ? 1 : 0;
}

registerBidder(tripleliftAdapterSpec);
