
import * as utils from '../src/utils.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { VIDEO, BANNER } from '../src/mediaTypes.js';
import { config } from '../src/config.js';

const BIDDER_CODE = 'cpmstar';

const ENDPOINT_DEV = 'https://dev.server.cpmstar.com/view.aspx';
const ENDPOINT_STAGING = 'https://staging.server.cpmstar.com/view.aspx';
const ENDPOINT_PRODUCTION = 'https://server.cpmstar.com/view.aspx';

const DEFAULT_TTL = 300;
const DEFAULT_CURRENCY = 'USD';

function fixedEncodeURIComponent(str) {
  return encodeURIComponent(str).replace(/[!'()*]/g, function(c) {
    return '%' + c.charCodeAt(0).toString(16);
  });
}

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER, VIDEO],
  pageID: Math.floor(Math.random() * 10e6),

  getMediaType: function (bidRequest) {
    if (bidRequest == null) return BANNER;
    return !utils.deepAccess(bidRequest, 'mediaTypes.video') ? BANNER : VIDEO;
  },

  getPlayerSize: function (bidRequest) {
    var playerSize = utils.deepAccess(bidRequest, 'mediaTypes.video.playerSize');
    if (playerSize == null) return [640, 440];
    if (playerSize[0] != null) playerSize = playerSize[0];
    if (playerSize == null || playerSize[0] == null || playerSize[1] == null) return [640, 440];
    return playerSize;
  },

  isBidRequestValid: function (bid) {
    return ((typeof bid.params.placementId === 'string') && !!bid.params.placementId.length) || (typeof bid.params.placementId === 'number');
  },

  buildRequests: function (validBidRequests, bidderRequest) {
    var requests = [];
    // This reference to window.top can cause issues when loaded in an iframe if not protected with a try/catch.

    for (var i = 0; i < validBidRequests.length; i++) {
      var bidRequest = validBidRequests[i];
      var referer = encodeURIComponent(bidderRequest.refererInfo.referer);
      var e = utils.getBidIdParameter('endpoint', bidRequest.params);
      var ENDPOINT = e == 'dev' ? ENDPOINT_DEV : e == 'staging' ? ENDPOINT_STAGING : ENDPOINT_PRODUCTION;
      var mediaType = spec.getMediaType(bidRequest);
      var playerSize = spec.getPlayerSize(bidRequest);
      var videoArgs = '&fv=0' + (playerSize ? ('&w=' + playerSize[0] + '&h=' + playerSize[1]) : '');
      var url = ENDPOINT + '?media=' + mediaType + (mediaType == VIDEO ? videoArgs : '') +
        '&json=c_b&mv=1&poolid=' + utils.getBidIdParameter('placementId', bidRequest.params) +
        '&reachedTop=' + encodeURIComponent(bidderRequest.refererInfo.reachedTop) +
        '&requestid=' + bidRequest.bidId +
        '&referer=' + encodeURIComponent(referer);

      if (bidRequest.schain && bidRequest.schain.nodes) {
        var schain = bidRequest.schain;
        var schainString = '';
        schainString += schain.ver + ',' + schain.complete;
        for (var i2 = 0; i2 < schain.nodes.length; i2++) {
          var node = schain.nodes[i2];
          schainString += '!' +
            fixedEncodeURIComponent(node.asi || '') + ',' +
            fixedEncodeURIComponent(node.sid || '') + ',' +
            fixedEncodeURIComponent(node.hp || '') + ',' +
            fixedEncodeURIComponent(node.rid || '') + ',' +
            fixedEncodeURIComponent(node.name || '') + ',' +
            fixedEncodeURIComponent(node.domain || '');
        }
        url += '&schain=' + schainString
      }

      if (bidderRequest.gdprConsent) {
        if (bidderRequest.gdprConsent.consentString != null) {
          url += '&gdpr_consent=' + bidderRequest.gdprConsent.consentString;
        }
        if (bidderRequest.gdprConsent.gdprApplies != null) {
          url += '&gdpr=' + (bidderRequest.gdprConsent.gdprApplies ? 1 : 0);
        }
      }

      if (bidderRequest.uspConsent != null) {
        url += '&us_privacy=' + bidderRequest.uspConsent;
      }

      if (config.getConfig('coppa')) {
        url += '&tfcd=' + (config.getConfig('coppa') ? 1 : 0);
      }

      requests.push({
        method: 'GET',
        url: url,
        bidRequest: bidRequest,
      });
    }

    return requests;
  },

  interpretResponse: function (serverResponse, request) {
    var bidRequest = request.bidRequest;
    var mediaType = spec.getMediaType(bidRequest);

    var bidResponses = [];

    if (!Array.isArray(serverResponse.body)) {
      serverResponse.body = [serverResponse.body];
    }

    for (var i = 0; i < serverResponse.body.length; i++) {
      var raw = serverResponse.body[i];
      var rawBid = raw.creatives[0];
      if (!rawBid) {
        utils.logWarn('cpmstarBidAdapter: server response failed check');
        return;
      }
      var cpm = (parseFloat(rawBid.cpm) || 0);

      if (!cpm) {
        utils.logWarn('cpmstarBidAdapter: server response failed check. Missing cpm')
        return;
      }

      var bidResponse = {
        requestId: rawBid.requestid,
        cpm: cpm,
        width: rawBid.width || 0,
        height: rawBid.height || 0,
        currency: rawBid.currency ? rawBid.currency : DEFAULT_CURRENCY,
        netRevenue: rawBid.netRevenue ? rawBid.netRevenue : true,
        ttl: rawBid.ttl ? rawBid.ttl : DEFAULT_TTL,
        creativeId: rawBid.creativeid || 0,
      };

      if (rawBid.hasOwnProperty('dealId')) {
        bidResponse.dealId = rawBid.dealId
      }

      if (mediaType == BANNER && rawBid.code) {
        bidResponse.ad = rawBid.code + (rawBid.px_cr ? "\n<img width=0 height=0 src='" + rawBid.px_cr + "' />" : '');
      } else if (mediaType == VIDEO && rawBid.creativemacros && rawBid.creativemacros.HTML5VID_VASTSTRING) {
        var playerSize = spec.getPlayerSize(bidRequest);
        if (playerSize != null) {
          bidResponse.width = playerSize[0];
          bidResponse.height = playerSize[1];
        }
        bidResponse.mediaType = VIDEO;
        bidResponse.vastXml = rawBid.creativemacros.HTML5VID_VASTSTRING;
      } else {
        return utils.logError('bad response', rawBid);
      }

      bidResponses.push(bidResponse);
    }

    return bidResponses;
  },

  getUserSyncs: function (syncOptions, serverResponses) {
    const syncs = [];
    if (serverResponses.length == 0 || !serverResponses[0].body) return syncs;
    var usersyncs = serverResponses[0].body[0].syncs;
    if (!usersyncs || usersyncs.length < 0) return syncs;
    for (var i = 0; i < usersyncs.length; i++) {
      var us = usersyncs[i];
      if ((us.type === 'image' && syncOptions.pixelEnabled) || (us.type == 'iframe' && syncOptions.iframeEnabled)) {
        syncs.push(us);
      }
    }
    return syncs;
  }

};
registerBidder(spec);
