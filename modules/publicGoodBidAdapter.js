'use strict';

import {registerBidder} from '../src/adapters/bidderFactory.js';
import {BANNER, NATIVE} from '../src/mediaTypes.js';

const BIDDER_CODE = 'publicgood';
const PUBLIC_GOOD_ENDPOINT = 'https://advice.pgs.io';
var PGSAdServed = false;

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER, NATIVE],

  isBidRequestValid: function (bid) {
    if (PGSAdServed || !bid.params.partnerId || !bid.params.slotId) {
      return false;
    }

    return true;
  },

  buildRequests: function (validBidRequests, bidderRequest) {
    let partnerId = "";
    let slotId = "";

    if (validBidRequests[0] && validBidRequests[0].params) {
      partnerId = validBidRequests[0].params.partnerId;
      slotId = validBidRequests[0].params.slotId;
    }

    let payload = {
      url: bidderRequest.refererInfo.page || bidderRequest.refererInfo.referer,
      partner_id: partnerId,
      isprebid: true,
      slotid: slotId,
      bidRequest: validBidRequests[0]
    }

    return {
      method: 'POST',
      url: PUBLIC_GOOD_ENDPOINT,
      data: payload,
      options: {
        withCredentials: false,
      },
      bidId: validBidRequests[0].bidId
    }
  },

  interpretResponse: function (serverResponse, bidRequest) {
    const serverBody = serverResponse.body;
    let bidResponses = [];
    let bidResponse = {};
    let partnerId = serverBody && serverBody.targetData ? serverBody.targetData.partner_id : "error";

    if (!serverBody || typeof serverBody !== 'object') {
      return [];
    }

    if (serverBody.action !== 'Hide' && !PGSAdServed) {
      bidResponse.requestId = bidRequest.bidId;
      bidResponse.creativeId = serverBody.targetData.target_id;
      bidResponse.cpm = serverBody.targetData.cpm;
      bidResponse.width = 320;
      bidResponse.height = 470;
      bidResponse.ad = `<div class="pgs-dpg-flex" data-pgs-partner-id="${partnerId}" style="height: 470px; width: 100%"></div> <script async type="text/JavaScript" src="https://assets.publicgood.com/pgm/v1/dpg.js"></script>`;
      bidResponse.currency = 'USD';
      bidResponse.netRevenue = true;
      bidResponse.ttl = 360;
      bidResponse.meta = {advertiserDomains: []};
      bidResponses.push(bidResponse);
    }

    return bidResponses;
  },

  onBidWon: function(bid) {
    // Win once per page load
    PGSAdServed = true;
  }

};
registerBidder(spec);
