import {logError, parseSizesInput, isArray, getBidIdParameter, getWinDimensions, getScreenOrientation} from '../src/utils.js';
import {getDevicePixelRatio} from '../libraries/devicePixelRatio/devicePixelRatio.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';
import {getStorageManager} from '../src/storageManager.js';
import {isAutoplayEnabled} from '../libraries/autoplayDetection/autoplay.js';
import {getHLen} from '../libraries/navigatorData/navigatorData.js';
import {getTimeToFirstByte} from '../libraries/timeToFirstBytesUtils/timeToFirstBytesUtils.js';
import { getConnectionInfo } from '../libraries/connectionInfo/connectionUtils.js';

/**
 * @typedef {import('../src/adapters/bidderFactory.js').BidRequest} BidRequest
 * @typedef {import('../src/adapters/bidderFactory.js').Bid} Bid
 */

const BIDDER_CODE = 'teads';
const GVL_ID = 132;
const ENDPOINT_URL = 'https://a.teads.tv/hb/bid-request';
const gdprStatus = {
  GDPR_APPLIES_PUBLISHER: 12,
  GDPR_APPLIES_GLOBAL: 11,
  GDPR_DOESNT_APPLY: 0,
  CMP_NOT_FOUND_OR_ERROR: 22
};

const FP_TEADS_ID_COOKIE_NAME = '_tfpvi';
const OB_USER_TOKEN_KEY = 'OB-USER-TOKEN';

export const storage = getStorageManager({bidderCode: BIDDER_CODE});

export const spec = {
  code: BIDDER_CODE,
  gvlid: GVL_ID,
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
      const isValidPlacementId = _validateId(bid.params.placementId);
      const isValidPageId = _validateId(bid.params.pageId);
      isValid = isValidPlacementId && isValidPageId;
    }

    if (!isValid) {
      logError('Teads placementId and pageId parameters are required. Bid aborted.');
    }
    return isValid;
  },
  /**
   * Make a server request from the list of BidRequests.
   *
   * @param {BidRequest[]} validBidRequests an array of bids
   * @param {Object} bidderRequest
   * @return {Object} Info describing the request to the server.
   */
  buildRequests: function(validBidRequests, bidderRequest) {
    const bids = validBidRequests.map(buildRequestObject);
    const topWindow = window.top;

    const payload = {
      referrer: getReferrerInfo(bidderRequest),
      pageReferrer: document.referrer,
      pageTitle: getPageTitle().slice(0, 300),
      pageDescription: getPageDescription().slice(0, 300),
      networkBandwidth: getConnectionDownLink(),
      networkQuality: getNetworkQuality(),
      timeToFirstByte: getTimeToFirstByte(window),
      data: bids,
      domComplexity: getDomComplexity(document),
      device: bidderRequest?.ortb2?.device || {},
      deviceWidth: screen.width,
      deviceHeight: screen.height,
      devicePixelRatio: getDevicePixelRatio(topWindow),
      screenOrientation: getScreenOrientation(),
      historyLength: getHLen(),
      viewportHeight: getWinDimensions().visualViewport.height,
      viewportWidth: getWinDimensions().visualViewport.width,
      hardwareConcurrency: null,
      deviceMemory: null,
      hb_version: '$prebid.version$',
      timeout: bidderRequest?.timeout,
      eids: getUserIdAsEids(validBidRequests),
      ...getSharedViewerIdParameters(validBidRequests),
      outbrainId: storage.getDataFromLocalStorage(OB_USER_TOKEN_KEY),
      ...getFirstPartyTeadsIdParameter(validBidRequests)
    };

    const firstBidRequest = validBidRequests[0];

    const schain = firstBidRequest?.ortb2?.source?.ext?.schain;
    if (schain) {
      payload.schain = schain;
    }

    const gpp = bidderRequest.gppConsent;
    if (bidderRequest && gpp) {
      const isValidConsentString = typeof gpp.gppString === 'string';
      const validateApplicableSections =
        Array.isArray(gpp.applicableSections) &&
        gpp.applicableSections.every((section) => typeof (section) === 'number')
      payload.gpp = {
        consentString: isValidConsentString ? gpp.gppString : '',
        applicableSectionIds: validateApplicableSections ? gpp.applicableSections : [],
      };
    }

    const gdpr = bidderRequest.gdprConsent;
    if (bidderRequest && gdpr) {
      const isCmp = typeof gdpr.gdprApplies === 'boolean';
      const isConsentString = typeof gdpr.consentString === 'string';
      const status = isCmp
        ? findGdprStatus(gdpr.gdprApplies, gdpr.vendorData)
        : gdprStatus.CMP_NOT_FOUND_OR_ERROR;
      payload.gdpr_iab = {
        consent: isConsentString ? gdpr.consentString : '',
        status: status,
        apiVersion: gdpr.apiVersion
      };
    }

    if (bidderRequest && bidderRequest.uspConsent) {
      payload.us_privacy = bidderRequest.uspConsent;
    }

    const userAgentClientHints = firstBidRequest?.ortb2?.device?.sua;
    if (userAgentClientHints) {
      payload.userAgentClientHints = userAgentClientHints;
    }

    const dsa = bidderRequest?.ortb2?.regs?.ext?.dsa;
    if (dsa) {
      payload.dsa = dsa;
    }

    const payloadString = JSON.stringify(payload);
    return {
      method: 'POST',
      url: ENDPOINT_URL,
      data: payloadString
    };
  },
  /**
   * Unpack the response from the server into a list of bids.
   *
   * @param {*} serverResponse A successful response from the server.
   * @return {Bid[]} An array of bids which were nested inside the server.
   */
  interpretResponse: function(serverResponse, bidderRequest) {
    serverResponse = serverResponse.body;

    if (!serverResponse.responses) {
      return [];
    }

    const autoplayEnabled = isAutoplayEnabled();
    return serverResponse.responses
      .filter((bid) =>
        // ignore this bid if it requires autoplay but it is not enabled on this browser
        !bid.needAutoplay || autoplayEnabled
      ).map((bid) => {
        const bidResponse = {
          cpm: bid.cpm,
          width: bid.width,
          height: bid.height,
          currency: bid.currency,
          netRevenue: true,
          ttl: bid.ttl,
          meta: {
            advertiserDomains: bid && bid.adomain ? bid.adomain : []
          },
          ad: bid.ad,
          requestId: bid.bidId,
          creativeId: bid.creativeId,
          placementId: bid.placementId
        };
        if (bid.dealId) {
          bidResponse.dealId = bid.dealId
        }
        if (bid?.ext?.dsa) {
          bidResponse.meta.dsa = bid.ext.dsa;
        }
        return bidResponse;
      });
  }
};

