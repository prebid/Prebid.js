import {
  _each,
  deepAccess,
  deepSetValue,
  getBidIdParameter,
  getDefinedParams,
  getWinDimensions,
  getWindowTop,
  isArray,
  isStr,
  parseGPTSingleSizeArrayToRtbSize,
  parseUrl,
  triggerPixel,
} from '../src/utils.js';

import {getAd} from '../libraries/targetVideoUtils/bidderUtils.js';

import { EVENTS } from '../src/constants.js';
import {BANNER, VIDEO} from '../src/mediaTypes.js';
import {config} from '../src/config.js';

import {registerBidder} from '../src/adapters/bidderFactory.js';
import {getRefererInfo} from '../src/refererDetection.js';
import { getViewportSize } from '../libraries/viewport/viewport.js';
import { getConnectionInfo } from '../libraries/connectionInfo/connectionUtils.js';

const NM_VERSION = '4.5.1';
const PBJS_VERSION = 'v$prebid.version$';
const GVLID = 1060;
const BIDDER_CODE = 'nextMillennium';
const ENDPOINT = 'https://pbs.nextmillmedia.com/openrtb2/auction';
const TEST_ENDPOINT = 'https://dev.pbsa.nextmillmedia.com/openrtb2/auction';
const SYNC_ENDPOINT = 'https://cookies.nextmillmedia.com/sync?gdpr={{.GDPR}}&gdpr_consent={{.GDPRConsent}}&us_privacy={{.USPrivacy}}&gpp={{.GPP}}&gpp_sid={{.GPPSID}}&type={{.TYPE_PIXEL}}';
const REPORT_ENDPOINT = 'https://hb-analytics.nextmillmedia.com/statistics/metric';
const TIME_TO_LIVE = 360;
const DEFAULT_CURRENCY = 'USD';
const DEFAULT_TMAX = 1500;

const VIDEO_PARAMS_DEFAULT = {
  api: undefined,
  delivery: undefined,
  linearity: undefined,
  maxduration: undefined,
  mimes: [
    'video/mp4',
    'video/x-ms-wmv',
    'application/javascript',
  ],

  minduration: undefined,
  placement: undefined,
  plcmt: undefined,
  playbackend: undefined,
  playbackmethod: undefined,
  pos: undefined,
  protocols: undefined,
  skip: undefined,
  skipafter: undefined,
  skipmin: undefined,
  startdelay: undefined,
};

const VIDEO_PARAMS = Object.keys(VIDEO_PARAMS_DEFAULT);

export const ALLOWED_ORTB2_PARAMETERS = [
  'site.pagecat',
  'site.keywords',
  'site.name',
  'site.cattax',
  'site.cat',
  'site.sectioncat',
  'site.search',
  'site.mobile',
  'site.privacypolicy',
  'site.kwarray',
  'site.content.cat',
  'site.content.language',
  'site.content.keywords',
  'site.publisher.id',
  'site.publisher.name',
  'site.publisher.cattax',
  'site.publisher.cat',
  'site.publisher.domain',
  'device.sua',
  'device.ip',
  'device.ipv6',
  'device.dnt',
  'device.lmt',
  'device.devicetype',
  'device.make',
  'device.model',
  'device.os',
  'device.osv',
  'device.hwv',
  'device.geo.lat',
  'device.geo.lon',
  'device.geo.type',
  'device.geo.accuracy',
  'device.geo.lastfix',
  'device.geo.ipservice',
  'device.geo.country',
  'device.geo.region',
  'device.geo.regionfips104',
  'device.geo.metro',
  'device.geo.city',
  'device.geo.zip',
  'device.geo.utcoffset',
  'device.language',
  'device.langb',
  'user.keywords',
  'bcat',
  'badv',
  'wlang',
  'wlangb',
  'cattax',
];

