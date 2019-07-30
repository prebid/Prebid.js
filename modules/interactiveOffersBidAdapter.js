import * as utils from '../src/utils';
import {registerBidder} from '../src/adapters/bidderFactory';
import {config} from '../src/config';

const BIDDER_CODE = 'interactiveOffers';
const BIDDER_ENDPOINT = 'https://connect.interactiveoffers.com/api/endpoint.php';
const TIMEOUT_DEFAULT = 5000;

export const spec = {
  code: BIDDER_CODE,
  aliases: ['ino'],
  isBidRequestValid: function(bid) {
    if (!('params' in bid)) {
      utils.logError(bid.bidder + ': No required params, please check your settings');
      return false;
    }
    if (!(bid.params.pubId)) {
      utils.logError(bid.bidder + ': No required param pubId, please check your settings');
      return false;
    }
    return true;
  },

  buildRequests: function(validBidRequests, bidderRequest) {
    let serverRequests = [];
    for (let i = 0; i < validBidRequests.length; i++) {
      let bidRequest = validBidRequests[i];
      let bidRequestParams = bidRequest.params;
      let pubId = utils.getBidIdParameter('pubId', bidRequestParams);

      // Loc param is optional but always is sent to endpoint
      let location = utils.getBidIdParameter('loc', bidRequestParams);
      if (!location) {
        location = utils.getTopWindowUrl();
      }

      // Tmax param is optional but always is sent to endpoint
      let tmax = utils.getBidIdParameter('tmax', bidRequestParams);
      if (!tmax) {
        tmax = TIMEOUT_DEFAULT;
      }

      serverRequests.push({
        method: 'POST',
        url: BIDDER_ENDPOINT,
        data: Object.assign({
          'pubId': pubId,
          'bidId': utils.getUniqueIdentifierStr(),
          'loc': location,
          'tmax': tmax,
          'sizes': bidRequest.sizes
        }),
        options: {withCredentials: false},
        bidRequest: bidRequest
      });
    }
    return serverRequests;
  },

  interpretResponse: function(serverResponse, request) {
    let bidResponses = [];
    if (!serverResponse || serverResponse.error) {
      utils.logError(BIDDER_CODE + ': server response error', serverResponse);
      return bidResponses;
    }

    const serverBody = serverResponse.body;
    if (!serverBody || serverBody.success !== 'true') {
      utils.logError(BIDDER_CODE + ': empty bid response');
      return bidResponses;
    }

    const serverPayloadData = serverBody.payloadData;
    if (!serverPayloadData || Array.isArray(serverPayloadData)) {
      utils.logError(BIDDER_CODE + ': server response no data', serverResponse);
      return bidResponses;
    }

    const CPM = serverPayloadData.cpm;
    if (CPM > 0) {
      let bidResponse = {
        requestId: request.bidRequest.bidId,
        cpm: CPM,
        width: serverPayloadData.width,
        height: serverPayloadData.height,
        creativeId: serverPayloadData.bidId,
        ttl: config.getConfig('_bidderTimeout'),
        referrer: utils.getTopWindowUrl(),
        currency: 'USD',
        netRevenue: true,
        ad: serverPayloadData.ad
      };
      bidResponses.push(bidResponse);
    }

    return bidResponses;
  },
};
registerBidder(spec);
