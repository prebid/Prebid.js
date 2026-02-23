import {
  deepSetValue,
  logError,
  logWarn,
  getBidIdParameter,
  getUniqueIdentifierStr,
  formatQS,
} from '../src/utils.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';
import { BANNER, VIDEO } from '../src/mediaTypes.js';
import {ajax} from '../src/ajax.js';
import {getUserSyncParams} from '../libraries/userSyncUtils/userSyncUtils.js';
import {getAdMarkup, getBidFloor, getDeviceType, getProcessedSizes} from '../libraries/omsUtils/index.js';
import {getRoundedViewability} from '../libraries/omsUtils/viewability.js';

const BIDDER_CODE = 'oms';
const URL = 'https://rt.marphezis.com/hb';
const TRACK_EVENT_URL = 'https://rt.marphezis.com/prebid';
const USER_SYNC_URL_IFRAME = 'https://rt.marphezis.com/sync?dpid=0';

export const spec = {
  code: BIDDER_CODE,
  aliases: ['brightcom', 'bcmssp'],
  gvlid: 883,
  supportedMediaTypes: [BANNER, VIDEO],
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
      const bidSizes = bid?.mediaTypes?.banner?.sizes || bid.sizes || [];
      const processedSizes = getProcessedSizes(bidSizes);
      const viewabilityAmountRounded = getRoundedViewability(bid.adUnitCode, processedSizes);
      const gpidData = _extractGpidData(bid);

      const imp = {
        id: bid.bidId,
        displaymanagerver: '$prebid.version$',
        ext: {
          ...gpidData
        },
        tagid: String(bid.adUnitCode)
      };

      if (bid?.mediaTypes?.banner) {
        imp.banner = {
          format: processedSizes,
          ext: {
            viewability: viewabilityAmountRounded,
          }
        }
      }

      if (bid?.mediaTypes?.video) {
        imp.video = {
          ...bid.mediaTypes.video,
        }
      }

      const bidFloor = getBidFloor(bid);

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
        devicetype: getDeviceType(navigator.userAgent, bidderRequest?.ortb2?.device?.sua),
        w: screen.width,
        h: screen.height
      },
      tmax: bidderRequest?.timeout
    };

    if (bidderRequest?.gdprConsent) {
      deepSetValue(payload, 'regs.gdpr', +bidderRequest.gdprConsent.gdprApplies);
      deepSetValue(payload, 'user.consent', bidderRequest.gdprConsent.consentString);
    }

    if (bidderRequest?.uspConsent) {
      deepSetValue(payload, 'regs.us_privacy', bidderRequest.uspConsent);
    }

    const gpp = _getGpp(bidderRequest)
    if (gpp) {
      deepSetValue(payload, 'regs.ext.gpp', gpp);
    }

    if (bidderRequest?.ortb2?.regs?.coppa) {
      deepSetValue(payload, 'regs.coppa', 1);
    }

    const schain = bidReqs?.[0]?.ortb2?.source?.ext?.schain;
    if (schain) {
      deepSetValue(payload, 'source.ext.schain', schain)
    }

    if (bidderRequest?.ortb2?.user) {
      deepSetValue(payload, 'user', bidderRequest.ortb2.user)
    }

    if (bidReqs?.[0]?.userIdAsEids) {
      deepSetValue(payload, 'user.ext.eids', bidReqs[0].userIdAsEids || [])
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
  if (!bid.params || !bid.params.publisherId) {
    return false;
  }

  return true;
}

function interpretResponse(serverResponse) {
  let response = [];
  if (!serverResponse.body || typeof serverResponse.body !== 'object') {
    logWarn('OMS server returned empty/non-json response: ' + JSON.stringify(serverResponse.body));
    return response;
  }

  const {body: {id, seatbid}} = serverResponse;

  try {
    if (id && seatbid && seatbid.length > 0 && seatbid[0].bid && seatbid[0].bid.length > 0) {
      response = seatbid[0].bid.map(bid => {
        const bidResponse = {
          requestId: bid.impid,
          cpm: parseFloat(bid.price),
          width: parseInt(bid.w),
          height: parseInt(bid.h),
          creativeId: bid.crid || bid.id,
          currency: 'USD',
          netRevenue: true,
          ttl: 300,
          meta: {
            advertiserDomains: bid?.adomain || []
          }
        };

        if (bid.mtype === 2) {
          bidResponse.mediaType = VIDEO;
          bidResponse.vastXml = bid.adm;
        } else {
          bidResponse.mediaType = BANNER;
          bidResponse.ad = getAdMarkup(bid);
        }

        return bidResponse;
      });
    }
  } catch (e) {
    logError(e, {id, seatbid});
  }

  return response;
}

function getUserSyncs(syncOptions, serverResponses, gdprConsent, uspConsent, gppConsent) {
  const syncs = [];

  if (syncOptions.iframeEnabled) {
    let params = getUserSyncParams(gdprConsent, uspConsent, gppConsent);
    params = Object.keys(params).length ? `&${formatQS(params)}` : '';

    syncs.push({
      type: 'iframe',
      url: USER_SYNC_URL_IFRAME + params,
    });
  }

  return syncs;
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

function _getGpp(bidderRequest) {
  if (bidderRequest?.gppConsent != null) {
    return bidderRequest.gppConsent;
  }

  return (
    bidderRequest?.ortb2?.regs?.gpp ?? { gppString: '', applicableSections: '' }
  );
}

function _extractGpidData(bid) {
  return {
    gpid: bid?.ortb2Imp?.ext?.gpid,
    adserverName: bid?.ortb2Imp?.ext?.data?.adserver?.name,
    adslot: bid?.ortb2Imp?.ext?.data?.adserver?.adslot,
    pbadslot: bid?.ortb2Imp?.ext?.data?.pbadslot,
  }
}

registerBidder(spec);
