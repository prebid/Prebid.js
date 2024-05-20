import {
  isArray,
  getWindowTop,
  deepSetValue,
  logError,
  logWarn,
  createTrackPixelHtml,
  getWindowSelf,
  isFn,
  isPlainObject,
  getBidIdParameter,
  getUniqueIdentifierStr,
} from '../src/utils.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';
import {BANNER} from '../src/mediaTypes.js';
import {ajax} from '../src/ajax.js';
import {percentInView} from '../libraries/percentInView/percentInView.js';

const BIDDER_CODE = 'oms';
const URL = 'https://rt.marphezis.com/hb';
const TRACK_EVENT_URL = 'https://rt.marphezis.com/prebid'

export const spec = {
  code: BIDDER_CODE,
  aliases: ['brightcom', 'bcmssp'],
  gvlid: 883,
  supportedMediaTypes: [BANNER],
  isBidRequestValid,
  buildRequests,
  interpretResponse,
  onBidderError,
  onBidWon,
  getUserSyncs,
};

function buildRequests(bidReqs, bidderRequest) {
  try {
    const impressions = bidReqs.map(bid => {
      let bidSizes = bid?.mediaTypes?.banner?.sizes || bid.sizes;
      bidSizes = ((isArray(bidSizes) && isArray(bidSizes[0])) ? bidSizes : [bidSizes]);
      bidSizes = bidSizes.filter(size => isArray(size));
      const processedSizes = bidSizes.map(size => ({w: parseInt(size[0], 10), h: parseInt(size[1], 10)}));

      const element = document.getElementById(bid.adUnitCode);
      const minSize = _getMinSize(processedSizes);
      const viewabilityAmount = _isViewabilityMeasurable(element) ? _getViewability(element, getWindowTop(), minSize) : 'na';
      const viewabilityAmountRounded = isNaN(viewabilityAmount) ? viewabilityAmount : Math.round(viewabilityAmount);
      const gpidData = _extractGpidData(bid);

      const imp = {
        id: bid.bidId,
        banner: {
          format: processedSizes,
          ext: {
            viewability: viewabilityAmountRounded,
          }
        },
        ext: {
          ...gpidData
        },
        tagid: String(bid.adUnitCode)
      };

      const bidFloor = _getBidFloor(bid);

      if (bidFloor) {
        imp.bidfloor = bidFloor;
      }

      return imp;
    })

    const referrer = bidderRequest?.refererInfo?.page || '';
    const publisherId = getBidIdParameter('publisherId', bidReqs[0].params);

    const payload = {
      id: getUniqueIdentifierStr(),
      imp: impressions,
      site: {
        domain: bidderRequest?.refererInfo?.domain || '',
        page: referrer,
        publisher: {
          id: publisherId
        }
      },
      device: {
        devicetype: _getDeviceType(navigator.userAgent, bidderRequest?.ortb2?.device?.sua),
        w: screen.width,
        h: screen.height
      },
      tmax: bidderRequest?.timeout
    };

    if (bidderRequest?.gdprConsent) {
      deepSetValue(payload, 'regs.ext.gdpr', +bidderRequest.gdprConsent.gdprApplies);
      deepSetValue(payload, 'user.ext.consent', bidderRequest.gdprConsent.consentString);
    }

    const gpp = _getGpp(bidderRequest)
    if (gpp) {
      deepSetValue(payload, 'regs.ext.gpp', gpp);
    }

    if (bidderRequest?.ortb2?.regs?.coppa) {
      deepSetValue(payload, 'regs.coppa', 1);
    }

    if (bidReqs?.[0]?.schain) {
      deepSetValue(payload, 'source.ext.schain', bidReqs[0].schain)
    }

    if (bidderRequest?.ortb2?.user) {
      deepSetValue(payload, 'user', bidderRequest.ortb2.user)
    }

    if (bidReqs?.[0]?.userIdAsEids) {
      deepSetValue(payload, 'user.ext.eids', bidReqs[0].userIdAsEids || [])
    }

    if (bidReqs?.[0].userId) {
      deepSetValue(payload, 'user.ext.ids', bidReqs[0].userId || [])
    }

    if (bidderRequest?.ortb2?.site?.content) {
      deepSetValue(payload, 'site.content', bidderRequest.ortb2.site.content)
    }

    return {
      method: 'POST',
      url: URL,
      data: JSON.stringify(payload),
    };
  } catch (e) {
    logError(e, {bidReqs, bidderRequest});
  }
}

