import * as utils from '../src/utils';
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

    const payload = {
      start_time: utils.timestamp(),
      tmax: 120,
      language: window.navigator.userLanguage || window.navigator.language,
      site: {
        domain: getDomain(),
        iframe: !bidderRequest.refererInfo.reachedTop,
        url: stack && stack.length > 0 ? [stack.length - 1] : null,
        https: (window.location.protocol === 'https:'),
        referrer: bidderRequest.refererInfo.referer
      },
      imps: []
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
        pub_id: req.params.pubId,
        med_id: req.params.medId,
        zone_id: req.params.zoneId,
        bid_id: req.bidId,
        imp_id: req.transactionId,
        sizes: req.sizes,
        force_bid: req.params.forceBid
      });
    }

    return {
      method: 'POST',
      url: '//pubs.smrtb.com/json/publisher/prebid',
      data: JSON.stringify(payload)
    };
  },
  interpretResponse: function(serverResponse, bidRequest) {
    const bidResponses = [];
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
        ttl: 120,
        creativeId: bid.crid,
        netRevenue: true,
        currency: 'USD'
      })
    }

    return bidResponses;
  },
  getUserSyncs: function(syncOptions, serverResponses) {
    const syncs = []
    if (syncOptions.iframeEnabled) {
      syncs.push({
        type: 'iframe',
        url: '//ads.smrtb.com/sync'
      });
    } else if (syncOptions.pixelEnabled) {
      syncs.push({
        type: 'image',
        url: '//ads.smrtb.com/sync'
      });
    }
    return syncs;
  }
};

registerBidder(spec);
