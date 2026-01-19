import {
  deepAccess,
  deepClone,
  deepSetValue,
  getUniqueIdentifierStr,
  isArray,
  logWarn,
  formatQS
} from '../src/utils.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';
import {Renderer} from '../src/Renderer.js';
import {BANNER, VIDEO} from '../src/mediaTypes.js';
import { getFirstSize, getOsVersion, getVideoSizes, getBannerSizes, isConnectedTV, getDoNotTrack, isMobile, isBannerBid, isVideoBid, getBannerBidFloor, getVideoBidFloor, getVideoTargetingParams, getTopWindowLocation } from '../libraries/advangUtils/index.js';
import { getConnectionInfo } from '../libraries/connectionInfo/connectionUtils.js';

const ADAPTER_VERSION = '1.21';
const GVLID = 157;
const ADAPTER_NAME = 'BFIO_PREBID';
const OUTSTREAM = 'outstream';
const CURRENCY = 'USD';

export const VIDEO_ENDPOINT = 'https://reachms.bfmio.com/bid.json?exchange_id=';
export const BANNER_ENDPOINT = 'https://display.bfmio.com/prebid_display';
export const OUTSTREAM_SRC = 'https://player-cdn.beachfrontmedia.com/playerapi/loader/outstream.js';
export const SYNC_IFRAME_ENDPOINT = 'https://sync.bfmio.com/sync_iframe';
export const SYNC_IMAGE_ENDPOINT = 'https://sync.bfmio.com/syncb';

export const VIDEO_TARGETING = ['mimes', 'playbackmethod', 'maxduration', 'placement', 'plcmt', 'skip', 'skipmin', 'skipafter'];
export const DEFAULT_MIMES = ['video/mp4', 'application/javascript'];

export const SUPPORTED_USER_IDS = [
  { key: 'tdid', source: 'adserver.org', rtiPartner: 'TDID', queryParam: 'tdid' },
  { key: 'idl_env', source: 'liveramp.com', rtiPartner: 'idl', queryParam: 'idl' },
  { key: 'uid2.id', source: 'uidapi.com', rtiPartner: 'UID2', queryParam: 'uid2' },
  { key: 'hadronId', source: 'audigent.com', atype: 1, queryParam: 'hadronid' }
];

let appId = '';

export const spec = {
  code: 'beachfront',
  supportedMediaTypes: [ VIDEO, BANNER ],
  gvlid: GVLID,
  isBidRequestValid(bid) {
    if (isVideoBid(bid)) {
      if (!getVideoBidParam(bid, 'appId')) {
        logWarn('Beachfront: appId param is required for video bids.');
        return false;
      }
      if (!getVideoBidParam(bid, 'bidfloor')) {
        logWarn('Beachfront: bidfloor param is required for video bids.');
        return false;
      }
    }
    if (isBannerBid(bid)) {
      if (!getBannerBidParam(bid, 'appId')) {
        logWarn('Beachfront: appId param is required for banner bids.');
        return false;
      }
      if (!getBannerBidParam(bid, 'bidfloor')) {
        logWarn('Beachfront: bidfloor param is required for banner bids.');
        return false;
      }
    }
    return true;
  },

  buildRequests(bids, bidderRequest) {
    const requests = [];
    const videoBids = bids.filter(bid => isVideoBidValid(bid));
    const bannerBids = bids.filter(bid => isBannerBidValid(bid));
    videoBids.forEach(bid => {
      appId = getVideoBidParam(bid, 'appId');
      requests.push({
        method: 'POST',
        url: VIDEO_ENDPOINT + appId,
        data: createVideoRequestData(bid, bidderRequest),
        bidRequest: bid
      });
    });
    if (bannerBids.length) {
      appId = getBannerBidParam(bannerBids[0], 'appId');
      requests.push({
        method: 'POST',
        url: BANNER_ENDPOINT,
        data: createBannerRequestData(bannerBids, bidderRequest),
        bidRequest: bannerBids
      });
    }
    return requests;
  },

  interpretResponse(response, { bidRequest }) {
    response = response.body;

    if (isVideoBid(bidRequest)) {
      if (!response || !response.bidPrice) {
        logWarn(`No valid video bids from ${spec.code} bidder`);
        return [];
      }
      const sizes = getVideoSizes(bidRequest);
      const firstSize = getFirstSize(sizes);
      const context = deepAccess(bidRequest, 'mediaTypes.video.context');
      const responseType = getVideoBidParam(bidRequest, 'responseType') || 'both';
      const responseMeta = Object.assign({ mediaType: VIDEO, advertiserDomains: [] }, response.meta);
      const bidResponse = {
        requestId: bidRequest.bidId,
        cpm: response.bidPrice,
        width: firstSize.w,
        height: firstSize.h,
        creativeId: response.crid || response.cmpId,
        meta: responseMeta,
        renderer: context === OUTSTREAM ? createRenderer(bidRequest) : null,
        mediaType: VIDEO,
        currency: CURRENCY,
        netRevenue: true,
        ttl: 300
      };

      if (responseType === 'nurl' || responseType === 'both') {
        bidResponse.vastUrl = response.url;
      }

      if (responseType === 'adm' || responseType === 'both') {
        bidResponse.vastXml = response.vast;
      }

      return bidResponse;
    } else {
      if (!response || !response.length) {
        logWarn(`No valid banner bids from ${spec.code} bidder`);
        return [];
      }
      return response
        .filter(bid => bid.adm)
        .map((bid) => {
          const request = ((bidRequest) || []).find(req => req.adUnitCode === bid.slot);
          const responseMeta = Object.assign({ mediaType: BANNER, advertiserDomains: [] }, bid.meta);
          return {
            requestId: request.bidId,
            bidderCode: spec.code,
            ad: bid.adm,
            creativeId: bid.crid,
            cpm: bid.price,
            width: bid.w,
            height: bid.h,
            meta: responseMeta,
            mediaType: BANNER,
            currency: CURRENCY,
            netRevenue: true,
            ttl: 300
          };
        });
    }
  },

  getUserSyncs(syncOptions, serverResponses = [], gdprConsent = {}, uspConsent = '', gppConsent = {}) {
    const { gdprApplies, consentString = '' } = gdprConsent;
    const { gppString = '', applicableSections = [] } = gppConsent;
    const bannerResponse = ((serverResponses) || []).find((res) => isArray(res.body));

    const syncs = [];
    const params = {
      id: appId,
      gdpr: gdprApplies ? 1 : 0,
      gc: consentString,
      gce: 1,
      us_privacy: uspConsent,
      gpp: gppString,
      gpp_sid: Array.isArray(applicableSections) ? applicableSections.join(',') : ''
    };

    if (bannerResponse) {
      if (syncOptions.iframeEnabled) {
        bannerResponse.body
          .filter(bid => bid.sync)
          .forEach(bid => {
            syncs.push({
              type: 'iframe',
              url: bid.sync
            });
          });
      }
    } else if (syncOptions.iframeEnabled) {
      syncs.push({
        type: 'iframe',
        url: `${SYNC_IFRAME_ENDPOINT}?ifg=1&${formatQS(params)}`
      });
    } else if (syncOptions.pixelEnabled) {
      syncs.push({
        type: 'image',
        url: `${SYNC_IMAGE_ENDPOINT}?pid=144&${formatQS(params)}`
      });
    }

    return syncs;
  }
};

