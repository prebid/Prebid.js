import { inIframe, logError, logMessage, deepAccess, getWinDimensions } from '../src/utils.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { getBoundingClientRect } from '../libraries/boundingClientRect/boundingClientRect.js';
import { getViewportSize } from '../libraries/viewport/viewport.js';
const BIDDER_CODE = 'h12media';
const DEFAULT_URL = 'https://bidder.h12-media.com/prebid/';
const DEFAULT_CURRENCY = 'USD';
const DEFAULT_TTL = 360;
const DEFAULT_NET_REVENUE = false;

export const spec = {
  code: BIDDER_CODE,
  aliases: ['h12'],

  isBidRequestValid: function(bid) {
    return !!(bid.params && bid.params.pubid);
  },

  buildRequests: function(validBidRequests, bidderRequest) {
    const isiframe = inIframe();
    const screenSize = getClientDimensions();
    const docSize = getDocumentDimensions();

    return validBidRequests.map((bidRequest) => {
      const bidderParams = bidRequest.params;
      const requestUrl = bidderParams.endpointdom || DEFAULT_URL;
      let pubsubid = bidderParams.pubsubid || '';
      if (pubsubid && pubsubid.length > 32) {
        logError('Bidder param \'pubsubid\' should be not more than 32 chars.');
        pubsubid = '';
      }
      const pubcontainerid = bidderParams.pubcontainerid;
      const adUnitElement = document.getElementById(pubcontainerid || bidRequest.adUnitCode);
      const ishidden = !isVisible(adUnitElement);
      const framePos = getFramePos();
      const coords = isiframe ? {
        x: framePos[0],
        y: framePos[1],
      } : {
        x: adUnitElement && getBoundingClientRect(adUnitElement).x,
        y: adUnitElement && getBoundingClientRect(adUnitElement).y,
      };

      const bidrequest = {
        bidId: bidRequest.bidId,
        transactionId: bidRequest.ortb2Imp?.ext?.tid,
        adunitId: bidRequest.adUnitCode,
        pubid: bidderParams.pubid,
        placementid: bidderParams.placementid || '',
        size: bidderParams.size || '',
        adunitSize: bidRequest.mediaTypes.banner.sizes || [],
        coords,
        ishidden,
        pubsubid,
        pubcontainerid,
      };

      let windowTop;
      try {
        windowTop = window.top;
      } catch (e) {
        logMessage(e);
        windowTop = window;
      }

      return {
        method: 'POST',
        url: requestUrl,
        options: {withCredentials: true},
        data: {
          gdpr: !!deepAccess(bidderRequest, 'gdprConsent.gdprApplies', false),
          gdpr_cs: deepAccess(bidderRequest, 'gdprConsent.consentString', ''),
          usp: !!deepAccess(bidderRequest, 'uspConsent', false),
          usp_cs: deepAccess(bidderRequest, 'uspConsent', ''),
          topLevelUrl: deepAccess(bidderRequest, 'refererInfo.page', ''),
          // TODO: does the fallback make sense here?
          refererUrl: deepAccess(bidderRequest, 'refererInfo.ref', window.document.referrer),
          isiframe,
          version: '$prebid.version$',
          ExtUserIDs: bidRequest.userId,
          visitorInfo: {
            localTime: getLocalDateFormatted(),
            dayOfWeek: new Date().getDay(),
            screenWidth: screenSize[0],
            screenHeight: screenSize[1],
            docWidth: docSize[0],
            docHeight: docSize[1],
            scrollbarx: windowTop.scrollX,
            scrollbary: windowTop.scrollY,
          },
          bidrequest,
        },
      };
    });
  },

  interpretResponse: function(serverResponse, bidRequests) {
    let bidResponses = [];
    try {
      const serverBody = serverResponse.body;
      if (serverBody) {
        if (serverBody.bid) {
          const bidBody = serverBody.bid;
          const bidRequest = bidRequests.data.bidrequest;
          const bidResponse = {
            currency: serverBody.currency || DEFAULT_CURRENCY,
            netRevenue: serverBody.netRevenue || DEFAULT_NET_REVENUE,
            ttl: serverBody.ttl || DEFAULT_TTL,
            requestId: bidBody.bidId,
            cpm: bidBody.cpm,
            width: bidBody.width,
            height: bidBody.height,
            creativeId: bidBody.creativeId,
            ad: bidBody.ad,
            meta: bidBody.meta,
            mediaType: 'banner',
          };
          if (bidRequest) {
            bidResponse.pubid = bidRequest.pubid;
            bidResponse.placementid = bidRequest.placementid;
            bidResponse.size = bidRequest.size;
          }
          bidResponses.push(bidResponse);
        }
      }
      return bidResponses;
    } catch (err) {
      logError(err);
    }
  },

  getUserSyncs: function(syncOptions, serverResponses, gdprConsent, usPrivacy) {
    const syncs = [];
    const uspApplies = !!deepAccess(usPrivacy, 'uspConsent', false);
    const uspString = deepAccess(usPrivacy, 'uspConsent', '');
    gdprConsent = gdprConsent || {
      gdprApplies: false, consentString: '',
    };

    const userSyncUrlProcess = url => {
      return url
        .replace('{gdpr}', gdprConsent.gdprApplies)
        .replace('{gdpr_cs}', gdprConsent.consentString)
        .replace('{usp}', uspApplies)
        .replace('{usp_cs}', uspString);
    }

    serverResponses.forEach(serverResponse => {
      const userSyncUrls = serverResponse.body.usersync || [];
      userSyncUrls.forEach(sync => {
        if (syncOptions.iframeEnabled && sync.type === 'iframe' && sync.url) {
          syncs.push({
            type: 'iframe',
            url: userSyncUrlProcess(sync.url),
          });
        }
        if (syncOptions.pixelEnabled && sync.type === 'image' && sync.url) {
          syncs.push({
            type: 'image',
            url: userSyncUrlProcess(sync.url),
          });
        }
      })
    });

    return syncs;
  },
}