const ALLOWED_ORTB2_IMP_PARAMETERS = [
  'displaymanager',
  'displaymanagerver',
  'instl',
  'banner.btype',
  'banner.battr',
  'banner.mimes',
  'banner.topframe',
  'banner.expdir',
  'banner.api',
  'banner.format',
  'video.rqddurs',
  'video.battr',
  'video.maxextended',
  'video.minbitrate',
  'video.maxbitrate',
  'video.boxingallowed',
  'video.api',
  'video.companiontype',
];

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER, VIDEO],
  gvlid: GVLID,

  isBidRequestValid: function(bid) {
    return !!(
      (bid.params.placement_id && isStr(bid.params.placement_id)) ||
      (bid.params.group_id && isStr(bid.params.group_id))
    );
  },

  buildRequests: function(validBidRequests, bidderRequest) {
    const bidIds = new Map()
    const requests = [];
    window.nmmRefreshCounts = window.nmmRefreshCounts || {};
    const site = getSiteObj();
    const device = getDeviceObj();
    const source = getSourceObj(validBidRequests, bidderRequest);
    const tmax = deepAccess(bidderRequest, 'timeout') || DEFAULT_TMAX;

    const postBody = {
      id: bidderRequest?.bidderRequestId,
      tmax,
      ext: {
        next_mil_imps: [],
      },

      device,
      site,
      source,
      imp: [],
    };

    setConsentStrings(postBody, bidderRequest);
    setOrtb2Parameters(ALLOWED_ORTB2_PARAMETERS, postBody, bidderRequest?.ortb2);

    const urlParameters = parseUrl(getWindowTop().location.href).search;
    const isTest = urlParameters['pbs'] && urlParameters['pbs'] === 'test';
    setEids(postBody, validBidRequests);

    _each(validBidRequests, (bid, i) => {
      window.nmmRefreshCounts[bid.adUnitCode] = window.nmmRefreshCounts[bid.adUnitCode] || 0;
      const id = getPlacementId(bid);
      const {cur, mediaTypes} = getCurrency(bid);
      if (i === 0) postBody.cur = cur;

      const impId = String(i + 1)
      bidIds.set(impId, bid.bidId)

      const imp = getImp(impId, bid, id, mediaTypes);
      setOrtb2Parameters(ALLOWED_ORTB2_IMP_PARAMETERS, imp, bid?.ortb2Imp);
      postBody.imp.push(imp);
      postBody.ext.next_mil_imps.push(getExtNextMilImp(impId, bid));
    });

    this.getUrlPixelMetric(EVENTS.BID_REQUESTED, validBidRequests);

    requests.push({
      method: 'POST',
      url: isTest ? TEST_ENDPOINT : ENDPOINT,
      data: JSON.stringify(postBody),
      options: {
        contentType: 'text/plain',
        withCredentials: true,
      },

      bidIds,
    });

    return requests;
  },

  interpretResponse: function(serverResponse, bidRequest) {
    const response = serverResponse.body;
    const bidResponses = [];

    const bids = [];
    _each(response.seatbid, (resp) => {
      _each(resp.bid, (bid) => {
        const requestId = bidRequest.bidIds.get(bid.impid);

        const {ad, adUrl, vastUrl, vastXml} = getAd(bid);

        const bidResponse = {
          requestId,
          cpm: bid.price,
          width: bid.w,
          height: bid.h,
          creativeId: bid.adid,
          currency: response.cur || DEFAULT_CURRENCY,
          netRevenue: true,
          ttl: TIME_TO_LIVE,
          meta: {
            advertiserDomains: bid.adomain || [],
          },
        };

        if (vastUrl || vastXml) {
          bidResponse.mediaType = VIDEO;

          if (vastUrl) bidResponse.vastUrl = vastUrl;
          if (vastXml) bidResponse.vastXml = vastXml;
        } else {
          bidResponse.ad = ad;
          bidResponse.adUrl = adUrl;
        };

        bidResponses.push(bidResponse);
      });

      bids.push(resp.bid);
    });

    this.getUrlPixelMetric(EVENTS.BID_RESPONSE, bids.flat());

    return bidResponses;
  },

  getUserSyncs: function (syncOptions, responses, gdprConsent, uspConsent, gppConsent) {
    if (!syncOptions.iframeEnabled && !syncOptions.pixelEnabled) return [];

    const pixels = [];
    const getSetPixelFunc = type => url => { pixels.push({type, url: replaceUsersyncMacros(url, gdprConsent, uspConsent, gppConsent, type)}) };
    const getSetPixelsFunc = type => response => { deepAccess(response, `body.ext.sync.${type}`, []).forEach(getSetPixelFunc(type)) };

    const setPixel = (type, url) => { (getSetPixelFunc(type))(url) };
    const setPixelImages = getSetPixelsFunc('image');
    const setPixelIframes = getSetPixelsFunc('iframe');

    if (isArray(responses)) {
      responses.forEach(response => {
        if (syncOptions.pixelEnabled) setPixelImages(response);
        if (syncOptions.iframeEnabled) setPixelIframes(response);
      });
    }

    if (!pixels.length) {
      if (syncOptions.pixelEnabled) setPixel('image', SYNC_ENDPOINT);
      if (syncOptions.iframeEnabled) setPixel('iframe', SYNC_ENDPOINT);
    }

    return pixels;
  },

  getUrlPixelMetric(eventName, bid) {
    const disabledSending = !!config.getBidderConfig()?.nextMillennium?.disabledSendingStatisticData;
    if (disabledSending) return;

    const url = this._getUrlPixelMetric(eventName, bid);
    if (!url) return;

    triggerPixel(url);
  },

  _getUrlPixelMetric(eventName, bids) {
    if (!Array.isArray(bids)) bids = [bids];

    const bidder = bids[0]?.bidder || bids[0]?.bidderCode;
    if (bidder !== BIDDER_CODE) return;

    const params = [];
    _each(bids, bid => {
      if (bid.params) {
        params.push(bid.params);
      } else {
        if (Array.isArray(bid.bids)) params.push(bid.bids.map(bidI => bidI.params));
      };
    });

    if (!params.length) return;

    const placementIdsArray = [];
    const groupIdsArray = [];
    params.flat().forEach(paramsI => {
      if (paramsI.group_id) {
        groupIdsArray.push(paramsI.group_id);
      } else {
        if (paramsI.placement_id) placementIdsArray.push(paramsI.placement_id);
      };
    });

    const placementIds = (placementIdsArray.length && `&placements=${placementIdsArray.join(';')}`) || '';
    const groupIds = (groupIdsArray.length && `&groups=${groupIdsArray.join(';')}`) || '';

    if (!(groupIds || placementIds)) return;

    const url = `${REPORT_ENDPOINT}?event=${eventName}&bidder=${bidder}&source=pbjs${groupIds}${placementIds}`;

    return url;
  },

  onTimeout(bids) {
    for (const bid of bids) {
      this.getUrlPixelMetric(EVENTS.BID_TIMEOUT, bid);
    };
  },
};

