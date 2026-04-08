import * as utils from '../src/utils.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { VIDEO, BANNER } from '../src/mediaTypes.js';
import { config } from '../src/config.js';
import { ortbConverter } from '../libraries/ortbConverter/converter.js';

const BIDDER_CODE = 'cpmstar';

const ENDPOINT_DEV = 'https://dev.server.cpmstar.com/view.aspx';
const ENDPOINT_STAGING = 'https://staging.server.cpmstar.com/view.aspx';
const ENDPOINT_PRODUCTION = 'https://server.cpmstar.com/view.aspx';

const DEFAULT_TTL = 300;
const DEFAULT_CURRENCY = 'USD';
const DEFAULT_NET_REVENUE = true;

export const converter = ortbConverter({
  context: {
    ttl: DEFAULT_TTL,
    netRevenue: DEFAULT_NET_REVENUE
  }
});

export const spec = {
  code: BIDDER_CODE,
  gvlid: 1317,
  supportedMediaTypes: [BANNER, VIDEO],
  pageID: Math.floor(Math.random() * 10e6),

  getMediaType: function (bidRequest) {
    if (!bidRequest) return BANNER;
    return !utils.deepAccess(bidRequest, 'mediaTypes.video') ? BANNER : VIDEO;
  },

  getPlayerSize: function (bidRequest) {
    var playerSize = utils.deepAccess(bidRequest, 'mediaTypes.video.playerSize');
    if (!playerSize) return [640, 440];
    if (playerSize[0] != null) playerSize = playerSize[0];
    if (!playerSize || playerSize[0] == null || playerSize[1] == null) return [640, 440];
    return playerSize;
  },

  isBidRequestValid: function (bid) {
    return ((typeof bid.params.placementId === 'string') && !!bid.params.placementId.length) || (typeof bid.params.placementId === 'number');
  },

  buildRequests: function (validBidRequests, bidderRequest) {
    var requests = [];

    for (var i = 0; i < validBidRequests.length; i++) {
      var bidRequest = validBidRequests[i];
      const referer = bidderRequest.refererInfo.page ? bidderRequest.refererInfo.page : bidderRequest.refererInfo.domain;
      const e = utils.getBidIdParameter('endpoint', bidRequest.params);
      const ENDPOINT = e === 'dev' ? ENDPOINT_DEV : e === 'staging' ? ENDPOINT_STAGING : ENDPOINT_PRODUCTION;
      const url = new URL(ENDPOINT);
      const body = {};
      const mediaType = spec.getMediaType(bidRequest);
      const playerSize = spec.getPlayerSize(bidRequest);
      url.searchParams.set('media', mediaType);
      if (mediaType === VIDEO) {
        url.searchParams.set('fv', 0);
        if (playerSize) {
          url.searchParams.set('w', playerSize?.[0]);
          url.searchParams.set('h', playerSize?.[1]);
        }
      }
      url.searchParams.set('json', 'c_b');
      url.searchParams.set('mv', 1);
      url.searchParams.set('poolid', utils.getBidIdParameter('placementId', bidRequest.params));
      url.searchParams.set('reachedTop', bidderRequest.refererInfo.reachedTop);
      url.searchParams.set('requestid', bidRequest.bidId);
      url.searchParams.set('referer', referer);

      const schain = bidRequest?.ortb2?.source?.ext?.schain;
      if (schain && schain.nodes) {
        var schainString = '';
        schainString += schain.ver + ',' + schain.complete;
        for (var i2 = 0; i2 < schain.nodes.length; i2++) {
          var node = schain.nodes[i2];
          schainString += '!' +
            (node.asi || '') + ',' +
            (node.sid || '') + ',' +
            (node.hp || '') + ',' +
            (node.rid || '') + ',' +
            (node.name || '') + ',' +
            (node.domain || '');
        }
        url.searchParams.set('schain', schainString);
      }

      if (bidderRequest.gdprConsent) {
        if (bidderRequest.gdprConsent.consentString != null) {
          url.searchParams.set('gdpr_consent', bidderRequest.gdprConsent.consentString);
        }
        if (bidderRequest.gdprConsent.gdprApplies != null) {
          url.searchParams.set('gdpr', (bidderRequest.gdprConsent.gdprApplies ? 1 : 0));
        }
      }

      if (bidderRequest.uspConsent != null) {
        url.searchParams.set('us_privacy', bidderRequest.uspConsent);
      }

      if (config.getConfig('coppa')) {
        url.searchParams.set('tfcd', (config.getConfig('coppa') ? 1 : 0));
      }

      const adUnitCode = bidRequest.adUnitCode;
      if (adUnitCode) {
        body.adUnitCode = adUnitCode;
      }
      if (mediaType === VIDEO) {
        body.video = utils.deepAccess(bidRequest, 'mediaTypes.video');
      } else if (mediaType === BANNER) {
        body.banner = utils.deepAccess(bidRequest, 'mediaTypes.banner');
      }

      const ortb = converter.toORTB({ bidderRequest, bidRequests: [bidRequest] });
      Object.assign(body, ortb);

      requests.push({
        method: 'POST',
        url: url.toString(),
        bidRequest: bidRequest,
        data: body
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
        utils.logWarn('cpmstarBidAdapter: server response failed check. Missing cpm');
        return;
      }

      var bidResponse = {
        requestId: rawBid.requestid,
        cpm: cpm,
        width: rawBid.width || 0,
        height: rawBid.height || 0,
        currency: rawBid.currency ? rawBid.currency : DEFAULT_CURRENCY,
        netRevenue: rawBid.netRevenue ? rawBid.netRevenue : DEFAULT_NET_REVENUE,
        ttl: rawBid.ttl ? rawBid.ttl : DEFAULT_TTL,
        creativeId: rawBid.creativeid || 0,
        meta: {
          advertiserDomains: rawBid.adomain ? rawBid.adomain : []
        }
      };

      if (rawBid.hasOwnProperty('dealId')) {
        bidResponse.dealId = rawBid.dealId;
      }

      if (mediaType === BANNER && rawBid.code) {
        bidResponse.ad = rawBid.code + (rawBid.px_cr ? "\n<img width=0 height=0 src='" + rawBid.px_cr + "' />" : '');
      } else if (mediaType === VIDEO && rawBid.creativemacros && rawBid.creativemacros.HTML5VID_VASTSTRING) {
        var playerSize = spec.getPlayerSize(bidRequest);
        if (playerSize !== null && playerSize !== undefined) {
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
    if (serverResponses.length === 0 || !serverResponses[0].body) return syncs;
    var usersyncs = serverResponses[0].body[0].syncs;
    if (!usersyncs || usersyncs.length < 0) return syncs;
    for (var i = 0; i < usersyncs.length; i++) {
      var us = usersyncs[i];
      if ((us.type === 'image' && syncOptions.pixelEnabled) || (us.type === 'iframe' && syncOptions.iframeEnabled)) {
        syncs.push(us);
      }
    }
    return syncs;
  }

};

registerBidder(spec);
