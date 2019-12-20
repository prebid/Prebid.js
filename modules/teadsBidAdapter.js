import {registerBidder} from '../src/adapters/bidderFactory';
const utils = require('../src/utils');
const BIDDER_CODE = 'teads';
const ENDPOINT_URL = 'https://a.teads.tv/hb/bid-request';
const gdprStatus = {
  GDPR_APPLIES_PUBLISHER: 12,
  GDPR_APPLIES_GLOBAL: 11,
  GDPR_DOESNT_APPLY: 0,
  CMP_NOT_FOUND_OR_ERROR: 22
}

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: ['video', 'banner'],
  /**
   * Determines whether or not the given bid request is valid.
   *
   * @param {BidRequest} bid The bid params to validate.
   * @return boolean True if this is a valid bid, and false otherwise.
   */
  isBidRequestValid: function(bid) {
    let isValid = false;
    if (typeof bid.params !== 'undefined') {
      let isValidPlacementId = _validateId(utils.getValue(bid.params, 'placementId'));
      let isValidPageId = _validateId(utils.getValue(bid.params, 'pageId'));
      isValid = isValidPlacementId && isValidPageId;
    }

    if (!isValid) {
      utils.logError('Teads placementId and pageId parameters are required. Bid aborted.');
    }
    return isValid;
  },
  /**
   * Make a server request from the list of BidRequests.
   *
   * @param {validBidRequests[]} an array of bids
   * @return ServerRequest Info describing the request to the server.
   */
  buildRequests: function(validBidRequests, bidderRequest) {
    const bids = validBidRequests.map(buildRequestObject);
    const payload = {
      referrer: getReferrerInfo(bidderRequest),
      data: bids,
      deviceWidth: screen.width,
      hb_version: '$prebid.version$'
    };

    if (validBidRequests[0].schain) {
      payload.schain = validBidRequests[0].schain;
    }

    let gdpr = bidderRequest.gdprConsent;
    if (bidderRequest && gdpr) {
      let isCmp = (typeof gdpr.gdprApplies === 'boolean')
      let isConsentString = (typeof gdpr.consentString === 'string')
      let status = isCmp ? findGdprStatus(gdpr.gdprApplies, gdpr.vendorData) : gdprStatus.CMP_NOT_FOUND_OR_ERROR
      payload.gdpr_iab = {
        consent: isConsentString ? gdpr.consentString : '',
        status: status
      };
    }

    if (bidderRequest && bidderRequest.uspConsent) {
      payload.us_privacy = bidderRequest.uspConsent
    }

    const payloadString = JSON.stringify(payload);
    return {
      method: 'POST',
      url: ENDPOINT_URL,
      data: payloadString,
    };
  },
  /**
   * Unpack the response from the server into a list of bids.
   *
   * @param {*} serverResponse A successful response from the server.
   * @return {Bid[]} An array of bids which were nested inside the server.
   */
  interpretResponse: function(serverResponse, bidderRequest) {
    const bidResponses = [];
    serverResponse = serverResponse.body;

    if (serverResponse.responses) {
      serverResponse.responses.forEach(function (bid) {
        const bidResponse = {
          cpm: bid.cpm,
          width: bid.width,
          height: bid.height,
          currency: bid.currency,
          netRevenue: true,
          ttl: bid.ttl,
          ad: bid.ad,
          requestId: bid.bidId,
          creativeId: bid.creativeId,
          placementId: bid.placementId
        };
        bidResponses.push(bidResponse);
      });
    }
    return bidResponses;
  },

  getUserSyncs: function(syncOptions, responses, gdprConsent) {
    let queryParams = {
      hb_provider: 'prebid',
      hb_version: '$prebid.version$'
    };

    if (gdprConsent) {
      let gdprIab = {
        status: findGdprStatus(gdprConsent.gdprApplies, gdprConsent.vendorData),
        consent: gdprConsent.consentString
      };

      queryParams.gdprIab = JSON.stringify(gdprIab)
    }

    if (utils.deepAccess(responses[0], 'body.responses.0.placementId')) {
      queryParams.placementId = responses[0].body.responses[0].placementId
    };

    if (syncOptions.iframeEnabled) {
      return [{
        type: 'iframe',
        url: 'https://sync.teads.tv/iframe?' + utils.parseQueryStringParameters(queryParams)
      }];
    }
  }
};

function getReferrerInfo(bidderRequest) {
  let ref = '';
  if (bidderRequest && bidderRequest.refererInfo && bidderRequest.refererInfo.referer) {
    ref = bidderRequest.refererInfo.referer;
  }
  return ref;
}

function findGdprStatus(gdprApplies, gdprData) {
  let status = gdprStatus.GDPR_APPLIES_PUBLISHER;

  if (gdprApplies) {
    if (gdprData.hasGlobalScope || gdprData.hasGlobalConsent) status = gdprStatus.GDPR_APPLIES_GLOBAL
  } else status = gdprStatus.GDPR_DOESNT_APPLY
  return status;
}

function buildRequestObject(bid) {
  const reqObj = {};
  let placementId = utils.getValue(bid.params, 'placementId');
  let pageId = utils.getValue(bid.params, 'pageId');

  reqObj.sizes = getSizes(bid);
  reqObj.bidId = utils.getBidIdParameter('bidId', bid);
  reqObj.bidderRequestId = utils.getBidIdParameter('bidderRequestId', bid);
  reqObj.placementId = parseInt(placementId, 10);
  reqObj.pageId = parseInt(pageId, 10);
  reqObj.adUnitCode = utils.getBidIdParameter('adUnitCode', bid);
  reqObj.auctionId = utils.getBidIdParameter('auctionId', bid);
  reqObj.transactionId = utils.getBidIdParameter('transactionId', bid);
  return reqObj;
}

function getSizes(bid) {
  return utils.parseSizesInput(concatSizes(bid));
}

function concatSizes(bid) {
  let playerSize = utils.deepAccess(bid, 'mediaTypes.video.playerSize');
  let videoSizes = utils.deepAccess(bid, 'mediaTypes.video.sizes');
  let bannerSizes = utils.deepAccess(bid, 'mediaTypes.banner.sizes');

  if (utils.isArray(bannerSizes) || utils.isArray(playerSize) || utils.isArray(videoSizes)) {
    let mediaTypesSizes = [bannerSizes, videoSizes, playerSize];
    return mediaTypesSizes
      .reduce(function(acc, currSize) {
        if (utils.isArray(currSize)) {
          if (utils.isArray(currSize[0])) {
            currSize.forEach(function (childSize) { acc.push(childSize) })
          } else {
            acc.push(currSize);
          }
        }
        return acc;
      }, [])
  } else {
    return bid.sizes;
  }
}

function _validateId(id) {
  return (parseInt(id) > 0);
}

registerBidder(spec);