export function getExtNextMilImp(impId, bid) {
  if (typeof window?.nmmRefreshCounts[bid.adUnitCode] === 'number') ++window.nmmRefreshCounts[bid.adUnitCode];
  const {adSlots, allowedAds} = bid.params
  const nextMilImp = {
    impId,
    nextMillennium: {
      nm_version: NM_VERSION,
      pbjs_version: PBJS_VERSION,
      refresh_count: window?.nmmRefreshCounts[bid.adUnitCode] || 0,
      scrollTop: window.pageYOffset || getWinDimensions().document.documentElement.scrollTop,
    },
  };

  if (Array.isArray(adSlots)) nextMilImp.nextMillennium.adSlots = adSlots;
  if (Array.isArray(allowedAds)) nextMilImp.nextMillennium.allowedAds = allowedAds

  return nextMilImp;
}

export function getImp(impId, bid, id, mediaTypes) {
  const {banner, video} = mediaTypes;
  const imp = {
    id: impId,
    ext: {
      prebid: {
        storedrequest: {
          id,
        },
      },
    },
  };

  const gpid = bid?.ortb2Imp?.ext?.gpid;
  if (gpid) imp.ext.gpid = gpid;

  getImpBanner(imp, banner);
  getImpVideo(imp, video);

  return imp;
};

