import {registerBidder} from '../src/adapters/bidderFactory.js';
import {config} from '../src/config.js';
import {BANNER, VIDEO} from '../src/mediaTypes.js';
import * as utils from '../src/utils.js';

const BIDDER_CODE = 'richaudience';
let REFERER = '';

export const spec = {
  code: BIDDER_CODE,
  aliases: ['ra'],
  supportedMediaTypes: [BANNER, VIDEO],

  /***
     * Determines whether or not the given bid request is valid
     *
     * @param {bidRequest} bid The bid params to validate.
     * @returns {boolean} True if this is a valid bid, and false otherwise
     */
  isBidRequestValid: function (bid) {
    return !!(bid.params && bid.params.pid && bid.params.supplyType);
  },
  /***
     * Build a server request from the list of valid BidRequests
     * @param {validBidRequests} is an array of the valid bids
     * @param {bidderRequest} bidder request object
     * @returns {ServerRequest} Info describing the request to the server
     */
  buildRequests: function (validBidRequests, bidderRequest) {
    return validBidRequests.map(bid => {
      var payload = {
        bidfloor: bid.params.bidfloor,
        ifa: bid.params.ifa,
        pid: bid.params.pid,
        supplyType: bid.params.supplyType,
        currencyCode: config.getConfig('currency.adServerCurrency'),
        auctionId: bid.auctionId,
        bidId: bid.bidId,
        BidRequestsCount: bid.bidRequestsCount,
        bidder: bid.bidder,
        bidderRequestId: bid.bidderRequestId,
        tagId: bid.adUnitCode,
        sizes: raiGetSizes(bid),
        referer: (typeof bidderRequest.refererInfo.referer != 'undefined' ? encodeURIComponent(bidderRequest.refererInfo.referer) : null),
        numIframes: (typeof bidderRequest.refererInfo.numIframes != 'undefined' ? bidderRequest.refererInfo.numIframes : null),
        transactionId: bid.transactionId,
        timeout: config.getConfig('bidderTimeout'),
        user: raiSetEids(bid),
        demand: raiGetDemandType(bid) ? 'video' : 'display',
        videoData: raiGetVideoInfo(bid)
      };

      REFERER = (typeof bidderRequest.refererInfo.referer != 'undefined' ? encodeURIComponent(bidderRequest.refererInfo.referer) : null)

      payload.gdpr_consent = '';
      payload.gdpr = null;

      if (bidderRequest && bidderRequest.gdprConsent) {
        payload.gdpr_consent = bidderRequest.gdprConsent.consentString;
        payload.gdpr = bidderRequest.gdprConsent.gdprApplies;
      }

      var payloadString = JSON.stringify(payload);

      var endpoint = 'https://shb.richaudience.com/hb/';

      return {
        method: 'POST',
        url: endpoint,
        data: payloadString,
      };
    });
  },
  /***
     * Read the response from the server and build a list of bids
     * @param {serverResponse} Response from the server.
     * @param {bidRequest} Bid request object
     * @returns {bidResponses} Array of bids which were nested inside the server
     */
  interpretResponse: function (serverResponse, bidRequest) {
    const bidResponses = [];
    // try catch
    var response = serverResponse.body;
    if (response) {
      var bidResponse = {
        requestId: JSON.parse(bidRequest.data).bidId,
        cpm: response.cpm,
        width: response.width,
        height: response.height,
        creativeId: response.creative_id,
        mediaType: response.media_type,
        netRevenue: response.netRevenue,
        currency: response.currency,
        ttl: response.ttl,
        dealId: response.dealId,
      };

      if (response.media_type === 'video') {
        bidResponse.vastXml = response.vastXML;
      } else {
        bidResponse.ad = response.adm
      }

      bidResponses.push(bidResponse);
    }
    return bidResponses
  },
  /***
     * User Syncs
     *
     * @param {syncOptions} Publisher prebid configuration
     * @param {serverResponses} Response from the server
     * @param {gdprConsent} GPDR consent object
     * @returns {Array}
     */
  getUserSyncs: function (syncOptions, serverResponses, gdprConsent) {
    const syncs = [];

    var rand = Math.floor(Math.random() * 9999999999);
    var syncUrl = '';
    var consent = '';

    if (gdprConsent && typeof gdprConsent.consentString === 'string' && typeof gdprConsent.consentString != 'undefined') {
      consent = `pubconsent='${gdprConsent.consentString}'&euconsent='${gdprConsent.consentString}'`
    }

    if (syncOptions.iframeEnabled) {
      syncUrl = 'https://sync.richaudience.com/dcf3528a0b8aa83634892d50e91c306e/?ord=' + rand
      if (consent != '') {
        syncUrl += `&${consent}`
      }
      syncs.push({
        type: 'iframe',
        url: syncUrl
      });
    }

    if (syncOptions.pixelEnabled && REFERER != null && syncs.length == 0) {
      syncUrl = `https://sync.richaudience.com/bf7c142f4339da0278e83698a02b0854/?referrer=${REFERER}`;
      if (consent != '') {
        syncUrl += `&${consent}`
      }
      syncs.push({
        type: 'image',
        url: syncUrl
      });
    }
    return syncs
  },
};

registerBidder(spec);

function raiGetSizes(bid) {
  let raiNewSizes;
  if (bid.mediaTypes && bid.mediaTypes.banner && bid.mediaTypes.banner.sizes) {
    raiNewSizes = bid.mediaTypes.banner.sizes
  }
  if (raiNewSizes != null) {
    return raiNewSizes.map(size => ({
      w: size[0],
      h: size[1]
    }));
  }
}

function raiGetDemandType(bid) {
  if (bid.mediaTypes != undefined) {
    if (bid.mediaTypes.video != undefined) {
      return true;
    }
  }
  return false;
}

function raiGetVideoInfo(bid) {
  let videoData = [];
  if (raiGetDemandType(bid)) {
    videoData.push({format: bid.mediaTypes.video.context});
    videoData.push({playerSize: bid.mediaTypes.video.playerSize});
    videoData.push({mimes: bid.mediaTypes.video.mimes});
  }
  return videoData;
}

function raiSetEids(bid) {
  let eids = [];

  if (bid && bid.userId) {
    raiSetUserId(bid, eids, 'id5-sync.com', utils.deepAccess(bid, `userId.id5id`));
    raiSetUserId(bid, eids, 'pubcommon', utils.deepAccess(bid, `userId.pubcid`));
    raiSetUserId(bid, eids, 'criteo.com', utils.deepAccess(bid, `userId.criteoId`));
    raiSetUserId(bid, eids, 'liveramp.com', utils.deepAccess(bid, `userId.idl_env`));
    raiSetUserId(bid, eids, 'liveintent.com', utils.deepAccess(bid, `userId.lipb.lipbid`));
    raiSetUserId(bid, eids, 'adserver.org', utils.deepAccess(bid, `userId.tdid`));
  }

  return eids;
}

function raiSetUserId(bid, eids, source, value) {
  if (utils.isStr(value)) {
    eids.push({
      userId: value,
      source: source
    });
  }
}
