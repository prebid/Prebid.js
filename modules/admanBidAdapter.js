import {registerBidder} from '../src/adapters/bidderFactory';
import * as utils from '../src/utils';

const BIDDER_CODE = 'adman';

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: ['video', 'banner'],
  isBidRequestValid: function(bid) {
    const isValid = _validateId(utils.deepAccess(bid, 'params.id'));
    if (!isValid) {
      utils.logError('Adman id parameter is required. Bid aborted.');
    }
    return isValid;
  },
  buildRequests: function(validBidRequests, bidderRequest) {
    const ENDPOINT_URL = '//bidtor.admanmedia.com/prebid';
    const bids = validBidRequests.map(buildRequestObject);
    const payload = {
      referer: utils.getTopWindowUrl(),
      bids,
      deviceWidth: screen.width
    };

    if (bidderRequest && bidderRequest.gdprConsent) {
      payload.gdpr = {
        consent: bidderRequest.gdprConsent.consentString,
        applies: bidderRequest.gdprConsent.gdprApplies
      };
    } else {
      payload.gdpr = {
        consent: ''
      }
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
    if (serverResponse && typeof serverResponse.bids === 'object') {
      return serverResponse.bids;
    }
    return [];
  },
  getUserSyncs: function(syncOptions) {
    if (syncOptions.iframeEnabled) {
      return [{
        type: 'iframe',
        url: '//cs.admanmedia.com/sync_tag/html'
      }];
    }
  }
};

function buildRequestObject(bid) {
  return {
    params: {
      id: utils.getValue(bid.params, 'id'),
      bidId: bid.bidId
    },
    sizes: bid.sizes,
    bidId: utils.getBidIdParameter('bidId', bid),
    bidderRequestId: utils.getBidIdParameter('bidderRequestId', bid),
    adUnitCode: utils.getBidIdParameter('adUnitCode', bid),
    auctionId: utils.getBidIdParameter('auctionId', bid),
    transactionId: utils.getBidIdParameter('transactionId', bid)
  };
}

function _validateId(id = '') {
  return (id.length === 8);
}

registerBidder(spec);