export function getImpBanner(imp, banner) {
  if (!banner) return;

  if (banner.bidfloorcur) imp.bidfloorcur = banner.bidfloorcur;
  if (banner.bidfloor) imp.bidfloor = banner.bidfloor;

  const format = (banner.data?.sizes || []).map(s => { return {w: s[0], h: s[1]} });
  const {w, h} = (format[0] || {})
  imp.banner = {
    w,
    h,
    format,
  };

  setImpPos(imp.banner, banner?.pos);
};

export function getImpVideo(imp, video) {
  if (!video) return;

  if (video.bidfloorcur) imp.bidfloorcur = video.bidfloorcur;
  if (video.bidfloor) imp.bidfloor = video.bidfloor;

  imp.video = getDefinedParams(video.data, VIDEO_PARAMS);
  Object.keys(VIDEO_PARAMS_DEFAULT)
    .filter(videoParamName => VIDEO_PARAMS_DEFAULT[videoParamName])
    .forEach(videoParamName => {
      if (typeof imp.video[videoParamName] === 'undefined') imp.video[videoParamName] = VIDEO_PARAMS_DEFAULT[videoParamName];
    });

  if (video.data.playerSize) {
    imp.video = Object.assign(imp.video, parseGPTSingleSizeArrayToRtbSize(video.data?.playerSize) || {});
  } else if (video.data.w && video.data.h) {
    imp.video.w = video.data.w;
    imp.video.h = video.data.h;
  };

  setImpPos(imp.video, video?.pos);
};

export function setImpPos(obj, pos) {
  if (typeof pos === 'number' && pos >= 0 && pos <= 7) obj.pos = pos;
};

export function setConsentStrings(postBody = {}, bidderRequest) {
  const gdprConsent = bidderRequest?.gdprConsent;
  const uspConsent = bidderRequest?.uspConsent;
  let gppConsent = bidderRequest?.gppConsent?.gppString && bidderRequest?.gppConsent;
  if (!gppConsent && bidderRequest?.ortb2?.regs?.gpp) gppConsent = bidderRequest?.ortb2?.regs;

  if (gdprConsent || uspConsent || gppConsent) {
    postBody.regs = {};

    if (uspConsent) {
      postBody.regs.us_privacy = uspConsent;
    };

    if (gppConsent) {
      postBody.regs.gpp = gppConsent?.gppString || gppConsent?.gpp;
      postBody.regs.gpp_sid = bidderRequest.gppConsent?.applicableSections || gppConsent?.gpp_sid;
    };

    if (gdprConsent) {
      if (typeof gdprConsent.gdprApplies !== 'undefined') {
        postBody.regs.gdpr = gdprConsent.gdprApplies ? 1 : 0;
      };

      if (typeof gdprConsent.consentString !== 'undefined') {
        postBody.user = {
          consent: gdprConsent.consentString,
        };
      };
    };

    if (typeof bidderRequest?.ortb2?.regs?.coppa === 'number') {
      postBody.regs.coppa = bidderRequest?.ortb2?.regs?.coppa;
    };
  };
};

export function setOrtb2Parameters(allowedOrtb2Parameters, body, ortb2 = {}) {
  for (const parameter of allowedOrtb2Parameters) {
    const value = deepAccess(ortb2, parameter);
    if (value) deepSetValue(body, parameter, value);
  }

  if (body.wlang) delete body.wlangb
}

export function setEids(postBody = {}, bids = []) {
  let isFind = false;
  _each(bids, bid => {
    if (isFind || !isArray(bid.userIdAsEids) || !bid.userIdAsEids.length) return;

    if (bid.userIdAsEids.length) {
      deepSetValue(postBody, 'user.eids', bid.userIdAsEids);
      isFind = true;
    };
  });
}

export function replaceUsersyncMacros(url, gdprConsent = {}, uspConsent = '', gppConsent = {}, type = '') {
  const { consentString = '', gdprApplies = false } = gdprConsent;
  const gdpr = Number(gdprApplies);
  url = url
    .replace('{{.GDPR}}', gdpr)
    .replace('{{.GDPRConsent}}', consentString)
    .replace('{{.USPrivacy}}', uspConsent)
    .replace('{{.GPP}}', gppConsent.gppString || '')
    .replace('{{.GPPSID}}', (gppConsent.applicableSections || []).join(','))
    .replace('{{.TYPE_PIXEL}}', type);

  return url;
}

