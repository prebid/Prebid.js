'use strict';

import { registerBidder } from '../src/adapters/bidderFactory.js';
import { config } from '../src/config.js';
import { BANNER, VIDEO } from '../src/mediaTypes.js';
import { Renderer } from '../src/Renderer.js';
import * as utils from '../src/utils.js';

const OUTSTREAM_RENDERER_URL = 'https://s2.adform.net/banners/scripts/video/outstream/render.js';

const BIDDER_CODE = 'adform';
const GVLID = 50;
export const spec = {
  code: BIDDER_CODE,
  gvlid: GVLID,
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
    var bidder = (bids[0] && bids[0].bidder) || BIDDER_CODE;
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

    request.unshift('https://' + globalParams[0][1] + '/adx/?rp=4');
    netRevenue = netRevenue || 'gross';
    request.push('pt=' + netRevenue);
    request.push('stid=' + validBidRequests[0].auctionId);

    const gdprApplies = utils.deepAccess(bidderRequest, 'gdprConsent.gdprApplies');
    const consentString = utils.deepAccess(bidderRequest, 'gdprConsent.consentString');
    if (gdprApplies !== undefined) {
      gdprObject = {
        gdpr: gdprApplies,
        gdpr_consent: consentString
      };
      request.push('gdpr=' + (gdprApplies & 1));
      request.push('gdpr_consent=' + consentString);
    }

    if (bidderRequest && bidderRequest.uspConsent) {
      request.push('us_privacy=' + bidderRequest.uspConsent);
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
      if (VALID_RESPONSES[response.response] && (verifySize(response, utils.getAdUnitSizes(bid)) || type === VIDEO)) {
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

        if (!bid.renderer && type === VIDEO && utils.deepAccess(bid, 'mediaTypes.video.context') === 'outstream') {
          bidObject.renderer = Renderer.install({id: bid.bidId, url: OUTSTREAM_RENDERER_URL});
          bidObject.renderer.setRender(renderer);
        }

        if (bidRequest.gdpr) {
          bidObject.gdpr = bidRequest.gdpr.gdpr;
          bidObject.gdpr_consent = bidRequest.gdpr.gdpr_consent;
        }
        bidRespones.push(bidObject);
      }
    }
    return bidRespones;

    function renderer(bid) {
      bid.renderer.push(() => {
        window.Adform.renderOutstream(bid);
      });
    }

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
