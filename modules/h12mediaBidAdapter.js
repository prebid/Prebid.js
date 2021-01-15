import * as utils from '../src/utils.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import find from 'core-js-pure/features/array/find.js';
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
    const requestUrl = validBidRequests[0].params.endpointdom || DEFAULT_URL;
    const isiframe = !((window.self === window.top) || window.frameElement);
    const screenSize = getClientDimensions();
    const docSize = getDocumentDimensions();

    const bidrequests = validBidRequests.map((bidRequest) => {
      const bidderParams = bidRequest.params;
      const adUnitElement = document.getElementById(bidRequest.adUnitCode);
      const ishidden = !isVisible(adUnitElement);
      const coords = {
        x: adUnitElement && adUnitElement.getBoundingClientRect().x,
        y: adUnitElement && adUnitElement.getBoundingClientRect().y,
      };

      return {
        bidId: bidRequest.bidId,
        transactionId: bidRequest.transactionId,
        adunitId: bidRequest.adUnitCode,
        pubid: bidderParams.pubid,
        placementid: bidderParams.placementid || '',
        size: bidderParams.size || '',
        adunitSize: bidRequest.mediaTypes.banner.sizes || [],
        coords,
        ishidden,
      };
    });

    return {
      method: 'POST',
      url: requestUrl,
      options: {withCredentials: false},
      data: {
        gdpr: utils.deepAccess(bidderRequest, 'gdprConsent.gdprApplies') ? Boolean(bidderRequest.gdprConsent.gdprApplies & 1) : false,
        gdpr_cs: utils.deepAccess(bidderRequest, 'gdprConsent.gdprApplies') ? bidderRequest.gdprConsent.consentString : '',
        topLevelUrl: window.top.location.href,
        refererUrl: bidderRequest.refererInfo ? bidderRequest.refererInfo.referer : '',
        isiframe,
        version: '$prebid.version$',
        visitorInfo: {
          localTime: getLocalDateFormatted(),
          dayOfWeek: new Date().getDay(),
          screenWidth: screenSize[0],
          screenHeight: screenSize[1],
          docWidth: docSize[0],
          docHeight: docSize[1],
          scrollbarx: window.scrollX,
          scrollbary: window.scrollY,
        },
        bidrequests,
      },
    };
  },

  interpretResponse: function(serverResponse, bidRequests) {
    let bidResponses = [];
    try {
      const serverBody = serverResponse.body;
      if (serverBody) {
        if (serverBody.bids) {
          serverBody.bids.forEach(bidBody => {
            const bidRequest = find(bidRequests.data.bidrequests, bid => bid.bidId === bidBody.bidId);
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
          });
        }
      }
      return bidResponses;
    } catch (err) {
      utils.logError(err);
    }
  },

  getUserSyncs: function(syncOptions, serverResponses, gdprConsent) {
    const serverBody = serverResponses[0].body;
    const syncs = [];
    gdprConsent = gdprConsent || {
      gdprApplies: false, consentString: '',
    };

    if (serverBody) {
      if (serverBody.bids) {
        serverBody.bids.forEach(bidBody => {
          const userSyncUrls = bidBody.usersync || [];
          const userSyncUrlProcess = url => {
            return url
              .replace('{gdpr}', gdprConsent.gdprApplies)
              .replace('{gdpr_cs}', gdprConsent.consentString);
          }

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
          });
        });
      }
    }

    return syncs;
  },
}

function getContext(elem) {
  return elem && window.document.body.contains(elem) ? window : (window.top.document.body.contains(elem) ? top : undefined);
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
  } while ((m < 250) && (lastElem != null) && (elemHidden === false))
  return elemHidden;
}

function isVisible(element) {
  return element && isDefined(getContext(element)) && !getIsHidden(element);
}

function getClientDimensions() {
  try {
    const t = window.top.innerWidth || window.top.document.documentElement.clientWidth || window.top.document.body.clientWidth;
    const e = window.top.innerHeight || window.top.document.documentElement.clientHeight || window.top.document.body.clientHeight;
    return [Math.round(t), Math.round(e)];
  } catch (i) {
    return [0, 0];
  }
}

function getDocumentDimensions() {
  try {
    const D = window.top.document;
    return [D.body.offsetWidth, Math.max(D.body.scrollHeight, D.documentElement.scrollHeight, D.body.offsetHeight, D.documentElement.offsetHeight, D.body.clientHeight, D.documentElement.clientHeight)]
  } catch (t) {
    return [-1, -1]
  }
}

function getLocalDateFormatted() {
  const two = num => ('0' + num).slice(-2);
  const d = new Date();
  return `${d.getFullYear()}-${two(d.getMonth() + 1)}-${two(d.getDate())} ${two(d.getHours())}:${two(d.getMinutes())}:${two(d.getSeconds())}`;
}

registerBidder(spec);
