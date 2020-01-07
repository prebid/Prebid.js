'use strict';

import {registerBidder} from '../src/adapters/bidderFactory';
import { config } from '../src/config';
import { BANNER, VIDEO } from '../src/mediaTypes';

const BIDDER_CODE = 'adform';
export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [ BANNER, VIDEO ],
  isBidRequestValid: function (bid) {
    return !!(bid.params.mid);
  },
  buildRequests: function (validBidRequests, bidderRequest) {
    var i, l, j, k, bid, _key, _value, reqParams, netRevenue, gdprObject;
    const currency = config.getConfig('currency.adServerCurrency');

    var request = [];
    var globalParams = [ [ 'adxDomain', 'adx.adform.net' ], [ 'fd', 1 ], [ 'url', null ], [ 'tid', null ] ];
    var bids = JSON.parse(JSON.stringify(validBidRequests));
    var bidder = (bids[0] && bids[0].bidder) || BIDDER_CODE
    for (i = 0, l = bids.length; i < l; i++) {
      bid = bids[i];
      if ((bid.params.priceType === 'net') || (bid.params.pt === 'net')) {
        netRevenue = 'net';
      }
      for (j = 0, k = globalParams.length; j < k; j++) {
        _key = globalParams[j][0];
        _value = bid[_key] || bid.params[_key];
        if (_value) {
          bid[_key] = bid.params[_key] = null;
          globalParams[j][1] = _value;
        }
      }
      reqParams = bid.params;
      reqParams.transactionId = bid.transactionId;
      reqParams.rcur = reqParams.rcur || currency;
      request.push(formRequestUrl(reqParams));
    }

    request.unshift('//' + globalParams[0][1] + '/adx/?rp=4');
    netRevenue = netRevenue || 'gross';
    request.push('pt=' + netRevenue);
    request.push('stid=' + validBidRequests[0].auctionId);

    if (bidderRequest && bidderRequest.gdprConsent && bidderRequest.gdprConsent.gdprApplies) {
      gdprObject = {
        gdpr: bidderRequest.gdprConsent.gdprApplies,
        gdpr_consent: bidderRequest.gdprConsent.consentString
      };
      request.push('gdpr=' + gdprObject.gdpr);
      request.push('gdpr_consent=' + gdprObject.gdpr_consent);
    }

    for (i = 1, l = globalParams.length; i < l; i++) {
      _key = globalParams[i][0];
      _value = globalParams[i][1];
      if (_value) {
        request.push(_key + '=' + encodeURIComponent(_value));
      }
    }

    return {
      method: 'GET',
      url: request.join('&'),
      bids: validBidRequests,
      netRevenue: netRevenue,
      bidder,
      gdpr: gdprObject
    };

    function formRequestUrl(reqData) {
      var key;
      var url = [];

      for (key in reqData) {
        if (reqData.hasOwnProperty(key) && reqData[key]) { url.push(key, '=', reqData[key], '&'); }
      }

      return encodeURIComponent(btoa(url.join('').slice(0, -1)));
    }
  },
  interpretResponse: function (serverResponse, bidRequest) {
    const VALID_RESPONSES = {
      banner: 1,
      vast_content: 1,
      vast_url: 1
    };
    var bidObject, response, bid, type;
    var bidRespones = [];
    var bids = bidRequest.bids;
    var responses = serverResponse.body;
    for (var i = 0; i < responses.length; i++) {
      response = responses[i];
      type = response.response === 'banner' ? BANNER : VIDEO;
      bid = bids[i];
      if (VALID_RESPONSES[response.response] && (verifySize(response, bid.sizes) || type === VIDEO)) {
        bidObject = {
          requestId: bid.bidId,
          cpm: response.win_bid,
          width: response.width,
          height: response.height,
          creativeId: bid.bidId,
          dealId: response.deal_id,
          currency: response.win_cur,
          netRevenue: bidRequest.netRevenue !== 'gross',
          ttl: 360,
          ad: response.banner,
          bidderCode: bidRequest.bidder,
          transactionId: bid.transactionId,
          vastUrl: response.vast_url,
          vastXml: response.vast_content,
          mediaType: type
        };
        if (bidRequest.gdpr) {
          bidObject.gdpr = bidRequest.gdpr.gdpr;
          bidObject.gdpr_consent = bidRequest.gdpr.gdpr_consent;
        }
        bidRespones.push(bidObject);
      }
    }
    return bidRespones;

    function verifySize(adItem, validSizes) {
      for (var j = 0, k = validSizes.length; j < k; j++) {
        if (adItem.width == validSizes[j][0] &&
            adItem.height == validSizes[j][1]) {
          return true;
        }
      }
      return false;
    }
  }
};
registerBidder(spec);
