import {
  _each,
  deepAccess,
  deepSetValue,
  getBidIdParameter,
  getDefinedParams,
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

const NM_VERSION = '4.0.0';
const PBJS_VERSION = 'v$prebid.version$';
const GVLID = 1060;
const BIDDER_CODE = 'nextMillennium';
const ENDPOINT = 'https://pbs.nextmillmedia.com/openrtb2/auction';
const TEST_ENDPOINT = 'https://test.pbs.nextmillmedia.com/openrtb2/auction';
const SYNC_ENDPOINT = 'https://cookies.nextmillmedia.com/sync?gdpr={{.GDPR}}&gdpr_consent={{.GDPRConsent}}&us_privacy={{.USPrivacy}}&gpp={{.GPP}}&gpp_sid={{.GPPSID}}&type={{.TYPE_PIXEL}}';
const REPORT_ENDPOINT = 'https://report2.hb.brainlyads.com/statistics/metric';
const TIME_TO_LIVE = 360;
const DEFAULT_CURRENCY = 'USD';

const VIDEO_PARAMS_DEFAULT = {
  api: undefined,
  context: undefined,
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
const ALLOWED_ORTB2_PARAMETERS = [
  'site.pagecat',
  'site.content.cat',
  'site.content.language',
  'device.sua',
  'site.keywords',
  'site.content.keywords',
  'user.keywords',
];

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER, VIDEO],
  gvlid: GVLID,

  isBidRequestValid: function(bid) {
    return !!(
      (bid.params.placement_id && isStr(bid.params.placement_id)) || (bid.params.group_id && isStr(bid.params.group_id))
    );
  },

  buildRequests: function(validBidRequests, bidderRequest) {
    const requests = [];
    window.nmmRefreshCounts = window.nmmRefreshCounts || {};
    const site = getSiteObj();
    const device = getDeviceObj();

    const postBody = {
      id: bidderRequest?.bidderRequestId,
      ext: {
        next_mil_imps: [],
      },

      device,
      site,
      imp: [],
    };

    setConsentStrings(postBody, bidderRequest);
    setOrtb2Parameters(postBody, bidderRequest?.ortb2);

    const urlParameters = parseUrl(getWindowTop().location.href).search;
    const isTest = urlParameters['pbs'] && urlParameters['pbs'] === 'test';
    setEids(postBody, validBidRequests);

    _each(validBidRequests, (bid, i) => {
      window.nmmRefreshCounts[bid.adUnitCode] = window.nmmRefreshCounts[bid.adUnitCode] || 0;
      const id = getPlacementId(bid);
      const {cur, mediaTypes} = getCurrency(bid);
      if (i === 0) postBody.cur = cur;
      postBody.imp.push(getImp(bid, id, mediaTypes));
      postBody.ext.next_mil_imps.push(getExtNextMilImp(bid));
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
    });

    return requests;
  },

  interpretResponse: function(serverResponse, bidRequest) {
    const response = serverResponse.body;
    const bidResponses = [];

    const bids = [];
    _each(response.seatbid, (resp) => {
      _each(resp.bid, (bid) => {
        const requestId = bidRequest.bidId;

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
    if (bidder != BIDDER_CODE) return;

    let params = [];
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

function getExtNextMilImp(bid) {
  if (typeof window?.nmmRefreshCounts[bid.adUnitCode] === 'number') ++window.nmmRefreshCounts[bid.adUnitCode];
  const nextMilImp = {
    impId: bid.adUnitCode,
    nextMillennium: {
      nm_version: NM_VERSION,
      pbjs_version: PBJS_VERSION,
      refresh_count: window?.nmmRefreshCounts[bid.adUnitCode] || 0,
      scrollTop: window.pageYOffset || document.documentElement.scrollTop,
    },
  };

  return nextMilImp;
}

export function getImp(bid, id, mediaTypes) {
  const {banner, video} = mediaTypes;
  const imp = {
    id: bid.adUnitCode,
    ext: {
      prebid: {
        storedrequest: {
          id,
        },
      },
    },
  };

  getImpBanner(imp, banner);
  getImpVideo(imp, video);

  return imp;
};

export function getImpBanner(imp, banner) {
  if (!banner) return;

  if (banner.bidfloorcur) imp.bidfloorcur = banner.bidfloorcur;
  if (banner.bidfloor) imp.bidfloor = banner.bidfloor;

  const format = (banner.data?.sizes || []).map(s => { return {w: s[0], h: s[1]} })
  const {w, h} = (format[0] || {})
  imp.banner = {
    w,
    h,
    format,
  };
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
};

export function setConsentStrings(postBody = {}, bidderRequest) {
  const gdprConsent = bidderRequest?.gdprConsent;
  const uspConsent = bidderRequest?.uspConsent;
  let gppConsent = bidderRequest?.gppConsent?.gppString && bidderRequest?.gppConsent;
  if (!gppConsent && bidderRequest?.ortb2?.regs?.gpp) gppConsent = bidderRequest?.ortb2?.regs;

  if (gdprConsent || uspConsent || gppConsent) {
    postBody.regs = { ext: {} };

    if (uspConsent) {
      postBody.regs.ext.us_privacy = uspConsent;
    };

    if (gppConsent) {
      postBody.regs.gpp = gppConsent?.gppString || gppConsent?.gpp;
      postBody.regs.gpp_sid = bidderRequest.gppConsent?.applicableSections || gppConsent?.gpp_sid;
    };

    if (gdprConsent) {
      if (typeof gdprConsent.gdprApplies !== 'undefined') {
        postBody.regs.ext.gdpr = gdprConsent.gdprApplies ? 1 : 0;
      };

      if (typeof gdprConsent.consentString !== 'undefined') {
        postBody.user = {
          ext: { consent: gdprConsent.consentString },
        };
      };
    };
  };
};

export function setOrtb2Parameters(postBody, ortb2 = {}) {
  for (let parameter of ALLOWED_ORTB2_PARAMETERS) {
    const value = deepAccess(ortb2, parameter);
    if (value) deepSetValue(postBody, parameter, value);
  }
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
      let floorInfo = bid.getFloor({currency, mediaType, size: '*'});
      mediaTypes[mediaType].bidfloorcur = floorInfo.currency;
      mediaTypes[mediaType].bidfloor = floorInfo.floor;
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

  let windowTop = getTopWindow(window);
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
  return {
    w: window.innerWidth || window.document.documentElement.clientWidth || window.document.body.clientWidth || 0,
    h: window.innerHeight || window.document.documentElement.clientHeight || window.document.body.clientHeight || 0,
    ua: window.navigator.userAgent || undefined,
    sua: getSua(),
  };
}

function getSua() {
  let {brands, mobile, platform} = (window?.navigator?.userAgentData || {});
  if (!(brands && platform)) return undefined;

  return {
    brands,
    mobile: Number(!!mobile),
    platform: (platform && {brand: platform}) || undefined,
  };
}

registerBidder(spec);