/**
 *
 * @param {BidRequest[]} validBidRequests an array of bids
 * @returns {{sharedViewerIdKey : 'sharedViewerIdValue'}} object with all sharedviewerids
 */
function getSharedViewerIdParameters(validBidRequests) {
  const sharedViewerIdMapping = {
    unifiedId2: 'uidapi.com', // uid2IdSystem
    liveRampId: 'liveramp.com', // identityLinkIdSystem
    lotamePanoramaId: 'crwdcntrl.net', // lotamePanoramaIdSystem
    id5Id: 'id5-sync.com', // id5IdSystem
    criteoId: 'criteo.com', // criteoIdSystem
    yahooConnectId: 'yahoo.com', // connectIdSystem
    quantcastId: 'quantcast.com', // quantcastIdSystem
    epsilonPublisherLinkId: 'epsilon.com', // publinkIdSystem
    publisherFirstPartyViewerId: 'pubcid.org', // sharedIdSystem
    merkleId: 'merkleinc.com', // merkleIdSystem
    kinessoId: 'kpuid.com' // kinessoIdSystem
  }

  const sharedViewerIdObject = {};
  for (const sharedViewerId in sharedViewerIdMapping) {
    const userIdKey = sharedViewerIdMapping[sharedViewerId];
    validBidRequests[0].userIdAsEids?.forEach((eid) => {
      if (eid.source === userIdKey && eid.uids?.[0].id) {
        sharedViewerIdObject[sharedViewerId] = eid.uids[0].id;
      }
    })
  }
  return sharedViewerIdObject;
}

function getUserIdAsEids(validBidRequests) {
  return validBidRequests?.[0]?.userIdAsEids || [];
}

function getReferrerInfo(bidderRequest) {
  let ref = '';
  if (bidderRequest && bidderRequest.refererInfo && bidderRequest.refererInfo.page) {
    ref = bidderRequest.refererInfo.page;
  }
  return ref;
}

