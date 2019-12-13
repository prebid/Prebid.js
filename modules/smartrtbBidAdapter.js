
import * as utils from '../src/utils';
import { config } from '../src/config';
import {registerBidder} from '../src/adapters/bidderFactory';
const BIDDER_CODE = 'smartrtb';

function getDomain () {
  if (!utils.inIframe()) {
    return window.location.hostname
  }
  let origins = window.document.location.ancestorOrigins
  if (origins && origins.length > 0) {
    return origins[origins.length - 1]
  }
}

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [ 'banner', 'video' ],
  aliases: ['smrtb'],
  isBidRequestValid: function(bid) {
    return (bid.params.pubId !== null &&
      bid.params.medId !== null &&
      bid.params.zoneId !== null);
  },
  buildRequests: function(validBidRequests, bidderRequest) {
    let stack = (bidderRequest.refererInfo &&
      bidderRequest.refererInfo.stack ? bidderRequest.refererInfo
      : [])

    let spb = (config.getConfig('userSync') && config.getConfig('userSync').syncsPerBidder)
      ? config.getConfig('userSync').syncsPerBidder : 5

    const payload = {
      start_time: utils.timestamp(),
      language: window.navigator.userLanguage || window.navigator.language,
      site: {
        domain: getDomain(),
        iframe: !bidderRequest.refererInfo.reachedTop,
        url: stack && stack.length > 0 ? [stack.length - 1] : null,
        https: (window.location.protocol === 'https:'),
        referrer: bidderRequest.refererInfo.referer
      },
      imps: [],
      user_ids: validBidRequests[0].userId,
      sync_limit: spb
    };

    if (bidderRequest && bidderRequest.gdprConsent) {
      payload.gdpr = {
        applies: bidderRequest.gdprConsent.gdprApplies,
        consent: bidderRequest.gdprConsent.consentString
      };
    }

    for (let x = 0; x < validBidRequests.length; x++) {
      let req = validBidRequests[x]

      payload.imps.push({
        zone_id: req.params.zoneId,
        bid_id: req.bidId,
        imp_id: req.transactionId,
        sizes: req.sizes,
        force_bid: req.params.forceBid,
        media_types: utils.deepAccess(req, 'mediaTypes'),
        has_renderer: (req.renderer !== undefined)
      });
    }

    let params = validBidRequests[0].params
    let url = params.endpoint ? params.endpoint : 'https://market-global.smrtb.com/json/publisher/prebid'
    return {
      method: 'POST',
      url: url,
      data: JSON.stringify(payload)
    };
  },
  interpretResponse: function(serverResponse, bidRequest) {
    const bidResponses = [];
    if (!serverResponse || !serverResponse.body) {
      return bidResponses
    }

    let res = serverResponse.body;
    if (!res.bids || !res.bids.length) {
      return []
    }

    for (let x = 0; x < serverResponse.body.bids.length; x++) {
      let bid = serverResponse.body.bids[x]

      bidResponses.push({
        requestId: bid.bid_id,
        cpm: bid.cpm,
        width: bid.w,
        height: bid.h,
        ad: bid.html,
        vastUrl: bid.vast_url,
        vastXml: bid.vast_xml,
        mediaType: bid.html ? 'banner' : 'video',
        ttl: 120,
        creativeId: bid.crid,
        dealId: bid.deal_id,
        netRevenue: true,
        currency: 'USD'
      })
    }

    return bidResponses;
  },
  getUserSyncs: function(syncOptions, serverResponses) {
    const syncs = []

    if (!serverResponses.length || !serverResponses[0].body) {
      return syncs
    }

    let pixels = serverResponses[0].body.pixels
    if (!pixels || !pixels.length) {
      return syncs
    }

    for (let x = 0; x < pixels.length; x++) {
      let pixel = pixels[x]

      if ((pixel.type === 'iframe' && syncOptions.iframeEnabled) ||
        (pixel.type === 'image' && syncOptions.pixelEnabled)) {
        syncs.push(pixel)
      }
    }
    return syncs;
  }
};

registerBidder(spec);