function createRenderer(bidRequest) {
  const renderer = Renderer.install({
    id: bidRequest.bidId,
    url: OUTSTREAM_SRC,
    loaded: false
  });

  renderer.setRender(bid => {
    bid.renderer.push(() => {
      window.Beachfront.Player(bid.adUnitCode, {
        adTagUrl: bid.vastUrl,
        width: bid.width,
        height: bid.height,
        expandInView: getPlayerBidParam(bidRequest, 'expandInView', false),
        collapseOnComplete: getPlayerBidParam(bidRequest, 'collapseOnComplete', true),
        progressColor: getPlayerBidParam(bidRequest, 'progressColor'),
        adPosterColor: getPlayerBidParam(bidRequest, 'adPosterColor')
      });
    });
  });

  return renderer;
}

function getVideoBidParam(bid, key) {
  return deepAccess(bid, 'params.video.' + key) || deepAccess(bid, 'params.' + key);
}

function getBannerBidParam(bid, key) {
  return deepAccess(bid, 'params.banner.' + key) || deepAccess(bid, 'params.' + key);
}

function getPlayerBidParam(bid, key, defaultValue) {
  const param = deepAccess(bid, 'params.player.' + key);
  return param === undefined ? defaultValue : param;
}

function isVideoBidValid(bid) {
  return isVideoBid(bid) && getVideoBidParam(bid, 'appId') && getVideoBidParam(bid, 'bidfloor');
}

function isBannerBidValid(bid) {
  return isBannerBid(bid) && getBannerBidParam(bid, 'appId') && getBannerBidParam(bid, 'bidfloor');
}

function getEids(bid) {
  return SUPPORTED_USER_IDS
    .map(getUserId(bid))
    .filter(x => x);
}

function getUserId(bid) {
  return ({ key, source, rtiPartner, atype }) => {
    const id = deepAccess(bid, `userId.${key}`);
    return id ? formatEid(id, source, rtiPartner, atype) : null;
  };
}

function formatEid(id, source, rtiPartner, atype) {
  const uid = { id };
  if (rtiPartner) {
    uid.ext = { rtiPartner };
  }
  if (atype) {
    uid.atype = atype;
  }
  return {
    source,
    uids: [uid]
  };
}