function getPageTitle() {
  try {
    const ogTitle = window.top.document.querySelector('meta[property="og:title"]')

    return window.top.document.title || (ogTitle && ogTitle.content) || '';
  } catch (e) {
    const ogTitle = document.querySelector('meta[property="og:title"]')

    return document.title || (ogTitle && ogTitle.content) || '';
  }
}

function getPageDescription() {
  let element;

  try {
    element = window.top.document.querySelector('meta[name="description"]') ||
      window.top.document.querySelector('meta[property="og:description"]')
  } catch (e) {
    element = document.querySelector('meta[name="description"]') ||
      document.querySelector('meta[property="og:description"]')
  }

  return (element && element.content) || '';
}

function getConnectionDownLink() {
  const connection = getConnectionInfo();
  return connection?.downlink != null ? connection.downlink.toString() : '';
}

function getNetworkQuality() {
  const connection = getConnectionInfo();

  return connection?.effectiveType ?? '';
}

function getDomComplexity(document) {
  return document?.querySelectorAll('*')?.length ?? -1;
}

function findGdprStatus(gdprApplies, gdprData) {
  let status = gdprStatus.GDPR_APPLIES_PUBLISHER;
  if (gdprApplies) {
    if (gdprData && !gdprData.isServiceSpecific) {
      status = gdprStatus.GDPR_APPLIES_GLOBAL;
    }
  } else {
    status = gdprStatus.GDPR_DOESNT_APPLY;
  }
  return status;
}

function buildRequestObject(bid) {
  const reqObj = {};
  const placementId = bid.params.placementId;
  const pageId = bid.params.pageId;
  const gpid = bid?.ortb2Imp?.ext?.gpid;
  const videoPlcmt = bid?.mediaTypes?.video?.plcmt;

  reqObj.sizes = getSizes(bid);
  reqObj.bidId = getBidIdParameter('bidId', bid);
  reqObj.bidderRequestId = getBidIdParameter('bidderRequestId', bid);
  reqObj.placementId = parseInt(placementId, 10);
  reqObj.pageId = parseInt(pageId, 10);
  reqObj.adUnitCode = getBidIdParameter('adUnitCode', bid);
  reqObj.transactionId = bid.ortb2Imp?.ext?.tid || '';
  if (gpid) { reqObj.gpid = gpid; }
  if (videoPlcmt) { reqObj.videoPlcmt = videoPlcmt; }
  return reqObj;
}

function getSizes(bid) {
  return parseSizesInput(concatSizes(bid));
}

function concatSizes(bid) {
  const playerSize = bid?.mediaTypes?.video?.playerSize;
  const videoSizes = bid?.mediaTypes?.video?.sizes;
  const bannerSizes = bid?.mediaTypes?.banner?.sizes;

  if (isArray(bannerSizes) || isArray(playerSize) || isArray(videoSizes)) {
    const mediaTypesSizes = [bannerSizes, videoSizes, playerSize];
    return mediaTypesSizes
      .reduce(function(acc, currSize) {
        if (isArray(currSize)) {
          if (isArray(currSize[0])) {
            currSize.forEach(function (childSize) {
              acc.push(childSize);
            })
          } else {
            acc.push(currSize);
          }
        }
        return acc;
      }, []);
  } else {
    return bid.sizes;
  }
}

function _validateId(id) {
  return (parseInt(id) > 0);
}

/**
 * Get the first-party cookie Teads ID parameter to be sent in bid request.
 * @param validBidRequests an array of bids
 * @returns `{} | {firstPartyCookieTeadsId: string}`
 */
function getFirstPartyTeadsIdParameter(validBidRequests) {
  const firstPartyTeadsIdFromUserIdModule = validBidRequests?.[0]?.userIdAsEids?.find(eid => eid.source === 'teads.com')?.uids?.[0].id;

  if (firstPartyTeadsIdFromUserIdModule) {
    return {firstPartyCookieTeadsId: firstPartyTeadsIdFromUserIdModule};
  }

  if (storage.cookiesAreEnabled(null)) {
    const firstPartyTeadsIdFromCookie = storage.getCookie(FP_TEADS_ID_COOKIE_NAME, null);

    if (firstPartyTeadsIdFromCookie) {
      return {firstPartyCookieTeadsId: firstPartyTeadsIdFromCookie};
    }
  }

  return {};
}

registerBidder(spec);
