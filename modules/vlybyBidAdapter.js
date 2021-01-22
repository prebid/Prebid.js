import {registerBidder} from '../src/adapters/bidderFactory.js';
const utils = require('../src/utils.js');
const BIDDER_CODE = 'vlyby';
const GVL_ID = 123;
const ENDPOINT_URL = 'http://localhost:3000/prebid';
const SCRIPT_URL = 'http://localhost:3000/qad/qad-outer2.js';
const gdprStatus = {
  GDPR_APPLIES_PUBLISHER: 12,
  GDPR_APPLIES_GLOBAL: 11,
  GDPR_DOESNT_APPLY: 0,
  CMP_NOT_FOUND_OR_ERROR: 22
}

export const spec = {
  code: BIDDER_CODE,
  gvlid: GVL_ID,
  supportedMediaTypes: ['banner'],

  isBidRequestValid: function(bid) {
    let isValid = false;
    if (typeof bid.params !== 'undefined') {
      let isValidPlacementId = _validateId(utils.getValue(bid.params, 'placementId'));
      let isValidPageId = _validateId(utils.getValue(bid.params, 'pageId'));
      isValid = isValidPlacementId && isValidPageId;
    }

    if (!isValid) {
      utils.logError('Vlyby placementId and pubId parameters are required. Bid aborted.');
    }
    return isValid;
  },

  buildRequests: function(validBidRequests, bidderRequest) {
    const bids = validBidRequests.map(buildRequestObject);
    const payload = {
      referrer: getReferrerInfo(bidderRequest),
      pageReferrer: document.referrer,
      networkBandwidth: getConnectionDownLink(window.navigator),
      timeToFirstByte: getTimeToFirstByte(window),
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
      let status = isCmp
        ? findGdprStatus(gdpr.gdprApplies, gdpr.vendorData, gdpr.apiVersion)
        : gdprStatus.CMP_NOT_FOUND_OR_ERROR
      payload.gdpr_iab = {
        consent: isConsentString ? gdpr.consentString : '',
        status: status,
        apiVersion: gdpr.apiVersion
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
          ad: getBannerHtml(),
          requestId: bid.requestId,
          placementId: bid.placementId,
          pubId: bid.pubId,
          divId: bid.divId
        };
        if (bid.dealId) {
          bidResponse.dealId = bid.dealId
        }
        bidResponses.push(bidResponse);
      });
    }
    return bidResponses;
  },
};

function getBannerHtml (bid) {
  return `
    <div id="${bid.dataDivid}">
      <script async='true' type='text/javascript'
              src="${SCRIPT_URL}" data-PubId='${bid.pubId}'
              data-PlacementId='${bid.placementId}' data-DivId='${bid.dataDivid}'>
      </script>
    </div>
    `;
}

function getReferrerInfo(bidderRequest) {
  let ref = '';
  if (bidderRequest && bidderRequest.refererInfo && bidderRequest.refererInfo.referer) {
    ref = bidderRequest.refererInfo.referer;
  }
  return ref;
}

function getConnectionDownLink(nav) {
  return nav && nav.connection && nav.connection.downlink >= 0 ? nav.connection.downlink.toString() : '';
}

function getTimeToFirstByte(win) {
  const performance = win.performance || win.webkitPerformance || win.msPerformance || win.mozPerformance;

  const ttfbWithTimingV2 = performance &&
    typeof performance.getEntriesByType === 'function' &&
    Object.prototype.toString.call(performance.getEntriesByType) === '[object Function]' &&
    performance.getEntriesByType('navigation')[0] &&
    performance.getEntriesByType('navigation')[0].responseStart &&
    performance.getEntriesByType('navigation')[0].requestStart &&
    performance.getEntriesByType('navigation')[0].responseStart > 0 &&
    performance.getEntriesByType('navigation')[0].requestStart > 0 &&
    Math.round(
      performance.getEntriesByType('navigation')[0].responseStart - performance.getEntriesByType('navigation')[0].requestStart
    );

  if (ttfbWithTimingV2) {
    return ttfbWithTimingV2.toString();
  }

  const ttfbWithTimingV1 = performance &&
    performance.timing.responseStart &&
    performance.timing.requestStart &&
    performance.timing.responseStart > 0 &&
    performance.timing.requestStart > 0 &&
    performance.timing.responseStart - performance.timing.requestStart;

  return ttfbWithTimingV1 ? ttfbWithTimingV1.toString() : '';
}

function findGdprStatus(gdprApplies, gdprData, apiVersion) {
  let status = gdprStatus.GDPR_APPLIES_PUBLISHER
  if (gdprApplies) {
    if (isGlobalConsent(gdprData, apiVersion)) status = gdprStatus.GDPR_APPLIES_GLOBAL
  } else status = gdprStatus.GDPR_DOESNT_APPLY
  return status;
}

function isGlobalConsent(gdprData, apiVersion) {
  return gdprData && apiVersion === 1
    ? (gdprData.hasGlobalScope || gdprData.hasGlobalConsent)
    : gdprData && apiVersion === 2
      ? !gdprData.isServiceSpecific
      : false
}

function buildRequestObject(bid) {
  const reqObj = {};
  let placementId = utils.getValue(bid.params, 'placementId');
  let pageId = utils.getValue(bid.params, 'pageId');

  reqObj.sizes = getSizes(bid);
  reqObj.bidId = utils.getBidIdParameter('bidId', bid);
  reqObj.bidderRequestId = utils.getBidIdParameter('bidderRequestId', bid);
  reqObj.pubId = utils.getBidIdParameter('adUnitCode', bid.pubId);
  reqObj.divId = utils.getBidIdParameter('adUnitCode', bid.divId);
  reqObj.placementId = utils.getBidIdParameter('adUnitCode', bid.placementId);
  // reqObj.pageId = parseInt(pageId, 10);
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