function createVideoRequestData(bid, bidderRequest) {
  const sizes = getVideoSizes(bid);
  const firstSize = getFirstSize(sizes);
  const video = getVideoTargetingParams(bid, VIDEO_TARGETING);
  const appId = getVideoBidParam(bid, 'appId');
  const bidfloor = getVideoBidFloor(bid);
  const tagid = getVideoBidParam(bid, 'tagid');
  const topLocation = getTopWindowLocation(bidderRequest);
  const eids = getEids(bid);
  const ortb2 = deepClone(bidderRequest.ortb2);
  const payload = {
    isPrebid: true,
    appId: appId,
    domain: document.location.hostname,
    id: getUniqueIdentifierStr(),
    imp: [{
      video: Object.assign({
        w: firstSize.w,
        h: firstSize.h,
        mimes: DEFAULT_MIMES
      }, video),
      bidfloor: bidfloor,
      tagid: tagid,
      secure: topLocation.protocol.indexOf('https') === 0 ? 1 : 0,
      displaymanager: ADAPTER_NAME,
      displaymanagerver: ADAPTER_VERSION
    }],
    site: {
      ...deepAccess(ortb2, 'site', {}),
      page: topLocation.href,
      domain: topLocation.hostname
    },
    device: {
      ua: navigator.userAgent,
      language: navigator.language,
      devicetype: isMobile() ? 1 : isConnectedTV() ? 3 : 2,
      dnt: getDoNotTrack() ? 1 : 0,
      js: 1,
      geo: {}
    },
    app: deepAccess(ortb2, 'app'),
    user: deepAccess(ortb2, 'user'),
    cur: [CURRENCY]
  };

  if (bidderRequest && bidderRequest.uspConsent) {
    deepSetValue(payload, 'regs.ext.us_privacy', bidderRequest.uspConsent);
  }

  if (bidderRequest && bidderRequest.gdprConsent) {
    const { gdprApplies, consentString } = bidderRequest.gdprConsent;
    deepSetValue(payload, 'regs.ext.gdpr', gdprApplies ? 1 : 0);
    deepSetValue(payload, 'user.ext.consent', consentString);
  }

  if (bidderRequest && bidderRequest.gppConsent) {
    const { gppString, applicableSections } = bidderRequest.gppConsent;
    deepSetValue(payload, 'regs.gpp', gppString);
    deepSetValue(payload, 'regs.gpp_sid', applicableSections);
  }

  const schain = bid?.ortb2?.source?.ext?.schain;
  if (schain) {
    deepSetValue(payload, 'source.ext.schain', schain);
  }

  if (eids.length > 0) {
    deepSetValue(payload, 'user.ext.eids', eids);
  }

  const connection = getConnectionInfo();
  if (connection?.effectiveType) {
    deepSetValue(payload, 'device.connectiontype', connection.effectiveType);
  }

  return payload;
}

function createBannerRequestData(bids, bidderRequest) {
  const topLocation = getTopWindowLocation(bidderRequest);
  const topReferrer = bidderRequest.refererInfo?.ref;
  const slots = bids.map(bid => {
    return {
      slot: bid.adUnitCode,
      id: getBannerBidParam(bid, 'appId'),
      bidfloor: getBannerBidFloor(bid),
      tagid: getBannerBidParam(bid, 'tagid'),
      sizes: getBannerSizes(bid)
    };
  });
  const ortb2 = deepClone(bidderRequest.ortb2);
  const payload = {
    slots: slots,
    ortb2: ortb2,
    page: topLocation.href,
    domain: topLocation.hostname,
    search: topLocation.search,
    secure: topLocation.protocol.indexOf('https') === 0 ? 1 : 0,
    referrer: topReferrer,
    ua: navigator.userAgent,
    deviceOs: getOsVersion(),
    isMobile: isMobile() ? 1 : 0,
    dnt: getDoNotTrack() ? 1 : 0,
    adapterVersion: ADAPTER_VERSION,
    adapterName: ADAPTER_NAME
  };

  if (bidderRequest && bidderRequest.uspConsent) {
    payload.usPrivacy = bidderRequest.uspConsent;
  }

  if (bidderRequest && bidderRequest.gdprConsent) {
    const { gdprApplies, consentString } = bidderRequest.gdprConsent;
    payload.gdpr = gdprApplies ? 1 : 0;
    payload.gdprConsent = consentString;
  }

  if (bidderRequest && bidderRequest.gppConsent) {
    const { gppString, applicableSections } = bidderRequest.gppConsent;
    payload.gpp = gppString;
    payload.gppSid = applicableSections;
  }

  const schain = bids[0]?.ortb2?.source?.ext?.schain;
  if (schain) {
    payload.schain = schain;
  }

  SUPPORTED_USER_IDS.forEach(({ key, queryParam }) => {
    const id = deepAccess(bids, `0.userId.${key}`)
    if (id) {
      payload[queryParam] = id;
    }
  });

  return payload;
}

registerBidder(spec);