function getCurrency(bid = {}) {
  const currency = config?.getConfig('currency')?.adServerCurrency || DEFAULT_CURRENCY;
  const cur = [];
  const types = ['banner', 'video'];
  const mediaTypes = {};
  for (const mediaType of types) {
    const mediaTypeData = deepAccess(bid, `mediaTypes.${mediaType}`);
    if (mediaTypeData) {
      mediaTypes[mediaType] = {data: mediaTypeData};
    } else {
      continue;
    };

    if (typeof bid.getFloor === 'function') {
      const floorInfo = bid.getFloor({currency, mediaType, size: '*'});
      mediaTypes[mediaType].bidfloorcur = floorInfo?.currency;
      mediaTypes[mediaType].bidfloor = floorInfo?.floor;
    } else {
      mediaTypes[mediaType].bidfloorcur = currency;
    };

    if (cur.includes(mediaTypes[mediaType].bidfloorcur)) cur.push(mediaTypes[mediaType].bidfloorcur);
  };

  if (!cur.length) cur.push(DEFAULT_CURRENCY);

  return {cur, mediaTypes};
}

export function getPlacementId(bid) {
  const groupId = getBidIdParameter('group_id', bid.params);
  const placementId = getBidIdParameter('placement_id', bid.params);
  if (!groupId) return placementId;

  const windowTop = getTopWindow(window);
  let sizes = [];
  if (bid.mediaTypes) {
    if (bid.mediaTypes.banner) sizes = [...bid.mediaTypes.banner.sizes];
    if (bid.mediaTypes.video) sizes.push(bid.mediaTypes.video.playerSize);
  };

  const host = (windowTop && windowTop.location && windowTop.location.host) || '';
  return `g${groupId};${sizes.map(size => size.join('x')).join('|')};${host}`;
}

function getTopWindow(curWindow, nesting = 0) {
  if (nesting > 10) {
    return curWindow;
  };

  try {
    if (curWindow.parent.document) {
      return getTopWindow(curWindow.parent.window, ++nesting);
    };
  } catch (err) {
    return curWindow;
  };
}

function getSiteObj() {
  const refInfo = (getRefererInfo && getRefererInfo()) || {};

  let language = navigator.language;
  let content;
  if (language) {
    // get ISO-639-1-alpha-2 (2 character language)
    language = language.split('-')[0];
    content = {
      language,
    };
  };

  return {
    page: refInfo.page,
    ref: refInfo.ref,
    domain: refInfo.domain,
    content,
  };
}

function getDeviceObj() {
  const { width, height } = getViewportSize();
  return {
    w: width,
    h: height,
    ua: window.navigator.userAgent || undefined,
    sua: getSua(),
    js: 1,
    connectiontype: getDeviceConnectionType(),
  };
}

function getDeviceConnectionType() {
  const connection = getConnectionInfo();
  const connectionType = connection?.type;
  const effectiveType = connection?.effectiveType;
  if (connectionType === 'ethernet') return 1;
  if (connectionType === 'wifi') return 2;

  if (effectiveType === 'slow-2g') return 3;
  if (effectiveType === '2g') return 4;
  if (effectiveType === '3g') return 5;
  if (effectiveType === '4g') return 6;

  return undefined;
}

export function getSourceObj(validBidRequests, bidderRequest) {
  const schain = validBidRequests?.[0]?.ortb2?.source?.ext?.schain || bidderRequest?.ortb2?.source?.schain || bidderRequest?.ortb2?.source?.ext?.schain;

  if (!schain) return;

  const source = {
    schain,
  };

  return source;
}

function getSua() {
  const {brands, mobile, platform} = (window?.navigator?.userAgentData || {});
  if (!(brands && platform)) return undefined;

  return {
    browsers: brands,
    mobile: Number(!!mobile),
    platform: (platform && {brand: platform}) || undefined,
  };
}

registerBidder(spec);
