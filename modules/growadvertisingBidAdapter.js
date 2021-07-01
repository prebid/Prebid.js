'use strict';

import * as utils from '../src/utils.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';

const BIDDER_CODE = 'growads';

export const spec = {
  code: BIDDER_CODE,

  isBidRequestValid: function (bid) {
    return bid.params && !!bid.params.zoneId;
  },

  buildRequests: function (validBidRequests) {
    let zoneId;
    let domain;
    let requestURI;
    let data = {};
    const zoneCounters = {};

    return validBidRequests.map(bidRequest => {
      zoneId = utils.getBidIdParameter('zoneId', bidRequest.params);
      domain = utils.getBidIdParameter('domain', bidRequest.params);

      if (!(zoneId in zoneCounters)) {
        zoneCounters[zoneId] = 0;
      }

      if (typeof domain === 'undefined' || domain.length === 0) {
        domain = 'portal.growadvertising.com';
      }

      requestURI = 'https://' + domain + '/adserve/bid';
      data = {
        type: 'prebidjs',
        zoneId: zoneId,
        i: zoneCounters[zoneId]
      };
      zoneCounters[zoneId]++;

      return {
        method: 'GET',
        url: requestURI,
        data: data,
        bidRequest: bidRequest
      };
    });
  },

  interpretResponse: function (serverResponse, bidRequest) {
    const request = bidRequest.bidRequest;
    let bidResponses = [];
    let CPM;
    let width;
    let height;
    let response;
    let isCorrectSize = false;
    let isCorrectCPM = true;
    let minCPM;
    let maxCPM;

    let body = serverResponse.body;

    try {
      response = JSON.parse(body);
    } catch (ex) {
      response = body;
    }

    if (response && response.status === 'success' && request) {
      CPM = parseFloat(response.cpm);
      width = parseInt(response.width);
      height = parseInt(response.height);

      minCPM = utils.getBidIdParameter('minCPM', request.params);
      maxCPM = utils.getBidIdParameter('maxCPM', request.params);
      width = parseInt(response.width);
      height = parseInt(response.height);

      // Ensure response CPM is within the given bounds
      if (minCPM !== '' && CPM < parseFloat(minCPM)) {
        isCorrectCPM = false;
      }
      if (maxCPM !== '' && CPM > parseFloat(maxCPM)) {
        isCorrectCPM = false;
      }

      // Ensure that response ad matches one of the placement sizes.
      utils._each(utils.deepAccess(request, 'mediaTypes.banner.sizes', []), function (size) {
        if (width === size[0] && height === size[1]) {
          isCorrectSize = true;
        }
      });

      if (isCorrectCPM && isCorrectSize) {
        bidResponses.push({
          requestId: request.bidId,
          bidderCode: request.bidder,
          creativeId: response.creativeId,
          cpm: CPM,
          width: width,
          height: height,
          ad: response.ad,
          currency: response.currency,
          netRevenue: true,
          ttl: response.ttl,
          referrer: utils.deepAccess(request, 'refererInfo.referer')
        });
      }
    }

    return bidResponses;
  }
};

registerBidder(spec);
