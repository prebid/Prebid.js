import {registerBidder} from '../src/adapters/bidderFactory';
import * as utils from '../src/utils';

const BIDDER_CODE = 'adman';

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: ['video', 'banner'],
  isBidRequestValid: function(bid) {
    let isValid = false;
    if (typeof bid.params !== 'undefined') {
      let isValidId = _validateId(utils.getValue(bid.params, 'id'));
      isValid = isValidId;
    }

    if (!isValid) {
      utils.logError('Adman id parameter is required. Bid aborted.');
    }
    return isValid;
  },
  buildRequests: function(validBidRequests, bidderRequest) {
    const ENDPOINT_URL = '//bidtor.admanmedia.com/prebid';
    const bids = validBidRequests.map(buildRequestObject);
    const payload = {
      referrer: utils.getTopWindowUrl(),
      bids,
      deviceWidth: screen.width
    };

    if (bidderRequest && bidderRequest.gdprConsent) {
      payload.gdpr = {};
      payload.gdpr.consent = bidderRequest.gdprConsent.consentString;
      payload.gdpr.applies = bidderRequest.gdprConsent.gdprApplies;
    } else {
      payload.gdpr.consent = '';
      payload.gdpr = null;
    }

    const payloadString = JSON.stringify(payload);
    return {
      method: 'POST',
      url: ENDPOINT_URL,
      data: payloadString,
    };
  },
  interpretResponse: function(serverResponse) {
    serverResponse = serverResponse.body;
    return serverResponse.bids;
  },
  getUserSyncs: function(syncOptions, responses, gdprApplies) {
    if (syncOptions.iframeEnabled) {
      return [{
        type: 'iframe',
        url: '//cs.admanmedia.com/sync_tag/html'
      }];
    }
  }
};

function buildRequestObject(bid) {
  const reqObj = {};

  reqObj.params = {};
  reqObj.params.id = utils.getValue(bid.params, 'id');
  reqObj.params.bidId = bid.bidId;
  reqObj.sizes = bid.sizes;
  reqObj.bidId = utils.getBidIdParameter('bidId', bid);
  reqObj.bidderRequestId = utils.getBidIdParameter('bidderRequestId', bid);
  reqObj.adUnitCode = utils.getBidIdParameter('adUnitCode', bid);
  reqObj.auctionId = utils.getBidIdParameter('auctionId', bid);
  reqObj.transactionId = utils.getBidIdParameter('transactionId', bid);
  return reqObj;
}

function _validateId(id = '') {
  return (id.length === 8);
}

registerBidder(spec);