function isBidRequestValid(bid) {
  if (bid.bidder !== BIDDER_CODE || !bid.params || !bid.params.publisherId) {
    return false;
  }

  return true;
}

function interpretResponse(serverResponse) {
  let response = [];
  if (!serverResponse.body || typeof serverResponse.body != 'object') {
    logWarn('OMS server returned empty/non-json response: ' + JSON.stringify(serverResponse.body));
    return response;
  }

  const {body: {id, seatbid}} = serverResponse;

  try {
    if (id && seatbid && seatbid.length > 0 && seatbid[0].bid && seatbid[0].bid.length > 0) {
      response = seatbid[0].bid.map(bid => {
        return {
          requestId: bid.impid,
          cpm: parseFloat(bid.price),
          width: parseInt(bid.w),
          height: parseInt(bid.h),
          creativeId: bid.crid || bid.id,
          currency: 'USD',
          netRevenue: true,
          mediaType: BANNER,
          ad: _getAdMarkup(bid),
          ttl: 300,
          meta: {
            advertiserDomains: bid?.adomain || []
          }
        };
      });
    }
  } catch (e) {
    logError(e, {id, seatbid});
  }

  return response;
}

// Don't do user sync for now
function getUserSyncs(syncOptions, responses, gdprConsent) {
  return [];
}

function onBidderError(errorData) {
  if (errorData === null || !errorData.bidderRequest) {
    return;
  }

  _trackEvent('error', errorData.bidderRequest)
}

function onBidWon(bid) {
  if (bid === null) {
    return;
  }

  _trackEvent('bidwon', bid)
}

function _trackEvent(endpoint, data) {
  ajax(`${TRACK_EVENT_URL}/${endpoint}`, null, JSON.stringify(data), {
    method: 'POST',
    withCredentials: false
  });
}

function _getDeviceType(ua, sua) {
  if (sua?.mobile || (/(ios|ipod|ipad|iphone|android)/i).test(ua)) {
    return 1
  }

  if ((/(smart[-]?tv|hbbtv|appletv|googletv|hdmi|netcast\.tv|viera|nettv|roku|\bdtv\b|sonydtv|inettvbrowser|\btv\b)/i).test(ua)) {
    return 3
  }

  return 2
}

function _getGpp(bidderRequest) {
  if (bidderRequest?.gppConsent != null) {
    return bidderRequest.gppConsent;
  }

  return (
    bidderRequest?.ortb2?.regs?.gpp ?? { gppString: '', applicableSections: '' }
  );
}

function _getAdMarkup(bid) {
  let adm = bid.adm;
  if ('nurl' in bid) {
    adm += createTrackPixelHtml(bid.nurl);
  }
  return adm;
}

function _isViewabilityMeasurable(element) {
  return !_isIframe() && element !== null;
}

function _getViewability(element, topWin, {w, h} = {}) {
  return getWindowTop().document.visibilityState === 'visible' ? percentInView(element, topWin, {w, h}) : 0;
}

function _extractGpidData(bid) {
  return {
    gpid: bid?.ortb2Imp?.ext?.gpid,
    adserverName: bid?.ortb2Imp?.ext?.data?.adserver?.name,
    adslot: bid?.ortb2Imp?.ext?.data?.adserver?.adslot,
    pbadslot: bid?.ortb2Imp?.ext?.data?.pbadslot,
  }
}

function _isIframe() {
  try {
    return getWindowSelf() !== getWindowTop();
  } catch (e) {
    return true;
  }
}

function _getMinSize(sizes) {
  return sizes.reduce((min, size) => size.h * size.w < min.h * min.w ? size : min);
}

function _getBidFloor(bid) {
  if (!isFn(bid.getFloor)) {
    return bid.params.bidFloor ? bid.params.bidFloor : null;
  }

  let floor = bid.getFloor({
    currency: 'USD', mediaType: '*', size: '*'
  });
  if (isPlainObject(floor) && !isNaN(floor.floor) && floor.currency === 'USD') {
    return floor.floor;
  }
  return null;
}

registerBidder(spec);