function getContext(elem) {
  try {
    return elem && window.document.body.contains(elem) ? window : (window.top.document.body.contains(elem) ? top : undefined);
  } catch (e) {
    return undefined;
  }
}

function isDefined(val) {
  return (val !== null) && (typeof val !== 'undefined');
}

function getIsHidden(elem) {
  let lastElem = elem;
  let elemHidden = false;
  let m;
  m = 0;

  do {
    m = m + 1;
    try {
      if (
        getContext(elem).getComputedStyle(lastElem).getPropertyValue('display') === 'none' ||
        getContext(elem).getComputedStyle(lastElem).getPropertyValue('visibility') === 'hidden'
      ) {
        return true;
      } else {
        elemHidden = false;
        lastElem = lastElem.parentElement;
      }
    } catch (o) {
      return false;
    }
  } while ((m < 250) && (lastElem != null) && (elemHidden === false));
  return elemHidden;
}

function isVisible(element) {
  return element && isDefined(getContext(element)) && !getIsHidden(element);
}

function getClientDimensions() {
  try {
    const { width: t, height: e } = getViewportSize();
    return [Math.round(t), Math.round(e)];
  } catch (i) {
    return [0, 0];
  }
}

function getDocumentDimensions() {
  try {
    const {document: {documentElement, body}} = getWinDimensions();
    const width = body.clientWidth;
    const height = Math.max(body.scrollHeight, body.offsetHeight, documentElement.clientHeight, documentElement.scrollHeight, documentElement.offsetHeight);
    return [width, height];
  } catch (t) {
    return [-1, -1]
  }
}

function getLocalDateFormatted() {
  const two = num => ('0' + num).slice(-2);
  const d = new Date();
  return `${d.getFullYear()}-${two(d.getMonth() + 1)}-${two(d.getDate())} ${two(d.getHours())}:${two(d.getMinutes())}:${two(d.getSeconds())}`;
}

function getFramePos() {
  let t = window;
  let m = 0;
  let frmLeft = 0;
  let frmTop = 0;
  do {
    m = m + 1;
    try {
      if (m > 1) {
        t = t.parent
      }
      frmLeft = frmLeft + getBoundingClientRect(t.frameElement).left;
      frmTop = frmTop + getBoundingClientRect(t.frameElement).top;
    } catch (o) { /* keep looping */
    }
  } while ((m < 100) && (t.parent !== t.self))

  return [frmLeft, frmTop];
}

registerBidder(spec);
