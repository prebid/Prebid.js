import { BANNER } from 'src/mediaTypes';
import { registerBidder } from 'src/adapters/bidderFactory';
import * as utils from 'src/utils';

const BIDDER_CODE = 'triplelift';
const STR_ENDPOINT = document.location.protocol + '//tlx.3lift.com/header/auction?';
const BID_INDEX = 0;

export const tripleliftAdapterSpec = {

  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER],
  aliases: ['triplelift'],
  isBidRequestValid: function(bid) {
    return !!(bid.params.inventoryCode);
  },

  buildRequests: function(bidRequests, bidderRequest) {
    var inventoryCode = bidRequests[BID_INDEX].params.inventoryCode;
    var floor = bidRequests[BID_INDEX].params.floor || 0;
    var tlCall = STR_ENDPOINT;
    var sizes = bidRequests[BID_INDEX].sizes;
    var referrer = utils.getTopWindowUrl();

    tlCall = utils.tryAppendQueryString(tlCall, 'lib', 'prebid');
    tlCall = utils.tryAppendQueryString(tlCall, 'v', '$prebid.version$');
    tlCall = utils.tryAppendQueryString(tlCall, 'inv_code', inventoryCode);
    tlCall = utils.tryAppendQueryString(tlCall, 'floor', floor.toString());
    tlCall = utils.tryAppendQueryString(tlCall, 'fe', _isFlashEnabled().toString());
    tlCall = utils.tryAppendQueryString(tlCall, 'referrer', referrer);

    var sizeQueryString = utils.parseSizesInput(sizes);
    if (sizeQueryString) {
      tlCall = utils.tryAppendQueryString(tlCall, 'size', sizeQueryString.join());
    }
    if (tlCall.lastIndexOf('&') === tlCall.length - 1) {
      tlCall = tlCall.substring(0, tlCall.length - 1);
    }
    utils.logMessage('tlCall request built: ' + tlCall);

    return {
      method: 'GET',
      url: tlCall,
      bidderRequest
    };
  },

  interpretResponse: function(serverResponse, {bidderRequest}) {
    const bidResponses = [];
    var bids = bidderRequest.bids;

    if (serverResponse.body.cpm) {
      bidResponses.push(_buildResponseObject(serverResponse, bids[BID_INDEX]));
    }
    return bidResponses;
  },

  getUserSyncs: function(syncOptions) {
    if (syncOptions.iframeEnabled) {
      return [{
        type: 'iframe',
        url: '//ib.3lift.com/userSync.html'
      }];
    }
  }
}

function _buildResponseObject(serverResponse, bid) {
  var response = serverResponse.body;
  var width = response.width;
  var height = response.height;
  var dealId = bid.deal_id;
  var creativeId = bid.crid;

  if (response.cpm != 0 && response.ad) {
    const bidResponse = {
      requestId: bid.bidId,
      cpm: response.cpm,
      width: width || 1,
      height: height || 1,
      netRevenue: true,
      ad: response.ad,
      creativeId: creativeId || 'tlx',
      dealId: dealId || '',
      currency: 'USD',
      ttl: 33,
    };
    return bidResponse;
  };
}

function _isFlashEnabled() {
  var hasFlash = 0;
  try {
    var fo = new window.ActiveXObject('ShockwaveFlash.ShockwaveFlash');
    if (fo) { hasFlash = 1; }
  } catch (e) {
    if (navigator.mimeTypes &&
      navigator.mimeTypes['application/x-shockwave-flash'] !== undefined &&
      navigator.mimeTypes['application/x-shockwave-flash'].enabledPlugin) {
      hasFlash = 1;
    }
  }
  return hasFlash;
}

registerBidder(tripleliftAdapterSpec);
